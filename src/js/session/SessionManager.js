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
        
        // Card recognition patterns (Yu-Gi-Oh specific)
        this.cardPatterns = new Map();
        this.commonCardNames = new Map();
        
        this.logger.info('SessionManager initialized');
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
            
            // Load card recognition patterns
            await this.loadCardPatterns();
            
            // Load last session if available
            await this.loadLastSession();
            
            // Start auto-save if enabled
            if (this.config.autoSave) {
                this.startAutoSave();
            }
            
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
            } else {
                this.logger.error(`Failed to load cards for set ${setIdentifier}:`, error);
            }
            
            // Fallback: provide sample cards for testing voice recognition
            this.logger.warn('API failed, using sample cards for testing');
            const sampleCards = this.getSampleCards(setIdentifier);
            this.setCards.set(setIdentifier, sampleCards);
            return sampleCards;
        }
    }

    /**
     * Get sample cards for testing voice recognition
     */
    getSampleCards(setId) {
        return [
            { id: `${setId}-001`, name: 'Blue-Eyes White Dragon', rarity: 'Ultra Rare', setCode: setId },
            { id: `${setId}-002`, name: 'Dark Magician', rarity: 'Ultra Rare', setCode: setId },
            { id: `${setId}-003`, name: 'Evil HERO Neos Lord', rarity: 'Ultra Rare', setCode: setId },
            { id: `${setId}-004`, name: 'Evil Hero Neos Lord', rarity: 'Secret Rare', setCode: setId },
            { id: `${setId}-005`, name: 'Elemental HERO Neos', rarity: 'Super Rare', setCode: setId },
            { id: `${setId}-006`, name: 'Red-Eyes Black Dragon', rarity: 'Ultra Rare', setCode: setId },
            { id: `${setId}-007`, name: 'Time Wizard', rarity: 'Common', setCode: setId },
            { id: `${setId}-008`, name: 'Mirror Force', rarity: 'Super Rare', setCode: setId },
            { id: `${setId}-009`, name: 'Pot of Greed', rarity: 'Common', setCode: setId },
            { id: `${setId}-010`, name: 'Mystical Space Typhoon', rarity: 'Common', setCode: setId }
        ];
    }



    /**
     * Load card recognition patterns
     */
    async loadCardPatterns() {
        try {
            // Load common card name patterns for better voice recognition
            const patterns = await this.storage?.get('cardPatterns') || this.getDefaultCardPatterns();
            
            this.cardPatterns = new Map(patterns);
            this.logger.debug(`Loaded ${this.cardPatterns.size} card patterns`);
            
        } catch (error) {
            this.logger.warn('Failed to load card patterns:', error);
            this.cardPatterns = new Map(this.getDefaultCardPatterns());
        }
    }

    /**
     * Get default card patterns
     */
    getDefaultCardPatterns() {
        return [
            // Common card name variations
            ['blue eyes white dragon', 'Blue-Eyes White Dragon'],
            ['dark magician', 'Dark Magician'],
            ['red eyes black dragon', 'Red-Eyes Black Dragon'],
            ['time wizard', 'Time Wizard'],
            ['mirror force', 'Mirror Force'],
            ['pot of greed', 'Pot of Greed'],
            ['mystical space typhoon', 'Mystical Space Typhoon'],
            ['man eater bug', 'Man-Eater Bug'],
            ['elemental hero', 'Elemental HERO'],
            ['cyber dragon', 'Cyber Dragon'],
            
            // Evil HERO specific patterns
            ['evil hero neos lord', 'Evil HERO Neos Lord'],
            ['evil hero NEOS lord', 'Evil HERO Neos Lord'],
            ['evil hero neos lord', 'Evil Hero Neos Lord'],
            ['evil HERO neos lord', 'Evil HERO Neos Lord'],
            
            // Common phonetic variations
            ['dragun', 'Dragon'],
            ['majician', 'Magician'],
            ['elemental hero', 'Elemental HERO'],
            ['cyber dragun', 'Cyber Dragon'],
            ['blue i white dragun', 'Blue-Eyes White Dragon'],
            ['red i black dragun', 'Red-Eyes Black Dragon'],
            ['dark majician', 'Dark Magician'],
            ['time wiserd', 'Time Wizard'],
            ['mirror four', 'Mirror Force'],
            ['pot of greed', 'Pot of Greed']
        ];
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
     * Process voice input to identify cards
     */
    async processVoiceInput(transcript) {
        this.logger.info('Processing voice input:', transcript);
        
        if (!transcript || typeof transcript !== 'string') {
            return [];
        }
        
        const cleanTranscript = transcript.toLowerCase().trim();
        const recognizedCards = [];
        
        try {
            // Method 1: Exact pattern matching
            const patternMatches = this.findCardsByPattern(cleanTranscript);
            recognizedCards.push(...patternMatches);
            
            // Method 2: Fuzzy matching (if enabled and no exact matches)
            if (recognizedCards.length === 0 && this.config.enableFuzzyMatching) {
                const fuzzyMatches = await this.findCardsByFuzzyMatch(cleanTranscript);
                recognizedCards.push(...fuzzyMatches);
            }
            
            // Method 3: Set-specific card matching
            if (recognizedCards.length === 0 && this.currentSet) {
                const setMatches = await this.findCardsInCurrentSet(cleanTranscript);
                recognizedCards.push(...setMatches);
            }
            
            this.logger.info(`Found ${recognizedCards.length} potential card matches`);
            return recognizedCards;
            
        } catch (error) {
            this.logger.error('Error processing voice input:', error);
            return [];
        }
    }

    /**
     * Find cards by pattern matching
     */
    findCardsByPattern(transcript) {
        const matches = [];
        
        for (const [pattern, cardName] of this.cardPatterns) {
            if (transcript.includes(pattern.toLowerCase())) {
                matches.push({
                    name: cardName,
                    confidence: 0.9,
                    method: 'pattern',
                    transcript: transcript
                });
            }
        }
        
        return matches;
    }

    /**
     * Find cards by fuzzy matching
     */
    async findCardsByFuzzyMatch(transcript) {
        // For now, implement a simple fuzzy matching
        // In a real implementation, you might use a library like fuse.js
        const matches = [];
        
        for (const [pattern, cardName] of this.cardPatterns) {
            const similarity = this.calculateSimilarity(transcript, pattern);
            if (similarity >= this.config.cardMatchThreshold) {
                matches.push({
                    name: cardName,
                    confidence: similarity,
                    method: 'fuzzy',
                    transcript: transcript
                });
            }
        }
        
        return matches.sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Find cards in current set
     */
    async findCardsInCurrentSet(transcript) {
        if (!this.currentSet) {
            return [];
        }
        
        const setCards = this.setCards.get(this.currentSet.id) || [];
        const matches = [];
        
        // Normalize the transcript for better matching
        const normalizedTranscript = this.normalizeCardName(transcript);
        
        for (const card of setCards) {
            const normalizedCardName = this.normalizeCardName(card.name);
            
            // Multiple matching strategies
            let confidence = 0;
            let matchType = '';
            
            // Exact match (highest confidence)
            if (normalizedCardName === normalizedTranscript) {
                confidence = 0.95;
                matchType = 'exact';
            }
            // Fuzzy matching with similarity calculation
            else {
                const similarity = this.calculateSimilarity(normalizedTranscript, normalizedCardName);
                if (similarity >= this.config.cardMatchThreshold) {
                    confidence = similarity * 0.9; // Slightly lower than exact match
                    matchType = 'fuzzy';
                }
            }
            
            if (confidence > 0) {
                matches.push({
                    ...card,
                    confidence: confidence,
                    method: `set-search-${matchType}`,
                    transcript: transcript,
                    normalizedTranscript: normalizedTranscript,
                    normalizedCardName: normalizedCardName
                });
            }
        }
        
        return matches.sort((a, b) => b.confidence - a.confidence);
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
     * Export session data
     */
    exportSession() {
        if (!this.currentSession) {
            throw new Error('No active session to export');
        }
        
        return {
            ...this.currentSession,
            exportedAt: new Date().toISOString(),
            version: '2.1.0'
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
            startTime: this.currentSession.startTime
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