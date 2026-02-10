/**
 * FuzzyMatcher.js
 *
 * Provides fuzzy string matching algorithms for voice transcript extraction.
 * Uses Jaro-Winkler for short strings (typo tolerance) and trigram similarity
 * for longer strings.
 */

export class FuzzyMatcher {
  /**
   * @param {Object} options
   * @param {number} options.threshold - Minimum similarity score to consider a match (0-1)
   */
  constructor(options = {}) {
    this.threshold = options.threshold ?? 0.75;
  }

  /**
   * Calculate similarity between two strings.
   * Uses Jaro-Winkler for short strings (<10 chars) and trigram for longer.
   * @param {string} a - First string
   * @param {string} b - Second string
   * @returns {number} Similarity score 0-1
   */
  similarity(a, b) {
    if (!a || !b) return 0;

    const s1 = a.toLowerCase().trim();
    const s2 = b.toLowerCase().trim();

    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;

    // Use Jaro-Winkler for short strings (better for typos)
    if (s1.length < 10 && s2.length < 10) {
      return this.jaroWinkler(s1, s2);
    }

    // Use trigram similarity for longer strings
    return this.trigramSimilarity(s1, s2);
  }

  /**
   * Check if two strings are similar enough (above threshold).
   * @param {string} a - First string
   * @param {string} b - Second string
   * @param {number} customThreshold - Optional custom threshold
   * @returns {boolean}
   */
  isMatch(a, b, customThreshold) {
    const threshold = customThreshold ?? this.threshold;
    return this.similarity(a, b) >= threshold;
  }

  /**
   * Find best match from a list of candidates.
   * @param {string} query - String to match
   * @param {string[]} candidates - Array of candidate strings
   * @param {number} minScore - Minimum score to return (default: threshold)
   * @returns {{ match: string, score: number } | null}
   */
  findBestMatch(query, candidates, minScore) {
    const threshold = minScore ?? this.threshold;
    let bestMatch = null;
    let bestScore = 0;

    for (const candidate of candidates) {
      const score = this.similarity(query, candidate);
      if (score > bestScore && score >= threshold) {
        bestScore = score;
        bestMatch = candidate;
      }
    }

    return bestMatch ? { match: bestMatch, score: bestScore } : null;
  }

  /**
   * Find all matches above threshold.
   * @param {string} query - String to match
   * @param {string[]} candidates - Array of candidate strings
   * @param {number} minScore - Minimum score
   * @returns {Array<{ match: string, score: number }>}
   */
  findAllMatches(query, candidates, minScore) {
    const threshold = minScore ?? this.threshold;
    const matches = [];

    for (const candidate of candidates) {
      const score = this.similarity(query, candidate);
      if (score >= threshold) {
        matches.push({ match: candidate, score });
      }
    }

    return matches.sort((a, b) => b.score - a.score);
  }

  /**
   * Jaro similarity algorithm.
   * @private
   */
  jaroSimilarity(s1, s2) {
    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;

    const matchWindow = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
    const s1Matches = new Array(s1.length).fill(false);
    const s2Matches = new Array(s2.length).fill(false);

    let matches = 0;
    let transpositions = 0;

    // Find matching characters
    for (let i = 0; i < s1.length; i++) {
      const start = Math.max(0, i - matchWindow);
      const end = Math.min(i + matchWindow + 1, s2.length);

      for (let j = start; j < end; j++) {
        if (s2Matches[j] || s1[i] !== s2[j]) continue;
        s1Matches[i] = s2Matches[j] = true;
        matches++;
        break;
      }
    }

    if (matches === 0) return 0;

    // Count transpositions
    let k = 0;
    for (let i = 0; i < s1.length; i++) {
      if (!s1Matches[i]) continue;
      while (!s2Matches[k]) k++;
      if (s1[i] !== s2[k]) transpositions++;
      k++;
    }

    return (
      matches / s1.length +
      matches / s2.length +
      (matches - transpositions / 2) / matches
    ) / 3;
  }

  /**
   * Jaro-Winkler similarity (Jaro + common prefix bonus).
   * @private
   */
  jaroWinkler(s1, s2) {
    const jaro = this.jaroSimilarity(s1, s2);

    // Find common prefix length (up to 4 chars)
    let prefix = 0;
    for (let i = 0; i < Math.min(4, s1.length, s2.length); i++) {
      if (s1[i] === s2[i]) prefix++;
      else break;
    }

    // Winkler modification: boost for common prefix
    return jaro + prefix * 0.1 * (1 - jaro);
  }

  /**
   * Generate trigrams from a string.
   * @private
   */
  getTrigrams(s) {
    const padded = `  ${s} `;
    const trigrams = new Set();
    for (let i = 0; i < padded.length - 2; i++) {
      trigrams.add(padded.slice(i, i + 3));
    }
    return trigrams;
  }

  /**
   * Trigram (Jaccard) similarity.
   * @private
   */
  trigramSimilarity(s1, s2) {
    const trigrams1 = this.getTrigrams(s1);
    const trigrams2 = this.getTrigrams(s2);

    const intersection = [...trigrams1].filter(t => trigrams2.has(t)).length;
    const union = new Set([...trigrams1, ...trigrams2]).size;

    return union === 0 ? 0 : intersection / union;
  }

  /**
   * Levenshtein distance (edit distance).
   * Useful for determining how many edits needed.
   * @param {string} a - First string
   * @param {string} b - Second string
   * @returns {number} Edit distance
   */
  levenshteinDistance(a, b) {
    const s1 = a.toLowerCase();
    const s2 = b.toLowerCase();

    if (s1.length === 0) return s2.length;
    if (s2.length === 0) return s1.length;

    const matrix = [];

    // Initialize matrix
    for (let i = 0; i <= s1.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= s2.length; j++) {
      matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= s1.length; i++) {
      for (let j = 1; j <= s2.length; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return matrix[s1.length][s2.length];
  }

  /**
   * Normalized Levenshtein similarity (0-1).
   * @param {string} a - First string
   * @param {string} b - Second string
   * @returns {number} Similarity score 0-1
   */
  levenshteinSimilarity(a, b) {
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1;
    return 1 - this.levenshteinDistance(a, b) / maxLen;
  }

  /**
   * Check if string contains all words from query (order independent).
   * @param {string} query - Query string (words to find)
   * @param {string} target - Target string to search in
   * @returns {boolean}
   */
  containsAllWords(query, target) {
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    const targetLower = target.toLowerCase();

    return queryWords.every(word => targetLower.includes(word));
  }

  /**
   * Calculate word overlap ratio.
   * @param {string} a - First string
   * @param {string} b - Second string
   * @returns {number} Overlap ratio 0-1
   */
  wordOverlap(a, b) {
    const words1 = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 0));
    const words2 = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 0));

    if (words1.size === 0 || words2.size === 0) return 0;

    const intersection = [...words1].filter(w => words2.has(w)).length;
    const smaller = Math.min(words1.size, words2.size);

    return intersection / smaller;
  }
}

export default FuzzyMatcher;
