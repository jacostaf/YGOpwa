/**
 * Voice Trainer - User Training Data Management
 * 
 * Manages user-specific voice recognition training data and custom mappings.
 * Stores all data in browser storage for personalized voice recognition.
 * 
 * Features:
 * - Custom voice-to-card mappings
 * - Custom voice-to-rarity mappings
 * - Training session management
 * - Browser storage persistence
 * - Import/export functionality
 * - Training statistics
 */

import { Logger } from '../utils/Logger.js';

export class VoiceTrainer {
    constructor(storage, logger = null) {
        this.logger = logger || new Logger('VoiceTrainer');
        this.storage = storage;
        
        // Training data structure
        this.data = {
            cardMappings: new Map(), // voice input -> card name
            rarityMappings: new Map(), // voice input -> rarity
            trainingSessions: [],
            statistics: {
                totalTrainingSessions: 0,
                totalCardMappings: 0,
                totalRarityMappings: 0,
                lastTrainingDate: null,
                accuracyImprovement: 0
            }
        };
        
        // Configuration
        this.config = {
            maxMappings: 1000,
            maxSessions: 100,
            storageKey: 'voice_training_data',
            backupInterval: 24 * 60 * 60 * 1000, // 24 hours
            minConfidenceForAutoAdd: 0.9
        };
        
        this.isInitialized = false;
        this.logger.info('VoiceTrainer initialized');
    }

    /**
     * Initialize the voice trainer
     */
    async initialize() {
        try {
            this.logger.info('Initializing voice trainer...');
            
            // Load existing training data
            await this.loadTrainingData();
            
            // Setup auto-backup
            this.setupAutoBackup();
            
            this.isInitialized = true;
            this.logger.info('Voice trainer initialized successfully');
            
        } catch (error) {
            this.logger.error('Failed to initialize voice trainer:', error);
            throw error;
        }
    }

    /**
     * Load training data from storage
     */
    async loadTrainingData() {
        try {
            const storedData = await this.storage.getItem(this.config.storageKey);
            
            if (storedData) {
                // Convert arrays back to Maps for mappings
                this.data = {
                    ...storedData,
                    cardMappings: new Map(storedData.cardMappings || []),
                    rarityMappings: new Map(storedData.rarityMappings || [])
                };
                
                this.logger.info(`Loaded training data: ${this.data.cardMappings.size} card mappings, ${this.data.rarityMappings.size} rarity mappings`);
            } else {
                this.logger.info('No existing training data found, starting fresh');
            }
            
        } catch (error) {
            this.logger.error('Failed to load training data:', error);
            // Continue with empty data rather than failing
        }
    }

    /**
     * Save training data to storage
     */
    async saveTrainingData() {
        try {
            // Convert Maps to arrays for storage
            const dataToStore = {
                ...this.data,
                cardMappings: Array.from(this.data.cardMappings.entries()),
                rarityMappings: Array.from(this.data.rarityMappings.entries())
            };
            
            await this.storage.setItem(this.config.storageKey, dataToStore);
            this.logger.debug('Training data saved to storage');
            
        } catch (error) {
            this.logger.error('Failed to save training data:', error);
            throw error;
        }
    }

    /**
     * Add a new card mapping
     */
    async addCardMapping(voiceInput, cardName, setCode = null, confidence = 1.0) {
        if (!voiceInput || !cardName) {
            throw new Error('Voice input and card name are required');
        }
        
        const normalizedVoiceInput = this.normalizeVoiceInput(voiceInput);
        const mappingKey = `${normalizedVoiceInput}${setCode ? `|${setCode}` : ''}`;
        
        const mapping = {
            voiceInput: normalizedVoiceInput,
            cardName,
            setCode,
            confidence,
            dateAdded: new Date().toISOString(),
            useCount: 0,
            lastUsed: null
        };
        
        this.data.cardMappings.set(mappingKey, mapping);
        this.data.statistics.totalCardMappings = this.data.cardMappings.size;
        
        await this.saveTrainingData();
        
        this.logger.info(`Added card mapping: "${voiceInput}" -> "${cardName}"${setCode ? ` (${setCode})` : ''}`);
        
        return mapping;
    }

    /**
     * Add a new rarity mapping
     */
    async addRarityMapping(voiceInput, rarity, confidence = 1.0) {
        if (!voiceInput || !rarity) {
            throw new Error('Voice input and rarity are required');
        }
        
        const normalizedVoiceInput = this.normalizeVoiceInput(voiceInput);
        
        const mapping = {
            voiceInput: normalizedVoiceInput,
            rarity,
            confidence,
            dateAdded: new Date().toISOString(),
            useCount: 0,
            lastUsed: null
        };
        
        this.data.rarityMappings.set(normalizedVoiceInput, mapping);
        this.data.statistics.totalRarityMappings = this.data.rarityMappings.size;
        
        await this.saveTrainingData();
        
        this.logger.info(`Added rarity mapping: "${voiceInput}" -> "${rarity}"`);
        
        return mapping;
    }

