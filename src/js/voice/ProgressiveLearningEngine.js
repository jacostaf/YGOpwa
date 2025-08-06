/**
 * ProgressiveLearningEngine - Adaptive Learning for Voice Recognition
 * 
 * Learns from user interactions to improve voice recognition accuracy over time.
 * Tracks pronunciation patterns, success rates, and creates personalized 
 * recognition models for Yu-Gi-Oh card names.
 */

import { Logger } from '../utils/Logger.js';
import { PhoneticMapper } from './PhoneticMapper.js';

export class ProgressiveLearningEngine {
    constructor(storage = null, logger = null) {
        this.logger = logger || new Logger('ProgressiveLearningEngine');
        this.storage = storage;
        this.phoneticMapper = new PhoneticMapper(this.logger);
        
        // User-specific pronunciation patterns
        this.userPatterns = new Map();
        this.personalizedRules = new Map();
        
        // Success history for learning
        this.successHistory = [];
        this.rejectionHistory = []; // Track user rejections for learning
        
        // Learning configuration
        this.config = {
            minOccurrences: 3, // Minimum occurrences to create a pattern
            confidenceThreshold: 0.75, // Threshold for pattern confidence
            maxPatterns: 1000, // Maximum user patterns to store
            learningRate: 0.1, // How quickly to adapt patterns
            forgettingRate: 0.01, // How quickly to forget unused patterns
            historyWindow: 100 // Number of interactions to keep
        };
        
        // Pattern categories
        this.patternCategories = {
            pronunciation: new Map(), // How user pronounces specific words
            preference: new Map(),    // User's preferred card variants
            correction: new Map(),    // Common user corrections
            archetype: new Map()      // Archetype-specific patterns
        };
        
        // Learning state
        this.isLearning = true;
        this.lastUpdate = Date.now();
        this.learningStats = {
            patternsLearned: 0,
            adaptationsApplied: 0,
            accuracyImprovement: 0
        };
        
        this.logger.info('ProgressiveLearningEngine initialized');
    }
    
    /**
     * Learn from successful voice recognition
     * @param {string} voiceInput - Original voice input
     * @param {string} selectedCard - Card selected by user
     * @param {number} confidence - Recognition confidence
     * @param {Object} context - Additional context
     */
    learnFromSuccess(voiceInput, selectedCard, confidence, context = {}) {
        if (!this.isLearning || !voiceInput || !selectedCard) return;
        
        const pattern = {
            id: this.generatePatternId(),
            voiceInput: voiceInput.toLowerCase().trim(),
            targetCard: selectedCard.toLowerCase().trim(),
            confidence: confidence,
            timestamp: Date.now(),
            context: context,
            reinforcements: 1,
            successRate: 1.0
        };
        
        // Add to success history
        this.successHistory.push({
            ...pattern,
            type: 'success'
        });
        
        // Limit history size
        if (this.successHistory.length > this.config.historyWindow) {
            this.successHistory.shift();
        }
        
        // Update user patterns
        this.updateUserPatterns(pattern);
        
        // Create or strengthen personalized rules
        this.strengthenPersonalizedRules(pattern);
        
        // Update learning stats
        this.learningStats.adaptationsApplied++;
        
        this.logger.debug('Learned from successful recognition:', pattern);
    }
    
    /**
     * Learn from user rejection/correction
     * @param {string} voiceInput - Original voice input
     * @param {string} rejectedCard - Card that was incorrectly suggested
     * @param {string} correctCard - Card user actually wanted (optional)
     * @param {number} confidence - Original confidence
     */
    learnFromRejection(voiceInput, rejectedCard, correctCard = null, confidence = 0) {
        if (!this.isLearning || !voiceInput || !rejectedCard) return;
        
        const rejection = {
            id: this.generatePatternId(),
            voiceInput: voiceInput.toLowerCase().trim(),
            rejectedCard: rejectedCard.toLowerCase().trim(),
            correctCard: correctCard ? correctCard.toLowerCase().trim() : null,
            confidence: confidence,
            timestamp: Date.now(),
            type: 'rejection'
        };
        
        // Add to rejection history
        this.rejectionHistory.push(rejection);
        
        // Limit history size
        if (this.rejectionHistory.length > this.config.historyWindow) {
            this.rejectionHistory.shift();
        }
        
        // Create negative pattern to avoid this mistake
        this.createNegativePattern(rejection);
        
        // If we have the correct card, create a positive pattern
        if (correctCard) {
            this.learnFromSuccess(voiceInput, correctCard, 1.0, { corrected: true });
        }
        
        this.logger.debug('Learned from user rejection:', rejection);
    }
    
