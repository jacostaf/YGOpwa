/**
 * Catalog normalization helpers used by ingestion scripts.
 * These functions stay pure so they can be unit-tested without hitting upstream APIs.
 */

const RARITY_MAP = new Map([
  ['Common', { key: 'common', rank: 1, weight: 1 }],
  ['Short Print', { key: 'rare', rank: 2, weight: 2 }],
  ['Rare', { key: 'rare', rank: 2, weight: 2 }],
  ['Super Rare', { key: 'super_rare', rank: 3, weight: 5 }],
  ['Ultra Rare', { key: 'ultra_rare', rank: 4, weight: 10 }],
  ['Secret Rare', { key: 'secret_rare', rank: 5, weight: 25 }],
  ['Ultimate Rare', { key: 'ultimate_rare', rank: 6, weight: 30 }],
  ['Ghost Rare', { key: 'ghost_rare', rank: 7, weight: 50 }],
  ['Starlight Rare', { key: 'starlight_rare', rank: 8, weight: 100 }],
  ['Quarter Century Secret Rare', { key: 'quarter_century_secret_rare', rank: 9, weight: 150 }]
]);

const DEFAULT_RARITY = { key: 'common', rank: 1, weight: 1 };

/**
 * Attempt to collapse YGOProDeck set code into canonical Supabase set code.
 * @param {string} rawCode
 * @returns {string}
 */
export function normalizeSetCode(rawCode) {
  if (!rawCode) {
    return 'UNKNOWN';
  }

  const pieces = rawCode.split('-');

  // Many codes look like LOB-EN001 → keep prefix before first dash unless it is part of locale
  if (pieces.length === 1) {
    return pieces[0].trim().toUpperCase();
  }

  const prefix = pieces[0].trim().toUpperCase();

  // Some codes include locale (e.g., LOB-EN001, LOB-KR001). Preserve prefix only.
  return prefix || 'UNKNOWN';
}

/**
 * Extracts the printed card number portion of the set code.
 * @param {string} rawCode
 * @returns {string|null}
 */
export function extractCardNumber(rawCode) {
  if (!rawCode || !rawCode.includes('-')) {
    return null;
  }

  const suffix = rawCode.split('-').pop();
  return suffix ? suffix.trim().toUpperCase() : null;
}

/**
 * Attempts to infer edition information from the set name or rarity text.
 * @param {{ set_name?: string, set_rarity?: string }} setEntry
 * @returns {string}
 */
export function inferEdition(setEntry = {}) {
  const { set_name: setName = '', set_rarity: setRarity = '' } = setEntry;
  const normalized = `${setName} ${setRarity}`.toLowerCase();

  if (normalized.includes('1st edition')) {
    return '1st';
  }

  if (normalized.includes('limited edition')) {
    return 'limited';
  }

  if (normalized.includes('unlimited')) {
    return 'unlimited';
  }

  return 'unverified';
}

/**
 * Determines the art style for a card based on number of available images.
 * @param {Array} images
 * @returns {'classic'|'alternate'|'prismatic'}
 */
export function determineArtStyle(images = []) {
  if (!Array.isArray(images) || images.length === 0) {
    return 'classic';
  }

  if (images.length > 1) {
    return 'alternate';
  }

  const imageUrl = images[0]?.image_url ?? '';
  return imageUrl.toLowerCase().includes('prismatic') ? 'prismatic' : 'classic';
}

/**
 * Maps a YGOProDeck rarity label to Supabase rarity metadata.
 * @param {string} rarityLabel
 * @returns {{ key: string, rank: number, weight: number, name: string }}
 */
export function mapRarity(rarityLabel) {
  if (!rarityLabel) {
    return { ...DEFAULT_RARITY, name: 'Common' };
  }

  const entry = RARITY_MAP.get(rarityLabel);
  if (entry) {
    return { ...entry, name: rarityLabel };
  }

  // Normalise unexpected rarity values using title case.
  const sanitizedName = rarityLabel.trim();
  return {
    ...DEFAULT_RARITY,
    name: sanitizedName || 'Common'
  };
}

/**
 * Build slug used for card_variants.card_slug column.
 * @param {string} cardName
 * @param {string} rawSetCode
 * @param {string|null} cardNumber
 * @returns {string}
 */
export function buildCardSlug(cardName, rawSetCode, cardNumber) {
  const namePart = (cardName || 'unknown-card')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const setPart = normalizeSetCode(rawSetCode).toLowerCase();
  const numberPart = cardNumber ? cardNumber.toLowerCase() : null;

  return [namePart, setPart, numberPart].filter(Boolean).join('-');
}