    /**
     * Get card mapping for voice input
     */
    getCardMapping(voiceInput, setCode = null) {
        const normalizedVoiceInput = this.normalizeVoiceInput(voiceInput);
        
        // Try with set code first
        if (setCode) {
            const mappingKey = `${normalizedVoiceInput}|${setCode}`;
            const mapping = this.data.cardMappings.get(mappingKey);
            if (mapping) {
                this.updateMappingUsage(mapping);
                return mapping;
            }
        }
        
        // Try without set code
        const mapping = this.data.cardMappings.get(normalizedVoiceInput);
        if (mapping) {
            this.updateMappingUsage(mapping);
            return mapping;
        }
        
        return null;
    }

    /**
     * Get rarity mapping for voice input
     */
    getRarityMapping(voiceInput) {
        const normalizedVoiceInput = this.normalizeVoiceInput(voiceInput);
        const mapping = this.data.rarityMappings.get(normalizedVoiceInput);
        
        if (mapping) {
            this.updateMappingUsage(mapping);
            return mapping;
        }
        
        return null;
    }

    /**
     * Find similar card mappings
     */
    findSimilarCardMappings(voiceInput, maxResults = 5) {
        const normalizedVoiceInput = this.normalizeVoiceInput(voiceInput);
        const results = [];
        
        for (const [key, mapping] of this.data.cardMappings) {
            const similarity = this.calculateSimilarity(normalizedVoiceInput, mapping.voiceInput);
            if (similarity > 0.7) {
                results.push({
                    ...mapping,
                    similarity
                });
            }
        }
        
        return results
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, maxResults);
    }

    /**
     * Find similar rarity mappings
     */
    findSimilarRarityMappings(voiceInput, maxResults = 5) {
        const normalizedVoiceInput = this.normalizeVoiceInput(voiceInput);
        const results = [];
        
        for (const [key, mapping] of this.data.rarityMappings) {
            const similarity = this.calculateSimilarity(normalizedVoiceInput, mapping.voiceInput);
            if (similarity > 0.7) {
                results.push({
                    ...mapping,
                    similarity
                });
            }
        }
        
        return results
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, maxResults);
    }

    /**
     * Start a new training session
     */
    startTrainingSession(setCode, setName) {
        const session = {
            id: this.generateSessionId(),
            setCode,
            setName,
            startTime: new Date().toISOString(),
            endTime: null,
            cardMappingsAdded: [],
            rarityMappingsAdded: [],
            accuracy: 0,
            totalAttempts: 0,
            successfulAttempts: 0
        };
        
        this.currentSession = session;
        this.logger.info(`Started training session for set: ${setName} (${setCode})`);
        
        return session;
    }

    /**
     * End the current training session
     */
    async endTrainingSession() {
        if (!this.currentSession) {
            return null;
        }
        
        this.currentSession.endTime = new Date().toISOString();
        this.currentSession.accuracy = this.currentSession.totalAttempts > 0 
            ? this.currentSession.successfulAttempts / this.currentSession.totalAttempts 
            : 0;
        
        // Add to sessions history
        this.data.trainingSessions.push(this.currentSession);
        
        // Keep only last N sessions
        if (this.data.trainingSessions.length > this.config.maxSessions) {
            this.data.trainingSessions = this.data.trainingSessions.slice(-this.config.maxSessions);
        }
        
        // Update statistics
        this.data.statistics.totalTrainingSessions++;
        this.data.statistics.lastTrainingDate = this.currentSession.endTime;
        
        await this.saveTrainingData();
        
        const session = this.currentSession;
        this.currentSession = null;
        
        this.logger.info(`Ended training session with ${session.accuracy.toFixed(2)} accuracy`);
        
        return session;
    }

    /**
     * Record training attempt
     */
    recordTrainingAttempt(voiceInput, expectedOutput, actualOutput, isCorrect) {
        if (this.currentSession) {
            this.currentSession.totalAttempts++;
            if (isCorrect) {
                this.currentSession.successfulAttempts++;
            }
        }
        
        this.logger.debug(`Training attempt: "${voiceInput}" -> expected: "${expectedOutput}", actual: "${actualOutput}", correct: ${isCorrect}`);
    }

    /**
     * Get all card mappings
     */
    getAllCardMappings() {
        return Array.from(this.data.cardMappings.entries()).map(([key, mapping]) => ({
            key,
            ...mapping
        }));
    }

    /**
     * Get all rarity mappings
     */
    getAllRarityMappings() {
        return Array.from(this.data.rarityMappings.entries()).map(([key, mapping]) => ({
            key,
            ...mapping
        }));
    }

    /**
     * Remove card mapping
     */
    async removeCardMapping(voiceInput, setCode = null) {
        const normalizedVoiceInput = this.normalizeVoiceInput(voiceInput);
        const mappingKey = `${normalizedVoiceInput}${setCode ? `|${setCode}` : ''}`;
        
        const removed = this.data.cardMappings.delete(mappingKey);
        if (removed) {
            this.data.statistics.totalCardMappings = this.data.cardMappings.size;
            await this.saveTrainingData();
            this.logger.info(`Removed card mapping: "${voiceInput}"`);
        }
        
        return removed;
    }

    /**
     * Remove rarity mapping
     */
    async removeRarityMapping(voiceInput) {
        const normalizedVoiceInput = this.normalizeVoiceInput(voiceInput);
        
        const removed = this.data.rarityMappings.delete(normalizedVoiceInput);
        if (removed) {
            this.data.statistics.totalRarityMappings = this.data.rarityMappings.size;
            await this.saveTrainingData();
            this.logger.info(`Removed rarity mapping: "${voiceInput}"`);
        }
        
        return removed;
    }

    /**
     * Clear all training data
     */
    async clearAllData() {
        this.data = {
            cardMappings: new Map(),
            rarityMappings: new Map(),
            trainingSessions: [],
            statistics: {
                totalTrainingSessions: 0,
                totalCardMappings: 0,
                totalRarityMappings: 0,
                lastTrainingDate: null,
                accuracyImprovement: 0
            }
        };
        
        await this.saveTrainingData();
        this.logger.info('Cleared all training data');
    }

    /**
     * Export training data
     */
    exportTrainingData() {
        const exportData = {
            cardMappings: Array.from(this.data.cardMappings.entries()),
            rarityMappings: Array.from(this.data.rarityMappings.entries()),
            statistics: this.data.statistics,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        return JSON.stringify(exportData, null, 2);
    }

    /**
     * Import training data
     */
    async importTrainingData(jsonData, merge = true) {
        try {
            const importData = JSON.parse(jsonData);
            
            if (!merge) {
                await this.clearAllData();
            }
            
            // Import card mappings
            if (importData.cardMappings) {
                for (const [key, mapping] of importData.cardMappings) {
                    this.data.cardMappings.set(key, mapping);
                }
            }
            
            // Import rarity mappings
            if (importData.rarityMappings) {
                for (const [key, mapping] of importData.rarityMappings) {
                    this.data.rarityMappings.set(key, mapping);
                }
            }
            
            // Update statistics
            this.data.statistics.totalCardMappings = this.data.cardMappings.size;
            this.data.statistics.totalRarityMappings = this.data.rarityMappings.size;
            
            await this.saveTrainingData();
            
            this.logger.info(`Imported training data: ${this.data.cardMappings.size} card mappings, ${this.data.rarityMappings.size} rarity mappings`);
            
        } catch (error) {
            this.logger.error('Failed to import training data:', error);
            throw error;
        }
    }

    /**
     * Get training statistics
     */
    getStatistics() {
        return {
            ...this.data.statistics,
            cardMappings: this.data.cardMappings.size,
            rarityMappings: this.data.rarityMappings.size,
            recentSessions: this.data.trainingSessions.slice(-5)
        };
    }

    /**
     * Normalize voice input for consistent storage
     */
    normalizeVoiceInput(input) {
        if (!input) return '';
        return input.toLowerCase().trim().replace(/\s+/g, ' ');
    }

    /**
     * Update mapping usage statistics
     */
    updateMappingUsage(mapping) {
        mapping.useCount = (mapping.useCount || 0) + 1;
        mapping.lastUsed = new Date().toISOString();
    }

    /**
     * Calculate similarity between two strings
     */
    calculateSimilarity(str1, str2) {
        if (str1 === str2) return 1.0;
        
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const distance = this.calculateLevenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }

    /**
     * Calculate Levenshtein distance
     */
    calculateLevenshteinDistance(str1, str2) {
        const matrix = Array(str2.length + 1).fill().map(() => Array(str1.length + 1).fill(0));
        
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
     * Generate unique session ID
     */
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Setup automatic backup
     */
    setupAutoBackup() {
        setInterval(async () => {
            try {
                await this.saveTrainingData();
                this.logger.debug('Auto-backup completed');
            } catch (error) {
                this.logger.warn('Auto-backup failed:', error);
            }
        }, this.config.backupInterval);
    }
}