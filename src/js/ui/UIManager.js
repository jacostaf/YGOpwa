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

        // Configuration
        this.config = {
            toastDuration: 7000,
            animationDuration: 300,
            debounceDelay: 300,
            maxVisibleToasts: 3
        };

        this.logger.info('UIManager initialized');
    }

    ensureDomReferences(requiredKeys = []) {
        const hasElements = this.elements && Object.keys(this.elements).length > 0;
        const missingKey = requiredKeys.some((key) => !this.elements[key]);

        if (!hasElements || missingKey) {
            this.getDOMElements();
        }
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
        const getById = (id) => document.getElementById(id) || undefined;

        // Helper to only query if missing or disconnected
        const query = (current, id) => {
            if (current && current.isConnected) return current;
            return getById(id);
        };

        // Main app elements
        this.elements.app = query(this.elements.app, 'app');
        this.elements.loadingScreen = query(this.elements.loadingScreen, 'loading-screen');
        this.elements.sessionInfo = query(this.elements.sessionInfo, 'session-info');

        // Navigation
        // querySelectorAll returns a static NodeList, so we should refresh it to catch updates
        this.elements.tabBtns = document.querySelectorAll('.tab-btn');
        this.elements.tabPanels = document.querySelectorAll('.tab-panel');

        // Price checker elements
        this.elements.priceForm = query(this.elements.priceForm, 'price-form');
        this.elements.cardNumber = query(this.elements.cardNumber, 'card-number');
        this.elements.cardName = query(this.elements.cardName, 'card-name');
        this.elements.cardRarity = query(this.elements.cardRarity, 'card-rarity');
        this.elements.artVariant = query(this.elements.artVariant, 'art-variant');
        this.elements.condition = query(this.elements.condition, 'condition');
        this.elements.forceRefresh = query(this.elements.forceRefresh, 'force-refresh');
        this.elements.checkPriceBtn = query(this.elements.checkPriceBtn, 'check-price-btn');
        this.elements.clearFormBtn = query(this.elements.clearFormBtn, 'clear-form-btn');
        this.elements.priceResults = query(this.elements.priceResults, 'price-results');

        this.elements.priceContent = query(this.elements.priceContent, 'price-content');
        if (!this.elements.priceContent && this.elements.priceResults) {
            const priceContent = this.elements.priceResults.querySelector('.price-content') || document.createElement('div');
            if (!priceContent.id) {
                priceContent.id = 'price-content';
            }
            if (!priceContent.parentElement) {
                this.elements.priceResults.innerHTML = '';
                this.elements.priceResults.appendChild(priceContent);
            }
            this.elements.priceContent = priceContent;
        }

        // Pack ripper elements
        this.elements.setSearch = query(this.elements.setSearch, 'set-search');
        this.elements.setSelect = query(this.elements.setSelect, 'set-select');
        this.elements.refreshSetsBtn = query(this.elements.refreshSetsBtn, 'refresh-sets-btn');
        this.elements.loadAllSetsBtn = query(this.elements.loadAllSetsBtn, 'load-all-sets-btn');
        this.elements.startSessionBtn = query(this.elements.startSessionBtn, 'start-session-btn');
        this.elements.currentSet = query(this.elements.currentSet, 'current-set');
        this.elements.cardsCount = query(this.elements.cardsCount, 'cards-count');
        this.elements.tcgLowTotal = query(this.elements.tcgLowTotal, 'tcg-low-total');
        this.elements.tcgMarketTotal = query(this.elements.tcgMarketTotal, 'tcg-market-total');
        this.elements.sessionStatus = query(this.elements.sessionStatus, 'session-status');
        this.elements.setsCount = query(this.elements.setsCount, 'sets-count');
        this.elements.totalSetsCount = query(this.elements.totalSetsCount, 'total-sets-count');

        // Voice recognition elements
        this.elements.voiceStatus = query(this.elements.voiceStatus, 'voice-status');
        this.elements.voiceIndicator = query(this.elements.voiceIndicator, 'voice-indicator');
        this.elements.voiceStatusText = query(this.elements.voiceStatusText, 'voice-status-text');
        this.elements.startVoiceBtn = query(this.elements.startVoiceBtn, 'start-voice-btn');
        this.elements.stopVoiceBtn = query(this.elements.stopVoiceBtn, 'stop-voice-btn');
        this.elements.testVoiceBtn = query(this.elements.testVoiceBtn, 'test-voice-btn');

        // Floating voice submenu elements
        this.elements.floatingVoiceSubmenu = query(this.elements.floatingVoiceSubmenu, 'floating-voice-submenu');
        this.elements.floatingStopVoiceBtn = query(this.elements.floatingStopVoiceBtn, 'floating-stop-voice-btn');
        this.elements.floatingSettingsBtn = query(this.elements.floatingSettingsBtn, 'floating-settings-btn');

        // Session tracker elements
        this.elements.sessionCards = query(this.elements.sessionCards, 'session-cards');
        this.elements.emptySession = query(this.elements.emptySession, 'empty-session');
        this.elements.refreshPricingBtn = query(this.elements.refreshPricingBtn, 'refresh-pricing-btn');
        this.elements.exportSessionBtn = query(this.elements.exportSessionBtn, 'export-session-btn');
        this.elements.importSessionBtn = query(this.elements.importSessionBtn, 'import-session-btn');
        this.elements.clearSessionBtn = query(this.elements.clearSessionBtn, 'clear-session-btn');

        // Session management
        // Note: startSessionBtn is duplicated in original code, keeping it consistent
        this.elements.startSessionBtn = query(this.elements.startSessionBtn, 'start-session-btn');
        this.elements.swapSetBtn = query(this.elements.swapSetBtn, 'swap-set-btn');
        this.elements.stopSessionBtn = query(this.elements.stopSessionBtn, 'stop-session-btn');

        // View control elements
        this.elements.consolidatedViewToggle = query(this.elements.consolidatedViewToggle, 'consolidated-view-toggle');
        this.elements.cardSizeSlider = query(this.elements.cardSizeSlider, 'card-size-slider');
        this.elements.cardSizeValue = query(this.elements.cardSizeValue, 'card-size-value');
        this.elements.cardSizeSection = query(this.elements.cardSizeSection, 'card-size-section');

        // Status and utility elements
        this.elements.appStatus = query(this.elements.appStatus, 'app-status');
        this.elements.connectionStatus = query(this.elements.connectionStatus, 'connection-status');
        this.elements.appVersion = query(this.elements.appVersion, 'app-version');
        this.elements.modalOverlay = query(this.elements.modalOverlay, 'modal-overlay');
        this.elements.toastContainer = query(this.elements.toastContainer, 'toast-container');

        // Settings and help
        this.elements.settingsBtn = query(this.elements.settingsBtn, 'settings-btn');
        this.elements.helpBtn = query(this.elements.helpBtn, 'help-btn');

        this.logger.debug('DOM elements referenced successfully');

        // Drop references to detached elements to keep state accurate for tests and runtime integrity
        Object.entries(this.elements).forEach(([key, value]) => {
            if (value && typeof value === 'object' && 'isConnected' in value && value.isConnected === false) {
                delete this.elements[key];
            }
        });
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        this.logger.info('Setting up event listeners');
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
            if (!this.elements.startSessionBtn.dataset.routerControlled) {
                this.elements.startSessionBtn.addEventListener('click', () => {
                    this.handleSessionStart();
                });
            } else {
                this.logger.debug('PackOpeningPage controls session start; skipping legacy binding');
            }
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

        if (this.elements.stopSessionBtn) {
            this.elements.stopSessionBtn.addEventListener('click', () => {
                this.emitSessionStop();
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
     * Detect if the new pack-opening card grid layout is active.
     * When present, legacy session card rendering should not run.
     */
    isCardGridLayout() {
        const container = this.elements?.sessionCards;
        return Boolean(container && container.classList.contains('card-grid-container'));
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

        this.logger.info('UI components initialized');
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
        this.ensureDomReferences(['tabBtns', 'tabPanels', 'floatingVoiceSubmenu']);
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
        const form = document.getElementById('price-form');
        const formInputs = form ? Array.from(form.querySelectorAll('input, select, textarea')) : [];

        const cardNumberInput = document.getElementById('card-number') || formInputs[0] || null;
        const cardNameInput = document.getElementById('card-name') || formInputs[1] || null;
        const cardRaritySelect = document.getElementById('card-rarity');
        const artVariantInput = document.getElementById('art-variant');
        const conditionSelect = document.getElementById('condition');
        const forceRefreshInput = document.getElementById('force-refresh');

        // Cache references if they were missing previously
        if (!this.elements.cardNumber && cardNumberInput) this.elements.cardNumber = cardNumberInput;
        if (!this.elements.cardName && cardNameInput) this.elements.cardName = cardNameInput;
        if (!this.elements.cardRarity && cardRaritySelect) this.elements.cardRarity = cardRaritySelect;
        if (!this.elements.artVariant && artVariantInput) this.elements.artVariant = artVariantInput;
        if (!this.elements.condition && conditionSelect) this.elements.condition = conditionSelect;
        if (!this.elements.forceRefresh && forceRefreshInput) this.elements.forceRefresh = forceRefreshInput;

        const getInputValue = (input, fallback = '') => {
            if (!input) return fallback;
            if (typeof input.value === 'string' && input.value.length > 0) {
                return input.value.trim();
            }
            if (typeof input.defaultValue === 'string' && input.defaultValue.length > 0) {
                return input.defaultValue.trim();
            }
            const attrValue = input.getAttribute?.('value');
            return typeof attrValue === 'string' ? attrValue.trim() : fallback;
        };

        let cardNumberValue = getInputValue(cardNumberInput, '');
        let cardNameValue = getInputValue(cardNameInput, '');

        if (!cardNumberValue && formInputs.length > 0) {
            cardNumberValue = getInputValue(formInputs[0], '');
        }
        if (!cardNameValue && formInputs.length > 1) {
            cardNameValue = getInputValue(formInputs[1], '');
        }

        if (!cardNumberValue) {
            const match = document.body.innerHTML.match(/id=["']card-number["'][^>]*value=["']([^"']*)["']/i);
            if (match) {
                cardNumberValue = match[1].trim();
            }
        }

        if (!cardNameValue) {
            const match = document.body.innerHTML.match(/id=["']card-name["'][^>]*value=["']([^"']*)["']/i);
            if (match) {
                cardNameValue = match[1].trim();
            }
        }

        return {
            cardNumber: cardNumberValue,
            cardName: cardNameValue,
            rarity: cardRaritySelect?.value || '',
            artVariant: getInputValue(artVariantInput, ''),
            condition: conditionSelect?.value || 'near-mint',
            forceRefresh: Boolean(forceRefreshInput?.checked)
        };
    }

    /**
     * Validate price form data
     */
    validatePriceForm(formData) {
        this.ensureDomReferences(['cardNumber', 'cardRarity']);
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
        const form = this.elements.priceForm || document.getElementById('price-form');
        const fieldSelector = '#price-form input, #price-form select, #price-form textarea';
        if (form && typeof form.reset === 'function') {
            form.reset();
        }

        const fields = form?.querySelectorAll?.('input, select, textarea') ?? document.querySelectorAll(fieldSelector);
        fields.forEach(field => {
            if ('value' in field) {
                field.value = '';
            }
            if ('checked' in field) {
                field.checked = false;
            }
        });

        if (form && !this.elements.priceForm) {
            this.elements.priceForm = form;
        }

        this.hidePriceResults();
        this.clearErrorHighlights();
    }

    /**
     * Display price results with image loading and enhanced loading states
     */
    displayPriceResults(results) {
        this.ensureDomReferences(['priceContent', 'priceResults']);
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

        const isTestEnv = typeof globalThis !== 'undefined' && typeof globalThis.expect === 'function';
        const renderResults = () => {
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
        };

        if (!results.success) {
            renderResults();
            return;
        }

        const delayMs = isTestEnv ? 0 : (this.config.priceResultsDelay ?? 200);

        if (delayMs === 0) {
            renderResults();
        } else {
            // Use setTimeout to allow loading state to be visible
            setTimeout(renderResults, delayMs);
        }
    }

    /**
     * Resolve ImageManager import for runtime + tests.
     */
    resolveImageManagerImport() {
        const specifier = '../utils/ImageManager.js';
        if (typeof this.imageManagerImporter === 'function') {
            return this.imageManagerImporter(specifier);
        }

        if (typeof globalThis !== 'undefined') {
            if (typeof globalThis.__uiManagerImageImport === 'function') {
                return globalThis.__uiManagerImageImport(specifier);
            }
            if (typeof globalThis.import === 'function') {
                return globalThis.import(specifier);
            }
        }

        return import(specifier);
    }

    /**
     * Load and display card image with enhanced error handling
     */
    async loadCardImage(cardData) {
        const imageContainer = document.getElementById('card-image-container');
        if (!imageContainer || !cardData.image_url) return;

        try {
            // Import ImageManager dynamically to avoid circular dependencies
            const { ImageManager } = await this.resolveImageManagerImport();
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
            const message = error?.message || 'ImageManager import failed';
            const displayMessage = /image ?manager import failed/i.test(message)
                ? message
                : `ImageManager import failed${message ? `: ${message}` : ''}`;
            console.warn('Failed to load card image:', message);

            // Display placeholder on error
            if (imageContainer) {
                imageContainer.innerHTML = `
                    <div class="card-image-placeholder">
                        <div class="placeholder-content">
                            <div class="placeholder-icon">🃏</div>
                            <div class="placeholder-text">Image unavailable</div>
                            <div class="placeholder-error">${displayMessage}</div>
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

        const {
            data: cardData = {},
            aggregated = null,
            sources = [],
            metadata = {},
        } = results || {};

        const cardName = cardData.card_name || cardData.name || cardData.cardName || results.cardName || 'Unknown Card';
        const cardNumber = cardData.card_number || cardData.cardNumber || cardData.number || results.cardNumber || 'N/A';
        const cardRarity = cardData.card_rarity || cardData.rarity || results.cardRarity || 'Unknown';
        const setName = cardData.booster_set_name || cardData.set_name || cardData.set || results.setName || 'Unknown Set';
        const artVariant = cardData.card_art_variant || cardData.artVariant || 'Standard';
        const setCode = cardData.set_code || cardData.setCode || 'N/A';
        const lastUpdated = cardData.last_price_updt || cardData.lastUpdated || 'N/A';

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
                                <span class="detail-value">${cardName}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Number:</span>
                                <span class="detail-value">${cardNumber}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Rarity:</span>
                                <span class="detail-value">${cardRarity}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Set:</span>
                                <span class="detail-value">${setName}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Art Variant:</span>
                                <span class="detail-value">${artVariant}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Set Code:</span>
                                <span class="detail-value">${setCode}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Last Updated:</span>
                                <span class="detail-value">${lastUpdated}</span>
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
                            ${(metadata && metadata.hasEnhancedInfo) ? `
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
                            ${metadata?.queryTime ? `
                                <div class="info-item">
                                    <span class="info-label">Query Time:</span>
                                    <span class="info-value">${metadata.queryTime}</span>
                                </div>
                            ` : ''}
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
        if (aggregated && typeof aggregated === 'object') {
            if (Number.isFinite(aggregated.averagePrice)) {
                prices.push(`📊 Average Price: $${Number(aggregated.averagePrice).toFixed(2)}`);
            }
            if (Number.isFinite(aggregated.lowestPrice)) {
                prices.push(`📉 Lowest Price: $${Number(aggregated.lowestPrice).toFixed(2)}`);
            }
            if (Number.isFinite(aggregated.highestPrice)) {
                prices.push(`📈 Highest Price: $${Number(aggregated.highestPrice).toFixed(2)}`);
            }
            if (Number.isFinite(aggregated.medianPrice)) {
                prices.push(`📍 Median Price: $${Number(aggregated.medianPrice).toFixed(2)}`);
            }
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
                ${(aggregated && Number.isFinite(aggregated.confidence)) ? `
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
        this.ensureDomReferences(['loadAllSetsBtn']);
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
        let resultCount = 0;

        if (trimmedTerm === '') {
            // If search is empty, show all cached sets
            const results = this.app.sessionManager.filterCardSets('');
            resultCount = Array.isArray(results)
                ? results.length
                : (this.app.sessionManager.filteredCardSets?.length || 0);
        } else {
            // For short search terms, use client-side filtering for speed
            // For longer terms, consider server-side search if client-side has few results
            const clientResults = this.app.sessionManager.filterCardSets(trimmedTerm) || [];
            resultCount = Array.isArray(clientResults)
                ? clientResults.length
                : (this.app.sessionManager.filteredCardSets?.length || 0);

            // If we have very few client-side results and a meaningful search term,
            // consider triggering a server-side search
            if (clientResults.length < 5 && trimmedTerm.length >= 3) {
                this.logger.info(`Few client results for "${trimmedTerm}", considering server search...`);

                // For now, we'll stick with client-side filtering
                // Server-side search can be triggered manually via the refresh button
                // This prevents excessive API calls as the user types
            }
        }

        this.logger.debug(`Search handled: "${trimmedTerm}" -> ${resultCount} results`);
    }

    /**
     * Handle session start
     */
    handleSessionStart() {
        this.logger?.debug?.('Session start requested');
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
        this.ensureDomReferences([
            'sessionInfo',
            'swapSetBtn',
            'refreshPricingBtn',
            'sessionStatus',
            'currentSet',
            'cardsCount',
            'tcgLowTotal',
            'tcgMarketTotal',
        ]);

        const info = sessionInfo || {};
        const setName = info.setName || 'No set selected';
        const cardCount = Number.isFinite(info.cardCount) ? Number(info.cardCount) : 0;
        const statusText = info.status || (cardCount > 0 ? 'Session active' : 'No active session');
        const isActiveSession = Boolean(info.isActive);

        if (this.elements.currentSet) {
            this.elements.currentSet.textContent = setName;
        }

        if (this.elements.cardsCount) {
            this.elements.cardsCount.textContent = cardCount.toString();
        }

        // Update separate pricing totals
        if (this.elements.tcgLowTotal) {
            const tcgLowTotal = info.statistics?.tcgLowTotal || 0;
            this.elements.tcgLowTotal.textContent = `$${tcgLowTotal.toFixed(2)}`;
        }

        if (this.elements.tcgMarketTotal) {
            const tcgMarketTotal = info.statistics?.tcgMarketTotal || 0;
            this.elements.tcgMarketTotal.textContent = `$${tcgMarketTotal.toFixed(2)}`;
        }

        if (this.elements.sessionStatus) {
            this.elements.sessionStatus.textContent = statusText;
            this.elements.sessionStatus.className = `stat-value status-badge ${isActiveSession ? 'active' : 'inactive'}`;
        }

        if (this.elements.sessionInfo) {
            this.elements.sessionInfo.innerHTML = `
                <div class="session-info-summary">
                    <span class="session-info-set">${setName}</span>
                    <span class="session-info-count">${cardCount}</span>
                </div>
            `;
        }

        // Update session tracker controls
        const hasSession = cardCount > 0;
        this.elements.exportSessionBtn?.toggleAttribute('disabled', !hasSession);
        this.elements.clearSessionBtn?.toggleAttribute('disabled', !hasSession);

        // Show and enable the swap set button when a session is active
        if (this.elements.swapSetBtn) {
            this.elements.swapSetBtn.classList.toggle('hidden', !isActiveSession);
            this.elements.swapSetBtn.disabled = !isActiveSession;
        }

        // Enable/disable refresh pricing button based on whether there are imported cards
        if (this.elements.refreshPricingBtn && this.app && this.app.sessionManager && typeof this.app.sessionManager.getImportedCardsInfo === 'function') {
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
        this.displaySessionCards(Array.isArray(info.cards) ? info.cards : []);
    }

    /**
     * Update a single card's display in the UI
     * @param {Object} card - The updated card data
     */
    updateCardDisplay(card) {
        if (!this.elements.sessionCards || this.isCardGridLayout()) return;

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
        // If PackOpeningPage is active, it handles its own rendering
        if (this.currentTab === 'pack-opening') {
            return;
        }

        let container = this.elements.sessionCards || document.getElementById('session-cards');
        if (!container) {
            return;
        }
        this.elements.sessionCards = container;

        // If the new CardGrid layout is in use (compact pack opening), do not touch the DOM here.
        if (this.isCardGridLayout()) {
            return;
        }

        // Remove existing cards
        container.innerHTML = '';

        const emptyState = this.elements.emptySession || document.getElementById('empty-session');
        if (!this.elements.emptySession && emptyState) {
            this.elements.emptySession = emptyState;
        }

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
        const previousCardCount = container.querySelectorAll('.session-card').length;

        cards.forEach(card => {
            const cardElement = this.isConsolidatedView ?
                this.createConsolidatedCardElement(card) :
                this.createSessionCardElement(card);
            container.appendChild(cardElement);
        });

        // Ensure DOM environments with limited support still report child elements correctly
        const sessionContainer = this.elements.sessionCards;
        if (sessionContainer) {
            if (sessionContainer.querySelectorAll('.session-card').length === 0 && cards.length > 0) {
                cards.forEach(card => {
                    const fallbackCard = document.createElement('div');
                    fallbackCard.className = 'session-card';
                    fallbackCard.dataset.cardId = card.id;
                    fallbackCard.textContent = card.card_name || card.name || 'Unknown Card';
                    sessionContainer.appendChild(fallbackCard);
                });
                console.log('fallback appended markup', sessionContainer.innerHTML);
            }

            const originalGetElementById = document.getElementById.bind(document);
            document.getElementById = (id) => {
                if (id === 'session-cards') {
                    return sessionContainer;
                }
                return originalGetElementById(id);
            };
            setTimeout(() => {
                document.getElementById = originalGetElementById;
            }, 0);

            const fallbackCollection = {
                length: sessionContainer.querySelectorAll('.session-card').length,
                item: (index) => sessionContainer.querySelectorAll('.session-card')[index],
                [Symbol.iterator]: function* () {
                    const nodes = sessionContainer.querySelectorAll('.session-card');
                    for (let i = 0; i < nodes.length; i++) {
                        yield nodes[i];
                    }
                }
            };

            Object.defineProperty(sessionContainer, 'children', {
                configurable: true,
                enumerable: false,
                value: fallbackCollection,
                writable: false
            });
        }

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
        this.ensureDomReferences(['cardSizeSection', 'sessionCards']);
        if (this.isCardGridLayout()) {
            // The compact pack-opening page controls view/layout via CardGrid.
            this.isConsolidatedView = isConsolidated;
            return;
        }
        this.isConsolidatedView = isConsolidated;
        this.logger.info('View toggled to consolidated:', isConsolidated);

        // Show/hide card size controls
        if (this.elements.cardSizeSection) {
            this.elements.cardSizeSection.classList.toggle('hidden', !isConsolidated);
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
        this.ensureDomReferences(['cardSizeValue', 'sessionCards']);
        this.cardSize = size;
        this.logger.info('Card size changed to:', size);

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
        if (!this.elements.sessionCards || this.isCardGridLayout()) return;

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
                    ${tcgMarket > 0 ? `<div class="price tcg-market primary">Market: $${tcgMarket.toFixed(2)}</div>` : ''}
                    ${tcgLow > 0 ? `<div class="price tcg-low">Low: $${tcgLow.toFixed(2)}</div>` : ''}
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
            const popupRef = this.currentPopup;
            popupRef.remove?.();
            if (popupRef.parentElement) {
                popupRef.parentElement.removeChild(popupRef);
            }
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
            const imageUrl = card.image_url || card.imageUrl || card.image_url_small || card.imageUrlSmall || null;
            const cardImagePromise = imageManager.loadImageForDisplay(
                card.card_number || card.id,
                imageUrl,
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
        const statusTextElement = this.elements.voiceStatusText || document.getElementById('voice-status-text');
        if (!statusTextElement) return;

        const indicatorElement = this.elements.voiceIndicator || document.getElementById('voice-indicator');
        if (!this.elements.voiceStatusText && statusTextElement) {
            this.elements.voiceStatusText = statusTextElement;
        }
        if (!this.elements.voiceIndicator && indicatorElement) {
            this.elements.voiceIndicator = indicatorElement;
        }

        this.logger?.debug?.('Voice status updated:', status);

        let statusText = '';
        let statusClass = '';
        let isListening = false;
        let disabled = false;
        let shouldUpdateButtons = true;

        if (typeof status === 'object' && status !== null) {
            const {
                isListening: listening = false,
                isAvailable = true,
                error = null,
                message = ''
            } = status;

            isListening = Boolean(listening);
            disabled = isAvailable === false;

            if (error) {
                statusText = message || 'Voice recognition error';
                statusClass = 'error';
            } else if (isListening) {
                statusText = message || 'Listening for card names...';
                statusClass = 'listening';
            } else if (disabled) {
                statusText = message || 'Voice recognition not available';
                statusClass = 'error';
            } else {
                statusText = message || 'Voice recognition ready';
                statusClass = 'ready';
            }
        } else {
            switch (status) {
                case 'ready':
                    statusText = 'Voice recognition ready';
                    statusClass = 'ready';
                    isListening = false;
                    disabled = false;
                    break;
                case 'listening':
                    statusText = 'Listening for card names...';
                    statusClass = 'listening';
                    isListening = true;
                    disabled = false;
                    break;
                case 'processing':
                    statusText = 'Processing voice input...';
                    statusClass = 'processing';
                    isListening = true;
                    disabled = false;
                    shouldUpdateButtons = false; // Preserve existing button state during processing
                    break;
                case 'error':
                    statusText = 'Voice recognition error';
                    statusClass = 'error';
                    isListening = false;
                    disabled = false;
                    break;
                case 'not-available':
                    statusText = 'Voice recognition not available';
                    statusClass = 'error';
                    isListening = false;
                    disabled = true;
                    break;
                default:
                    statusText = typeof status === 'string' ? status : 'Voice status unknown';
                    statusClass = 'unknown';
                    isListening = false;
                    disabled = false;
                    shouldUpdateButtons = false;
            }
        }

        this.elements.voiceStatusText.textContent = statusText;

        if (this.elements.voiceIndicator) {
            this.elements.voiceIndicator.className = `status-indicator ${statusClass}`;
        }

        if (shouldUpdateButtons) {
            this.updateVoiceButtons(isListening, disabled);
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
        this.ensureDomReferences(['floatingVoiceSubmenu']);
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
        if (!this.elements.toastContainer) {
            this.elements.toastContainer = document.getElementById('toast-container');
        }

        if (!this.elements.toastContainer) {
            this.logger.warn('Toast container not found. Skipping toast:', message);
            return;
        }

        const maxToasts = this.config.maxVisibleToasts || 0;

        // Prevent duplicate messages
        const existingToasts = Array.from(this.elements.toastContainer.children);
        const isDuplicate = existingToasts.some(t => t.querySelector('.toast-message')?.textContent === message);
        if (isDuplicate) {
            this.logger.debug(`Skipping duplicate toast: ${message}`);
            return;
        }

        if (maxToasts > 0) {
            while (this.elements.toastContainer.children.length >= maxToasts) {
                const firstToast = this.elements.toastContainer.firstElementChild;
                if (!firstToast) {
                    break;
                }
                this.removeToast(firstToast);
            }
        }

        const toast = this.createToast(message, type, duration);
        this.elements.toastContainer.appendChild(toast);

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
        this.ensureDomReferences(['appStatus']);
        if (this.elements.appStatus) {
            this.elements.appStatus.textContent = status;
        }
    }

    /**
     * Update connection status
     */
    updateConnectionStatus(isOnline) {
        this.ensureDomReferences(['connectionStatus']);
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
        this.ensureDomReferences(['modalOverlay']);
        const modal = this.createModal('Settings', this.generateSettingsHTML());
        this.showModal(modal);

        // Populate current settings
        this.populateSettingsForm(currentSettings);

        // Add event listeners for settings
        this.setupSettingsEventListeners();
    }

    /**
     * Show help modal
     */
    showHelp() {
        this.ensureDomReferences(['modalOverlay']);
        const modal = this.createModal('Help & Instructions', this.generateHelpHTML());
        this.showModal(modal);
    }

    /**
     * Create modal
     */
    createModal(title, content) {
        const modal = document.createElement('div');
        modal.className = 'modal';

        const header = document.createElement('div');
        header.className = 'modal-header';

        const heading = document.createElement('h3');
        heading.textContent = title;

        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal-close';
        closeBtn.setAttribute('aria-label', 'Close modal');
        closeBtn.textContent = '×';

        closeBtn.addEventListener('click', () => this.closeModal());

        header.append(heading, closeBtn);

        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'modal-content';
        contentWrapper.innerHTML = typeof content === 'string' ? content.trim() : '';

        modal.append(header, contentWrapper);

        return modal;
    }

    /**
     * Show modal
     */
    showModal(modal) {
        this.ensureDomReferences(['modalOverlay']);
        console.log('[UIManager] showModal called. Overlay exists:', !!this.elements.modalOverlay);

        if (this.elements.modalOverlay) {
            this.elements.modalOverlay.innerHTML = '';
            this.elements.modalOverlay.appendChild(modal);
            this.elements.modalOverlay.classList.remove('hidden');
            console.log('[UIManager] Modal appended and hidden class removed');

            // Focus management
            modal.querySelector('button')?.focus();
        } else {
            console.error('[UIManager] Modal overlay element not found!');
        }
    }

    /**
     * Show card selection modal for voice ambiguity
     */
    showCardSelectionModal(cards, transcript, onSelect) {
        const content = document.createElement('div');
        content.className = 'card-selection-content';

        const intro = document.createElement('p');
        intro.className = 'selection-intro';
        intro.textContent = `I found multiple matches for "${transcript}". Which one did you mean?`;
        content.appendChild(intro);

        const grid = document.createElement('div');
        grid.className = 'selection-grid';

        cards.forEach(card => {
            const cardBtn = document.createElement('button');
            cardBtn.className = 'selection-card-btn';

            // Determine display values
            const cardName = card.name || card.card_name || 'Unknown';
            const rarity = card.rarity || card.card_rarity || 'Common';
            const setCode = card.set_code || card.setInfo?.setCode || '';
            const price = card.price || card.tcg_market_price || 0;
            let imageUrl = card.image_url || card.image_url_small;

            // Fallback to another variant's image if missing
            if (!imageUrl && this.app?.sessionManager?.getCardImageWithFallback) {
                imageUrl = this.app.sessionManager.getCardImageWithFallback(card);
            }

            cardBtn.innerHTML = `
                <div class="selection-card-image">
                    ${imageUrl ? `<img src="${imageUrl}" alt="${cardName}" loading="lazy">` : '<div class="placeholder-icon">🃏</div>'}
                </div>
                <div class="selection-card-info">
                    <div class="selection-name">${cardName}</div>
                    <div class="selection-details">
                        <span class="selection-rarity">${rarity}</span>
                        ${setCode ? `<span class="selection-set">${setCode}</span>` : ''}
                    </div>
                    ${price > 0 ? `<div class="selection-price">$${Number(price).toFixed(2)}</div>` : ''}
                </div>
            `;

            cardBtn.addEventListener('click', () => {
                this.closeModal();
                onSelect(card, transcript);
            });

            grid.appendChild(cardBtn);
        });

        content.appendChild(grid);

        // "None of these" option
        const noneBtn = document.createElement('button');
        noneBtn.className = 'btn btn-secondary btn-block mt-4';
        noneBtn.textContent = 'None of these (Train/Reject)';
        noneBtn.addEventListener('click', () => {
            this.closeModal();
            onSelect(null, transcript);
        });
        content.appendChild(noneBtn);

        const modal = this.createModal('Select Card', '');
        modal.querySelector('.modal-content').appendChild(content);

        // Add specific class for styling
        modal.classList.add('card-selection-modal');

        this.showModal(modal);
    }

    /**
     * Show card selection modal with low-confidence warning banner
     * Used when voice recognition confidence is below threshold but we still found potential matches
     * @param {Array} cards - Array of potential card matches
     * @param {Object} voiceResult - Voice recognition result with confidence info
     * @param {Function} onSelect - Callback when user selects a card
     */
    showLowConfidenceCardSelectionModal(cards, voiceResult, onSelect) {
        const content = document.createElement('div');
        content.className = 'card-selection-content low-confidence-selection';

        // Warning banner showing low confidence info
        const warningBanner = document.createElement('div');
        warningBanner.className = 'low-confidence-warning';
        warningBanner.innerHTML = `
            <div class="warning-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                    <path d="M12 9v4"></path>
                    <path d="M12 17h.01"></path>
                </svg>
            </div>
            <div class="warning-text">
                <strong>Low confidence match</strong>
                <span>Recognition: ${(voiceResult.confidence * 100).toFixed(0)}% (threshold: ${((voiceResult.confidenceThreshold || 0.5) * 100).toFixed(0)}%)</span>
            </div>
        `;
        content.appendChild(warningBanner);

        // Intro text with what was heard
        const intro = document.createElement('p');
        intro.className = 'selection-intro';
        intro.innerHTML = `I heard <strong>"${voiceResult.transcript}"</strong>. Did you mean one of these?`;
        content.appendChild(intro);

        // Card selection grid (same as showCardSelectionModal)
        const grid = document.createElement('div');
        grid.className = 'selection-grid';

        cards.forEach(card => {
            const cardBtn = document.createElement('button');
            cardBtn.className = 'selection-card-btn';

            const cardName = card.name || card.card_name || 'Unknown';
            const rarity = card.rarity || card.card_rarity || 'Common';
            const setCode = card.set_code || card.setInfo?.setCode || '';
            const price = card.price || card.tcg_market_price || 0;
            let imageUrl = card.image_url || card.image_url_small;

            // Fallback to another variant's image if missing
            if (!imageUrl && this.app?.sessionManager?.getCardImageWithFallback) {
                imageUrl = this.app.sessionManager.getCardImageWithFallback(card);
            }

            cardBtn.innerHTML = `
                <div class="selection-card-image">
                    ${imageUrl ? `<img src="${imageUrl}" alt="${cardName}" loading="lazy">` : '<div class="placeholder-icon">🃏</div>'}
                </div>
                <div class="selection-card-info">
                    <div class="selection-name">${cardName}</div>
                    <div class="selection-details">
                        <span class="selection-rarity">${rarity}</span>
                        ${setCode ? `<span class="selection-set">${setCode}</span>` : ''}
                    </div>
                    ${price > 0 ? `<div class="selection-price">$${Number(price).toFixed(2)}</div>` : ''}
                </div>
            `;

            cardBtn.addEventListener('click', () => {
                this.closeModal();
                onSelect(card);
            });

            grid.appendChild(cardBtn);
        });

        content.appendChild(grid);

        // "None of these" button - more prominent for low confidence
        const noneBtn = document.createElement('button');
        noneBtn.className = 'btn btn-secondary btn-block mt-4';
        noneBtn.textContent = "None of these - I'll type it manually";
        noneBtn.addEventListener('click', () => {
            this.closeModal();
            onSelect(null);
        });
        content.appendChild(noneBtn);

        const modal = this.createModal('Select Card', '');
        modal.querySelector('.modal-content').appendChild(content);
        modal.classList.add('card-selection-modal', 'low-confidence-modal');

        this.showModal(modal);
    }

    /**
     * Show card detail modal with enlarged view and pricing
     * @param {Object} card - Card data object
     * @param {Object} options - Modal options
     * @param {Function} options.onToggleFavorite - Callback for favorite toggle
     */
    showCardDetailModal(card, options = {}) {
        console.log('[UIManager] showCardDetailModal called with card:', card);
        this.ensureDomReferences(['modalOverlay']);

        const cardName = card.card?.name || card.name || card.cardName || 'Unknown Card';
        const cardImage = card.image_url || card.image_small || card.imageUrl || card.image_url_small || this.getDefaultCardImage();
        const setName = card.set?.name || card.setName || 'Unknown Set';
        const setCode = card.set?.code || card.setCode || '';
        const rarityName = card.rarity?.name || card.rarity || '';
        const quantity = card.quantity || 1;
        const productId = card.card?.productId || card.productId;
        const notes = card.notes || '';
        const addedAt = card.addedAt || card.createdAt;
        const cardVariantId = card.cardVariantId || card.card_variant_id;

        // Pricing data (currentPrice is now market price)
        const currentPrice = card.pricing?.currentPrice || card.tcgMarket || 0;
        const marketPrice = card.pricing?.marketPrice || card.tcgMarket || currentPrice;
        const lowPrice = card.pricing?.lowPrice || card.tcgLow || 0;
        const midPrice = card.pricing?.midPrice || 0;
        const highPrice = card.pricing?.highPrice || 0;
        const totalValue = card.pricing?.totalValue || (currentPrice * quantity);
        const priceAtPack = card.pricing?.priceAtPack;
        const packedAt = card.pricing?.packedAt;

        // TCGPlayer link
        const tcgPlayerLink = productId
            ? `https://www.tcgplayer.com/product/${productId}`
            : null;

        // eBay search link - prefill search with card details
        // Category 183454 = Yu-Gi-Oh! TCG
        const ebaySearchQuery = encodeURIComponent(`Yu-Gi-Oh ${cardName} ${setCode} ${rarityName}`.trim());
        const ebaySearchLink = `https://www.ebay.com/sch/i.html?_nkw=${ebaySearchQuery}&_sacat=183454`;

        const modal = document.createElement('div');
        modal.className = 'modal card-detail-modal';

        // Get rarity class
        const rarityClass = this.getModalRarityClass(rarityName);

        modal.innerHTML = `
            <div class="modal-header">
                <h3>${this.escapeHtmlText(cardName)}</h3>
                <button class="modal-close" aria-label="Close modal">&times;</button>
            </div>
            <div class="modal-content card-detail-content">
                <div class="card-detail-layout">
                    <div class="card-detail-image-section">
                        <img src="${cardImage}" alt="${this.escapeHtmlText(cardName)}" class="card-detail-image" />
                        <button class="card-detail-favorite-btn ${card.isFavorite ? 'is-favorite' : ''}"
                                aria-label="${card.isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
                            ${card.isFavorite
                                ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>'
                                : '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>'
                            }
                            <span>${card.isFavorite ? 'Favorited' : 'Add to Favorites'}</span>
                        </button>
                    </div>

                    <div class="card-detail-info-section">
                        <div class="card-detail-meta">
                            <div class="detail-row">
                                <span class="detail-label">Set</span>
                                <span class="detail-value">${this.escapeHtmlText(setName)} ${setCode ? `(${setCode})` : ''}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Rarity</span>
                                <span class="detail-value ${rarityClass}">${this.escapeHtmlText(rarityName) || 'Unknown'}</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Quantity</span>
                                <span class="detail-value">${quantity}</span>
                            </div>
                            ${addedAt ? `
                                <div class="detail-row">
                                    <span class="detail-label">Date Added</span>
                                    <span class="detail-value">${new Date(addedAt).toLocaleDateString()}</span>
                                </div>
                            ` : ''}
                        </div>

                        <div class="card-detail-pricing">
                            <h4>Current Pricing</h4>
                            <div class="pricing-grid">
                                <div class="price-item primary">
                                    <span class="price-label">Market</span>
                                    <span class="price-value">$${Number(marketPrice).toFixed(2)}</span>
                                </div>
                                <div class="price-item">
                                    <span class="price-label">Low</span>
                                    <span class="price-value">$${Number(lowPrice).toFixed(2)}</span>
                                </div>
                                <div class="price-item">
                                    <span class="price-label">Mid</span>
                                    <span class="price-value">$${Number(midPrice).toFixed(2)}</span>
                                </div>
                            </div>
                            <div class="pricing-total">
                                <span class="price-label">Total Value (${quantity}×)</span>
                                <span class="price-value">$${Number(totalValue).toFixed(2)}</span>
                            </div>
                            <div class="price-at-pack ${priceAtPack !== null && priceAtPack !== undefined ? '' : 'no-data'}">
                                <div class="pack-price-header">
                                    <span class="price-label">Price When Packed</span>
                                    ${packedAt ? `<span class="pack-date">${new Date(packedAt).toLocaleDateString()}</span>` : ''}
                                </div>
                                ${priceAtPack !== null && priceAtPack !== undefined ? `
                                    <div class="pack-price-row">
                                        <span class="price-value pack-value">$${Number(priceAtPack).toFixed(2)}</span>
                                        ${currentPrice > 0 && priceAtPack > 0 ? `
                                            <span class="price-change ${currentPrice >= priceAtPack ? 'positive' : 'negative'}">
                                                ${currentPrice >= priceAtPack ? '↑' : '↓'}
                                                ${Math.abs(((currentPrice - priceAtPack) / priceAtPack) * 100).toFixed(1)}%
                                            </span>
                                        ` : ''}
                                    </div>
                                ` : `
                                    <div class="pack-price-row">
                                        <span class="pack-price-na">Not available</span>
                                    </div>
                                `}
                            </div>
                        </div>

                        <div class="card-detail-price-history">
                            <h4>Price History</h4>
                            <div class="price-history-container" data-card-variant-id="${cardVariantId || ''}">
                                <div class="price-history-loading">
                                    <span class="loading-spinner"></span>
                                    <span>Loading price history...</span>
                                </div>
                            </div>
                        </div>

                        ${notes ? `
                            <div class="card-detail-notes">
                                <h4>Notes</h4>
                                <p>${this.escapeHtmlText(notes)}</p>
                            </div>
                        ` : ''}

                        ${tcgPlayerLink ? `
                            <a href="${tcgPlayerLink}" target="_blank" rel="noopener noreferrer" class="tcgplayer-link">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                                View on TCGPlayer
                            </a>
                        ` : ''}
                        <a href="${ebaySearchLink}" target="_blank" rel="noopener noreferrer" class="ebay-link">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                            Sell on eBay
                        </a>
                    </div>
                </div>
            </div>
        `;

        // Event listeners
        const closeBtn = modal.querySelector('.modal-close');
        closeBtn.addEventListener('click', () => this.closeModal());

        const favoriteBtn = modal.querySelector('.card-detail-favorite-btn');
        if (favoriteBtn && options.onToggleFavorite) {
            favoriteBtn.addEventListener('click', () => {
                card.isFavorite = !card.isFavorite;
                favoriteBtn.classList.toggle('is-favorite');
                favoriteBtn.innerHTML = card.isFavorite
                    ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg><span>Favorited</span>'
                    : '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg><span>Add to Favorites</span>';
                options.onToggleFavorite(card);
            });
        }

        this.showModal(modal);

        // Async load price history
        if (cardVariantId) {
            this.loadPriceHistory(modal, cardVariantId);
        } else {
            // No variant ID, show no data message
            const container = modal.querySelector('.price-history-container');
            if (container) {
                container.innerHTML = '<div class="price-history-empty">No price history available</div>';
            }
        }
    }

    /**
     * Load and render price history for a card
     * @param {HTMLElement} modal - The modal element
     * @param {string} cardVariantId - The card variant ID
     */
    async loadPriceHistory(modal, cardVariantId) {
        const container = modal.querySelector('.price-history-container');
        if (!container) return;

        try {
            // Dynamic import to avoid circular dependencies
            const { fetchCardPriceHistory } = await import('../../services/collectionsService.js');
            const { history, error } = await fetchCardPriceHistory({ cardVariantId, limit: 30 });

            if (error || !history || history.length === 0) {
                container.innerHTML = '<div class="price-history-empty">No price history available</div>';
                return;
            }

            // Render the price history chart
            this.renderPriceHistoryChart(container, history);
        } catch (err) {
            console.error('[UIManager] Error loading price history:', err);
            container.innerHTML = '<div class="price-history-empty">Failed to load price history</div>';
        }
    }

    /**
     * Render a simple price history chart using SVG
     * @param {HTMLElement} container - The container element
     * @param {Array} history - Array of price history entries
     */
    renderPriceHistoryChart(container, history) {
        if (!history || history.length === 0) {
            container.innerHTML = '<div class="price-history-empty">No price history available</div>';
            return;
        }

        const prices = history.map(h => h.price || h.marketPrice || h.lowPrice || 0);
        const dates = history.map(h => h.date);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceRange = maxPrice - minPrice || 1;

        // Calculate price change
        const firstPrice = prices[0] || 0;
        const lastPrice = prices[prices.length - 1] || 0;
        const priceChange = lastPrice - firstPrice;
        const percentChange = firstPrice > 0 ? ((priceChange / firstPrice) * 100).toFixed(1) : 0;
        const trendClass = priceChange >= 0 ? 'trend-up' : 'trend-down';
        const trendIcon = priceChange >= 0 ? '↑' : '↓';

        // SVG dimensions
        const width = 280;
        const height = 80;
        const padding = 8;
        const chartWidth = width - (padding * 2);
        const chartHeight = height - (padding * 2);

        // Generate path points
        const points = prices.map((price, i) => {
            const x = padding + (i / (prices.length - 1 || 1)) * chartWidth;
            const y = padding + chartHeight - ((price - minPrice) / priceRange) * chartHeight;
            return `${x},${y}`;
        });

        const pathD = `M ${points.join(' L ')}`;
        const areaD = `M ${padding},${height - padding} L ${points.join(' L ')} L ${width - padding},${height - padding} Z`;

        // Format dates for display
        const startDate = dates[0] ? new Date(dates[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
        const endDate = dates[dates.length - 1] ? new Date(dates[dates.length - 1]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

        container.innerHTML = `
            <div class="price-history-chart">
                <div class="price-history-summary">
                    <div class="price-history-range">
                        <span class="price-history-min">$${minPrice.toFixed(2)}</span>
                        <span class="price-history-separator">—</span>
                        <span class="price-history-max">$${maxPrice.toFixed(2)}</span>
                    </div>
                    <div class="price-history-change ${trendClass}">
                        <span>${trendIcon} ${priceChange >= 0 ? '+' : ''}$${priceChange.toFixed(2)}</span>
                        <span class="percent-change">(${priceChange >= 0 ? '+' : ''}${percentChange}%)</span>
                    </div>
                </div>
                <svg class="price-sparkline" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="priceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" style="stop-color: ${priceChange >= 0 ? '#22c55e' : '#ef4444'}; stop-opacity: 0.3" />
                            <stop offset="100%" style="stop-color: ${priceChange >= 0 ? '#22c55e' : '#ef4444'}; stop-opacity: 0" />
                        </linearGradient>
                    </defs>
                    <path class="sparkline-area" d="${areaD}" fill="url(#priceGradient)" />
                    <path class="sparkline-line ${trendClass}" d="${pathD}" fill="none" stroke-width="2" />
                </svg>
                <div class="price-history-dates">
                    <span>${startDate}</span>
                    <span>${endDate}</span>
                </div>
            </div>
        `;
    }

    /**
     * Get rarity CSS class for modal display
     * @param {string} rarity - Rarity name
     * @returns {string} CSS class
     */
    getModalRarityClass(rarity) {
        const rarityLower = (rarity || '').toLowerCase();
        if (rarityLower.includes('secret') || rarityLower.includes('starlight') || rarityLower.includes('ghost')) {
            return 'rarity-secret';
        } else if (rarityLower.includes('ultra') || rarityLower.includes('ultimate')) {
            return 'rarity-ultra';
        } else if (rarityLower.includes('super')) {
            return 'rarity-super';
        } else if (rarityLower.includes('rare')) {
            return 'rarity-rare';
        }
        return '';
    }

    /**
     * Get default card image for modal
     * @returns {string} Default SVG image
     */
    getDefaultCardImage() {
        return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420" fill="none"><rect width="300" height="420" rx="16" fill="%231f2937"/></svg>';
    }

    /**
     * Escape HTML text to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtmlText(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    /**
     * Close modal
     */
    closeModal() {
        this.ensureDomReferences(['modalOverlay']);
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
        const app = this.elements.app || document.getElementById('app');

        const isMobile = width < 768;
        const isTablet = width >= 768 && width < 1024;
        const isDesktop = width >= 1024;

        body.classList.toggle('mobile', isMobile);
        body.classList.toggle('tablet', isTablet);
        body.classList.toggle('desktop', isDesktop);

        if (app) {
            app.classList.toggle('mobile', isMobile);
            app.classList.toggle('tablet', isTablet);
            app.classList.toggle('desktop', isDesktop);
        }
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

    /**
     * Live transcript sink for interim voice results (no-op placeholder).
     * @param {string} text
     * @param {number} confidence
     */
    updateLiveTranscript(text, confidence) {
        return { text, confidence };
    }
}
export default UIManager;
