/**
 * TrainingUI - Voice Recognition Training Interface
 * 
 * Provides UI for training the voice recognition system when recognition fails.
 * Allows users to search for the intended card and create learning associations.
 */

import { Logger } from '../utils/Logger.js';

export class TrainingUI {
    constructor(app, logger = null) {
        this.app = app;
        this.logger = logger || new Logger('TrainingUI');
        
        // Training state
        this.isTrainingMode = false;
        this.currentVoiceInput = '';
        this.currentSearchResults = [];
        this.selectedCard = null;
        this.lastButtonShowTime = 0;
        
        // Cache for API responses to avoid repeated calls
        this.cardCache = null;
        this.cacheSetIdentifier = null;
        
        // DOM elements
        this.trainButton = null;
        this.trainingModal = null;
        this.searchBox = null;
        this.resultsContainer = null;
        
        this.logger.info('TrainingUI initialized');
    }

    /**
     * Show training button for failed voice recognition
     */
    showTrainingButton(voiceInput, container = null) {
        console.log('🔴 showTrainingButton called with:', voiceInput);
        console.log('🔴 Current state - isTrainingMode:', this.isTrainingMode, 'trainButton exists:', !!this.trainButton);
        
        try {
            // Don't show button if training is already active or button already exists
            if (this.isTrainingMode || this.trainButton) {
                console.log('🔴 EARLY RETURN - training active or button exists');
                return;
            }
            
            // Debounce rapid calls (prevent showing within 2 seconds of last call)
            const now = Date.now();
            if (now - this.lastButtonShowTime < 2000) {
                console.log('🔴 DEBOUNCED - too soon since last call');
                return;
            }
            this.lastButtonShowTime = now;
            
            console.log('🔴 PROCEEDING TO CREATE BUTTON');
            
            this.currentVoiceInput = voiceInput;
            this.logger.info(`[TrainingUI] Attempting to show training button for: "${voiceInput}"`);
            
            // Voice recognition continues running when buttons appear
            
            // Don't remove existing button since we already checked it doesn't exist above
            
            // Create floating training button
            this.trainButton = document.createElement('div');
            this.trainButton.className = 'voice-train-button';
            this.trainButton.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 1000;
            `;
            this.trainButton.innerHTML = `
                <div style="display: flex; gap: 8px;">
                    <button class="train-btn" title="Train voice recognition for this phrase" style="
                        background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
                        color: white;
                        border: none;
                        border-radius: 25px;
                        padding: 12px 16px;
                        font-size: 0.9rem;
                        font-weight: 600;
                        cursor: pointer;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                        display: flex;
                        align-items: center;
                        gap: 6px;
                    ">
                        <span class="train-icon">🎯</span>
                        Train
                    </button>
                    <button class="resume-btn" title="Resume voice recognition" style="
                        background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%);
                        color: white;
                        border: none;
                        border-radius: 25px;
                        padding: 12px 16px;
                        font-size: 0.9rem;
                        font-weight: 600;
                        cursor: pointer;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                        display: flex;
                        align-items: center;
                        gap: 6px;
                    ">
                        <span class="resume-icon">🎤</span>
                        Resume
                    </button>
                </div>
            `;
            
            // Add click handlers
            this.trainButton.querySelector('.train-btn').addEventListener('click', () => {
                console.log('🟢 TRAIN BUTTON CLICKED');
                this.logger.info('[TrainingUI] Train button clicked');
                this.showTrainingModal();
            });
            
            this.trainButton.querySelector('.resume-btn').addEventListener('click', () => {
                console.log('🟢 RESUME BUTTON CLICKED');
                this.logger.info('[TrainingUI] Resume button clicked');
                this.hideTrainingButton();
                this.resumeVoiceRecognition();
            });
            
            // Hover effects removed to prevent flickering
            
            // Always append to document.body for fixed positioning stability
            document.body.appendChild(this.trainButton);
            
            this.logger.info('[TrainingUI] Training button appended to document.body');
            
            // DOM observer not needed when appending to document.body
            
            // Auto-hide after 10 seconds (don't auto-resume voice)
            setTimeout(() => {
                this.hideTrainingButton();
            }, 10000);
            
            this.logger.info(`[TrainingUI] Training button successfully shown for voice input: "${voiceInput}"`);
            console.log('🔴 BUTTON CREATED SUCCESSFULLY');
            
        } catch (error) {
            console.log('🔴 ERROR CREATING BUTTON:', error);
            this.logger.error('[TrainingUI] Error showing training button:', error);
        }
    }

    /**
     * Hide training button
     */
    hideTrainingButton() {
        console.log('🟡 hideTrainingButton called, button exists:', !!this.trainButton);
        console.log('🟡 Stack trace:', new Error().stack);
        if (this.trainButton) {
            console.log('🟡 REMOVING BUTTON');
            this.logger.info('[TrainingUI] Hiding training button');
            this.trainButton.remove();
            this.trainButton = null;
        }
        
        // No DOM observer to disconnect
    }

    /**
     * Show training modal with card search
     */
    showTrainingModal() {
        this.isTrainingMode = true;
        this.hideTrainingButton();
        
        // Pause voice recognition when modal opens
        if (this.app.voiceEngine) {
            this.app.voiceEngine.isPaused = true;
            this.logger.info('[TrainingUI] Paused voice recognition for training modal');
        }
        
        // Create modal overlay
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay training-modal-overlay';
        
        // Create modal content
        this.trainingModal = document.createElement('div');
        this.trainingModal.className = 'modal training-modal';
        this.trainingModal.innerHTML = `
            <div class="modal-header">
                <h3>Train Voice Recognition</h3>
                <button class="modal-close" aria-label="Close training modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="training-intro">
                    <p>Help improve voice recognition by finding the card you intended to say.</p>
                    <div class="voice-input-display">
                        <strong>You said:</strong> "<span class="voice-transcript">${this.currentVoiceInput}</span>"
                    </div>
                </div>
                
                <div class="card-search-section">
                    <label for="card-search-input">Search for the intended card:</label>
                    <div class="search-input-group">
                        <input 
                            type="text" 
                            id="card-search-input" 
                            class="card-search-input" 
                            placeholder="Type card name..."
                            autocomplete="off"
                        >
                        <button class="search-clear-btn" title="Clear search" style="display: none;">&times;</button>
                    </div>
                    <div class="search-results-container">
                        <div class="search-results-list"></div>
                    </div>
                </div>
                
                <div class="training-actions">
                    <button class="btn-secondary cancel-training">Cancel</button>
                    <button class="btn-primary confirm-training" disabled>Train Recognition</button>
                </div>
            </div>
        `;
        
        modalOverlay.appendChild(this.trainingModal);
        document.body.appendChild(modalOverlay);
        
        // Set up references to modal elements first
        this.searchBox = this.trainingModal.querySelector('.card-search-input');
        this.resultsContainer = this.trainingModal.querySelector('.search-results-list');
        
        // Set up modal event listeners (after elements are referenced)
        this.setupModalEventListeners();
        
        setTimeout(() => {
            this.searchBox.focus();
        }, 100);
        
        this.logger.info('Training modal opened');
    }

    /**
     * Set up modal event listeners
     */
    setupModalEventListeners() {
        try {
            const modal = this.trainingModal;
            const modalOverlay = modal.parentElement;
            
            // Close button
            const closeButton = modal.querySelector('.modal-close');
            if (closeButton) {
                closeButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.logger.info('Modal close button clicked');
                    this.closeTrainingModal();
                });
            } else {
                this.logger.warn('Modal close button not found');
            }
            
            // Cancel button
            const cancelButton = modal.querySelector('.cancel-training');
            if (cancelButton) {
                cancelButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.logger.info('Modal cancel button clicked');
                    this.closeTrainingModal();
                });
            } else {
                this.logger.warn('Modal cancel button not found');
            }
        
            // Confirm training button
            const confirmButton = modal.querySelector('.confirm-training');
            if (confirmButton) {
                confirmButton.addEventListener('click', () => {
                    this.confirmTraining();
                });
            } else {
                this.logger.warn('Modal confirm button not found');
            }
            
            // Click outside to close
            if (modalOverlay) {
                modalOverlay.addEventListener('click', (e) => {
                    if (e.target === modalOverlay) {
                        this.logger.info('Modal overlay clicked - closing modal');
                        this.closeTrainingModal();
                    }
                });
            }
            
            // Search input handlers
            if (this.searchBox) {
                this.searchBox.addEventListener('input', (e) => {
                    this.handleSearchInput(e.target.value);
                });
                
                this.searchBox.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        if (this.currentSearchResults.length > 0) {
                            this.selectCard(this.currentSearchResults[0]);
                        }
                    } else if (e.key === 'Escape') {
                        this.logger.info('Escape key pressed - closing modal');
                        this.closeTrainingModal();
                    }
                });
            }
            
            // Clear search button
            const clearBtn = modal.querySelector('.search-clear-btn');
            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    this.searchBox.value = '';
                    this.clearSearchResults();
                    this.searchBox.focus();
                });
            }
            
        } catch (error) {
            this.logger.error('Error setting up modal event listeners:', error);
            // Try to close the modal if setup fails
            this.closeTrainingModal();
        }
    }

    /**
     * Handle search input with debouncing
     */
    handleSearchInput(query) {
        const clearBtn = this.trainingModal.querySelector('.search-clear-btn');
        clearBtn.style.display = query.length > 0 ? 'block' : 'none';
        
        // Clear previous timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        // Debounce search
        this.searchTimeout = setTimeout(() => {
            this.performSearch(query.trim());
        }, 300);
    }

    /**
     * Perform card search
     */
    async performSearch(query) {
        if (!query || query.length < 2) {
            this.clearSearchResults();
            return;
        }
        
        try {
            this.showSearchLoading();
            
            // Use app's existing card search functionality
            const results = await this.searchCards(query);
            
            this.currentSearchResults = results.slice(0, 10); // Limit to 10 results
            this.displaySearchResults(this.currentSearchResults);
            
        } catch (error) {
            this.logger.error('Search failed:', error);
            this.showSearchError();
        }
    }

    /**
     * Search for cards using existing app functionality
     */
    async searchCards(query) {
        // Try to use app's existing search mechanisms
        if (this.app.sessionManager && typeof this.app.sessionManager.searchCards === 'function') {
            return await this.app.sessionManager.searchCards(query);
        }
        
        // Get cards from current set, loading from API if needed
        const allCards = await this.getCardsFromCurrentSet();
        return allCards.filter(card => 
            card.name.toLowerCase().includes(query.toLowerCase())
        ).sort((a, b) => {
            // Prioritize exact matches
            const aExact = a.name.toLowerCase().startsWith(query.toLowerCase());
            const bExact = b.name.toLowerCase().startsWith(query.toLowerCase());
            if (aExact && !bExact) return -1;
            if (!aExact && bExact) return 1;
            return a.name.localeCompare(b.name);
        });
    }

    /**
     * Get cards from current set, loading from API if needed
     */
    async getCardsFromCurrentSet() {
        const currentSetIdentifier = this.app.sessionManager?.currentSet?.code || 
                                   this.app.sessionManager?.currentSet?.set_code || 
                                   this.app.sessionManager?.currentSet?.abbreviation;
        
        // 1. Try cached cards first
        if (this.app.sessionManager?.currentCards && this.app.sessionManager.currentCards.length > 0) {
            console.log('📋 Using cached cards:', this.app.sessionManager.currentCards.length);
            return this.app.sessionManager.currentCards;
        }
        
        // 2. Try cardsData
        if (this.app.sessionManager?.cardsData && this.app.sessionManager.cardsData.length > 0) {
            console.log('📋 Using cardsData:', this.app.sessionManager.cardsData.length);
            return this.app.sessionManager.cardsData;
        }
        
        // 3. Check TrainingUI cache before making API call
        if (this.cardCache && this.cacheSetIdentifier === currentSetIdentifier) {
            console.log('📋 Using TrainingUI cached cards:', this.cardCache.length);
            return this.cardCache;
        }
        
        // 4. Load from API if we have a current set
        if (this.app.sessionManager?.currentSet) {
            console.log('📋 Loading cards from API for set:', this.app.sessionManager.currentSet.name);
            try {
                const cards = await this.fetchCardsFromAPI(this.app.sessionManager.currentSet);
                console.log('📋 Loaded', cards.length, 'cards from API');
                
                // Cache the results
                this.cardCache = cards;
                this.cacheSetIdentifier = currentSetIdentifier;
                
                return cards;
            } catch (error) {
                console.error('📋 Failed to load cards from API:', error);
                return [];
            }
        }
        
        console.log('📋 No current set available');
        return [];
    }
    
    /**
     * Fetch cards from the backend API for the given set
     */
    async fetchCardsFromAPI(setInfo) {
        try {
            // Use the correct API endpoint: /card-sets/{set_identifier}/cards
            const setIdentifier = setInfo.code || setInfo.set_code || setInfo.abbreviation;
            const response = await fetch(`http://localhost:8083/card-sets/${encodeURIComponent(setIdentifier)}/cards`);
            
            if (!response.ok) {
                throw new Error(`API response not OK: ${response.status} for set ${setIdentifier}`);
            }
            
            const data = await response.json();
            
            // Handle the actual response format: {data: {cards: [...], set_info: {...}}, message: "...", success: true}
            if (data.success && data.data && Array.isArray(data.data.cards)) {
                console.log('📋 API response for set', setIdentifier, ':', data.data.cards.length, 'cards');
                return data.data.cards;
            } 
            // Fallback: check if data itself is an array
            else if (Array.isArray(data)) {
                console.log('📋 API response for set', setIdentifier, ':', data.length, 'cards');
                return data;
            } 
            else {
                console.warn('📋 Unexpected API response format:', data);
                return [];
            }
            
        } catch (error) {
            console.error('📋 Error fetching cards from API:', error);
            throw error;
        }
    }

    /**
     * Get all available cards from current set or cache (synchronous version)
     */
     getAllAvailableCards() {
        // Only use actual current set data - no fallback
        let cards = [];
        
        // 1. Try sessionManager currentCards
        if (this.app.sessionManager?.currentCards && this.app.sessionManager.currentCards.length > 0) {
            cards = this.app.sessionManager.currentCards;
            console.log('📋 Found', cards.length, 'cards from current set');
            return cards;
        }
        
        // 2. Try sessionManager cardsData 
        if (this.app.sessionManager?.cardsData && this.app.sessionManager.cardsData.length > 0) {
            cards = this.app.sessionManager.cardsData;
            console.log('📋 Found', cards.length, 'cards from cardsData');
            return cards;
        }
        
        // 3. Check if we have loaded set data
        if (this.app.sessionManager?.currentSet) {
            console.log('📋 Current set:', this.app.sessionManager.currentSet.name);
            console.log('📋 But no card data loaded yet');
        }
        
        // No fallback - return empty if no real data
        console.log('📋 No current set card data available for search');
        return [];
    }

    /**
     * Display search results
     */
    displaySearchResults(results) {
        if (!results || results.length === 0) {
            // Check if we have any card data at all
            const allCards = this.getAllAvailableCards();
            if (allCards.length === 0) {
                this.resultsContainer.innerHTML = `
                    <div class="no-results">
                        <p><strong>No card data available.</strong></p>
                        <p>Please ensure the current set has been loaded before training.</p>
                        <p>Try refreshing the page or selecting a set first.</p>
                    </div>
                `;
            } else {
                this.resultsContainer.innerHTML = `
                    <div class="no-results">
                        <p>No cards found matching "${this.searchBox.value}".</p>
                        <p>Try a different search term from the current set.</p>
                    </div>
                `;
            }
            return;
        }
        
        this.resultsContainer.innerHTML = results.map(card => `
            <div class="search-result-item" data-card-name="${card.name}">
                <div class="card-info">
                    <div class="card-name">${card.name}</div>
                    <div class="card-details">
                        ${card.set ? `<span class="card-set">${card.set}</span>` : ''}
                        ${card.type ? `<span class="card-type">${card.type}</span>` : ''}
                    </div>
                </div>
                <button class="select-card-btn" data-card-name="${card.name}">Select</button>
            </div>
        `).join('');
        
        // Add click handlers for search results
        this.resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const cardName = item.dataset.cardName;
                const card = results.find(c => c.name === cardName);
                if (card) this.selectCard(card);
            });
        });
        
        this.resultsContainer.querySelectorAll('.select-card-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const cardName = btn.dataset.cardName;
                const card = results.find(c => c.name === cardName);
                if (card) this.selectCard(card);
            });
        });
    }

    /**
     * Select a card for training
     */
    selectCard(card) {
        this.selectedCard = card;
        
        // Highlight selected card
        this.resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        const selectedItem = this.resultsContainer.querySelector(`[data-card-name="${card.name}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
        }
        
        // Enable confirm button
        const confirmBtn = this.trainingModal.querySelector('.confirm-training');
        confirmBtn.disabled = false;
        confirmBtn.textContent = `Train: "${card.name}"`;
        
        this.logger.debug('Card selected for training:', card.name);
    }

    /**
     * Confirm training and teach the recognition system
     */
    async confirmTraining() {
        if (!this.selectedCard || !this.currentVoiceInput) {
            this.logger.warn('Cannot confirm training: missing card or voice input');
            return;
        }
        
        try {
            this.showTrainingInProgress();
            
            // Train the voice recognition system
            await this.trainVoiceRecognition(this.currentVoiceInput, this.selectedCard);
            
            this.showTrainingSuccess();
            
            // Close modal after brief success display
            setTimeout(() => {
                this.closeTrainingModal();
            }, 2000);
            
        } catch (error) {
            this.logger.error('Training failed:', error);
            this.showTrainingError(error.message);
        }
    }

    /**
     * Extract base card name (without rarity/variant info)
     * @private
     */
    extractBaseCardName(fullCardName) {
        // Remove common rarity indicators and variant markers
        const baseCardName = fullCardName
            .replace(/\s*\([^)]*\)$/, '') // Remove parenthetical at end (like "(Quarter Century Secret Rare)")
            .replace(/\s*-\s*(Secret Rare|Ultra Rare|Super Rare|Rare|Common|Quarter Century Secret Rare|Starlight Rare|Ghost Rare|Collector's Rare|Prismatic Secret Rare|Ultimate Rare|Gold Rare|Platinum Rare|Silver Rare).*$/i, '')
            .replace(/\s*\[\w+\]$/, '') // Remove bracketed info at end like [INFO]
            .replace(/\s*#\d+.*$/, '') // Remove card numbers like #001
            .replace(/\s*\d+st\s+Edition.*$/i, '') // Remove "1st Edition" etc
            .trim();
            
        this.logger.debug(`[TRAINING] Extracted base name: "${fullCardName}" → "${baseCardName}"`);
        return baseCardName;
    }

    /**
     * Train the voice recognition system with the user's correction
     */
    async trainVoiceRecognition(voiceInput, correctCard) {
        let baseCardName = 'the selected card'; // Default fallback for toast message
        
        try {
            // Get the voice engine and learning components
            const voiceEngine = this.app.voiceEngine;
            
            if (voiceEngine && voiceEngine.learningEngine) {
                // Extract base card name (without rarity/variant info) for training
                baseCardName = this.extractBaseCardName(correctCard.name);
                
                // Record this as a successful learning interaction using base card name
                voiceEngine.learningEngine.learnFromSuccess(
                    voiceInput,
                    baseCardName,  // Use base name instead of full name with rarity
                    1.0, // Max confidence since user manually confirmed
                    {
                        trainingMode: true,
                        timestamp: Date.now(),
                        cardSet: correctCard.set || 'unknown',
                        originalFullName: correctCard.name, // Keep original for reference
                        baseNameExtracted: true
                    }
                );
                
                // Also update confidence manager
                if (voiceEngine.confidenceManager) {
                    voiceEngine.confidenceManager.recordInteraction({
                        voiceInput: voiceInput,
                        cardName: baseCardName,  // Use base name for consistency
                        wasCorrect: true,
                        confidence: 1.0,
                        context: {
                            trainingMode: true,
                            timestamp: Date.now(),
                            originalFullName: correctCard.name
                        }
                    });
                }
                
                // CRITICAL: Save the learning patterns to persistent storage
                await voiceEngine.learningEngine.savePatterns();
                this.logger.info(`Training patterns saved to storage`);
                
                this.logger.info(`Training completed: "${voiceInput}" -> "${baseCardName}" (from: "${correctCard.name}")`);
            } else {
                this.logger.warn('Voice learning engine not available');
                // Extract base name even if learning engine isn't available for the toast message
                baseCardName = this.extractBaseCardName(correctCard.name);
            }
            
        } catch (error) {
            this.logger.error('Failed to train voice recognition:', error);
            // Ensure baseCardName is set even if training fails
            try {
                baseCardName = this.extractBaseCardName(correctCard.name);
            } catch (extractError) {
                baseCardName = correctCard.name || 'the selected card';
            }
            throw error;
        } finally {
            // Show user-friendly confirmation (moved to finally to ensure it always shows)
            this.app.showToast(`Voice recognition trained! Next time you say "${voiceInput}", it will better recognize "${baseCardName}" and its variants.`, 'success');
        }
    }

    /**
     * Show search loading state
     */
    showSearchLoading() {
        this.resultsContainer.innerHTML = `
            <div class="search-loading">
                <p>Searching cards...</p>
            </div>
        `;
    }

    /**
     * Show search error
     */
    showSearchError() {
        this.resultsContainer.innerHTML = `
            <div class="search-error">
                <p>Search failed. Please try again.</p>
            </div>
        `;
    }

    /**
     * Clear search results
     */
    clearSearchResults() {
        this.resultsContainer.innerHTML = '';
        this.currentSearchResults = [];
        this.selectedCard = null;
        
        const confirmBtn = this.trainingModal?.querySelector('.confirm-training');
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Train Recognition';
        }
    }

    /**
     * Show training in progress
     */
    showTrainingInProgress() {
        const modalBody = this.trainingModal.querySelector('.modal-body');
        modalBody.innerHTML = `
            <div class="training-progress">
                <div class="progress-icon">🎯</div>
                <h4>Training Voice Recognition...</h4>
                <p>Teaching the system to recognize "<strong>${this.currentVoiceInput}</strong>" as "<strong>${this.selectedCard.name}</strong>"</p>
                <div class="loading-spinner"></div>
            </div>
        `;
    }

    /**
     * Show training success
     */
    showTrainingSuccess() {
        const modalBody = this.trainingModal.querySelector('.modal-body');
        modalBody.innerHTML = `
            <div class="training-success">
                <div class="success-icon">✅</div>
                <h4>Training Complete!</h4>
                <p>Voice recognition has been improved for "<strong>${this.selectedCard.name}</strong>"</p>
                <p>Next time you say "<strong>${this.currentVoiceInput}</strong>", it should recognize this card better.</p>
            </div>
        `;
    }

    /**
     * Show training error
     */
    showTrainingError(message) {
        const modalBody = this.trainingModal.querySelector('.modal-body');
        modalBody.innerHTML = `
            <div class="training-error">
                <div class="error-icon">❌</div>
                <h4>Training Failed</h4>
                <p>Unable to complete voice recognition training.</p>
                <p class="error-details">${message}</p>
                <button class="btn-secondary retry-training">Try Again</button>
                <button class="btn-primary close-error">Close</button>
            </div>
        `;
        
        // Add handlers for error buttons
        modalBody.querySelector('.retry-training').addEventListener('click', () => {
            this.showTrainingModal();
        });
        
        modalBody.querySelector('.close-error').addEventListener('click', () => {
            this.closeTrainingModal();
        });
    }

    /**
     * Close training modal
     */
    closeTrainingModal() {
        try {
            // Find and remove modal overlay from DOM
            const modalOverlays = document.querySelectorAll('.training-modal-overlay');
            modalOverlays.forEach(overlay => {
                overlay.remove();
            });
            
            // Also check if trainingModal exists and has a parent
            if (this.trainingModal) {
                const modalOverlay = this.trainingModal.parentElement;
                if (modalOverlay) {
                    modalOverlay.remove();
                } else {
                    // If no parent, try to remove the modal directly
                    this.trainingModal.remove();
                }
                this.trainingModal = null;
            }
            
            this.isTrainingMode = false;
            this.selectedCard = null;
            this.currentSearchResults = [];
            
            if (this.searchTimeout) {
                clearTimeout(this.searchTimeout);
                this.searchTimeout = null;
            }
            
            // Resume voice recognition when modal closes
            this.resumeVoiceRecognition();
            
            this.logger.info('Training modal closed');
        } catch (error) {
            this.logger.error('Error closing training modal:', error);
            // Force cleanup even if there's an error
            this.isTrainingMode = false;
            this.trainingModal = null;
            this.resumeVoiceRecognition();
        }
    }

    /**
     * Resume voice recognition after training interaction
     */
    resumeVoiceRecognition() {
        if (this.app.voiceEngine) {
            // Resume paused recognition
            if (this.app.voiceEngine.isPaused) {
                this.app.voiceEngine.isPaused = false;
                this.logger.info('[TrainingUI] Resumed voice recognition auto-restart');
            }
            
            // Re-enable continuous listening
            this.app.voiceEngine.shouldKeepListening = true;
            
            // Restart listening
            if (!this.app.voiceEngine.isListening) {
                setTimeout(() => {
                    this.app.voiceEngine.startListening().catch(error => {
                        this.logger.warn('[TrainingUI] Failed to restart voice recognition:', error);
                    });
                }, 1000);
            }
            
            this.logger.info('[TrainingUI] Resumed voice recognition');
        }
    }

    /**
     * Check if training UI is currently active
     */
    isActive() {
        return this.isTrainingMode || this.trainButton !== null;
    }

    /**
     * Clean up training UI
     */
    cleanup() {
        this.hideTrainingButton();
        this.closeTrainingModal();
        
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = null;
        }
        
        // Resume voice recognition on cleanup
        this.resumeVoiceRecognition();
    }
}