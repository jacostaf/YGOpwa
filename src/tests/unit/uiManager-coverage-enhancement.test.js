import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UIManager } from '../../js/ui/UIManager.js';

describe('UIManager - Coverage Enhancement Tests', () => {
    let uiManager;
    let mockApp;
    let mockLogger;

    beforeEach(() => {
        // Setup comprehensive DOM structure
        document.body.innerHTML = `
            <div id="app">
                <div id="modal-overlay" class="hidden"></div>
                <div id="toast-container"></div>
                
                <!-- Navigation -->
                <div class="tab-btn" data-tab="price-checker">Price Checker</div>
                <div class="tab-btn" data-tab="pack-ripper">Pack Ripper</div>
                <div class="tab-panel" id="price-checker" data-tab="price-checker">Price Content</div>
                <div class="tab-panel" id="pack-ripper" data-tab="pack-ripper">Pack Content</div>
                
                <!-- Price checker elements -->
                <form id="price-form">
                    <input id="card-number" name="cardNumber" />
                    <input id="card-name" name="cardName" />
                    <select id="card-rarity" name="rarity">
                        <option value="">Select rarity</option>
                        <option value="common">Common</option>
                    </select>
                    <input id="art-variant" name="artVariant" />
                    <select id="condition" name="condition">
                        <option value="near-mint">Near Mint</option>
                    </select>
                    <input type="checkbox" id="force-refresh" name="forceRefresh" />
                    <button type="submit" id="check-price-btn">Check Price</button>
                </form>
                <button id="clear-form-btn">Clear Form</button>
                <div id="price-results" class="hidden">
                    <div id="price-content"></div>
                </div>
                
                <!-- Pack ripper elements -->
                <input id="set-search" placeholder="Search sets..." />
                <select id="set-select"></select>
                <button id="refresh-sets-btn">Refresh Sets</button>
                <button id="load-all-sets-btn">Load All Sets</button>
                <button id="start-session-btn" disabled>Start Session</button>
                <button id="swap-set-btn" class="hidden">Swap Set</button>
                
                <!-- Session elements -->
                <div id="current-set">No set</div>
                <div id="cards-count">0</div>
                <div id="tcg-low-total">$0.00</div>
                <div id="tcg-market-total">$0.00</div>
                <div id="session-status">Inactive</div>
                <div id="sets-count">0</div>
                <div id="total-sets-count">0</div>
                
                <!-- Session cards -->
                <div id="session-cards"></div>
                <div id="empty-session">No cards added yet</div>
                <button id="refresh-pricing-btn">Refresh Pricing</button>
                <button id="export-session-btn">Export</button>
                <button id="import-session-btn">Import</button>
                <button id="clear-session-btn">Clear</button>
                
                <!-- Voice elements -->
                <div id="voice-status">
                    <div id="voice-indicator"></div>
                    <div id="voice-status-text">Ready</div>
                </div>
                <button id="start-voice-btn">Start Voice</button>
                <button id="stop-voice-btn" class="hidden">Stop Voice</button>
                <button id="test-voice-btn">Test Voice</button>
                
                <!-- Floating submenu -->
                <div id="floating-voice-submenu" class="hidden">
                    <button id="floating-stop-voice-btn">Stop</button>
                    <button id="floating-settings-btn">Settings</button>
                </div>
                
                <!-- View controls -->
                <input type="checkbox" id="consolidated-view-toggle" />
                <div id="card-size-section" class="hidden">
                    <input type="range" id="card-size-slider" min="80" max="200" value="120" />
                    <span id="card-size-value">120px</span>
                </div>
                
                <!-- Settings -->
                <button id="settings-btn">Settings</button>
                <button id="help-btn">Help</button>
                
                <!-- Status -->
                <div id="app-status">Ready</div>
                <div id="connection-status">Online</div>
                <div id="app-version">2.1.0</div>
            </div>
        `;

        // Mock dependencies
        mockLogger = {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn()
        };

        mockApp = {
            sessionManager: {
                loadCardSets: vi.fn().mockResolvedValue(true),
                filterCardSets: vi.fn().mockReturnValue([]),
                filteredCardSets: [],
                isSessionActive: vi.fn().mockReturnValue(false),
                getCurrentSessionInfo: vi.fn().mockReturnValue({
                    isActive: false,
                    cardCount: 0,
                    currentSet: 'Test Set',
                    cards: []
                }),
                getImportedCardsInfo: vi.fn().mockReturnValue({
                    hasImportedCards: false,
                    importedCards: 0
                })
            }
        };

        uiManager = new UIManager(mockLogger);
        uiManager.app = mockApp;
    });

    afterEach(() => {
        document.body.innerHTML = '';
        vi.clearAllMocks();
    });

    describe('Accessibility and Responsive Features', () => {
        it('should setup accessibility features without errors', () => {
            uiManager.setupAccessibility();
            
            // Check skip links
            const skipLink = document.querySelector('.skip-link');
            expect(skipLink).toBeTruthy();
            expect(skipLink.textContent).toBe('Skip to main content');
            expect(skipLink.href).toContain('#main-content');
            
            // Check live regions
            const liveRegion = document.getElementById('live-region');
            expect(liveRegion).toBeTruthy();
            expect(liveRegion.getAttribute('aria-live')).toBe('polite');
            expect(liveRegion.getAttribute('aria-atomic')).toBe('true');
            
            expect(mockLogger.debug).toHaveBeenCalledWith('Accessibility features set up');
        });

        it('should handle responsive design updates', () => {
            // Test mobile viewport
            Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });
            uiManager.updateResponsiveClasses();
            
            const app = document.getElementById('app');
            const body = document.body;
            
            expect(app.classList.contains('mobile')).toBe(true);
            expect(body.classList.contains('mobile')).toBe(true);
            
            // Test tablet viewport
            Object.defineProperty(window, 'innerWidth', { value: 800, writable: true });
            uiManager.updateResponsiveClasses();
            
            expect(app.classList.contains('tablet')).toBe(true);
            expect(body.classList.contains('tablet')).toBe(true);
            
            // Test desktop viewport
            Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true });
            uiManager.updateResponsiveClasses();
            
            expect(app.classList.contains('desktop')).toBe(true);
            expect(body.classList.contains('desktop')).toBe(true);
        });

        it('should handle keyboard shortcuts', () => {
            const switchTabSpy = vi.spyOn(uiManager, 'switchTab');
            const closeModalSpy = vi.spyOn(uiManager, 'closeModal');
            
            // Test Ctrl+1 for price checker
            const event1 = new KeyboardEvent('keydown', { key: '1', ctrlKey: true });
            uiManager.handleKeyboardShortcuts(event1);
            expect(switchTabSpy).toHaveBeenCalledWith('price-checker');
            
            // Test Ctrl+2 for pack ripper
            const event2 = new KeyboardEvent('keydown', { key: '2', ctrlKey: true });
            uiManager.handleKeyboardShortcuts(event2);
            expect(switchTabSpy).toHaveBeenCalledWith('pack-ripper');
            
            // Test Escape for closing modals
            const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
            uiManager.handleKeyboardShortcuts(escapeEvent);
            expect(closeModalSpy).toHaveBeenCalled();
        });
    });

    describe('Modal and Settings Management', () => {
        it('should generate and handle settings form', () => {
            const currentSettings = {
                autoConfirm: true,
                autoConfirmThreshold: 90,
                voiceTimeout: 3000,
                sessionAutoSave: false,
                theme: 'light'
            };
            
            uiManager.showSettings(currentSettings);
            
            // Check modal is displayed
            const modalOverlay = document.getElementById('modal-overlay');
            expect(modalOverlay.classList.contains('hidden')).toBe(false);
            
            // Check settings form elements
            const autoConfirmCheckbox = document.getElementById('auto-confirm-checkbox');
            const autoConfirmThreshold = document.getElementById('auto-confirm-threshold');
            const voiceTimeout = document.getElementById('voice-timeout');
            const sessionAutoSave = document.getElementById('session-auto-save');
            const themeSelect = document.getElementById('theme-select');
            
            expect(autoConfirmCheckbox.checked).toBe(true);
            expect(autoConfirmThreshold.value).toBe('90');
            expect(voiceTimeout.value).toBe('3'); // converted from ms to seconds
            expect(sessionAutoSave.checked).toBe(false);
            expect(themeSelect.value).toBe('light');
        });

        it('should handle modal operations', () => {
            const modal = uiManager.createModal('Test Modal', '<p>Test content</p>');
            
            expect(modal.querySelector('.modal-header h3').textContent).toBe('Test Modal');
            expect(modal.querySelector('.modal-content').innerHTML).toBe('<p>Test content</p>');
            
            // Test showing modal
            uiManager.showModal(modal);
            const modalOverlay = document.getElementById('modal-overlay');
            expect(modalOverlay.classList.contains('hidden')).toBe(false);
            
            // Test closing modal
            uiManager.closeModal();
            expect(modalOverlay.classList.contains('hidden')).toBe(true);
        });

        it('should collect settings data from form', () => {
            uiManager.showSettings();
            
            // Set form values
            document.getElementById('auto-confirm-checkbox').checked = true;
            document.getElementById('auto-confirm-threshold').value = '95';
            document.getElementById('voice-timeout').value = '8';
            document.getElementById('session-auto-save').checked = false;
            document.getElementById('theme-select').value = 'dark';
            
            const settingsData = uiManager.collectSettingsData();
            
            expect(settingsData).toEqual({
                autoConfirm: true,
                autoConfirmThreshold: 95,
                autoExtractRarity: false,
                autoExtractArtVariant: false,
                voiceTimeout: 8000, // converted to ms
                sessionAutoSave: false,
                theme: 'dark',
                voiceConfidenceThreshold: 0.5, // default
                voiceMaxAlternatives: 5, // default
                voiceContinuous: true, // default
                voiceInterimResults: true, // default
                voiceLanguage: 'en-US' // default
            });
        });

        it('should handle save and reset settings', () => {
            const emitSettingsSaveSpy = vi.spyOn(uiManager, 'emitSettingsSave');
            const showToastSpy = vi.spyOn(uiManager, 'showToast');
            const closeModalSpy = vi.spyOn(uiManager, 'closeModal');
            
            uiManager.showSettings();
            
            // Test save settings
            uiManager.handleSaveSettings();
            expect(emitSettingsSaveSpy).toHaveBeenCalled();
            expect(closeModalSpy).toHaveBeenCalled();
            expect(showToastSpy).toHaveBeenCalledWith('Settings saved successfully', 'success');
            
            // Test reset settings
            uiManager.handleResetSettings();
            expect(emitSettingsSaveSpy).toHaveBeenCalledWith(expect.objectContaining({
                autoConfirm: false,
                autoConfirmThreshold: 85,
                theme: 'dark'
            }));
            expect(showToastSpy).toHaveBeenCalledWith('Settings reset to defaults', 'info');
        });
    });

    describe('Card Sets Management Enhancement', () => {
        it('should handle set search with enhanced functionality', () => {
            mockApp.sessionManager.filterCardSets.mockReturnValue([
                { id: 'set1', code: 'SET1', name: 'Set 1' },
                { id: 'set2', code: 'SET2', name: 'Set 2' }
            ]);
            
            uiManager.handleSetSearch('test');
            
            expect(mockApp.sessionManager.filterCardSets).toHaveBeenCalledWith('test');
            expect(mockLogger.debug).toHaveBeenCalledWith('Search handled: "test" -> 2 results');
        });

        it('should handle set search with empty string', () => {
            uiManager.handleSetSearch('   ');
            
            expect(mockApp.sessionManager.filterCardSets).toHaveBeenCalledWith('');
        });

        it('should handle refresh sets with success', async () => {
            const showToastSpy = vi.spyOn(uiManager, 'showToast');
            
            uiManager.handleRefreshSets();
            
            await new Promise(resolve => setTimeout(resolve, 0)); // Wait for promise resolution
            
            expect(mockApp.sessionManager.loadCardSets).toHaveBeenCalled();
            expect(showToastSpy).toHaveBeenCalledWith('Card sets refreshed successfully', 'success');
        });

        it('should handle refresh sets with error', async () => {
            const error = new Error('Failed to load sets');
            mockApp.sessionManager.loadCardSets.mockRejectedValue(error);
            const showToastSpy = vi.spyOn(uiManager, 'showToast');
            
            uiManager.handleRefreshSets();
            
            await new Promise(resolve => setTimeout(resolve, 0)); // Wait for promise resolution
            
            expect(mockLogger.error).toHaveBeenCalledWith('Failed to refresh sets:', error);
            expect(showToastSpy).toHaveBeenCalledWith('Failed to refresh card sets', 'error');
        });

        it('should handle load all sets operation', async () => {
            const loadAllSetsBtn = document.getElementById('load-all-sets-btn');
            const showToastSpy = vi.spyOn(uiManager, 'showToast');
            
            uiManager.handleLoadAllSets();
            
            expect(loadAllSetsBtn.hasAttribute('disabled')).toBe(true);
            expect(loadAllSetsBtn.textContent).toBe('Loading...');
            
            await new Promise(resolve => setTimeout(resolve, 0)); // Wait for promise resolution
            
            expect(mockApp.sessionManager.loadCardSets).toHaveBeenCalledWith('');
            expect(showToastSpy).toHaveBeenCalledWith('All card sets loaded successfully', 'success');
            expect(loadAllSetsBtn.hasAttribute('disabled')).toBe(false);
        });
    });

    describe('Session Cards Display Enhancement', () => {
        it('should display session cards without errors', () => {
            const cards = [
                {
                    id: 'card1',
                    card_name: 'Blue-Eyes White Dragon',
                    card_rarity: 'Ultra Rare',
                    quantity: 2,
                    tcg_price: '15.99',
                    tcg_market_price: '18.50',
                    set_code: 'LOB',
                    card_number: 'LOB-001'
                },
                {
                    id: 'card2',
                    card_name: 'Dark Magician',
                    card_rarity: 'Super Rare',
                    quantity: 1,
                    price: 12.75
                }
            ];
            
            uiManager.displaySessionCards(cards);
            
            const sessionCards = document.getElementById('session-cards');
            const cardElements = sessionCards.querySelectorAll('.session-card');
            
            expect(cardElements).toHaveLength(2);
            expect(document.getElementById('empty-session').classList.contains('hidden')).toBe(true);
            
            // Check first card content
            const firstCard = cardElements[0];
            expect(firstCard.querySelector('.card-name').textContent).toBe('Blue-Eyes White Dragon');
            expect(firstCard.querySelector('.quantity-display').textContent).toBe('2');
        });

        it('should handle consolidated view toggle', () => {
            uiManager.handleViewToggle(true);
            
            expect(uiManager.isConsolidatedView).toBe(true);
            expect(document.getElementById('card-size-section').classList.contains('hidden')).toBe(false);
            
            const sessionCards = document.getElementById('session-cards');
            expect(sessionCards.classList.contains('consolidated')).toBe(true);
        });

        it('should handle card size adjustments', () => {
            uiManager.handleCardSizeChange(150);
            
            expect(uiManager.cardSize).toBe(150);
            expect(document.getElementById('card-size-value').textContent).toBe('150px');
            
            const sessionCards = document.getElementById('session-cards');
            expect(sessionCards.style.getPropertyValue('--card-size')).toBe('150px');
        });
    });

    describe('Form Validation and Error Handling', () => {
        it('should validate forms with proper error handling', () => {
            const cardNumberInput = document.getElementById('card-number');
            const cardRaritySelect = document.getElementById('card-rarity');
            
            // Test validation failure
            const formData = { cardNumber: '', rarity: '' };
            const isValid = uiManager.validatePriceForm(formData);
            
            expect(isValid).toBe(false);
            expect(cardNumberInput.classList.contains('error')).toBe(true);
            expect(cardRaritySelect.classList.contains('error')).toBe(true);
            
            // Test validation success
            const validFormData = { cardNumber: 'LOB-001', rarity: 'common' };
            const isValidGood = uiManager.validatePriceForm(validFormData);
            
            expect(isValidGood).toBe(true);
        });

        it('should handle tooltip initialization', () => {
            // Add elements with title attributes
            document.body.innerHTML += `
                <button title="This is a tooltip">Button</button>
                <input title="Input tooltip" />
            `;
            
            uiManager.initializeTooltips();
            
            const button = document.querySelector('button[data-tooltip]');
            const input = document.querySelector('input[data-tooltip]');
            
            expect(button.getAttribute('data-tooltip')).toBe('This is a tooltip');
            expect(button.hasAttribute('title')).toBe(false);
            expect(input.getAttribute('data-tooltip')).toBe('Input tooltip');
            expect(input.hasAttribute('title')).toBe(false);
        });

        it('should validate individual fields', () => {
            const requiredInput = document.createElement('input');
            requiredInput.setAttribute('required', '');
            requiredInput.value = '';
            
            const isValid = uiManager.validateField(requiredInput);
            
            expect(isValid).toBe(false);
            expect(requiredInput.classList.contains('error')).toBe(true);
            expect(requiredInput.getAttribute('aria-invalid')).toBe('true');
            
            // Test valid field
            requiredInput.value = 'test';
            const isValidNow = uiManager.validateField(requiredInput);
            
            expect(isValidNow).toBe(true);
            expect(requiredInput.classList.contains('error')).toBe(false);
        });
    });

    describe('Price Results and Image Loading', () => {
        it('should handle price result errors gracefully', () => {
            const errorResults = {
                success: false,
                error: 'API connection failed'
            };
            
            uiManager.displayPriceResults(errorResults);
            
            const priceContent = document.getElementById('price-content');
            expect(priceContent.innerHTML).toContain('Backend API Not Available');
            expect(priceContent.innerHTML).toContain('API connection failed');
        });

        it('should load card images with error handling', async () => {
            const cardData = {
                card_number: 'LOB-001',
                image_url: 'https://example.com/image.jpg'
            };
            
            // Add image container to DOM
            document.body.innerHTML += `<div id="card-image-container"></div>`;
            
            // Mock the ImageManager import failure
            vi.doMock('../../js/utils/ImageManager.js', () => {
                throw new Error('ImageManager import failed');
            });
            
            await uiManager.loadCardImage(cardData);
            
            const imageContainer = document.getElementById('card-image-container');
            expect(imageContainer.innerHTML).toContain('Image unavailable');
            expect(imageContainer.innerHTML).toContain('ImageManager import failed');
        });
    });

    describe('Voice Status and Controls', () => {
        it('should update voice status correctly', () => {
            const voiceStatusText = document.getElementById('voice-status-text');
            const voiceIndicator = document.getElementById('voice-indicator');
            
            uiManager.updateVoiceStatus('listening');
            
            expect(voiceStatusText.textContent).toBe('Listening for card names...');
            expect(voiceIndicator.className).toBe('status-indicator listening');
            
            uiManager.updateVoiceStatus('error');
            
            expect(voiceStatusText.textContent).toBe('Voice recognition error');
            expect(voiceIndicator.className).toBe('status-indicator error');
        });

        it('should update floating submenu visibility', () => {
            const floatingSubmenu = document.getElementById('floating-voice-submenu');
            
            // Test show in pack ripper tab
            uiManager.currentTab = 'pack-ripper';
            uiManager.updateFloatingSubmenu(true, false);
            
            expect(floatingSubmenu.classList.contains('hidden')).toBe(false);
            
            // Test hide in price checker tab
            uiManager.currentTab = 'price-checker';
            uiManager.updateFloatingSubmenu(true, false);
            
            expect(floatingSubmenu.classList.contains('hidden')).toBe(true);
        });
    });

    describe('Event Emitters and Callbacks', () => {
        it('should handle event callbacks without errors', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn().mockImplementation(() => {
                throw new Error('Callback error');
            });
            
            uiManager.onTabChange(callback1);
            uiManager.onTabChange(callback2);
            
            uiManager.emitTabChange('pack-ripper');
            
            expect(callback1).toHaveBeenCalledWith('pack-ripper');
            expect(mockLogger.error).toHaveBeenCalledWith('Error in tab change callback:', expect.any(Error));
        });

        it('should handle event emission errors gracefully', () => {
            const errorCallback = vi.fn().mockImplementation(() => {
                throw new Error('Emission error');
            });
            
            uiManager.onPriceCheck(errorCallback);
            uiManager.emitPriceCheck({ cardName: 'Test' });
            
            expect(mockLogger.error).toHaveBeenCalledWith('Error in price check callback:', expect.any(Error));
        });
    });

    describe('Session Information Updates', () => {
        it('should handle imported cards information properly', () => {
            mockApp.sessionManager.getImportedCardsInfo.mockReturnValue({
                hasImportedCards: true,
                importedCards: 5
            });
            
            const sessionInfo = {
                isActive: true,
                cardCount: 10,
                cards: []
            };
            
            uiManager.updateSessionInfo(sessionInfo);
            
            const refreshPricingBtn = document.getElementById('refresh-pricing-btn');
            expect(refreshPricingBtn.hasAttribute('disabled')).toBe(false);
            expect(refreshPricingBtn.title).toBe('Refresh pricing data for 5 imported cards');
        });

        it('should handle swap set button visibility', () => {
            const swapSetBtn = document.getElementById('swap-set-btn');
            
            // Test active session
            const activeSessionInfo = {
                isActive: true,
                cardCount: 5
            };
            
            uiManager.updateSessionInfo(activeSessionInfo);
            
            expect(swapSetBtn.classList.contains('hidden')).toBe(false);
            expect(swapSetBtn.disabled).toBe(false);
            
            // Test inactive session
            const inactiveSessionInfo = {
                isActive: false,
                cardCount: 0
            };
            
            uiManager.updateSessionInfo(inactiveSessionInfo);
            
            expect(swapSetBtn.classList.contains('hidden')).toBe(true);
            expect(swapSetBtn.disabled).toBe(true);
        });
    });

    describe('Debounce and Performance', () => {
        it('should handle debouncing correctly', async () => {
            const mockFunction = vi.fn();
            const debouncedFunction = uiManager.debounce(mockFunction, 100);
            
            // Call multiple times rapidly
            debouncedFunction('arg1');
            debouncedFunction('arg2');
            debouncedFunction('arg3');
            
            // Should not be called yet
            expect(mockFunction).not.toHaveBeenCalled();
            
            // Wait for debounce delay
            await new Promise(resolve => setTimeout(resolve, 150));
            
            // Should be called once with last arguments
            expect(mockFunction).toHaveBeenCalledTimes(1);
            expect(mockFunction).toHaveBeenCalledWith('arg3');
        });

        it('should manage UI state efficiently', () => {
            const loadingState = true;
            
            uiManager.setLoading(loadingState);
            
            expect(uiManager.isLoading).toBe(true);
            
            const submitBtns = document.querySelectorAll('button[type="submit"], .btn-primary');
            submitBtns.forEach(btn => {
                expect(btn.disabled).toBe(true);
                expect(btn.classList.contains('loading')).toBe(true);
            });
            
            expect(document.getElementById('app-status').textContent).toBe('Loading...');
        });

        it('should handle cleanup properly', () => {
            const mockEventListeners = {
                tabChange: [vi.fn(), vi.fn()],
                priceCheck: [vi.fn()]
            };
            
            uiManager.eventListeners = mockEventListeners;
            
            // Simulate cleanup operations
            uiManager.currentPopup = document.createElement('div');
            document.body.appendChild(uiManager.currentPopup);
            
            uiManager.hideCardPopup();
            
            expect(uiManager.currentPopup).toBe(null);
        });
    });
});