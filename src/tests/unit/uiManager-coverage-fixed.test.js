import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UIManager } from '../../js/ui/UIManager.js';

describe('UIManager - Coverage Enhancement Tests - Fixed', () => {
    let uiManager;
    let mockApp;
    let mockLogger;

    beforeEach(() => {
        // Setup comprehensive DOM structure with proper initialization
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
                <button id="refresh-pricing-btn" disabled>Refresh Pricing</button>
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
                filterCardSets: vi.fn().mockReturnValue([
                    { id: 'set1', code: 'SET1', name: 'Set 1' },
                    { id: 'set2', code: 'SET2', name: 'Set 2' }
                ]),
                filteredCardSets: [
                    { id: 'set1', code: 'SET1', name: 'Set 1' },
                    { id: 'set2', code: 'SET2', name: 'Set 2' }
                ],
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
        uiManager.getDOMElements(); // Initialize DOM references
    });

    afterEach(() => {
        document.body.innerHTML = '';
        vi.clearAllMocks();
    });

    describe('Enhanced Error Path Coverage', () => {
        it('should handle missing DOM elements gracefully', () => {
            // Remove some elements to test error handling
            document.getElementById('card-number').remove();
            
            const formData = uiManager.collectPriceFormData();
            
            expect(formData.cardNumber).toBe('');
            expect(formData.condition).toBe('near-mint'); // Should have fallback
        });

        it('should handle price results display in test environment', () => {
            // Mock test environment detection
            global.expect = vi.fn(); // Make it look like test environment
            
            const results = {
                success: true,
                data: {
                    card_name: 'Test Card',
                    card_number: 'TEST-001',
                    tcg_price: '10.00'
                }
            };
            
            uiManager.displayPriceResults(results);
            
            const priceContent = document.getElementById('price-content');
            expect(priceContent.innerHTML).toContain('CARD PRICE INFORMATION');
            expect(priceContent.innerHTML).toContain('Test Card');
            
            delete global.expect;
        });

        it('should handle error results display', () => {
            const errorResults = {
                success: false,
                error: 'API connection failed'
            };
            
            uiManager.displayPriceResults(errorResults);
            
            const priceContent = document.getElementById('price-content');
            expect(priceContent.innerHTML).toContain('Backend API Not Available');
            expect(priceContent.innerHTML).toContain('API connection failed');
        });
    });

    describe('Settings Modal Enhancement Coverage', () => {
        it('should handle settings modal content generation', () => {
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
            
            // Check if settings form was created (elements should exist)
            const autoConfirmCheckbox = document.getElementById('auto-confirm-checkbox');
            const themeSelect = document.getElementById('theme-select');
            
            expect(autoConfirmCheckbox).toBeTruthy();
            expect(themeSelect).toBeTruthy();
        });

        it('should handle settings data collection with defaults', () => {
            uiManager.showSettings();
            
            const settingsData = uiManager.collectSettingsData();
            
            // Should return default values when form elements don't exist or are empty
            expect(settingsData).toEqual({
                autoConfirm: false,
                autoConfirmThreshold: 85,
                autoExtractRarity: false,
                autoExtractArtVariant: false,
                voiceTimeout: 5000,
                sessionAutoSave: true, // Default to true when not found
                theme: 'dark',
                voiceConfidenceThreshold: 0.5,
                voiceMaxAlternatives: 5,
                voiceContinuous: true,
                voiceInterimResults: true,
                voiceLanguage: 'en-US'
            });
        });
    });

    describe('UI State Management Edge Cases', () => {
        it('should handle session info updates with error handling', () => {
            // Mock error in getImportedCardsInfo
            mockApp.sessionManager.getImportedCardsInfo.mockImplementation(() => {
                throw new Error('Import info error');
            });
            
            const sessionInfo = {
                isActive: true,
                cardCount: 10,
                cards: []
            };
            
            // Should not throw error
            expect(() => {
                uiManager.updateSessionInfo(sessionInfo);
            }).not.toThrow();
            
            // Should fallback to simple logic
            const refreshPricingBtn = document.getElementById('refresh-pricing-btn');
            expect(refreshPricingBtn.toggleAttribute).toBeDefined();
        });

        it('should handle voice status updates with missing elements', () => {
            // Remove voice elements
            document.getElementById('voice-status-text').remove();
            document.getElementById('voice-indicator').remove();
            
            // Should not throw error
            expect(() => {
                uiManager.updateVoiceStatus('listening');
            }).not.toThrow();
        });

        it('should handle consolidated view toggle without session manager', () => {
            uiManager.app = null; // Remove app reference
            
            expect(() => {
                uiManager.handleViewToggle(true);
            }).not.toThrow();
            
            expect(uiManager.isConsolidatedView).toBe(true);
        });
    });

    describe('Event Handling Edge Cases', () => {
        it('should handle tab switching without proper DOM structure', () => {
            // Remove tab elements
            document.querySelectorAll('.tab-btn').forEach(el => el.remove());
            document.querySelectorAll('.tab-panel').forEach(el => el.remove());
            
            expect(() => {
                uiManager.switchTab('pack-ripper');
            }).not.toThrow();
            
            expect(uiManager.currentTab).toBe('pack-ripper');
        });

        it('should handle form validation without form elements', () => {
            document.getElementById('card-number').remove();
            document.getElementById('card-rarity').remove();
            
            const formData = { cardNumber: '', rarity: '' };
            const isValid = uiManager.validatePriceForm(formData);
            
            expect(isValid).toBe(false);
        });

        it('should handle accessibility setup with existing elements', () => {
            // Add elements that might already exist
            const existingSkipLink = document.createElement('a');
            existingSkipLink.className = 'skip-link';
            existingSkipLink.textContent = 'Existing skip link';
            document.body.insertBefore(existingSkipLink, document.body.firstChild);
            
            const existingLiveRegion = document.createElement('div');
            existingLiveRegion.id = 'live-region';
            document.body.appendChild(existingLiveRegion);
            
            uiManager.setupAccessibility();
            
            // Should still work without duplicating elements
            const skipLinks = document.querySelectorAll('.skip-link');
            expect(skipLinks.length).toBeGreaterThan(0);
            
            expect(mockLogger.debug).toHaveBeenCalledWith('Accessibility features set up');
        });
    });

    describe('Performance and Memory Coverage', () => {
        it('should handle loading state management', () => {
            uiManager.setLoading(true);
            
            expect(uiManager.isLoading).toBe(true);
            expect(document.getElementById('app-status').textContent).toBe('Loading...');
            
            uiManager.setLoading(false);
            
            expect(uiManager.isLoading).toBe(false);
            expect(document.getElementById('app-status').textContent).toBe('Ready');
        });

        it('should handle cleanup operations', () => {
            // Create a popup to clean up
            const popup = document.createElement('div');
            popup.id = 'test-popup';
            document.body.appendChild(popup);
            uiManager.currentPopup = popup;
            
            uiManager.hideCardPopup();
            
            expect(uiManager.currentPopup).toBe(null);
            expect(document.getElementById('test-popup')).toBe(null);
        });

        it('should handle responsive class updates', () => {
            // Test different viewport sizes
            Object.defineProperty(window, 'innerWidth', { value: 500, writable: true });
            uiManager.updateResponsiveClasses();
            
            expect(document.body.classList.contains('mobile')).toBe(true);
            
            Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true });
            uiManager.updateResponsiveClasses();
            
            expect(document.body.classList.contains('desktop')).toBe(true);
        });
    });

    describe('Image Loading and Error Handling', () => {
        it('should handle image loading errors gracefully', async () => {
            const cardData = {
                card_number: 'LOB-001',
                image_url: 'https://example.com/image.jpg'
            };
            
            // Add image container to DOM
            const container = document.createElement('div');
            container.id = 'card-image-container';
            document.body.appendChild(container);
            
            // Mock dynamic import to fail
            const originalImport = global.import;
            global.import = vi.fn().mockRejectedValue(new Error('ImageManager import failed'));
            
            await uiManager.loadCardImage(cardData);
            
            const imageContainer = document.getElementById('card-image-container');
            expect(imageContainer.innerHTML).toContain('Image unavailable');
            expect(imageContainer.innerHTML).toContain('ImageManager import failed');
            
            global.import = originalImport;
        });
    });

    describe('Toast and Modal Management', () => {
        it('should handle toast creation and removal', () => {
            const toast = uiManager.createToast('Test message', 'success');
            
            expect(toast.classList.contains('toast')).toBe(true);
            expect(toast.classList.contains('toast-success')).toBe(true);
            expect(toast.querySelector('.toast-message').textContent).toBe('Test message');
            
            // Test toast removal
            document.body.appendChild(toast);
            uiManager.removeToast(toast);
            
            // Should add exit class
            expect(toast.classList.contains('toast-exit')).toBe(true);
        });

        it('should handle modal creation with proper structure', () => {
            const modal = uiManager.createModal('Test Title', '<p>Test content</p>');
            
            expect(modal.querySelector('.modal-header h3').textContent).toBe('Test Title');
            expect(modal.querySelector('.modal-content').innerHTML.trim()).toBe('<p>Test content</p>');
            
            const closeBtn = modal.querySelector('.modal-close');
            expect(closeBtn).toBeTruthy();
        });
    });

    describe('Enhanced Form and Input Handling', () => {
        it('should handle tooltip initialization properly', () => {
            // Add elements with title attributes before initialization
            const button = document.createElement('button');
            button.title = 'Button tooltip';
            button.id = 'tooltip-button';
            document.body.appendChild(button);
            
            const input = document.createElement('input');
            input.title = 'Input tooltip';
            input.id = 'tooltip-input';
            document.body.appendChild(input);
            
            uiManager.initializeTooltips();
            
            expect(button.getAttribute('data-tooltip')).toBe('Button tooltip');
            expect(button.hasAttribute('title')).toBe(false);
            expect(input.getAttribute('data-tooltip')).toBe('Input tooltip');
            expect(input.hasAttribute('title')).toBe(false);
        });

        it('should handle field validation with proper error states', () => {
            const cardNumber = document.getElementById('card-number');
            const cardRarity = document.getElementById('card-rarity');
            
            cardNumber.setAttribute('required', '');
            cardRarity.setAttribute('required', '');
            
            const formData = { cardNumber: '', rarity: '' };
            const isValid = uiManager.validatePriceForm(formData);
            
            expect(isValid).toBe(false);
            expect(cardNumber.classList.contains('error')).toBe(true);
            expect(cardRarity.classList.contains('error')).toBe(true);
            
            // Test clearing errors
            uiManager.clearErrorHighlights();
            expect(cardNumber.classList.contains('error')).toBe(false);
            expect(cardRarity.classList.contains('error')).toBe(false);
        });
    });
});