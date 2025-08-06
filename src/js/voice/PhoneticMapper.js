/**
 * PhoneticMapper - Advanced Phonetic Mapping for Yu-Gi-Oh Fantasy Names
 * 
 * Provides comprehensive phonetic normalization and mapping for fantasy card names,
 * handling Japanese romanization, common mispronunciations, and archetype patterns.
 */

import { Logger } from '../utils/Logger.js';
import { FANTASY_NAME_PATTERNS, applyFantasyNamePatterns, getPatternStats } from './FantasyNamePatterns.js';

export class PhoneticMapper {
    constructor(logger = null) {
        this.logger = logger || new Logger('PhoneticMapper');
        
        // Japanese romanization patterns with common mispronunciations
        this.japanesePatterns = new Map([
            // Common Japanese sounds
            ['shou|sho|show', 'sho'],
            ['ryuu|ryu|rew|roo', 'ryu'],
            ['jin|jinn|gin', 'jin'],
            ['kai|kye|ky|khy', 'kai'],
            ['kou|ko|kow', 'kou'],
            ['shin|shinn|seen', 'shin'],
            ['ten|tenn|tan', 'ten'],
            ['sen|senn|san', 'sen'],
            ['mon|mun|men', 'mon'],
            ['geki|gaky|geky', 'geki'],
            ['rei|ray|rai', 'rei'],
            ['sei|say|sai', 'sei'],
            ['mai|my|may', 'mai'],
            ['dai|dye|dy', 'dai'],
            ['tou|to|too', 'tou'],
            ['dou|do|doo', 'dou']
        ]);
        
        // Fantasy creature and card type patterns
        this.fantasyPatterns = new Map([
            // Dragons
            ['dragun|dragon|dragan|dragoon|dracon', 'dragon'],
            ['wurm|worm|warm', 'wurm'],
            ['serpent|sarpent|serpant', 'serpent'],
            ['wyvern|wyvrn|wivern', 'wyvern'],
            
            // Magic users
            ['majician|magition|magishun|magicain', 'magician'],
            ['wizard|wizzard|wisard', 'wizard'],
            ['witch|wich|witsh', 'witch'],
            ['sorcerer|sorcrer|sorceror', 'sorcerer'],
            ['spellcaster|spelcaster|spellcster', 'spellcaster'],
            
            // Warriors and knights
            ['warrior|warior|warier|warrier', 'warrior'],
            ['knight|night|nite|knite', 'knight'],
            ['paladin|paliden|paladyn', 'paladin'],
            ['samurai|samury|samari', 'samurai'],
            ['berserker|berseker|berzerker', 'berserker'],
            
            // Elements and attributes
            ['elemint|elament|element|elemantal', 'elemental'],
            ['fiend|feind|fynd', 'fiend'],
            ['zombie|zomby|zombe', 'zombie'],
            ['machine|machien|masheen', 'machine'],
            ['psychic|psycic|psyhic', 'psychic'],
            ['divine|divien|devien', 'divine'],
            
            // Common card modifiers
            ['ancient|anchient|anchant|anshent', 'ancient'],
            ['master|mastur|mastir', 'master'],
            ['supreme|supream|supriem', 'supreme'],
            ['ultimate|ultimet|ultimat', 'ultimate'],
            ['legendary|legendery|legendry', 'legendary'],
            ['mystical|mistical|mystycal', 'mystical']
        ]);
        
        // Archetype-specific patterns
        this.archetypePatterns = new Map([
            // Blue-Eyes variations
            ['blue\\s*[aiyeY]*\\s*white|blew\\s*[aiyeY]*\\s*white|blu\\s*[aiyeY]*\\s*white', 'blue-eyes white'],
            ['blue\\s*[aiyeY]*\\s*silver|blew\\s*[aiyeY]*\\s*silver', 'blue-eyes silver'],
            ['blue\\s*[aiyeY]*\\s*ultimate|blew\\s*[aiyeY]*\\s*ultimate', 'blue-eyes ultimate'],
            ['blue\\s*[aiyeY]*\\s*twin|blew\\s*[aiyeY]*\\s*twin', 'blue-eyes twin'],
            
            // Red-Eyes variations
            ['red\\s*[aiyeY]*\\s*black|rad\\s*[aiyeY]*\\s*black|reed\\s*[aiyeY]*\\s*black', 'red-eyes black'],
            ['red\\s*[aiyeY]*\\s*darkness|rad\\s*[aiyeY]*\\s*darkness', 'red-eyes darkness'],
            ['red\\s*[aiyeY]*\\s*zombie|rad\\s*[aiyeY]*\\s*zombie', 'red-eyes zombie'],
            
            // Dark Magician variations
            ['dark\\s*maj?[aeiou]*[sc]h?[aeiou]*n|dark\\s*magic', 'dark magician'],
            ['dark\\s*maj?[aeiou]*[sc]h?[aeiou]*n\\s*girl|dark\\s*magic\\s*girl', 'dark magician girl'],
            
            // Egyptian God Cards
            ['slifer\\s*the\\s*sky\\s*dragon|slyfr|slyfer', 'slifer the sky dragon'],
            ['obelisk\\s*the\\s*tormentor|obelisk|obelik', 'obelisk the tormentor'],
            ['winged\\s*dragon\\s*of\\s*ra|ra\\s*the\\s*winged', 'winged dragon of ra'],
            
            // Popular archetypes
            ['cyber\\s*dragon|syber\\s*dragon|ciber', 'cyber dragon'],
            ['elemental\\s*hero|elemantal\\s*hero|elemint\\s*hero', 'elemental hero'],
            ['blue\\s*angel|blew\\s*angel', 'blue angel'],
            ['blackwing|black\\s*wing|blak\\s*wing', 'blackwing'],
            ['lightsworn|light\\s*sworn|lite\\s*sworn', 'lightsworn']
        ]);
        
        // Common mispronunciation patterns
        this.commonMispronunciations = new Map([
            // Common English mispronunciations
            ['dragun', 'dragon'],
            ['majician', 'magician'],
            ['warier', 'warrior'],
            ['elemint', 'elemental'],
            ['anchient', 'ancient'],
            ['ultimet', 'ultimate'],
            ['legendery', 'legendary'],
            ['mistical', 'mystical'],
            
            // Homophones and similar sounds
            ['night', 'knight'],
            ['there', 'their'],
            ['to', 'two'],
            ['blue', 'blew'],
            ['right', 'rite'],
            ['write', 'rite'],
            
            // Common card name confusions
            ['mirror force', 'miror force'],
            ['pot of greed', 'pot of green'],
            ['time wizard', 'time wisard'],
            ['harpie', 'harpy'],
            ['kuriboh', 'curiboh'],
            ['yata garasu', 'yata garasu'],
            ['exodia', 'exodea']
        ]);
        
        // Multi-word pattern expansions
        this.multiWordPatterns = new Map([
            ['blue eyes', ['blue-eyes', 'blueeyes', 'blue eye']],
            ['red eyes', ['red-eyes', 'redeyes', 'red eye']],
            ['dark magician', ['darkmagician', 'dark mage']],
            ['time wizard', ['timewizard', 'time wisard']],
            ['mirror force', ['mirrorforce', 'miror force']],
            ['pot of greed', ['potofgreed', 'pot greed']],
            ['cyber dragon', ['cyberdragon', 'syber dragon']],
            ['elemental hero', ['elementalhero', 'elemint hero']]
        ]);
        
        this.logger.info('PhoneticMapper initialized with comprehensive fantasy name patterns');
    }
    
