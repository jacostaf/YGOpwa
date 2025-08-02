import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import YGORipperApp from '../../js/app.js';

describe('YGORipperApp - Additional Coverage Tests', () => {
    let app;
    let mockLogger;

    beforeEach(() => {
        // Setup complete DOM
        document.body.innerHTML = `
            <div id="loading-screen">
                <div class="loading-text">Loading...</div>
                <div id="loading-progress"></div>
            </div>
            <div id="app" class="hidden"></div>
            <div id="current-tab">price-checker</div>
            <div class="tab-button" data-tab="price-checker">Price</div>
            <div class="tab-button" data-tab="pack-ripper">Pack</div>
            <form id="price-form">
                <input name="cardName" value="" />
            </form>
        `;

        mockLogger = {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn()
        };

        // Create app with mocked dependencies
        app = new YGORipperApp({ skipInitialization: true });
        app.logger = mockLogger;
        
        // Mock all required components
        app.uiManager = {
            initialize: vi.fn().mockResolvedValue(true),
            showToast: vi.fn(),
            setLoading: vi.fn(),
            updateUI: vi.fn(),
            displayPriceResults: vi.fn(),
            displayError: vi.fn(),
            on: vi.fn(),
            removeAllListeners: vi.fn()
        };
        
        app.storage = {
            initialize: vi.fn().mockResolvedValue(true),
            get: vi.fn().mockResolvedValue(null),
            set: vi.fn().mockResolvedValue(true)
        };
        
        app.sessionManager = {
            initialize: vi.fn().mockResolvedValue(true),
            loadCardSets: vi.fn().mockResolvedValue(true),
            startSession: vi.fn(),
            stopSession: vi.fn(),
            addCard: vi.fn().mockResolvedValue(true),
            on: vi.fn(),
            removeAllListeners: vi.fn()
        };
        
        app.priceChecker = {
            initialize: vi.fn().mockResolvedValue(true),
            checkPrice: vi.fn().mockResolvedValue({ success: true, data: {} })
        };
        
        app.voiceEngine = {
            initialize: vi.fn().mockResolvedValue(true),
            isInitialized: false,
            isAvailable: vi.fn().mockReturnValue(true),
            on: vi.fn(),
            removeAllListeners: vi.fn(),
            stopListening: vi.fn()
        };
        
        app.permissionManager = {
            checkMicrophonePermission: vi.fn().mockResolvedValue('granted')
        };
    });

    afterEach(() => {
        document.body.innerHTML = '';
        vi.clearAllMocks();
    });

    describe('Initialization Edge Cases', () => {
        it('should handle initialization with all components failing gracefully', async () => {
            app.uiManager.initialize.mockRejectedValue(new Error('UI failed'));
            app.storage.initialize.mockRejectedValue(new Error('Storage failed'));
            
            await app.initialize();
            
            expect(app.isInitialized).toBe(true); // Still completes
            expect(mockLogger.error).toHaveBeenCalledWith('Failed to initialize UI:', expect.any(Error));
            expect(mockLogger.error).toHaveBeenCalledWith('Failed to initialize storage:', expect.any(Error));
        });

        it('should handle voice engine initialization with permission denied', async () => {
            app.permissionManager.checkMicrophonePermission.mockResolvedValue('denied');
            
            await app.initializeVoiceEngine();
            
            expect(mockLogger.warn).toHaveBeenCalledWith('Microphone permission denied');
            expect(app.voiceEngine.initialize).not.toHaveBeenCalled();
        });

        it('should setup all event listeners correctly', () => {
            const eventMap = new Map();
            app.uiManager.on = vi.fn((event, handler) => eventMap.set(event, handler));
            app.sessionManager.on = vi.fn((event, handler) => eventMap.set(event, handler));
            app.voiceEngine.on = vi.fn((event, handler) => eventMap.set(event, handler));
            
            app.setupEventListeners();
            
            expect(eventMap.has('tabChanged')).toBe(true);
            expect(eventMap.has('sessionStart')).toBe(true);
            expect(eventMap.has('priceCheck')).toBe(true);
            expect(eventMap.has('voiceResult')).toBe(true);
        });
    });

    describe('Settings Edge Cases', () => {
        it('should merge partial settings with defaults', async () => {
            const partialSettings = { theme: 'light' };
            app.storage.get.mockResolvedValue(partialSettings);
            
            await app.loadSettings();
            
            expect(app.settings).toHaveProperty('theme', 'light');
            expect(app.settings).toHaveProperty('voiceTimeout'); // From defaults
            expect(app.settings).toHaveProperty('autoConfirm'); // From defaults
        });

        it('should handle settings save with storage error', async () => {
            app.storage.set.mockRejectedValue(new Error('Storage full'));
            
            const result = await app.saveSettings({ theme: 'dark' });
            
            expect(result).toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith('Failed to save settings:', expect.any(Error));
        });
    });

    describe('Error Recovery Paths', () => {
        it('should show price check error with recovery options', () => {
            const error = new Error('Network timeout');
            const formData = { cardName: 'Blue-Eyes' };
            
            app.showPriceCheckError(error, formData);
            
            expect(app.uiManager.displayError).toHaveBeenCalledWith(
                'Failed to check price: Network timeout',
                expect.objectContaining({
                    retry: expect.any(Function),
                    showOfflineMode: true
                })
            );
        });

        it('should show voice error recovery with transcript', () => {
            const transcript = 'blue eyes white';
            
            app.showVoiceErrorRecovery('no-match', transcript);
            
            expect(app.uiManager.showToast).toHaveBeenCalledWith(
                expect.stringContaining('Could not find a card matching'),
                'warning',
                expect.objectContaining({
                    duration: 5000,
                    action: expect.any(Object)
                })
            );
        });
    });

    describe('Tab Management', () => {
        it('should handle tab change to pack ripper', () => {
            app.handleTabChange('pack-ripper');
            
            expect(app.currentTab).toBe('pack-ripper');
            expect(mockLogger.info).toHaveBeenCalledWith('Tab changed to:', 'pack-ripper');
        });

        it('should handle tab change to price checker', () => {
            app.currentTab = 'pack-ripper';
            app.voiceEngine.isListening = true;
            
            app.handleTabChange('price-checker');
            
            expect(app.currentTab).toBe('price-checker');
            expect(app.voiceEngine.stopListening).toHaveBeenCalled();
        });
    });

    describe('Voice Processing Edge Cases', () => {
        it('should handle voice result with low confidence', async () => {
            const result = {
                transcript: 'maybe blue eyes',
                confidence: 0.5,
                alternatives: ['blue eyes', 'blue ice']
            };
            
            app.settings.autoConfirmThreshold = 0.8;
            app.searchCardByName = vi.fn().mockResolvedValue([
                { id: '1', name: 'Blue-Eyes White Dragon' }
            ]);
            
            await app.handleVoiceResult(result);
            
            expect(mockLogger.info).toHaveBeenCalledWith('Low confidence voice result:', result);
            expect(app.searchCardByName).toHaveBeenCalled();
        });

        it('should handle voice error with specific types', () => {
            const errors = ['network', 'no-speech', 'not-allowed', 'aborted'];
            
            errors.forEach(errorType => {
                app.handleVoiceError({ error: errorType });
                expect(mockLogger.error).toHaveBeenCalledWith(`Voice recognition error: ${errorType}`);
            });
        });
    });

    describe('Application Lifecycle', () => {
        it('should handle application close with cleanup', async () => {
            app.isInitialized = true;
            app.sessionManager.isActive = true;
            
            await app.close();
            
            expect(app.sessionManager.stopSession).toHaveBeenCalled();
            expect(app.voiceEngine.stopListening).toHaveBeenCalled();
            expect(app.storage.set).toHaveBeenCalledWith('lastClosedTime', expect.any(Number));
            expect(app.isInitialized).toBe(false);
        });

        it('should handle cleanup errors gracefully during close', async () => {
            app.isInitialized = true;
            app.sessionManager.stopSession.mockRejectedValue(new Error('Session error'));
            
            await app.close();
            
            expect(mockLogger.error).toHaveBeenCalledWith('Error during cleanup:', expect.any(Error));
            expect(app.isInitialized).toBe(false); // Still marks as closed
        });
    });

    describe('Card Operations', () => {
        it('should safely add card with validation', async () => {
            const cardData = {
                name: 'Test Card',
                set: 'TEST-001',
                quantity: 1
            };
            
            const result = await app.safeAddCard(cardData);
            
            expect(app.sessionManager.addCard).toHaveBeenCalledWith(cardData);
            expect(result).toBe(true);
        });

        it('should handle card addition failure', async () => {
            app.sessionManager.addCard.mockRejectedValue(new Error('Session not active'));
            
            const result = await app.safeAddCard({ name: 'Test' });
            
            expect(result).toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith('Failed to add card:', expect.any(Error));
            expect(app.uiManager.showToast).toHaveBeenCalledWith(
                'Failed to add card: Session not active',
                'error'
            );
        });
    });
});