    /**
     * Apply learned patterns to improve recognition
     * @param {string} voiceInput - Voice input to process
     * @param {Array} candidates - Current recognition candidates
     * @returns {Array} Enhanced candidates with personalized scoring
     */
    applyPersonalizedRecognition(voiceInput, candidates) {
        if (!voiceInput || !candidates.length) return candidates;
        
        const input = voiceInput.toLowerCase().trim();
        const enhancedCandidates = candidates.map(candidate => {
            const enhanced = { ...candidate };
            
            // Apply user-specific pronunciation patterns
            const pronunciationBoost = this.calculatePronunciationBoost(input, candidate.name);
            
            // Apply preference patterns
            const preferenceBoost = this.calculatePreferenceBoost(input, candidate.name);
            
            // Apply archetype learning
            const archetypeBoost = this.calculateArchetypeBoost(input, candidate.name);
            
            // Apply correction patterns (negative boost for rejected cards)
            const correctionPenalty = this.calculateCorrectionPenalty(input, candidate.name);
            
            // Combine all boosts
            const totalBoost = pronunciationBoost + preferenceBoost + archetypeBoost - correctionPenalty;
            
            // Apply boost to confidence
            enhanced.confidence = Math.min(1.0, candidate.confidence + totalBoost);
            enhanced.personalizedScore = totalBoost;
            enhanced.learningApplied = totalBoost !== 0;
            
            return enhanced;
        });
        
        // Sort by enhanced confidence
        enhancedCandidates.sort((a, b) => b.confidence - a.confidence);
        
        this.logger.debug(`Applied personalized learning to ${candidates.length} candidates`, {
            inputPhrase: input,
            boostsApplied: enhancedCandidates.filter(c => c.learningApplied).length
        });
        
        return enhancedCandidates;
    }
    
    /**
     * Update user pronunciation patterns
     * @private
     */
    updateUserPatterns(pattern) {
        const key = this.createPatternKey(pattern.voiceInput, pattern.targetCard);
        
        if (this.userPatterns.has(key)) {
            const existing = this.userPatterns.get(key);
            existing.reinforcements++;
            existing.successRate = this.calculateSuccessRate(key);
            existing.lastSeen = Date.now();
            existing.confidence = this.updateConfidence(existing.confidence, pattern.confidence);
        } else {
            this.userPatterns.set(key, {
                ...pattern,
                lastSeen: Date.now(),
                successRate: 1.0
            });
            
            this.learningStats.patternsLearned++;
        }
        
        // Cleanup old patterns if we exceed the maximum
        if (this.userPatterns.size > this.config.maxPatterns) {
            this.cleanupOldPatterns();
        }
    }
    
    /**
     * Strengthen personalized rules based on successful patterns
     * @private
     */
    strengthenPersonalizedRules(pattern) {
        // Extract phonetic components
        const phoneticVariants = this.phoneticMapper.generateVariants(pattern.voiceInput);
        const targetVariants = this.phoneticMapper.generateVariants(pattern.targetCard);
        
        // Create mapping rules between phonetic variants
        phoneticVariants.forEach(voiceVariant => {
            targetVariants.forEach(targetVariant => {
                const ruleKey = `${voiceVariant} -> ${targetVariant}`;
                
                if (this.personalizedRules.has(ruleKey)) {
                    const rule = this.personalizedRules.get(ruleKey);
                    rule.strength += this.config.learningRate;
                    rule.occurrences++;
                    rule.lastUsed = Date.now();
                } else {
                    this.personalizedRules.set(ruleKey, {
                        voicePattern: voiceVariant,
                        targetPattern: targetVariant,
                        strength: this.config.learningRate,
                        occurrences: 1,
                        created: Date.now(),
                        lastUsed: Date.now()
                    });
                }
            });
        });
    }
    
    /**
     * Create negative pattern from rejection
     * @private
     */
    createNegativePattern(rejection) {
        const key = this.createPatternKey(rejection.voiceInput, rejection.rejectedCard);
        const negativeKey = `negative_${key}`;
        
        if (this.patternCategories.correction.has(negativeKey)) {
            const existing = this.patternCategories.correction.get(negativeKey);
            existing.strength += 0.2; // Increase penalty
            existing.occurrences++;
        } else {
            this.patternCategories.correction.set(negativeKey, {
                voiceInput: rejection.voiceInput,
                rejectedCard: rejection.rejectedCard,
                strength: 0.2,
                occurrences: 1,
                created: Date.now()
            });
        }
    }
    