/**
 * Guess language from set code suffix (e.g., EN, FR).
 * @param {string} rawCode
 * @returns {string}
 */
export function inferLanguage(rawCode) {
  if (!rawCode) {
    return 'en';
  }

  const match = rawCode.match(/-([A-Z]{2})/i);
  if (!match) {
    return 'en';
  }

  const locale = match[1].toLowerCase();
  const supported = ['en', 'fr', 'de', 'it', 'es', 'pt', 'ja', 'ko', 'zh'];
  return supported.includes(locale) ? locale : 'en';
}

/**
 * Determine heuristic set type from name.
 * @param {string} setName
 * @returns {string}
 */
export function inferSetType(setName = '') {
  const lower = setName.toLowerCase();

  if (lower.includes('booster')) {
    return 'Booster Pack';
  }
  if (lower.includes('starter')) {
    return 'Starter Deck';
  }
  if (lower.includes('structure')) {
    return 'Structure Deck';
  }
  if (lower.includes('tin')) {
    return 'Collector Tin';
  }
  if (lower.includes('promotional') || lower.includes('promo')) {
    return 'Promotional';
  }

  return 'Unknown';
}

/**
 * Normalise raw YGOProDeck card payload into discrete records for persistence.
 * @param {object} card
 * @returns {{ sets: Array, rarities: Array, variants: Array, prices: Array }}
 */
export function normalizeCardRecord(card = {}) {
  const {
    name: cardName = 'Unknown Card',
    card_sets: cardSets = [],
    card_images: cardImages = [],
    card_prices: cardPrices = []
  } = card;

  const normalizedSets = [];
  const normalizedRarities = [];
  const normalizedVariants = [];
  const normalizedPrices = [];

  for (const setEntry of cardSets) {
    if (!setEntry?.set_code) {
      continue;
    }

    const baseSetCode = normalizeSetCode(setEntry.set_code);
    const cardNumber = extractCardNumber(setEntry.set_code);
    const rarity = mapRarity(setEntry.set_rarity);

    normalizedSets.push({
      set_code: baseSetCode,
      name: setEntry.set_name || baseSetCode,
      release_date: null,
      set_type: inferSetType(setEntry.set_name)
    });

    normalizedRarities.push({
      rarity_key: rarity.key,
      rarity_name: rarity.name,
      rarity_rank: rarity.rank,
      weight: rarity.weight
    });

    normalizedVariants.push({
      card_slug: buildCardSlug(cardName, baseSetCode, cardNumber),
      card_name: cardName,
      set_code: baseSetCode,
      rarity_key: rarity.key,
      edition: inferEdition(setEntry),
      art_style: determineArtStyle(cardImages),
      card_number: cardNumber,
      language: inferLanguage(setEntry.set_code)
    });

    const priceInfo = cardPrices?.[0];
    if (priceInfo && priceInfo.tcgplayer_price) {
      const priceValue = Number.parseFloat(priceInfo.tcgplayer_price);
      if (!Number.isNaN(priceValue) && priceValue > 0) {
        normalizedPrices.push({
          card_slug: buildCardSlug(cardName, baseSetCode, cardNumber),
          price: priceValue,
          currency: 'USD',
          source: 'ygoprodeck',
          metadata: {
            tcgplayer_price: priceValue,
            raw: priceInfo
          }
        });
      }
    }
  }

  return {
    sets: dedupeBy(normalizedSets, 'set_code'),
    rarities: dedupeBy(normalizedRarities, 'rarity_key'),
    variants: dedupeBy(normalizedVariants, 'card_slug'),
    prices: normalizedPrices
  };
}

/**
 * Simple helper to deduplicate array of objects by key.
 * @template T
 * @param {T[]} items
 * @param {keyof T} key
 * @returns {T[]}
 */
export function dedupeBy(items, key) {
  const seen = new Set();
  const result = [];

  for (const item of items) {
    const value = item?.[key];
    if (value == null || seen.has(value)) {
      continue;
    }

    seen.add(value);
    result.push(item);
  }

  return result;
}

/**
 * Chunk helper for ingestion batching.
 * @param {Array} items
 * @param {number} size
 * @returns {Array<Array>}
 */
export function chunk(items, size) {
  const result = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

export default {
  normalizeCardRecord,
  normalizeSetCode,
  extractCardNumber,
  inferEdition,
  determineArtStyle,
  mapRarity,
  buildCardSlug,
  inferLanguage,
  inferSetType,
  dedupeBy,
  chunk
};
