/**
 * Phonetic Matcher - Fuzzy and Phonetic Matching for Voice Recognition
 * 
 * Provides advanced matching capabilities for Yu-Gi-Oh card names and rarities
 * using phonetic algorithms and fuzzy string matching techniques.
 * 
 * Features:
 * - Phonetic matching using Metaphone-like algorithm
 * - Fuzzy string matching with configurable thresholds
 * - Yu-Gi-Oh specific optimizations
 * - Rarity similarity matching (e.g., "secretary" -> "secret rare")
 * - Dynamic matching without hardcoded patterns
 */

import { Logger } from '../utils/Logger.js';

export class PhoneticMatcher {
    constructor(logger = null) {
        this.logger = logger || new Logger('PhoneticMatcher');
        
        // Configuration
        this.config = {
            phonetic: {
                minScore: 0.6,
                metaphoneLength: 4
            },
            fuzzy: {
                minScore: 0.7,
                insertCost: 1,
                deleteCost: 1,
                substituteCost: 1
            },
            rarity: {
                minScore: 0.6,
                endWordBonus: 0.2
            }
        };
        
        // Common Yu-Gi-Oh phonetic patterns
        this.phoneticPatterns = new Map();
        this.initializePhoneticPatterns();
        
        this.logger.info('PhoneticMatcher initialized');
    }

    /**
     * Initialize phonetic patterns for Yu-Gi-Oh specific terms
     */
    initializePhoneticPatterns() {
        // Card type patterns
        this.phoneticPatterns.set('DRKON', ['dragon', 'dragun', 'draken']);
        this.phoneticPatterns.set('MJSN', ['magician', 'majician', 'magishin']);
        this.phoneticPatterns.set('WRR', ['warrior', 'warrier', 'warier']);
        this.phoneticPatterns.set('ELMNTL', ['elemental', 'elemental', 'elemantal']);
        this.phoneticPatterns.set('SNKR', ['synchro', 'synkro', 'sincro']);
        this.phoneticPatterns.set('XS', ['xyz', 'exyz', 'excees']);
        this.phoneticPatterns.set('LNK', ['link', 'linku', 'lynk']);
        this.phoneticPatterns.set('PNTLM', ['pendulum', 'pendulam', 'pendelum']);
        
        // Rarity patterns
        this.phoneticPatterns.set('SKRT', ['secret', 'secretary', 'secrete']);
        this.phoneticPatterns.set('LTR', ['ultra', 'ultar', 'utra']);
        this.phoneticPatterns.set('SPR', ['super', 'supar', 'soper']);
        this.phoneticPatterns.set('KMN', ['common', 'comon', 'comun']);
        this.phoneticPatterns.set('R', ['rare', 'rair', 'rear']);
        this.phoneticPatterns.set('KSTR', ['quarter', 'kwarter', 'quater']);
        this.phoneticPatterns.set('SNTR', ['century', 'sentury', 'centary']);
        this.phoneticPatterns.set('PRSMTK', ['prismatic', 'prismatik', 'prizmatic']);
        this.phoneticPatterns.set('STRLKT', ['starlight', 'star light', 'starlit']);
        this.phoneticPatterns.set('KST', ['ghost', 'gost', 'goast']);
        this.phoneticPatterns.set('LTMT', ['ultimate', 'ultimat', 'ulitmate']);
        this.phoneticPatterns.set('PRLLL', ['parallel', 'paralel', 'paralell']);
        this.phoneticPatterns.set('KLKTR', ['collector', 'collectar', 'colector']);
    }

    /**
     * Generate metaphone-like code for phonetic matching
     */
    generatePhoneticCode(text) {
        if (!text || typeof text !== 'string') return '';
        
        let code = text.toLowerCase()
            .replace(/[^a-z\s]/g, '') // Remove non-letters except spaces
            .replace(/\s+/g, ' ') // Normalize spaces
            .trim();
        
        // Apply phonetic transformations
        const transforms = [
            // Common Yu-Gi-Oh mispronunciations
            [/ph/g, 'f'],
            [/ck/g, 'k'],
            [/c([eiy])/g, 's$1'],
            [/c/g, 'k'],
            [/qu/g, 'kw'],
            [/x/g, 'ks'],
            [/z/g, 's'],
            [/sh/g, 'x'],
            [/ch/g, 'x'],
            [/th/g, 't'],
            [/gh/g, 'g'],
            [/[aeiou]/g, ''], // Remove vowels except at start
            [/(.)\1+/g, '$1'], // Remove duplicate consonants
            [/\s+/g, ''] // Remove spaces
        ];
        
        for (const [pattern, replacement] of transforms) {
            code = code.replace(pattern, replacement);
        }
        
        return code.substring(0, this.config.phonetic.metaphoneLength).toUpperCase();
    }

