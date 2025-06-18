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

export class PriceChecker {
    constructor(storage = null, logger = null) {
        this.storage = storage;
        this.logger = logger || new Logger('PriceChecker');
        
        // Price sources configuration
        this.priceSources = new Map([
            ['tcgplayer', {
                name: 'TCGPlayer',
                endpoint: 'https://api.tcgplayer.com',
                enabled: true,
                priority: 10,
                rateLimit: 100, // requests per minute
                cache: true
            }],
            ['cardmarket', {
                name: 'Cardmarket',
                endpoint: 'https://api.cardmarket.com',
                enabled: true,
                priority: 8,
                rateLimit: 60,
                cache: true
            }],
            ['pricecharting', {
                name: 'PriceCharting',
                endpoint: 'https://www.pricecharting.com/api',
                enabled: true,
                priority: 6,
                rateLimit: 50,
                cache: true
            }]
        ]);
        
        // Cache configuration
        this.cache = new Map();
        this.cacheConfig = {
            maxSize: 1000,
            ttl: 3600000, // 1 hour in milliseconds
            forceRefreshAge: 86400000 // 24 hours
        };
        
        // Rate limiting
        this.requestCounts = new Map();
        this.resetTime = new Map();
        
        // Configuration
        this.config = {
            timeout: 10000, // 10 seconds
            retryAttempts: 3,
            retryDelay: 1000,
            enableCache: true,
            enableMultiSource: true,
            defaultCondition: 'near-mint'
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
            
            // Test API connections
            await this.testConnections();
            
            this.logger.info('Price checker initialized successfully');
            return true;
            
        } catch (error) {
            this.logger.error('Failed to initialize price checker:', error);
            throw error;
        }
    }

    /**
     * Check price for a card
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
            
            // Fetch prices from sources
            const results = await this.fetchPricesFromSources(cardData);
            
            // Process and aggregate results
            const aggregatedResult = this.aggregateResults(results, cardData);
            
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
     * Fetch prices from all available sources
     */
    async fetchPricesFromSources(cardData) {
        const results = [];
        const promises = [];
        
        // Get enabled sources sorted by priority
        const enabledSources = Array.from(this.priceSources.entries())
            .filter(([_, config]) => config.enabled)
            .sort(([_, a], [__, b]) => b.priority - a.priority);
        
        // Fetch from each source
        for (const [sourceId, sourceConfig] of enabledSources) {
            // Check rate limits
            if (!this.checkRateLimit(sourceId, sourceConfig.rateLimit)) {
                this.logger.warn(`Rate limit exceeded for ${sourceConfig.name}, skipping`);
                continue;
            }
            
            const promise = this.fetchFromSource(sourceId, sourceConfig, cardData)
                .then(result => ({ sourceId, ...result }))
                .catch(error => ({
                    sourceId,
                    error: error.message,
                    success: false
                }));
            
            promises.push(promise);
            
            // Break early if multi-source is disabled
            if (!this.config.enableMultiSource) {
                break;
            }
        }
        
        // Wait for all requests to complete
        const sourceResults = await Promise.allSettled(promises);
        
        // Process results
        sourceResults.forEach(result => {
            if (result.status === 'fulfilled') {
                results.push(result.value);
            } else {
                this.logger.error('Source request failed:', result.reason);
            }
        });
        
        return results;
    }

    /**
     * Check rate limit for a source
     */
    checkRateLimit(sourceId, limit) {
        const now = Date.now();
        const windowStart = now - 60000; // 1 minute window
        
        // Reset counter if window expired
        const resetTime = this.resetTime.get(sourceId) || 0;
        if (now > resetTime) {
            this.requestCounts.set(sourceId, 0);
            this.resetTime.set(sourceId, now + 60000);
        }
        
        const currentCount = this.requestCounts.get(sourceId) || 0;
        
        if (currentCount >= limit) {
            return false;
        }
        
        // Increment counter
        this.requestCounts.set(sourceId, currentCount + 1);
        return true;
    }

