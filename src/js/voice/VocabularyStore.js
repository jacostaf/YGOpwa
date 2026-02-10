/**
 * VocabularyStore.js
 *
 * Manages vocabulary data for voice transcript entity extraction.
 * Loads rarities, sets, and card names from Supabase with caching.
 * Provides efficient lookup via first-token indexing and Fuse.js fuzzy search.
 */

import Fuse from 'fuse.js';
import { supabase, isSupabaseAvailable } from '../../lib/supabaseClient.js';
import { getAllRarities, getAllRaritiesSync } from '../../services/rarityService.js';

/**
 * @typedef {'rarity' | 'setCode' | 'setName' | 'artVariant' | 'cardName'} VocabularyCategory
 */

/**
 * @typedef {Object} VocabularyEntry
 * @property {string} canonical - Official/normalized form (e.g., "Quarter Century Secret Rare")
 * @property {string[]} variants - All acceptable spoken forms (lowercase)
 * @property {number} tokenCount - Number of tokens in canonical form
 * @property {VocabularyCategory} category
 * @property {Object} [metadata] - Category-specific data
 */

// Cache keys for IndexedDB/sessionStorage
const CACHE_KEYS = {
  SETS: 'voxrip_vocab_sets',
  CARDS: 'voxrip_vocab_cards_',
};
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Fuse.js options per category
const FUSE_OPTIONS = {
  rarity: { threshold: 0.3, keys: ['canonical', 'variants'], includeScore: true },
  setCode: { threshold: 0.2, keys: ['canonical', 'variants'], includeScore: true },
  setName: { threshold: 0.4, keys: ['canonical', 'variants'], includeScore: true },
  artVariant: { threshold: 0.3, keys: ['canonical', 'variants'], includeScore: true },
  cardName: { threshold: 0.4, keys: ['canonical', 'variants'], includeScore: true },
};

export class VocabularyStore {
  constructor() {
    /** @type {Map<VocabularyCategory, VocabularyEntry[]>} */
    this.vocabularies = new Map();

    /** @type {Map<VocabularyCategory, Map<string, VocabularyEntry[]>>} */
    this.byFirstToken = new Map();

    /** @type {Map<VocabularyCategory, number>} */
    this.maxTokens = new Map();

    /** @type {Map<VocabularyCategory, Fuse>} */
    this.fuseIndexes = new Map();

    /** @type {Map<string, VocabularyEntry[]>} */
    this.cardNameIndex = new Map(); // Index by significant words

    /** @type {Set<string>} */
    this.loadedSetCodes = new Set();

    this.initialized = false;
    this.logger = console;
  }

  /**
   * Initialize the vocabulary store with rarities and sets.
   * Call this at app startup.
   */
  async initialize() {
    if (this.initialized) return;

    this.logger.log('[VocabularyStore] Initializing...');

    try {
      // Load rarities (uses existing rarityService)
      await this.loadRarities();

      // Load all sets
      await this.loadSets();

      // Load art variant vocabulary
      this.loadArtVariants();

      this.initialized = true;
      this.logger.log('[VocabularyStore] Initialization complete');
    } catch (err) {
      this.logger.error('[VocabularyStore] Initialization failed:', err);
      // Load fallback data
      this.loadFallbackData();
    }
  }

  /**
   * Load rarities from rarityService and build vocabulary.
   */
  async loadRarities() {
    const rarities = await getAllRarities();
    const entries = [];

    for (const r of rarities) {
      const canonical = r.rarity_name;
      const variants = this.generateRarityVariants(canonical, r.rarity_key);

      entries.push({
        canonical,
        variants,
        tokenCount: canonical.split(' ').length,
        category: 'rarity',
        metadata: {
          id: r.id,
          key: r.rarity_key,
          rank: r.rarity_rank,
          weight: r.weight,
        },
      });
    }

    this.setVocabulary('rarity', entries);
    this.logger.log(`[VocabularyStore] Loaded ${entries.length} rarities`);
  }

  /**
   * Generate common spoken variants for a rarity.
   */
  generateRarityVariants(name, key) {
    const variants = new Set();
    const lower = name.toLowerCase();

    // Add base forms
    variants.add(lower);
    variants.add(key.replace(/_/g, ' '));

    // Common abbreviations
    const abbrevMap = {
      'quarter century secret rare': ['qc secret rare', 'qcsr', 'quarter century secret', '25th secret rare'],
      'platinum secret rare': ['plat secret', 'platinum secret', 'psr'],
      'prismatic secret rare': ['prismatic secret', 'prism secret'],
      'starlight rare': ['starlight', 'stl'],
      'ghost rare': ['ghost'],
      'ultimate rare': ['ultimate', 'ulti'],
      'secret rare': ['secret', 'sr'],
      'ultra rare': ['ultra', 'ur'],
      'super rare': ['super', 'sr'],
      'collectors rare': ['collectors', 'cr'],
      'rare': ['r'],
      'common': ['c'],
      'short print': ['sp'],
    };

    const abbrevs = abbrevMap[lower];
    if (abbrevs) {
      abbrevs.forEach(a => variants.add(a));
    }

    // Handle compound rarities (e.g., "Emblazoned Secret Rare")
    if (lower.includes(' rare') && !lower.endsWith(' rare')) {
      variants.add(lower.replace(' rare', ''));
    }

    return Array.from(variants);
  }

