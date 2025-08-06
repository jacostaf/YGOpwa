/**
 * AdaptiveConfidenceManager - Dynamic Confidence Threshold Management
 * 
 * Provides adaptive confidence threshold calculation based on fantasy name complexity,
 * user success patterns, archetype familiarity, and contextual factors.
 */

import { Logger } from '../utils/Logger.js';

export class AdaptiveConfidenceManager {
    constructor(storage = null, logger = null) {
        this.logger = logger || new Logger('AdaptiveConfidenceManager');
        this.storage = storage;
        
        // Base configuration
        this.config = {
            baseThreshold: 0.5,
            minThreshold: 0.3,
            maxThreshold: 0.9,
            adaptationRate: 0.1,
            historyWindow: 50 // Number of recent interactions to consider
        };
        
        // User interaction history
        this.userHistory = [];
        this.userAccuracyCache = new Map();
        
        // Fantasy complexity patterns
        this.complexityFactors = {
            // High complexity indicators
            highComplexity: [
                'japanese', 'archfiend', 'millennium', 'elemental hero', 
                'destiny hero', 'vision hero', 'evil hero', 'masked hero',
                'performapal', 'odd-eyes', 'magician pendulum', 'altergeist',
                'salamangreat', 'sky striker', 'world legacy', 'mekk-knight'
            ],
            
            // Medium complexity indicators
            mediumComplexity: [
                'blue-eyes', 'red-eyes', 'dark magician', 'cyber dragon',
                'blackwing', 'lightsworn', 'six samurai', 'gladiator beast',
                'crystal beast', 'ancient gear', 'volcanic', 'gem-knight'
            ],
            
            // Low complexity indicators (common English words)
            lowComplexity: [
                'dragon', 'warrior', 'knight', 'magician', 'wizard',
                'beast', 'machine', 'fiend', 'angel', 'demon'
            ]
        };
        
        // Popular archetype patterns for familiarity scoring
        this.popularArchetypes = new Set([
            'blue-eyes', 'red-eyes', 'dark magician', 'elemental hero',
            'cyber dragon', 'blackwing', 'lightsworn', 'six samurai',
            'crystal beast', 'ancient gear', 'gladiator beast', 'volcanic'
        ]);
        
        // Context factors
        this.contextFactors = {
            setPopularity: new Map(), // Popular sets get confidence boost
            cardFrequency: new Map(),  // Frequently recognized cards
            timeOfDay: new Map(),      // User accuracy by time
            sessionLength: new Map()   // Accuracy vs session length
        };
        
        this.logger.info('AdaptiveConfidenceManager initialized');
    }
    
    /**
     * Get adaptive confidence threshold for a card name
     * @param {string} cardName - Name of the card
     * @param {Object} context - Additional context information
     * @returns {number} Adaptive confidence threshold
     */
    getAdaptiveThreshold(cardName, context = {}) {
        let threshold = this.config.baseThreshold;
        let adjustments = [];
        
        // Factor 1: Fantasy complexity adjustment
        const complexityAdjustment = this.calculateComplexityAdjustment(cardName);
        threshold += complexityAdjustment;
        adjustments.push({ type: 'complexity', value: complexityAdjustment });
        
        // Factor 2: User accuracy pattern
        const userAccuracyAdjustment = this.calculateUserAccuracyAdjustment(context);
        threshold += userAccuracyAdjustment;
        adjustments.push({ type: 'user_accuracy', value: userAccuracyAdjustment });
        
        // Factor 3: Archetype familiarity
        const archetypeAdjustment = this.calculateArchetypeAdjustment(cardName);
        threshold += archetypeAdjustment;
        adjustments.push({ type: 'archetype', value: archetypeAdjustment });
        
        // Factor 4: Set context
        const setAdjustment = this.calculateSetContextAdjustment(context);
        threshold += setAdjustment;
        adjustments.push({ type: 'set_context', value: setAdjustment });
        
        // Factor 5: Time and session context
        const sessionAdjustment = this.calculateSessionAdjustment(context);
        threshold += sessionAdjustment;
        adjustments.push({ type: 'session', value: sessionAdjustment });
        
        // Apply bounds
        threshold = Math.max(this.config.minThreshold, 
                    Math.min(this.config.maxThreshold, threshold));
        
        this.logger.debug(`Adaptive threshold for "${cardName}": ${threshold.toFixed(3)}`, {
            adjustments: adjustments,
            context: context
        });
        
        return threshold;
    }
    
