/**
 * ConflictResolver.js
 *
 * Resolves conflicts when multiple entity interpretations overlap.
 * Uses graph-based maximum weight independent set algorithm to find
 * the best non-overlapping interpretation of a voice transcript.
 */

/**
 * @typedef {Object} MatchCandidate
 * @property {'rarity' | 'setCode' | 'setName' | 'artVariant' | 'cardName'} category
 * @property {string} canonical - Matched canonical value
 * @property {string} matchedText - What was actually matched
 * @property {number} startIndex - Token position start (inclusive)
 * @property {number} endIndex - Token position end (exclusive)
 * @property {number} confidence - 0-1 score
 * @property {'exact' | 'variant' | 'fuzzy' | 'abbreviation'} matchType
 * @property {Object} [metadata] - Additional data from vocabulary entry
 */

/**
 * @typedef {Object} ParseInterpretation
 * @property {MatchCandidate[]} matches
 * @property {number[]} unmatchedTokens - Token indices not covered
 * @property {number} score - Aggregate score for this interpretation
 */

// Category precedence (higher = more important when tie-breaking)
const CATEGORY_PRECEDENCE = {
  rarity: 5,
  artVariant: 4,
  setCode: 4,
  setName: 3,
  cardName: 2,
};

// Match type quality (higher = better)
const MATCH_TYPE_RANK = {
  exact: 4,
  variant: 3,
  abbreviation: 2,
  fuzzy: 1,
};

export class ConflictResolver {
  constructor(options = {}) {
    this.maxInterpretations = options.maxInterpretations || 5;
    this.logger = options.logger || console;
  }

  /**
   * Resolve conflicts between overlapping candidates.
   * @param {MatchCandidate[]} candidates - All potential matches
   * @param {number} tokenCount - Total number of tokens in transcript
   * @returns {ParseInterpretation} Best interpretation
   */
  resolve(candidates, tokenCount) {
    if (candidates.length === 0) {
      return { matches: [], unmatchedTokens: this.range(tokenCount), score: 0 };
    }

    // Handle ambiguity (e.g., "secret" in card name vs rarity)
    const adjustedCandidates = this.handleAmbiguity(candidates);

    // Build conflict graph
    const conflicts = this.buildConflictGraph(adjustedCandidates);

    // Find best interpretations
    const interpretations = this.findInterpretations(
      adjustedCandidates,
      conflicts,
      tokenCount
    );

    // Sort by score (highest first)
    interpretations.sort((a, b) => b.score - a.score);

    return interpretations[0] || { matches: [], unmatchedTokens: this.range(tokenCount), score: 0 };
  }

  /**
   * Get all valid interpretations (for debugging or showing alternatives).
   */
  getAllInterpretations(candidates, tokenCount) {
    if (candidates.length === 0) {
      return [{ matches: [], unmatchedTokens: this.range(tokenCount), score: 0 }];
    }

    const adjustedCandidates = this.handleAmbiguity(candidates);
    const conflicts = this.buildConflictGraph(adjustedCandidates);
    const interpretations = this.findInterpretations(adjustedCandidates, conflicts, tokenCount);

    return interpretations.sort((a, b) => b.score - a.score);
  }

  /**
   * Handle ambiguity where a word could belong to multiple categories.
   * @param {MatchCandidate[]} candidates
   * @returns {MatchCandidate[]} Adjusted candidates with modified confidence
   */
  handleAmbiguity(candidates) {
    const adjusted = [...candidates];

    // Group candidates by token range
    const rangeMap = new Map();
    for (let i = 0; i < adjusted.length; i++) {
      const key = `${adjusted[i].startIndex}-${adjusted[i].endIndex}`;
      if (!rangeMap.has(key)) {
        rangeMap.set(key, []);
      }
      rangeMap.get(key).push(i);
    }

    // Check for specific ambiguity patterns
    for (const indices of rangeMap.values()) {
      if (indices.length < 2) continue;

      const group = indices.map(i => adjusted[i]);

      // Pattern 1: Single word that could be rarity or part of card name
      // e.g., "secret" matching both "Secret Rare" and "Secret Keeper"
      const rarityMatch = group.find(c => c.category === 'rarity');
      const cardMatch = group.find(c => c.category === 'cardName');

      if (rarityMatch && cardMatch) {
        // If card name is more specific (higher confidence), demote rarity
        if (cardMatch.confidence > rarityMatch.confidence * 0.9) {
          const rarityIdx = indices.find(i => adjusted[i] === rarityMatch);
          if (rarityIdx !== undefined) {
            adjusted[rarityIdx] = {
              ...adjusted[rarityIdx],
              confidence: adjusted[rarityIdx].confidence * 0.5,
            };
          }
        }
      }

      // Pattern 2: Short matches vs longer matches at same position
      // Prefer longer (more specific) matches
      const spans = group.map(c => c.endIndex - c.startIndex);
      const maxSpan = Math.max(...spans);
      for (const idx of indices) {
        const span = adjusted[idx].endIndex - adjusted[idx].startIndex;
        if (span < maxSpan) {
          adjusted[idx] = {
            ...adjusted[idx],
            confidence: adjusted[idx].confidence * (0.7 + 0.3 * span / maxSpan),
          };
        }
      }
    }

    // Check for overlapping card name that contains rarity words
    const cardMatches = adjusted.filter(c => c.category === 'cardName');
    const rarityMatches = adjusted.filter(c => c.category === 'rarity');

    for (const card of cardMatches) {
      if (card.confidence < 0.7) continue;

      for (let i = 0; i < adjusted.length; i++) {
        const r = adjusted[i];
        if (r.category !== 'rarity') continue;

        // If rarity is completely contained within a high-confidence card match
        if (r.startIndex >= card.startIndex && r.endIndex <= card.endIndex) {
          // Check if the matched text is a single common word
          if (r.matchedText.split(' ').length === 1) {
            const singleWord = r.matchedText.toLowerCase();
            const commonWords = ['secret', 'rare', 'ultra', 'super', 'ghost'];
            if (commonWords.includes(singleWord)) {
              // Heavily penalize single-word rarity matches inside card names
              adjusted[i] = {
                ...adjusted[i],
                confidence: adjusted[i].confidence * 0.3,
              };
            }
          }
        }
      }
    }

    return adjusted;
  }

