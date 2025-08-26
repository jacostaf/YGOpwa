/**
 * Enhanced Session Manager with Advanced Data Workflows
 * 
 * Phase 3 Implementation: Complete System Integration & Production Validation
 * - Advanced session management with theme-aware data workflows
 * - Card import/export functionality in both themes
 * - Session persistence during theme switches
 * - Bulk operations and batch processing
 * - Comprehensive session statistics and analytics
 * - Cross-platform session recovery
 */

import { Logger } from '../utils/Logger.js';
import { config } from '../utils/config.js';
import { MemoryManagedComponent, globalMemoryManager } from '../utils/MemoryManager.js';

export class SessionManager extends MemoryManagedComponent {
    constructor(storage = null, logger = null) {
        super('SessionManager', {
            maxEventListeners: 30,
            maxTimers: 10,
            maxCacheSize: 500,
            memoryBudgetMB: 20
        });
        
        this.storage = storage;
        this.logger = logger || new Logger('SessionManager');
        this.voiceEngine = null; // Will be set by app.js after VoiceEngine initialization
        
        // API Configuration (matching ygo_ripper.py)
        this.apiUrl = this.getApiUrl();
        
        // Settings (will be updated from app)
        this.settings = {
            autoExtractRarity: false,
            autoExtractArtVariant: false
        };
        
        // Session state
        this.currentSession = null;
        this.sessionActive = false;
        this.sessionHistory = [];
        
        // Card sets data
        this.cardSets = [];
        this.filteredCardSets = [];
        this.currentSet = null;
        this.setCards = new Map(); // Cache for set-specific card data
        this.searchTerm = '';
        this.usingMockData = false; // Deprecated - mock data support has been removed
        
        // Pricing data loading tracking
        this.loadingPriceData = new Set(); // Track cards with pending price requests
        
        // Event listeners (now memory-managed)
        this.listeners = {
            sessionStart: [],
            sessionStop: [],
            sessionUpdate: [],
            cardAdded: [],
            cardRemoved: [],
            sessionClear: [],
            setsLoaded: [],
            setsFiltered: [],
            setSwitched: []
        };
        
        // Track caches for cleanup
        this.addTrackedCache('setCards', this.setCards, 100);
        this.addTrackedCache('commonCardNames', this.commonCardNames, 200);
        
        // Configuration
        this.config = {
            autoSave: true,
            autoSaveInterval: 30000, // 30 seconds
            maxSessionHistory: 50,
            cardMatchThreshold: 0.35,
            enableFuzzyMatching: true,
            apiTimeout: 10000 // 10 second timeout for API calls
        };
        
        // Auto-save timer (will be tracked for cleanup)
        this.autoSaveTimer = null;
        
        // Session data arrays (implement size limits)
        this.sessionHistoryLimit = 50;
        this.loadingPriceDataLimit = 100;
        
        // Common card names cache for optimization
        this.commonCardNames = new Map();
        
        // Session metrics tracking
        this.sessionMetrics = {
            startTime: null,
            totalOperations: 0,
            exportCount: 0,
            importCount: 0,
            cardsAdded: 0,
            cardsRemoved: 0,
            themeSwitches: 0,
            voiceCommands: 0,
            averageConfidence: 0
        };
        
        // Register with global memory manager
        globalMemoryManager.registerComponent(this);
        
        // Add cleanup callbacks
        this.addDestructionCallback(() => this.cleanupSessionResources(), 'Session resources cleanup');
        
        // Initialize advanced session management
        this.initializeAdvancedFeatures();
        
        this.logger.info('Enhanced SessionManager initialized with advanced data workflows');
    }

    /**
     * Integration with migration system - set after initialization
     * @param {SelectorMapper} selectorMapper - The SelectorMapper instance
     */
    setSelectorMapper(selectorMapper) {
        this.selectorMapper = selectorMapper;
        this.logger.info('SessionManager integrated with SelectorMapper');
    }

    /**
     * Theme-aware element access
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
     * Theme-aware multiple elements access
     * @param {string} selectorKey - The key from SelectorMapper
     * @returns {NodeList} The DOM elements
     */
    getElements(selectorKey) {
        if (this.selectorMapper) {
            return this.selectorMapper.getElements(selectorKey);
        }
        
        // Fallback for backward compatibility
        return document.querySelectorAll(':not(*)'); // Empty NodeList
    }

    /**
     * Refresh session display after theme change
     */
    async refreshSessionDisplay() {
        try {
            this.logger.info('Refreshing session display for current theme');
            
            // Update session statistics display
            this.updateSessionStatsDisplay();
            
            // Refresh session cards list
            if (this.currentSession) {
                this.updateSessionCardsDisplay();
            }
            
            this.logger.debug('Session display refreshed');
        } catch (error) {
            this.logger.error('Error refreshing session display:', error);
        }
    }

    /**
     * Update session statistics display in current theme
     */
    updateSessionStatsDisplay() {
        try {
            if (!this.currentSession) return;

            // Get session stats elements using theme-aware access
            const sessionStats = this.getElement('sessionStats');
            const totalCardsElement = this.getElement('spaceTotalCards') || document.getElementById('space-total-cards');
            const currentSetElement = this.getElement('spaceCurrentSet') || document.getElementById('space-current-set');
            const tcgLowTotalElement = this.getElement('spaceTcgLowTotal') || document.getElementById('space-tcg-low-total');
            const tcgMarketTotalElement = this.getElement('spaceTcgMarketTotal') || document.getElementById('space-tcg-market-total');
            const sessionStatusElement = this.getElement('spaceSessionStatus') || document.getElementById('space-session-status');

            // Update elements if they exist
            if (totalCardsElement) {
                totalCardsElement.textContent = this.currentSession.totalCards || '0';
            }
            
            if (currentSetElement) {
                currentSetElement.textContent = this.currentSession.setName || 'No Set Selected';
            }
            
            if (tcgLowTotalElement) {
                const tcgLowTotal = this.calculateTotalValue('tcg_low');
                tcgLowTotalElement.textContent = `$${tcgLowTotal.toFixed(2)}`;
            }
            
            if (tcgMarketTotalElement) {
                const tcgMarketTotal = this.calculateTotalValue('tcg_market');
                tcgMarketTotalElement.textContent = `$${tcgMarketTotal.toFixed(2)}`;
            }
            
            if (sessionStatusElement) {
                sessionStatusElement.textContent = this.sessionActive ? 'Active' : 'Inactive';
                sessionStatusElement.className = this.sessionActive ? 'status-active' : 'status-inactive';
            }

            this.logger.debug('Session stats display updated');
        } catch (error) {
            this.logger.warn('Error updating session stats display:', error);
        }
    }

    /**
     * Update session cards display in current theme
     */
    updateSessionCardsDisplay() {
        try {
            const sessionCards = this.getElement('sessionCards');
            if (!sessionCards) {
                this.logger.debug('No session cards container found in current theme');
                return;
            }

            // Clear existing cards
            sessionCards.innerHTML = '';

            // Add cards to display
            if (this.currentSession && this.currentSession.cards) {
                this.currentSession.cards.forEach(card => {
                    const cardElement = this.createSessionCardElement(card);
                    if (cardElement) {
                        sessionCards.appendChild(cardElement);
                    }
                });
            }

            this.logger.debug('Session cards display updated');
        } catch (error) {
            this.logger.warn('Error updating session cards display:', error);
        }
    }

    /**
     * Create session card element for current theme
     */
    createSessionCardElement(card) {
        try {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'session-card card-item'; // Support both legacy and space classes
            cardDiv.dataset.cardId = card.id || card.card_number;

            cardDiv.innerHTML = `
                <div class="card-info">
                    <h4 class="card-name">${card.card_name || 'Unknown Card'}</h4>
                    <p class="card-details">
                        <span class="card-number">${card.card_number || 'N/A'}</span> - 
                        <span class="card-rarity">${card.card_rarity || 'N/A'}</span>
                    </p>
                    <div class="card-pricing">
                        <span class="tcg-low">TCG Low: $${(card.tcg_low || 0).toFixed(2)}</span>
                        <span class="tcg-market">Market: $${(card.tcg_market || 0).toFixed(2)}</span>
                    </div>
                </div>
                <div class="card-actions">
                    <input type="number" class="card-quantity" value="${card.quantity || 1}" min="1">
                    <button class="remove-card-btn" data-card-id="${card.id || card.card_number}">Remove</button>
                </div>
            `;

            // Add event listeners for quantity and remove buttons
            this.attachSessionCardEventListeners(cardDiv, card);

            return cardDiv;
        } catch (error) {
            this.logger.warn('Error creating session card element:', error);
            return null;
        }
    }

    /**
     * Attach event listeners to session card elements
     */
    attachSessionCardEventListeners(cardElement, card) {
        try {
            const quantityInput = cardElement.querySelector('.card-quantity');
            const removeBtn = cardElement.querySelector('.remove-card-btn');

            if (quantityInput) {
                quantityInput.addEventListener('change', (e) => {
                    this.updateCardQuantity(card.id || card.card_number, parseInt(e.target.value) || 1);
                });
            }

            if (removeBtn) {
                removeBtn.addEventListener('click', () => {
                    this.removeCard(card.id || card.card_number);
                });
            }
        } catch (error) {
            this.logger.warn('Error attaching session card event listeners:', error);
        }
    }

    /**
     * Calculate total value for a pricing field
     */
    calculateTotalValue(priceField) {
        if (!this.currentSession || !this.currentSession.cards) {
            return 0;
        }

        return this.currentSession.cards.reduce((total, card) => {
            const price = parseFloat(card[priceField]) || 0;
            const quantity = parseInt(card.quantity) || 1;
            return total + (price * quantity);
        }, 0);
    }

    /**
     * Update card quantity in current session
     */
    updateCardQuantity(cardId, newQuantity) {
        try {
            if (!this.currentSession || !this.currentSession.cards) return;

            const card = this.currentSession.cards.find(c => (c.id || c.card_number) === cardId);
            if (card) {
                card.quantity = Math.max(1, newQuantity);
                this.updateSessionStatsDisplay();
                this.saveSession();
                this.logger.debug(`Updated card quantity: ${cardId} = ${newQuantity}`);
            }
        } catch (error) {
            this.logger.warn('Error updating card quantity:', error);
        }
    }

    /**
     * Remove card from current session
     */
    removeCard(cardId) {
        try {
            if (!this.currentSession || !this.currentSession.cards) return;

            const cardIndex = this.currentSession.cards.findIndex(c => (c.id || c.card_number) === cardId);
            if (cardIndex !== -1) {
                this.currentSession.cards.splice(cardIndex, 1);
                this.updateSessionCardsDisplay();
                this.updateSessionStatsDisplay();
                this.saveSession();
                this.logger.debug(`Removed card: ${cardId}`);
            }
        } catch (error) {
            this.logger.warn('Error removing card:', error);
        }
    }

    /**
     * Update settings from the app
     */
    updateSettings(settings) {
        this.settings = {
            ...this.settings,
            ...settings
        };
        this.logger.debug('SessionManager settings updated:', this.settings);
    }

    /**
     * Get API URL (matching realBackendAPI.py backend)
     * Backend runs on port 8081 as configured in realBackendAPI.py
     */
    getApiUrl() {
        // realBackendAPI.py backend runs on port 8081
        // Based on the realBackendAPI.py backend API
        return config.API_URL || 'http://127.0.0.1:8081';

    }

    /**
     * Initialize the session manager
     */
    async initialize(storage) {
        this.logger.info('Initializing session manager...');
        
        if (storage) {
            this.storage = storage;
        }
        
        try {
            // Load card sets
            await this.loadCardSets();
            
            // Load last session if available
            await this.loadLastSession();
            
            this.logger.info('Session manager initialized successfully');
            return true;
        } catch (error) {
            this.logger.error('Failed to initialize session manager:', error);
            throw error;
        }
    }

    /**
     * Set VoiceEngine reference for learning boost functionality
     */
    setVoiceEngine(voiceEngine) {
        this.voiceEngine = voiceEngine;
        this.logger.debug('VoiceEngine reference set for learning boost functionality');
    }

    /**
     * Load available card sets (matching ygo_ripper.py functionality)
     * This method handles both full set loading and search functionality
     */
    async loadCardSets(searchTerm = '') {
        try {
            this.logger.info(`Loading card sets${searchTerm ? ` with search term: "${searchTerm}"` : ' (all sets)'}...`);
            
            // Update search term
            this.searchTerm = searchTerm.trim();
            
            // For search terms, always call API directly
            // For full set list, try cache first, then API
            let sets = null;
            
            if (this.searchTerm) {
                // Always fetch search results from API
                sets = await this.fetchCardSets(this.searchTerm);
            } else {
                // Try to load full set list from storage first (for performance)
                const cachedSets = await this.storage?.get('cardSets');
                const cacheTimestamp = await this.storage?.get('cardSetsTimestamp');
                const now = Date.now();
                const cacheMaxAge = 24 * 60 * 60 * 1000; // 24 hours
                
                // Use cache if it exists and is recent
                if (cachedSets && 
                    Array.isArray(cachedSets) && 
                    cachedSets.length > 100 && // Should have many sets
                    cacheTimestamp && 
                    (now - cacheTimestamp) < cacheMaxAge) {
                    
                    this.logger.info(`Using cached card sets (${cachedSets.length} sets, cached ${Math.round((now - cacheTimestamp) / (60 * 1000))} minutes ago)`);
                    sets = cachedSets;
                } else {
                    // Fetch fresh data from API
                    this.logger.info('Fetching fresh card sets from API...');
                    sets = await this.fetchCardSets();
                    
                    // Cache the fresh data
                    if (this.storage && sets.length > 0) {
                        try {
                            await this.storage.set('cardSets', sets);
                            await this.storage.set('cardSetsTimestamp', now);
                            this.logger.info(`Cached ${sets.length} card sets for future use`);
                        } catch (cacheError) {
                            this.logger.warn('Failed to cache card sets:', cacheError);
                        }
                    }
                }
            }
            
            // Store the results
            this.cardSets = this.searchTerm ? this.cardSets : sets; // Keep full list for filtering
            this.filteredCardSets = sets;
            
            const setCount = sets.length;
            const totalCount = this.cardSets.length || setCount;
            
            this.logger.info(`Loaded ${setCount} card sets${this.searchTerm ? ` matching "${this.searchTerm}"` : ''} (total available: ${totalCount})`);
            
            // Validate set count for full loads
            if (!this.searchTerm && setCount < 500) {
                this.logger.warn(`Expected 990+ card sets but only loaded ${setCount}. Check backend API health.`);
            }
            
            // Notify listeners with comprehensive data
            this.emit('setsLoaded', { 
                sets, 
                searchTerm: this.searchTerm,
                totalSets: totalCount,
                filtered: !!this.searchTerm
            });
            
            return sets;
            
        } catch (error) {
            this.logger.error('Failed to load card sets:', error);
            
            // Enhanced error handling with user-friendly messages
            let errorMessage = 'Failed to load card sets';
            
            if (error.message.includes('backend') || error.message.includes('connect')) {
                errorMessage = 'Cannot connect to backend API. Please ensure realBackendAPI.py backend is running on port 8081.';
            } else if (error.message.includes('timeout')) {
                errorMessage = 'Request timed out. Please check your backend connection.';
            } else {
                errorMessage = `Failed to load card sets: ${error.message}`;
            }
            
            // No fallback - API must be working for the app to function
            this.cardSets = [];
            this.filteredCardSets = [];
            
            // Notify listeners of the error
            this.emit('setsLoaded', { 
                sets: [], 
                searchTerm: this.searchTerm,
                error: errorMessage,
                totalSets: 0
            });
            
            // Rethrow the error with enhanced message
            throw new Error(errorMessage);
        }
    }