    /**
     * Normalize text using comprehensive phonetic mapping
     * @param {string} text - Input text to normalize
     * @returns {string} Normalized text
     */
    normalize(text) {
        if (!text || typeof text !== 'string') {
            return '';
        }
        
        // Use comprehensive fantasy name patterns first
        let normalized = applyFantasyNamePatterns(text);
        
        // Apply legacy patterns for additional coverage
        normalized = this.applyPatternMap(normalized, this.japanesePatterns);
        normalized = this.applyPatternMap(normalized, this.fantasyPatterns);
        normalized = this.applyPatternMap(normalized, this.archetypePatterns);
        normalized = this.applyExactReplacements(normalized, this.commonMispronunciations);
        
        // Final cleanup
        normalized = this.cleanupFormatting(normalized);
        
        this.logger.debug(`Enhanced phonetic normalization: "${text}" → "${normalized}"`);
        
        return normalized;
    }
    
    /**
     * Generate multiple phonetic variants of a card name
     * @param {string} cardName - Original card name
     * @returns {Array<string>} Array of phonetic variants
     */
    generateVariants(cardName) {
        if (!cardName) return [];
        
        const variants = new Set();
        const baseName = cardName.toLowerCase().trim();
        
        // Add original name
        variants.add(baseName);
        
        // Generate variants using multi-word patterns
        const expandedVariants = this.expandMultiWordPatterns(baseName);
        expandedVariants.forEach(variant => variants.add(variant));
        
        // Generate phonetic alternatives
        const phoneticVariants = this.generatePhoneticAlternatives(baseName);
        phoneticVariants.forEach(variant => variants.add(variant));
        
        // Generate common substitutions
        const substitutionVariants = this.generateCommonSubstitutions(baseName);
        substitutionVariants.forEach(variant => variants.add(variant));
        
        return Array.from(variants);
    }
    
