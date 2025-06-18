/**
 * Session Manager - Pack Ripper Session Management
 * 
 * Provides comprehensive session management with feature parity to ygo_ripper.py:
 * - Pack ripper sessions with card tracking
 * - Voice input processing and card recognition
 * - Session persistence and recovery
 * - Statistics and analytics
 * - Import/export functionality
 * - Card set management
 */

import { Logger } from '../utils/Logger.js';

export class SessionManager {
    constructor(storage = null, logger = null) {
        this.storage = storage;
        this.logger = logger || new Logger('SessionManager');
        
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
        
        // Event listeners
        this.listeners = {
            sessionStart: [],
            sessionStop: [],
            sessionUpdate: [],
            cardAdded: [],
            cardRemoved: [],
            sessionClear: [],
            setsLoaded: [],
            setsFiltered: []
        };
        
        // Configuration
        this.config = {
            autoSave: true,
            autoSaveInterval: 30000, // 30 seconds
            maxSessionHistory: 50,
            cardMatchThreshold: 0.7,
            enableFuzzyMatching: true,
            apiTimeout: 30000 // 30 second timeout for API calls
        };
        
        // Auto-save timer
        this.autoSaveTimer = null;
        
        // Common card names cache for optimization
        this.commonCardNames = new Map();
        
        this.logger.info('SessionManager initialized');
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
        return 'http://127.0.0.1:8081';
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
                throw new Error('Request timed out. Please check if the backend is running on http://127.0.0.1:8081');
            }
            
