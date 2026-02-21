/**
 * TranscriptExtractor.js
 *
 * Main extraction engine for voice transcripts.
 * Extracts card name, rarity, art variant, and set info from spoken input
 * in any word order.
 *
 * Example inputs:
 * - "ryzeal detonator emblazoned secret rare limited pack 2025"
 * - "quarter century stampede dark magician 9th art platinum secret rare"
 * - "LP25 secret rare blue eyes"
 */

import { VocabularyStore, vocabularyStore } from './VocabularyStore.js';
import { FuzzyMatcher } from './FuzzyMatcher.js';
import { ConflictResolver } from './ConflictResolver.js';

/**
 * @typedef {Object} ExtractionResult
 * @property {{ value: string, confidence: number } | null} cardName
 * @property {{ value: string, confidence: number } | null} rarity
 * @property {{ value: string, confidence: number } | null} setCode
 * @property {{ value: string, confidence: number } | null} setName
 * @property {{ value: string, confidence: number } | null} artVariant
 * @property {number} overallConfidence
 * @property {string[]} unmatchedText
 * @property {Object} [metadata] - Additional extraction metadata
 */

// Category order for matching (most specific first)
const CATEGORY_ORDER = ['rarity', 'artVariant', 'setCode', 'setName', 'cardName'];

// Confidence thresholds per category
const CONFIDENCE_THRESHOLDS = {
  rarity: 0.6,
  artVariant: 0.7,
  setCode: 0.75,
  setName: 0.5,
  cardName: 0.45,
};

export class TranscriptExtractor {
  /**
   * @param {VocabularyStore} [store] - Vocabulary store instance
   * @param {Object} [options]
   * @param {string} [options.activeSetCode] - Current session's active set code
   * @param {string[]} [options.activeSetCodes] - All active set codes (for multi-set)
   * @param {Object} [options.contextualBoosts] - Confidence boosts for context
   */
  constructor(store, options = {}) {
    this.vocabularyStore = store || vocabularyStore;
    this.fuzzyMatcher = new FuzzyMatcher({ threshold: 0.65 });
    this.conflictResolver = new ConflictResolver();

    this.activeSetCode = options.activeSetCode || null;
    this.activeSetCodes = options.activeSetCodes || [];
    this.contextualBoosts = options.contextualBoosts || {
      cardNamesInSet: 0.15,
      activeSetCode: 0.2,
    };

    this.logger = options.logger || console;
  }

  /**
   * Extract entities from a voice transcript.
   * @param {string} transcript - Voice transcript text
   * @returns {ExtractionResult}
   */
  extract(transcript) {
    if (!transcript || typeof transcript !== 'string') {
      return this.emptyResult();
    }

    // Phase 1: Tokenize
    const tokens = this.tokenize(transcript);
    if (tokens.length === 0) {
      return this.emptyResult();
    }

    // Phase 2: Find all candidate matches
    const candidates = this.findAllCandidates(tokens);

    // Phase 3: Resolve conflicts
    const bestParse = this.conflictResolver.resolve(candidates, tokens.length);

    // Phase 4: Build result
    const result = this.buildResult(bestParse, tokens);

    // Phase 5: Apply multi-set logic if needed
    if (this.activeSetCodes.length > 1 && result.cardName && result.rarity) {
      this.applyMultiSetLogic(result);
    }

    return result;
  }