    /**
     * Calculate phonetic similarity between two strings
     * @param {string} str1 - First string
     * @param {string} str2 - Second string
     * @returns {number} Similarity score (0-1)
     */
    calculatePhoneticSimilarity(str1, str2) {
        if (!str1 || !str2) return 0;
        
        const normalized1 = this.normalize(str1);
        const normalized2 = this.normalize(str2);
        
        // Base similarity using Levenshtein distance
        const baseSimilarity = this.calculateLevenshteinSimilarity(normalized1, normalized2);
        
        // Boost similarity for phonetic matches
        const phoneticBonus = this.calculatePhoneticBonus(normalized1, normalized2);
        
        // Boost similarity for archetype matches
        const archetypeBonus = this.calculateArchetypeBonus(normalized1, normalized2);
        
        const finalSimilarity = Math.min(1.0, baseSimilarity + phoneticBonus + archetypeBonus);
        
        this.logger.debug(`Phonetic similarity "${str1}" vs "${str2}": ${finalSimilarity.toFixed(3)}`);
        
        return finalSimilarity;
    }
    
    /**
     * Apply regex pattern map to text
     * @private
     */
    applyPatternMap(text, patternMap) {
        let result = text;
        
        for (const [pattern, replacement] of patternMap) {
            const regex = new RegExp(pattern, 'gi');
            result = result.replace(regex, replacement);
        }
        
        return result;
    }
    
    /**
     * Apply exact string replacements
     * @private
     */
    applyExactReplacements(text, replacementMap) {
        let result = text;
        
        for (const [original, replacement] of replacementMap) {
            // Word boundary replacement to avoid partial matches
            const regex = new RegExp(`\\b${original}\\b`, 'gi');
            result = result.replace(regex, replacement);
        }
        
        return result;
    }
    