    /**
     * Record user interaction for learning
     * @param {Object} interaction - User interaction data
     */
    recordInteraction(interaction) {
        const record = {
            timestamp: Date.now(),
            cardName: interaction.cardName,
            voiceInput: interaction.voiceInput,
            confidence: interaction.confidence,
            wasCorrect: interaction.wasCorrect,
            userCorrected: interaction.userCorrected || false,
            context: interaction.context || {}
        };
        
        this.userHistory.push(record);
        
        // Maintain history window
        if (this.userHistory.length > this.config.historyWindow) {
            this.userHistory.shift();
        }
        
        // Update caches
        this.updateAccuracyCache();
        this.updateContextFactors(record);
        
        // Save to storage if available
        if (this.storage) {
            this.saveUserHistory();
        }
        
        this.logger.debug('Recorded user interaction:', record);
    }
    
    /**
     * Calculate complexity adjustment based on card name
     * @private
     */
    calculateComplexityAdjustment(cardName) {
        if (!cardName) return 0;
        
        const lowerName = cardName.toLowerCase();
        let complexityScore = 0;
        
        // Check for high complexity patterns
        for (const pattern of this.complexityFactors.highComplexity) {
            if (lowerName.includes(pattern)) {
                complexityScore += 0.8;
                break; // Only count once
            }
        }
        
        // Check for medium complexity patterns
        if (complexityScore === 0) {
            for (const pattern of this.complexityFactors.mediumComplexity) {
                if (lowerName.includes(pattern)) {
                    complexityScore += 0.5;
                    break;
                }
            }
        }
        
        // Check for low complexity patterns
        if (complexityScore === 0) {
            for (const pattern of this.complexityFactors.lowComplexity) {
                if (lowerName.includes(pattern)) {
                    complexityScore += 0.2;
                    break;
                }
            }
        }
        
        // Default for unknown patterns
        if (complexityScore === 0) {
            complexityScore = 0.6; // Assume medium-high complexity
        }
        
        // Convert complexity score to threshold adjustment
        // Higher complexity = lower threshold (more forgiving)
        const adjustment = -((complexityScore - 0.5) * 0.15);
        
        return adjustment;
    }
    
    /**
     * Calculate user accuracy adjustment
     * @private
     */
    calculateUserAccuracyAdjustment(context) {
        if (this.userHistory.length < 5) {
            return 0; // Not enough data
        }
        
        const recentAccuracy = this.calculateRecentAccuracy();
        const cardTypeAccuracy = this.calculateCardTypeAccuracy(context.cardType);
        
        // Combine recent overall accuracy with card-type specific accuracy
        const combinedAccuracy = (recentAccuracy * 0.7) + (cardTypeAccuracy * 0.3);
        
        // High accuracy users get lower thresholds (more confident system)
        // Low accuracy users get higher thresholds (more conservative)
        let adjustment = 0;
        
        if (combinedAccuracy > 0.8) {
            adjustment = -0.1; // Lower threshold for accurate users
        } else if (combinedAccuracy < 0.6) {
            adjustment = 0.1;  // Higher threshold for less accurate users
        }
        
        return adjustment;
    }
    
    /**
     * Calculate archetype familiarity adjustment
     * @private
     */
    calculateArchetypeAdjustment(cardName) {
        if (!cardName) return 0;
        
        const lowerName = cardName.toLowerCase();
        
        // Check if card belongs to a popular/familiar archetype
        for (const archetype of this.popularArchetypes) {
            if (lowerName.includes(archetype)) {
                return -0.05; // Lower threshold for popular archetypes
            }
        }
        
        // Check for very obscure/complex archetype patterns
        const obscurePatterns = [
            'magistus', 'tri-brigade', 'virtual world', 'drytron',
            'eldlich', 'dogmatika', 'invoked', 'shaddoll', 'branded'
        ];
        
        for (const pattern of obscurePatterns) {
            if (lowerName.includes(pattern)) {
                return 0.08; // Higher threshold for obscure archetypes
            }
        }
        
        return 0; // No adjustment for unknown archetypes
    }
    
