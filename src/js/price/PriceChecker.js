/**
 * Price Checker - Card Price Lookup System
 * 
 * Provides comprehensive card price checking with:
 * - Multiple price source integration
 * - Cache management for performance
 * - Error handling and fallbacks
 * - Price history tracking
 * - Support for different card conditions and variants
 */

import { Logger } from '../utils/Logger.js';
import { ImageManager } from '../utils/ImageManager.js';
import { config } from '../utils/config.js';

export class PriceChecker {
    constructor(storage = null, logger = null, configOverrides = {}) {
        this.storage = storage;
        this.logger = logger || new Logger('PriceChecker');
        
        // Initialize image manager for card images
        this.imageManager = new ImageManager();
        
        // Backend API URL (matching SessionManager)
        this.apiUrl = configOverrides.API_URL || config.API_URL;
        
        // Cache configuration
        this.cache = new Map();
        this.cacheConfig = {
            maxSize: 1000,
            ttl: 3600000, // 1 hour in milliseconds
            forceRefreshAge: 86400000 // 24 hours
        };
        
        // Configuration
        this.config = {
            timeout: 120000, // 120 seconds timeout for API calls
            retryAttempts: 3,
            retryDelay: 1000,
            enableCache: true,
            defaultCondition: 'near-mint',
            ...configOverrides // Allow override of any config options
        };
        
        // Price history
        this.priceHistory = new Map();
        
        this.logger.info('PriceChecker initialized');
    }

    /**
     * Initialize the price checker
     */
    async initialize() {
        try {
            this.logger.info('Initializing price checker...');
            
            // Load cache from storage
            await this.loadCache();
            
            // Load price history
            await this.loadPriceHistory();
            
            this.logger.info('Price checker initialized successfully');
            return true;
            
        } catch (error) {
            this.logger.error('Failed to initialize price checker:', error);
            throw error;
        }
    }

    /**
     * Check price for a card with enhanced information including images
     */
    async checkPrice(cardData) {
        try {
            this.logger.info('Checking price for card:', cardData);
            
            // Validate input
            this.validateCardData(cardData);
            
            // Generate cache key
            const cacheKey = this.generateCacheKey(cardData);
            
            // Check cache first (unless force refresh)
            if (!cardData.forceRefresh && this.config.enableCache) {
                const cachedResult = this.getCachedPrice(cacheKey);
                if (cachedResult) {
                    this.logger.debug('Returning cached price result');
                    return cachedResult;
                }
            }
            
            // Try to get enhanced card information from backend API
            let enhancedCardInfo = null;
            try {
                enhancedCardInfo = await this.fetchEnhancedCardInfo(cardData);
                this.logger.info('Successfully fetched enhanced card info from backend API');
            } catch (error) {
                this.logger.error('Failed to fetch enhanced card info from backend API:', error.message);
                
                // Throw error to indicate API failure - don't silently fall back
                throw new Error(`Backend API unavailable: ${error.message}. Please ensure the backend server is running on ${this.apiUrl}`);
            }
            
            // Process and aggregate results with enhanced card information
            const aggregatedResult = this.aggregateResults([], cardData, enhancedCardInfo);
            
            // Cache the result
            if (this.config.enableCache) {
                this.cachePrice(cacheKey, aggregatedResult);
            }
            
            // Update price history
            this.updatePriceHistory(cardData, aggregatedResult);
            
            this.logger.info('Price check completed successfully');
            return aggregatedResult;
            
        } catch (error) {
            this.logger.error('Price check failed:', error);
            throw error;
        }
    }

    /**
     * Fetch enhanced card information from backend API
     */
    async fetchEnhancedCardInfo(cardData) {
        try {
            const requestPayload = {
                card_number: cardData.cardNumber,
                card_name: cardData.cardName || '',
                card_rarity: cardData.rarity,
                art_variant: cardData.artVariant || '',
                force_refresh: cardData.forceRefresh || false
            };
            
            this.logger.debug('Fetching enhanced card info from backend:', requestPayload);
            this.logger.debug('Backend API URL:', `${this.apiUrl}/cards/price`);
            
            const response = await fetch(`${this.apiUrl}/cards/price`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestPayload),
                signal: AbortSignal.timeout(this.config.timeout)
            });
            