    /**
     * Fetch price from a specific source
     */
    async fetchFromSource(sourceId, sourceConfig, cardData) {
        const startTime = Date.now();
        
        try {
            this.logger.debug(`Fetching price from ${sourceConfig.name}`);
            
            let result;
            
            switch (sourceId) {
                case 'tcgplayer':
                    result = await this.fetchFromTCGPlayer(cardData);
                    break;
                case 'cardmarket':
                    result = await this.fetchFromCardmarket(cardData);
                    break;
                case 'pricecharting':
                    result = await this.fetchFromPriceCharting(cardData);
                    break;
                default:
                    throw new Error(`Unknown price source: ${sourceId}`);
            }
            
            const responseTime = Date.now() - startTime;
            
            return {
                success: true,
                source: sourceConfig.name,
                data: result,
                responseTime
            };
            
        } catch (error) {
            const responseTime = Date.now() - startTime;
            
            this.logger.error(`Failed to fetch from ${sourceConfig.name}:`, error);
            
            return {
                success: false,
                source: sourceConfig.name,
                error: error.message,
                responseTime
            };
        }
    }

    /**
     * Fetch price from TCGPlayer
     */
    async fetchFromTCGPlayer(cardData) {
        // Mock implementation - in a real app, this would call the actual API
        // For demo purposes, return simulated data
        
        await this.simulateDelay(500, 2000); // Simulate API delay
        
        // Simulate different prices based on rarity
        const basePrice = this.getBasePriceByRarity(cardData.rarity);
        const variance = basePrice * 0.2; // 20% variance
        
        return {
            marketPrice: basePrice + (Math.random() - 0.5) * variance,
            lowPrice: basePrice * 0.8,
            highPrice: basePrice * 1.3,
            medianPrice: basePrice,
            listings: Math.floor(Math.random() * 50) + 5,
            lastUpdated: new Date().toISOString(),
            url: `https://www.tcgplayer.com/search/yugioh/product?q=${encodeURIComponent(cardData.cardNumber)}`
        };
    }

    /**
     * Fetch price from Cardmarket
     */
    async fetchFromCardmarket(cardData) {
        // Mock implementation
        await this.simulateDelay(800, 2500);
        
        const basePrice = this.getBasePriceByRarity(cardData.rarity);
        const variance = basePrice * 0.25;
        
        return {
            averagePrice: basePrice + (Math.random() - 0.5) * variance,
            lowPrice: basePrice * 0.75,
            trendPrice: basePrice * 1.1,
            germanProLow: basePrice * 0.9,
            suggestedPrice: basePrice * 1.05,
            listings: Math.floor(Math.random() * 30) + 3,
            lastUpdated: new Date().toISOString(),
            url: `https://www.cardmarket.com/en/YuGiOh/Products/Search?searchString=${encodeURIComponent(cardData.cardNumber)}`
        };
    }

    /**
     * Fetch price from PriceCharting
     */
    async fetchFromPriceCharting(cardData) {
        // Mock implementation
        await this.simulateDelay(300, 1500);
        
        const basePrice = this.getBasePriceByRarity(cardData.rarity);
        const variance = basePrice * 0.15;
        
        return {
            priceChartingPrice: basePrice + (Math.random() - 0.5) * variance,
            ungraded: basePrice,
            gradedPrices: {
                psa9: basePrice * 2.5,
                psa10: basePrice * 4.0,
                bgs9: basePrice * 2.2,
                bgs10: basePrice * 3.8
            },
            lastUpdated: new Date().toISOString(),
            url: `https://www.pricecharting.com/search-products?q=${encodeURIComponent(cardData.cardNumber)}&type=yugioh`
        };
    }

    /**
     * Get base price by rarity (for simulation)
     */
    getBasePriceByRarity(rarity) {
        const rarityPrices = {
            'common': 0.25,
            'rare': 1.50,
            'super': 5.00,
            'ultra': 15.00,
            'secret': 35.00,
            'ghost': 75.00,
            'prismatic': 100.00,
            'starlight': 500.00
        };
        
        return rarityPrices[rarity.toLowerCase()] || 1.00;
    }