    /**
     * Calculate pronunciation boost based on learned patterns
     * @private
     */
    calculatePronunciationBoost(voiceInput, cardName) {
        const key = this.createPatternKey(voiceInput, cardName);
        const pattern = this.userPatterns.get(key);
        
        if (pattern && pattern.successRate > this.config.confidenceThreshold) {
            // Strong boost for highly successful patterns
            const boost = 0.1 * pattern.successRate * (pattern.reinforcements / 10);
            return Math.min(0.2, boost); // Cap at 0.2
        }
        
        // Check for partial matches in personalized rules
        let maxBoost = 0;
        for (const [ruleKey, rule] of this.personalizedRules) {
            if (voiceInput.includes(rule.voicePattern) && cardName.toLowerCase().includes(rule.targetPattern)) {
                const boost = rule.strength * 0.05;
                maxBoost = Math.max(maxBoost, boost);
            }
        }
        
        return Math.min(0.1, maxBoost);
    }
    
    /**
     * Calculate preference boost for preferred card variants
     * @private
     */
    calculatePreferenceBoost(voiceInput, cardName) {
        // Check if user has shown preference for this card type or archetype
        const archetype = this.extractArchetype(cardName);
        
        if (archetype && this.patternCategories.preference.has(archetype)) {
            const preference = this.patternCategories.preference.get(archetype);
            return preference.strength * 0.03; // Small boost
        }
        
        return 0;
    }
    
    /**
     * Calculate archetype-specific learning boost
     * @private
     */
    calculateArchetypeBoost(voiceInput, cardName) {
        const archetype = this.extractArchetype(cardName);
        
        if (archetype && this.patternCategories.archetype.has(archetype)) {
            const archetypePattern = this.patternCategories.archetype.get(archetype);
            
            // Check if voice input matches learned archetype patterns
            const similarity = this.phoneticMapper.calculatePhoneticSimilarity(
                voiceInput, 
                archetypePattern.commonInputs.join(' ')
            );
            
            return similarity * 0.05; // Small archetype boost
        }
        
        return 0;
    }
    
    /**
     * Calculate correction penalty for previously rejected cards
     * @private
     */
    calculateCorrectionPenalty(voiceInput, cardName) {
        const key = this.createPatternKey(voiceInput, cardName);
        const negativeKey = `negative_${key}`;
        
        const correction = this.patternCategories.correction.get(negativeKey);
        if (correction) {
            return correction.strength * 0.1; // Penalty for rejected cards
        }
        
        return 0;
    }
    
    /**
     * Extract archetype from card name
     * @private
     */
    extractArchetype(cardName) {
        const lowerName = cardName.toLowerCase();
        const archetypes = [
            'blue-eyes', 'red-eyes', 'dark magician', 'elemental hero',
            'cyber dragon', 'blackwing', 'lightsworn', 'six samurai',
            'crystal beast', 'ancient gear', 'gladiator beast', 'volcanic'
        ];
        
        return archetypes.find(archetype => lowerName.includes(archetype));
    }
    
    /**
     * Create pattern key for storage
     * @private
     */
    createPatternKey(voiceInput, cardName) {
        return `${voiceInput}|${cardName}`;
    }
    
