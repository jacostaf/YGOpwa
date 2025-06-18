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
            voiceStart: [],
            voiceStop: [],
            voiceTest: []
        };
        
        // UI state
        this.currentTab = 'price-checker';
        this.isLoading = false;
        this.toasts = [];
        this.modals = [];
        
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
        this.elements.totalValue = document.getElementById('total-value');
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
        
        // Session tracker elements
        this.elements.sessionCards = document.getElementById('session-cards');
        this.elements.emptySession = document.getElementById('empty-session');
        this.elements.exportSessionBtn = document.getElementById('export-session-btn');
        this.elements.importSessionBtn = document.getElementById('import-session-btn');
        this.elements.clearSessionBtn = document.getElementById('clear-session-btn');
        
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

        // Session tracker controls
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

        // Settings and help
        if (this.elements.settingsBtn) {
            this.elements.settingsBtn.addEventListener('click', () => {
                this.showSettings();
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
     * Display price results
     */
    displayPriceResults(results) {
        if (!results || !this.elements.priceContent) {
            return;
        }
        
        const html = this.generatePriceResultsHTML(results);
        this.elements.priceContent.innerHTML = html;
        
        // Show results container
        if (this.elements.priceResults) {
            this.elements.priceResults.classList.remove('hidden');
        }
        
        // Scroll to results
        this.elements.priceResults?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'nearest' 
        });
    }

    /**
     * Generate HTML for price results
     */
    generatePriceResultsHTML(results) {
        if (!results.success) {
            return `
                <div class="price-error">
                    <h4>❌ Price Check Failed</h4>
                    <p>${results.error || 'Unknown error occurred'}</p>
                </div>
            `;
        }
        
        const { cardInfo, aggregated, sources, metadata } = results;
        
        return `
            <div class="price-summary">
                <div class="card-info">
                    <h4>${cardInfo.name || cardInfo.number}</h4>
                    <div class="card-details">
                        <span class="detail">Number: ${cardInfo.number}</span>
                        <span class="detail">Rarity: ${cardInfo.rarity}</span>
                        <span class="detail">Condition: ${cardInfo.condition}</span>
                        ${cardInfo.artVariant ? `<span class="detail">Variant: ${cardInfo.artVariant}</span>` : ''}
                    </div>
                </div>
                
                <div class="price-aggregate">
                    <div class="main-price">
                        <span class="price-label">Average Price</span>
                        <span class="price-value">$${aggregated.averagePrice.toFixed(2)}</span>
                    </div>
                    <div class="price-stats">
                        <div class="stat">
                            <span class="stat-label">Range</span>
                            <span class="stat-value">$${aggregated.lowestPrice.toFixed(2)} - $${aggregated.highestPrice.toFixed(2)}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Median</span>
                            <span class="stat-value">$${aggregated.medianPrice.toFixed(2)}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Confidence</span>
                            <span class="stat-value">${(aggregated.confidence * 100).toFixed(0)}%</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="price-sources">
                <h5>Price Sources</h5>
                ${Object.entries(sources).map(([sourceId, source]) => `
                    <div class="source-result">
                        <div class="source-header">
                            <span class="source-name">${source.source}</span>
                            <span class="response-time">${source.responseTime}ms</span>
                        </div>
                        <div class="source-data">
                            ${this.generateSourceDataHTML(sourceId, source.data)}
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div class="price-metadata">
                <div class="meta-item">
                    <span class="meta-label">Updated:</span>
                    <span class="meta-value">${new Date(metadata.timestamp).toLocaleString()}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Sources:</span>
                    <span class="meta-value">${metadata.sourcesUsed}/${metadata.totalSources}</span>
                </div>
                ${metadata.fromCache ? `
                    <div class="meta-item">
                        <span class="meta-label">From Cache:</span>
                        <span class="meta-value">Yes (${Math.round(metadata.cacheAge / 1000)}s ago)</span>
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
        
        if (this.elements.totalValue) {
            this.elements.totalValue.textContent = `$${sessionInfo.totalValue.toFixed(2)}`;
        }
        
        if (this.elements.sessionStatus) {
            this.elements.sessionStatus.textContent = sessionInfo.status;
            this.elements.sessionStatus.className = `stat-value status-badge ${sessionInfo.isActive ? 'active' : 'inactive'}`;
        }
        
        // Update session tracker controls
        const hasSession = sessionInfo.cardCount > 0;
        this.elements.exportSessionBtn?.toggleAttribute('disabled', !hasSession);
        this.elements.clearSessionBtn?.toggleAttribute('disabled', !hasSession);
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
    showSettings() {
        const modal = this.createModal('Settings', this.generateSettingsHTML());
        this.showModal(modal);
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
        return `
            <div class="settings-content">
                <p>Settings panel will be implemented here.</p>
                <p>This will include voice recognition settings, theme options, and other preferences.</p>
            </div>
        `;
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
            if (keyNum >= 1 && keyNum <= 3) {
                e.preventDefault();
                const tabs = ['price-checker', 'pack-ripper', 'session-tracker'];
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

    onVoiceStart(callback) {
        this.eventListeners.voiceStart.push(callback);
    }

    onVoiceStop(callback) {
        this.eventListeners.voiceStop.push(callback);
    }

    onVoiceTest(callback) {
        this.eventListeners.voiceTest.push(callback);
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
}