            this.logger.error('[API DEBUG] Failed to fetch card sets from API:', error);
            this.logger.error('[API DEBUG] Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            
            // Provide more specific error messages for debugging
            if (error.message.includes('fetch') || error.message.includes('NetworkError')) {
                this.logger.error('[API DEBUG] Network error detected - backend may not be running or accessible');
                throw new Error('Cannot connect to backend API. Please ensure realBackendAPI.py backend is running on http://127.0.0.1:8081');
            }
            
            if (error.message.includes('ECONNREFUSED')) {
                this.logger.error('[API DEBUG] Connection refused - backend server is not listening on port 8081');
                throw new Error('Connection refused: Backend server is not running on port 8081. Please start realBackendAPI.py');
            }
            
            throw error;
        }
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
                const cards = data.data || [];
                
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
                throw new Error(`Request timed out loading cards for set ${setIdentifier}. Please check if the backend is running on http://127.0.0.1:8081`);
            } else {
                this.logger.error(`Failed to load cards for set ${setIdentifier}:`, error);
                throw error;
            }
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
                    totalValue: 0,
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
            if (this.sessionHistory.length > this.config.maxSessionHistory) {
                this.sessionHistory = this.sessionHistory.slice(0, this.config.maxSessionHistory);
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
     * Add a card to the current session
     */
    async addCard(cardData) {
        if (!this.sessionActive || !this.currentSession) {
            throw new Error('No active session');
        }
        
        try {
            // Enhance card data
            const enhancedCard = {
                id: this.generateCardId(),
                timestamp: new Date().toISOString(),
                sessionId: this.currentSession.id,
                ...cardData
            };
            
            // Add to session
            this.currentSession.cards.push(enhancedCard);
            
            // Update statistics
            this.updateSessionStatistics();
            
            // Emit events
            this.emitCardAdded(enhancedCard);
            this.emitSessionUpdate(this.currentSession);
            
            this.logger.info('Card added to session:', enhancedCard.name || enhancedCard.id);
            return enhancedCard;
            
        } catch (error) {
            this.logger.error('Failed to add card to session:', error);
            throw error;
        }
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
            this.logger.debug(`[RARITY EXTRACT] Testing pattern: ${pattern}`);
            const match = voiceText.match(pattern);
            if (match) {
                const rarity = match[0];
                const cardName = voiceText.replace(pattern, '').trim();
                this.logger.info(`[RARITY EXTRACT] SUCCESS - Extracted rarity: '${rarity}', remaining card name: '${cardName}'`);
                return { cardName, rarity };
            }
        }

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
     * Process voice input to identify cards
     */
    async processVoiceInput(transcript) {
        this.logger.info('Processing voice input:', transcript);
        
        if (!transcript || typeof transcript !== 'string') {
            return [];
        }

        // Step 1: Auto-extract rarity and art variant if enabled (matching oldIteration.py)
        let processedText = transcript;
        let extractedRarity = null;
        let extractedArtVariant = null;

        this.logger.debug(`[VOICE PROCESSING] Original transcript: "${transcript}"`);
        this.logger.debug(`[VOICE PROCESSING] Auto-extract rarity enabled: ${this.settings.autoExtractRarity}`);
        this.logger.debug(`[VOICE PROCESSING] Auto-extract art variant enabled: ${this.settings.autoExtractArtVariant}`);

        // Extract rarity information
        const rarityResult = this.extractRarityFromVoice(processedText);
        processedText = rarityResult.cardName;
        extractedRarity = rarityResult.rarity;

        // Extract art variant information
        const artResult = this.extractArtVariantFromVoice(processedText);
        processedText = artResult.cardName;
        extractedArtVariant = artResult.artVariant;

        if (extractedRarity || extractedArtVariant) {
            this.logger.info(`[VOICE PROCESSING] Extracted from voice - Rarity: "${extractedRarity}", Art Variant: "${extractedArtVariant}", Card Name: "${processedText}"`);
        } else {
            this.logger.debug(`[VOICE PROCESSING] No rarity or art variant extracted, using full transcript as card name: "${processedText}"`);
        }

        const cleanTranscript = processedText.toLowerCase().trim();
        const recognizedCards = [];
        
        try {
            // Method 1: Fuzzy matching (if enabled)
            if (this.config.enableFuzzyMatching) {
                const fuzzyMatches = await this.findCardsByFuzzyMatch(cleanTranscript, extractedRarity);
                recognizedCards.push(...fuzzyMatches);
            }
            
            // Method 2: Set-specific card matching (primary matching method)
            if (this.currentSet) {
                const setMatches = await this.findCardsInCurrentSet(cleanTranscript, extractedRarity);
                recognizedCards.push(...setMatches);
            }
            
            this.logger.info(`Found ${recognizedCards.length} potential card matches`);
            
            // Debug output of found cards
            if (recognizedCards.length > 0) {
                this.logger.debug(`[VOICE PROCESSING] Found cards:`, recognizedCards.map(card => 
                    `${card.name} - ${card.displayRarity || 'Unknown'} [${card.setInfo?.setCode || 'N/A'}] (${card.confidence}%)`
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
        
        // Second pass: Create variants for each matching card name with different rarities
        // Following the logic from oldIteration.py for proper rarity variant handling
        const allVariants = [];
        const processedCardNames = new Set();
        
        for (const match of initialMatches) {
            const cardName = match.name;
            
            // Skip if we already processed this card name
            if (processedCardNames.has(cardName)) {
                continue;
            }
            processedCardNames.add(cardName);
            
            // Find all cards with the same name (exact match)
            const matchingCards = setCards.filter(card => card.name === cardName);
            
            this.logger.debug(`[VARIANT] Found ${matchingCards.length} cards with name: ${cardName}`);
            
            // For each matching card, create variants based on card_sets array (like oldIteration.py)
            for (const card of matchingCards) {
                const cardSets = card.card_sets || [];
                
                this.logger.debug(`[VARIANT] Processing card "${card.name}" with ${cardSets.length} card_sets entries`);
                this.logger.debug(`[VARIANT] Card structure - name: "${card.name}", id: ${card.id}`);
                
                // Log the actual card structure for debugging
                if (cardSets.length > 0) {
                    this.logger.debug(`[VARIANT] First card_set example:`, JSON.stringify(cardSets[0], null, 2));
                    this.logger.debug(`[VARIANT] All card_sets:`, cardSets.map(cs => `${cs.set_rarity} [${cs.set_code}]`).join(', '));
                } else {
                    this.logger.debug(`[VARIANT] Card has no card_sets array. Skipping as per oldIteration.py logic.`);
                }
                
                // Only create variants from cards that have actual card_sets data (matching oldIteration.py logic)
                if (cardSets.length > 0) {
                    // Create a variant for each card_set entry (different rarities)
                    for (const cardSet of cardSets) {
                        // Skip card_sets entries without valid rarity (stricter filtering to eliminate Unknown variants)
                        const rarity = cardSet.set_rarity;
                        if (!rarity || 
                            rarity.trim() === '' || 
                            rarity.toLowerCase().trim() === 'unknown' ||
                            rarity.toLowerCase().trim() === 'n/a' ||
                            rarity.toLowerCase().trim() === 'undefined' ||
                            rarity.toLowerCase().trim() === 'null') {
                            this.logger.debug(`[VARIANT] Skipping card_set with invalid rarity: "${rarity}" for card: ${card.name}`);
                            continue;
                        }
                        
                        const setCode = cardSet.set_code || 'N/A';
                        
                        this.logger.debug(`[VARIANT] Processing valid card_set: rarity="${rarity}", setCode="${setCode}" for card: ${card.name}`);
                        
                        // Apply rarity filtering when extractedRarity is provided (like oldIteration.py)
                        let confidence = match.confidence;
                        if (extractedRarity) {
                            const rarityScore = this.calculateRarityScore(extractedRarity, rarity);
                            this.logger.debug(`[VARIANT] Rarity matching: "${extractedRarity}" vs "${rarity}" = ${rarityScore}%`);
                            
                            // Skip variants that don't match the extracted rarity well enough
                            if (rarityScore < 70) {
                                this.logger.debug(`[VARIANT] Skipping variant due to poor rarity match: ${rarity} (score: ${rarityScore})`);
                                continue;
                            }
                            
                            // Use weighted confidence: 75% name + 25% rarity (like oldIteration.py)
                            const nameScore = match.confidence;
                            confidence = (nameScore * 0.75) + (rarityScore * 0.25);
                            this.logger.debug(`[VARIANT] Weighted confidence: ${nameScore}% name + ${rarityScore}% rarity = ${confidence}%`);
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
                                // Use the specific rarity and set info from this card_set
                                displayRarity: rarity,
                                setInfo: {
                                    setCode: setCode,
                                    setName: cardSet.set_name || this.currentSet.name
                                }
                            };
                            this.logger.debug(`[VARIANT] Variant object displayRarity: "${newVariant.displayRarity}", setInfo:`, newVariant.setInfo);
                            allVariants.push(newVariant);
                        } else {
                            this.logger.debug(`[VARIANT] Skipped duplicate variant: ${variantKey}`);
                        }
                    }
                } else {
                    this.logger.debug(`[VARIANT] Card "${card.name}" has no card_sets array. Skipping as per oldIteration.py logic.`);
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
     * Calculate rarity matching score (similar to oldIteration.py)
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
        
        // Partial match gets good score
        if (input.includes(cardRarity) || cardRarity.includes(input)) {
            return 80;
        }
        
        // Fuzzy match as fallback
        const similarity = this.calculateSimilarity(input, cardRarity);
        return similarity >= 70 ? similarity * 0.7 : 0;  // Scale down fuzzy matches
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
        return name.toLowerCase()
            .replace(/[\s-]+/g, ' ')  // Normalize spaces and hyphens
            .replace(/[^a-z0-9\s]/g, '') // Remove special characters except spaces and numbers
            .replace(/\s+/g, ' ')     // Normalize multiple spaces
            .trim();
    }
    

    /**
     * Calculate similarity between two strings
     */
    calculateSimilarity(str1, str2) {
        // Simple Levenshtein distance-based similarity
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) {
            return 1.0;
        }
        
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
        
        const stats = this.currentSession.statistics;
        const cards = this.currentSession.cards;
        
        // Basic statistics
        stats.totalCards = cards.length;
        stats.totalValue = cards.reduce((sum, card) => sum + (card.price || 0), 0);
        
        // Rarity breakdown
        stats.rarityBreakdown = {};
        cards.forEach(card => {
            const rarity = card.rarity || 'Unknown';
            stats.rarityBreakdown[rarity] = (stats.rarityBreakdown[rarity] || 0) + 1;
        });
        
        // Session duration
        if (this.currentSession.startTime) {
            const start = new Date(this.currentSession.startTime);
            const end = this.currentSession.endTime ? new Date(this.currentSession.endTime) : new Date();
            stats.sessionDuration = end.getTime() - start.getTime();
        }
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
     * Export session data in multiple formats
     */
    exportSession(format = 'json', selectedFields = null) {
        if (!this.currentSession) {
            throw new Error('No active session to export');
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
            'cardName', 'rarity', 'setCode', 'timestamp', 
            'price', 'condition', 'quantity'
        ];
        
        const fields = selectedFields || defaultFields;
        
        // Field mappings for display
        const fieldLabels = {
            cardName: 'Card Name',
            rarity: 'Rarity',
            setCode: 'Set Code',
            timestamp: 'Added Time',
            price: 'Estimated Price',
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
                        value = card.rarity || '';
                        break;
                    case 'setCode':
                        value = card.setCode || this.currentSession.setId || '';
                        break;
                    case 'timestamp':
                        value = card.timestamp ? new Date(card.timestamp).toLocaleString() : '';
                        break;
                    case 'price':
                        value = card.price || '0.00';
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
        
        const csvContent = [header, ...rows].join('\n');
        
        return {
            content: csvContent,
            filename: `YGO_Session_${this.currentSession.setName}_${new Date().toISOString().split('T')[0]}.csv`,
            mimeType: 'text/csv'
        };
    }

    /**
     * Generate downloadable export file
     */
    generateExportFile(format = 'json', selectedFields = null) {
        const exportData = this.exportSession(format, selectedFields);
        
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
     * Import session data
     */
    async importSession(sessionData) {
        try {
            // Validate session data
            if (!sessionData || !sessionData.setId) {
                throw new Error('Invalid session data');
            }
            
            // Stop current session if active
            if (this.sessionActive) {
                await this.stopSession();
            }
            
            // Import the session
            this.currentSession = {
                ...sessionData,
                id: this.generateSessionId(), // Generate new ID
                importedAt: new Date().toISOString()
            };
            
            // Find the set
            this.currentSet = this.cardSets.find(s => s.id === sessionData.setId);
            this.sessionActive = true;
            
            // Load set cards
            if (this.currentSet) {
                await this.loadSetCards(this.currentSet.id);
            }
            
            this.emitSessionUpdate(this.currentSession);
            
            this.logger.info('Session imported successfully');
            return this.currentSession;
            
        } catch (error) {
            this.logger.error('Failed to import session:', error);
            throw error;
        }
    }

    /**
     * Start auto-save
     */
    startAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }
        
        this.autoSaveTimer = setInterval(async () => {
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
                totalValue: 0,
                status: 'No active session'
            };
        }
        
        return {
            isActive: this.sessionActive,
            setName: this.currentSession.setName,
            cardCount: this.currentSession.cards.length,
            totalValue: this.currentSession.statistics.totalValue,
            status: this.sessionActive ? 'Active' : 'Stopped',
            sessionId: this.currentSession.id,
            startTime: this.currentSession.startTime,
            cards: this.currentSession.cards
        };
    }

    isSessionActive() {
        return this.sessionActive;
    }

    // Event handling
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

    onCardRemoved(callback) {
        this.listeners.cardRemoved.push(callback);
    }

    onSessionClear(callback) {
        this.listeners.sessionClear.push(callback);
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
}