    /**
     * Simulate API delay
     */
    async simulateDelay(min = 500, max = 2000) {
        const delay = Math.random() * (max - min) + min;
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    /**
     * Aggregate results from multiple sources
     */
    aggregateResults(results, cardData) {
        const successfulResults = results.filter(r => r.success);
        
        if (successfulResults.length === 0) {
            throw new Error('No price data available from any source');
        }
        
        // Calculate aggregated statistics
        const allPrices = [];
        const sourceData = {};
        
        successfulResults.forEach(result => {
            const data = result.data;
            sourceData[result.sourceId] = {
                source: result.source,
                data: data,
                responseTime: result.responseTime
            };
            
            // Extract prices for aggregation
            if (data.marketPrice) allPrices.push(data.marketPrice);
            if (data.averagePrice) allPrices.push(data.averagePrice);
            if (data.priceChartingPrice) allPrices.push(data.priceChartingPrice);
            if (data.medianPrice) allPrices.push(data.medianPrice);
        });
        
        // Calculate aggregate statistics
        const sortedPrices = allPrices.sort((a, b) => a - b);
        const aggregated = {
            averagePrice: allPrices.reduce((sum, price) => sum + price, 0) / allPrices.length,
            medianPrice: sortedPrices[Math.floor(sortedPrices.length / 2)],
            lowestPrice: Math.min(...allPrices),
            highestPrice: Math.max(...allPrices),
            priceRange: Math.max(...allPrices) - Math.min(...allPrices),
            confidence: this.calculateConfidence(allPrices)
        };
        
        // Create final result
        const result = {
            success: true,
            cardInfo: {
                number: cardData.cardNumber,
                name: cardData.cardName,
                rarity: cardData.rarity,
                condition: cardData.condition,
                artVariant: cardData.artVariant
            },
            aggregated,
            sources: sourceData,
            metadata: {
                timestamp: new Date().toISOString(),
                sourcesUsed: successfulResults.length,
                totalSources: results.length,
                fromCache: false
            }
        };
        
        this.logger.debug('Aggregated price result:', result);
        return result;
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
            price: result.aggregated.averagePrice,
            confidence: result.aggregated.confidence,
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
            if (cacheData) {
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
            if (historyData) {
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
     * Test connections to price sources
     */
    async testConnections() {
        this.logger.info('Testing price source connections...');
        
        const testCard = {
            cardNumber: 'LOB-001',
            rarity: 'ultra',
            cardName: 'Blue-Eyes White Dragon'
        };
        
        const promises = Array.from(this.priceSources.entries())
            .filter(([_, config]) => config.enabled)
            .map(async ([sourceId, config]) => {
                try {
                    await this.fetchFromSource(sourceId, config, testCard);
                    this.logger.debug(`${config.name} connection test passed`);
                    return { sourceId, success: true };
                } catch (error) {
                    this.logger.warn(`${config.name} connection test failed:`, error);
                    return { sourceId, success: false, error: error.message };
                }
            });
        
        const results = await Promise.all(promises);
        const successCount = results.filter(r => r.success).length;
        
        this.logger.info(`Connection tests completed: ${successCount}/${results.length} sources available`);
        return results;
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
            ttl: this.cacheConfig.ttl,
            hitRate: this.cacheHitRate || 0
        };
    }

    /**
     * Get price source status
     */
    getSourceStatus() {
        const status = {};
        
        for (const [sourceId, config] of this.priceSources) {
            const requestCount = this.requestCounts.get(sourceId) || 0;
            const resetTime = this.resetTime.get(sourceId) || 0;
            const isRateLimited = requestCount >= config.rateLimit && Date.now() < resetTime;
            
            status[sourceId] = {
                name: config.name,
                enabled: config.enabled,
                priority: config.priority,
                requestCount,
                rateLimit: config.rateLimit,
                isRateLimited,
                resetTime: new Date(resetTime).toISOString()
            };
        }
        
        return status;
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.logger.info('Price checker configuration updated');
    }

    /**
     * Enable/disable price source
     */
    toggleSource(sourceId, enabled) {
        const source = this.priceSources.get(sourceId);
        if (source) {
            source.enabled = enabled;
            this.logger.info(`Price source ${source.name} ${enabled ? 'enabled' : 'disabled'}`);
        }
    }
}