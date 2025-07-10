/**
 * UI Manager - User Interface Management System
 * 
 * Handles all UI interactions, state management, and visual updates:
 * - Tab navigation and panel management
 * - Form handling and validation
 * - Toast notifications and modal dialogs
 * - Dynamic content updates
 * - Responsive design and accessibility
 * - Event delegation and handling
 */

import { Logger } from '../utils/Logger.js';
import { config } from '../utils/config.js';

export class UIManager {
    constructor(logger = null) {
        this.logger = logger || new Logger('UIManager');
        
        // DOM element references
        this.elements = {};
        
        // Event listeners registry
        this.eventListeners = {
            tabChange: [],
            priceCheck: [],
            sessionStart: [],
            sessionStop: [],
            sessionClear: [],
            sessionExport: [],
            sessionImport: [],
            bulkPricingRefresh: [],
            voiceStart: [],
            voiceStop: [],
            voiceTest: [],
            voiceTrainingStart: [],
            voiceTrainingStop: [],
            cardTrainingStart: [],
            cardTrainingStop: [],
            rarityTrainingStart: [],
            rarityTrainingStop: [],
            addCardMapping: [],
            addRarityMapping: [],
            removeMapping: [],
            exportTrainingData: [],
            importTrainingData: [],
            clearTrainingData: [],
            quantityAdjust: [],
            cardRemove: [],
            pricingRefresh: [],
            settingsSave: [],
            settingsShow: [],
            setSwitched: []
        };
        
        // UI state
        this.currentTab = 'price-checker';
        this.isLoading = false;
        this.toasts = [];
        this.modals = [];
        this.isConsolidatedView = false;
        this.cardSize = 120;
        this.currentPopup = null;
        
        // Voice training state
        this.voiceTrainingState = {
            isCardTraining: false,
            isRarityTraining: false,
            currentSet: null,
            lastRecognition: null,
            suggestions: []
        };
        
        // Configuration
        this.config = {
            toastDuration: 5000,
            animationDuration: 300,
            debounceDelay: 300
        };
        
        this.logger.info('UIManager initialized');
    }

    /**
     * Initialize the UI manager
     */
    async initialize(app) {
        try {
            this.logger.info('Initializing UI manager...');
            this.app = app;
            
            // Get DOM element references
            this.getDOMElements();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Initialize UI components
            this.initializeComponents();
            
            // Set up accessibility features
            this.setupAccessibility();
            
            // Set up responsive design
            this.setupResponsive();
            
            this.logger.info('UI manager initialized successfully');
            return true;
            
        } catch (error) {
            this.logger.error('Failed to initialize UI manager:', error);
            throw error;
        }
    }