  /**
   * Tokenize transcript into words.
   */
  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')  // Replace punctuation with space
      .split(/\s+/)
      .filter(t => t.length > 0);
  }

  /**
   * Find all candidate matches across all categories.
   */
  findAllCandidates(tokens) {
    const candidates = [];

    for (const category of CATEGORY_ORDER) {
      const maxLen = this.vocabularyStore.getMaxTokens(category) || 5;

      // Sliding window from longest to shortest (prefer specific matches)
      for (let windowSize = Math.min(maxLen, tokens.length); windowSize >= 1; windowSize--) {
        for (let start = 0; start <= tokens.length - windowSize; start++) {
          const end = start + windowSize;
          const ngram = tokens.slice(start, end).join(' ');

          const match = this.matchAgainstCategory(ngram, category, start, end);
          if (match) {
            candidates.push(match);
          }
        }
      }
    }

    return candidates;
  }

  /**
   * Match an n-gram against a vocabulary category.
   */
  matchAgainstCategory(ngram, category, startIndex, endIndex) {
    const threshold = CONFIDENCE_THRESHOLDS[category] || 0.5;

    // Try exact/variant match first (fast path)
    const exactMatches = this.vocabularyStore.lookup(ngram, category);
    if (exactMatches.length > 0) {
      // Find best exact match
      let bestMatch = null;
      let bestScore = 0;

      for (const entry of exactMatches) {
        // Check for exact match
        if (entry.variants.includes(ngram)) {
          const isExact = entry.canonical.toLowerCase() === ngram;
          let confidence = isExact ? 1.0 : 0.95;

          // Apply contextual boosts
          confidence = this.applyContextualBoost(confidence, entry, category);

          if (confidence > bestScore) {
            bestScore = confidence;
            bestMatch = {
              category,
              canonical: entry.canonical,
              matchedText: ngram,
              startIndex,
              endIndex,
              confidence,
              matchType: isExact ? 'exact' : 'variant',
              metadata: entry.metadata,
            };
          }
        }
      }

      if (bestMatch && bestMatch.confidence >= threshold) {
        return bestMatch;
      }
    }

    // Try fuzzy match (slower, for voice errors)
    const fuzzyResults = this.vocabularyStore.fuzzySearch(ngram, category, 3);
    if (fuzzyResults.length > 0) {
      const best = fuzzyResults[0];
      let confidence = best.score * 0.9; // Discount fuzzy matches

      // Apply contextual boosts
      confidence = this.applyContextualBoost(confidence, best.entry, category);

      if (confidence >= threshold) {
        return {
          category,
          canonical: best.entry.canonical,
          matchedText: ngram,
          startIndex,
          endIndex,
          confidence,
          matchType: 'fuzzy',
          metadata: best.entry.metadata,
        };
      }
    }

    // Special handling for card names - try word-based lookup
    if (category === 'cardName' && ngram.split(' ').length >= 2) {
      const words = ngram.split(' ').filter(w => w.length > 2);
      const candidateCards = new Set();

      for (const word of words) {
        const matches = this.vocabularyStore.searchCardsByWord(word);
        matches.forEach(m => candidateCards.add(m));
      }

      let bestMatch = null;
      let bestScore = 0;

      for (const entry of candidateCards) {
        // Use fuzzy matcher for comparison
        const score = this.fuzzyMatcher.similarity(ngram, entry.canonical);
        const confidence = this.applyContextualBoost(score * 0.85, entry, category);

        if (confidence > bestScore && confidence >= threshold) {
          bestScore = confidence;
          bestMatch = {
            category,
            canonical: entry.canonical,
            matchedText: ngram,
            startIndex,
            endIndex,
            confidence,
            matchType: 'fuzzy',
            metadata: entry.metadata,
          };
        }
      }

      if (bestMatch) {
        return bestMatch;
      }
    }

    return null;
  }

  /**
   * Apply contextual boosts based on session state.
   */
  applyContextualBoost(confidence, entry, category) {
    let boosted = confidence;

    // Boost cards that are in the active set
    if (category === 'cardName' && entry.metadata?.setCode) {
      if (this.activeSetCodes.includes(entry.metadata.setCode)) {
        boosted += this.contextualBoosts.cardNamesInSet || 0;
      }
    }

    // Boost the active set code
    if (category === 'setCode') {
      if (this.activeSetCodes.includes(entry.canonical)) {
        boosted += this.contextualBoosts.activeSetCode || 0;
      }
    }

    return Math.min(boosted, 1.0);
  }

  /**
   * Build extraction result from parsed interpretation.
   */
  buildResult(parse, tokens) {
    const result = {
      cardName: null,
      rarity: null,
      setCode: null,
      setName: null,
      artVariant: null,
      overallConfidence: parse.score,
      unmatchedText: parse.unmatchedTokens.map(i => tokens[i]),
      metadata: {
        matchCount: parse.matches.length,
        tokenCount: tokens.length,
      },
    };

    for (const match of parse.matches) {
      const entry = { value: match.canonical, confidence: match.confidence };

      switch (match.category) {
        case 'cardName':
          result.cardName = entry;
          result.metadata.cardMetadata = match.metadata;
          break;
        case 'rarity':
          result.rarity = entry;
          result.metadata.rarityMetadata = match.metadata;
          break;
        case 'setCode':
          result.setCode = entry;
          result.metadata.setMetadata = match.metadata;
          break;
        case 'setName':
          result.setName = entry;
          result.metadata.setNameMetadata = match.metadata;
          break;
        case 'artVariant':
          result.artVariant = entry;
          result.metadata.artMetadata = match.metadata;
          break;
      }
    }

    return result;
  }

  /**
   * Apply multi-set logic for disambiguation.
   * When multiple sets are active, use rarity context to pick the right set.
   */
  applyMultiSetLogic(result) {
    // If we already have a set code from the transcript, we're done
    if (result.setCode) {
      return;
    }

    // If no set was mentioned but we have card + rarity, try to infer set
    if (!result.cardName || !result.rarity) {
      return;
    }

    const cardName = result.cardName.value;
    const rarity = result.rarity.value;

    // Find which sets have this card + rarity combination
    const matchingSets = this.findSetsWithCardAndRarity(cardName, rarity);

    if (matchingSets.length === 1) {
      // Only one set has this combo - auto-assign
      result.setCode = {
        value: matchingSets[0].setCode,
        confidence: 0.9,
      };
      result.metadata.setInferred = true;
      result.metadata.inferredFrom = 'unique_card_rarity_combo';
    } else if (matchingSets.length > 1) {
      // Multiple sets - mark as ambiguous, caller should show picker
      result.metadata.ambiguousSets = matchingSets;
      result.metadata.needsSetConfirmation = true;
    }
  }

  /**
   * Find sets that have a specific card + rarity combination.
   * This would query the vocabulary store or database.
   */
  findSetsWithCardAndRarity(cardName, rarity) {
    // For now, return empty - this will be populated from session context
    // The SessionManager will handle this with actual database queries
    return [];
  }

  /**
   * Update session context (called when session changes).
   */
  setSessionContext(options) {
    if (options.activeSetCode !== undefined) {
      this.activeSetCode = options.activeSetCode;
    }
    if (options.activeSetCodes !== undefined) {
      this.activeSetCodes = options.activeSetCodes;
    }
    if (options.contextualBoosts !== undefined) {
      this.contextualBoosts = { ...this.contextualBoosts, ...options.contextualBoosts };
    }
  }

  /**
   * Preload vocabulary for session sets.
   */
  async preloadForSession(setCodes) {
    if (!setCodes || setCodes.length === 0) return;

    this.activeSetCodes = setCodes;
    await this.vocabularyStore.loadCardsForSets(setCodes);
  }

  /**
   * Return empty result.
   */
  emptyResult() {
    return {
      cardName: null,
      rarity: null,
      setCode: null,
      setName: null,
      artVariant: null,
      overallConfidence: 0,
      unmatchedText: [],
      metadata: {},
    };
  }
}

// Factory function to create an extractor with initialized vocabulary
export async function createTranscriptExtractor(options = {}) {
  const store = options.vocabularyStore || vocabularyStore;

  // Ensure vocabulary is initialized
  if (!store.initialized) {
    await store.initialize();
  }

  // Preload cards for active sets if provided
  if (options.activeSetCodes?.length > 0) {
    await store.loadCardsForSets(options.activeSetCodes);
  } else if (options.activeSetCode) {
    await store.loadCardsForSet(options.activeSetCode);
  }

  return new TranscriptExtractor(store, options);
}

export default TranscriptExtractor;