    /**
     * Calculate set context adjustment
     * @private
     */
    calculateSetContextAdjustment(context) {
        if (!context.currentSet) return 0;
        
        const setCode = context.currentSet.code;
        let adjustment = 0;
        
        // Popular/recent sets might have better recognition
        const popularSets = [
            'DUEA', 'SHVA', 'DUDE', 'LED2', 'LED3', 'LED4', 'LED5',
            'MAGO', 'DAMA', 'BROL', 'ETCO', 'ROTD', 'PHRA', 'BLVO'
        ];
        
        if (popularSets.includes(setCode)) {
            adjustment -= 0.03; // Slightly lower threshold for popular sets
        }
        
        // Check set-specific accuracy from history
        const setAccuracy = this.contextFactors.setPopularity.get(setCode);
        if (setAccuracy) {
            if (setAccuracy > 0.8) {
                adjustment -= 0.05;
            } else if (setAccuracy < 0.6) {
                adjustment += 0.05;
            }
        }
        
        return adjustment;
    }
    
    /**
     * Calculate session context adjustment
     * @private
     */
    calculateSessionAdjustment(context) {
        let adjustment = 0;
        
        // Session length factor - users might get tired in long sessions
        const sessionLength = context.sessionLength || 0;
        if (sessionLength > 30) { // 30 minutes
            adjustment += 0.02; // Slightly higher threshold for long sessions
        }
        
        // Time of day factor
        const hour = new Date().getHours();
        if (hour < 9 || hour > 22) { // Early morning or late evening
            adjustment += 0.03; // Higher threshold during potentially tired times
        }
        
        // Recent error pattern
        const recentErrors = this.getRecentErrorCount(10); // Last 10 interactions
        if (recentErrors > 3) {
            adjustment += 0.05; // More conservative after multiple errors
        }
        
        return adjustment;
    }
    
    /**
     * Calculate recent accuracy
     * @private
     */
    calculateRecentAccuracy() {
        if (this.userHistory.length === 0) return 0.5;
        
        const recentInteractions = this.userHistory.slice(-20); // Last 20 interactions
        const correct = recentInteractions.filter(i => i.wasCorrect).length;
        
        return correct / recentInteractions.length;
    }
    
    /**
     * Calculate card type specific accuracy
     * @private
     */
    calculateCardTypeAccuracy(cardType) {
        if (!cardType || this.userHistory.length === 0) return 0.5;
        
        const typeInteractions = this.userHistory.filter(i => 
            i.context.cardType === cardType
        );
        
        if (typeInteractions.length === 0) return 0.5;
        
        const correct = typeInteractions.filter(i => i.wasCorrect).length;
        return correct / typeInteractions.length;
    }
    
    /**
     * Get recent error count
     * @private
     */
    getRecentErrorCount(window = 10) {
        const recent = this.userHistory.slice(-window);
        return recent.filter(i => !i.wasCorrect).length;
    }
    
    /**
     * Update accuracy cache
     * @private
     */
    updateAccuracyCache() {
        // Clear old cache
        this.userAccuracyCache.clear();
        
        // Rebuild cache with recent data
        const recentData = this.userHistory.slice(-this.config.historyWindow);
        
        // Overall accuracy
        const correct = recentData.filter(i => i.wasCorrect).length;
        this.userAccuracyCache.set('overall', correct / recentData.length);
        
        // Per-archetype accuracy
        const archetypeStats = new Map();
        recentData.forEach(interaction => {
            const cardName = interaction.cardName.toLowerCase();
            
            // Find archetype
            let archetype = 'unknown';
            for (const arch of this.popularArchetypes) {
                if (cardName.includes(arch)) {
                    archetype = arch;
                    break;
                }
            }
            
            if (!archetypeStats.has(archetype)) {
                archetypeStats.set(archetype, { correct: 0, total: 0 });
            }
            
            const stats = archetypeStats.get(archetype);
            stats.total++;
            if (interaction.wasCorrect) stats.correct++;
        });
        
        // Store archetype accuracies
        for (const [archetype, stats] of archetypeStats) {
            if (stats.total > 0) {
                this.userAccuracyCache.set(`archetype_${archetype}`, stats.correct / stats.total);
            }
        }
    }
    