    /**
     * Clean up text formatting
     * @private
     */
    cleanupFormatting(text) {
        return text
            .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/\s*-\s*/g, '-') // Normalize hyphens
            .trim();
    }
    
    /**
     * Expand multi-word patterns
     * @private
     */
    expandMultiWordPatterns(text) {
        const variants = [];
        
        for (const [pattern, expansions] of this.multiWordPatterns) {
            if (text.includes(pattern)) {
                expansions.forEach(expansion => {
                    variants.push(text.replace(pattern, expansion));
                });
            }
        }
        
        return variants;
    }
    
    /**
     * Generate phonetic alternatives
     * @private
     */
    generatePhoneticAlternatives(text) {
        const alternatives = [];
        
        // Common vowel substitutions
        const vowelSubs = [
            ['a', 'e'], ['e', 'a'], ['i', 'y'], ['y', 'i'], 
            ['o', 'u'], ['u', 'o'], ['oo', 'u'], ['ee', 'i']
        ];
        
        vowelSubs.forEach(([from, to]) => {
            if (text.includes(from)) {
                alternatives.push(text.replace(new RegExp(from, 'g'), to));
            }
        });
        
        // Common consonant substitutions
        const consonantSubs = [
            ['c', 'k'], ['k', 'c'], ['f', 'ph'], ['ph', 'f'],
            ['s', 'z'], ['z', 's'], ['x', 'ks'], ['ks', 'x']
        ];
        
        consonantSubs.forEach(([from, to]) => {
            if (text.includes(from)) {
                alternatives.push(text.replace(new RegExp(from, 'g'), to));
            }
        });
        
        return alternatives;
    }
    
    /**
     * Generate common substitutions
     * @private
     */
    generateCommonSubstitutions(text) {
        const substitutions = [];
        
        // Double letter variations
        const doubles = ['ll', 'ss', 'nn', 'mm', 'tt', 'pp'];
        doubles.forEach(double => {
            if (text.includes(double)) {
                substitutions.push(text.replace(double, double.charAt(0)));
            } else if (text.includes(double.charAt(0))) {
                substitutions.push(text.replace(double.charAt(0), double));
            }
        });
        
        return substitutions;
    }
    
    /**
     * Calculate Levenshtein similarity
     * @private
     */
    calculateLevenshteinSimilarity(str1, str2) {
        if (str1 === str2) return 1.0;
        if (!str1 || !str2) return 0;
        
        const maxLength = Math.max(str1.length, str2.length);
        const distance = this.levenshteinDistance(str1, str2);
        
        return 1 - (distance / maxLength);
    }
    
    /**
     * Calculate Levenshtein distance
     * @private
     */
    levenshteinDistance(str1, str2) {
        const matrix = Array(str2.length + 1).fill(null).map(() => 
            Array(str1.length + 1).fill(null)
        );
        
        for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
        for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
        
        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,
                    matrix[j - 1][i] + 1,
                    matrix[j - 1][i - 1] + cost
                );
            }
        }
        
        return matrix[str2.length][str1.length];
    }
    
    /**
     * Calculate phonetic bonus for similar patterns
     * @private
     */
    calculatePhoneticBonus(str1, str2) {
        let bonus = 0;
        
        // Check for common phonetic patterns
        const patterns = ['dragon', 'magician', 'knight', 'elemental', 'warrior'];
        
        patterns.forEach(pattern => {
            if (str1.includes(pattern) && str2.includes(pattern)) {
                bonus += 0.1;
            }
        });
        
        return Math.min(bonus, 0.2); // Cap bonus at 0.2
    }
    
    /**
     * Calculate archetype bonus
     * @private
     */
    calculateArchetypeBonus(str1, str2) {
        let bonus = 0;
        
        const archetypes = ['blue-eyes', 'red-eyes', 'dark magician', 'cyber', 'elemental hero'];
        
        archetypes.forEach(archetype => {
            if (str1.includes(archetype) && str2.includes(archetype)) {
                bonus += 0.15;
            }
        });
        
        return Math.min(bonus, 0.15); // Cap bonus at 0.15
    }
    
    /**
     * Check if text contains Japanese elements
     * @param {string} text - Text to check
     * @returns {boolean} True if contains Japanese patterns
     */
    containsJapanese(text) {
        const japaneseIndicators = ['ryu', 'jin', 'kai', 'sho', 'ten', 'sen', 'mon', 'rei', 'sei', 'mai'];
        return japaneseIndicators.some(indicator => text.toLowerCase().includes(indicator));
    }
    
    /**
     * Get pattern statistics including comprehensive fantasy patterns
     * @returns {Object} Statistics about loaded patterns
     */
    getPatternStats() {
        const legacyStats = {
            japanesePatterns: this.japanesePatterns.size,
            fantasyPatterns: this.fantasyPatterns.size,
            archetypePatterns: this.archetypePatterns.size,
            commonMispronunciations: this.commonMispronunciations.size,
            multiWordPatterns: this.multiWordPatterns.size
        };
        
        const legacyTotal = Object.values(legacyStats).reduce((sum, count) => sum + count, 0);
        const comprehensiveStats = getPatternStats();
        
        return {
            legacy: {
                ...legacyStats,
                total: legacyTotal
            },
            comprehensive: comprehensiveStats,
            grandTotal: legacyTotal + comprehensiveStats.total
        };
    }
}