    /**
     * Fetch card sets from API (matching ygo_ripper.py endpoints exactly)
     */
    async fetchCardSets(searchTerm = '') {
        try {
            let url;
            
            if (searchTerm) {
                // Use search endpoint with search term (matching ygo_ripper.py)
                // Backend expects: /card-sets/search/<set_name> 
                url = `${this.apiUrl}/card-sets/search/${encodeURIComponent(searchTerm)}`;
            } else {
                // Use cache endpoint to get all sets (matching ygo_ripper.py)
                // Backend endpoint: /card-sets/from-cache
                url = `${this.apiUrl}/card-sets/from-cache`;
            }
            
            this.logger.info(`[API DEBUG] Attempting to fetch card sets from: ${url}`);
            this.logger.info(`[API DEBUG] API URL configured as: ${this.apiUrl}`);
            this.logger.info(`[API DEBUG] Search term: ${searchTerm || 'none (fetching all sets)'}`);
            
            // Create AbortController for timeout handling
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.apiTimeout);
            
            this.logger.info(`[API DEBUG] Making fetch request with timeout: ${this.config.apiTimeout}ms`);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            this.logger.info(`[API DEBUG] Received response with status: ${response.status} (${response.statusText})`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Enhanced logging for debugging
            this.logger.info(`API Response Status: ${response.status}`);
            this.logger.info(`API Response Data:`, {
                success: data.success,
                dataType: typeof data.data,
                dataLength: Array.isArray(data.data) ? data.data.length : 'not array',
                hasMessage: !!data.message
            });
            
            // Backend returns { success: true, data: [...] } format
            if (data.success) {
                const sets = data.data || [];
                
                if (!Array.isArray(sets)) {
                    this.logger.warn('API returned non-array data:', sets);
                    return [];
                }
                
                // Log first few sets for debugging
                if (sets.length > 0) {
                    this.logger.info(`Sample set data:`, sets.slice(0, 3));
                }
                
                // Transform the data to match our expected format
                // Backend provides: set_name, set_code, and other fields
                const transformedSets = sets.map(set => {
                    // Handle various possible field names from the backend
                    const setName = set.set_name || set.name || set.setName || 'Unknown Set';
                    const setCode = set.set_code || set.code || set.setCode || set.id || 'UNK';
                    
                    return {
                        id: setCode, // Use set code as ID for consistency
                        name: setName,
                        code: setCode,
                        set_name: setName, // Keep original field for API compatibility
                        set_code: setCode, // Keep original field for API compatibility
                        // Preserve all original fields from backend
                        ...set
                    };
                });
                
                this.logger.info(`Successfully transformed ${transformedSets.length} card sets`);
                
                // Validate we got a reasonable number of sets (should be 990+)
                if (!searchTerm && transformedSets.length < 100) {
                    this.logger.warn(`Expected 990+ sets but only got ${transformedSets.length}. This might indicate an API issue.`);
                }
                
                return transformedSets;
            } else {
                const errorMsg = data.message || 'API returned success: false';
                this.logger.error('API returned failure:', errorMsg);
                throw new Error(errorMsg);
            }
            
        } catch (error) {
            if (error.name === 'AbortError') {
                this.logger.error('[API DEBUG] Request timed out after', this.config.apiTimeout, 'ms');
            } else {
                this.logger.error('[API DEBUG] Failed to fetch card sets from API:', error);
                this.logger.error('[API DEBUG] Error details:', {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                });
            }
            
            // Throw error instead of using mock data
            this.logger.error('Failed to fetch card sets from API');
            this.usingMockData = false;
            
            // Provide user-friendly error message
            const errorMessage = error.name === 'AbortError' 
                ? 'Request timed out. Please check your internet connection and try again.'
                : 'Unable to fetch card sets. Please try again later.';
            
            throw new Error(errorMessage);
        }
    }

    /**
     * Check if the app is currently using mock data (should always be false now)
     * @deprecated Mock data has been removed - only real API data is supported
     */
    isUsingMockData() {
        return false; // Always return false as we no longer support mock data
    }

    /**
     * Filter card sets based on search term (client-side filtering)
     * This is used for real-time filtering as the user types
     */
    filterCardSets(searchTerm) {
        if (!searchTerm || searchTerm.trim() === '') {
            this.filteredCardSets = this.cardSets;
            this.searchTerm = '';
        } else {
            this.searchTerm = searchTerm.trim().toLowerCase();
            
            // Perform comprehensive client-side filtering
            this.filteredCardSets = this.cardSets.filter(set => {
                const name = (set.name || '').toLowerCase();
                const code = (set.code || '').toLowerCase();
                const setName = (set.set_name || '').toLowerCase();
                const setCode = (set.set_code || '').toLowerCase();
                
                // Check multiple fields for matches
                return name.includes(this.searchTerm) || 
                       code.includes(this.searchTerm) || 
                       setName.includes(this.searchTerm) ||
                       setCode.includes(this.searchTerm) ||
                       // Also check if search term starts with any of these (for partial matches)
                       name.startsWith(this.searchTerm) ||
                       code.startsWith(this.searchTerm) ||
                       setName.startsWith(this.searchTerm) ||
                       setCode.startsWith(this.searchTerm);
            });
        }
        
        this.logger.info(`Client-side filtered to ${this.filteredCardSets.length} sets matching "${this.searchTerm}" (from ${this.cardSets.length} total)`);
        
        this.emit('setsFiltered', { 
            sets: this.filteredCardSets, 
            searchTerm: this.searchTerm,
            totalSets: this.cardSets.length,
            filteredCount: this.filteredCardSets.length
        });
        
        return this.filteredCardSets;
    }

    /**
     * Fetch enhanced card information for session cards (reusing PriceChecker logic)
     */
    async fetchEnhancedCardInfo(cardData) {
        try {
            // Convert card data to the format expected by the backend
            const requestPayload = {
                card_number: cardData.card_number || cardData.ext_number || '',
                card_name: cardData.name || cardData.card_name || '',
                card_rarity: cardData.displayRarity || cardData.rarity || cardData.card_rarity || '',
                art_variant: cardData.artVariant || cardData.card_art_variant || '',
                force_refresh: false
            };
            
            this.logger.debug('Fetching enhanced card info for session card:', requestPayload);
            
            const response = await fetch(`${this.apiUrl}/cards/price`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestPayload),
                signal: AbortSignal.timeout(this.config.apiTimeout)
            });
            
