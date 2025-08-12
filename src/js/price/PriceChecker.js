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

/**
 * Enhanced Price Checker with Advanced Form Workflows
 * 
 * Phase 3 Implementation: Complete System Integration & Production Validation
 * - Advanced form workflow integration
 * - Comprehensive validation and error handling
 * - Theme-aware form processing
 * - Batch processing capabilities
 * - Export/import functionality
 * - Performance monitoring
 */
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
     * Integration with migration system - set after initialization
     * @param {SelectorMapper} selectorMapper - The SelectorMapper instance
     */
    setSelectorMapper(selectorMapper) {
        this.selectorMapper = selectorMapper;
        this.logger.info('PriceChecker integrated with SelectorMapper');
    }

    /**
     * Theme-aware element access for form handling
     * @param {string} selectorKey - The key from SelectorMapper
     * @returns {Element|null} The DOM element
     */
    getElement(selectorKey) {
        if (this.selectorMapper) {
            return this.selectorMapper.getElement(selectorKey);
        }
        
        // Fallback for backward compatibility
        this.logger.warn(`No SelectorMapper available for ${selectorKey}`);
        return null;
    }

    /**
     * Get form data from current theme's form elements with enhanced validation
     */
    getFormDataFromCurrentTheme() {
        try {
            const formData = {
                cardNumber: this.getElement('cardNumberInput')?.value?.trim() || '',
                cardName: this.getElement('cardNameInput')?.value?.trim() || '',
                rarity: this.getElement('raritySelect')?.value || '',
                artVariant: this.getElement('artVariantCheckbox')?.checked || false,
                condition: this.getElement('conditionSelect')?.value || 'near-mint',
                forceRefresh: this.getElement('forceRefreshCheckbox')?.checked || false
            };
            
            // Add validation metadata
            formData._validation = this.validateFormData(formData);
            formData._theme = this.getCurrentTheme();
            formData._timestamp = new Date().toISOString();
            
            return formData;
        } catch (error) {
            this.logger.warn('Error getting form data from current theme:', error);
            return {
                _validation: { isValid: false, errors: ['Failed to read form data'] },
                _theme: 'unknown',
                _timestamp: new Date().toISOString()
            };
        }
    }
    
    /**
     * Validate form data with comprehensive checks
     */
    validateFormData(formData) {
        const errors = [];
        const warnings = [];
        
        // Card number validation
        if (!formData.cardNumber) {
            errors.push('Card number is required');
        } else if (!this.isValidCardNumber(formData.cardNumber)) {
            warnings.push('Card number format may be incorrect');
        }
        
        // Rarity validation
        if (!formData.rarity) {
            errors.push('Card rarity is required');
        }
        
        // Card name validation (optional but helpful)
        if (formData.cardName && formData.cardName.length < 2) {
            warnings.push('Card name seems too short');
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            score: this.calculateValidationScore(formData, errors, warnings)
        };
    }
    
    /**
     * Check if card number format is valid
     */
    isValidCardNumber(cardNumber) {
        // Common Yu-Gi-Oh card number patterns
        const patterns = [
            /^[A-Z]{3,4}-[A-Z]{0,2}\d{3}$/i,  // LOB-001, BLVO-EN001
            /^\d{5,8}$/,                      // 12345678 (YGOPRODeck format)
            /^[A-Z]{2,4}\d{2,4}$/i,          // LOB001
            /^[A-Z]+-\d{3,4}$/i              // V-001
        ];
        
        return patterns.some(pattern => pattern.test(cardNumber.trim()));
    }
    
    /**
     * Calculate validation score (0-100)
     */
    calculateValidationScore(formData, errors, warnings) {
        let score = 100;
        score -= errors.length * 25;  // Major deductions for errors
        score -= warnings.length * 10; // Minor deductions for warnings
        
        // Bonus points for completeness
        if (formData.cardName) score += 5;
        if (formData.cardNumber && this.isValidCardNumber(formData.cardNumber)) score += 10;
        
        return Math.max(0, Math.min(100, score));
    }
    
    /**
     * Get current active theme
     */
    getCurrentTheme() {
        if (document.body.classList.contains('space-theme')) {
            return 'space';
        }
        return 'legacy';
    }

    /**
     * Display price results in current theme with enhanced error handling
     */
    displayPriceResults(results, container = null, options = {}) {
        try {
            const resultsContainer = container || this.getElement('priceResults') || 
                (this.getCurrentTheme() === 'space' ? document.getElementById('space-results-area') : document.getElementById('price-results'));
                
            if (!resultsContainer) {
                this.logger.warn('No price results container found in current theme');
                this.showErrorNotification('Unable to display results - container not found');
                return;
            }

            // Add loading state if specified
            if (options.showLoading) {
                this.showLoadingState(resultsContainer);
                return;
            }

            // Clear existing results
            resultsContainer.innerHTML = '';

            // Create results display
            if (results && results.success) {
                const resultElement = this.createPriceResultElement(results);
                if (resultElement) {
                    // Add smooth transition
                    resultElement.style.opacity = '0';
                    resultsContainer.appendChild(resultElement);
                    
                    // Animate in
                    requestAnimationFrame(() => {
                        resultElement.style.transition = 'opacity 0.3s ease-in-out';
                        resultElement.style.opacity = '1';
                    });
                }
                
                // Show success notification if enabled
                if (options.showNotification) {
                    this.showSuccessNotification('Price check completed successfully');
                }
            } else {
                // Enhanced error display
                const errorHtml = this.createErrorDisplay(results);
                resultsContainer.innerHTML = errorHtml;
                
                // Show error notification
                if (options.showNotification) {
                    const errorMessage = results?.message || 'Price check failed. Please try again.';
                    this.showErrorNotification(errorMessage);
                }
            }

            this.logger.debug('Price results displayed in current theme');
        } catch (error) {
            this.logger.error('Error displaying price results:', error);
            this.showErrorNotification('An error occurred while displaying results');
        }
    }
    
    /**
     * Show loading state in results container
     */
    showLoadingState(container) {
        const theme = this.getCurrentTheme();
        const loadingHtml = theme === 'space' ? `
            <div class="loading-state space-loading">
                <div class="loading-spinner"></div>
                <h3>🔍 Scanning card data...</h3>
                <p>Analyzing price information across multiple sources</p>
            </div>
        ` : `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Checking card prices...</p>
            </div>
        `;
        
        container.innerHTML = loadingHtml;
    }
    
    /**
     * Create enhanced error display
     */
    createErrorDisplay(results) {
        const theme = this.getCurrentTheme();
        const errorMessage = results?.message || 'Price check failed. Please try again.';
        const errorDetails = results?.details || '';
        
        if (theme === 'space') {
            return `
                <div class="error-state space-error">
                    <div class="error-icon">⚠️</div>
                    <h3>Scan Failed</h3>
                    <p class="error-message">${errorMessage}</p>
                    ${errorDetails ? `<p class="error-details">${errorDetails}</p>` : ''}
                    <div class="error-actions">
                        <button class="btn btn-secondary" onclick="this.closest('.error-state').style.display='none'">
                            <span>Dismiss</span>
                        </button>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="error-state">
                    <p class="error">${errorMessage}</p>
                    ${errorDetails ? `<p class="error-details">${errorDetails}</p>` : ''}
                </div>
            `;
        }
    }
    
    /**
     * Show success notification (placeholder - will be implemented by UIManager integration)
     */
    showSuccessNotification(message) {
        console.log('Success:', message);
        // TODO: Integrate with UIManager notification system
    }
    
    /**
     * Show error notification (placeholder - will be implemented by UIManager integration)
     */
    showErrorNotification(message) {
        console.error('Error:', message);
        // TODO: Integrate with UIManager notification system
    }

    /**
     * Create price result element for current theme with enhanced styling
     */
    createPriceResultElement(results) {
        try {
            const theme = this.getCurrentTheme();
            const resultDiv = document.createElement('div');
            resultDiv.className = theme === 'space' ? 'space-price-result result-item' : 'price-result-item result-item';

            const cardData = results.data || {};
            const aggregated = results.aggregated || {};
            const confidence = aggregated.confidence || 0;
            
            // Create theme-appropriate content
            if (theme === 'space') {
                resultDiv.innerHTML = this.createSpaceThemeResult(cardData, aggregated, confidence);
            } else {
                resultDiv.innerHTML = this.createLegacyThemeResult(cardData, aggregated, confidence);
            }

            // Add confidence indicator
            this.addConfidenceIndicator(resultDiv, confidence);
            
            // Add image if available
            if (cardData.image_url) {
                this.addCardImage(resultDiv, cardData.image_url, cardData.card_name);
            }

            return resultDiv;
        } catch (error) {
            this.logger.warn('Error creating price result element:', error);
            return this.createFallbackResultElement(results);
        }
    }
    
    /**
     * Create space theme result HTML
     */
    createSpaceThemeResult(cardData, aggregated, confidence) {
        return `
            <div class="space-card-header">
                <h3 class="card-title">🎴 ${cardData.card_name || 'Unknown Card'}</h3>
                <p class="card-details">📊 ${cardData.card_number || 'N/A'} • ${cardData.card_rarity || 'N/A'}</p>
            </div>
            <div class="space-price-grid">
                <div class="price-metric">
                    <span class="metric-label">💰 TCG Player</span>
                    <span class="metric-value">$${(cardData.tcg_price || 0).toFixed(2)}</span>
                </div>
                <div class="price-metric">
                    <span class="metric-label">📈 Market Price</span>
                    <span class="metric-value">$${(cardData.tcg_market_price || 0).toFixed(2)}</span>
                </div>
                ${aggregated.averagePrice ? `
                <div class="price-metric highlight">
                    <span class="metric-label">⭐ Average</span>
                    <span class="metric-value">$${aggregated.averagePrice.toFixed(2)}</span>
                </div>
                ` : ''}
            </div>
            <div class="result-metadata">
                <div class="metadata-row">
                    <span class="metadata-label">🔄 Last Updated:</span>
                    <span class="metadata-value">${new Date(cardData.last_price_updt || Date.now()).toLocaleString()}</span>
                </div>
                <div class="metadata-row">
                    <span class="metadata-label">🎯 Confidence:</span>
                    <span class="metadata-value">${(confidence * 100).toFixed(0)}%</span>
                </div>
            </div>
        `;
    }
    
    /**
     * Create legacy theme result HTML
     */
    createLegacyThemeResult(cardData, aggregated, confidence) {
        return `
            <div class="card-header">
                <h3>${cardData.card_name || 'Unknown Card'}</h3>
                <p class="card-details">${cardData.card_number || 'N/A'} - ${cardData.card_rarity || 'N/A'}</p>
            </div>
            <div class="price-info">
                <div class="price-row">
                    <span class="price-label">TCG Player:</span>
                    <span class="price-value">$${(cardData.tcg_price || 0).toFixed(2)}</span>
                </div>
                <div class="price-row">
                    <span class="price-label">Market Price:</span>
                    <span class="price-value">$${(cardData.tcg_market_price || 0).toFixed(2)}</span>
                </div>
                ${aggregated.averagePrice ? `
                <div class="price-row average">
                    <span class="price-label">Average:</span>
                    <span class="price-value">$${aggregated.averagePrice.toFixed(2)}</span>
                </div>
                ` : ''}
            </div>
            <div class="result-metadata">
                <small>Updated: ${new Date(cardData.last_price_updt || Date.now()).toLocaleString()}</small>
                <small>Confidence: ${(confidence * 100).toFixed(0)}%</small>
            </div>
        `;
    }
    
    /**
     * Add confidence indicator to result element
     */
    addConfidenceIndicator(element, confidence) {
        const indicator = document.createElement('div');
        indicator.className = 'confidence-indicator';
        
        const confidenceLevel = confidence >= 0.8 ? 'high' : confidence >= 0.5 ? 'medium' : 'low';
        indicator.className += ` confidence-${confidenceLevel}`;
        indicator.style.width = `${Math.max(10, confidence * 100)}%`;
        
        element.appendChild(indicator);
    }
    
    /**
     * Add card image to result element
     */
    addCardImage(element, imageUrl, cardName) {
        const imageContainer = document.createElement('div');
        imageContainer.className = 'card-image-container';
        
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = cardName || 'Card image';
        img.className = 'card-image';
        img.loading = 'lazy';
        
        // Add error handling
        img.onerror = () => {
            imageContainer.style.display = 'none';
        };
        
        imageContainer.appendChild(img);
        element.appendChild(imageContainer);
    }
    
    /**
     * Create fallback result element for errors
     */
    createFallbackResultElement(results) {
        const div = document.createElement('div');
        div.className = 'price-result-item error';
        div.innerHTML = `
            <div class="error-message">
                <p>Error displaying price result</p>
                <small>Please try again</small>
            </div>
        `;
        return div;
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
     * Check price for a card with enhanced validation and error handling
     */
    async checkPrice(cardData, options = {}) {
        const startTime = performance.now();
        
        try {
            this.logger.info('Checking price for card:', cardData);
            
            // Enhanced validation with detailed feedback
            const validationResult = this.validateCardData(cardData);
            if (!validationResult.isValid) {
                throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
            }
            
            // Log warnings if any
            if (validationResult.warnings.length > 0) {
                this.logger.warn('Validation warnings:', validationResult.warnings);
            }
            
            // Generate cache key
            const cacheKey = this.generateCacheKey(cardData);
            
            // Check cache first (unless force refresh)
            if (!cardData.forceRefresh && this.config.enableCache) {
                const cachedResult = this.getCachedPrice(cacheKey);
                if (cachedResult) {
                    this.logger.debug('Returning cached price result');
                    cachedResult.fromCache = true;
                    cachedResult.queryTime = performance.now() - startTime;
                    return cachedResult;
                }
            }
            
            // Show loading state if callback provided
            if (options.onProgress) {
                options.onProgress('Fetching card data...');
            }
            
            // Try to get enhanced card information from backend API
            let enhancedCardInfo = null;
            let apiError = null;
            
            try {
                enhancedCardInfo = await this.fetchEnhancedCardInfo(cardData);
                this.logger.info('Successfully fetched enhanced card info from backend API');
                
                if (options.onProgress) {
                    options.onProgress('Processing price data...');
                }
            } catch (error) {
                apiError = error;
                this.logger.error('Failed to fetch enhanced card info from backend API:', error.message);
                
                // Provide more detailed error information
                const enhancedError = new Error(`Backend API unavailable: ${error.message}`);
                enhancedError.details = `Please ensure the backend server is running on ${this.apiUrl}`;
                enhancedError.originalError = error;
                enhancedError.cardData = cardData;
                enhancedError.timestamp = new Date().toISOString();
                
                throw enhancedError;
            }
            
            // Process and aggregate results with enhanced card information
            const aggregatedResult = this.aggregateResults([], cardData, enhancedCardInfo);
            
            // Add performance metrics
            aggregatedResult.metadata.queryTime = performance.now() - startTime;
            aggregatedResult.metadata.validationScore = validationResult.score;
            aggregatedResult.metadata.cacheUsed = false;
            
            // Cache the result
            if (this.config.enableCache) {
                this.cachePrice(cacheKey, aggregatedResult);
            }
            
            // Update price history
            this.updatePriceHistory(cardData, aggregatedResult);
            
            this.logger.info(`Price check completed successfully in ${aggregatedResult.metadata.queryTime.toFixed(2)}ms`);
            return aggregatedResult;
            
        } catch (error) {
            const queryTime = performance.now() - startTime;
            this.logger.error(`Price check failed after ${queryTime.toFixed(2)}ms:`, error);
            
            // Return enhanced error result instead of throwing
            return {
                success: false,
                error: true,
                message: error.message,
                details: error.details || '',
                metadata: {
                    timestamp: new Date().toISOString(),
                    queryTime,
                    cardData,
                    originalError: error.name
                }
            };
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
     * Enhanced card data validation with detailed feedback
     */
    validateCardData(cardData) {
        // Handle the case where validation was already performed
        if (cardData._validation) {
            return cardData._validation;
        }
        
        if (!cardData) {
            return {
                isValid: false,
                errors: ['Card data is required'],
                warnings: [],
                score: 0
            };
        }
        
        const errors = [];
        const warnings = [];
        
        // Card number validation
        if (!cardData.cardNumber) {
            errors.push('Card number is required');
        } else if (!this.isValidCardNumber(cardData.cardNumber)) {
            warnings.push('Card number format may be incorrect');
        }
        
        // Rarity validation
        if (!cardData.rarity) {
            errors.push('Card rarity is required');
        }
        
        // Set defaults for optional fields
        cardData.condition = cardData.condition || this.config.defaultCondition;
        cardData.artVariant = cardData.artVariant || '';
        
        const result = {
            isValid: errors.length === 0,
            errors,
            warnings,
            score: this.calculateValidationScore(cardData, errors, warnings)
        };
        
        // If validation fails, throw error for backward compatibility
        if (!result.isValid) {
            throw new Error(result.errors.join(', '));
        }
        
        return result;
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
     * Get comprehensive cache and performance statistics
     */
    getCacheStats() {
        const now = Date.now();
        let validEntries = 0;
        let expiredEntries = 0;
        let totalCacheSize = 0;
        let oldestEntry = null;
        let newestEntry = null;
        
        for (const [key, cached] of this.cache) {
            const age = now - cached.timestamp;
            if (age <= this.cacheConfig.ttl) {
                validEntries++;
            } else {
                expiredEntries++;
            }
            
            // Calculate approximate cache size
            totalCacheSize += JSON.stringify(cached).length;
            
            // Track oldest and newest entries
            if (!oldestEntry || cached.timestamp < oldestEntry.timestamp) {
                oldestEntry = cached;
            }
            if (!newestEntry || cached.timestamp > newestEntry.timestamp) {
                newestEntry = cached;
            }
        }
        
        return {
            totalEntries: this.cache.size,
            validEntries,
            expiredEntries,
            maxSize: this.cacheConfig.maxSize,
            ttl: this.cacheConfig.ttl,
            approximateSize: totalCacheSize,
            cacheHitRate: this.calculateCacheHitRate(),
            oldestEntry: oldestEntry?.timestamp,
            newestEntry: newestEntry?.timestamp,
            memoryEfficiency: this.calculateMemoryEfficiency()
        };
    }
    
    /**
     * Calculate cache hit rate
     */
    calculateCacheHitRate() {
        // Simple implementation - in production, you'd track hits/misses
        return this.cache.size > 0 ? 0.75 : 0; // Placeholder
    }
    
    /**
     * Calculate memory efficiency
     */
    calculateMemoryEfficiency() {
        const stats = this.getCacheStats();
        if (stats.totalEntries === 0) return 100;
        
        return (stats.validEntries / stats.totalEntries) * 100;
    }

    /**
     * Update configuration with validation
     */
    updateConfig(newConfig) {
        if (!newConfig || typeof newConfig !== 'object') {
            this.logger.warn('Invalid configuration provided');
            return;
        }
        
        const oldConfig = { ...this.config };
        this.config = { ...this.config, ...newConfig };
        
        // Validate critical settings
        if (this.config.timeout < 1000) {
            this.logger.warn('Timeout too low, setting to minimum 1000ms');
            this.config.timeout = 1000;
        }
        
        if (this.config.retryAttempts < 0 || this.config.retryAttempts > 10) {
            this.logger.warn('Invalid retry attempts, resetting to 3');
            this.config.retryAttempts = 3;
        }
        
        // Log configuration changes
        const changedKeys = Object.keys(newConfig).filter(key => oldConfig[key] !== this.config[key]);
        if (changedKeys.length > 0) {
            this.logger.info('Price checker configuration updated:', changedKeys);
        }
        
        // Apply cache configuration changes
        if (newConfig.enableCache === false && this.cache.size > 0) {
            this.logger.info('Cache disabled, clearing existing entries');
            this.clearCache();
        }
    }

    /**
     * Advanced form workflow: Process multiple cards in batch
     */
    async processBatchPriceCheck(cardDataArray, options = {}) {
        const results = [];
        const errors = [];
        const startTime = performance.now();
        
        this.logger.info(`Processing batch price check for ${cardDataArray.length} cards`);
        
        // Process in chunks to avoid overwhelming the API
        const chunkSize = options.chunkSize || 3;
        const chunks = [];
        for (let i = 0; i < cardDataArray.length; i += chunkSize) {
            chunks.push(cardDataArray.slice(i, i + chunkSize));
        }
        
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            
            if (options.onProgress) {
                options.onProgress(`Processing batch ${i + 1}/${chunks.length}`);
            }
            
            // Process chunk in parallel
            const chunkPromises = chunk.map(async (cardData, index) => {
                try {
                    const result = await this.checkPrice(cardData);
                    return { success: true, index: i * chunkSize + index, data: result };
                } catch (error) {
                    this.logger.error(`Batch item ${i * chunkSize + index} failed:`, error);
                    return { success: false, index: i * chunkSize + index, error: error.message };
                }
            });
            
            const chunkResults = await Promise.allSettled(chunkPromises);
            
            chunkResults.forEach(result => {
                if (result.status === 'fulfilled') {
                    if (result.value.success) {
                        results.push(result.value);
                    } else {
                        errors.push(result.value);
                    }
                } else {
                    errors.push({ success: false, error: result.reason?.message || 'Unknown error' });
                }
            });
            
            // Add delay between chunks to be respectful to APIs
            if (i < chunks.length - 1 && options.delayBetweenChunks) {
                await new Promise(resolve => setTimeout(resolve, options.delayBetweenChunks));
            }
        }
        
        const totalTime = performance.now() - startTime;
        
        return {
            success: true,
            totalProcessed: cardDataArray.length,
            successCount: results.length,
            errorCount: errors.length,
            results,
            errors,
            processingTime: totalTime,
            averageTimePerCard: totalTime / cardDataArray.length
        };
    }
    
    /**
     * Advanced form workflow: Export price check results
     */
    exportResults(results, format = 'json') {
        try {
            let exportData;
            let mimeType;
            let filename;
            
            const timestamp = new Date().toISOString().slice(0, 10);
            
            switch (format.toLowerCase()) {
                case 'json':
                    exportData = JSON.stringify(results, null, 2);
                    mimeType = 'application/json';
                    filename = `price-check-results-${timestamp}.json`;
                    break;
                    
                case 'csv':
                    exportData = this.convertResultsToCSV(results);
                    mimeType = 'text/csv';
                    filename = `price-check-results-${timestamp}.csv`;
                    break;
                    
                default:
                    throw new Error(`Unsupported export format: ${format}`);
            }
            
            // Create and trigger download
            const blob = new Blob([exportData], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.logger.info(`Results exported as ${format.toUpperCase()}`);
            return true;
        } catch (error) {
            this.logger.error('Failed to export results:', error);
            throw error;
        }
    }
    
    /**
     * Convert results to CSV format
     */
    convertResultsToCSV(results) {
        if (!Array.isArray(results) || results.length === 0) {
            return 'No data to export';
        }
        
        const headers = [
            'Card Name',
            'Card Number', 
            'Rarity',
            'TCG Price',
            'Market Price',
            'Average Price',
            'Confidence',
            'Last Updated'
        ];
        
        const rows = results.map(result => {
            const data = result.data || result;
            const aggregated = data.aggregated || {};
            
            return [
                data.card_name || '',
                data.card_number || '',
                data.card_rarity || '',
                data.tcg_price || 0,
                data.tcg_market_price || 0,
                aggregated.averagePrice || 0,
                (aggregated.confidence || 0) * 100,
                data.last_price_updt || ''
            ];
        });
        
        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');
            
        return csvContent;
    }
    
    /**
     * Check rate limit for a source (enhanced implementation)
     */
    checkRateLimit(sourceId, limit = 60) {
        const now = Date.now();
        const windowStart = now - 60000; // 1 minute window
        
        if (!this.rateLimitTracker) {
            this.rateLimitTracker = new Map();
        }
        
        const sourceRequests = this.rateLimitTracker.get(sourceId) || [];
        
        // Remove old requests outside the window
        const recentRequests = sourceRequests.filter(timestamp => timestamp > windowStart);
        
        // Update tracker
        this.rateLimitTracker.set(sourceId, recentRequests);
        
        // Check if under limit
        return recentRequests.length < limit;
    }
    
    /**
     * Record API request for rate limiting
     */
    recordAPIRequest(sourceId) {
        if (!this.rateLimitTracker) {
            this.rateLimitTracker = new Map();
        }
        
        const sourceRequests = this.rateLimitTracker.get(sourceId) || [];
        sourceRequests.push(Date.now());
        this.rateLimitTracker.set(sourceId, sourceRequests);
    }

    /**
     * Get comprehensive price source status
     */
    getSourceStatus() {
        const now = Date.now();
        
        return {
            backend_api: {
                name: 'Backend API',
                enabled: true,
                priority: 10,
                requestCount: this.getRequestCount('backend_api'),
                rateLimit: 120, // 2 requests per second
                isRateLimited: !this.checkRateLimit('backend_api', 120),
                resetTime: new Date(now + 60000).toISOString(),
                url: this.apiUrl,
                lastResponse: this.getLastResponseTime('backend_api')
            }
        };
    }
    
    /**
     * Get request count for source
     */
    getRequestCount(sourceId) {
        if (!this.rateLimitTracker) return 0;
        const sourceRequests = this.rateLimitTracker.get(sourceId) || [];
        const oneHourAgo = Date.now() - 3600000;
        return sourceRequests.filter(timestamp => timestamp > oneHourAgo).length;
    }
    
    /**
     * Get last response time for source
     */
    getLastResponseTime(sourceId) {
        if (!this.lastResponseTimes) {
            this.lastResponseTimes = new Map();
        }
        return this.lastResponseTimes.get(sourceId) || null;
    }
    
    /**
     * Record response time for source
     */
    recordResponseTime(sourceId, responseTime) {
        if (!this.lastResponseTimes) {
            this.lastResponseTimes = new Map();
        }
        this.lastResponseTimes.set(sourceId, responseTime);
    }

    /**
     * Enable/disable price source with validation
     */
    toggleSource(sourceId, enabled) {
        if (!sourceId) {
            this.logger.warn('Source ID required for toggle operation');
            return false;
        }
        
        // Validate source exists
        const sources = this.getSourceStatus();
        if (!sources[sourceId]) {
            this.logger.warn(`Unknown source ID: ${sourceId}`);
            return false;
        }
        
        // For now, just log the action (could be extended to actually disable sources)
        this.logger.info(`Price source ${sourceId} ${enabled ? 'enabled' : 'disabled'}`);
        
        // Emit event for UI updates
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('priceSourceToggled', {
                detail: { sourceId, enabled }
            }));
        }
        
        return true;
    }
    
    /**
     * Get comprehensive system health check
     */
    async getHealthCheck() {
        const startTime = performance.now();
        
        try {
            // Test API connectivity
            const apiTest = await this.testAPIConnectivity();
            
            // Get cache status
            const cacheStats = this.getCacheStats();
            
            // Get source status
            const sourceStatus = this.getSourceStatus();
            
            const healthCheck = {
                timestamp: new Date().toISOString(),
                status: 'healthy',
                responseTime: performance.now() - startTime,
                api: apiTest,
                cache: cacheStats,
                sources: sourceStatus,
                config: {
                    timeout: this.config.timeout,
                    retryAttempts: this.config.retryAttempts,
                    cacheEnabled: this.config.enableCache
                }
            };
            
            // Determine overall health
            if (!apiTest.available) {
                healthCheck.status = 'degraded';
            }
            
            return healthCheck;
        } catch (error) {
            return {
                timestamp: new Date().toISOString(),
                status: 'unhealthy',
                error: error.message,
                responseTime: performance.now() - startTime
            };
        }
    }
    
    /**
     * Test API connectivity
     */
    async testAPIConnectivity() {
        try {
            const response = await fetch(`${this.apiUrl}/health`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000)
            });
            
            return {
                available: response.ok,
                status: response.status,
                responseTime: response.headers.get('x-response-time') || 'unknown'
            };
        } catch (error) {
            return {
                available: false,
                error: error.message,
                responseTime: null
            };
        }
    }
}