  /**
   * Load card sets from Supabase.
   */
  async loadSets() {
    if (!isSupabaseAvailable()) {
      this.logger.warn('[VocabularyStore] Supabase unavailable for sets');
      return;
    }

    try {
      // Check cache first
      const cached = this.getCachedData(CACHE_KEYS.SETS);
      if (cached) {
        this.setVocabulary('setCode', cached.setCodeEntries);
        this.setVocabulary('setName', cached.setNameEntries);
        this.logger.log(`[VocabularyStore] Loaded ${cached.setCodeEntries.length} sets from cache`);
        return;
      }

      const { data, error } = await supabase
        .from('card_sets')
        .select('id, set_code, name, release_date');

      if (error) throw error;

      const setCodeEntries = [];
      const setNameEntries = [];

      for (const s of data || []) {
        // Set code entry
        const codeVariants = this.generateSetCodeVariants(s.set_code, s.name);
        setCodeEntries.push({
          canonical: s.set_code,
          variants: codeVariants,
          tokenCount: 1,
          category: 'setCode',
          metadata: { id: s.id, name: s.name, releaseDate: s.release_date },
        });

        // Set name entry
        const nameVariants = this.generateSetNameVariants(s.name, s.set_code);
        setNameEntries.push({
          canonical: s.name,
          variants: nameVariants,
          tokenCount: s.name.split(' ').length,
          category: 'setName',
          metadata: { id: s.id, setCode: s.set_code, releaseDate: s.release_date },
        });
      }

      this.setVocabulary('setCode', setCodeEntries);
      this.setVocabulary('setName', setNameEntries);

      // Cache for later
      this.setCachedData(CACHE_KEYS.SETS, { setCodeEntries, setNameEntries });

      this.logger.log(`[VocabularyStore] Loaded ${setCodeEntries.length} sets`);
    } catch (err) {
      this.logger.error('[VocabularyStore] Error loading sets:', err);
    }
  }

  /**
   * Generate variants for a set code.
   */
  generateSetCodeVariants(setCode, setName) {
    const variants = new Set();
    const lower = setCode.toLowerCase();

    variants.add(lower);

    // Extract year from set code if present (e.g., LP25 -> lp25, lp 25)
    const yearMatch = lower.match(/([a-z]+)(\d{2,4})$/);
    if (yearMatch) {
      variants.add(`${yearMatch[1]} ${yearMatch[2]}`);
      if (yearMatch[2].length === 2) {
        variants.add(`${yearMatch[1]} 20${yearMatch[2]}`);
      }
    }

    return Array.from(variants);
  }

  /**
   * Generate variants for a set name.
   */
  generateSetNameVariants(setName, setCode) {
    const variants = new Set();
    const lower = setName.toLowerCase();

    variants.add(lower);

    // Add abbreviated forms
    const words = lower.split(' ');
    if (words.length > 2) {
      // Add acronym (e.g., "Limited Pack 2025" -> "lp 2025")
      const acronym = words.filter(w => w.length > 2).map(w => w[0]).join('');
      variants.add(acronym);

      // If has year, add with year
      const year = words.find(w => /^\d{4}$/.test(w));
      if (year) {
        variants.add(`${acronym} ${year}`);
        variants.add(`${acronym}${year.slice(-2)}`);
      }
    }

    return Array.from(variants);
  }

  /**
   * Load predefined art variant vocabulary.
   */
  loadArtVariants() {
    const entries = [];

    // Ordinal arts (1st through 20th)
    for (let i = 1; i <= 20; i++) {
      const ordinal = this.getOrdinal(i);
      entries.push({
        canonical: `${ordinal} Art`,
        variants: [
          `${ordinal} art`,
          `${i}th art`,
          `${i} art`,
          `art ${i}`,
          `${ordinal.toLowerCase()} art`,
        ].filter((v, idx, arr) => arr.indexOf(v) === idx),
        tokenCount: 2,
        category: 'artVariant',
        metadata: { artNumber: i },
      });
    }

    // Named art variants
    const namedVariants = [
      { canonical: 'Alternate Art', variants: ['alternate art', 'alt art', 'alternate', 'alt'] },
      { canonical: 'Full Art', variants: ['full art', 'full'] },
      { canonical: 'Extended Art', variants: ['extended art', 'extended'] },
      { canonical: 'Prismatic Art', variants: ['prismatic art', 'prismatic'] },
    ];

    for (const nv of namedVariants) {
      entries.push({
        ...nv,
        tokenCount: nv.canonical.split(' ').length,
        category: 'artVariant',
        metadata: { artType: nv.canonical.toLowerCase().replace(' ', '_') },
      });
    }

    this.setVocabulary('artVariant', entries);
    this.logger.log(`[VocabularyStore] Loaded ${entries.length} art variants`);
  }