            if (!response.ok) {
                throw new Error(`Backend API error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Backend API returned failure');
            }
            
            // TCGcsv backend returns price data directly in response, not wrapped in data property
            return data; // Return the entire response which contains the price data
            
        } catch (error) {
            this.logger.error('Backend API not available for session card enhancement:', error.message);
            
            // Throw error instead of using mock data - the app requires the backend API
            throw new Error(`Backend API unavailable for card enhancement: ${error.message}. Please ensure the backend server is running on ${this.apiUrl}`);
        }
    }

    /**
     * Load cards for a specific set (matching ygo_ripper.py functionality)
     * Backend endpoint: /card-sets/{set_name}/cards
     */
    async loadSetCards(setIdentifier) {
        try {
            this.logger.info(`Loading cards for set: ${setIdentifier}`);
            
            // Check cache first
            if (this.setCards.has(setIdentifier)) {
                this.logger.info(`Using cached cards for set: ${setIdentifier}`);
                return this.setCards.get(setIdentifier);
            }
            
            // Ensure we have real API data, not mock data
            if (this.usingMockData) {
                throw new Error('Cannot load set cards: API connection required. Please check your internet connection.');
            }
            
            // The backend expects the set_name, not set_code
            // We need to find the actual set_name from our loaded sets
            let setName = setIdentifier;
            
            // Try to find the set in our loaded sets to get the proper set_name
            const foundSet = this.cardSets.find(set => 
                set.id === setIdentifier || 
                set.code === setIdentifier || 
                set.set_code === setIdentifier ||
                set.name === setIdentifier ||
                set.set_name === setIdentifier
            );
            
            if (foundSet) {
                // Use set_name as that's what the backend expects
                setName = foundSet.set_name || foundSet.name;
                this.logger.info(`Found set in loaded sets: "${setIdentifier}" -> "${setName}"`);
            } else {
                this.logger.warn(`Set "${setIdentifier}" not found in loaded sets, using as-is`);
            }
            
            // Fetch from API (matching ygo_ripper.py endpoint)
            // Backend endpoint: /card-sets/{set_name}/cards
            const url = `${this.apiUrl}/card-sets/${encodeURIComponent(setName)}/cards`;
            
            this.logger.info(`Fetching cards from: ${url}`);
            
            // Create AbortController for timeout handling
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.apiTimeout);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            this.logger.info(`Set cards API response:`, {
                success: data.success,
                dataType: typeof data.data,
                dataLength: Array.isArray(data.data) ? data.data.length : 'not array',
                hasMessage: !!data.message
            });
            
            if (data.success) {
                // Handle both direct array and wrapped object response
                let cards = data.data || [];
                
                // If data.data is an object with a cards property, extract it
                if (data.data && typeof data.data === 'object' && !Array.isArray(data.data) && data.data.cards) {
                    cards = data.data.cards;
                    this.logger.debug('Extracted cards array from wrapped response');
                }
                
                if (!Array.isArray(cards)) {
                    this.logger.warn('API returned non-array card data:', cards);
                    return [];
                }
                
                // Log sample cards for debugging
                if (cards.length > 0) {
                    this.logger.info(`Sample card data:`, cards.slice(0, 2));
                }
                
                // Cache the cards using the original identifier
                this.setCards.set(setIdentifier, cards);
                
                this.logger.info(`Loaded ${cards.length} cards for set: ${setName}`);
                return cards;
            } else {
                const errorMsg = data.message || 'Failed to load set cards';
                this.logger.error('Set cards API returned failure:', errorMsg);
                throw new Error(errorMsg);
            }
            
        } catch (error) {
            if (error.name === 'AbortError') {
                this.logger.error('Set cards request timed out after', this.config.apiTimeout, 'ms');
                throw new Error(`Request timed out loading cards for set ${setIdentifier}. Please check if the backend is running on`);
            } else {
                this.logger.error(`Failed to load cards for set ${setIdentifier}:`, error);
                throw error;
            }
        }
    }



    /**
     * Switch to a different card set while keeping the current session active
     * @param {string} newSetId - The ID of the new set to switch to
     * @returns {Promise<Object>} The updated session object
     */
    async switchSet(newSetId) {
        if (!this.sessionActive || !this.currentSession) {
            throw new Error('No active session to switch sets');
        }

        try {
            this.logger.info(`Switching to set: ${newSetId}`);
            
            // Find the new set
            const newSet = this.cardSets.find(s => s.id === newSetId || s.code === newSetId);
            if (!newSet) {
                throw new Error(`Card set not found: ${newSetId}`);
            }

            // Don't do anything if switching to the same set
            if (this.currentSession.setId === newSet.id) {
                this.logger.info('Already using the requested set, no change needed');
                return this.currentSession;
            }

            // Store the current session state
            const currentCards = [...(this.currentSession.cards || [])];
            const currentStats = { ...(this.currentSession.statistics || {}) };
            
            // Update the current set and session properties
            const oldSetId = this.currentSession.setId;
            this.currentSet = newSet;
            this.currentSession.setId = newSet.id;
            this.currentSession.setName = newSet.name || newSet.set_name || newSet.code;
            this.currentSession.lastUpdated = new Date().toISOString();

            // Load the new set's cards
            await this.loadSetCards(newSet.id);

            // Restore the cards and statistics
            this.currentSession.cards = currentCards;
            this.currentSession.statistics = currentStats;

            // Save the updated session
            if (this.config.autoSave) {
                await this.saveSession();
            }

            // Emit event for UI updates
            this.emit('setSwitched', {
                oldSetId,
                newSetId: newSet.id,
                session: this.currentSession
            });

            this.logger.info(`Successfully switched to set: ${newSet.id} (${newSet.name || newSet.set_name || newSet.code})`);
            return this.currentSession;

        } catch (error) {
            this.logger.error('Failed to switch sets:', error);
            throw error;
        }
    }

    /**
     * Start a new session
     */
    async startSession(setId) {
        try {
            this.logger.info(`Starting session for set: ${setId}`);
            
            // Find the set
            const set = this.cardSets.find(s => s.id === setId || s.code === setId);
            if (!set) {
                throw new Error(`Card set not found: ${setId}`);
            }
            
            // Stop any existing session
            if (this.isSessionActive) {
                await this.stopSession();
            }
            
            // Create new session
            this.currentSession = {
                id: this.generateSessionId(),
                setId: set.id,
                setName: set.name,
                cards: [],
                startTime: new Date().toISOString(),
                endTime: null,
                statistics: {
                    totalCards: 0,
                    tcgLowTotal: 0,
                    tcgMarketTotal: 0,
                    rarityBreakdown: {},
                    sessionDuration: 0
                }
            };
            
            this.currentSet = set;
            this.sessionActive = true;
            
            // Load set-specific card data
            await this.loadSetCards(set.id);
            
            // Start auto-save if enabled
            if (this.config.autoSave) {
                this.startAutoSave();
            }
            
            // Emit event
            this.emitSessionStart(this.currentSession);
            
            this.logger.info('Session started successfully');
            return this.currentSession;
            
        } catch (error) {
            this.logger.error('Failed to start session:', error);
            throw error;
        }
    }

    /**
     * Stop the current session
     */
    async stopSession() {
        if (!this.sessionActive || !this.currentSession) {
            this.logger.warn('No active session to stop');
            return;
        }
        
        try {
            this.logger.info('Stopping current session');
            
            // Update session end time and statistics
            this.currentSession.endTime = new Date().toISOString();
            this.updateSessionStatistics();
            
            // Save session to history
            this.sessionHistory.unshift({ ...this.currentSession });
            
            // Limit history size
            if (this.sessionHistory.length > this.sessionHistoryLimit) {
                this.sessionHistory = this.sessionHistory.slice(0, this.sessionHistoryLimit);
            }
            
            // Save to storage
            if (this.storage) {
                await this.storage.set('sessionHistory', this.sessionHistory);
                await this.storage.set('lastSession', this.currentSession);
            }
            
            // Stop auto-save
            this.stopAutoSave();
            
            // Emit event
            this.emitSessionStop(this.currentSession);
            
            // Reset state
            this.sessionActive = false;
            const stoppedSession = this.currentSession;
            this.currentSession = null;
            this.currentSet = null;
            
            this.logger.info('Session stopped successfully');
            return stoppedSession;
            
        } catch (error) {
            this.logger.error('Failed to stop session:', error);
            throw error;
        }
    }

    /**
     * Clear the current session
     */
    clearSession() {
        if (!this.currentSession) {
            this.logger.warn('No active session to clear');
            return;
        }
        
        this.logger.info('Clearing current session');
        
        this.currentSession.cards = [];
        this.updateSessionStatistics();
        
        this.emitSessionClear();
        this.emitSessionUpdate(this.currentSession);
    }

    /**
     * Add a card to the current session with enhanced price and image data
     * @param {Object} cardData - Card data to add
     * @param {boolean} forceRefreshPricing - Whether to force refresh pricing data even for imported cards
     */
    /**
     * Add a card to the current session with enhanced price and image data
     * @param {Object} cardData - Card data to add
     * @param {boolean} forceRefreshPricing - Whether to force refresh pricing data even for imported cards
     * @returns {Object} The added card with initial data
     */
    async addCard(cardData, forceRefreshPricing = false) {
        if (!this.sessionActive || !this.currentSession) {
            throw new Error('No active session');
        }
        
        try {
            this.logger.debug('Adding card to session with data:', cardData);
            
            // Extract image URLs from card_images array if available (YGO API format)
            if (cardData.card_images && cardData.card_images.length > 0) {
                const firstImage = cardData.card_images[0];
                cardData.image_url = firstImage.image_url;
                cardData.image_url_small = firstImage.image_url_small;
                cardData.image_url_cropped = firstImage.image_url_cropped;
                this.logger.debug(`Extracted image URLs from card_images for card ${cardData.name || cardData.id}: ${firstImage.image_url}`);
            }
            
            // Create the initial card with loading state
            const enhancedCard = {
                id: this.generateCardId(),
                timestamp: new Date().toISOString(),
                sessionId: this.currentSession.id,
                // Set loading state for pricing
                price_status: 'loading',
                price: 0,
                tcg_price: '--',
                tcg_market_price: '--',
                // Copy over other card data
                ...cardData
            };
            
            // Add to session immediately
            // Enforce session card limits for memory management
            if (this.currentSession.cards.length >= 1000) {
                this.logger.warn('Session card limit reached, removing oldest cards');
                this.currentSession.cards = this.currentSession.cards.slice(-900);
            }
            
            this.currentSession.cards.push(enhancedCard);
            
            // Update statistics
            this.updateSessionStatistics();
            
            // Emit events to update UI immediately
            this.emitCardAdded(enhancedCard);
            this.emitSessionUpdate(this.currentSession);
            
            // Check if we need to fetch pricing data
            const hasValidImportedPricing = !forceRefreshPricing && (
                cardData.importedPricing === true || 
                (cardData.price_status === 'imported') ||
                (cardData.price_status === 'loaded' && (cardData.tcg_price || cardData.tcg_market_price))
            );
            
            if (!hasValidImportedPricing) {
                // Start async price update without blocking
                this._updateCardPricing(enhancedCard, cardData);
            } else if (cardData.tcg_price || cardData.tcg_market_price) {
                // Use existing pricing data immediately
                this._applyPricingData(enhancedCard, {
                    tcg_price: cardData.tcg_price,
                    tcg_market_price: cardData.tcg_market_price,
                    price: cardData.price || parseFloat(cardData.tcg_market_price || cardData.tcg_price || '0'),
                    price_status: 'imported',
                    importedPricing: true
                });
            }
            
            this.logger.info('Card added to session:', enhancedCard.name || enhancedCard.card_name || enhancedCard.id);
            return enhancedCard;
            
        } catch (error) {
            this.logger.error('Failed to add card to session:', error);
            throw error;
        }
    }
    
    /**
     * Update card pricing data asynchronously
     * @private
     * @param {Object} card - The card to update
     * @param {Object} cardData - Original card data for reference
     */
    async _updateCardPricing(card, cardData) {
        const cardId = card.id;
        // Limit size of loading set for memory management
        if (this.loadingPriceData.size >= this.loadingPriceDataLimit) {
            // Clear the oldest entries
            const entries = Array.from(this.loadingPriceData);
            this.loadingPriceData.clear();
            entries.slice(-50).forEach(id => this.loadingPriceData.add(id));
        }
        
        this.loadingPriceData.add(cardId);
        
        try {
            // Use the enhanced card data instead of original cardData to ensure variant rarity is used
            const enhancedInfo = await this.fetchEnhancedCardInfo(card);
            if (enhancedInfo) {
                this._applyPricingData(card, {
                    tcg_price: enhancedInfo.lowPrice || enhancedInfo.tcgPrice,
                    tcg_market_price: enhancedInfo.marketPrice || enhancedInfo.tcgPrice,
                    price: parseFloat(enhancedInfo.marketPrice || enhancedInfo.tcgPrice || '0'),
                    price_status: 'loaded',
                    card_name: enhancedInfo.cardName || cardData.name,
                    card_number: enhancedInfo.card_number || cardData.card_number || cardData.ext_number,
                    card_rarity: enhancedInfo.rarity || cardData.displayRarity || cardData.rarity,
                    booster_set_name: enhancedInfo.booster_set_name,
                    card_art_variant: enhancedInfo.card_art_variant,
                    set_code: enhancedInfo.setCode,
                    last_price_updt: new Date().toISOString(),
                    image_url: enhancedInfo.imageUrl || card.image_url,
                    image_url_small: enhancedInfo.image_url_small || card.image_url_small,
                    source_url: enhancedInfo.source_url,
                    scrape_success: true,
                    hasEnhancedInfo: true
                });
                
                this.logger.info(`Pricing updated for: ${card.name} - Price: $${enhancedInfo.marketPrice || enhancedInfo.tcgPrice || 'N/A'}`);
            } else {
                this.logger.warn('No pricing data available for card:', card.name || card.id);
                this._applyPricingData(card, {
                    price_status: 'error',
                    tcg_price: 'N/A',
                    tcg_market_price: 'N/A',
                    price: 0
                });
            }
        } catch (error) {
            this.logger.warn('Failed to update card pricing:', error.message);
            this._applyPricingData(card, {
                price_status: 'error',
                tcg_price: 'Error',
                tcg_market_price: 'Error',
                price: 0
            });
        } finally {
            this.loadingPriceData.delete(cardId);
        }
    }
    
    /**
     * Apply pricing data to a card and emit update events
     * @private
     * @param {Object} card - The card to update
     * @param {Object} pricingData - The pricing data to apply
     */
    _applyPricingData(card, pricingData) {
        if (!card) return;
        
        // Update card with new pricing data
        Object.assign(card, pricingData);
        
        // Update session statistics
        this.updateSessionStatistics();
        
        // Emit events to update UI
        this.emit('cardUpdated', { cardId: card.id, card });
        this.emitSessionUpdate(this.currentSession);
    }

    /**
     * Remove a card from the current session
     */
    removeCard(cardId) {
        if (!this.sessionActive || !this.currentSession) {
            throw new Error('No active session');
        }
        
        const cardIndex = this.currentSession.cards.findIndex(card => card.id === cardId);
        if (cardIndex === -1) {
            throw new Error('Card not found in session');
        }
        
        const removedCard = this.currentSession.cards.splice(cardIndex, 1)[0];
        
        // Update statistics
        this.updateSessionStatistics();
        
        // Emit events
        this.emitCardRemoved(removedCard);
        this.emitSessionUpdate(this.currentSession);
        
        this.logger.info('Card removed from session:', removedCard.name || removedCard.id);
        return removedCard;
    }

    /**
     * Refresh pricing data for a specific card in the current session
     * @param {string} cardId - ID of the card to refresh pricing for
     * @returns {Promise<Object>} - Updated card object
     */
    async refreshCardPricing(cardId) {
        if (!this.sessionActive || !this.currentSession) {
            throw new Error('No active session');
        }
        
        const cardIndex = this.currentSession.cards.findIndex(card => card.id === cardId);
        if (cardIndex === -1) {
            throw new Error('Card not found in session');
        }
        
        const card = this.currentSession.cards[cardIndex];
        
        try {
            this.logger.info(`Refreshing pricing data for card: ${card.name}`);
            
            // Force refresh pricing by calling addCard with forceRefreshPricing = true
            // But we need to update the existing card instead of adding a new one
            
            // Track this card for pricing data loading
            // Memory-managed loading set (already limited above)
            this.loadingPriceData.add(card.id);
            
            try {
                const enhancedInfo = await this.fetchEnhancedCardInfo(card);
                if (enhancedInfo) {
                    // Update the existing card with fresh pricing data
                    Object.assign(card, {
                        // Price information
                        tcg_price: enhancedInfo.tcgPrice || enhancedInfo.lowPrice,
                        tcg_market_price: enhancedInfo.marketPrice,
                        price: parseFloat(enhancedInfo.marketPrice || enhancedInfo.tcgPrice || '0'),
                        
                        // Update pricing status
                        price_status: 'refreshed',
                        last_price_updt: enhancedInfo.last_price_updt || new Date().toISOString(),
                        importedPricing: false, // No longer using imported pricing
                        
                        // Update other enhanced info if available
                        source_url: enhancedInfo.source_url || card.source_url,
                        scrape_success: enhancedInfo.scrape_success
                    });
                    
                    this.logger.info(`Pricing refreshed for: ${card.name} - New TCG Low: $${enhancedInfo.tcgPrice || 'N/A'}, New TCG Market: $${enhancedInfo.marketPrice || 'N/A'}`);
                } else {
                    this.logger.warn(`No enhanced pricing info available for: ${card.name}`);
                }
            } catch (enhanceError) {
                this.logger.warn(`Failed to refresh pricing for ${card.name}:`, enhanceError.message);
                throw new Error(`Failed to refresh pricing: ${enhanceError.message}`);
            } finally {
                // Remove from loading tracking
                this.loadingPriceData.delete(card.id);
            }
            
            // Update session statistics
            this.updateSessionStatistics();
            
            // Emit events
            this.emitSessionUpdate(this.currentSession);
            
            this.logger.info(`Pricing refresh completed for card: ${card.name}`);
            return card;
            
        } catch (error) {
            this.logger.error(`Failed to refresh pricing for card ${cardId}:`, error);
            throw error;
        }
    }

    /**
     * Refresh pricing data for all cards in the current session
     * @param {boolean} onlyImportedCards - If true, only refresh cards with imported pricing
     * @returns {Promise<Array>} - Array of updated cards
     */
    async refreshAllCardsPricing(onlyImportedCards = false) {
        if (!this.sessionActive || !this.currentSession) {
            throw new Error('No active session');
        }
        
        const cardsToRefresh = onlyImportedCards 
            ? this.currentSession.cards.filter(card => 
                card.importedPricing === true || 
                card.price_status === 'imported' || 
                card.price_status === 'loaded')
            : this.currentSession.cards;
        
        this.logger.info(`Starting bulk pricing refresh for ${cardsToRefresh.length} cards${onlyImportedCards ? ' (imported only)' : ''}...`);
        
        const refreshPromises = cardsToRefresh.map(card => 
            this.refreshCardPricing(card.id).catch(error => {
                this.logger.warn(`Failed to refresh pricing for card ${card.name}:`, error.message);
                return null; // Continue with other cards even if one fails
            })
        );
        
        const results = await Promise.all(refreshPromises);
        const successCount = results.filter(result => result !== null).length;
        
        this.logger.info(`Bulk pricing refresh completed: ${successCount}/${cardsToRefresh.length} cards updated successfully`);
        
        return results.filter(result => result !== null);
    }

    /**
     * Adjust card quantity in the current session
     */
    adjustCardQuantity(cardId, adjustment) {
        if (!this.sessionActive || !this.currentSession) {
            throw new Error('No active session');
        }
        
        const card = this.currentSession.cards.find(card => card.id === cardId);
        if (!card) {
            throw new Error('Card not found in session');
        }
        
        // Calculate new quantity
        const currentQuantity = card.quantity || 1;
        const newQuantity = Math.max(1, currentQuantity + adjustment); // Minimum quantity is 1
        
        if (newQuantity === currentQuantity) {
            return card; // No change needed
        }
        
        card.quantity = newQuantity;
        
        // Update statistics
        this.updateSessionStatistics();
        
        // Emit events
        this.emitSessionUpdate(this.currentSession);
        
        this.logger.info(`Card quantity adjusted: ${card.name || card.id} (${currentQuantity} -> ${newQuantity})`);
        return card;
    }

    /**
     * Extract rarity information from voice text (matching oldIteration.py logic)
     */
    extractRarityFromVoice(voiceText) {
        if (!this.settings.autoExtractRarity) {
            this.logger.debug(`[RARITY EXTRACT] Auto-extract rarity disabled, returning original text: "${voiceText}"`);
            return { cardName: voiceText, rarity: null };
        }

        console.log(`🔴 RARITY EXTRACTION - Input: "${voiceText}"`);
        this.logger.debug(`[RARITY EXTRACT] Processing voice text: "${voiceText}"`);

        // Enhanced rarity patterns to catch YGO rarity types (exact match from oldIteration.py)
        const rarityPatterns = [
            /quarter century secret rare/i,
            /quarter century secret/i,
            /prismatic secret rare/i,
            /prismatic secret/i,
            /starlight rare/i,
            /collector.*?rare/i,
            /ghost rare/i,
            /secret rare/i,
            /ultimate rare/i,
            /ultra rare/i,
            /super rare/i,
            /parallel rare/i,
            /short print/i,
            /rare/i,
            /common/i
        ];

        for (const pattern of rarityPatterns) {
            const match = voiceText.match(pattern);
            if (match) {
                const rarity = match[0];
                const cardName = voiceText.replace(pattern, '').trim();
                console.log(`🟡 RARITY MATCH! Pattern: ${pattern}, Matched: "${rarity}", Remaining: "${cardName}"`);
                this.logger.info(`[RARITY EXTRACT] SUCCESS - Extracted rarity: '${rarity}', remaining card name: '${cardName}'`);
                return { cardName, rarity };
            }
        }

        console.log(`🟢 NO RARITY MATCH - Returning original: "${voiceText}"`);
        this.logger.debug(`[RARITY EXTRACT] No rarity patterns matched in: "${voiceText}"`);
        return { cardName: voiceText, rarity: null };
    }

    /**
     * Extract art variant information from voice text (matching oldIteration.py logic)
     */
    extractArtVariantFromVoice(voiceText) {
        if (!this.settings.autoExtractArtVariant) {
            return { cardName: voiceText, artVariant: null };
        }

        // Art variant patterns (from oldIteration.py)
        const artPatterns = [
            /art variant (\w+)/i,
            /art (\w+)/i,
            /variant (\w+)/i,
            /artwork (\w+)/i,
            /art rarity (.+?)(?:\s|$)/i,
            /art variant (.+?)(?:\s|$)/i
        ];

        for (const pattern of artPatterns) {
            const match = voiceText.match(pattern);
            if (match) {
                const artVariant = match[1];
                const cardName = voiceText.replace(pattern, '').trim();
                this.logger.debug(`Auto-extracted art variant: '${artVariant}' from voice text`);
                return { cardName, artVariant };
            }
        }

        return { cardName: voiceText, artVariant: null };
    }

    /**
     * Process voice input to identify cards with enhanced fantasy name recognition
     */
    async processVoiceInput(transcript, enhancedResults = null) {
        this.logger.info('Processing voice input:', transcript);
        
        if (!transcript || typeof transcript !== 'string') {
            return [];
        }

        // Use enhanced results if provided by VoiceEngine, otherwise fallback to basic processing
        let processedTranscript = transcript;
        let processingMetadata = {
            phoneticProcessed: false,
            learningApplied: false,
            adaptiveThreshold: null
        };

        if (enhancedResults && enhancedResults.length > 0) {
            // Use the best enhanced result
            const bestResult = enhancedResults[0];
            processedTranscript = bestResult.transcript;
            processingMetadata = {
                phoneticProcessed: bestResult.phoneticProcessed || false,
                learningApplied: bestResult.learningApplied || false,
                adaptiveThreshold: bestResult.adaptiveThreshold || null,
                originalTranscript: bestResult.originalTranscript || transcript
            };
            
            this.logger.info(`Using enhanced voice result: "${transcript}" → "${processedTranscript}"`, {
                enhancements: processingMetadata
            });
        }

        // Step 1: Auto-extract rarity and art variant if enabled (matching oldIteration.py)
        let processedText = processedTranscript;
        let extractedRarity = null;
        let extractedArtVariant = null;

        console.log(`🔵 VOICE PROCESSING PIPELINE START`);
        console.log(`🔵 Original transcript: "${transcript}"`);
        console.log(`🔵 Enhanced transcript: "${processedTranscript}"`);
        console.log(`🔵 Auto-extract rarity enabled: ${this.settings.autoExtractRarity}`);

        // Extract rarity information
        console.log(`🔵 STEP 1: Rarity extraction from: "${processedText}"`);
        const rarityResult = this.extractRarityFromVoice(processedText);
        processedText = rarityResult.cardName;
        extractedRarity = rarityResult.rarity;
        console.log(`🔵 After rarity extraction: "${processedText}" (extracted rarity: "${extractedRarity}")`);

        // Extract art variant information
        console.log(`🔵 STEP 2: Art variant extraction from: "${processedText}"`);
        const artResult = this.extractArtVariantFromVoice(processedText);
        processedText = artResult.cardName;
        extractedArtVariant = artResult.artVariant;
        console.log(`🔵 After art variant extraction: "${processedText}" (extracted variant: "${extractedArtVariant}")`);

        const cleanTranscript = processedText.toLowerCase().trim();
        console.log(`🔵 FINAL: Clean transcript for search: "${cleanTranscript}"`);
        
        this.logger.debug(`[VOICE PROCESSING] Input transcript: "${processedTranscript}"`);
        this.logger.debug(`[VOICE PROCESSING] Auto-extract rarity enabled: ${this.settings.autoExtractRarity}`);
        this.logger.debug(`[VOICE PROCESSING] Auto-extract art variant enabled: ${this.settings.autoExtractArtVariant}`);

        if (extractedRarity || extractedArtVariant) {
            this.logger.info(`[VOICE PROCESSING] Extracted from voice - Rarity: "${extractedRarity}", Art Variant: "${extractedArtVariant}", Card Name: "${processedText}"`);
        } else {
            this.logger.debug(`[VOICE PROCESSING] No rarity or art variant extracted, using processed card name: "${processedText}"`);
        }
        
        try {
            // Use unified matching approach with enhanced fantasy name processing
            let recognizedCards = [];
            
            if (this.currentSet) {
                recognizedCards = await this.findCardsInCurrentSetEnhanced(cleanTranscript, extractedRarity, processingMetadata);
            }
            
            this.logger.info(`Found ${recognizedCards.length} potential card matches`);
            
            // Debug output of found cards with enhancement information
            if (recognizedCards.length > 0) {
                this.logger.debug(`[VOICE PROCESSING] Found cards:`, recognizedCards.map(card => 
                    `${card.name} - ${card.displayRarity || 'Unknown'} [${card.setInfo?.setCode || 'N/A'}] (${card.confidence}% ${card.enhancementApplied ? 'enhanced' : ''})`
                ));
            }
            
            return recognizedCards;
            
        } catch (error) {
            this.logger.error('Error processing voice input:', error);
            return [];
        }
    }



    /**
     * Find cards by fuzzy matching using advanced variant generation
     */
     async findCardsByFuzzyMatch(transcript, extractedRarity = null) {
        if (!this.currentSet) {
            return [];
        }
        
        const setCards = this.setCards.get(this.currentSet.id) || [];
        const matches = [];
        
        // Generate search variants for the transcript
        const searchVariants = this.generateCardNameVariants(transcript);
        
        for (const card of setCards) {
            const cardNameVariants = this.generateCardNameVariants(card.name);
            
            let bestScore = 0;
            let bestMethod = '';
            
            // Test all combinations of search variants vs card variants
            for (const searchVariant of searchVariants) {
                for (const cardVariant of cardNameVariants) {
                    // Method 1: Fuzzy ratio
                    const fuzzyScore = this.calculateSimilarity(searchVariant, cardVariant);
                    
                    // Method 2: Word-by-word matching
                    const wordScore = this.calculateWordByWordScore(searchVariant, cardVariant);
                    
                    // Method 3: Compound word detection
                    const compoundScore = this.calculateCompoundWordScore(searchVariant, cardVariant);
                    
                    // Take the best score from all methods
                    const scores = [fuzzyScore, wordScore, compoundScore];
                    const maxScore = Math.max(...scores);
                    
                    if (maxScore > bestScore) {
                        bestScore = maxScore;
                        const methodIndex = scores.indexOf(maxScore);
                        bestMethod = ['fuzzy', 'word', 'compound'][methodIndex];
                    }
                }
            }
            
            // Apply length penalty (similar to oldIteration.py)
            const lengthDifference = Math.abs(transcript.length - card.name.length);
            const maxLength = Math.max(transcript.length, card.name.length);
            const lengthPenalty = maxLength > 0 ? Math.max(0, 1 - (lengthDifference / maxLength)) : 1;
            
            const finalScore = bestScore * lengthPenalty;
            
            if (finalScore >= this.config.cardMatchThreshold) {
                matches.push({
                    ...card,
                    confidence: finalScore * 100, // Convert to percentage like Python
                    method: `fuzzy-${bestMethod}`,
                    transcript: transcript,
                    rawScore: bestScore,
                    lengthPenalty: lengthPenalty
                });
            }
        }
        
        return matches.sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Generate card name variants for better matching (based on oldIteration.py)
     */
    generateCardNameVariants(name) {
        const variants = [name.toLowerCase()];
        
        // Yu-Gi-Oh specific substitutions from oldIteration.py
        const substitutions = {
            'yu': ['you', 'u'],
            'gi': ['gee', 'ji'],
            'oh': ['o'],
            'elemental': ['elemental', 'element'],
            'hero': ['hiro', 'heero', 'hero'],
            'evil': ['evil', 'evel'],
            'dark': ['dark', 'drak'],
            'gaia': ['gaia', 'gaya', 'guy', 'gya'],
            'cyber': ['siber', 'cyber'],
            'dragon': ['drago', 'drag', 'dragun'],
            'magician': ['magic', 'mage', 'majician'],
            'warrior': ['war', 'warrior'],
            'machine': ['mach', 'machin'],
            'beast': ['best', 'beast'],
            'fiend': ['fend', 'fiend'],
            'spellcaster': ['spell', 'caster'],
            'aqua': ['agua', 'aqua'],
            'winged': ['wing', 'winged'],
            'thunder': ['under', 'thunder'],
            'zombie': ['zomb', 'zombie'],
            'plant': ['plan', 'plant'],
            'insect': ['insec', 'insect'],
            'rock': ['rok', 'rock'],
            'pyro': ['fire', 'pyro'],
            'sea': ['see', 'sea'],
            'divine': ['divin', 'divine'],
            'metal': ['metal', 'mettle'],
            'flame': ['flame', 'flam'],
            'neos': ['neos', 'neeos', 'neus']
        };
        
        // Create phonetic alternatives
        const lowerName = name.toLowerCase();
        for (const [original, alternatives] of Object.entries(substitutions)) {
            if (lowerName.includes(original)) {
                for (const alt of alternatives) {
                    variants.push(lowerName.replace(original, alt));
                }
            }
        }
        
        // Add compound word variants
        const words = lowerName.split(/[\s-]+/);
        if (words.length >= 2) {
            // Add version with spaces removed
            variants.push(words.join(''));
            // Add version with different spacing
            for (let i = 1; i < words.length; i++) {
                const compound = words.slice(0, i).join('') + ' ' + words.slice(i).join(' ');
                variants.push(compound);
            }
        }
        
        // Remove duplicates while preserving order
        const seen = new Set();
        return variants.filter(variant => {
            const normalized = variant.toLowerCase();
            if (seen.has(normalized)) {
                return false;
            }
            seen.add(normalized);
            return true;
        });
    }

    /**
     * Calculate word-by-word matching score
     */
    calculateWordByWordScore(str1, str2) {
        const words1 = str1.toLowerCase().split(/[\s-]+/);
        const words2 = str2.toLowerCase().split(/[\s-]+/);
        
        let matchCount = 0;
        const totalWords = Math.max(words1.length, words2.length);
        
        for (const word1 of words1) {
            for (const word2 of words2) {
                if (word1 === word2 || this.calculateSimilarity(word1, word2) >= 0.8) {
                    matchCount++;
                    break;
                }
            }
        }
        
        return totalWords > 0 ? (matchCount / totalWords) : 0;
    }

    /**
     * Calculate compound word detection score
     */
    calculateCompoundWordScore(str1, str2) {
        const clean1 = str1.replace(/[\s-]/g, '').toLowerCase();
        const clean2 = str2.replace(/[\s-]/g, '').toLowerCase();
        
        if (clean1.includes(clean2) || clean2.includes(clean1)) {
            return 0.9;
        }
        
        return this.calculateSimilarity(clean1, clean2);
    }

    /**
     * Find cards in current set with enhanced rarity variant handling
     */
    async findCardsInCurrentSet(transcript, extractedRarity = null) {
        if (!this.currentSet) {
            return [];
        }
        
        this.logger.debug(`[CARD SEARCH] Processing transcript: "${transcript}", extractedRarity: "${extractedRarity}"`);
        
        const setCards = this.setCards.get(this.currentSet.id) || [];
        const initialMatches = [];
        
        // Normalize the transcript for better matching
        const normalizedTranscript = this.normalizeCardName(transcript);
        
        // First pass: Find matching card names
        for (const card of setCards) {
            const normalizedCardName = this.normalizeCardName(card.name);
            
            // Multiple matching strategies
            let confidence = 0;
            let matchType = '';
            
            // Exact match (highest confidence)
            if (normalizedCardName === normalizedTranscript) {
                confidence = 95;
                matchType = 'exact';
            }
            // Fuzzy matching with similarity calculation
            else {
                const similarity = this.calculateSimilarity(normalizedTranscript, normalizedCardName);
                if (similarity >= this.config.cardMatchThreshold) {
                    confidence = similarity * 90; // Slightly lower than exact match (convert to percentage)
                    matchType = 'fuzzy';
                }
            }
            
            if (confidence > 0) {
                initialMatches.push({
                    ...card,
                    confidence: confidence,
                    method: `set-search-${matchType}`,
                    transcript: transcript,
                    normalizedTranscript: normalizedTranscript,
                    normalizedCardName: normalizedCardName
                });
            }
        }
        
        // Helper function to extract base card name (remove rarity info from name)
        const extractBaseCardName = (fullCardName) => {
            return fullCardName
                .replace(/\s*\([^)]*\)$/, '') // Remove parenthetical at end (like "(Quarter Century Secret Rare)")
                .replace(/\s*-\s*(Secret Rare|Ultra Rare|Super Rare|Rare|Common|Quarter Century Secret Rare|Starlight Rare|Ghost Rare|Collector's Rare|Prismatic Secret Rare|Ultimate Rare|Gold Rare|Platinum Rare|Silver Rare).*$/i, '')
                .replace(/\s*\[\w+\]$/, '') // Remove bracketed info at end like [INFO]
                .replace(/\s*#\d+.*$/, '') // Remove card numbers like #001
                .replace(/\s*\d+st\s+Edition.*$/i, '') // Remove "1st Edition" etc
                .trim();
        };
        
        // Second pass: Create variants for each matching card name with different rarities
        // Following the logic from oldIteration.py for proper rarity variant handling
        const allVariants = [];
        const processedBaseNames = new Set();
        
        for (const match of initialMatches) {
            const baseCardName = extractBaseCardName(match.name);
            
            // Skip if we already processed this base card name
            if (processedBaseNames.has(baseCardName.toLowerCase())) {
                continue;
            }
            processedBaseNames.add(baseCardName.toLowerCase());
            
            // Find all cards with the same base name (removing rarity/variant info)
            const matchingCards = setCards.filter(card => {
                const cardBaseName = extractBaseCardName(card.name);
                return cardBaseName.toLowerCase() === baseCardName.toLowerCase();
            });
            
            this.logger.debug(`[VARIANT] Found ${matchingCards.length} cards with base name: ${baseCardName}`);
            
            // DEBUG: Log all matching cards with their rarities
            if (matchingCards.length > 0) {
                this.logger.debug(`[VARIANT DEBUG] All cards with base name "${baseCardName}":`, 
                    matchingCards.map(c => `"${c.name}" - ${c.rarity} [${c.set_code}] ID:${c.id}`)
                );
            }
            
            // For each matching card, create variants (TCGcsv structure: each card is already a variant)
            for (const card of matchingCards) {
                this.logger.debug(`[VARIANT] Processing card "${card.name}" with rarity: "${card.rarity}"`);
                this.logger.debug(`[VARIANT] Card structure - name: "${card.name}", id: ${card.id}, rarity: "${card.rarity}"`);
                
                // In TCGcsv structure, each card already has its rarity and set info directly
                const rarity = card.rarity || 'Common'; // Default to Common if no rarity
                const setCode = card.set_code || this.currentSet?.abbreviation || this.currentSet?.code || 'Unknown';
                
                // Filter out cards with invalid rarity
                if (!rarity || 
                    typeof rarity !== 'string' ||
                    rarity.trim() === '' || 
                    rarity.toLowerCase().trim() === 'unknown' ||
                    rarity.toLowerCase().trim() === 'n/a' ||
                    rarity.toLowerCase().trim() === 'undefined' ||
                    rarity.toLowerCase().trim() === 'null') {
                    this.logger.debug(`[VARIANT] Skipping card with invalid rarity: "${rarity}" for card: ${card.name}`);
                    continue;
                }
                
                this.logger.debug(`[VARIANT] Processing valid card: rarity="${rarity}", setCode="${setCode}" for card: ${card.name}`);
                
                // Apply rarity filtering when extractedRarity is provided
                let confidence = match.confidence;
                if (extractedRarity) {
                    const rarityScore = this.calculateRarityScore(extractedRarity, rarity);
                    this.logger.debug(`[VARIANT] Rarity matching: "${extractedRarity}" vs "${rarity}" = ${rarityScore}%`);
                    
                    // Skip variants that don't match the extracted rarity well enough
                    if (rarityScore < 20) {
                        this.logger.debug(`[VARIANT] Skipping variant due to poor rarity match: ${rarity} (score: ${rarityScore})`);
                        continue;
                    }
                    
                    // Use weighted confidence: 75% name + 25% rarity
                    const nameScore = match.confidence;
                    confidence = (nameScore * 0.75) + (rarityScore * 0.25);
                    this.logger.debug(`[VARIANT] Weighted confidence: ${nameScore}% name + ${rarityScore}% rarity = ${confidence}%`);
                } else {
                    // When no rarity is specified, slightly adjust confidence based on rarity commonness
                    // This ensures variants have different confidence scores for better UI display
                    const rarityBonus = this.getRarityDisplayPriority(rarity);
                    confidence = match.confidence + (rarityBonus * 0.01); // Very small adjustment
                    this.logger.debug(`[VARIANT] No rarity specified, base confidence: ${match.confidence}%, adjusted: ${confidence}% (rarity bonus: ${rarityBonus})`);
                }
                
                const variantKey = `${card.name}_${rarity}_${setCode}`;
                
                // Check if we already added this exact variant
                if (!allVariants.some(v => v.variantKey === variantKey)) {
                    this.logger.debug(`[VARIANT] Created variant: ${card.name} - ${rarity} [${setCode}] (${confidence}%)`);
                    const newVariant = {
                        ...card,
                        confidence: confidence,
                        method: match.method,
                        transcript: match.transcript,
                        variantKey: variantKey,
                        // Use the card's direct rarity and set info
                        displayRarity: rarity,
                        setInfo: {
                            setCode: setCode,
                            setName: this.currentSet?.name || 'Unknown Set'
                        }
                    };
                    
                    this.logger.debug(`[VARIANT] Variant object displayRarity: "${newVariant.displayRarity}", setInfo:`, newVariant.setInfo);
                    allVariants.push(newVariant);
                } else {
                    this.logger.debug(`[VARIANT] Skipped duplicate variant: ${variantKey}`);
                }
            }
        }
        
        // Sort by confidence (highest first) and ensure unique confidence scores
        const sortedVariants = allVariants.sort((a, b) => b.confidence - a.confidence);
        
        this.logger.debug(`[VARIANT] Pre-uniqueness variants:`, sortedVariants.map(v => `${v.name} - ${v.displayRarity} [${v.setInfo?.setCode}] (${v.confidence})`));
        
        // Ensure unique confidence scores to avoid ties (similar to oldIteration.py)
        this.ensureUniqueConfidenceScores(sortedVariants);
        
        this.logger.debug(`[VARIANT] Final variants:`, sortedVariants.map(v => `${v.name} - ${v.displayRarity} [${v.setInfo?.setCode}] (${v.confidence})`));
        
        this.logger.info(`Generated ${sortedVariants.length} card variants for transcript: "${transcript}"`);
        
        return sortedVariants;
    }

    /**
     * Enhanced card finding with fantasy name processing metadata
     */
    async findCardsInCurrentSetEnhanced(transcript, extractedRarity = null, processingMetadata = {}) {
        if (!this.currentSet) {
            return [];
        }
        
        this.logger.debug(`[ENHANCED SEARCH] Processing transcript: "${transcript}"`, {
            extractedRarity,
            metadata: processingMetadata
        });

        // Use the existing method as base but apply enhancements
        let baseResults = await this.findCardsInCurrentSet(transcript, extractedRarity);
        
        // LEARNING BOOST: If no results found, check for learned patterns
        if (baseResults.length === 0 && this.voiceEngine && this.voiceEngine.learningEngine) {
            baseResults = await this.applyLearningBoostSearch(transcript, extractedRarity);
        }
        
        // Apply enhancements to the results
        const enhancedResults = baseResults.map(card => {
            let enhanced = { ...card };
            
            // Apply enhancement metadata
            enhanced.enhancementApplied = processingMetadata.phoneticProcessed || processingMetadata.learningApplied;
            enhanced.phoneticProcessed = processingMetadata.phoneticProcessed || false;
            enhanced.learningApplied = processingMetadata.learningApplied || false;
            enhanced.adaptiveThreshold = processingMetadata.adaptiveThreshold;
            enhanced.originalTranscript = processingMetadata.originalTranscript || transcript;
            
            // Boost confidence for enhanced processing
            if (enhanced.enhancementApplied) {
                // Small boost for phonetic processing
                if (enhanced.phoneticProcessed) {
                    enhanced.confidence += 5;
                    enhanced.confidence = Math.min(95, enhanced.confidence); // Cap at 95%
                }
                
                // Additional boost for learning-based improvements
                if (enhanced.learningApplied) {
                    enhanced.confidence += 3;
                    enhanced.confidence = Math.min(98, enhanced.confidence); // Cap at 98%
                }
                
                this.logger.debug(`[ENHANCED SEARCH] Applied enhancement boost to: ${enhanced.name} (+${enhanced.confidence - card.confidence}%)`);
            }
            
            return enhanced;
        });

        // Re-sort after confidence adjustments
        const sortedResults = enhancedResults.sort((a, b) => b.confidence - a.confidence);
        
        // Ensure unique confidence scores after enhancement
        this.ensureUniqueConfidenceScores(sortedResults);
        
        this.logger.info(`Enhanced search found ${sortedResults.length} cards for transcript: "${transcript}"`);
        
        return sortedResults;
    }

    /**
     * Find all card variants that match a base card name (used for training)
     */
    async findAllCardVariantsByBaseName(baseCardName, extractedRarity = null) {
        if (!this.currentSet) {
            return [];
        }
        
        const setCards = this.setCards.get(this.currentSet.id) || [];
        const matchingVariants = [];
        
        this.logger.debug(`[VARIANT SEARCH] Looking for all variants of base name: "${baseCardName}"`);
        
        // Helper function to extract base name from full card name (same logic as TrainingUI)
        const extractBaseCardName = (fullCardName) => {
            return fullCardName
                .replace(/\s*\([^)]*\)$/, '') // Remove parenthetical at end
                .replace(/\s*-\s*(Secret Rare|Ultra Rare|Super Rare|Rare|Common|Quarter Century Secret Rare|Starlight Rare|Ghost Rare|Collector's Rare|Prismatic Secret Rare|Ultimate Rare|Gold Rare|Platinum Rare|Silver Rare).*$/i, '')
                .replace(/\s*\[\w+\]$/, '') // Remove bracketed info at end
                .replace(/\s*#\d+.*$/, '') // Remove card numbers
                .replace(/\s*\d+st\s+Edition.*$/i, '') // Remove "1st Edition" etc
                .trim();
        };
        
        // Find all cards whose base name matches
        for (const card of setCards) {
            const cardBaseName = extractBaseCardName(card.name);
            
            if (cardBaseName.toLowerCase() === baseCardName.toLowerCase()) {
                // This card matches the base name - add it as a variant
                const rarity = card.rarity || 'Common';
                const setCode = card.set_code || this.currentSet?.abbreviation || this.currentSet?.code || 'Unknown';
                
                // Skip cards with invalid rarity
                if (!rarity || 
                    typeof rarity !== 'string' ||
                    rarity.trim() === '' || 
                    rarity.toLowerCase().trim() === 'unknown' ||
                    rarity.toLowerCase().trim() === 'n/a') {
                    continue;
                }
                
                let confidence = 90; // High confidence since it's a learned pattern match
                
                // Apply rarity filtering if specified
                if (extractedRarity) {
                    const rarityScore = this.calculateRarityScore(extractedRarity, rarity);
                    if (rarityScore < 20) {
                        this.logger.debug(`[VARIANT SEARCH] Skipping variant due to poor rarity match: ${rarity} (score: ${rarityScore})`);
                        continue;
                    }
                    confidence = (confidence * 0.75) + (rarityScore * 0.25);
                }
                
                matchingVariants.push({
                    ...card,
                    confidence: confidence,
                    method: 'learning-boost-variant',
                    displayRarity: rarity,
                    setInfo: {
                        setCode: setCode,
                        setName: this.currentSet?.name || 'Unknown Set'
                    },
                    baseCardMatch: baseCardName
                });
                
                this.logger.debug(`[VARIANT SEARCH] Found variant: "${card.name}" (${rarity}) - confidence: ${confidence}%`);
            }
        }
        
        // Sort by confidence descending
        matchingVariants.sort((a, b) => b.confidence - a.confidence);
        
        this.logger.info(`[VARIANT SEARCH] Found ${matchingVariants.length} variants for base name: "${baseCardName}"`);
        return matchingVariants;
    }

    /**
     * Get display priority for rarity (higher numbers = more prominent display)
     * @private
     */
    getRarityDisplayPriority(rarity) {
        const rarityLower = (rarity || '').toLowerCase().trim();
        
        // Higher priority rarities get higher numbers for slight confidence boost
        const priorities = {
            'quarter century secret rare': 10,
            'quarter century secret': 10,
            'starlight rare': 9,
            'collector\'s rare': 8,
            'collectors rare': 8,
            'collector rare': 8,
            'ghost rare': 7,
            'prismatic secret rare': 6,
            'prismatic secret': 6,
            'secret rare': 5,
            'ultimate rare': 4,
            'ultra rare': 3,
            'super rare': 2,
            'rare': 1,
            'common': 0
        };
        
        return priorities[rarityLower] || 0;
    }

    /**
     * Apply learning boost search when no initial results found
     */
    async applyLearningBoostSearch(transcript, extractedRarity = null) {
        try {
            const voiceInputLower = transcript.toLowerCase().trim();
            const learningEngine = this.voiceEngine.learningEngine;
            const results = [];
            
            this.logger.debug(`[LEARNING BOOST] Checking patterns for voice input: "${transcript}"`);
            
            // Search through stored learning patterns for matching voice input
            for (const [patternKey, pattern] of learningEngine.userPatterns) {
                if (pattern.voiceInput.toLowerCase().trim() === voiceInputLower) {
                    this.logger.info(`[LEARNING BOOST] Found pattern: "${pattern.voiceInput}" → "${pattern.targetCard}"`);
                    
                    // Since we now store base card names, find all variants of that card
                    const targetResults = await this.findAllCardVariantsByBaseName(pattern.targetCard, extractedRarity);
                    
                    if (targetResults.length > 0) {
                        // Apply learning boost to confidence
                        const boostedResults = targetResults.map(card => ({
                            ...card,
                            confidence: Math.min(95, card.confidence + 15), // Boost confidence by 15%
                            learningApplied: true,
                            learningPattern: pattern.voiceInput,
                            learningTarget: pattern.targetCard,
                            learningBoost: 15
                        }));
                        
                        results.push(...boostedResults);
                        this.logger.info(`[LEARNING BOOST] Applied pattern "${pattern.voiceInput}" → "${pattern.targetCard}", found ${boostedResults.length} variants`);
                    }
                }
            }
            
            // Remove duplicates and sort by confidence
            const uniqueResults = results.filter((card, index, self) => 
                index === self.findIndex(c => c.name === card.name)
            );
            
            uniqueResults.sort((a, b) => b.confidence - a.confidence);
            
            if (uniqueResults.length > 0) {
                this.logger.info(`[LEARNING BOOST] Applied learning patterns, found ${uniqueResults.length} cards for "${transcript}"`);
            }
            
            return uniqueResults;
            
        } catch (error) {
            this.logger.error(`[LEARNING BOOST] Error applying learning patterns:`, error);
            return [];
        }
    }

    /**
     * Calculate rarity matching score with improved specificity for Yu-Gi-Oh rarities
     */
    calculateRarityScore(inputRarity, cardSetRarity) {
        if (!inputRarity || !cardSetRarity) {
            return 0;
        }
        
        const input = inputRarity.toLowerCase().trim();
        const cardRarity = cardSetRarity.toLowerCase().trim();
        
        // Exact match gets highest score
        if (input === cardRarity) {
            return 100;
        }
        
        // Special handling for specific Yu-Gi-Oh rarity combinations to avoid confusion
        
        // If user said "secret rare" but card is "quarter century secret rare", penalize heavily
        if (input === 'secret rare' && cardRarity === 'quarter century secret rare') {
            return 25; // Low score to discourage this match
        }
        
        // If user said "quarter century secret rare" but card is just "secret rare", penalize
        if (input === 'quarter century secret rare' && cardRarity === 'secret rare') {
            return 25; // Low score to discourage this match
        }
        
        // If user said "ultra rare" but card is "super rare" or vice versa, penalize
        if ((input === 'ultra rare' && cardRarity === 'super rare') ||
            (input === 'super rare' && cardRarity === 'ultra rare')) {
            return 30;
        }
        
        // General partial match for other cases (more lenient for non-conflicting rarities)
        if (input.includes(cardRarity) || cardRarity.includes(input)) {
            // Check if it's a potentially confusing partial match
            const inputWords = input.split(' ');
            const cardWords = cardRarity.split(' ');
            
            // If the input is a subset of card rarity but missing key words, lower score
            if (inputWords.every(word => cardWords.includes(word)) && inputWords.length < cardWords.length) {
                return 40; // Lower score for incomplete rarity specification
            }
            
            return 80; // Good score for other partial matches
        }
        
        // Fuzzy match as fallback
        const similarity = this.calculateSimilarity(input, cardRarity);
        return similarity >= 0.70 ? similarity * 70 : 0;  // Scale down fuzzy matches
    }

    /**
     * Ensure unique confidence scores to avoid ties in selection
     * Based on the logic from oldIteration.py - fixed floating point precision issues
     */
    ensureUniqueConfidenceScores(variants) {
        if (!variants || variants.length === 0) {
            return;
        }
        
        this.logger.debug(`[CONFIDENCE] Starting uniqueness adjustment for ${variants.length} variants`);
        
        // Track used confidence scores (exactly like Python logic)
        const usedScores = new Set();
        
        for (let i = 0; i < variants.length; i++) {
            const variant = variants[i];
            const originalConfidence = variant.confidence;
            let confidence = originalConfidence;
            
            this.logger.debug(`[CONFIDENCE] Processing variant ${i + 1}: "${variant.name}" - Original confidence: ${originalConfidence.toFixed(1)}%`);
            
            // If this confidence is already used, find a unique one (exactly like Python)
            // Fix floating point precision issues by using integer arithmetic
            let confidenceRounded = Math.round(confidence * 10) / 10;
            while (usedScores.has(confidenceRounded)) {
                confidence -= 0.1;
                // Use proper rounding to avoid floating point precision issues
                confidenceRounded = Math.round(confidence * 10) / 10;
                this.logger.debug(`[CONFIDENCE] Confidence ${confidenceRounded} already used, trying ${confidenceRounded}`);
                
                // Ensure we don't go below reasonable bounds
                if (confidenceRounded < 10) {
                    confidence = originalConfidence + 0.1;
                    confidenceRounded = Math.round(confidence * 10) / 10;
                    while (usedScores.has(confidenceRounded) && confidenceRounded <= 99) {
                        confidence += 0.1;
                        confidenceRounded = Math.round(confidence * 10) / 10;
                    }
                    break;
                }
            }
            
            // Round to one decimal place and update (exactly like Python)
            confidence = confidenceRounded;
            variant.confidence = confidence;
            usedScores.add(confidence);
            
            this.logger.debug(`[CONFIDENCE] Final confidence for "${variant.name}": ${confidence}%`);
            
            if (Math.abs(confidence - originalConfidence) > 0.05) { // Use tolerance for floating point comparison
                this.logger.info(`[CONFIDENCE] Adjusted confidence for uniqueness: ${variant.name} ${originalConfidence.toFixed(1)}% -> ${confidence.toFixed(1)}%`);
            }
        }
        
        this.logger.debug(`[CONFIDENCE] Used scores: ${Array.from(usedScores).sort((a, b) => b - a).join(', ')}`);
    }

    /**
     * Normalize card name for better matching
     * Handles common variations in Yu-Gi-Oh card naming
     */
    normalizeCardName(name) {
        const original = name;
        const normalized = name.toLowerCase()
            .replace(/[\s-]+/g, ' ')  // Normalize spaces and hyphens
            .replace(/[^a-z0-9\s]/g, '') // Remove special characters except spaces and numbers
            .replace(/\s+/g, ' ')     // Normalize multiple spaces
            .trim();
            
        // Debug logging to see what's happening to card names
        if (original !== normalized) {
            console.log(`🔍 NORMALIZE: "${original}" → "${normalized}"`);
        }
        
        return normalized;
    }
    

    /**
     * Calculate similarity between two strings with enhanced partial matching
     */
    calculateSimilarity(str1, str2) {
        // Check for exact matches first
        if (str1 === str2) {
            return 1.0;
        }
        
        // Check for substring matches (important for partial matching like "creation king" in "mementomictlan tecuhtlica creation king")
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) {
            return 1.0;
        }
        
        // If the shorter string is contained in the longer string, give high similarity
        if (longer.includes(shorter)) {
            // Calculate how much of the longer string is covered by the shorter string
            const coverage = shorter.length / longer.length;
            // Give a high base score plus bonus for coverage
            return Math.min(0.85 + (coverage * 0.15), 1.0); // Min 85% similarity for substring matches
        }
        
        // Check if longer string ends or starts with shorter string (common in card names)
        if (longer.endsWith(shorter) || longer.startsWith(shorter) || 
            shorter.endsWith(longer) || shorter.startsWith(longer)) {
            const coverage = shorter.length / longer.length;
            return Math.min(0.80 + (coverage * 0.20), 1.0); // Min 80% for prefix/suffix matches
        }
        
        // Fall back to Levenshtein distance for other cases
        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }

    /**
     * Calculate Levenshtein distance
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }



    /**
     * Update session statistics
     */
    updateSessionStatistics() {
        if (!this.currentSession) {
            return;
        }
        
        const cards = this.currentSession.cards;
        
        // Use the enhanced statistics calculation
        const newStats = this.calculateSessionStatistics(cards);
        
        // Preserve session duration calculation
        if (this.currentSession.startTime) {
            const start = new Date(this.currentSession.startTime);
            const end = this.currentSession.endTime ? new Date(this.currentSession.endTime) : new Date();
            newStats.sessionDuration = end.getTime() - start.getTime();
        }
        
        this.currentSession.statistics = newStats;
    }

    /**
     * Save session
     */
    async saveSession() {
        if (!this.currentSession || !this.storage) {
            return false;
        }
        
        try {
            await this.storage.set('currentSession', this.currentSession);
            this.logger.debug('Session saved successfully');
            return true;
        } catch (error) {
            this.logger.error('Failed to save session:', error);
            return false;
        }
    }

    /**
     * Load last session
     */
    async loadLastSession() {
        if (!this.storage) {
            return null;
        }
        
        try {
            const session = await this.storage.get('currentSession');
            
            if (session && !session.endTime) {
                // Resume incomplete session
                this.currentSession = session;
                this.sessionActive = true;
                
                // Find the set
                this.currentSet = this.cardSets.find(s => s.id === session.setId);
                
                // Start auto-save for resumed session
                if (this.config.autoSave) {
                    this.startAutoSave();
                }
                
                this.logger.info('Resumed previous session:', session.id);
                return session;
            }
            
            return null;
        } catch (error) {
            this.logger.error('Failed to load last session:', error);
            return null;
        }
    }

    /**
     * Wait for all pricing data to finish loading
     * @param {number} timeout - Maximum time to wait in milliseconds (default: 30 seconds)
     * @returns {Promise<boolean>} - True if all pricing data loaded, false if timed out
     */
    async waitForPricingDataToLoad(timeout = 30000) {
        const startTime = Date.now();
        
        this.logger.info(`Waiting for pricing data to load for ${this.loadingPriceData.size} cards...`);
        
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                const elapsed = Date.now() - startTime;
                
                // Check if all pricing data has loaded
                if (this.loadingPriceData.size === 0) {
                    clearInterval(checkInterval);
                    this.logger.info('All pricing data loaded successfully');
                    resolve(true);
                    return;
                }
                
                // Check for timeout
                if (elapsed >= timeout) {
                    clearInterval(checkInterval);
                    this.logger.warn(`Timeout waiting for pricing data (${this.loadingPriceData.size} cards still loading)`);
                    resolve(false);
                    return;
                }
                
                // Log progress every 2 seconds
                if (elapsed % 2000 < 500) {
                    this.logger.debug(`Still waiting for ${this.loadingPriceData.size} cards to load pricing data...`);
                }
            }, 500); // Check every 500ms
        });
    }

    /**
     * Export session data in multiple formats
     */
    /**
     * Export session data in multiple formats
     * @param {string} format - Export format ('json', 'csv', 'excel')
     * @param {Array} selectedFields - Fields to include in export
     * @param {boolean} waitForPricing - Whether to wait for pricing data to load (default: true)
     * @returns {Promise<Object>} - Export data
     */
    async exportSession(format = 'json', selectedFields = null, waitForPricing = true) {
        if (!this.currentSession) {
            throw new Error('No active session to export');
        }
        
        // Wait for pricing data to load if requested
        if (waitForPricing && this.loadingPriceData.size > 0) {
            this.logger.info('Export waiting for pricing data to finish loading...');
            const pricingLoaded = await this.waitForPricingDataToLoad();
            if (!pricingLoaded) {
                this.logger.warn('Export proceeding despite some pricing data still loading');
            }
        }
        
        const baseData = {
            sessionId: this.currentSession.id,
            setName: this.currentSession.setName,
            startTime: this.currentSession.startTime,
            endTime: this.currentSession.endTime,
            statistics: this.currentSession.statistics,
            exportedAt: new Date().toISOString(),
            version: '2.1.0'
        };
        
        if (format === 'csv') {
            return this.exportSessionToCSV(selectedFields);
        } else if (format === 'excel') {
            return this.exportSessionToExcel(selectedFields);
        } else {
            // JSON format
            return {
                ...baseData,
                cards: this.currentSession.cards
            };
        }
    }

    /**
     * Export session to CSV format (Excel compatible)
     */
    exportSessionToCSV(selectedFields = null) {
        if (!this.currentSession || !this.currentSession.cards.length) {
            throw new Error('No cards in session to export');
        }
        
        // Default fields if none selected
        const defaultFields = [
            'cardName', 'rarity', 'setCode', 'cardNumber', 'timestamp', 
            'tcgLow', 'tcgMarket', 'sourceUrl', 'artVariant', 'condition', 'quantity'
        ];
        
        const fields = selectedFields || defaultFields;
        
        // Field mappings for display
        const fieldLabels = {
            cardName: 'Card Name',
            rarity: 'Rarity',
            setCode: 'Set Code',
            cardNumber: 'Card Number',
            timestamp: 'Added Time',
            price: 'Estimated Price',
            tcgLow: 'TCG Low Price',
            tcgMarket: 'TCG Market Price',
            sourceUrl: 'Source URL',
            artVariant: 'Art Variant',
            condition: 'Condition',
            quantity: 'Quantity',
            sessionId: 'Session ID',
            setName: 'Set Name'
        };
        
        // Generate CSV header
        const header = fields.map(field => fieldLabels[field] || field).join(',');
        
        // Generate CSV rows
        const rows = this.currentSession.cards.map(card => {
            return fields.map(field => {
                let value = '';
                switch (field) {
                    case 'cardName':
                        value = card.name || '';
                        break;
                    case 'rarity':
                        value = card.card_rarity || card.rarity || '';
                        break;
                    case 'setCode':
                        value = card.set_code || card.setCode || this.currentSession.setId || '';
                        break;
                    case 'cardNumber':
                        value = card.card_number || '';
                        break;
                    case 'timestamp':
                        value = card.timestamp ? new Date(card.timestamp).toLocaleString() : '';
                        break;
                    case 'price':
                        // Fallback price field - use market price first, then low price
                        value = card.tcg_market_price || card.tcg_price || card.price || '0.00';
                        break;
                    case 'tcgLow':
                        value = card.tcg_price || '0.00';
                        break;
                    case 'tcgMarket':
                        value = card.tcg_market_price || '0.00';
                        break;
                    case 'sourceUrl':
                        value = card.source_url || '';
                        break;
                    case 'artVariant':
                        value = card.art_variant || card.card_art_variant || 'N/A';
                        break;
                    case 'condition':
                        value = card.condition || 'Near Mint';
                        break;
                    case 'quantity':
                        value = card.quantity || '1';
                        break;
                    case 'sessionId':
                        value = this.currentSession.id;
                        break;
                    case 'setName':
                        value = this.currentSession.setName;
                        break;
                    default:
                        value = card[field] || '';
                }
                
                // Escape commas and quotes for CSV
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    value = `"${value.replace(/"/g, '""')}"`;
                }
                
                return value;
            }).join(',');
        });
        
        // Calculate totals for numeric fields
        const totals = {};
        const numericFields = ['quantity', 'tcgLow', 'tcgMarket', 'price'];
        
        // Initialize totals
        numericFields.forEach(field => {
            totals[field] = 0;
        });
        
        // Calculate totals
        this.currentSession.cards.forEach(card => {
            const quantity = parseFloat(card.quantity) || 1;
            
            // For quantity, just sum up
            if (fields.includes('quantity')) {
                totals.quantity += quantity;
            }
            
            // For prices, multiply by quantity to get total value
            if (fields.includes('tcgLow')) {
                const tcgLow = parseFloat(card.tcg_price) || 0;
                totals.tcgLow += tcgLow * quantity;
            }
            
            if (fields.includes('tcgMarket')) {
                const tcgMarket = parseFloat(card.tcg_market_price) || 0;
                totals.tcgMarket += tcgMarket * quantity;
            }
            
            if (fields.includes('price')) {
                const price = parseFloat(card.tcg_market_price || card.tcg_price || card.price) || 0;
                totals.price += price * quantity;
            }
        });
        
        // Generate totals row
        const totalsRow = fields.map(field => {
            switch (field) {
                case 'cardName':
                    return 'TOTAL';
                case 'quantity':
                    return totals.quantity.toString();
                case 'tcgLow':
                    return totals.tcgLow.toFixed(2);
                case 'tcgMarket':
                    return totals.tcgMarket.toFixed(2);
                case 'price':
                    return totals.price.toFixed(2);
                default:
                    return '';
            }
        }).join(',');
        
        const csvContent = [header, ...rows, totalsRow].join('\n');
        
        return {
            content: csvContent,
            filename: `YGO_Session_${this.currentSession.setName}_${new Date().toISOString().split('T')[0]}.csv`,
            mimeType: 'text/csv'
        };
    }

    /**
     * Export session to Excel format (Excel compatible CSV)
     */
    exportSessionToExcel(selectedFields = null) {
        // For now, Excel export is the same as CSV export since it's Excel compatible
        // In the future, this could be enhanced to generate actual .xlsx files
        const csvExport = this.exportSessionToCSV(selectedFields);
        
        return {
            content: csvExport.content,
            filename: csvExport.filename.replace('.csv', '.csv'), // Keep as CSV for Excel compatibility
            mimeType: 'text/csv'
        };
    }

    /**
     * Generate downloadable export file
     * @param {string} format - Export format ('json', 'csv', 'excel')
     * @param {Array} selectedFields - Fields to include in export
     * @param {boolean} waitForPricing - Whether to wait for pricing data to load (default: true)
     * @returns {Promise<Object>} - Export file data
     */
    async generateExportFile(format = 'json', selectedFields = null, waitForPricing = true) {
        const exportData = await this.exportSession(format, selectedFields, waitForPricing);
        
        let content, filename, mimeType;
        
        if (format === 'csv') {
            content = exportData.content;
            filename = exportData.filename;
            mimeType = exportData.mimeType;
        } else {
            // JSON format
            content = JSON.stringify(exportData, null, 2);
            filename = `YGO_Session_${this.currentSession.setName}_${new Date().toISOString().split('T')[0]}.json`;
            mimeType = 'application/json';
        }
        
        // Create blob and download URL
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        return {
            blob,
            url,
            filename,
            cleanup: () => URL.revokeObjectURL(url)
        };
    }

    /**
     * Process card images (similar to addCard logic)
     * Ensures card images are properly extracted and set
     */
    processCardImages(card) {
        try {
            // Extract image URLs from card_images array if available (YGO API format)
            if (card.card_images && Array.isArray(card.card_images) && card.card_images.length > 0) {
                const firstImage = card.card_images[0];
                card.image_url = firstImage.image_url || card.image_url;
                card.image_url_small = firstImage.image_url_small || card.image_url_small;
                card.image_url_cropped = firstImage.image_url_cropped || card.image_url_cropped;
                this.logger.debug(`Processed image URLs from card_images for card ${card.name || card.id}: ${firstImage.image_url}`);
            }
            
            // Ensure at least some image URL exists if not already set
            if (!card.image_url && !card.image_url_small && !card.image_url_cropped) {
                // Try to construct a basic image URL if we have card ID or name
                if (card.id && typeof card.id === 'number') {
                    // YGO API format image URLs
                    card.image_url = `https://storage.googleapis.com/ygoprodeck.com/pics/${card.id}.jpg`;
                    card.image_url_small = `https://storage.googleapis.com/ygoprodeck.com/pics_small/${card.id}.jpg`;
                    card.image_url_cropped = `https://storage.googleapis.com/ygoprodeck.com/pics_artgame/${card.id}.jpg`;
                    this.logger.debug(`Generated image URLs for card ${card.name || card.id} using card ID: ${card.id}`);
                }
            }
            
            return card;
        } catch (error) {
            this.logger.warn('Failed to process card images:', error);
            return card;
        }
    }

    /**
     * Import session data
     * Supports both new format (with setId) and legacy format (with cards array)
     */
    async importSession(sessionData) {
        try {
            // Validate session data
            if (!sessionData) {
                throw new Error('Invalid session data: No data provided');
            }
            
            // Stop current session if active
            if (this.sessionActive) {
                await this.stopSession();
            }
            
            let processedSession;
            
            // Check if this is legacy format (has cards array but no setId)
            if (!sessionData.setId && Array.isArray(sessionData.cards)) {
                this.logger.info('Detected legacy session format, converting...');
                processedSession = await this.convertLegacySessionFormat(sessionData);
            } else if (sessionData.setId) {
                // New format - use as is but still clean up any contaminated data
                this.logger.info('Detected new session format');
                processedSession = {
                    ...sessionData,
                    id: this.generateSessionId(), // Generate new ID
                    importedAt: new Date().toISOString()
                };
                
                // Clean up cards in new format as well
                if (processedSession.cards && Array.isArray(processedSession.cards)) {
                    processedSession.cards = processedSession.cards.map((card, index) => {
                        if (!card || typeof card !== 'object') {
                            return card;
                        }
                        
                        const cleanedCard = { ...card };
                        
                        // Clean up contaminated set name fields
                        if (cleanedCard.booster_set_name && cleanedCard.booster_set_name.includes('?')) {
                            const cleanSetName = cleanedCard.booster_set_name.split('?')[0].trim();
                            this.logger.debug(`Cleaned booster_set_name in new format: "${cleanedCard.booster_set_name}" -> "${cleanSetName}"`);
                            cleanedCard.booster_set_name = cleanSetName;
                        }
                        
                        // Ensure pricing data integrity for imported cards
                        if (cleanedCard.tcg_price || cleanedCard.tcg_market_price) {
                            // Mark this card as having valid imported pricing data
                            cleanedCard.importedPricing = true;
                            cleanedCard.price_status = cleanedCard.price_status || 'imported';
                            
                            // Ensure price field is set for compatibility
                            if (!cleanedCard.price) {
                                cleanedCard.price = parseFloat(cleanedCard.tcg_market_price || cleanedCard.tcg_price || '0');
                            }
                            
                            this.logger.info(`[IMPORT DEBUG - NEW FORMAT] Preserved pricing for ${cleanedCard.name}: TCG Low: $${cleanedCard.tcg_price}, TCG Market: $${cleanedCard.tcg_market_price}, Status: ${cleanedCard.price_status}, ImportedPricing: ${cleanedCard.importedPricing}`);
                        } else {
                            this.logger.warn(`[IMPORT DEBUG - NEW FORMAT] Card ${cleanedCard.name} has no pricing data to preserve`);
                        }
                        
                        return cleanedCard;
                    });
                }
            } else {
                throw new Error('Invalid session data: Missing required fields (setId or cards array)');
            }
            
            // Set as current session
            this.currentSession = processedSession;
            
            // Process images for all cards in the session and ensure pricing data integrity
            if (this.currentSession.cards && Array.isArray(this.currentSession.cards)) {
                this.currentSession.cards = this.currentSession.cards.map((card, index) => {
                    // Process images
                    const processedCard = this.processCardImages(card);
                    
                    // Log pricing data for imported cards to help with debugging
                    if (processedCard.tcg_price || processedCard.tcg_market_price) {
                        this.logger.info(`[FINAL IMPORT DEBUG] Imported card ${index + 1} "${processedCard.name}" final pricing: TCG Low: $${processedCard.tcg_price || 'N/A'}, TCG Market: $${processedCard.tcg_market_price || 'N/A'}, Status: ${processedCard.price_status || 'N/A'}, ImportedPricing: ${processedCard.importedPricing}`);
                    } else {
                        this.logger.warn(`[FINAL IMPORT DEBUG] Imported card ${index + 1} "${processedCard.name}" has no pricing data after processing`);
                    }
                    
                    return processedCard;
                });
                this.logger.info(`Processed images and verified pricing for ${this.currentSession.cards.length} imported cards`);
            }
            
            // Find the set
            if (processedSession.setId) {
                this.currentSet = this.cardSets.find(s => s.id === processedSession.setId || s.code === processedSession.setId || s.name === processedSession.setId);
                
                // Load set cards if we found the set (but don't fail import if this fails)
                if (this.currentSet) {
                    try {
                        await this.loadSetCards(this.currentSet.id);
                    } catch (setCardsError) {
                        this.logger.warn(`Could not load set cards for ${this.currentSet.id}, but import will continue: ${setCardsError.message}`);
                    }
                } else {
                    this.logger.warn(`Could not find card set for ID: ${processedSession.setId}`);
                }
            }
            
            this.sessionActive = true;
            
            this.emitSessionUpdate(this.currentSession);
            
            // Validate pricing data integrity for debugging
            this.validateImportedPricingData();
            
            this.logger.info(`Session imported successfully with ${this.currentSession.cards.length} cards`);
            return this.currentSession;
            
        } catch (error) {
            this.logger.error('Failed to import session:', error);
            throw error;
        }
    }

    /**
     * Convert legacy session format to new format
     * Legacy format: { cards: [...], current_set: "...", set_cards: [...], last_saved: "..." }
     * New format: { id: "...", setId: "...", setName: "...", cards: [...], startTime: "...", ... }
     */
    async convertLegacySessionFormat(legacyData) {
        try {
            this.logger.info('Converting legacy session format...');
            
            // Extract cards array
            const cards = legacyData.cards || [];
            this.logger.info(`[IMPORT DEBUG] Starting conversion of ${cards.length} cards from legacy format`);
            
            // Log first few cards for debugging
            if (cards.length > 0) {
                this.logger.info(`[IMPORT DEBUG] Sample cards from import:`, cards.slice(0, 3).map(card => ({
                    name: card?.name || card?.card_name,
                    rarity: card?.card_rarity || card?.rarity,
                    tcg_price: card?.tcg_price,
                    tcg_market_price: card?.tcg_market_price,
                    set_code: card?.set_code,
                    card_number: card?.card_number,
                    type: typeof card,
                    hasName: !!(card?.name || card?.card_name)
                })));
            }
            
            // Determine set information
            let setId = null;
            let setName = null;
            
            // Try to extract set info from current_set field
            if (legacyData.current_set) {
                if (typeof legacyData.current_set === 'string') {
                    setName = legacyData.current_set;
                    setId = legacyData.current_set;
                } else if (typeof legacyData.current_set === 'object') {
                    setName = legacyData.current_set.name || legacyData.current_set.set_name;
                    setId = legacyData.current_set.id || legacyData.current_set.code || legacyData.current_set.set_code;
                }
            }
            
            // If no set info from current_set, try to infer from first card
            if (!setId && cards.length > 0) {
                const firstCard = cards[0];
                
                // Try various fields that might contain set info, prioritizing clean fields
                if (firstCard.target_set_name) {
                    setName = firstCard.target_set_name;
                    setId = firstCard.set_code || firstCard.target_set_name;
                    this.logger.debug(`Using target_set_name: ${setName} (${setId})`);
                } else if (firstCard.set_code && firstCard.set_code !== 'N/A') {
                    setId = firstCard.set_code;
                    // Try to find a clean set name, avoiding contaminated booster_set_name
                    if (firstCard.set_name && !firstCard.set_name.includes('?')) {
                        setName = firstCard.set_name;
                    } else {
                        setName = firstCard.set_code; // Fallback to set code
                    }
                    this.logger.debug(`Using set_code: ${setName} (${setId})`);
                } else if (firstCard.card_sets && Array.isArray(firstCard.card_sets) && firstCard.card_sets.length > 0) {
                    const cardSet = firstCard.card_sets[0];
                    setName = cardSet.set_name;
                    setId = cardSet.set_code;
                    this.logger.debug(`Extracted set info from card_sets: ${setName} (${setId})`);
                } else if (firstCard.booster_set_name) {
                    // Use booster_set_name as last resort, but clean it up
                    let cleanBoosterSetName = firstCard.booster_set_name;
                    if (cleanBoosterSetName.includes('?')) {
                        cleanBoosterSetName = cleanBoosterSetName.split('?')[0].trim();
                        this.logger.debug(`Cleaned booster_set_name for set extraction: "${firstCard.booster_set_name}" -> "${cleanBoosterSetName}"`);
                    }
                    setName = cleanBoosterSetName;
                    setId = firstCard.set_code || cleanBoosterSetName;
                }
                
                // Additional fallback - look for common set-related fields
                if (!setId) {
                    if (firstCard.set_name && firstCard.set_code) {
                        setName = firstCard.set_name;
                        setId = firstCard.set_code;
                    } else if (firstCard.card_name && firstCard.card_name.includes(' - ')) {
                        // Try to extract set from card name format like "Card Name - Set Name (CODE)"
                        const nameParts = firstCard.card_name.split(' - ');
                        if (nameParts.length > 1) {
                            const setInfo = nameParts[1];
                            const codeMatch = setInfo.match(/\(([^)]+)\)$/);
                            if (codeMatch) {
                                setId = codeMatch[1];
                                setName = setInfo.replace(/\s*\([^)]+\)$/, '');
                            } else {
                                setName = setInfo;
                                setId = setInfo;
                            }
                        }
                    }
                }
            }
            
            // Use fallback if still no set info
            if (!setId) {
                setId = 'imported-session';
                setName = 'Imported Session';
                this.logger.warn('Could not determine set information from legacy data, using fallback');
            }
            
            // Process cards to ensure they have required fields and clean up data
            const processedCards = [];
            const skippedCards = [];
            
            this.logger.info(`[IMPORT DEBUG] Processing ${cards.length} cards...`);
            
            cards.forEach((card, index) => {
                this.logger.debug(`[IMPORT DEBUG] Processing card ${index + 1}/${cards.length}:`, {
                    name: card?.name || card?.card_name,
                    type: typeof card,
                    isNull: card === null,
                    isUndefined: card === undefined,
                    isObject: typeof card === 'object' && card !== null
                });
                
                // Basic validation - only skip truly invalid objects
                if (!card || typeof card !== 'object') {
                    this.logger.warn(`[IMPORT DEBUG] Skipping invalid card at index ${index}: ${card} (type: ${typeof card})`);
                    skippedCards.push({
                        index,
                        reason: 'Invalid card object',
                        card: card,
                        type: typeof card
                    });
                    return;
                }
                
                // Check for card name - be more flexible about the source
                const cardName = card.name || card.card_name;
                if (!cardName || typeof cardName !== 'string' || cardName.trim() === '') {
                    this.logger.warn(`[IMPORT DEBUG] Skipping card at index ${index}: Missing or invalid name. Card data:`, {
                        name: card.name,
                        card_name: card.card_name,
                        hasName: !!card.name,
                        hasCardName: !!card.card_name,
                        nameType: typeof card.name,
                        cardNameType: typeof card.card_name,
                        // Include some other fields for debugging
                        id: card.id,
                        tcg_price: card.tcg_price,
                        tcg_market_price: card.tcg_market_price
                    });
                    skippedCards.push({
                        index,
                        reason: 'Missing or invalid name',
                        card: {
                            name: card.name,
                            card_name: card.card_name,
                            id: card.id,
                            tcg_price: card.tcg_price,
                            tcg_market_price: card.tcg_market_price,
                            set_code: card.set_code
                        }
                    });
                    return;
                }
                
                this.logger.debug(`[IMPORT DEBUG] Card ${index + 1} "${cardName}" passed validation, processing...`);
                
                const processedCard = {
                    // Preserve all original card data
                    ...card,
                    // Ensure required fields exist
                    id: card.id || this.generateCardId(),
                    quantity: typeof card.quantity === 'number' ? card.quantity : 1,
                    addedAt: card.timestamp || card.addedAt || new Date().toISOString(),
                    // Ensure name exists
                    name: cardName
                };
                
                // Debug: Log the original card data for pricing fields
                this.logger.info(`[CARD PROCESSING DEBUG] Original card ${index + 1} "${cardName}": tcg_price=${card.tcg_price}, tcg_market_price=${card.tcg_market_price}, price_status=${card.price_status}`);
                
                // Clean up contaminated set name fields (remove URL fragments)
                if (processedCard.booster_set_name && processedCard.booster_set_name.includes('?')) {
                    const cleanSetName = processedCard.booster_set_name.split('?')[0].trim();
                    this.logger.debug(`Cleaned booster_set_name: "${processedCard.booster_set_name}" -> "${cleanSetName}"`);
                    processedCard.booster_set_name = cleanSetName;
                }
                
                // Ensure pricing data integrity for imported cards
                if (card.tcg_price || card.tcg_market_price) {
                    // Mark this card as having valid imported pricing data
                    processedCard.importedPricing = true;
                    processedCard.price_status = processedCard.price_status || 'imported';
                    
                    // Ensure price field is set for compatibility
                    if (!processedCard.price) {
                        processedCard.price = parseFloat(card.tcg_market_price || card.tcg_price || '0');
                    }
                    
                    this.logger.info(`[IMPORT DEBUG] Preserved pricing for ${processedCard.name}: TCG Low: $${card.tcg_price}, TCG Market: $${card.tcg_market_price}, Status: ${processedCard.price_status}, ImportedPricing: ${processedCard.importedPricing}`);
                } else {
                    this.logger.debug(`[IMPORT DEBUG] Card ${processedCard.name} has no pricing data to preserve`);
                }
                
                // Process images for this card
                const finalCard = this.processCardImages(processedCard);
                processedCards.push(finalCard);
                
                this.logger.debug(`[IMPORT DEBUG] Successfully processed card ${index + 1}: "${cardName}"`);
            });
            
            // Log comprehensive import summary
            this.logger.info(`[IMPORT SUMMARY] Import processing complete:`, {
                totalInputCards: cards.length,
                successfullyProcessed: processedCards.length,
                skippedCards: skippedCards.length,
                skippedReasons: skippedCards.reduce((acc, skip) => {
                    acc[skip.reason] = (acc[skip.reason] || 0) + 1;
                    return acc;
                }, {})
            });
            
            // Log details about skipped cards
            if (skippedCards.length > 0) {
                this.logger.warn(`[IMPORT SUMMARY] Skipped cards details:`, skippedCards);
                skippedCards.forEach(skipped => {
                    this.logger.warn(`[IMPORT SUMMARY] Skipped card at index ${skipped.index}: ${skipped.reason}`, skipped.card);
                });
            }
            
            // Calculate statistics
            const statistics = this.calculateSessionStatistics(processedCards);
            
            // Create new format session
            const convertedSession = {
                id: this.generateSessionId(),
                setId: setId,
                setName: setName,
                cards: processedCards,
                startTime: legacyData.last_saved || new Date().toISOString(),
                endTime: null, // Session is being imported as active
                importedAt: new Date().toISOString(),
                legacyImport: true,
                statistics: statistics
            };
            
            this.logger.info(`[IMPORT SUMMARY] Converted legacy session: ${processedCards.length}/${cards.length} cards processed successfully, set: ${setName}`);
            
            return convertedSession;
            
        } catch (error) {
            this.logger.error('Failed to convert legacy session format:', error);
            throw new Error(`Failed to convert legacy session format: ${error.message}`);
        }
    }

    /**
     * Calculate session statistics from cards array
     */
    calculateSessionStatistics(cards) {
        const stats = {
            totalCards: 0,
            tcgLowTotal: 0,
            tcgMarketTotal: 0,
            rarityBreakdown: {},
            sessionDuration: 0
        };
        
        cards.forEach(card => {
            const quantity = card.quantity || 1;
            stats.totalCards += quantity;
            
            // Calculate separate totals for TCG Low and Market prices
            // Fix: Properly parse string prices and check for valid numbers
            const tcgLowPrice = parseFloat(card.tcg_price);
            if (card.tcg_price && !isNaN(tcgLowPrice) && tcgLowPrice > 0) {
                stats.tcgLowTotal += tcgLowPrice * quantity;
                this.logger.debug(`Added TCG Low: ${card.name} - $${tcgLowPrice} x ${quantity} = $${tcgLowPrice * quantity}`);
            }
            
            const tcgMarketPrice = parseFloat(card.tcg_market_price);
            if (card.tcg_market_price && !isNaN(tcgMarketPrice) && tcgMarketPrice > 0) {
                stats.tcgMarketTotal += tcgMarketPrice * quantity;
                this.logger.debug(`Added TCG Market: ${card.name} - $${tcgMarketPrice} x ${quantity} = $${tcgMarketPrice * quantity}`);
            }
            
            // Count rarity breakdown
            const rarity = card.card_rarity || card.rarity || 'Unknown';
            stats.rarityBreakdown[rarity] = (stats.rarityBreakdown[rarity] || 0) + quantity;
        });
        
        this.logger.info(`Session statistics calculated: ${stats.totalCards} cards, TCG Low Total: $${stats.tcgLowTotal.toFixed(2)}, TCG Market Total: $${stats.tcgMarketTotal.toFixed(2)}`);
        return stats;
    }

    /**
     * Start auto-save
     */
    startAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }
        
        this.autoSaveTimer = this.setTrackedInterval(async () => {
            if (this.sessionActive) {
                await this.saveSession();
            }
        }, this.config.autoSaveInterval);
        
        this.logger.debug('Auto-save started');
    }

    /**
     * Stop auto-save
     */
    stopAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
        
        this.logger.debug('Auto-save stopped');
    }

    // Utility methods
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    generateCardId() {
        return `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get information about cards with imported pricing data
     * @returns {Object} - Statistics about imported cards
     */
    getImportedCardsInfo() {
        if (!this.currentSession || !this.currentSession.cards) {
            return {
                totalCards: 0,
                importedCards: 0,
                cardsWithPricing: 0,
                importedCardsWithPricing: 0
            };
        }
        
        const totalCards = this.currentSession.cards.length;
        const importedCards = this.currentSession.cards.filter(card => 
            card.importedPricing === true || 
            card.price_status === 'imported' || 
            card.price_status === 'loaded'
        );
        const cardsWithPricing = this.currentSession.cards.filter(card => 
            card.tcg_price || card.tcg_market_price
        );
        const importedCardsWithPricing = importedCards.filter(card => 
            card.tcg_price || card.tcg_market_price
        );
        
        return {
            totalCards,
            importedCards: importedCards.length,
            cardsWithPricing: cardsWithPricing.length,
            importedCardsWithPricing: importedCardsWithPricing.length,
            hasImportedCards: importedCards.length > 0
        };
    }

    // Getter methods
    getCardSets() {
        return [...this.cardSets];
    }

    getCurrentSession() {
        return this.currentSession;
    }

    getCurrentSessionInfo() {
        if (!this.currentSession) {
            return {
                isActive: false,
                setName: 'None',
                cardCount: 0,
                status: 'No active session',
                statistics: {
                    tcgLowTotal: 0,
                    tcgMarketTotal: 0
                }
            };
        }
        
        return {
            isActive: this.sessionActive,
            setName: this.currentSession.setName,
            cardCount: this.currentSession.cards.length,
            status: this.sessionActive ? 'Active' : 'Stopped',
            sessionId: this.currentSession.id,
            startTime: this.currentSession.startTime,
            cards: this.currentSession.cards,
            statistics: this.currentSession.statistics
        };
    }

    isSessionActive() {
        return this.sessionActive;
    }

    /**
     * Event handling
     */
    onSessionStart(callback) {
        this.listeners.sessionStart.push(callback);
    }

    onSessionStop(callback) {
        this.listeners.sessionStop.push(callback);
    }

    onSessionUpdate(callback) {
        this.listeners.sessionUpdate.push(callback);
    }

    onCardAdded(callback) {
        this.listeners.cardAdded.push(callback);
    }

    onCardUpdated(callback) {
        this.addEventListener('cardUpdated', callback);
    }

    onCardRemoved(callback) {
        this.listeners.cardRemoved.push(callback);
    }

    onSessionClear(callback) {
        this.listeners.sessionClear.push(callback);
    }

    /**
     * Register a callback for set switched events
     * @param {Function} callback - The callback function
     */
    onSetSwitched(callback) {
        this.listeners.setSwitched.push(callback);
    }

    emitSessionStart(session) {
        this.listeners.sessionStart.forEach(callback => {
            try {
                callback(session);
            } catch (error) {
                this.logger.error('Error in session start callback:', error);
            }
        });
    }

    emitSessionStop(session) {
        this.listeners.sessionStop.forEach(callback => {
            try {
                callback(session);
            } catch (error) {
                this.logger.error('Error in session stop callback:', error);
            }
        });
    }

    emitSessionUpdate(session) {
        this.listeners.sessionUpdate.forEach(callback => {
            try {
                callback(session);
            } catch (error) {
                this.logger.error('Error in session update callback:', error);
            }
        });
    }

    emitCardAdded(card) {
        this.listeners.cardAdded.forEach(callback => {
            try {
                callback(card);
            } catch (error) {
                this.logger.error('Error in card added callback:', error);
            }
        });
    }

    emitCardRemoved(card) {
        this.listeners.cardRemoved.forEach(callback => {
            try {
                callback(card);
            } catch (error) {
                this.logger.error('Error in card removed callback:', error);
            }
        });
    }

    emitSessionClear() {
        this.listeners.sessionClear.forEach(callback => {
            try {
                callback();
            } catch (error) {
                this.logger.error('Error in session clear callback:', error);
            }
        });
    }

    /**
     * General event emitter method
     */
    emit(eventName, data) {
        if (this.listeners[eventName]) {
            this.listeners[eventName].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    this.logger.error(`Error in ${eventName} callback:`, error);
                }
            });
        }
    }

    /**
     * Add event listener
     */
    addEventListener(eventName, callback) {
        if (!this.listeners[eventName]) {
            this.listeners[eventName] = [];
        }
        this.listeners[eventName].push(callback);
    }

    /**
     * Remove event listener
     */
    removeEventListener(eventName, callback) {
        if (this.listeners[eventName]) {
            const index = this.listeners[eventName].indexOf(callback);
            if (index > -1) {
                this.listeners[eventName].splice(index, 1);
            }
        }
    }

    /**
     * Debug method to validate pricing data integrity for imported sessions
     * This helps identify if pricing data is being lost or overwritten
     */
    validateImportedPricingData() {
        if (!this.currentSession || !this.currentSession.cards) {
            this.logger.warn('No session or cards to validate');
            return;
        }
        
        const report = {
            totalCards: this.currentSession.cards.length,
            cardsWithPricing: 0,
            cardsWithImportedPricing: 0,
            cardsWithContaminatedSetNames: 0,
            pricingMismatches: []
        };
        
        this.currentSession.cards.forEach((card, index) => {
            // Check pricing data
            if (card.tcg_price || card.tcg_market_price) {
                report.cardsWithPricing++;
                
                if (card.importedPricing === true || card.price_status === 'imported' || card.price_status === 'loaded') {
                    report.cardsWithImportedPricing++;
                }
            }
            
            // Check for contaminated set names
            if (card.booster_set_name && card.booster_set_name.includes('?')) {
                report.cardsWithContaminatedSetNames++;
                this.logger.warn(`Card ${index + 1} "${card.name}" has contaminated booster_set_name: "${card.booster_set_name}"`);
            }
            
            // Log detailed pricing info for first few cards
            if (index < 3) {
                this.logger.info(`Card ${index + 1} "${card.name}" pricing details:`, {
                    tcg_price: card.tcg_price,
                    tcg_market_price: card.tcg_market_price,
                    price: card.price,
                    price_status: card.price_status,
                    importedPricing: card.importedPricing,
                    booster_set_name: card.booster_set_name,
                    target_set_name: card.target_set_name,
                    set_code: card.set_code
                });
            }
        });
        
        this.logger.info('Import pricing validation report:', report);
        return report;
    }
    
    /**
     * Initialize advanced session management features
     */
    initializeAdvancedFeatures() {
        // Initialize theme state caching system
        this.themeStateCache = new Map();
        this.currentTheme = 'legacy'; // Default theme
        
        // Set up theme detection
        this.detectCurrentTheme();
        
        // Initialize session metrics
        this.sessionMetrics.startTime = new Date().toISOString();
        
        // Set up theme change listeners
        if (typeof window !== 'undefined') {
            window.addEventListener('themeChanged', (event) => {
                this.handleThemeChange(event.detail);
            });
        }
        
        // Initialize bulk operations system
        this.setupBulkOperations();
        
        this.logger.debug('Advanced session management features initialized');
    }
    
    /**
     * Detect current active theme
     */
    detectCurrentTheme() {
        if (typeof document !== 'undefined') {
            if (document.body.classList.contains('space-theme') || 
                document.querySelector('.space-layout.active')) {
                this.currentTheme = 'space';
            } else {
                this.currentTheme = 'legacy';
            }
        }
        this.logger.debug('Current theme detected:', this.currentTheme);
    }
    
    /**
     * Handle theme change events with session state preservation
     */
    handleThemeChange(themeInfo) {
        this.logger.info('Handling theme change for session management:', themeInfo);
        
        // Cache current theme state
        this.cacheThemeState(this.currentTheme);
        
        const oldTheme = this.currentTheme;
        this.currentTheme = themeInfo.theme || 'legacy';
        
        // Restore session data for new theme
        this.restoreThemeState(this.currentTheme);
        
        // Refresh session display in new theme
        this.refreshSessionDisplay();
        
        this.logger.debug(`Session theme switched: ${oldTheme} → ${this.currentTheme}`);
    }
    
    /**
     * Cache current theme state
     */
    cacheThemeState(theme) {
        // Defensive check: ensure themeStateCache is initialized
        if (!this.themeStateCache) {
            this.logger.warn('themeStateCache not initialized, creating new Map');
            this.themeStateCache = new Map();
        }

        const state = {
            sessionData: this.currentSession ? { ...this.currentSession } : null,
            activeSet: this.currentSet,
            searchTerm: this.searchTerm,
            filteredSets: [...this.filteredCardSets],
            timestamp: Date.now()
        };
        
        this.themeStateCache.set(theme, state);
        this.logger.debug(`Cached state for theme: ${theme}`);
    }
    
    /**
     * Restore theme state
     */
    restoreThemeState(theme) {
        // Defensive check: ensure themeStateCache is initialized
        if (!this.themeStateCache) {
            this.logger.warn('themeStateCache not initialized in restoreThemeState');
            this.themeStateCache = new Map();
            return; // No cached state to restore
        }

        const cachedState = this.themeStateCache.get(theme);
        if (!cachedState) return;
        
        // Restore session data if available
        if (cachedState.sessionData) {
            this.currentSession = { ...cachedState.sessionData };
        }
        
        // Restore set data
        this.currentSet = cachedState.activeSet;
        this.searchTerm = cachedState.searchTerm;
        this.filteredCardSets = [...cachedState.filteredSets];
        
        this.logger.debug(`Restored state for theme: ${theme}`);
    }
    
    /**
     * Setup bulk operations system
     */
    setupBulkOperations() {
        // Initialize bulk operation queue processor
        this.bulkProcessor = {
            queue: [],
            processing: false,
            results: [],
            errors: []
        };
        
        this.logger.debug('Bulk operations system initialized');
    }
    
    /**
     * Advanced bulk operations: Process multiple cards in batch
     */
    async processBulkCardOperation(operation, cardDataArray, options = {}) {
        if (!this.config.enableBulkOperations) {
            throw new Error('Bulk operations are disabled');
        }
        
        const startTime = performance.now();
        const results = {
            operation,
            totalCards: cardDataArray.length,
            successful: 0,
            failed: 0,
            results: [],
            errors: [],
            processingTime: 0
        };
        
        this.logger.info(`Starting bulk ${operation} operation for ${cardDataArray.length} cards`);
        
        // Process in chunks to avoid overwhelming the system
        const chunkSize = options.chunkSize || Math.min(this.config.maxBulkSize, 10);
        const chunks = [];
        for (let i = 0; i < cardDataArray.length; i += chunkSize) {
            chunks.push(cardDataArray.slice(i, i + chunkSize));
        }
        
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            
            if (options.onProgress) {
                options.onProgress(`Processing chunk ${i + 1}/${chunks.length}`);
            }
            
            // Process chunk based on operation type
            try {
                const chunkResults = await this.processBulkChunk(operation, chunk, options);
                results.results.push(...chunkResults.successes);
                results.errors.push(...chunkResults.errors);
                results.successful += chunkResults.successes.length;
                results.failed += chunkResults.errors.length;
                
            } catch (error) {
                this.logger.error(`Bulk operation chunk ${i + 1} failed:`, error);
                results.errors.push({
                    chunk: i + 1,
                    error: error.message
                });
                results.failed += chunk.length;
            }
            
            // Add delay between chunks if specified
            if (i < chunks.length - 1 && options.delayBetweenChunks) {
                await new Promise(resolve => setTimeout(resolve, options.delayBetweenChunks));
            }
        }
        
        results.processingTime = performance.now() - startTime;
        
        // Update session metrics
        this.sessionMetrics.totalOperations++;
        
        this.logger.info(`Bulk ${operation} completed:`, {
            total: results.totalCards,
            successful: results.successful,
            failed: results.failed,
            time: `${results.processingTime.toFixed(2)}ms`
        });
        
        return results;
    }
    
    /**
     * Process a chunk of cards for bulk operations
     */
    async processBulkChunk(operation, chunk, options) {
        const successes = [];
        const errors = [];
        
        const promises = chunk.map(async (cardData, index) => {
            try {
                let result;
                switch (operation) {
                    case 'import':
                        result = await this.importSingleCard(cardData);
                        break;
                    case 'export':
                        result = await this.exportSingleCard(cardData);
                        break;
                    case 'priceCheck':
                        result = await this.checkCardPrice(cardData);
                        break;
                    case 'validate':
                        result = this.validateCard(cardData);
                        break;
                    default:
                        throw new Error(`Unknown bulk operation: ${operation}`);
                }
                
                successes.push({ index, cardData, result });
            } catch (error) {
                errors.push({ index, cardData, error: error.message });
            }
        });
        
        await Promise.allSettled(promises);
        
        return { successes, errors };
    }
    
    /**
     * Enhanced export functionality with multiple format support
     */
    async exportSession(format = 'json', options = {}) {
        if (!this.currentSession) {
            throw new Error('No active session to export');
        }
        
        this.sessionMetrics.exportCount++;
        
        try {
            let exportData;
            let mimeType;
            let filename;
            
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            const sessionName = this.currentSession.sessionName || 'session';
            
            // Prepare export data with enhanced metadata
            const sessionData = {
                ...this.currentSession,
                exportMetadata: {
                    exportedAt: new Date().toISOString(),
                    exportedFrom: this.currentTheme,
                    version: '2.1.0',
                    format,
                    totalCards: this.currentSession.cards?.length || 0,
                    sessionMetrics: { ...this.sessionMetrics }
                }
            };
            
            switch (format.toLowerCase()) {
                case 'json':
                    exportData = JSON.stringify(sessionData, null, 2);
                    mimeType = 'application/json';
                    filename = `${sessionName}-${timestamp}.json`;
                    break;
                    
                case 'csv':
                    exportData = this.convertSessionToCSV(sessionData);
                    mimeType = 'text/csv';
                    filename = `${sessionName}-${timestamp}.csv`;
                    break;
                    
                case 'xlsx':
                    // For XLSX, we'd need a library like SheetJS
                    throw new Error('XLSX export not yet implemented - requires SheetJS library');
                    
                default:
                    throw new Error(`Unsupported export format: ${format}`);
            }
            
            // Create and trigger download
            if (options.returnData) {
                return { data: exportData, filename, mimeType };
            } else {
                this.triggerDownload(exportData, filename, mimeType);
                this.logger.info(`Session exported as ${format.toUpperCase()}: ${filename}`);
                return { success: true, filename };
            }
            
        } catch (error) {
            this.logger.error('Session export failed:', error);
            throw error;
        }
    }
    
    /**
     * Convert session to CSV format
     */
    convertSessionToCSV(sessionData) {
        if (!sessionData.cards || sessionData.cards.length === 0) {
            return 'No cards in session';
        }
        
        const headers = [
            'Card Name',
            'Card Number',
            'Set Code',
            'Rarity',
            'Quantity',
            'TCG Price',
            'Market Price',
            'Condition',
            'Import Date',
            'Price Last Updated'
        ];
        
        const rows = sessionData.cards.map(card => [
            card.name || '',
            card.number || card.card_number || '',
            card.set_code || '',
            card.rarity || card.card_rarity || '',
            card.quantity || 1,
            card.tcg_price || 0,
            card.tcg_market_price || card.market_price || 0,
            card.condition || 'near-mint',
            card.importDate || sessionData.created || '',
            card.last_price_updt || card.priceLastUpdated || ''
        ]);
        
        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');
            
        return csvContent;
    }
    
    /**
     * Enhanced import functionality with validation
     */
    async importSession(fileData, options = {}) {
        this.sessionMetrics.importCount++;
        
        try {
            let sessionData;
            
            // Parse the import data
            if (typeof fileData === 'string') {
                try {
                    sessionData = JSON.parse(fileData);
                } catch (error) {
                    throw new Error('Invalid JSON format in import file');
                }
            } else if (typeof fileData === 'object') {
                sessionData = fileData;
            } else {
                throw new Error('Invalid import data format');
            }
            
            // Validate import data
            const validation = this.validateImportData(sessionData);
            if (!validation.isValid) {
                throw new Error(`Import validation failed: ${validation.errors.join(', ')}`);
            }
            
            // Backup current session if it exists
            const backupData = this.currentSession ? { ...this.currentSession } : null;
            
            try {
                // Import the session
                this.currentSession = {
                    ...sessionData,
                    sessionId: sessionData.sessionId || this.generateSessionId(),
                    importedAt: new Date().toISOString(),
                    importedToTheme: this.currentTheme,
                    originalTheme: sessionData.exportMetadata?.exportedFrom || 'unknown'
                };
                
                // Update session state
                this.sessionActive = true;
                this.currentSet = sessionData.currentSet || null;
                
                // Refresh display in current theme
                await this.refreshSessionDisplay();
                
                // Validate imported pricing data
                const pricingReport = this.validateImportedPricingData();
                
                this.logger.info(`Session imported successfully: ${sessionData.cards?.length || 0} cards`);
                
                return {
                    success: true,
                    cardsImported: sessionData.cards?.length || 0,
                    validation,
                    pricingReport,
                    sessionId: this.currentSession.sessionId
                };
                
            } catch (importError) {
                // Restore backup on failure
                if (backupData) {
                    this.currentSession = backupData;
                }
                throw importError;
            }
            
        } catch (error) {
            this.logger.error('Session import failed:', error);
            throw error;
        }
    }
    
    /**
     * Validate import data structure
     */
    validateImportData(data) {
        const errors = [];
        const warnings = [];
        
        // Basic structure validation
        if (!data || typeof data !== 'object') {
            errors.push('Import data must be a valid object');
            return { isValid: false, errors, warnings };
        }
        
        // Check for required fields
        if (!data.sessionId && !data.sessionName) {
            warnings.push('No session identifier found');
        }
        
        if (!Array.isArray(data.cards)) {
            errors.push('Cards must be an array');
        } else {
            // Validate card structure
            data.cards.forEach((card, index) => {
                if (!card.name && !card.card_name) {
                    errors.push(`Card ${index + 1} is missing name`);
                }
                if (!card.number && !card.card_number) {
                    warnings.push(`Card ${index + 1} is missing card number`);
                }
            });
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            cardCount: Array.isArray(data.cards) ? data.cards.length : 0
        };
    }
    
    /**
     * Trigger file download
     */
    triggerDownload(data, filename, mimeType) {
        const blob = new Blob([data], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    /**
     * Get comprehensive session statistics
     */
    getEnhancedSessionStats() {
        const baseStats = this.getSessionStats();
        
        return {
            ...baseStats,
            theme: this.currentTheme,
            metrics: { ...this.sessionMetrics },
            bulkOperations: {
                enabled: this.config.enableBulkOperations,
                maxSize: this.config.maxBulkSize,
                queueLength: this.bulkOperationQueue.length,
                isProcessing: this.isBulkProcessing
            },
            themeStates: {
                cached: Array.from(this.themeStateCache.keys()),
                current: this.currentTheme
            },
            advanced: {
                sessionRecoveryEnabled: this.config.sessionRecoveryEnabled,
                performanceMonitoring: this.config.performanceMonitoring,
                supportedExportFormats: this.config.exportFormats
            }
        };
    }
    
    /**
     * Session recovery functionality
     */
    async recoverSession(sessionId) {
        if (!this.config.sessionRecoveryEnabled) {
            throw new Error('Session recovery is disabled');
        }
        
        try {
            // Try to load session from storage
            const recoveredData = await this.storage?.get(`session_backup_${sessionId}`);
            
            if (!recoveredData) {
                throw new Error(`No backup found for session: ${sessionId}`);
            }
            
            // Import the recovered session
            const result = await this.importSession(recoveredData, { isRecovery: true });
            
            this.logger.info(`Session recovered: ${sessionId}`);
            return result;
            
        } catch (error) {
            this.logger.error('Session recovery failed:', error);
            throw error;
        }
    }
    
    /**
     * Create session backup for recovery
     */
    async backupSession() {
        if (!this.config.sessionRecoveryEnabled || !this.currentSession) {
            return;
        }
        
        try {
            const backupData = {
                ...this.currentSession,
                backedUpAt: new Date().toISOString(),
                theme: this.currentTheme
            };
            
            if (this.storage) {
                await this.storage.set(
                    `session_backup_${this.currentSession.sessionId}`, 
                    backupData
                );
            }
            
            this.logger.debug('Session backup created');
        } catch (error) {
            this.logger.warn('Failed to create session backup:', error);
        }
    }
    
    /**
     * Clean up session-specific resources
     */
    cleanupSessionResources() {
        this.logger.info('Cleaning up session resources');
        
        // Stop auto-save timer if running
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
        
        // Clear event listeners
        Object.keys(this.listeners).forEach(type => {
            this.listeners[type] = [];
        });
        
        // Clear cached data structures
        this.setCards.clear();
        this.commonCardNames.clear();
        this.loadingPriceData.clear();
        
        // Clear session history (limit to prevent memory buildup)
        this.sessionHistory = this.sessionHistory.slice(0, 10); // Keep only 10 most recent
        
        // Clear current session data if active
        if (this.currentSession) {
            this.currentSession.cards = this.currentSession.cards.slice(-100); // Keep last 100 cards
        }
        
        // Clear component references
        this.voiceEngine = null;
        this.selectorMapper = null;
        
        this.logger.debug('Session resources cleaned up');
    }
    
    /**
     * Override destroy to include session-specific cleanup
     */
    destroy() {
        if (this.isDestroyed) {
            return;
        }
        
        this.logger.info('Destroying SessionManager');
        
        // Stop active session
        if (this.sessionActive) {
            try {
                this.stopSession();
            } catch (error) {
                this.logger.warn('Failed to stop session during destroy:', error);
            }
        }
        
        // Unregister from global memory manager
        globalMemoryManager.unregisterComponent(this);
        
        // Call parent destroy method
        super.destroy();
    }
}