    /**
     * Calculate fuzzy string similarity using Levenshtein distance
     */
    calculateFuzzySimilarity(str1, str2) {
        if (!str1 || !str2) return 0;
        if (str1 === str2) return 1;
        
        const len1 = str1.length;
        const len2 = str2.length;
        
        if (len1 === 0) return len2 === 0 ? 1 : 0;
        if (len2 === 0) return 0;
        
        // Create distance matrix
        const matrix = Array(len1 + 1).fill().map(() => Array(len2 + 1).fill(0));
        
        // Initialize first row and column
        for (let i = 0; i <= len1; i++) matrix[i][0] = i;
        for (let j = 0; j <= len2; j++) matrix[0][j] = j;
        
        // Fill the matrix
        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : this.config.fuzzy.substituteCost;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + this.config.fuzzy.deleteCost,
                    matrix[i][j - 1] + this.config.fuzzy.insertCost,
                    matrix[i - 1][j - 1] + cost
                );
            }
        }
        
        const distance = matrix[len1][len2];
        const maxLength = Math.max(len1, len2);
        return 1 - (distance / maxLength);
    }

    /**
     * Calculate phonetic similarity between two strings
     */
    calculatePhoneticSimilarity(str1, str2) {
        const code1 = this.generatePhoneticCode(str1);
        const code2 = this.generatePhoneticCode(str2);
        
        if (!code1 || !code2) return 0;
        if (code1 === code2) return 1;
        
        // Use fuzzy matching on phonetic codes
        return this.calculateFuzzySimilarity(code1, code2);
    }

    /**
     * Calculate combined similarity score with enhanced fuzzy matching
     */
    calculateSimilarity(input, target, options = {}) {
        const {
            usePhonetic = true,
            useFuzzy = true,
            phoneticWeight = 0.5,
            fuzzyWeight = 0.5,
            exactMatchBonus = 0.2,
            wordBoundaryBonus = 0.1
        } = options;
        
        if (!input || !target) return 0;
        
        const inputClean = this.cleanText(input);
        const targetClean = this.cleanText(target);
        
        // Exact match (case-insensitive)
        if (inputClean.toLowerCase() === targetClean.toLowerCase()) {
            return 1.0 + exactMatchBonus; // Bonus for exact match
        }
        
        let score = 0;
        let totalWeight = 0;
        
        // Fuzzy matching
        if (useFuzzy) {
            const fuzzyScore = this.calculateFuzzySimilarity(inputClean, targetClean);
            
            // Check for word boundary matches (whole word matches)
            const inputWords = inputClean.split(/\s+/);
            const targetWords = targetClean.split(/\s+/);
            
            // Check if any input word exactly matches any target word
            const wordMatches = inputWords.filter(word => 
                targetWords.some(tWord => tWord === word)
            );
            
            // Add bonus for word matches
            const wordMatchBonus = wordMatches.length > 0 ? 
                wordBoundaryBonus * (wordMatches.length / inputWords.length) : 0;
            
            score += (fuzzyScore + wordMatchBonus) * fuzzyWeight;
            totalWeight += fuzzyWeight;
        }
        
        // Phonetic matching
        if (usePhonetic) {
            const phoneticScore = this.calculatePhoneticSimilarity(inputClean, targetClean);
            score += phoneticScore * phoneticWeight;
            totalWeight += phoneticWeight;
        }
        
        // Normalize score
        const normalizedScore = totalWeight > 0 ? score / totalWeight : 0;
        
        // Apply length-based penalty for very short inputs
        const minLength = Math.min(inputClean.length, targetClean.length);
        const lengthPenalty = minLength < 3 ? 0.8 : 1.0;
        
        return Math.min(normalizedScore * lengthPenalty, 1.0);
    }
    
    /**
     * Find the best match for user input against a list of targets
     * @param {string} input - User input to match against
     * @param {Array} targets - Array of target strings or objects with a 'name' property
     * @param {Object} options - Matching options
     * @returns {Object} Best match with score and details
     */
    findBestMatch(input, targets, options = {}) {
        if (!input || !targets || !targets.length) {
            return { bestMatch: null, score: 0, matches: [] };
        }
        
        const {
            minScore = this.config.phonetic.minScore,
            includeAllMatches = false,
            caseSensitive = false
        } = options;
        
        const inputClean = this.cleanText(input);
        const matches = [];
        
        // First pass: look for exact matches
        for (const target of targets) {
            const targetStr = typeof target === 'string' ? target : target.name || '';
            const targetClean = this.cleanText(targetStr);
            
            // Skip empty targets
            if (!targetClean) continue;
            
            // Check for exact match (case-insensitive)
            if (inputClean === targetClean) {
                return {
                    bestMatch: target,
                    score: 1.0,
                    matchType: 'exact',
                    target: targetStr,
                    matches: [{ target: targetStr, score: 1.0, matchType: 'exact' }]
                };
            }
            
            // Check for partial exact match (input is part of target or vice versa)
            if (inputClean.includes(targetClean) || targetClean.includes(inputClean)) {
                const score = Math.min(
                    inputClean.length / Math.max(inputClean.length, targetClean.length),
                    targetClean.length / Math.max(inputClean.length, targetClean.length)
                ) * 0.9; // Slightly less than exact match
                
                matches.push({
                    target: targetStr,
                    score: Math.max(score, minScore),
                    matchType: 'partial',
                    original: target
                });
                continue;
            }
        }
        
        // If we found exact or partial matches, return the best one
        if (matches.length > 0) {
            matches.sort((a, b) => b.score - a.score);
            return {
                bestMatch: matches[0].original,
                score: matches[0].score,
                matchType: matches[0].matchType,
                target: matches[0].target,
                matches: includeAllMatches ? matches : [matches[0]]
            };
        }
        
        // Second pass: fuzzy matching
        for (const target of targets) {
            const targetStr = typeof target === 'string' ? target : target.name || '';
            const targetClean = this.cleanText(targetStr);
            
            // Skip empty targets
            if (!targetClean) continue;
            
            // Calculate similarity
            const similarity = this.calculateSimilarity(inputClean, targetClean, {
                usePhonetic: true,
                useFuzzy: true,
                phoneticWeight: 0.4,
                fuzzyWeight: 0.6
            });
            
            if (similarity >= minScore) {
                matches.push({
                    target: targetStr,
                    score: similarity,
                    matchType: 'fuzzy',
                    original: target
                });
            }
        }
        
        // Sort by score descending
        matches.sort((a, b) => b.score - a.score);
        
        // Return the best match or null if no matches found
        const bestMatch = matches.length > 0 ? matches[0] : null;
        
        return {
            bestMatch: bestMatch ? bestMatch.original : null,
            score: bestMatch ? bestMatch.score : 0,
            matchType: bestMatch ? bestMatch.matchType : 'none',
            target: bestMatch ? bestMatch.target : null,
            matches: includeAllMatches ? matches : (bestMatch ? [bestMatch] : [])
        };
    }

    /**
     * Find similar rarities, especially checking end of input
     */
    findSimilarRarities(input, rarityList, minScore = null) {
        if (!input || !rarityList || rarityList.length === 0) return [];
        
        const threshold = minScore !== null ? minScore : this.config.rarity.minScore;
        const results = [];
        const inputLower = input.toLowerCase().trim();
        
        // Extract potential rarity from end of input
        const words = inputLower.split(/\s+/);
        const endWords = words.slice(-3).join(' '); // Check last 3 words
        const lastWord = words[words.length - 1];
        const lastTwoWords = words.slice(-2).join(' ');
        
        for (const rarity of rarityList) {
            const rarityLower = rarity.toLowerCase();
            
            // Direct match
            if (inputLower.includes(rarityLower)) {
                results.push({
                    rarity,
                    score: 1.0,
                    matchType: 'exact',
                    extractedText: rarityLower
                });
                continue;
            }
            
            // Check end of input with bonus scoring
            const endScores = [
                { text: endWords, bonus: this.config.rarity.endWordBonus },
                { text: lastTwoWords, bonus: this.config.rarity.endWordBonus * 0.8 },
                { text: lastWord, bonus: this.config.rarity.endWordBonus * 0.6 }
            ];
            
            let bestMatch = null;
            
            for (const { text, bonus } of endScores) {
                const similarity = this.calculateSimilarity(text, rarityLower);
                const adjustedScore = Math.min(similarity + bonus, 1.0);
                
                if (adjustedScore >= threshold) {
                    if (!bestMatch || adjustedScore > bestMatch.score) {
                        bestMatch = {
                            rarity,
                            score: adjustedScore,
                            matchType: 'end_fuzzy',
                            extractedText: text
                        };
                    }
                }
            }
            
            if (bestMatch) {
                results.push(bestMatch);
                continue;
            }
            
            // Full input fuzzy matching
            const fullSimilarity = this.calculateSimilarity(inputLower, rarityLower);
            if (fullSimilarity >= threshold) {
                results.push({
                    rarity,
                    score: fullSimilarity,
                    matchType: 'full_fuzzy',
                    extractedText: inputLower
                });
            }
        }
        
        // Sort by score descending
        return results.sort((a, b) => b.score - a.score);
    }

    /**
     * Find similar card names
     */
    findSimilarCardNames(input, cardList, minScore = null) {
        if (!input || !cardList || cardList.length === 0) return [];
        
        const threshold = minScore !== null ? minScore : this.config.phonetic.minScore;
        const results = [];
        const inputClean = this.cleanText(input);
        
        for (const card of cardList) {
            const cardName = typeof card === 'string' ? card : card.name;
            if (!cardName) continue;
            
            const cardNameClean = this.cleanText(cardName);
            
            // Calculate similarity
            const similarity = this.calculateSimilarity(inputClean, cardNameClean);
            
            if (similarity >= threshold) {
                results.push({
                    card,
                    cardName,
                    score: similarity,
                    phoneticCode: this.generatePhoneticCode(cardNameClean)
                });
            }
        }
        
        // Sort by score descending
        return results.sort((a, b) => b.score - a.score);
    }

    /**
     * Extract rarity from input text using fuzzy matching
     */
    extractRarityFromText(input, rarityList) {
        const matches = this.findSimilarRarities(input, rarityList);
        
        if (matches.length === 0) {
            return { cardName: input, rarity: null, confidence: 0 };
        }
        
        const bestMatch = matches[0];
        
        // Extract card name by removing the matched rarity text
        let cardName = input;
        if (bestMatch.matchType === 'exact') {
            // Remove exact match
            cardName = input.replace(new RegExp(bestMatch.rarity, 'gi'), '').trim();
        } else if (bestMatch.matchType === 'end_fuzzy') {
            // Remove the extracted text from the end
            const extractedRegex = new RegExp(this.escapeRegex(bestMatch.extractedText) + '$', 'i');
            cardName = input.replace(extractedRegex, '').trim();
        }
        
        // Clean up card name
        cardName = cardName.replace(/\s+/g, ' ').trim();
        
        return {
            cardName,
            rarity: bestMatch.rarity,
            confidence: bestMatch.score,
            matchType: bestMatch.matchType
        };
    }

    /**
     * Clean text for matching
     */
    cleanText(text) {
        if (!text) return '';
        return text.toLowerCase()
            .replace(/[^\w\s-]/g, '') // Keep only alphanumeric, spaces, and hyphens
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Escape regex special characters
     */
    escapeRegex(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.logger.debug('PhoneticMatcher config updated:', this.config);
    }

    /**
     * Test the matcher with sample data
     */
    test() {
        const testCases = [
            {
                input: "blue eyes white dragon secretary",
                rarities: ["secret rare", "ultra rare", "super rare", "rare", "common"],
                expected: { rarity: "secret rare", cardName: "blue eyes white dragon" }
            },
            {
                input: "dark magician ultar",
                rarities: ["secret rare", "ultra rare", "super rare", "rare", "common"],
                expected: { rarity: "ultra rare", cardName: "dark magician" }
            },
            {
                input: "dart pigeon",
                cards: ["Dark Magician", "Blue-Eyes White Dragon", "Red-Eyes Black Dragon"],
                expected: { cardName: "Dark Magician" }
            }
        ];
        
        this.logger.info('Running PhoneticMatcher tests...');
        
        for (const testCase of testCases) {
            if (testCase.rarities) {
                const result = this.extractRarityFromText(testCase.input, testCase.rarities);
                this.logger.info(`Rarity Test: "${testCase.input}" -> ${result.rarity} (${result.confidence.toFixed(2)})`);
            }
            
            if (testCase.cards) {
                const results = this.findSimilarCardNames(testCase.input, testCase.cards);
                this.logger.info(`Card Test: "${testCase.input}" -> ${results.map(r => `${r.cardName} (${r.score.toFixed(2)})`).join(', ')}`);
            }
        }
    }
}