  /**
   * Get ordinal string for a number.
   */
  getOrdinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  /**
   * Load card names for a specific set.
   * Call this when user starts a session with a set.
   * @param {string} setCode - Set code to load cards for
   */
  async loadCardsForSet(setCode) {
    if (!setCode) return;
    if (this.loadedSetCodes.has(setCode)) return;

    if (!isSupabaseAvailable()) {
      this.logger.warn('[VocabularyStore] Supabase unavailable for cards');
      return;
    }

    try {
      const cacheKey = CACHE_KEYS.CARDS + setCode;
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        this.addCardEntries(cached, setCode);
        this.loadedSetCodes.add(setCode);
        this.logger.log(`[VocabularyStore] Loaded ${cached.length} cards for ${setCode} from cache`);
        return;
      }

      // Get set ID first
      const { data: setData, error: setError } = await supabase
        .from('card_sets')
        .select('id')
        .eq('set_code', setCode)
        .single();

      if (setError || !setData) {
        this.logger.warn(`[VocabularyStore] Set ${setCode} not found`);
        return;
      }

      // Get distinct card names for this set
      const { data: cardData, error: cardError } = await supabase
        .from('card_variants')
        .select('card_name, rarity_id')
        .eq('set_id', setData.id);

      if (cardError) throw cardError;

      // Deduplicate card names
      const uniqueNames = new Map();
      for (const c of cardData || []) {
        if (!uniqueNames.has(c.card_name)) {
          uniqueNames.set(c.card_name, { name: c.card_name, rarityIds: new Set([c.rarity_id]) });
        } else {
          uniqueNames.get(c.card_name).rarityIds.add(c.rarity_id);
        }
      }

      const entries = [];
      for (const [name, info] of uniqueNames) {
        entries.push({
          canonical: name,
          variants: this.generateCardNameVariants(name),
          tokenCount: name.split(' ').length,
          category: 'cardName',
          metadata: {
            setCode,
            rarityIds: Array.from(info.rarityIds),
          },
        });
      }

      this.addCardEntries(entries, setCode);
      this.setCachedData(cacheKey, entries);
      this.loadedSetCodes.add(setCode);

      this.logger.log(`[VocabularyStore] Loaded ${entries.length} unique cards for ${setCode}`);
    } catch (err) {
      this.logger.error(`[VocabularyStore] Error loading cards for ${setCode}:`, err);
    }
  }

  /**
   * Load cards for multiple sets.
   * @param {string[]} setCodes - Array of set codes
   */
  async loadCardsForSets(setCodes) {
    await Promise.all(setCodes.map(code => this.loadCardsForSet(code)));
  }

  /**
   * Generate variants for a card name.
   */
  generateCardNameVariants(name) {
    const variants = new Set();
    const lower = name.toLowerCase();

    variants.add(lower);

    // Remove art version suffix for matching (e.g., "Dark Magician (8th Art)" -> "Dark Magician")
    const noArt = lower.replace(/\s*\(\d+(?:st|nd|rd|th)\s+art\)/i, '').trim();
    if (noArt !== lower) {
      variants.add(noArt);
    }

    // Handle special characters
    variants.add(lower.replace(/-/g, ' '));
    variants.add(lower.replace(/[^\w\s]/g, ''));

    // Handle common prefixes/suffixes
    if (lower.includes(' - ')) {
      const parts = lower.split(' - ');
      variants.add(parts[parts.length - 1]); // Just the suffix
      if (parts.length === 2) {
        variants.add(`${parts[1]} ${parts[0]}`); // Reversed
      }
    }

    return Array.from(variants);
  }

  /**
   * Add card entries to the vocabulary and update indexes.
   */
  addCardEntries(entries, setCode) {
    // Get or create cardName vocabulary
    let cardVocab = this.vocabularies.get('cardName') || [];
    cardVocab = [...cardVocab, ...entries];
    this.setVocabulary('cardName', cardVocab);

    // Update word index for efficient lookup
    for (const entry of entries) {
      const significantWords = entry.canonical
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 2 && !['the', 'and', 'for', 'with'].includes(w));

      for (const word of significantWords) {
        if (!this.cardNameIndex.has(word)) {
          this.cardNameIndex.set(word, []);
        }
        this.cardNameIndex.get(word).push(entry);
      }
    }
  }

  /**
   * Set vocabulary for a category and rebuild indexes.
   */
  setVocabulary(category, entries) {
    this.vocabularies.set(category, entries);

    // Build first-token index
    const tokenIndex = new Map();
    let maxTokenCount = 0;

    for (const entry of entries) {
      maxTokenCount = Math.max(maxTokenCount, entry.tokenCount);

      for (const variant of entry.variants) {
        const firstToken = variant.split(' ')[0];
        if (!tokenIndex.has(firstToken)) {
          tokenIndex.set(firstToken, []);
        }
        tokenIndex.get(firstToken).push(entry);
      }
    }

    this.byFirstToken.set(category, tokenIndex);
    this.maxTokens.set(category, maxTokenCount);

    // Build Fuse index
    const fuseOpts = FUSE_OPTIONS[category] || { threshold: 0.4, keys: ['canonical', 'variants'], includeScore: true };
    this.fuseIndexes.set(category, new Fuse(entries, fuseOpts));
  }

  /**
   * Look up entries matching an n-gram in a category.
   * @param {string} ngram - The n-gram to look up
   * @param {VocabularyCategory} category - Category to search
   * @returns {VocabularyEntry[]} Matching entries
   */
  lookup(ngram, category) {
    const lower = ngram.toLowerCase().trim();
    const firstToken = lower.split(' ')[0];

    const tokenIndex = this.byFirstToken.get(category);
    if (!tokenIndex) return [];

    const candidates = tokenIndex.get(firstToken) || [];
    return candidates.filter(entry =>
      entry.variants.some(v => v === lower || v.includes(lower) || lower.includes(v))
    );
  }

  /**
   * Fuzzy search in a category.
   * @param {string} query - Search query
   * @param {VocabularyCategory} category - Category to search
   * @param {number} limit - Max results
   * @returns {Array<{ entry: VocabularyEntry, score: number }>}
   */
  fuzzySearch(query, category, limit = 10) {
    const fuse = this.fuseIndexes.get(category);
    if (!fuse) return [];

    const results = fuse.search(query, { limit });
    return results.map(r => ({
      entry: r.item,
      score: 1 - (r.score || 0), // Fuse returns lower = better, invert to 0-1 where 1 is best
    }));
  }

  /**
   * Get max token count for a category.
   * @param {VocabularyCategory} category
   * @returns {number}
   */
  getMaxTokens(category) {
    return this.maxTokens.get(category) || 5;
  }

  /**
   * Get all entries for a category.
   * @param {VocabularyCategory} category
   * @returns {VocabularyEntry[]}
   */
  getVocabulary(category) {
    return this.vocabularies.get(category) || [];
  }

  /**
   * Search card names by significant word.
   * @param {string} word - Word to search for
   * @returns {VocabularyEntry[]}
   */
  searchCardsByWord(word) {
    return this.cardNameIndex.get(word.toLowerCase()) || [];
  }

  /**
   * Get cached data from sessionStorage.
   */
  getCachedData(key) {
    try {
      const cached = sessionStorage.getItem(key);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp > CACHE_TTL_MS) {
        sessionStorage.removeItem(key);
        return null;
      }

      return data;
    } catch {
      return null;
    }
  }

  /**
   * Save data to sessionStorage cache.
   */
  setCachedData(key, data) {
    try {
      sessionStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
    } catch {
      // Storage full or unavailable
    }
  }

  /**
   * Load fallback data when Supabase is unavailable.
   */
  loadFallbackData() {
    // Use sync rarities from rarityService
    const rarities = getAllRaritiesSync();
    const entries = rarities.map(r => ({
      canonical: r.rarity_name,
      variants: this.generateRarityVariants(r.rarity_name, r.rarity_key),
      tokenCount: r.rarity_name.split(' ').length,
      category: 'rarity',
      metadata: { id: r.id, key: r.rarity_key, rank: r.rarity_rank, weight: r.weight },
    }));

    this.setVocabulary('rarity', entries);
    this.loadArtVariants();

    this.logger.log('[VocabularyStore] Loaded fallback data');
  }

  /**
   * Clear all cached data.
   */
  clearCache() {
    try {
      for (const key of Object.keys(sessionStorage)) {
        if (key.startsWith('voxrip_vocab_')) {
          sessionStorage.removeItem(key);
        }
      }
    } catch {
      // Ignore
    }

    this.loadedSetCodes.clear();
    this.vocabularies.clear();
    this.byFirstToken.clear();
    this.maxTokens.clear();
    this.fuseIndexes.clear();
    this.cardNameIndex.clear();
    this.initialized = false;

    this.logger.log('[VocabularyStore] Cache cleared');
  }
}

// Export singleton instance
export const vocabularyStore = new VocabularyStore();

export default VocabularyStore;
