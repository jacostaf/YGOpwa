import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UIManager } from '../../js/ui/UIManager.js';

describe('UIManager - Coverage Improvement Tests', () => {
    let uiManager;
    let mockLogger;

    beforeEach(() => {
        // Setup DOM
        document.body.innerHTML = `
            <div id="loading-screen"></div>
            <div id="app"></div>
            <div id="session-info"></div>
            <div id="voice-status"></div>
            <div id="error-container"></div>
            <div id="session-cards"></div>
            <div id="price-results"></div>
            <div id="modal-container"></div>
            <div id="toast-container"></div>
            <form id="price-form">
                <input name="cardName" />
                <button type="submit">Check Price</button>
            </form>
            <div class="tab-button" data-tab="price-checker">Price Checker</div>
            <div class="tab-button" data-tab="pack-ripper">Pack Ripper</div>
            <div class="tab-content" id="price-checker-tab"></div>
            <div class="tab-content" id="pack-ripper-tab"></div>
        `;

        mockLogger = {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn()
        };

        uiManager = new UIManager();
        uiManager.logger = mockLogger;
    });

    afterEach(() => {
        document.body.innerHTML = '';
        vi.clearAllMocks();
    });

    describe('Edge Case Coverage', () => {
        it('should handle missing DOM elements gracefully', () => {
            // Remove key elements
            document.getElementById('session-info').remove();
            document.getElementById('voice-status').remove();
            
            // getDOMElements should handle missing elements gracefully
            expect(() => uiManager.getDOMElements()).not.toThrow();
            expect(uiManager.elements.sessionInfo).toBeUndefined();
        });

        it('should handle tab switching functionality', () => {
            uiManager.getDOMElements();
            
            const tabId = 'pack-ripper';
            uiManager.switchTab(tabId);
            
            expect(uiManager.currentTab).toBe(tabId);
            expect(mockLogger.debug).toHaveBeenCalledWith('Switching to tab: pack-ripper');
        });

        it('should initialize accessibility features', () => {
            expect(() => uiManager.setupAccessibility()).not.toThrow();
            expect(mockLogger.debug).toHaveBeenCalledWith('Accessibility features set up');
        });

        it('should handle price form validation', () => {
            const formData = { cardNumber: '', cardName: '' };
            
            const isValid = uiManager.validatePriceForm(formData);
            
            expect(isValid).toBe(false);
        });

        it('should collect price form data correctly', () => {
            // Setup form with data using the correct IDs the UIManager expects
            document.body.innerHTML = `
                <form id="price-form">
                    <input id="card-number" value="LOB-001" />
                    <input id="card-name" value="Blue-Eyes White Dragon" />
                </form>
            `;
            uiManager.getDOMElements();
            
            const formData = uiManager.collectPriceFormData();
            
            expect(formData.cardNumber).toBe('LOB-001');
            expect(formData.cardName).toBe('Blue-Eyes White Dragon');
        });

        it('should setup responsive design features', () => {
            expect(() => uiManager.setupResponsive()).not.toThrow();
            expect(mockLogger.debug).toHaveBeenCalledWith('Responsive design set up');
        });

        it('should clear price form data', () => {
            // Setup form with data
            document.body.innerHTML = `
                <form id="price-form">
                    <input id="card-name" value="Test Card" />
                </form>
            `;
            uiManager.getDOMElements();
            
            uiManager.clearPriceForm();
            
            const input = document.getElementById('card-name');
            expect(input.value).toBe('');
        });

        it('should handle session start process', () => {
            expect(() => uiManager.handleSessionStart()).not.toThrow();
            expect(mockLogger.debug).toHaveBeenCalledWith('Session start requested');
        });

        it('should display session cards', () => {
            const cards = [
                { id: '1', name: 'Card 1', price: 10 },
                { id: '2', name: 'Card 2', price: 20 }
            ];
            
            uiManager.displaySessionCards(cards);
            
            const container = document.getElementById('session-cards');
            expect(container.children.length).toBe(2);
        });

        it('should update voice status display', () => {
            const status = {
                isListening: true,
                isAvailable: true,
                error: null
            };
            
            uiManager.updateVoiceStatus(status);
            
            expect(mockLogger.debug).toHaveBeenCalledWith('Voice status updated:', status);
        });
    });
});