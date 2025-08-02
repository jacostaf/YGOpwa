import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import YGORipperApp from '../../js/app.js';

describe('YGORipperApp - Coverage Enhancement Tests', () => {
    let app;
    let mockLogger;
    let mockStorage;

    beforeEach(() => {
        // Setup DOM elements that tests expect
        document.body.innerHTML = `
            <div id="loading-screen" class="loading-screen">
                <div class="loading-text">Loading...</div>
                <div id="loading-progress" class="progress-bar" style="width: 0%"></div>
            </div>
            <div id="app" class="hidden">App Content</div>
        `;

        // Mock dependencies
        mockLogger = {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn()
        };

        mockStorage = {
            initialize: vi.fn().mockResolvedValue(true),
            get: vi.fn().mockResolvedValue(null),
            set: vi.fn().mockResolvedValue(true),
            remove: vi.fn().mockResolvedValue(true),
            clear: vi.fn().mockResolvedValue(true)
        };

        app = new YGORipperApp({ skipInitialization: true });
        
        // Replace logger and storage with mocks
        app.logger = mockLogger;
        app.storage = mockStorage;
        
        // Ensure other required components exist
        if (!app.uiManager) {
            app.uiManager = {
                setLoading: vi.fn(),
                showToast: vi.fn(),
                displayPriceResults: vi.fn()
            };
        }
    });

    afterEach(() => {
        document.body.innerHTML = '';
        vi.clearAllMocks();
    });

    describe('Uncovered Error Handling Paths', () => {
        it('should handle showInitializationError with proper DOM updates', () => {
            const error = new Error('Test initialization error');
            
            // Ensure the method exists
            expect(typeof app.showInitializationError).toBe('function');
            
            app.showInitializationError(error);
            
            const loadingText = document.querySelector('.loading-text');
            expect(loadingText).toBeTruthy();
            expect(loadingText.textContent).toBe('Failed to initialize: Test initialization error');
            expect(loadingText.style.color).toBe('#ff4444');
            expect(mockLogger.error).toHaveBeenCalledWith('Initialization error displayed:', error);
        });

        it('should handle createMinimalUI for critical errors', () => {
            app.createMinimalUI();
            
            const errorDivs = document.querySelectorAll('div');
            const errorDiv = errorDivs[errorDivs.length - 1]; // Get the last div which was just appended
            expect(errorDiv.innerHTML).toContain('Application Error');
            expect(errorDiv.innerHTML).toContain('Refresh Page');
            expect(mockLogger.info).toHaveBeenCalledWith('Creating minimal UI for error display');
        });

        it('should setup minimal event handlers for critical functions', () => {
            const beforeUnloadSpy = vi.spyOn(window, 'addEventListener');
            
            app.setupMinimalEventHandlers();
            
            expect(beforeUnloadSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
            expect(mockLogger.info).toHaveBeenCalledWith('Setting up minimal event handlers');
        });

        it('should load essential data only during fallback', async () => {
            app.sessionManager = {
                loadCardSets: vi.fn().mockRejectedValue(new Error('Failed to load'))
            };
            
            await app.loadEssentialData();
            
            expect(app.sessionManager.loadCardSets).toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith('Loading essential data only');
            expect(mockLogger.warn).toHaveBeenCalledWith('Failed to load card sets:', expect.any(Error));
        });
    });

    describe('Settings Management Edge Cases', () => {
        it('should handle settings save from UI with complete data', async () => {
            const newSettings = {
                theme: 'light',
                voiceTimeout: 10000,
                autoConfirm: true,
                autoConfirmThreshold: 90
            };
            
            app.uiManager = {
                showToast: vi.fn()
            };
            app.voiceEngine = {
                updateConfig: vi.fn()
            };
            app.sessionManager = {
                updateSettings: vi.fn()
            };
            
            await app.handleSettingsSave(newSettings);
            
            expect(app.settings).toEqual(expect.objectContaining(newSettings));
            expect(mockStorage.set).toHaveBeenCalledWith('settings', expect.objectContaining(newSettings));
            expect(app.voiceEngine.updateConfig).toHaveBeenCalledWith(app.settings);
            expect(app.sessionManager.updateSettings).toHaveBeenCalledWith(app.settings);
            expect(app.uiManager.showToast).toHaveBeenCalledWith('Settings saved successfully', 'success');
        });

        it('should handle settings save errors gracefully', async () => {
            const error = new Error('Storage write failed');
            mockStorage.set.mockRejectedValue(error);
            
            app.uiManager = {
                showToast: vi.fn()
            };
            
            const newSettings = { theme: 'light' };
            await app.handleSettingsSave(newSettings);
            
            expect(mockLogger.error).toHaveBeenCalledWith('Failed to save settings:', error);
            expect(app.uiManager.showToast).toHaveBeenCalledWith('Failed to save settings', 'error');
        });

        it('should handle getDefaultSettings returning complete configuration', () => {
            const defaultSettings = app.getDefaultSettings();
            
            expect(defaultSettings).toEqual({
                theme: 'dark',
                voiceTimeout: 5000,
                voiceLanguage: 'en-US',
                autoPriceRefresh: false,
                sessionAutoSave: true,
                debugMode: false,
                autoConfirm: false,
                autoConfirmThreshold: 85,
                voiceConfidenceThreshold: 0.5,
                voiceMaxAlternatives: 5,
                voiceContinuous: true,
                voiceInterimResults: true,
                autoExtractRarity: false,
                autoExtractArtVariant: false
            });
        });
    });

    describe('Voice Error Handling Coverage', () => {
        it('should handle voice error with network-error type', () => {
            const error = { type: 'network-error', message: 'Network connection required' };
            
            app.uiManager = {
                updateVoiceStatus: vi.fn(),
                showToast: vi.fn()
            };
            
            const errorInfo = app.createVoiceErrorInfo(error);
            
            expect(errorInfo.message).toBe('Network connection is required for voice recognition. Please check your internet connection.');
            expect(errorInfo.recoveryOptions).toHaveLength(2);
            expect(errorInfo.recoveryOptions[0]).toEqual({ action: 'retry', label: 'Try Again' });
            expect(errorInfo.recoveryOptions[1]).toEqual({ action: 'offline', label: 'Work Offline' });
        });

        it('should handle voice error with not-supported type', () => {
            const error = { type: 'not-supported', message: 'Browser not supported' };
            
            const errorInfo = app.createVoiceErrorInfo(error);
            
            expect(errorInfo.message).toBe('Voice recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
            expect(errorInfo.recoveryOptions).toHaveLength(2);
            expect(errorInfo.recoveryOptions[0]).toEqual({ action: 'manual', label: 'Type Instead' });
            expect(errorInfo.recoveryOptions[1]).toEqual({ action: 'help', label: 'Browser Support' });
        });

        it('should handle voice error with no-speech type', () => {
            const error = { type: 'no-speech', message: 'No speech detected' };
            
            const errorInfo = app.createVoiceErrorInfo(error);
            
            expect(errorInfo.message).toBe('No speech detected. Please try speaking louder and clearer.');
            expect(errorInfo.recoveryOptions).toHaveLength(2);
            expect(errorInfo.recoveryOptions[0]).toEqual({ action: 'retry', label: 'Try Again' });
            expect(errorInfo.recoveryOptions[1]).toEqual({ action: 'manual', label: 'Type Instead' });
        });

        it('should handle showVoiceErrorRecovery with transcript', () => {
            app.offerManualCardInput = vi.fn();
            
            const transcript = 'blue eyes white dragon';
            app.showVoiceErrorRecovery(transcript);
            
            expect(mockLogger.info).toHaveBeenCalledWith('Voice error recovery options:', expect.any(Array));
            expect(app.offerManualCardInput).toHaveBeenCalledWith(transcript);
        });
    });

    describe('Price Check Error Handling', () => {
        it('should handle price check error with timeout', () => {
            const error = new Error('Price check timed out');
            const formData = { cardName: 'Test Card' };
            
            app.uiManager = {
                showToast: vi.fn()
            };
            
            app.showPriceCheckError(error, formData);
            
            expect(app.uiManager.showToast).toHaveBeenCalledWith('Price check failed: Price check timed out', 'error');
            expect(mockLogger.info).toHaveBeenCalledWith('Price check recovery options:', expect.any(Array));
        });

        it('should handle price check with offline network status', async () => {
            // Mock navigator.onLine to be false
            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: false
            });
            
            app.priceChecker = {
                checkPrice: vi.fn()
            };
            app.uiManager = {
                setLoading: vi.fn(),
                displayPriceResults: vi.fn(),
                showToast: vi.fn()
            };
            
            const formData = { cardName: 'Test Card' };
            app.showPriceCheckError = vi.fn();
            
            await app.handlePriceCheck(formData);
            
            expect(app.uiManager.setLoading).toHaveBeenCalledWith(true);
            expect(app.uiManager.setLoading).toHaveBeenCalledWith(false);
            expect(app.showPriceCheckError).toHaveBeenCalledWith(
                expect.objectContaining({ message: 'No internet connection available for price checking' }),
                formData
            );
        });
    });

    describe('Card Addition Fallback Coverage', () => {
        it('should handle card addition fallback with minimal data', async () => {
            const card = { name: 'Test Card', rarity: 'Common' };
            
            app.sessionManager = {
                addCard: vi.fn()
                    .mockRejectedValueOnce(new Error('Add failed'))
                    .mockResolvedValueOnce(true)
            };
            app.uiManager = {
                showToast: vi.fn()
            };
            
            await app.safeAddCard(card);
            
            // Should try original add, then fallback with minimal data
            expect(app.sessionManager.addCard).toHaveBeenCalledTimes(2);
            expect(app.sessionManager.addCard).toHaveBeenNthCalledWith(1, card);
            expect(app.sessionManager.addCard).toHaveBeenNthCalledWith(2, {
                name: 'Test Card',
                quantity: 1,
                rarity: 'Common',
                id: expect.any(String)
            });
            expect(app.uiManager.showToast).toHaveBeenCalledWith('Added Test Card (some data may be missing)', 'warning');
        });

        it('should handle basic card name search fallback', async () => {
            const transcript = 'blue eyes white dragon';
            
            const result = await app.basicCardNameSearch(transcript);
            
            expect(result).toEqual([]);
            expect(mockLogger.info).toHaveBeenCalledWith('Using basic card name search fallback');
        });

        it('should handle voice input processing with complete fallback failure', async () => {
            const transcript = 'test card';
            
            app.sessionManager = {
                processVoiceInput: vi.fn().mockRejectedValue(new Error('Processing failed'))
            };
            app.basicCardNameSearch = vi.fn().mockRejectedValue(new Error('Fallback failed'));
            
            const result = await app.safeProcessVoiceInput(transcript);
            
            expect(result).toEqual([]);
            expect(mockLogger.error).toHaveBeenCalledWith('Voice input processing failed:', expect.any(Error));
            expect(mockLogger.error).toHaveBeenCalledWith('Fallback card search failed:', expect.any(Error));
        });
    });

    describe('Event Handler Coverage', () => {
        it('should handle sets loaded with extra parameters', () => {
            const data = { sets: ['set1', 'set2'] };
            app.uiManager = {
                updateCardSets: vi.fn()
            };
            
            app.handleSetsLoaded(data, undefined, 123);
            
            expect(mockLogger.info).toHaveBeenCalledWith('Card sets loaded:', data);
            expect(app.uiManager.updateCardSets).toHaveBeenCalledWith(['set1', 'set2'], undefined, 123);
        });

        it('should handle pack ripper tab activation', () => {
            app.voiceEngine = {
                isInitialized: false,
                initialize: vi.fn().mockResolvedValue(true)
            };
            
            app.handlePackRipperTabActivated();
            
            expect(mockLogger.debug).toHaveBeenCalledWith('Pack ripper tab activated');
            expect(app.voiceEngine.initialize).toHaveBeenCalled();
        });

        it('should handle session start from UI event', async () => {
            const setId = 'test-set-123';
            
            app.sessionManager = {
                startSession: vi.fn().mockResolvedValue(true),
                getCurrentSessionInfo: vi.fn().mockReturnValue({ setName: 'Test Set' })
            };
            app.uiManager = {
                updateSessionInfo: vi.fn(),
                showToast: vi.fn()
            };
            app.voiceEngine = {
                isAvailable: vi.fn().mockReturnValue(true)
            };
            app.handleVoiceStart = vi.fn();
            
            await app.handleSessionStart(setId);
            
            expect(mockLogger.info).toHaveBeenCalledWith('Starting session for set:', setId);
            expect(app.sessionManager.startSession).toHaveBeenCalledWith(setId);
            expect(app.uiManager.updateSessionInfo).toHaveBeenCalled();
            expect(app.uiManager.showToast).toHaveBeenCalledWith('Session started successfully', 'success');
            
            // Should auto-start voice recognition after 1 second
            await new Promise(resolve => setTimeout(resolve, 1100));
            expect(app.handleVoiceStart).toHaveBeenCalled();
        });

        it('should handle session stop from UI event', () => {
            app.voiceEngine = {
                isListening: vi.fn().mockReturnValue(true),
                stopListening: vi.fn()
            };
            app.sessionManager = {
                stopSession: vi.fn(),
                getCurrentSessionInfo: vi.fn().mockReturnValue({ setName: 'Test Set' })
            };
            app.uiManager = {
                updateSessionInfo: vi.fn(),
                showToast: vi.fn()
            };
            
            app.handleSessionStop();
            
            expect(mockLogger.info).toHaveBeenCalledWith('Stopping session');
            expect(app.voiceEngine.stopListening).toHaveBeenCalled();
            expect(app.sessionManager.stopSession).toHaveBeenCalled();
            expect(app.uiManager.showToast).toHaveBeenCalledWith('Session stopped', 'info');
        });

        it('should handle price check from UI event', async () => {
            const formData = { cardName: 'Test Card', rarity: 'Common' };
            const results = { success: true, data: { card_name: 'Test Card' } };
            
            app.priceChecker = {
                checkPrice: vi.fn().mockResolvedValue(results)
            };
            app.uiManager = {
                setLoading: vi.fn(),
                displayPriceResults: vi.fn()
            };
            
            // Mock navigator.onLine to be true
            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: true
            });
            
            await app.handlePriceCheck(formData);
            
            expect(mockLogger.info).toHaveBeenCalledWith('Starting price check for:', formData);
            expect(app.priceChecker.checkPrice).toHaveBeenCalledWith(formData);
            expect(app.uiManager.displayPriceResults).toHaveBeenCalledWith(results);
            expect(mockLogger.info).toHaveBeenCalledWith('Price check completed successfully');
        });
    });

    describe('Loading Progress Edge Cases', () => {
        it('should update loading progress with fallback selectors', () => {
            // Remove the standard elements and add fallback ones
            document.body.innerHTML = `
                <div class="progress-bar" style="width: 0%"></div>
                <div class="loading-text">Loading...</div>
            `;
            
            app.updateLoadingProgress(75, 'Processing data...');
            
            const progressBar = document.querySelector('.progress-bar');
            const loadingText = document.querySelector('.loading-text');
            
            expect(progressBar.style.width).toBe('75%');
            expect(loadingText.textContent).toBe('Processing data...');
            expect(mockLogger.debug).toHaveBeenCalledWith('Loading progress: 75% - Processing data...');
        });

        it('should show app with fallback selectors', () => {
            document.body.innerHTML = `
                <div class="loading-screen">Loading...</div>
                <div id="app" class="hidden">App Content</div>
            `;
            
            app.showApp();
            
            const loadingScreen = document.querySelector('.loading-screen');
            const mainApp = document.querySelector('#app');
            
            expect(loadingScreen.classList.contains('hidden')).toBe(true);
            expect(mainApp.classList.contains('hidden')).toBe(false);
            expect(mockLogger.info).toHaveBeenCalledWith('App displayed via showApp method');
        });
    });

    describe('Constructor and Initialization Scenarios', () => {
        it('should auto-initialize when skipInitialization is false', async () => {
            const initSpy = vi.spyOn(YGORipperApp.prototype, 'initialize');
            
            new YGORipperApp({ skipInitialization: false });
            
            expect(initSpy).toHaveBeenCalled();
        });

        it('should auto-initialize when no options provided', () => {
            const initSpy = vi.spyOn(YGORipperApp.prototype, 'initialize');
            
            new YGORipperApp();
            
            expect(initSpy).toHaveBeenCalled();
        });

        it('should return existing initialization promise when already initializing', async () => {
            const promise1 = app.initialize();
            const promise2 = app.initialize();
            
            expect(promise2).toBe(promise1);
            // Also check that both are the same as the stored promise
            expect(app.initPromise).toBe(promise1);
        });
    });

    describe('Application Info and Metadata', () => {
        it('should get application info with component status', () => {
            app.isInitialized = true;
            app.currentTab = 'pack-ripper';
            app.voiceEngine = { isAvailable: () => true };
            app.sessionManager = {};
            app.priceChecker = {};
            app.uiManager = {};
            
            const info = app.getInfo();
            
            expect(info).toEqual({
                name: 'YGO Ripper UI v2',
                version: '2.1.0',
                isInitialized: true,
                currentTab: 'pack-ripper',
                components: {
                    voiceEngine: true,
                    sessionManager: true,
                    priceChecker: true,
                    uiManager: true
                }
            });
        });

        it('should handle application close errors gracefully', async () => {
            const saveError = new Error('Save failed');
            
            app.settings = { sessionAutoSave: true };
            app.sessionManager = {
                isSessionActive: vi.fn().mockReturnValue(true),
                saveSession: vi.fn().mockRejectedValue(saveError)
            };
            app.saveSettings = vi.fn().mockRejectedValue(new Error('Settings save failed'));
            app.voiceEngine = {
                isListening: vi.fn().mockReturnValue(true),
                stopListening: vi.fn()
            };
            
            await app.handleAppClose();
            
            expect(mockLogger.info).toHaveBeenCalledWith('Application closing...');
            expect(mockLogger.error).toHaveBeenCalledWith('Error during application close:', expect.any(Error));
        });
    });
});