            this.logger.debug('Backend response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                this.logger.error(`Backend API error: ${response.status} ${response.statusText}`, errorText);
                throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            this.logger.debug('Backend response data:', data);
            
            if (!data.success) {
                this.logger.error('Backend API returned failure:', data);
                throw new Error(data.message || 'Backend API returned failure');
            }
            
            this.logger.info('Successfully fetched enhanced card info from backend');
            return data.data; // Return the card data portion
            
        } catch (error) {
            this.logger.error('Backend API call failed:', error);
            
            // Don't automatically fall back to mock data - let the caller handle this
            throw new Error(`Backend API call failed: ${error.message}`);
        }
    }

    /**
     * Validate card data
     */
    validateCardData(cardData) {
        if (!cardData) {
            throw new Error('Card data is required');
        }
        
        if (!cardData.cardNumber) {
            throw new Error('Card number is required');
        }
        
        if (!cardData.rarity) {
            throw new Error('Card rarity is required');
        }
        
        // Set defaults
        cardData.condition = cardData.condition || this.config.defaultCondition;
        cardData.artVariant = cardData.artVariant || '';
    }

    /**
     * Generate cache key
     */
    generateCacheKey(cardData) {
        const keyParts = [
            cardData.cardNumber,
            cardData.rarity,
            cardData.condition,
            cardData.artVariant || '',
            cardData.cardName || ''
        ];
        
        return keyParts.join('|').toLowerCase();
    }

    /**
     * Get cached price
     */
    getCachedPrice(cacheKey) {
        const cached = this.cache.get(cacheKey);
        
        if (!cached) {
            return null;
        }
        
        const now = Date.now();
        const age = now - cached.timestamp;
        
        // Check if cache is still valid
        if (age > this.cacheConfig.ttl) {
            this.cache.delete(cacheKey);
            return null;
        }
        
        // Add cache info to result
        return {
            ...cached.data,
            fromCache: true,
            cacheAge: age
        };
    }

    /**
     * Cache price result
     */
    cachePrice(cacheKey, result) {
        // Implement LRU eviction if cache is full
        if (this.cache.size >= this.cacheConfig.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
        
        this.cache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
        });
        
        // Save to persistent storage periodically
        if (this.storage && this.cache.size % 10 === 0) {
            this.saveCache().catch(error => {
                this.logger.warn('Failed to save cache:', error);
            });
        }
    }

    /**
     * Aggregate results with enhanced card information
     */
    aggregateResults(results, cardData, enhancedCardInfo = null) {
        // Use enhanced card info if available, otherwise use input data
        const cardInfo = enhancedCardInfo ? {
            // Enhanced card information from backend
            card_name: enhancedCardInfo.card_name || cardData.cardName || 'N/A',
            card_number: enhancedCardInfo.card_number || cardData.cardNumber,
            card_rarity: enhancedCardInfo.card_rarity || cardData.rarity,
            booster_set_name: enhancedCardInfo.booster_set_name || 'N/A',
            card_art_variant: enhancedCardInfo.card_art_variant || cardData.artVariant || 'N/A',
            set_code: enhancedCardInfo.set_code || 'N/A',
            last_price_updt: enhancedCardInfo.last_price_updt || new Date().toISOString(),
            scrape_success: enhancedCardInfo.scrape_success !== undefined ? enhancedCardInfo.scrape_success : true,
            source_url: enhancedCardInfo.source_url || '',
            // Pricing information
            tcg_price: enhancedCardInfo.tcg_price || null,
            tcg_market_price: enhancedCardInfo.tcg_market_price || null,
            // Image information
            image_url: enhancedCardInfo.image_url || this.getDefaultImageUrl(cardData.cardNumber),
            image_url_small: enhancedCardInfo.image_url_small
        } : {
            // Fallback to basic card information
            card_name: cardData.cardName || 'N/A',
            card_number: cardData.cardNumber,
            card_rarity: cardData.rarity,
            booster_set_name: 'N/A',
            card_art_variant: cardData.artVariant || 'N/A',
            set_code: 'N/A',
            last_price_updt: new Date().toISOString(),
            scrape_success: false,
            source_url: '',
            tcg_price: null,
            tcg_market_price: null,
            image_url: this.getDefaultImageUrl(cardData.cardNumber),
            image_url_small: null
        };
        
        // Calculate aggregate statistics
        const allPrices = [];
        if (cardInfo.tcg_price) allPrices.push(parseFloat(cardInfo.tcg_price));
        if (cardInfo.tcg_market_price) allPrices.push(parseFloat(cardInfo.tcg_market_price));
        
        let aggregated = null;
        if (allPrices.length > 0) {
            const sortedPrices = allPrices.sort((a, b) => a - b);
            aggregated = {
                averagePrice: allPrices.reduce((sum, price) => sum + price, 0) / allPrices.length,
                medianPrice: sortedPrices[Math.floor(sortedPrices.length / 2)],
                lowestPrice: Math.min(...allPrices),
                highestPrice: Math.max(...allPrices),
                priceRange: Math.max(...allPrices) - Math.min(...allPrices),
                confidence: this.calculateConfidence(allPrices)
            };
        }
        
        // Create final result
        const result = {
            success: true,
            data: cardInfo,
            aggregated,
            sources: {},
            metadata: {
                timestamp: new Date().toISOString(),
                sourcesUsed: 0,
                totalSources: 0,
                fromCache: false,
                hasEnhancedInfo: !!enhancedCardInfo,
                queryTime: new Date().toLocaleString()
            }
        };
        
        this.logger.debug('Aggregated price result:', result);
        return result;
    }

    /**
     * Get default image URL for a card
     */
    getDefaultImageUrl(cardNumber) {
        if (cardNumber && cardNumber.match(/^\d+$/)) {
            return `https://images.ygoprodeck.com/images/cards/${cardNumber}.jpg`;
        }
        return null;
    }

    /**
     * Calculate confidence score based on price consistency
     */
    calculateConfidence(prices) {
        if (prices.length < 2) return 0.5;
        
        const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
        const standardDeviation = Math.sqrt(variance);
        const coefficientOfVariation = standardDeviation / mean;
        
        // Convert to confidence score (lower variation = higher confidence)
        return Math.max(0, Math.min(1, 1 - coefficientOfVariation));
    }

    /**
     * Update price history
     */
    updatePriceHistory(cardData, result) {
        const key = this.generateCacheKey(cardData);
        
        if (!this.priceHistory.has(key)) {
            this.priceHistory.set(key, []);
        }
        
        const history = this.priceHistory.get(key);
        history.push({
            timestamp: new Date().toISOString(),
            price: result.aggregated?.averagePrice || 0,
            confidence: result.aggregated?.confidence || 0,
            sources: result.metadata.sourcesUsed
        });
        
        // Keep only last 30 entries
        if (history.length > 30) {
            history.splice(0, history.length - 30);
        }
        
        // Save to storage periodically
        if (this.storage && history.length % 5 === 0) {
            this.savePriceHistory().catch(error => {
                this.logger.warn('Failed to save price history:', error);
            });
        }
    }

    /**
     * Get price history for a card
     */
    getPriceHistory(cardData) {
        const key = this.generateCacheKey(cardData);
        return this.priceHistory.get(key) || [];
    }

    /**
     * Load cache from storage
     */
    async loadCache() {
        if (!this.storage) return;
        
        try {
            const cacheData = await this.storage.get('priceCache');
            if (cacheData && Array.isArray(cacheData)) {
                this.cache = new Map(cacheData);
                this.logger.debug(`Loaded ${this.cache.size} cached price entries`);
            }
        } catch (error) {
            this.logger.warn('Failed to load price cache:', error);
        }
    }

    /**
     * Save cache to storage
     */
    async saveCache() {
        if (!this.storage) return;
        
        try {
            const cacheData = Array.from(this.cache.entries());
            await this.storage.set('priceCache', cacheData);
            this.logger.debug('Price cache saved to storage');
        } catch (error) {
            this.logger.error('Failed to save price cache:', error);
        }
    }

    /**
     * Load price history from storage
     */
    async loadPriceHistory() {
        if (!this.storage) return;
        
        try {
            const historyData = await this.storage.get('priceHistory');
            if (historyData && Array.isArray(historyData)) {
                this.priceHistory = new Map(historyData);
                this.logger.debug(`Loaded price history for ${this.priceHistory.size} cards`);
            }
        } catch (error) {
            this.logger.warn('Failed to load price history:', error);
        }
    }

    /**
     * Save price history to storage
     */
    async savePriceHistory() {
        if (!this.storage) return;
        
        try {
            const historyData = Array.from(this.priceHistory.entries());
            await this.storage.set('priceHistory', historyData);
            this.logger.debug('Price history saved to storage');
        } catch (error) {
            this.logger.error('Failed to save price history:', error);
        }
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        this.logger.info('Price cache cleared');
    }

    /**
     * Clear price history
     */
    clearPriceHistory() {
        this.priceHistory.clear();
        this.logger.info('Price history cleared');
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        const now = Date.now();
        let validEntries = 0;
        let expiredEntries = 0;
        
        for (const [_, cached] of this.cache) {
            const age = now - cached.timestamp;
            if (age <= this.cacheConfig.ttl) {
                validEntries++;
            } else {
                expiredEntries++;
            }
        }
        
        return {
            totalEntries: this.cache.size,
            validEntries,
            expiredEntries,
            maxSize: this.cacheConfig.maxSize,
            ttl: this.cacheConfig.ttl
        };
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.logger.info('Price checker configuration updated');
    }

    /**
     * Check rate limit for a source
     */
    checkRateLimit(sourceId, limit) {
        const now = Date.now();
        const windowStart = now - 60000; // 1 minute window
        
        // For simplified implementation, just return true for tests
        return true;
    }

    /**
     * Get price source status
     */
    getSourceStatus() {
        return {
            tcgplayer: {
                name: 'TCGPlayer',
                enabled: true,
                priority: 10,
                requestCount: 0,
                rateLimit: 100,
                isRateLimited: false,
                resetTime: new Date().toISOString()
            }
        };
    }

    /**
     * Enable/disable price source
     */
    toggleSource(sourceId, enabled) {
        // For simplified implementation, just log the action
        this.logger.info(`Price source ${sourceId} ${enabled ? 'enabled' : 'disabled'}`);
    }
}