    /**
     * Generate unique pattern ID
     * @private
     */
    generatePatternId() {
        return `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * Calculate success rate for a pattern
     * @private
     */
    calculateSuccessRate(patternKey) {
        const successes = this.successHistory.filter(s => 
            this.createPatternKey(s.voiceInput, s.targetCard) === patternKey
        ).length;
        
        const rejections = this.rejectionHistory.filter(r => 
            this.createPatternKey(r.voiceInput, r.rejectedCard) === patternKey
        ).length;
        
        const total = successes + rejections;
        return total > 0 ? successes / total : 1.0;
    }
    
    /**
     * Update confidence using exponential moving average
     * @private
     */
    updateConfidence(currentConfidence, newConfidence) {
        return currentConfidence + this.config.learningRate * (newConfidence - currentConfidence);
    }
    
    /**
     * Cleanup old patterns to maintain performance
     * @private
     */
    cleanupOldPatterns() {
        const now = Date.now();
        const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        
        // Remove patterns that haven't been used recently and have low success rates
        for (const [key, pattern] of this.userPatterns) {
            const age = now - pattern.lastSeen;
            if (age > maxAge && pattern.successRate < 0.5) {
                this.userPatterns.delete(key);
            }
        }
        
        // If still too many patterns, remove the least successful ones
        if (this.userPatterns.size > this.config.maxPatterns) {
            const patterns = Array.from(this.userPatterns.entries())
                .sort((a, b) => a[1].successRate - b[1].successRate);
            
            const toRemove = patterns.slice(0, this.userPatterns.size - this.config.maxPatterns);
            toRemove.forEach(([key]) => this.userPatterns.delete(key));
        }
    }
    
    /**
     * Apply forgetting to unused patterns
     */
    applyForgetting() {
        const now = Date.now();
        const forgettingInterval = 24 * 60 * 60 * 1000; // 24 hours
        
        if (now - this.lastUpdate < forgettingInterval) return;
        
        // Decay strength of unused personalized rules
        for (const [key, rule] of this.personalizedRules) {
            const timeSinceUse = now - rule.lastUsed;
            if (timeSinceUse > forgettingInterval) {
                rule.strength *= (1 - this.config.forgettingRate);
                
                // Remove very weak rules
                if (rule.strength < 0.01) {
                    this.personalizedRules.delete(key);
                }
            }
        }
        
        this.lastUpdate = now;
    }
    
    /**
     * Get learning statistics
     * @returns {Object} Learning statistics
     */
    getLearningStats() {
        const totalPatterns = this.userPatterns.size;
        const activePatterns = Array.from(this.userPatterns.values())
            .filter(p => p.successRate > 0.7).length;
        
        const avgSuccessRate = totalPatterns > 0 ? 
            Array.from(this.userPatterns.values())
                .reduce((sum, p) => sum + p.successRate, 0) / totalPatterns : 0;
        
        return {
            ...this.learningStats,
            totalPatterns: totalPatterns,
            activePatterns: activePatterns,
            personalizedRules: this.personalizedRules.size,
            avgSuccessRate: avgSuccessRate,
            successHistory: this.successHistory.length,
            rejectionHistory: this.rejectionHistory.length
        };
    }
    
    /**
     * Export learned patterns for backup
     * @returns {Object} Exported pattern data
     */
    exportPatterns() {
        return {
            version: '1.0',
            timestamp: Date.now(),
            userPatterns: Object.fromEntries(this.userPatterns),
            personalizedRules: Object.fromEntries(this.personalizedRules),
            patternCategories: {
                pronunciation: Object.fromEntries(this.patternCategories.pronunciation),
                preference: Object.fromEntries(this.patternCategories.preference),
                correction: Object.fromEntries(this.patternCategories.correction),
                archetype: Object.fromEntries(this.patternCategories.archetype)
            },
            stats: this.learningStats
        };
    }
    
    /**
     * Import learned patterns from backup
     * @param {Object} patternData - Exported pattern data
     */
    importPatterns(patternData) {
        if (!patternData || patternData.version !== '1.0') {
            throw new Error('Invalid pattern data format');
        }
        
        try {
            this.userPatterns = new Map(Object.entries(patternData.userPatterns || {}));
            this.personalizedRules = new Map(Object.entries(patternData.personalizedRules || {}));
            
            if (patternData.patternCategories) {
                this.patternCategories.pronunciation = new Map(Object.entries(patternData.patternCategories.pronunciation || {}));
                this.patternCategories.preference = new Map(Object.entries(patternData.patternCategories.preference || {}));
                this.patternCategories.correction = new Map(Object.entries(patternData.patternCategories.correction || {}));
                this.patternCategories.archetype = new Map(Object.entries(patternData.patternCategories.archetype || {}));
            }
            
            if (patternData.stats) {
                this.learningStats = { ...this.learningStats, ...patternData.stats };
            }
            
            this.logger.info('Successfully imported learned patterns');
        } catch (error) {
            this.logger.error('Failed to import patterns:', error);
            throw error;
        }
    }
    
    /**
     * Save learned patterns to storage
     */
    async savePatterns() {
        if (!this.storage) return;
        
        try {
            const patternData = this.exportPatterns();
            await this.storage.set('voiceLearningPatterns', patternData);
            this.logger.debug('Saved learned patterns to storage');
        } catch (error) {
            this.logger.warn('Failed to save patterns:', error);
        }
    }
    
    /**
     * Load learned patterns from storage
     */
    async loadPatterns() {
        if (!this.storage) return;
        
        try {
            const patternData = await this.storage.get('voiceLearningPatterns');
            if (patternData) {
                this.importPatterns(patternData);
                this.logger.info('Loaded learned patterns from storage');
            }
        } catch (error) {
            this.logger.warn('Failed to load patterns:', error);
        }
    }
    
    /**
     * Reset all learned patterns
     */
    reset() {
        this.userPatterns.clear();
        this.personalizedRules.clear();
        this.successHistory = [];
        this.rejectionHistory = [];
        
        Object.values(this.patternCategories).forEach(category => category.clear());
        
        this.learningStats = {
            patternsLearned: 0,
            adaptationsApplied: 0,
            accuracyImprovement: 0
        };
        
        if (this.storage) {
            this.storage.remove('voiceLearningPatterns');
        }
        
        this.logger.info('Reset all learned patterns');
    }
    
    /**
     * Enable or disable learning
     * @param {boolean} enabled - Whether to enable learning
     */
    setLearningEnabled(enabled) {
        this.isLearning = enabled;
        this.logger.info(`Learning ${enabled ? 'enabled' : 'disabled'}`);
    }
}