    /**
     * Update context factors
     * @private
     */
    updateContextFactors(record) {
        // Update set popularity
        if (record.context.currentSet) {
            const setCode = record.context.currentSet.code;
            if (!this.contextFactors.setPopularity.has(setCode)) {
                this.contextFactors.setPopularity.set(setCode, []);
            }
            
            const setData = this.contextFactors.setPopularity.get(setCode);
            setData.push(record.wasCorrect ? 1 : 0);
            
            // Keep only recent data (last 20 interactions per set)
            if (setData.length > 20) {
                setData.shift();
            }
            
            // Update average
            const average = setData.reduce((a, b) => a + b, 0) / setData.length;
            this.contextFactors.setPopularity.set(setCode, average);
        }
        
        // Update card frequency
        const cardKey = record.cardName.toLowerCase();
        const currentFreq = this.contextFactors.cardFrequency.get(cardKey) || 0;
        this.contextFactors.cardFrequency.set(cardKey, currentFreq + 1);
    }
    
    /**
     * Load user history from storage
     */
    async loadUserHistory() {
        if (!this.storage) return;
        
        try {
            const saved = await this.storage.get('voiceConfidenceHistory');
            if (saved && Array.isArray(saved)) {
                this.userHistory = saved.slice(-this.config.historyWindow);
                this.updateAccuracyCache();
                this.logger.info(`Loaded ${this.userHistory.length} user interactions from storage`);
            }
        } catch (error) {
            this.logger.warn('Failed to load user history:', error);
        }
    }
    
    /**
     * Save user history to storage
     * @private
     */
    async saveUserHistory() {
        if (!this.storage) return;
        
        try {
            await this.storage.set('voiceConfidenceHistory', this.userHistory);
        } catch (error) {
            this.logger.warn('Failed to save user history:', error);
        }
    }
    
    /**
     * Get user statistics
     * @returns {Object} User interaction statistics
     */
    getUserStats() {
        if (this.userHistory.length === 0) {
            return {
                totalInteractions: 0,
                overallAccuracy: 0,
                recentAccuracy: 0,
                archetypeStats: {},
                confidenceStats: {}
            };
        }
        
        const total = this.userHistory.length;
        const correct = this.userHistory.filter(i => i.wasCorrect).length;
        const overallAccuracy = correct / total;
        
        const recent = this.userHistory.slice(-20);
        const recentCorrect = recent.filter(i => i.wasCorrect).length;
        const recentAccuracy = recentCorrect / recent.length;
        
        // Confidence range analysis
        const confidenceRanges = {
            'low (0.3-0.5)': { correct: 0, total: 0 },
            'medium (0.5-0.7)': { correct: 0, total: 0 },
            'high (0.7-1.0)': { correct: 0, total: 0 }
        };
        
        this.userHistory.forEach(interaction => {
            const conf = interaction.confidence;
            let range;
            if (conf < 0.5) range = 'low (0.3-0.5)';
            else if (conf < 0.7) range = 'medium (0.5-0.7)';
            else range = 'high (0.7-1.0)';
            
            confidenceRanges[range].total++;
            if (interaction.wasCorrect) confidenceRanges[range].correct++;
        });
        
        const confidenceStats = {};
        for (const [range, stats] of Object.entries(confidenceRanges)) {
            if (stats.total > 0) {
                confidenceStats[range] = {
                    accuracy: stats.correct / stats.total,
                    count: stats.total
                };
            }
        }
        
        return {
            totalInteractions: total,
            overallAccuracy: overallAccuracy,
            recentAccuracy: recentAccuracy,
            archetypeStats: Object.fromEntries(this.userAccuracyCache),
            confidenceStats: confidenceStats
        };
    }
    
    /**
     * Reset user history and caches
     */
    resetHistory() {
        this.userHistory = [];
        this.userAccuracyCache.clear();
        this.contextFactors.setPopularity.clear();
        this.contextFactors.cardFrequency.clear();
        this.contextFactors.timeOfDay.clear();
        this.contextFactors.sessionLength.clear();
        
        if (this.storage) {
            this.storage.remove('voiceConfidenceHistory');
        }
        
        this.logger.info('User history and caches reset');
    }
}