  /**
   * Build conflict graph where edges connect overlapping candidates.
   * @param {MatchCandidate[]} candidates
   * @returns {Map<number, Set<number>>} Adjacency list
   */
  buildConflictGraph(candidates) {
    const conflicts = new Map();

    for (let i = 0; i < candidates.length; i++) {
      conflicts.set(i, new Set());
      for (let j = 0; j < candidates.length; j++) {
        if (i !== j && this.overlaps(candidates[i], candidates[j])) {
          conflicts.get(i).add(j);
        }
      }
    }

    return conflicts;
  }

  /**
   * Check if two candidates overlap in token positions.
   */
  overlaps(a, b) {
    return !(a.endIndex <= b.startIndex || b.endIndex <= a.startIndex);
  }

  /**
   * Find valid interpretations using branch-and-bound.
   */
  findInterpretations(candidates, conflicts, tokenCount) {
    const interpretations = [];

    const search = (current, excluded) => {
      // Find next candidate to consider
      let nextIdx = -1;
      for (let i = 0; i < candidates.length; i++) {
        if (!current.includes(i) && !excluded.has(i)) {
          nextIdx = i;
          break;
        }
      }

      if (nextIdx === -1) {
        // No more candidates - record this interpretation
        const matches = current.map(i => candidates[i]);
        const covered = new Set();
        matches.forEach(m => {
          for (let i = m.startIndex; i < m.endIndex; i++) {
            covered.add(i);
          }
        });

        const unmatchedTokens = [];
        for (let i = 0; i < tokenCount; i++) {
          if (!covered.has(i)) unmatchedTokens.push(i);
        }

        const score = this.scoreInterpretation(matches, unmatchedTokens, tokenCount);
        interpretations.push({ matches, unmatchedTokens, score });

        // Keep only top N
        if (interpretations.length > this.maxInterpretations * 2) {
          interpretations.sort((a, b) => b.score - a.score);
          interpretations.length = this.maxInterpretations;
        }

        return;
      }

      // Branch 1: Include this candidate
      const newExcluded = new Set(excluded);
      conflicts.get(nextIdx)?.forEach(c => newExcluded.add(c));
      search([...current, nextIdx], newExcluded);

      // Branch 2: Exclude this candidate
      const skipExcluded = new Set(excluded);
      skipExcluded.add(nextIdx);
      search(current, skipExcluded);
    };

    search([], new Set());
    return interpretations;
  }

  /**
   * Score an interpretation.
   */
  scoreInterpretation(matches, unmatchedTokens, tokenCount) {
    if (matches.length === 0) return 0;

    // Factor 1: Coverage (40%)
    const coverage = 1 - unmatchedTokens.length / tokenCount;

    // Factor 2: Average confidence (40%)
    const avgConfidence = matches.reduce((s, m) => s + m.confidence, 0) / matches.length;

    // Factor 3: Category completeness (10%)
    const categories = new Set(matches.map(m => m.category));
    const completenessBonus = categories.has('cardName') ? 0.1 : 0;

    // Factor 4: Prefer longer matches (5%)
    const avgMatchLength = matches.reduce((s, m) => s + (m.endIndex - m.startIndex), 0) / matches.length;
    const lengthBonus = Math.min(avgMatchLength / 4, 0.05);

    // Factor 5: Match type quality (5%)
    const avgMatchQuality = matches.reduce((s, m) => s + (MATCH_TYPE_RANK[m.matchType] || 1), 0) / matches.length / 4;
    const qualityBonus = avgMatchQuality * 0.05;

    // Penalty: Multiple matches of same category (shouldn't have 2 rarities)
    const duplicatePenalty = (matches.length - categories.size) * 0.15;

    return (
      coverage * 0.4 +
      avgConfidence * 0.4 +
      completenessBonus +
      lengthBonus +
      qualityBonus -
      duplicatePenalty
    );
  }

  /**
   * Break tie between two candidates.
   */
  breakTie(a, b) {
    // 1. Higher confidence wins
    if (Math.abs(a.confidence - b.confidence) > 0.1) {
      return a.confidence > b.confidence ? a : b;
    }

    // 2. Higher category precedence wins
    const precA = CATEGORY_PRECEDENCE[a.category] || 0;
    const precB = CATEGORY_PRECEDENCE[b.category] || 0;
    if (precA !== precB) {
      return precA > precB ? a : b;
    }

    // 3. Longer match wins (more specific)
    const lenA = a.endIndex - a.startIndex;
    const lenB = b.endIndex - b.startIndex;
    if (lenA !== lenB) {
      return lenA > lenB ? a : b;
    }

    // 4. Better match type wins
    const typeA = MATCH_TYPE_RANK[a.matchType] || 0;
    const typeB = MATCH_TYPE_RANK[b.matchType] || 0;
    if (typeA !== typeB) {
      return typeA > typeB ? a : b;
    }

    // 5. Earlier position wins (arbitrary but consistent)
    return a.startIndex < b.startIndex ? a : b;
  }

  /**
   * Helper to generate range array.
   */
  range(n) {
    return Array.from({ length: n }, (_, i) => i);
  }
}

export default ConflictResolver;