    /**
     * Get references to DOM elements
     */
    getDOMElements() {
        // Main app elements
        this.elements.app = document.getElementById('app');
        this.elements.loadingScreen = document.getElementById('loading-screen');
        
        // Navigation
        this.elements.tabBtns = document.querySelectorAll('.tab-btn');
        this.elements.tabPanels = document.querySelectorAll('.tab-panel');
        
        // Price checker elements
        this.elements.priceForm = document.getElementById('price-form');
        this.elements.cardNumber = document.getElementById('card-number');
        this.elements.cardName = document.getElementById('card-name');
        this.elements.cardRarity = document.getElementById('card-rarity');
        this.elements.artVariant = document.getElementById('art-variant');
        this.elements.condition = document.getElementById('condition');
        this.elements.forceRefresh = document.getElementById('force-refresh');
        this.elements.checkPriceBtn = document.getElementById('check-price-btn');
        this.elements.clearFormBtn = document.getElementById('clear-form-btn');
        this.elements.priceResults = document.getElementById('price-results');
        this.elements.priceContent = document.getElementById('price-content');
        
        // Pack ripper elements
        this.elements.setSearch = document.getElementById('set-search');
        this.elements.setSelect = document.getElementById('set-select');
        this.elements.refreshSetsBtn = document.getElementById('refresh-sets-btn');
        this.elements.loadAllSetsBtn = document.getElementById('load-all-sets-btn');
        this.elements.startSessionBtn = document.getElementById('start-session-btn');
        this.elements.currentSet = document.getElementById('current-set');
        this.elements.cardsCount = document.getElementById('cards-count');
        this.elements.tcgLowTotal = document.getElementById('tcg-low-total');
        this.elements.tcgMarketTotal = document.getElementById('tcg-market-total');
        this.elements.sessionStatus = document.getElementById('session-status');
        this.elements.setsCount = document.getElementById('sets-count');
        this.elements.totalSetsCount = document.getElementById('total-sets-count');
        
        // Voice recognition elements
        this.elements.voiceStatus = document.getElementById('voice-status');
        this.elements.voiceIndicator = document.getElementById('voice-indicator');
        this.elements.voiceStatusText = document.getElementById('voice-status-text');
        this.elements.startVoiceBtn = document.getElementById('start-voice-btn');
        this.elements.stopVoiceBtn = document.getElementById('stop-voice-btn');
        this.elements.testVoiceBtn = document.getElementById('test-voice-btn');
        
        // Voice training elements
        this.elements.trainingSetSelect = document.getElementById('training-set-select');
        this.elements.cardTrainingControls = document.getElementById('card-training-controls');
        this.elements.startCardTrainingBtn = document.getElementById('start-card-training');
        this.elements.stopCardTrainingBtn = document.getElementById('stop-card-training');
        this.elements.cardTrainingFeedback = document.getElementById('card-training-feedback');
        this.elements.cardRecognitionResult = document.getElementById('card-recognition-result');
        this.elements.recognizedText = document.getElementById('recognized-text');
        this.elements.cardSearchInput = document.getElementById('card-search-input');
        this.elements.cardSearchResults = document.getElementById('card-search-results');
        
        this.elements.startRarityTrainingBtn = document.getElementById('start-rarity-training');
        this.elements.stopRarityTrainingBtn = document.getElementById('stop-rarity-training');
        this.elements.rarityTrainingFeedback = document.getElementById('rarity-training-feedback');
        this.elements.rarityRecognitionResult = document.getElementById('rarity-recognition-result');
        this.elements.recognizedRarityText = document.getElementById('recognized-rarity-text');
        this.elements.raritySearchInput = document.getElementById('rarity-search-input');
        this.elements.raritySearchResults = document.getElementById('rarity-search-results');
        
        this.elements.cardMappingsCount = document.getElementById('card-mappings-count');
        this.elements.rarityMappingsCount = document.getElementById('rarity-mappings-count');
        this.elements.trainingSessionsCount = document.getElementById('training-sessions-count');
        this.elements.lastTrainingDate = document.getElementById('last-training-date');
        
        this.elements.viewMappingsBtn = document.getElementById('view-mappings');
        this.elements.exportTrainingDataBtn = document.getElementById('export-training-data');
        this.elements.importTrainingDataBtn = document.getElementById('import-training-data');
        this.elements.clearTrainingDataBtn = document.getElementById('clear-training-data');
        
        // Floating voice submenu elements
        this.elements.floatingVoiceSubmenu = document.getElementById('floating-voice-submenu');
        this.elements.floatingStopVoiceBtn = document.getElementById('floating-stop-voice-btn');
        this.elements.floatingSettingsBtn = document.getElementById('floating-settings-btn');
        
        // Session tracker elements
        this.elements.sessionCards = document.getElementById('session-cards');
        this.elements.emptySession = document.getElementById('empty-session');
        this.elements.refreshPricingBtn = document.getElementById('refresh-pricing-btn');
        this.elements.exportSessionBtn = document.getElementById('export-session-btn');
        this.elements.importSessionBtn = document.getElementById('import-session-btn');
        this.elements.clearSessionBtn = document.getElementById('clear-session-btn');
        
        // Session management
        this.elements.startSessionBtn = document.getElementById('start-session-btn');
        this.elements.swapSetBtn = document.getElementById('swap-set-btn');
        this.elements.stopSessionBtn = document.getElementById('stop-session-btn');
        
        // View control elements
        this.elements.consolidatedViewToggle = document.getElementById('consolidated-view-toggle');
        this.elements.cardSizeSlider = document.getElementById('card-size-slider');
        this.elements.cardSizeValue = document.getElementById('card-size-value');
        this.elements.cardSizeSection = document.getElementById('card-size-section');
        
        // Status and utility elements
        this.elements.appStatus = document.getElementById('app-status');
        this.elements.connectionStatus = document.getElementById('connection-status');
        this.elements.appVersion = document.getElementById('app-version');
        this.elements.modalOverlay = document.getElementById('modal-overlay');
        this.elements.toastContainer = document.getElementById('toast-container');
        
        // Settings and help
        this.elements.settingsBtn = document.getElementById('settings-btn');
        this.elements.helpBtn = document.getElementById('help-btn');
        
        this.logger.debug('DOM elements referenced successfully');
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Tab navigation
        this.elements.tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabId = e.currentTarget.dataset.tab;
                this.switchTab(tabId);
            });
        });

        // Price checker form
        if (this.elements.priceForm) {
            this.elements.priceForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handlePriceCheckSubmit();
            });
        }

        if (this.elements.clearFormBtn) {
            this.elements.clearFormBtn.addEventListener('click', () => {
                this.clearPriceForm();
            });
        }

        // Pack ripper controls
        if (this.elements.setSearch) {
            // Debounced search input
            let searchTimeout;
            this.elements.setSearch.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.handleSetSearch(e.target.value);
                }, this.config.debounceDelay);
            });
        }

        if (this.elements.setSelect) {
            this.elements.setSelect.addEventListener('change', () => {
                this.handleSetSelection();
            });
        }

        if (this.elements.refreshSetsBtn) {
            this.elements.refreshSetsBtn.addEventListener('click', () => {
                this.handleRefreshSets();
            });
        }

        if (this.elements.loadAllSetsBtn) {
            this.elements.loadAllSetsBtn.addEventListener('click', () => {
                this.handleLoadAllSets();
            });
        }

        if (this.elements.startSessionBtn) {
            this.elements.startSessionBtn.addEventListener('click', () => {
                this.handleSessionStart();
            });
        }

        if (this.elements.swapSetBtn) {
            this.elements.swapSetBtn.addEventListener('click', () => {
                const newSetId = this.elements.setSelect?.value;
                if (newSetId) {
                    this.emitSetSwitched({ newSetId });
                } else {
                    this.showToast('Please select a card set first', 'warning');
                }
            });
        }

        // Voice controls
        if (this.elements.startVoiceBtn) {
            this.elements.startVoiceBtn.addEventListener('click', () => {
                this.emitVoiceStart();
            });
        }

        if (this.elements.stopVoiceBtn) {
            this.elements.stopVoiceBtn.addEventListener('click', () => {
                this.emitVoiceStop();
            });
        }

        if (this.elements.testVoiceBtn) {
            this.elements.testVoiceBtn.addEventListener('click', () => {
                this.emitVoiceTest();
            });
        }

        // Voice training controls
        if (this.elements.trainingSetSelect) {
            this.elements.trainingSetSelect.addEventListener('change', () => {
                this.handleTrainingSetChange();
            });
        }

        if (this.elements.startCardTrainingBtn) {
            this.elements.startCardTrainingBtn.addEventListener('click', () => {
                this.handleStartCardTraining();
            });
        }

        if (this.elements.stopCardTrainingBtn) {
            this.elements.stopCardTrainingBtn.addEventListener('click', () => {
                this.handleStopCardTraining();
            });
        }

        if (this.elements.startRarityTrainingBtn) {
            this.elements.startRarityTrainingBtn.addEventListener('click', () => {
                this.handleStartRarityTraining();
            });
        }

        if (this.elements.stopRarityTrainingBtn) {
            this.elements.stopRarityTrainingBtn.addEventListener('click', () => {
                this.handleStopRarityTraining();
            });
        }

        if (this.elements.viewMappingsBtn) {
            this.elements.viewMappingsBtn.addEventListener('click', () => {
                this.handleViewMappings();
            });
        }

        if (this.elements.exportTrainingDataBtn) {
            this.elements.exportTrainingDataBtn.addEventListener('click', () => {
                this.handleExportTrainingData();
            });
        }

        if (this.elements.importTrainingDataBtn) {
            this.elements.importTrainingDataBtn.addEventListener('click', () => {
                this.handleImportTrainingData();
            });
        }

        if (this.elements.clearTrainingDataBtn) {
            this.elements.clearTrainingDataBtn.addEventListener('click', () => {
                this.handleClearTrainingData();
            });
        }

        // Floating submenu controls
        if (this.elements.floatingStopVoiceBtn) {
            this.elements.floatingStopVoiceBtn.addEventListener('click', () => {
                this.emitVoiceStop();
            });
        }

        if (this.elements.floatingSettingsBtn) {
            this.elements.floatingSettingsBtn.addEventListener('click', () => {
                this.emitSettingsShow();
            });
        }

        // Session tracker controls
        if (this.elements.refreshPricingBtn) {
            this.elements.refreshPricingBtn.addEventListener('click', () => {
                this.emitBulkPricingRefresh();
            });
        }

        if (this.elements.exportSessionBtn) {
            this.elements.exportSessionBtn.addEventListener('click', () => {
                this.emitSessionExport();
            });
        }

        if (this.elements.importSessionBtn) {
            this.elements.importSessionBtn.addEventListener('click', () => {
                this.emitSessionImport();
            });
        }

        if (this.elements.clearSessionBtn) {
            this.elements.clearSessionBtn.addEventListener('click', () => {
                this.emitSessionClear();
            });
        }

        // View control event listeners
        if (this.elements.consolidatedViewToggle) {
            this.elements.consolidatedViewToggle.addEventListener('change', (e) => {
                this.handleViewToggle(e.target.checked);
            });
        }

        if (this.elements.cardSizeSlider) {
            this.elements.cardSizeSlider.addEventListener('input', (e) => {
                this.handleCardSizeChange(parseInt(e.target.value));
            });
        }

        // Settings and help
        if (this.elements.settingsBtn) {
            this.elements.settingsBtn.addEventListener('click', () => {
                this.emitSettingsShow();
            });
        }

        if (this.elements.helpBtn) {
            this.elements.helpBtn.addEventListener('click', () => {
                this.showHelp();
            });
        }

        // Modal overlay (close modals)
        if (this.elements.modalOverlay) {
            this.elements.modalOverlay.addEventListener('click', (e) => {
                if (e.target === this.elements.modalOverlay) {
                    this.closeModal();
                }
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Window events
        window.addEventListener('resize', this.debounce(() => {
            this.handleResize();
        }, this.config.debounceDelay));

        this.logger.debug('Event listeners set up successfully');
    }

    /**
     * Initialize UI components
     */
    initializeComponents() {
        // Set initial tab
        this.switchTab(this.currentTab);
        
        // Initialize tooltips
        this.initializeTooltips();
        
        // Initialize form validation
        this.initializeFormValidation();
        
        // Set initial status
        this.updateAppStatus('Ready');
        this.updateConnectionStatus(navigator.onLine);
        
        this.logger.debug('UI components initialized');
    }

    /**
     * Set up accessibility features
     */
    setupAccessibility() {
        // Add skip links
        this.addSkipLinks();
        
        // Set up ARIA live regions
        this.setupLiveRegions();
        
        // Enhance keyboard navigation
        this.enhanceKeyboardNavigation();
        
        this.logger.debug('Accessibility features set up');
    }

    /**
     * Set up responsive design
     */
    setupResponsive() {
        // Add viewport meta tag if not present
        if (!document.querySelector('meta[name="viewport"]')) {
            const viewport = document.createElement('meta');
            viewport.name = 'viewport';
            viewport.content = 'width=device-width, initial-scale=1.0, user-scalable=no';
            document.head.appendChild(viewport);
        }
        
        // Add responsive classes based on screen size
        this.updateResponsiveClasses();
        
        this.logger.debug('Responsive design set up');
    }

    /**
     * Switch to a different tab
     */
    switchTab(tabId) {
        this.logger.debug(`Switching to tab: ${tabId}`);
        
        // Update tab buttons
        this.elements.tabBtns.forEach(btn => {
            const isActive = btn.dataset.tab === tabId;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-selected', isActive);
        });
        
        // Update tab panels
        this.elements.tabPanels.forEach(panel => {
            const isActive = panel.id === `${tabId}-panel`;
            panel.classList.toggle('active', isActive);
            panel.setAttribute('aria-hidden', !isActive);
        });
        
        this.currentTab = tabId;
        this.emitTabChange(tabId);
        
        // Update floating submenu visibility based on current tab and voice state
        if (this.elements.floatingVoiceSubmenu) {
            const isVoiceActive = this.elements.stopVoiceBtn && !this.elements.stopVoiceBtn.classList.contains('hidden');
            this.updateFloatingSubmenu(isVoiceActive);
        }
    }

    /**
     * Handle price check form submission
     */
    handlePriceCheckSubmit() {
        const formData = this.collectPriceFormData();
        
        if (this.validatePriceForm(formData)) {
            this.emitPriceCheck(formData);
        }
    }

    /**
     * Collect price form data
     */
    collectPriceFormData() {
        return {
            cardNumber: this.elements.cardNumber?.value?.trim() || '',
            cardName: this.elements.cardName?.value?.trim() || '',
            rarity: this.elements.cardRarity?.value || '',
            artVariant: this.elements.artVariant?.value?.trim() || '',
            condition: this.elements.condition?.value || 'near-mint',
            forceRefresh: this.elements.forceRefresh?.checked || false
        };
    }

    /**
     * Validate price form data
     */
    validatePriceForm(formData) {
        const errors = [];
        
        if (!formData.cardNumber) {
            errors.push('Card number is required');
            this.highlightError(this.elements.cardNumber);
        }
        
        if (!formData.rarity) {
            errors.push('Rarity is required');
            this.highlightError(this.elements.cardRarity);
        }
        
        if (errors.length > 0) {
            this.showToast(errors.join(', '), 'error');
            return false;
        }
        
        // Clear any previous error highlights
        this.clearErrorHighlights();
        return true;
    }

    /**
     * Clear price form
     */
    clearPriceForm() {
        if (this.elements.priceForm) {
            this.elements.priceForm.reset();
        }
        
        this.hidePriceResults();
        this.clearErrorHighlights();
    }

    /**
     * Display price results with image loading and enhanced loading states
     */
    displayPriceResults(results) {
        if (!results || !this.elements.priceContent) {
            return;
        }
        
        // Show loading state first
        this.elements.priceContent.innerHTML = `
            <div class="price-loading">
                <div class="loading-spinner"></div>
                <div class="loading-text">Processing price information...</div>
            </div>
        `;
        
        // Show results container immediately
        if (this.elements.priceResults) {
            this.elements.priceResults.classList.remove('hidden');
        }
        
        // Use setTimeout to allow loading state to be visible
        setTimeout(() => {
            const html = this.generatePriceResultsHTML(results);
            this.elements.priceContent.innerHTML = html;
            
            // Load card image if available
            if (results.success && results.data && results.data.image_url) {
                this.loadCardImage(results.data);
            }
            
            // Scroll to results
            this.elements.priceResults?.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'nearest' 
            });
        }, 200); // Small delay to show loading state
    }

    /**
     * Load and display card image with enhanced error handling
     */
    async loadCardImage(cardData) {
        const imageContainer = document.getElementById('card-image-container');
        if (!imageContainer || !cardData.image_url) return;
        
        try {
            // Import ImageManager dynamically to avoid circular dependencies
            const { ImageManager } = await import('../utils/ImageManager.js');
            const imageManager = new ImageManager();
            
            // Show loading state
            imageManager.displayLoading(imageContainer);
            
            // Load the image with timeout
            const loadPromise = imageManager.loadImageForDisplay(
                cardData.card_number,
                cardData.image_url,
                imageManager.detailModeSize, // Use detail mode size for price results
                imageContainer
            );
            
            // Add timeout to image loading
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Image loading timeout')), 15000); // 15 second timeout
            });
            
            await Promise.race([loadPromise, timeoutPromise]);
            
            console.log(`✅ Successfully loaded image for card ${cardData.card_number}`);
            
        } catch (error) {
            console.warn('Failed to load card image:', error.message);
            
            // Display placeholder on error
            if (imageContainer) {
                imageContainer.innerHTML = `
                    <div class="card-image-placeholder">
                        <div class="placeholder-content">
                            <div class="placeholder-icon">🃏</div>
                            <div class="placeholder-text">Image unavailable</div>
                            <div class="placeholder-error">${error.message}</div>
                        </div>
                    </div>
                `;
            }
        }
    }

    /**
     * Generate HTML for price results (matching oldIteration.py format)
     */
    generatePriceResultsHTML(results) {
        if (!results.success) {
            return `
                <div class="price-error">
                    <h4>❌ Backend API Not Available</h4>
                    <p><strong>Error:</strong> ${results.error || 'Unknown error occurred'}</p>
                    <div class="error-details">
                        <h5>💡 To fix this:</h5>
                        <ol>
                            <li>Start the backend server: <code>python realBackendAPI.py</code></li>
                            <li>Ensure the server is running on <code>${config.API_URL}</code></li>
                            <li>Check that your firewall allows connections to port 8081</li>
                        </ol>
                        <p><em>Mock data has been disabled to ensure you use the real API.</em></p>
                    </div>
                </div>
            `;
        }
        
        const { data: cardData, aggregated, sources, metadata } = results;
        
        // Generate card image section
        const imageSection = cardData.image_url ? `
            <div class="card-image-section">
                <div class="card-image-container" id="card-image-container">
                    <div class="card-image-loading">
                        <div class="loading-spinner"></div>
                        <div class="loading-text">Loading image...</div>
                    </div>
                </div>
            </div>
        ` : '';
        
        // Generate pricing information section
        const pricingSection = this.generatePricingSection(cardData, aggregated);
        
        return `
            <div class="price-results-enhanced">
                <div class="results-header">
                    <div class="header-icon">🃏</div>
                    <h3>YGORIPPERUI - CARD PRICE INFORMATION</h3>
                    <div class="header-line"></div>
                </div>
                
                <div class="results-content">
                    ${imageSection}
                    
                    <div class="card-details-section">
                        <h4>📋 CARD DETAILS:</h4>
                        <div class="details-grid">
                            <div class="detail-item">
                                <span class="detail-label">Name:</span>
                                <span class="detail-value">${cardData.card_name}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Number:</span>
                                <span class="detail-value">${cardData.card_number}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Rarity:</span>
                                <span class="detail-value">${cardData.card_rarity}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Set:</span>
                                <span class="detail-value">${cardData.booster_set_name}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Art Variant:</span>
                                <span class="detail-value">${cardData.card_art_variant}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Set Code:</span>
                                <span class="detail-value">${cardData.set_code}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Last Updated:</span>
                                <span class="detail-value">${cardData.last_price_updt}</span>
                            </div>
                        </div>
                    </div>
                    
                    ${pricingSection}
                    
                    <div class="additional-info-section">
                        <h4>ℹ️ ADDITIONAL INFORMATION:</h4>
                        <div class="additional-grid">
                            <div class="info-item">
                                <span class="info-label">Scrape Success:</span>
                                <span class="info-value">${cardData.scrape_success ? '✅ Yes' : '❌ No'}</span>
                            </div>
                            ${cardData.source_url ? `
                                <div class="info-item">
                                    <span class="info-label">Source URL:</span>
                                    <span class="info-value">
                                        <a href="${cardData.source_url}" target="_blank" rel="noopener">View Source</a>
                                    </span>
                                </div>
                            ` : ''}
                            ${metadata.hasEnhancedInfo ? `
                                <div class="info-item">
                                    <span class="info-label">Data Source:</span>
                                    <span class="info-value">Backend API</span>
                                </div>
                            ` : `
                                <div class="info-item">
                                    <span class="info-label">Data Source:</span>
                                    <span class="info-value">Mock Data</span>
                                </div>
                            `}
                            <div class="info-item">
                                <span class="info-label">Query Time:</span>
                                <span class="info-value">${metadata.queryTime}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generate pricing information section
     */
    generatePricingSection(cardData, aggregated) {
        const prices = [];
        
        // TCGPlayer prices (matching oldIteration.py format)
        if (cardData.tcg_price) {
            prices.push(`🎯 TCGPlayer Low: $${cardData.tcg_price}`);
        }
        if (cardData.tcg_market_price) {
            prices.push(`📈 TCGPlayer Market: $${cardData.tcg_market_price}`);
        }
        
        // Add aggregated prices if available
        if (aggregated && aggregated.averagePrice) {
            prices.push(`📊 Average Price: $${aggregated.averagePrice.toFixed(2)}`);
            prices.push(`📉 Lowest Price: $${aggregated.lowestPrice.toFixed(2)}`);
            prices.push(`📈 Highest Price: $${aggregated.highestPrice.toFixed(2)}`);
            prices.push(`📍 Median Price: $${aggregated.medianPrice.toFixed(2)}`);
        }
        
        const pricesHTML = prices.length > 0 ? 
            prices.map(price => `<div class="price-item">${price}</div>`).join('') :
            '<div class="price-item">❌ No pricing data available</div>';
        
        return `
            <div class="pricing-section">
                <h4>💰 PRICING INFORMATION:</h4>
                <div class="pricing-grid">
                    ${pricesHTML}
                </div>
                ${aggregated ? `
                    <div class="price-confidence">
                        <span class="confidence-label">Confidence Level:</span>
                        <span class="confidence-value">${(aggregated.confidence * 100).toFixed(0)}%</span>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Generate HTML for source-specific data
     */
    generateSourceDataHTML(sourceId, data) {
        switch (sourceId) {
            case 'tcgplayer':
                return `
                    <div class="source-prices">
                        <span class="price-item">Market: $${data.marketPrice?.toFixed(2) || 'N/A'}</span>
                        <span class="price-item">Low: $${data.lowPrice?.toFixed(2) || 'N/A'}</span>
                        <span class="price-item">High: $${data.highPrice?.toFixed(2) || 'N/A'}</span>
                        <span class="price-item">Listings: ${data.listings || 'N/A'}</span>
                    </div>
                `;
            case 'cardmarket':
                return `
                    <div class="source-prices">
                        <span class="price-item">Average: $${data.averagePrice?.toFixed(2) || 'N/A'}</span>
                        <span class="price-item">Trend: $${data.trendPrice?.toFixed(2) || 'N/A'}</span>
                        <span class="price-item">Low: $${data.lowPrice?.toFixed(2) || 'N/A'}</span>
                        <span class="price-item">Listings: ${data.listings || 'N/A'}</span>
                    </div>
                `;
            case 'pricecharting':
                return `
                    <div class="source-prices">
                        <span class="price-item">Price: $${data.priceChartingPrice?.toFixed(2) || 'N/A'}</span>
                        <span class="price-item">Ungraded: $${data.ungraded?.toFixed(2) || 'N/A'}</span>
                        ${data.gradedPrices ? `
                            <span class="price-item">PSA 10: $${data.gradedPrices.psa10?.toFixed(2) || 'N/A'}</span>
                        ` : ''}
                    </div>
                `;
            default:
                return '<span class="price-item">Data available</span>';
        }
    }

    /**
     * Hide price results
     */
    hidePriceResults() {
        if (this.elements.priceResults) {
            this.elements.priceResults.classList.add('hidden');
        }
    }

    /**
     * Handle set selection
     */
    handleSetSelection() {
        const setId = this.elements.setSelect?.value;
        
        if (setId) {
            this.elements.startSessionBtn?.removeAttribute('disabled');
        } else {
            this.elements.startSessionBtn?.setAttribute('disabled', '');
        }
    }

    /**
     * Handle refresh sets
     */
    handleRefreshSets() {
        // Clear search and reload all sets
        if (this.elements.setSearch) {
            this.elements.setSearch.value = '';
        }
        
        // Trigger refresh through the app's session manager
        if (this.app && this.app.sessionManager) {
            this.app.sessionManager.loadCardSets()
                .then(() => {
                    this.showToast('Card sets refreshed successfully', 'success');
                })
                .catch(error => {
                    this.logger.error('Failed to refresh sets:', error);
                    this.showToast('Failed to refresh card sets', 'error');
                });
        } else {
            this.showToast('Refreshing card sets...', 'info');
        }
    }

    /**
     * Handle load all sets
     */
    handleLoadAllSets() {
        // Load all sets without search filter
        if (this.app && this.app.sessionManager) {
            this.elements.loadAllSetsBtn?.setAttribute('disabled', '');
            this.elements.loadAllSetsBtn.textContent = 'Loading...';
            
            this.app.sessionManager.loadCardSets('')
                .then(() => {
                    this.showToast('All card sets loaded successfully', 'success');
                })
                .catch(error => {
                    this.logger.error('Failed to load all sets:', error);
                    this.showToast('Failed to load all card sets', 'error');
                })
                .finally(() => {
                    this.elements.loadAllSetsBtn?.removeAttribute('disabled');
                    this.elements.loadAllSetsBtn.innerHTML = '<span class="btn-icon">📥</span>Load All Sets';
                });
        }
    }

    /**
     * Handle set search with enhanced functionality
     * Uses client-side filtering for fast response, with option for server-side search
     */
    handleSetSearch(searchTerm) {
        if (!this.app || !this.app.sessionManager) return;
        
        const trimmedTerm = searchTerm.trim();
        
        if (trimmedTerm === '') {
            // If search is empty, show all cached sets
            this.app.sessionManager.filterCardSets('');
        } else {
            // For short search terms, use client-side filtering for speed
            // For longer terms, consider server-side search if client-side has few results
            const clientResults = this.app.sessionManager.filterCardSets(trimmedTerm);
            
            // If we have very few client-side results and a meaningful search term,
            // consider triggering a server-side search
            if (clientResults.length < 5 && trimmedTerm.length >= 3) {
                this.logger.info(`Few client results for "${trimmedTerm}", considering server search...`);
                
                // For now, we'll stick with client-side filtering
                // Server-side search can be triggered manually via the refresh button
                // This prevents excessive API calls as the user types
            }
        }
        
        this.logger.debug(`Search handled: "${trimmedTerm}" -> ${this.app.sessionManager.filteredCardSets.length} results`);
    }

    /**
     * Handle session start
     */
    handleSessionStart() {
        const setId = this.elements.setSelect?.value;
        
        if (setId) {
            this.emitSessionStart(setId);
        } else {
            this.showToast('Please select a card set first', 'warning');
        }
    }

    /**
     * Update card sets dropdown with enhanced data handling
     */
    updateCardSets(sets, searchTerm = '', totalSets = 0) {
        if (!this.elements.setSelect) return;
        
        // Clear existing options
        this.elements.setSelect.innerHTML = '';
        
        if (sets.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = searchTerm ? 
                `No sets found matching "${searchTerm}"` : 
                'Loading card sets... (Ensure backend is running on port 8081)';
            this.elements.setSelect.appendChild(option);
        } else {
            // Add default option with helpful text
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = searchTerm ?
                `Select from ${sets.length} filtered sets...` :
                `Select a card set... (${sets.length} available)`;
            this.elements.setSelect.appendChild(defaultOption);
            
            // Sort sets by code for better UX
            const sortedSets = [...sets].sort((a, b) => {
                const codeA = (a.code || a.set_code || '').toUpperCase();
                const codeB = (b.code || b.set_code || '').toUpperCase();
                return codeA.localeCompare(codeB);
            });
            
            // Add set options
            sortedSets.forEach(set => {
                const option = document.createElement('option');
                const setCode = set.code || set.set_code || set.id || 'UNK';
                const setName = set.name || set.set_name || 'Unknown Set';
                
                option.value = set.id || set.code || set.set_code;
                option.textContent = `${setCode} - ${setName}`;
                option.dataset.setName = set.set_name || set.name;
                option.dataset.setCode = set.set_code || set.code;
                option.title = `${setCode}: ${setName}`; // Tooltip for long names
                
                this.elements.setSelect.appendChild(option);
            });
        }
        
        // Update counters with enhanced information
        if (this.elements.setsCount) {
            this.elements.setsCount.textContent = sets.length.toString();
        }
        
        if (this.elements.totalSetsCount) {
            const total = totalSets || sets.length;
            this.elements.totalSetsCount.textContent = total.toString();
            
            // Show a warning if we have fewer sets than expected
            if (!searchTerm && total < 500) {
                this.logger.warn(`Only ${total} sets loaded, expected 990+. Check backend API.`);
                this.showToast(`Only ${total} sets loaded (expected 990+). Check if backend is running properly.`, 'warning');
            }
        }
        
        // Update status message in the UI
        if (sets.length > 0) {
            const statusMessage = searchTerm ? 
                `Found ${sets.length} sets matching "${searchTerm}"` :
                `Loaded ${sets.length} card sets from backend`;
            
            // Show success message for significant loads
            if (!searchTerm && sets.length > 100) {
                this.showToast(statusMessage, 'success');
            }
        }
        
        this.logger.info(`Updated card sets dropdown: ${sets.length} displayed, ${totalSets || sets.length} total available`);
    }

    /**
     * Update session information display
     */
    updateSessionInfo(sessionInfo) {
        if (this.elements.currentSet) {
            this.elements.currentSet.textContent = sessionInfo.setName;
        }
        
        if (this.elements.cardsCount) {
            this.elements.cardsCount.textContent = sessionInfo.cardCount.toString();
        }
        
        // Update separate pricing totals
        if (this.elements.tcgLowTotal) {
            const tcgLowTotal = sessionInfo.statistics?.tcgLowTotal || 0;
            this.elements.tcgLowTotal.textContent = `$${tcgLowTotal.toFixed(2)}`;
        }
        
        if (this.elements.tcgMarketTotal) {
            const tcgMarketTotal = sessionInfo.statistics?.tcgMarketTotal || 0;
            this.elements.tcgMarketTotal.textContent = `$${tcgMarketTotal.toFixed(2)}`;
        }
        
        if (this.elements.sessionStatus) {
            this.elements.sessionStatus.textContent = sessionInfo.status;
            this.elements.sessionStatus.className = `stat-value status-badge ${sessionInfo.isActive ? 'active' : 'inactive'}`;
        }
        
        // Update session tracker controls
        const hasSession = sessionInfo.cardCount > 0;
        this.elements.exportSessionBtn?.toggleAttribute('disabled', !hasSession);
        this.elements.clearSessionBtn?.toggleAttribute('disabled', !hasSession);
        
        // Show and enable the swap set button when a session is active
        if (this.elements.swapSetBtn) {
            const isActiveSession = sessionInfo.isActive === true;
            this.elements.swapSetBtn.classList.toggle('hidden', !isActiveSession);
            this.elements.swapSetBtn.disabled = !isActiveSession;
        }
        
        // Enable/disable refresh pricing button based on whether there are imported cards
        if (this.elements.refreshPricingBtn && this.app && this.app.sessionManager) {
            try {
                const importedInfo = this.app.sessionManager.getImportedCardsInfo();
                const hasImportedCards = importedInfo.hasImportedCards;
                
                this.elements.refreshPricingBtn.toggleAttribute('disabled', !hasImportedCards);
                
                // Update button tooltip with imported cards count
                if (hasImportedCards) {
                    this.elements.refreshPricingBtn.title = `Refresh pricing data for ${importedInfo.importedCards} imported cards`;
                    this.elements.refreshPricingBtn.style.display = '';
                } else {
                    this.elements.refreshPricingBtn.title = 'No imported cards to refresh';
                    this.elements.refreshPricingBtn.style.display = hasSession ? '' : 'none';
                }
            } catch (error) {
                // Fallback to simple logic if there's an error
                this.elements.refreshPricingBtn.toggleAttribute('disabled', !hasSession);
            }
        }
        
        // Update session cards display
        this.displaySessionCards(sessionInfo.cards || []);
    }

    /**
     * Update a single card's display in the UI
     * @param {Object} card - The updated card data
     */
    updateCardDisplay(card) {
        if (!this.elements.sessionCards) return;
        
        // Find the existing card element
        const cardElement = this.elements.sessionCards.querySelector(`.session-card[data-card-id="${card.id}"]`);
        if (!cardElement) return;
        
        // Create a new card element with updated data
        const newCardElement = this.isConsolidatedView ? 
            this.createConsolidatedCardElement(card) : 
            this.createSessionCardElement(card);
            
        // Replace the old card with the updated one
        cardElement.replaceWith(newCardElement);
    }

    /**
     * Display session cards with quantity adjustment buttons
     */
    displaySessionCards(cards) {
        if (!this.elements.sessionCards) return;
        
        // Remove existing cards
        const existingCards = this.elements.sessionCards.querySelectorAll('.session-card');
        existingCards.forEach(card => card.remove());
        
        if (cards.length === 0) {
            // Show empty state
            if (this.elements.emptySession) {
                this.elements.emptySession.classList.remove('hidden');
            }
            return;
        }
        
        // Hide empty state
        if (this.elements.emptySession) {
            this.elements.emptySession.classList.add('hidden');
        }
        
        // Apply view mode classes
        this.updateSessionViewMode();
        
        // Display cards based on current view mode
        const previousCardCount = this.elements.sessionCards.querySelectorAll('.session-card').length;
        
        cards.forEach(card => {
            const cardElement = this.isConsolidatedView ? 
                this.createConsolidatedCardElement(card) : 
                this.createSessionCardElement(card);
            this.elements.sessionCards.appendChild(cardElement);
        });
        
        // Trigger autoscroll if new cards were added
        const newCardCount = cards.length;
        if (newCardCount > previousCardCount) {
            // Delay autoscroll slightly to ensure DOM is updated
            setTimeout(() => {
                this.scrollToNewestCard();
            }, 100);
        }
    }

    /**
     * Create a session card element with enhanced display including images and detailed pricing
     */
    createSessionCardElement(card) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'session-card enhanced';
        cardDiv.dataset.cardId = card.id;
        
        // Determine display values with enhanced info priority
        const cardName = card.card_name || card.name || 'Unknown Card';
        const rarity = card.card_rarity || card.displayRarity || card.rarity || 'Unknown';
        const setCode = card.set_code || card.setInfo?.setCode || '';
        const cardNumber = card.card_number || '';
        const setName = card.booster_set_name || card.setInfo?.setName || '';
        const price = card.price || parseFloat(card.tcg_market_price || card.tcg_price || '0');
        const hasEnhancedInfo = card.hasEnhancedInfo || false;
        
        // Create the enhanced card HTML
        cardDiv.innerHTML = `
            <div class="session-card-content">
                <div class="card-image-section">
                    <div class="card-image-container" data-card-id="${card.id}">
                        ${card.image_url ? `
                            <div class="card-image-loading">
                                <div class="loading-spinner-small"></div>
                                <div class="loading-text-small">Loading...</div>
                            </div>
                        ` : `
                            <div class="card-image-placeholder">
                                <div class="placeholder-icon">🃏</div>
                            </div>
                        `}
                    </div>
                </div>
                
                <div class="card-details-section">
                    <div class="card-header">
                        <div class="card-name">${cardName}</div>
                        <div class="card-enhancement-indicator">
                            ${hasEnhancedInfo ? '✨' : '📦'}
                        </div>
                    </div>
                    
                    <div class="card-info-grid">
                        <div class="info-row">
                            <span class="info-label">Rarity:</span>
                            <span class="info-value rarity-${rarity.toLowerCase().replace(/\s+/g, '-')}">${rarity}</span>
                        </div>
                        ${setCode ? `
                            <div class="info-row">
                                <span class="info-label">Set:</span>
                                <span class="info-value">${setCode}</span>
                            </div>
                        ` : ''}
                        ${cardNumber ? `
                            <div class="info-row">
                                <span class="info-label">Card #:</span>
                                <span class="info-value">${cardNumber}</span>
                            </div>
                        ` : ''}
                        <div class="info-row">
                            <span class="info-label">Art Variant:</span>
                            <span class="info-value">${card.art_variant || card.card_art_variant || 'N/A'}</span>
                        </div>
                        ${setName ? `
                            <div class="info-row">
                                <span class="info-label">Set Name:</span>
                                <span class="info-value set-name">${setName}</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="card-pricing">
                        ${card.price_status === 'loading' ? `
                            <div class="price-loading">
                                <div class="loading-spinner-tiny"></div>
                                <span>Loading price...</span>
                            </div>
                        ` : price > 0 ? `
                            <div class="pricing-info">
                                ${card.tcg_price ? `
                                    <div class="price-item">
                                        <span class="price-label">TCG Low:</span>
                                        <span class="price-value">$${card.tcg_price}</span>
                                    </div>
                                ` : ''}
                                ${card.tcg_market_price ? `
                                    <div class="price-item primary">
                                        <span class="price-label">TCG Market:</span>
                                        <span class="price-value">$${card.tcg_market_price}</span>
                                    </div>
                                ` : `
                                    <div class="price-item primary">
                                        <span class="price-label">Est. Value:</span>
                                        <span class="price-value">$${price.toFixed(2)}</span>
                                    </div>
                                `}
                            </div>
                        ` : `
                            <div class="price-unavailable">Price data unavailable</div>
                        `}
                    </div>
                </div>
                
                <div class="card-controls">
                    <div class="quantity-controls">
                        <button class="btn btn-sm quantity-btn decrease-qty" data-card-id="${card.id}" title="Decrease Quantity">-</button>
                        <span class="quantity-display">${card.quantity || 1}</span>
                        <button class="btn btn-sm quantity-btn increase-qty" data-card-id="${card.id}" title="Increase Quantity">+</button>
                    </div>
                    <div class="action-controls">
                        ${(card.importedPricing === true || card.price_status === 'imported' || card.price_status === 'loaded') ? `
                            <button class="btn btn-sm btn-secondary refresh-pricing" data-card-id="${card.id}" title="Refresh Pricing Data">🔄</button>
                        ` : ''}
                        <button class="btn btn-sm btn-danger remove-card" data-card-id="${card.id}" title="Remove Card">🗑️</button>
                    </div>
                </div>
            </div>
        `;
        
        // Add event listeners for quantity adjustment
        const decreaseBtn = cardDiv.querySelector('.decrease-qty');
        const increaseBtn = cardDiv.querySelector('.increase-qty');
        const removeBtn = cardDiv.querySelector('.remove-card');
        const refreshPricingBtn = cardDiv.querySelector('.refresh-pricing');
        
        decreaseBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.emitQuantityAdjust(card.id, -1);
        });
        
        increaseBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.emitQuantityAdjust(card.id, 1);
        });
        
        removeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.emitCardRemove(card.id);
        });
        
        // Add event listener for pricing refresh if button exists
        if (refreshPricingBtn) {
            refreshPricingBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.emitPricingRefresh(card.id);
            });
        }
        
        // Load card image if available
        if (card.image_url) {
            this.loadSessionCardImage(card, cardDiv);
        }
        
        return cardDiv;
    }

    /**
     * Handle view toggle between normal and consolidated
     */
    handleViewToggle(isConsolidated) {
        this.isConsolidatedView = isConsolidated;
        
        // Show/hide card size controls
        if (this.elements.cardSizeSection) {
            this.elements.cardSizeSection.style.display = isConsolidated ? 'flex' : 'none';
        }
        
        // Update view mode
        this.updateSessionViewMode();
        
        // Refresh session cards display if we have cards
        if (this.app && this.app.sessionManager && this.app.sessionManager.currentSession) {
            this.displaySessionCards(this.app.sessionManager.currentSession.cards || []);
        }
    }

    /**
     * Handle card size slider change
     */
    handleCardSizeChange(size) {
        this.cardSize = size;
        
        // Update size display
        if (this.elements.cardSizeValue) {
            this.elements.cardSizeValue.textContent = `${size}px`;
        }
        
        // Update CSS custom property
        if (this.elements.sessionCards) {
            this.elements.sessionCards.style.setProperty('--card-size', `${size}px`);
        }
    }

    /**
     * Update session view mode classes
     */
    updateSessionViewMode() {
        if (!this.elements.sessionCards) return;
        
        if (this.isConsolidatedView) {
            this.elements.sessionCards.classList.add('consolidated');
            this.elements.sessionCards.style.setProperty('--card-size', `${this.cardSize}px`);
        } else {
            this.elements.sessionCards.classList.remove('consolidated');
            this.elements.sessionCards.style.removeProperty('--card-size');
        }
    }

    /**
     * Create a consolidated card element for grid view
     */
    createConsolidatedCardElement(card) {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'session-card consolidated';
        cardDiv.dataset.cardId = card.id;
        
        // Determine display values
        const cardName = card.card_name || card.name || 'Unknown Card';
        const rarity = card.card_rarity || card.displayRarity || card.rarity || 'Unknown';
        const tcgLow = card.tcg_price ? parseFloat(card.tcg_price) : 0;
        const tcgMarket = card.tcg_market_price ? parseFloat(card.tcg_market_price) : 0;
        const quantity = card.quantity || 1;
        
        // Create the consolidated card HTML
        cardDiv.innerHTML = `
            <div class="card-image-container" data-card-id="${card.id}">
                ${card.image_url ? `
                    <div class="card-image-loading">
                        <div class="loading-spinner-small"></div>
                    </div>
                ` : `
                    <div class="card-image-placeholder">
                        <div class="placeholder-icon">🃏</div>
                    </div>
                `}
            </div>
            <div class="card-info">
                <div class="card-name">${cardName}</div>
                <div class="card-rarity">${rarity}</div>
                <div class="card-prices">
                    ${tcgLow > 0 ? `<div class="price tcg-low">Low: $${tcgLow.toFixed(2)}</div>` : ''}
                    ${tcgMarket > 0 ? `<div class="price tcg-market">Market: $${tcgMarket.toFixed(2)}</div>` : ''}
                </div>
            </div>
            ${quantity > 1 ? `<div class="quantity-badge">${quantity}</div>` : ''}
        `;
        
        // Add hover event listeners for popup
        cardDiv.addEventListener('mouseenter', (e) => {
            this.showCardPopup(e, card);
        });
        
        cardDiv.addEventListener('mouseleave', () => {
            this.hideCardPopup();
        });
        
        // Load card image if available
        if (card.image_url) {
            this.loadSessionCardImage(card, cardDiv);
        }
        
        return cardDiv;
    }

    /**
     * Show card popup on hover
     */
    showCardPopup(event, card) {
        // Remove existing popup
        this.hideCardPopup();
        
        const popup = document.createElement('div');
        popup.className = 'card-popup';
        popup.id = 'card-popup';
        
        // Create popup content
        const setCode = card.set_code || card.setInfo?.setCode || 'N/A';
        const setName = card.booster_set_name || card.setInfo?.setName || 'N/A';
        const cardNumber = card.card_number || 'N/A';
        const lastUpdate = card.last_price_updt || 'N/A';
        const sourceUrl = card.source_url || 'N/A';
        const artVariant = card.art_variant || card.card_art_variant || 'N/A';
        
        popup.innerHTML = `
            <div class="popup-header">${card.card_name || card.name || 'Unknown Card'}</div>
            <div class="popup-content">
                <span class="popup-label">Set Code:</span>
                <span class="popup-value">${setCode}</span>
                <span class="popup-label">Set Name:</span>
                <span class="popup-value">${setName}</span>
                <span class="popup-label">Card Number:</span>
                <span class="popup-value">${cardNumber}</span>
                <span class="popup-label">Art Variant:</span>
                <span class="popup-value">${artVariant}</span>
                <span class="popup-label">Last Update:</span>
                <span class="popup-value">${lastUpdate}</span>
                ${sourceUrl !== 'N/A' ? `
                    <span class="popup-label">Source URL:</span>
                    <span class="popup-value url" onclick="window.open('${sourceUrl}', '_blank')">${sourceUrl}</span>
                ` : ''}
            </div>
        `;
        
        // Position popup
        document.body.appendChild(popup);
        
        const rect = event.currentTarget.getBoundingClientRect();
        const popupRect = popup.getBoundingClientRect();
        
        // Position popup above the card if there's space, otherwise below
        let top = rect.top - popupRect.height - 10;
        if (top < 10) {
            top = rect.bottom + 10;
        }
        
        // Keep popup within viewport horizontally
        let left = rect.left + (rect.width / 2) - (popupRect.width / 2);
        if (left < 10) {
            left = 10;
        } else if (left + popupRect.width > window.innerWidth - 10) {
            left = window.innerWidth - popupRect.width - 10;
        }
        
        popup.style.left = `${left}px`;
        popup.style.top = `${top}px`;
        
        // Trigger animation
        requestAnimationFrame(() => {
            popup.classList.add('show');
        });
        
        this.currentPopup = popup;
    }

    /**
     * Hide card popup
     */
    hideCardPopup() {
        if (this.currentPopup) {
            this.currentPopup.remove();
            this.currentPopup = null;
        }
    }

    /**
     * Load and display image for session card
     */
    async loadSessionCardImage(card, cardElement) {
        const imageContainer = cardElement.querySelector('.card-image-container');
        if (!imageContainer) return;
        
        try {
            // Import ImageManager dynamically to avoid circular dependencies
            const { ImageManager } = await import('../utils/ImageManager.js');
            const imageManager = new ImageManager();
            
            // Use normal mode size for session cards (not as large as detail mode)
            const cardImagePromise = imageManager.loadImageForDisplay(
                card.card_number || card.id,
                card.image_url,
                imageManager.normalModeSize,
                imageContainer
            );
            
            // Add timeout to prevent hanging
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Session card image loading timeout')), 10000); // 10 second timeout
            });
            
            await Promise.race([cardImagePromise, timeoutPromise]);
            
            console.log(`✅ Successfully loaded session card image for ${card.card_name || card.name}`);
            
        } catch (error) {
            console.warn('Failed to load session card image:', error.message);
            
            // Display placeholder on error
            if (imageContainer) {
                imageContainer.innerHTML = `
                    <div class="card-image-placeholder error">
                        <div class="placeholder-icon">🃏</div>
                        <div class="placeholder-text">Image unavailable</div>
                    </div>
                `;
            }
        }
    }

    /**
     * Update voice status
     */
    updateVoiceStatus(status) {
        if (!this.elements.voiceStatusText) return;
        
        let statusText = '';
        let statusClass = '';
        
        switch (status) {
            case 'ready':
                statusText = 'Voice recognition ready';
                statusClass = 'ready';
                this.updateVoiceButtons(false);
                break;
            case 'listening':
                statusText = 'Listening for card names...';
                statusClass = 'listening';
                this.updateVoiceButtons(true);
                break;
            case 'processing':
                statusText = 'Processing voice input...';
                statusClass = 'processing';
                break;
            case 'error':
                statusText = 'Voice recognition error';
                statusClass = 'error';
                this.updateVoiceButtons(false);
                break;
            case 'not-available':
                statusText = 'Voice recognition not available';
                statusClass = 'error';
                this.updateVoiceButtons(false, true);
                break;
            default:
                statusText = status;
                statusClass = 'unknown';
        }
        
        this.elements.voiceStatusText.textContent = statusText;
        
        if (this.elements.voiceIndicator) {
            this.elements.voiceIndicator.className = `status-indicator ${statusClass}`;
        }
    }

    /**
     * Update voice control buttons
     */
    updateVoiceButtons(isListening, disabled = false) {
        if (this.elements.startVoiceBtn) {
            this.elements.startVoiceBtn.classList.toggle('hidden', isListening || disabled);
            this.elements.startVoiceBtn.disabled = disabled;
        }
        
        if (this.elements.stopVoiceBtn) {
            this.elements.stopVoiceBtn.classList.toggle('hidden', !isListening || disabled);
        }
        
        if (this.elements.testVoiceBtn) {
            this.elements.testVoiceBtn.disabled = isListening || disabled;
        }
        
        // Update floating submenu visibility
        this.updateFloatingSubmenu(isListening, disabled);
    }

    /**
     * Update floating submenu visibility and position
     */
    updateFloatingSubmenu(show, disabled = false) {
        if (!this.elements.floatingVoiceSubmenu) return;
        
        // Only show if we're in the pack ripper tab
        const isPackRipperTab = this.currentTab === 'pack-ripper';
        const shouldShow = show && isPackRipperTab && !disabled;
        
        if (shouldShow) {
            this.elements.floatingVoiceSubmenu.classList.remove('hidden');
        } else {
            this.elements.floatingVoiceSubmenu.classList.add('hidden');
        }
    }

    /**
     * Scroll to newest card in session (contextual autoscrolling)
     */
    scrollToNewestCard() {
        if (!this.elements.sessionCards) return;
        
        // Only autoscroll if we're in pack ripper tab and voice is active
        const isPackRipperTab = this.currentTab === 'pack-ripper';
        const isVoiceActive = this.elements.stopVoiceBtn && !this.elements.stopVoiceBtn.classList.contains('hidden');
        
        if (!isPackRipperTab || !isVoiceActive) return;
        
        // Find the last added card (newest)
        const sessionCards = this.elements.sessionCards.querySelectorAll('.session-card');
        if (sessionCards.length === 0) return;
        
        const newestCard = sessionCards[sessionCards.length - 1];
        
        // Smooth scroll to the newest card with some offset for better visibility
        try {
            newestCard.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest'
            });
        } catch (error) {
            // Fallback for older browsers
            newestCard.scrollIntoView();
        }
        
        // Add a brief highlight effect to the newest card
        newestCard.classList.add('newly-added');
        setTimeout(() => {
            newestCard.classList.remove('newly-added');
        }, 2000);
    }

    /**
     * Clear session display
     */
    clearSessionDisplay() {
        if (this.elements.sessionCards) {
            // Remove all cards except empty state
            const cardElements = this.elements.sessionCards.querySelectorAll('.session-card');
            cardElements.forEach(card => card.remove());
        }
        
        if (this.elements.emptySession) {
            this.elements.emptySession.classList.remove('hidden');
        }
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info', duration = null) {
        const toast = this.createToast(message, type, duration);
        this.elements.toastContainer?.appendChild(toast);
        
        // Auto-remove after duration
        const toastDuration = duration || this.config.toastDuration;
        setTimeout(() => {
            this.removeToast(toast);
        }, toastDuration);
        
        this.logger.debug(`Toast shown: ${message} (${type})`);
    }

    /**
     * Create toast element
     */
    createToast(message, type, duration) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">${this.getToastIcon(type)}</span>
                <span class="toast-message">${message}</span>
                <button class="toast-close" aria-label="Close notification">×</button>
            </div>
        `;
        
        // Add close button functionality
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn?.addEventListener('click', () => {
            this.removeToast(toast);
        });
        
        return toast;
    }

    /**
     * Get toast icon based on type
     */
    getToastIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    /**
     * Remove toast
     */
    removeToast(toast) {
        if (toast && toast.parentNode) {
            toast.classList.add('toast-exit');
            setTimeout(() => {
                toast.remove();
            }, this.config.animationDuration);
        }
    }

    /**
     * Set loading state
     */
    setLoading(isLoading) {
        this.isLoading = isLoading;
        
        // Update form submit buttons
        const submitBtns = document.querySelectorAll('button[type="submit"], .btn-primary');
        submitBtns.forEach(btn => {
            btn.disabled = isLoading;
            btn.classList.toggle('loading', isLoading);
        });
        
        // Update app status
        if (isLoading) {
            this.updateAppStatus('Loading...');
        } else {
            this.updateAppStatus('Ready');
        }
    }

    /**
     * Update app status
     */
    updateAppStatus(status) {
        if (this.elements.appStatus) {
            this.elements.appStatus.textContent = status;
        }
    }

    /**
     * Update connection status
     */
    updateConnectionStatus(isOnline) {
        if (this.elements.connectionStatus) {
            this.elements.connectionStatus.textContent = isOnline ? 'Online' : 'Offline';
            this.elements.connectionStatus.className = isOnline ? 'online' : 'offline';
        }
    }

    /**
     * Highlight form field error
     */
    highlightError(element) {
        if (element) {
            element.classList.add('error');
            element.setAttribute('aria-invalid', 'true');
        }
    }

    /**
     * Clear error highlights
     */
    clearErrorHighlights() {
        const errorElements = document.querySelectorAll('.error');
        errorElements.forEach(el => {
            el.classList.remove('error');
            el.removeAttribute('aria-invalid');
        });
    }

    /**
     * Show settings modal
     */
    showSettings(currentSettings = {}) {
        const modal = this.createModal('Settings', this.generateSettingsHTML());
        this.showModal(modal);
        
        // Populate current settings
        this.populateSettingsForm(currentSettings);
        
        // Add event listeners for settings
        this.setupSettingsEventListeners();
    }

    /**
     * Show mappings modal
     */
    showMappingsModal(cardMappings, rarityMappings) {
        const content = this.generateMappingsHTML(cardMappings, rarityMappings);
        const modal = this.createModal('Voice Recognition Mappings', content);
        this.showModal(modal);
    }

    /**
     * Generate mappings HTML
     */
    generateMappingsHTML(cardMappings, rarityMappings) {
        return `
            <div class="mappings-container">
                <div class="mappings-section">
                    <h4>Card Name Mappings (${cardMappings.length})</h4>
                    <div class="mappings-list">
                        ${cardMappings.length > 0 ? 
                            cardMappings.map(mapping => `
                                <div class="mapping-item">
                                    <div class="mapping-voice">
                                        <span class="mapping-label">Voice:</span>
                                        <span class="mapping-value">"${mapping.voiceInput}"</span>
                                    </div>
                                    <div class="mapping-arrow">→</div>
                                    <div class="mapping-target">
                                        <span class="mapping-label">Card:</span>
                                        <span class="mapping-value">${mapping.cardName}</span>
                                        ${mapping.setCode ? `<span class="mapping-set">(${mapping.setCode})</span>` : ''}
                                    </div>
                                    <div class="mapping-stats">
                                        <span class="mapping-confidence">Confidence: ${(mapping.confidence * 100).toFixed(1)}%</span>
                                        <span class="mapping-usage">Used: ${mapping.useCount || 0} times</span>
                                    </div>
                                </div>
                            `).join('') 
                            : '<div class="mapping-empty">No card mappings found. Start training to create some!</div>'
                        }
                    </div>
                </div>
                
                <div class="mappings-section">
                    <h4>Rarity Mappings (${rarityMappings.length})</h4>
                    <div class="mappings-list">
                        ${rarityMappings.length > 0 ? 
                            rarityMappings.map(mapping => `
                                <div class="mapping-item">
                                    <div class="mapping-voice">
                                        <span class="mapping-label">Voice:</span>
                                        <span class="mapping-value">"${mapping.voiceInput}"</span>
                                    </div>
                                    <div class="mapping-arrow">→</div>
                                    <div class="mapping-target">
                                        <span class="mapping-label">Rarity:</span>
                                        <span class="mapping-value">${mapping.rarity}</span>
                                    </div>
                                    <div class="mapping-stats">
                                        <span class="mapping-confidence">Confidence: ${(mapping.confidence * 100).toFixed(1)}%</span>
                                        <span class="mapping-usage">Used: ${mapping.useCount || 0} times</span>
                                    </div>
                                </div>
                            `).join('') 
                            : '<div class="mapping-empty">No rarity mappings found. Start training to create some!</div>'
                        }
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Show help modal
     */
    showHelp() {
        const modal = this.createModal('Help & Instructions', this.generateHelpHTML());
        this.showModal(modal);
    }

    /**
     * Create modal
     */
    createModal(title, content) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close" aria-label="Close modal">×</button>
            </div>
            <div class="modal-content">
                ${content}
            </div>
        `;
        
        // Add close functionality
        const closeBtn = modal.querySelector('.modal-close');
        closeBtn?.addEventListener('click', () => {
            this.closeModal();
        });
        
        return modal;
    }

    /**
     * Show modal
     */
    showModal(modal) {
        if (this.elements.modalOverlay) {
            this.elements.modalOverlay.innerHTML = '';
            this.elements.modalOverlay.appendChild(modal);
            this.elements.modalOverlay.classList.remove('hidden');
            
            // Focus management
            modal.querySelector('button')?.focus();
        }
    }

    /**
     * Close modal
     */
    closeModal() {
        if (this.elements.modalOverlay) {
            this.elements.modalOverlay.classList.add('hidden');
        }
    }

    /**
     * Generate settings HTML
     */
    generateSettingsHTML() {
        // Get current settings from the app (will be passed by the app later)
        // For now, use default values as fallback
        return `
            <div class="settings-content">
                <div class="setting-group">
                    <h4>Voice Recognition</h4>
                    
                    <div class="setting-item">
                        <label for="auto-confirm-checkbox">
                            <input type="checkbox" id="auto-confirm-checkbox" name="autoConfirm">
                            Enable Auto-confirm
                        </label>
                        <p class="setting-description">Automatically add cards when confidence is above threshold</p>
                    </div>
                    
                    <div class="setting-item">
                        <label for="auto-confirm-threshold">Auto-confirm Threshold</label>
                        <div class="threshold-input">
                            <input type="range" id="auto-confirm-threshold" name="autoConfirmThreshold" 
                                   min="0" max="100" step="1" value="85">
                            <span class="threshold-value">85%</span>
                        </div>
                        <p class="setting-description">Minimum confidence required for auto-confirm (0-100%)</p>
                    </div>
                    
                    <div class="setting-item">
                        <label for="voice-confidence-threshold">Voice Confidence Threshold</label>
                        <div class="threshold-input">
                            <input type="range" id="voice-confidence-threshold" name="voiceConfidenceThreshold" 
                                   min="0" max="100" step="1" value="50">
                            <span class="threshold-value">50%</span>
                        </div>
                        <p class="setting-description">Minimum confidence level for voice recognition (0-100%)</p>
                    </div>
                    
                    <div class="setting-item">
                        <label for="voice-max-alternatives">Max Voice Alternatives</label>
                        <input type="number" id="voice-max-alternatives" name="voiceMaxAlternatives" 
                               min="1" max="10" value="5">
                        <p class="setting-description">Number of recognition alternatives to consider (1-10)</p>
                    </div>
                    
                    <div class="setting-item">
                        <label for="voice-continuous">
                            <input type="checkbox" id="voice-continuous" name="voiceContinuous" checked>
                            Continuous Listening
                        </label>
                        <p class="setting-description">Keep listening for multiple commands</p>
                    </div>
                    
                    <div class="setting-item">
                        <label for="voice-interim-results">
                            <input type="checkbox" id="voice-interim-results" name="voiceInterimResults" checked>
                            Show Interim Results
                        </label>
                        <p class="setting-description">Show recognition results while speaking</p>
                    </div>
                    
                    <div class="setting-item">
                        <label for="auto-extract-rarity-checkbox">
                            <input type="checkbox" id="auto-extract-rarity-checkbox" name="autoExtractRarity">
                            Auto-extract rarity from voice
                        </label>
                        <p class="setting-description">Automatically detect rarity information from voice input</p>
                    </div>
                    
                    <div class="setting-item">
                        <label for="auto-extract-art-variant-checkbox">
                            <input type="checkbox" id="auto-extract-art-variant-checkbox" name="autoExtractArtVariant">
                            Auto-extract art variant from voice
                        </label>
                        <p class="setting-description">Automatically detect art variant information from voice input</p>
                    </div>
                </div>
                
                <div class="setting-group">
                    <h4>General Settings</h4>
                    
                    <div class="setting-item">
                        <label for="voice-timeout">Voice Timeout (seconds)</label>
                        <input type="number" id="voice-timeout" name="voiceTimeout" min="3" max="15" value="5">
                        <p class="setting-description">How long to wait for voice input</p>
                    </div>
                    
                    <div class="setting-item">
                        <label for="session-auto-save">
                            <input type="checkbox" id="session-auto-save" name="sessionAutoSave" checked>
                            Auto-save sessions
                        </label>
                        <p class="setting-description">Automatically save session changes</p>
                    </div>
                    
                    <div class="setting-item">
                        <label for="theme-select">Theme</label>
                        <select id="theme-select" name="theme">
                            <option value="dark" selected>Dark</option>
                            <option value="light">Light</option>
                        </select>
                    </div>
                </div>
                
                <div class="settings-actions">
                    <button class="btn btn-primary" id="save-settings">Save Settings</button>
                    <button class="btn btn-secondary" id="reset-settings">Reset to Defaults</button>
                </div>
            </div>
        `;
    }

    /**
     * Populate settings form with current values
     */
    populateSettingsForm(settings) {
        const autoConfirmCheckbox = document.getElementById('auto-confirm-checkbox');
        const autoConfirmThreshold = document.getElementById('auto-confirm-threshold');
        const thresholdValue = document.querySelector('.threshold-value');
        const voiceTimeout = document.getElementById('voice-timeout');
        const sessionAutoSave = document.getElementById('session-auto-save');
        const themeSelect = document.getElementById('theme-select');
        const autoExtractRarityCheckbox = document.getElementById('auto-extract-rarity-checkbox');
        const autoExtractArtVariantCheckbox = document.getElementById('auto-extract-art-variant-checkbox');
        
        if (autoConfirmCheckbox) {
            autoConfirmCheckbox.checked = settings.autoConfirm || false;
        }
        
        if (autoConfirmThreshold) {
            const threshold = settings.autoConfirmThreshold || 85;
            autoConfirmThreshold.value = threshold;
            if (thresholdValue) {
                thresholdValue.textContent = `${threshold}%`;
            }
        }
        
        if (autoExtractRarityCheckbox) {
            autoExtractRarityCheckbox.checked = settings.autoExtractRarity || false;
        }
        
        if (autoExtractArtVariantCheckbox) {
            autoExtractArtVariantCheckbox.checked = settings.autoExtractArtVariant || false;
        }
        
        if (voiceTimeout) {
            voiceTimeout.value = (settings.voiceTimeout || 5000) / 1000; // Convert ms to seconds
        }
        
        if (sessionAutoSave) {
            sessionAutoSave.checked = settings.sessionAutoSave !== false; // Default to true
        }
        
        if (themeSelect) {
            themeSelect.value = settings.theme || 'dark';
        }
    }

    /**
     * Setup event listeners for settings form
     */
    setupSettingsEventListeners() {
        // Auto-confirm threshold slider update
        const autoConfirmThreshold = document.getElementById('auto-confirm-threshold');
        const autoConfirmThresholdValue = autoConfirmThreshold?.parentElement?.querySelector('.threshold-value');
        
        if (autoConfirmThreshold && autoConfirmThresholdValue) {
            autoConfirmThreshold.addEventListener('input', (e) => {
                autoConfirmThresholdValue.textContent = `${e.target.value}%`;
            });
        }
        
        // Voice confidence threshold slider update
        const voiceConfidenceThreshold = document.getElementById('voice-confidence-threshold');
        const voiceConfidenceThresholdValue = voiceConfidenceThreshold?.parentElement?.querySelector('.threshold-value');
        
        if (voiceConfidenceThreshold && voiceConfidenceThresholdValue) {
            voiceConfidenceThreshold.addEventListener('input', (e) => {
                voiceConfidenceThresholdValue.textContent = `${e.target.value}%`;
            });
        }
        
        // Save settings button
        const saveBtn = document.getElementById('save-settings');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.handleSaveSettings();
            });
        }
        
        // Reset settings button
        const resetBtn = document.getElementById('reset-settings');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.handleResetSettings();
            });
        }
    }
    
    /**
     * Handle save settings
     */
    handleSaveSettings() {
        const settingsData = this.collectSettingsData();
        this.emitSettingsSave(settingsData);
        this.closeModal();
        this.showToast('Settings saved successfully', 'success');
    }

    /**
     * Handle reset settings
     */
    handleResetSettings() {
        // Reset to default values
        const defaultSettings = {
            // General settings
            autoConfirm: false,
            autoConfirmThreshold: 85,
            voiceTimeout: 5000,
            sessionAutoSave: true,
            theme: 'dark',
            
            // Voice recognition settings
            voiceConfidenceThreshold: 0.5,
            voiceMaxAlternatives: 5,
            voiceContinuous: true,
            voiceInterimResults: true,
            voiceLanguage: 'en-US'
        };
        
        this.populateSettingsForm(defaultSettings);
        this.emitSettingsSave(defaultSettings);
        this.showToast('Settings reset to defaults', 'info');
    }

    /**
     * Collect settings data from form
     */
    /**
     * Collect settings data from form
     */
    collectSettingsData() {
        return {
            // General settings
            autoConfirm: document.getElementById('auto-confirm-checkbox')?.checked || false,
            autoConfirmThreshold: parseInt(document.getElementById('auto-confirm-threshold')?.value || '85'),
            autoExtractRarity: document.getElementById('auto-extract-rarity-checkbox')?.checked || false,
            autoExtractArtVariant: document.getElementById('auto-extract-art-variant-checkbox')?.checked || false,
            voiceTimeout: (parseInt(document.getElementById('voice-timeout')?.value || '5') * 1000), // Convert to ms
            sessionAutoSave: document.getElementById('session-auto-save')?.checked !== false, // Default to true
            theme: document.getElementById('theme-select')?.value || 'dark',
            
            // Voice recognition settings
            voiceConfidenceThreshold: parseInt(document.getElementById('voice-confidence-threshold')?.value || '50') / 100, // Convert to 0-1 range
            voiceMaxAlternatives: parseInt(document.getElementById('voice-max-alternatives')?.value || '5'),
            voiceContinuous: document.getElementById('voice-continuous')?.checked !== false, // Default to true
            voiceInterimResults: document.getElementById('voice-interim-results')?.checked !== false, // Default to true
            voiceLanguage: 'en-US' // Default language, can be made configurable later
        };
    }

    /**
     * Generate help HTML
     */
    generateHelpHTML() {
        return `
            <div class="help-content">
                <h4>Voice Recognition</h4>
                <ul>
                    <li>Click "Start Listening" to enable voice detection</li>
                    <li>Speak card names clearly for automatic recognition</li>
                    <li>Ensure microphone permissions are granted</li>
                    <li>Use a quiet environment for best results</li>
                </ul>
                
                <h4>Pack Ripper</h4>
                <ul>
                    <li>Select a card set from the dropdown</li>
                    <li>Click "Start Session" to begin tracking</li>
                    <li>Use voice recognition to add cards automatically</li>
                    <li>Export session data when complete</li>
                </ul>
                
                <h4>Price Checker</h4>
                <ul>
                    <li>Enter card number and rarity (required)</li>
                    <li>Add card name and variant for better accuracy</li>
                    <li>Check "Force Refresh" for latest pricing data</li>
                    <li>Results show aggregated data from multiple sources</li>
                </ul>
            </div>
        `;
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + number keys for tab switching
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
            const keyNum = parseInt(e.key);
            if (keyNum >= 1 && keyNum <= 2) {
                e.preventDefault();
                const tabs = ['price-checker', 'pack-ripper'];
                this.switchTab(tabs[keyNum - 1]);
            }
        }
        
        // Escape key to close modals
        if (e.key === 'Escape') {
            this.closeModal();
        }
    }

    /**
     * Handle window resize
     */
    handleResize() {
        this.updateResponsiveClasses();
    }

   

    /**
     * Update responsive classes
     */
    updateResponsiveClasses() {
        const width = window.innerWidth;
        const body = document.body;
        
        body.classList.toggle('mobile', width < 768);
        body.classList.toggle('tablet', width >= 768 && width < 1024);
        body.classList.toggle('desktop', width >= 1024);
    }

    /**
     * Initialize tooltips
     */
    initializeTooltips() {
        // Basic tooltip implementation
        const tooltipElements = document.querySelectorAll('[title]');
        tooltipElements.forEach(el => {
            // Convert title to data-tooltip and remove title
            const title = el.getAttribute('title');
            if (title) {
                el.setAttribute('data-tooltip', title);
                el.removeAttribute('title');
            }
        });
    }

    /**
     * Initialize form validation
     */
    initializeFormValidation() {
        // Add real-time validation
        const inputs = document.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                this.validateField(input);
            });
        });
    }

    /**
     * Validate individual field
     */
    validateField(field) {
        // Basic validation - can be extended
        if (field.hasAttribute('required') && !field.value.trim()) {
            this.highlightError(field);
            return false;
        } else {
            field.classList.remove('error');
            field.removeAttribute('aria-invalid');
            return true;
        }
    }

    /**
     * Add skip links for accessibility
     */
    addSkipLinks() {
        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.className = 'skip-link';
        skipLink.textContent = 'Skip to main content';
        document.body.insertBefore(skipLink, document.body.firstChild);
    }

    /**
     * Set up ARIA live regions
     */
    setupLiveRegions() {
        // Add live region for announcements
        const liveRegion = document.createElement('div');
        liveRegion.id = 'live-region';
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.className = 'sr-only';
        document.body.appendChild(liveRegion);
    }

    /**
     * Enhance keyboard navigation
     */
    enhanceKeyboardNavigation() {
        // Ensure all interactive elements are focusable
        const interactiveElements = document.querySelectorAll('button, input, select, textarea, a');
        interactiveElements.forEach(el => {
            if (!el.hasAttribute('tabindex')) {
                el.setAttribute('tabindex', '0');
            }
        });
    }

    /**
     * Debounce utility function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Event emitters
    onTabChange(callback) {
        this.eventListeners.tabChange.push(callback);
    }

    onPriceCheck(callback) {
        this.eventListeners.priceCheck.push(callback);
    }

    onSessionStart(callback) {
        this.eventListeners.sessionStart.push(callback);
    }

    onSessionStop(callback) {
        this.eventListeners.sessionStop.push(callback);
    }

    onSessionClear(callback) {
        this.eventListeners.sessionClear.push(callback);
    }

    onSessionExport(callback) {
        this.eventListeners.sessionExport.push(callback);
    }

    onSessionImport(callback) {
        this.eventListeners.sessionImport.push(callback);
    }

    onBulkPricingRefresh(callback) {
        this.eventListeners.bulkPricingRefresh.push(callback);
    }

    onVoiceStart(callback) {
        this.eventListeners.voiceStart.push(callback);
    }

    onVoiceStop(callback) {
        this.eventListeners.voiceStop.push(callback);
    }

    onVoiceTest(callback) {
        this.eventListeners.voiceTest.push(callback);
    }

    // Voice training event listeners
    onCardTrainingStart(callback) {
        this.eventListeners.cardTrainingStart.push(callback);
    }

    onCardTrainingStop(callback) {
        this.eventListeners.cardTrainingStop.push(callback);
    }

    onRarityTrainingStart(callback) {
        this.eventListeners.rarityTrainingStart.push(callback);
    }

    onRarityTrainingStop(callback) {
        this.eventListeners.rarityTrainingStop.push(callback);
    }

    onAddCardMapping(callback) {
        this.eventListeners.addCardMapping.push(callback);
    }

    onAddRarityMapping(callback) {
        this.eventListeners.addRarityMapping.push(callback);
    }

    onViewMappings(callback) {
        this.eventListeners.viewMappings.push(callback);
    }

    onExportTrainingData(callback) {
        this.eventListeners.exportTrainingData.push(callback);
    }

    onImportTrainingData(callback) {
        this.eventListeners.importTrainingData.push(callback);
    }

    onClearTrainingData(callback) {
        this.eventListeners.clearTrainingData.push(callback);
    }

    onQuantityAdjust(callback) {
        this.eventListeners.quantityAdjust.push(callback);
    }

    onCardRemove(callback) {
        this.eventListeners.cardRemove.push(callback);
    }

    onPricingRefresh(callback) {
        this.eventListeners.pricingRefresh.push(callback);
    }
    
    onCardUpdated(callback) {
        this.eventListeners.cardUpdated = this.eventListeners.cardUpdated || [];
        this.eventListeners.cardUpdated.push(callback);
    }

    onSettingsSave(callback) {
        this.eventListeners.settingsSave.push(callback);
    }

    onSettingsShow(callback) {
        this.eventListeners.settingsShow.push(callback);
    }

    /**
     * Register a callback for set switched events
     * @param {Function} callback - Function to call when a set is switched
     */
    onSetSwitched(callback) {
        this.eventListeners.setSwitched.push(callback);
    }
    
    /**
     * Emit a set switched event
     * @param {Object} eventData - Event data containing newSetId
     */
    emitSetSwitched(eventData) {
        this.eventListeners.setSwitched.forEach(callback => {
            try {
                callback(eventData);
            } catch (error) {
                this.logger.error('Error in setSwitched callback:', error);
            }
        });
    }

    // Event emission methods
    emitTabChange(tabId) {
        this.eventListeners.tabChange.forEach(callback => {
            try {
                callback(tabId);
            } catch (error) {
                this.logger.error('Error in tab change callback:', error);
            }
        });
    }

    emitPriceCheck(formData) {
        this.eventListeners.priceCheck.forEach(callback => {
            try {
                callback(formData);
            } catch (error) {
                this.logger.error('Error in price check callback:', error);
            }
        });
    }

    emitSessionStart(setId) {
        this.eventListeners.sessionStart.forEach(callback => {
            try {
                callback(setId);
            } catch (error) {
                this.logger.error('Error in session start callback:', error);
            }
        });
    }

    emitSessionStop() {
        this.eventListeners.sessionStop.forEach(callback => {
            try {
                callback();
            } catch (error) {
                this.logger.error('Error in session stop callback:', error);
            }
        });
    }

    emitSessionClear() {
        this.eventListeners.sessionClear.forEach(callback => {
            try {
                callback();
            } catch (error) {
                this.logger.error('Error in session clear callback:', error);
            }
        });
    }

    emitSessionExport() {
        this.eventListeners.sessionExport.forEach(callback => {
            try {
                callback();
            } catch (error) {
                this.logger.error('Error in session export callback:', error);
            }
        });
    }

    emitSessionImport() {
        this.eventListeners.sessionImport.forEach(callback => {
            try {
                callback();
            } catch (error) {
                this.logger.error('Error in session import callback:', error);
            }
        });
    }

    emitBulkPricingRefresh() {
        this.eventListeners.bulkPricingRefresh.forEach(callback => {
            try {
                callback();
            } catch (error) {
                this.logger.error('Error in bulk pricing refresh callback:', error);
            }
        });
    }

    emitVoiceStart() {
        this.eventListeners.voiceStart.forEach(callback => {
            try {
                callback();
            } catch (error) {
                this.logger.error('Error in voice start callback:', error);
            }
        });
    }

    emitVoiceStop() {
        this.eventListeners.voiceStop.forEach(callback => {
            try {
                callback();
            } catch (error) {
                this.logger.error('Error in voice stop callback:', error);
            }
        });
    }

    emitVoiceTest() {
        this.eventListeners.voiceTest.forEach(callback => {
            try {
                callback();
            } catch (error) {
                this.logger.error('Error in voice test callback:', error);
            }
        });
    }

    emitQuantityAdjust(cardId, adjustment) {
        this.eventListeners.quantityAdjust.forEach(callback => {
            try {
                callback(cardId, adjustment);
            } catch (error) {
                this.logger.error('Error in quantity adjust callback:', error);
            }
        });
    }

    emitCardRemove(cardId) {
        this.eventListeners.cardRemove.forEach(callback => {
            try {
                callback(cardId);
            } catch (error) {
                this.logger.error('Error in card remove callback:', error);
            }
        });
    }

    emitPricingRefresh(cardId) {
        this.eventListeners.pricingRefresh.forEach(callback => {
            try {
                callback(cardId);
            } catch (error) {
                this.logger.error('Error in pricing refresh callback:', error);
            }
        });
    }

    emitSettingsSave(settings) {
        this.eventListeners.settingsSave.forEach(callback => {
            try {
                callback(settings);
            } catch (error) {
                this.logger.error('Error in settings save callback:', error);
            }
        });
    }

    emitSettingsShow() {
        this.eventListeners.settingsShow.forEach(callback => {
            try {
                callback();
            } catch (error) {
                this.logger.error('Error in settings show callback:', error);
            }
        });
    }
    
    /**
     * Emit a set switched event
     * @param {Object} eventData - Event data containing oldSetId, newSetId, and session
     */
    emitSetSwitched(eventData) {
        this.eventListeners.setSwitched.forEach(callback => {
            try {
                callback(eventData);
            } catch (error) {
                this.logger.error('Error in set switched callback:', error);
            }
        });
    }

    // Voice Training Methods

    /**
     * Handle training set change
     */
    handleTrainingSetChange() {
        const selectedSet = this.elements.trainingSetSelect.value;
        if (selectedSet) {
            this.voiceTrainingState.currentSet = selectedSet;
            this.elements.cardTrainingControls.style.display = 'block';
            this.logger.info(`Training set selected: ${selectedSet}`);
        } else {
            this.voiceTrainingState.currentSet = null;
            this.elements.cardTrainingControls.style.display = 'none';
        }
    }

    /**
     * Handle start card training
     */
    handleStartCardTraining() {
        if (!this.voiceTrainingState.currentSet) {
            this.showToast('Please select a card set first', 'warning');
            return;
        }

        this.voiceTrainingState.isCardTraining = true;
        this.updateTrainingUI();
        
        this.emitCardTrainingStart({
            setCode: this.voiceTrainingState.currentSet
        });
        
        this.logger.info('Card training started');
    }

    /**
     * Handle stop card training
     */
    handleStopCardTraining() {
        this.voiceTrainingState.isCardTraining = false;
        this.updateTrainingUI();
        
        this.emitCardTrainingStop();
        
        this.logger.info('Card training stopped');
    }

    /**
     * Handle start rarity training
     */
    handleStartRarityTraining() {
        this.voiceTrainingState.isRarityTraining = true;
        this.updateTrainingUI();
        
        this.emitRarityTrainingStart();
        
        this.logger.info('Rarity training started');
    }

    /**
     * Handle stop rarity training
     */
    handleStopRarityTraining() {
        this.voiceTrainingState.isRarityTraining = false;
        this.updateTrainingUI();
        
        this.emitRarityTrainingStop();
        
        this.logger.info('Rarity training stopped');
    }

    /**
     * Update training UI based on current state
     */
    updateTrainingUI() {
        // Card training controls
        if (this.elements.startCardTrainingBtn && this.elements.stopCardTrainingBtn) {
            this.elements.startCardTrainingBtn.style.display = 
                this.voiceTrainingState.isCardTraining ? 'none' : 'block';
            this.elements.stopCardTrainingBtn.style.display = 
                this.voiceTrainingState.isCardTraining ? 'block' : 'none';
        }

        if (this.elements.cardTrainingFeedback) {
            this.elements.cardTrainingFeedback.style.display = 
                this.voiceTrainingState.isCardTraining ? 'block' : 'none';
        }

        // Rarity training controls
        if (this.elements.startRarityTrainingBtn && this.elements.stopRarityTrainingBtn) {
            this.elements.startRarityTrainingBtn.style.display = 
                this.voiceTrainingState.isRarityTraining ? 'none' : 'block';
            this.elements.stopRarityTrainingBtn.style.display = 
                this.voiceTrainingState.isRarityTraining ? 'block' : 'none';
        }

        if (this.elements.rarityTrainingFeedback) {
            this.elements.rarityTrainingFeedback.style.display = 
                this.voiceTrainingState.isRarityTraining ? 'block' : 'none';
        }
    }

    /**
     * Show voice recognition result for card training
     */
    showCardTrainingResult(transcript, setCards) {
        if (this.elements.recognizedText) {
            this.elements.recognizedText.textContent = transcript;
        }

        if (this.elements.cardRecognitionResult) {
            this.elements.cardRecognitionResult.style.display = 'block';
        }

        // Store the voice input and available cards for search
        this.voiceTrainingState.lastRecognition = transcript;
        this.voiceTrainingState.availableCards = setCards || [];

        this.setupCardSearch();
    }

    /**
     * Setup card search functionality
     */
    setupCardSearch() {
        if (!this.elements.cardSearchInput || !this.elements.cardSearchResults) return;

        // Clear previous search
        this.elements.cardSearchInput.value = '';
        this.elements.cardSearchResults.innerHTML = '';

        // Set up search event listener
        const searchHandler = (e) => {
            const searchTerm = e.target.value.toLowerCase().trim();
            this.performCardSearch(searchTerm);
        };

        // Remove any existing listeners
        this.elements.cardSearchInput.removeEventListener('input', this.cardSearchHandler);
        this.cardSearchHandler = searchHandler;
        this.elements.cardSearchInput.addEventListener('input', this.cardSearchHandler);

        // Focus the search input
        setTimeout(() => {
            this.elements.cardSearchInput.focus();
        }, 100);
    }

    /**
     * Perform card search and display results
     */
    performCardSearch(searchTerm) {
        if (!this.elements.cardSearchResults) return;

        const cards = this.voiceTrainingState.availableCards || [];
        
        if (!searchTerm) {
            this.elements.cardSearchResults.innerHTML = '';
            return;
        }

        // Filter cards by name (case-insensitive)
        const filteredCards = cards.filter(card => {
            const cardName = card.name || card.cardName || '';
            return cardName.toLowerCase().includes(searchTerm);
        });

        this.displayCardSearchResults(filteredCards);
    }

    /**
     * Display card search results
     */
    displayCardSearchResults(cards) {
        if (!this.elements.cardSearchResults) return;

        this.elements.cardSearchResults.innerHTML = '';

        if (!cards || cards.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'search-no-results';
            noResults.textContent = 'No cards found. Try a different search term.';
            this.elements.cardSearchResults.appendChild(noResults);
            return;
        }

        cards.forEach(card => {
            const resultItem = document.createElement('button');
            resultItem.className = 'search-result-item';
            
            const cardName = card.name || card.cardName || 'Unknown Card';
            const cardType = card.type || 'Card';
            
            resultItem.innerHTML = `
                <span class="search-result-name">${cardName}</span>
                <span class="search-result-type">${cardType}</span>
            `;
            
            resultItem.addEventListener('click', () => {
                this.handleCardSelection(card);
            });

            this.elements.cardSearchResults.appendChild(resultItem);
        });
    }

    /**
     * Handle card selection from search results
     */
    handleCardSelection(card) {
        const voiceInput = this.voiceTrainingState.lastRecognition;
        const cardName = card.name || card.cardName;
        
        this.emitAddCardMapping({
            voiceInput,
            cardName,
            setCode: this.voiceTrainingState.currentSet,
            confidence: 1.0 // Manual selection = 100% confidence
        });

        this.showToast(`Added mapping: "${voiceInput}" → "${cardName}"`, 'success');
        this.hideCardTrainingResult();
    }

    /**
     * Hide card training result
     */
    hideCardTrainingResult() {
        if (this.elements.cardRecognitionResult) {
            this.elements.cardRecognitionResult.style.display = 'none';
        }
    }

    /**
     * Show voice recognition result for rarity training
     */
    showRarityTrainingResult(transcript, availableRarities) {
        if (this.elements.recognizedRarityText) {
            this.elements.recognizedRarityText.textContent = transcript;
        }

        if (this.elements.rarityRecognitionResult) {
            this.elements.rarityRecognitionResult.style.display = 'block';
        }

        // Store the voice input and available rarities for search
        this.voiceTrainingState.lastRecognition = transcript;
        this.voiceTrainingState.availableRarities = availableRarities || [];

        this.setupRaritySearch();
    }

    /**
     * Setup rarity search functionality
     */
    setupRaritySearch() {
        if (!this.elements.raritySearchInput || !this.elements.raritySearchResults) return;

        // Clear previous search
        this.elements.raritySearchInput.value = '';
        this.elements.raritySearchResults.innerHTML = '';

        // Set up search event listener
        const searchHandler = (e) => {
            const searchTerm = e.target.value.toLowerCase().trim();
            this.performRaritySearch(searchTerm);
        };

        // Remove any existing listeners
        this.elements.raritySearchInput.removeEventListener('input', this.raritySearchHandler);
        this.raritySearchHandler = searchHandler;
        this.elements.raritySearchInput.addEventListener('input', this.raritySearchHandler);

        // Focus the search input
        setTimeout(() => {
            this.elements.raritySearchInput.focus();
        }, 100);
    }

    /**
     * Perform rarity search and display results
     */
    performRaritySearch(searchTerm) {
        if (!this.elements.raritySearchResults) return;

        const rarities = this.voiceTrainingState.availableRarities || [];
        
        if (!searchTerm) {
            this.elements.raritySearchResults.innerHTML = '';
            return;
        }

        // Filter rarities by name (case-insensitive)
        const filteredRarities = rarities.filter(rarity => {
            const rarityName = typeof rarity === 'string' ? rarity : rarity.rarity || '';
            return rarityName.toLowerCase().includes(searchTerm);
        });

        this.displayRaritySearchResults(filteredRarities);
    }

    /**
     * Display rarity search results
     */
    displayRaritySearchResults(rarities) {
        if (!this.elements.raritySearchResults) return;

        this.elements.raritySearchResults.innerHTML = '';

        if (!rarities || rarities.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'search-no-results';
            noResults.textContent = 'No rarities found. Try a different search term.';
            this.elements.raritySearchResults.appendChild(noResults);
            return;
        }

        rarities.forEach(rarity => {
            const resultItem = document.createElement('button');
            resultItem.className = 'search-result-item';
            
            const rarityName = typeof rarity === 'string' ? rarity : rarity.rarity || 'Unknown Rarity';
            
            resultItem.innerHTML = `
                <span class="search-result-name">${rarityName}</span>
                <span class="search-result-type">Rarity</span>
            `;
            
            resultItem.addEventListener('click', () => {
                this.handleRaritySelection(rarity);
            });

            this.elements.raritySearchResults.appendChild(resultItem);
        });
    }

    /**
     * Handle rarity selection from search results
     */
    handleRaritySelection(rarity) {
        const voiceInput = this.voiceTrainingState.lastRecognition;
        const rarityName = typeof rarity === 'string' ? rarity : rarity.rarity;
        
        this.emitAddRarityMapping({
            voiceInput,
            rarity: rarityName,
            confidence: 1.0 // Manual selection = 100% confidence
        });

        this.showToast(`Added mapping: "${voiceInput}" → "${rarityName}"`, 'success');
        this.hideRarityTrainingResult();
    }

    /**
     * Hide rarity training result
     */
    hideRarityTrainingResult() {
        if (this.elements.rarityRecognitionResult) {
            this.elements.rarityRecognitionResult.style.display = 'none';
        }
    }

    /**
     * Update training statistics display
     */
    updateTrainingStats(stats) {
        if (this.elements.cardMappingsCount) {
            this.elements.cardMappingsCount.textContent = stats.cardMappings || 0;
        }
        if (this.elements.rarityMappingsCount) {
            this.elements.rarityMappingsCount.textContent = stats.rarityMappings || 0;
        }
        if (this.elements.trainingSessionsCount) {
            this.elements.trainingSessionsCount.textContent = stats.totalTrainingSessions || 0;
        }
        if (this.elements.lastTrainingDate) {
            const date = stats.lastTrainingDate ? 
                new Date(stats.lastTrainingDate).toLocaleDateString() : 'Never';
            this.elements.lastTrainingDate.textContent = date;
        }
    }

    /**
     * Handle view mappings
     */
    handleViewMappings() {
        this.emitViewMappings();
    }

    /**
     * Handle export training data
     */
    handleExportTrainingData() {
        this.emitExportTrainingData();
    }

    /**
     * Handle import training data
     */
    handleImportTrainingData() {
        // Create file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = e.target.result;
                        this.emitImportTrainingData(data);
                    } catch (error) {
                        this.showToast('Failed to read training data file', 'error');
                    }
                };
                reader.readAsText(file);
            }
        };
        fileInput.click();
    }

    /**
     * Handle clear training data
     */
    handleClearTrainingData() {
        if (confirm('Are you sure you want to clear all training data? This cannot be undone.')) {
            this.emitClearTrainingData();
        }
    }

    // Event emitters for voice training

    emitCardTrainingStart(data) {
        this.eventListeners.cardTrainingStart.forEach(callback => {
            try { callback(data); } catch (error) {
                this.logger.error('Error in card training start callback:', error);
            }
        });
    }

    emitCardTrainingStop() {
        this.eventListeners.cardTrainingStop.forEach(callback => {
            try { callback(); } catch (error) {
                this.logger.error('Error in card training stop callback:', error);
            }
        });
    }

    emitRarityTrainingStart() {
        this.eventListeners.rarityTrainingStart.forEach(callback => {
            try { callback(); } catch (error) {
                this.logger.error('Error in rarity training start callback:', error);
            }
        });
    }

    emitRarityTrainingStop() {
        this.eventListeners.rarityTrainingStop.forEach(callback => {
            try { callback(); } catch (error) {
                this.logger.error('Error in rarity training stop callback:', error);
            }
        });
    }

    emitAddCardMapping(data) {
        this.eventListeners.addCardMapping.forEach(callback => {
            try { callback(data); } catch (error) {
                this.logger.error('Error in add card mapping callback:', error);
            }
        });
    }

    emitAddRarityMapping(data) {
        this.eventListeners.addRarityMapping.forEach(callback => {
            try { callback(data); } catch (error) {
                this.logger.error('Error in add rarity mapping callback:', error);
            }
        });
    }

    emitViewMappings() {
        this.eventListeners.viewMappings.forEach(callback => {
            try { callback(); } catch (error) {
                this.logger.error('Error in view mappings callback:', error);
            }
        });
    }

    emitExportTrainingData() {
        this.eventListeners.exportTrainingData.forEach(callback => {
            try { callback(); } catch (error) {
                this.logger.error('Error in export training data callback:', error);
            }
        });
    }

    emitImportTrainingData(data) {
        this.eventListeners.importTrainingData.forEach(callback => {
            try { callback(data); } catch (error) {
                this.logger.error('Error in import training data callback:', error);
            }
        });
    }

    emitClearTrainingData() {
        this.eventListeners.clearTrainingData.forEach(callback => {
            try { callback(); } catch (error) {
                this.logger.error('Error in clear training data callback:', error);
            }
        });
    }

    /**
     * Update voice training state
     */
    updateVoiceTrainingState(transcript) {
        this.voiceTrainingState.lastRecognition = transcript;
    }

    /**
     * Populate training set select
     */
    populateTrainingSetSelect(sets) {
        if (!this.elements.trainingSetSelect) return;

        this.elements.trainingSetSelect.innerHTML = '<option value="">Choose a set to train with...</option>';
        
        sets.forEach(set => {
            const option = document.createElement('option');
            option.value = set.setCode || set.code;
            option.textContent = `${set.setName || set.name} (${set.setCode || set.code})`;
            this.elements.trainingSetSelect.appendChild(option);
        });
    }
}