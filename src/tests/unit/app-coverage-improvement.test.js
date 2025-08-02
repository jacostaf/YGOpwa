import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import YGORipperApp from '../../js/app.js';

describe('YGORipperApp - Coverage Improvement Tests', () => {
    let app;
    let mockLogger;

    beforeEach(() => {
        // Mock all dependencies
        mockLogger = {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn()
        };

        // Create app with all required mocks
        app = new YGORipperApp({ skipInitialization: true });
        app.logger = mockLogger;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Card Selection Dialog Coverage', () => {
        it('should show card selection dialog and auto-select first card', () => {
            const cards = [
                { id: '123', name: 'Blue-Eyes White Dragon', price: 10 },
                { id: '456', name: 'Dark Magician', price: 8 }
            ];
            const transcript = 'blue eyes';
            
            // Mock safeAddCard method
            app.safeAddCard = vi.fn();
            
            app.showCardSelectionDialog(cards, transcript);
            
            expect(mockLogger.info).toHaveBeenCalledWith('Showing card selection dialog for:', transcript, cards);
            expect(app.safeAddCard).toHaveBeenCalledWith({
                id: '123',
                name: 'Blue-Eyes White Dragon',
                price: 10,
                quantity: 1
            });
        });

        it('should handle empty cards array in card selection dialog', () => {
            const cards = [];
            const transcript = 'no match';
            
            app.safeAddCard = vi.fn();
            
            app.showCardSelectionDialog(cards, transcript);
            
            expect(mockLogger.info).toHaveBeenCalledWith('Showing card selection dialog for:', transcript, cards);
            expect(app.safeAddCard).not.toHaveBeenCalled();
        });
    });

    describe('Pack Ripper Tab Activation Coverage', () => {
        it('should initialize voice engine when tab activated and not initialized', async () => {
            const initializeMock = vi.fn().mockResolvedValue(true);
            
            app.voiceEngine = {
                isInitialized: false,
                initialize: initializeMock
            };
            
            app.handlePackRipperTabActivated();
            
            expect(mockLogger.debug).toHaveBeenCalledWith('Pack ripper tab activated');
            expect(initializeMock).toHaveBeenCalled();
        });

        it('should handle voice engine initialization failure on tab activation', async () => {
            const error = new Error('Init failed');
            const initializeMock = vi.fn().mockRejectedValue(error);
            
            app.voiceEngine = {
                isInitialized: false,
                initialize: initializeMock
            };
            
            app.handlePackRipperTabActivated();
            
            // Wait for the promise to reject
            await new Promise(resolve => setTimeout(resolve, 10));
            
            expect(mockLogger.warn).toHaveBeenCalledWith('Failed to initialize voice engine on tab activation:', error);
        });

        it('should not initialize voice engine when already initialized', () => {
            const initializeMock = vi.fn();
            
            app.voiceEngine = {
                isInitialized: true,
                initialize: initializeMock
            };
            
            app.handlePackRipperTabActivated();
            
            expect(mockLogger.debug).toHaveBeenCalledWith('Pack ripper tab activated');
            expect(initializeMock).not.toHaveBeenCalled();
        });

        it('should handle missing voice engine gracefully', () => {
            app.voiceEngine = null;
            
            app.handlePackRipperTabActivated();
            
            expect(mockLogger.debug).toHaveBeenCalledWith('Pack ripper tab activated');
            // Should not throw error
        });
    });
});