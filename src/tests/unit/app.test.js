/**
 * Application (app.js) Unit Tests
 * Comprehensive test coverage for the main application controller
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Create a global mock logger instance that will be used by all classes
const mockLogger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

// Mock all external dependencies before importing
vi.mock('../../js/voice/VoiceEngine.js', () => ({
  VoiceEngine: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(true),
    isAvailable: vi.fn().mockReturnValue(true),
    isListening: vi.fn().mockReturnValue(false),
    startListening: vi.fn().mockResolvedValue(true),
    stopListening: vi.fn(),
    testRecognition: vi.fn().mockResolvedValue('test result'),
    updateConfig: vi.fn(),
    onResult: vi.fn(),
    onStatusChange: vi.fn(),
    onError: vi.fn(),
    isInitialized: true
  }))
}));

vi.mock('../../js/voice/PermissionManager.js', () => ({
  PermissionManager: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(true),
    requestMicrophone: vi.fn().mockResolvedValue({ state: 'granted' })
  }))
}));

vi.mock('../../js/session/SessionManager.js', () => ({
  SessionManager: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(true),
    loadCardSets: vi.fn().mockResolvedValue(true),
    loadLastSession: vi.fn().mockResolvedValue(true),
    getCurrentSessionInfo: vi.fn().mockReturnValue({ active: false }),
    updateSettings: vi.fn(),
    startSession: vi.fn().mockResolvedValue(true),
    stopSession: vi.fn(),
    clearSession: vi.fn(),
    saveSession: vi.fn().mockResolvedValue(true),
    addCard: vi.fn().mockResolvedValue(true),
    removeCard: vi.fn().mockReturnValue({ name: 'Test Card' }),
    adjustCardQuantity: vi.fn().mockReturnValue({ quantity: 2 }),
    processVoiceInput: vi.fn().mockResolvedValue([]),
    generateExportFile: vi.fn().mockResolvedValue({
      filename: 'test.json',
      url: 'blob:test',
      cleanup: vi.fn()
    }),
    importSession: vi.fn().mockResolvedValue(true),
    getCard: vi.fn().mockReturnValue({ name: 'Test Card', cardNumber: '123', rarity: 'Ultra Rare' }),
    refreshCardPricing: vi.fn().mockResolvedValue({ name: 'Test Card' }),
    updateCardPricing: vi.fn().mockResolvedValue(true),
    refreshAllCardsPricing: vi.fn().mockResolvedValue([]),
    isSessionActive: vi.fn().mockReturnValue(true),
    switchSet: vi.fn().mockResolvedValue(true),
    addEventListener: vi.fn(),
    getImportedCardsInfo: vi.fn().mockReturnValue({ hasImportedCards: false }),
    onCardUpdated: vi.fn(),
    onSetSwitched: vi.fn()
  }))
}));

vi.mock('../../js/price/PriceChecker.js', () => ({
  PriceChecker: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(true),
    checkPrice: vi.fn().mockResolvedValue({ success: true, price: 10.99 })
  }))
}));

vi.mock('../../js/ui/UIManager.js', () => ({
  UIManager: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(true),
    showToast: vi.fn(),
    setLoading: vi.fn(),
    displayPriceResults: vi.fn(),
    updateSessionInfo: vi.fn(),
    updateVoiceStatus: vi.fn(),
    showSettings: vi.fn(),
    closeModal: vi.fn(),
    showModal: vi.fn(),
    clearSessionDisplay: vi.fn(),
    updateConnectionStatus: vi.fn(),
    updateCardDisplay: vi.fn(),
    updateCardSets: vi.fn(),
    onTabChange: vi.fn(),
    onPriceCheck: vi.fn(),
    onSessionStart: vi.fn(),
    onSessionStop: vi.fn(),
    onSessionClear: vi.fn(),
    onSessionExport: vi.fn(),
    onSessionImport: vi.fn(),
    onVoiceStart: vi.fn(),
    onVoiceStop: vi.fn(),
    onVoiceTest: vi.fn(),
    onQuantityAdjust: vi.fn(),
    onCardRemove: vi.fn(),
    onPricingRefresh: vi.fn(),
    onBulkPricingRefresh: vi.fn(),
    onSettingsSave: vi.fn(),
    onSettingsShow: vi.fn(),
    onSetSwitched: vi.fn(),
    elements: {
      modalOverlay: {
        innerHTML: '',
        appendChild: vi.fn(),
        classList: {
          remove: vi.fn(),
          add: vi.fn()
        }
      }
    }
  }))
}));

// Mock Logger to return our global mock instance
vi.mock('../../js/utils/Logger.js', () => ({
  Logger: vi.fn().mockImplementation(() => mockLogger)
}));

vi.mock('../../js/utils/Storage.js', () => ({
  Storage: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(true),
    get: vi.fn().mockResolvedValue({}),
    set: vi.fn().mockResolvedValue(true),
    remove: vi.fn().mockResolvedValue(true),
    clear: vi.fn().mockResolvedValue(true)
  }))
}));

// Import the class after mocking
import YGORipperApp from '../../js/app.js';

describe('YGORipperApp', () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Clear the logger mock calls
    mockLogger.info.mockClear();
    mockLogger.debug.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.error.mockClear();
    
    // Mock DOM elements
    global.document = {
      getElementById: vi.fn((id) => {
        if (id === 'loading-screen') {
          return {
            classList: {
              add: vi.fn(),
              remove: vi.fn(),
              contains: vi.fn().mockReturnValue(false)
            }
          };
        }
        if (id === 'app') {
          return {
            classList: {
              add: vi.fn(),
              remove: vi.fn(),
              contains: vi.fn().mockReturnValue(true)
            }
          };
        }
        if (id === 'loading-progress') {
          return {
            style: { width: '0%' }
          };
        }
        return null;
      }),
      querySelector: vi.fn((selector) => {
        if (selector === '.loading-text') {
          return {
            textContent: 'Loading...',
            style: { color: '' }
          };
        }
        if (selector === '.loading-progress') {
          return {
            style: { width: '0%' }
          };
        }
        if (selector === '.loading-screen') {
          return {
            classList: {
              add: vi.fn(),
              remove: vi.fn()
            }
          };
        }
        if (selector === '#app') {
          return {
            classList: {
              add: vi.fn(),
              remove: vi.fn()
            }
          };
        }
        return null;
      }),
      createElement: vi.fn(() => ({
        click: vi.fn(),
        appendChild: vi.fn(),
        addEventListener: vi.fn(),
        innerHTML: '',
        className: '',
        querySelectorAll: vi.fn(() => []),
        querySelector: vi.fn()
      })),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn()
      },
      addEventListener: vi.fn(),
      documentElement: {
        setAttribute: vi.fn()
      }
    };

    global.window = {
      addEventListener: vi.fn(),
      ygoApp: null,
      confirm: vi.fn().mockReturnValue(true)
    };

    global.confirm = vi.fn().mockReturnValue(true);
    
    // Create app instance - this will trigger constructor but skip initialization
    app = new YGORipperApp({ skipInitialization: true });
    
    // Override the logger with our mock after instantiation
    app.logger = mockLogger;
    
    // Override all components with proper mocks to ensure methods are accessible
    app.storage = {
      initialize: vi.fn().mockResolvedValue(true),
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(true),
      remove: vi.fn().mockResolvedValue(true),
      clear: vi.fn().mockResolvedValue(true)
    };
    
    app.uiManager = {
      initialize: vi.fn().mockResolvedValue(true),
      showToast: vi.fn(),
      setLoading: vi.fn(),
      displayPriceResults: vi.fn(),
      updateSessionInfo: vi.fn(),
      updateVoiceStatus: vi.fn(),
      showSettings: vi.fn(),
      closeModal: vi.fn(),
      showModal: vi.fn(),
      clearSessionDisplay: vi.fn(),
      updateConnectionStatus: vi.fn(),
      updateCardDisplay: vi.fn(),
      updateCardSets: vi.fn(),
      onTabChange: vi.fn(),
      onPriceCheck: vi.fn(),
      onSessionStart: vi.fn(),
      onSessionStop: vi.fn(),
      onSessionClear: vi.fn(),
      onSessionExport: vi.fn(),
      onSessionImport: vi.fn(),
      onVoiceStart: vi.fn(),
      onVoiceStop: vi.fn(),
      onVoiceTest: vi.fn(),
      onQuantityAdjust: vi.fn(),
      onCardRemove: vi.fn(),
      onPricingRefresh: vi.fn(),
      onBulkPricingRefresh: vi.fn(),
      onSettingsSave: vi.fn(),
      onSettingsShow: vi.fn(),
      onSetSwitched: vi.fn(),
      elements: {
        modalOverlay: {
          innerHTML: '',
          appendChild: vi.fn(),
          classList: { remove: vi.fn(), add: vi.fn() }
        }
      }
    };
    
    app.sessionManager = {
      initialize: vi.fn().mockResolvedValue(true),
      loadCardSets: vi.fn().mockResolvedValue(true),
      loadLastSession: vi.fn().mockResolvedValue(true),
      getCurrentSessionInfo: vi.fn().mockReturnValue({ active: false }),
      updateSettings: vi.fn(),
      startSession: vi.fn().mockResolvedValue(true),
      stopSession: vi.fn(),
      clearSession: vi.fn(),
      saveSession: vi.fn().mockResolvedValue(true),
      addCard: vi.fn().mockResolvedValue(true),
      removeCard: vi.fn().mockReturnValue({ name: 'Test Card' }),
      adjustCardQuantity: vi.fn().mockReturnValue({ name: 'Test Card', quantity: 2 }),
      processVoiceInput: vi.fn().mockResolvedValue([]),
      generateExportFile: vi.fn().mockResolvedValue({
        filename: 'test.json',
        url: 'blob:test',
        cleanup: vi.fn()
      }),
      importSession: vi.fn().mockResolvedValue(true),
      getCard: vi.fn().mockReturnValue({ name: 'Test Card', cardNumber: '123', rarity: 'Ultra Rare' }),
      refreshCardPricing: vi.fn().mockResolvedValue({ name: 'Test Card' }),
      updateCardPricing: vi.fn().mockResolvedValue(true),
      refreshAllCardsPricing: vi.fn().mockResolvedValue([]),
      isSessionActive: vi.fn().mockReturnValue(true),
      switchSet: vi.fn().mockResolvedValue(true),
      addEventListener: vi.fn(),
      getImportedCardsInfo: vi.fn().mockReturnValue({ hasImportedCards: false }),
      onCardUpdated: vi.fn(),
      onSetSwitched: vi.fn()
    };
    
    app.priceChecker = {
      initialize: vi.fn().mockResolvedValue(true),
      checkPrice: vi.fn().mockResolvedValue({ success: true, price: 10.99 })
    };
    
    app.permissionManager = {
      initialize: vi.fn().mockResolvedValue(true),
      requestMicrophone: vi.fn().mockResolvedValue({ state: 'granted' })
    };
    
    app.voiceEngine = {
      initialize: vi.fn().mockResolvedValue(true),
      isAvailable: vi.fn().mockReturnValue(true),
      isListening: vi.fn().mockReturnValue(false),
      startListening: vi.fn().mockResolvedValue(true),
      stopListening: vi.fn(),
      testRecognition: vi.fn().mockResolvedValue('test result'),
      updateConfig: vi.fn(),
      onResult: vi.fn(),
      onStatusChange: vi.fn(),
      onError: vi.fn(),
      isInitialized: true
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Application Initialization', () => {
    it('should initialize with default values', () => {
      expect(app.version).toBe('2.1.0');
      expect(app.name).toBe('YGO Ripper UI v2');
      expect(app.isInitialized).toBe(false);
      expect(app.currentTab).toBe('price-checker');
      expect(app.settings).toEqual({});
    });

    it('should initialize components correctly', () => {
      expect(app.logger).toBeDefined();
      expect(app.storage).toBeDefined();
      expect(app.permissionManager).toBeDefined();
      expect(app.sessionManager).toBeDefined();
      expect(app.priceChecker).toBeDefined();
      expect(app.uiManager).toBeDefined();
    });

    it('should perform full initialization successfully', async () => {
      await app.initialize();
      
      expect(app.isInitialized).toBe(true);
      expect(app.storage.initialize).toHaveBeenCalled();
      expect(app.uiManager.initialize).toHaveBeenCalled();
      expect(app.permissionManager.initialize).toHaveBeenCalled();
      expect(app.sessionManager.initialize).toHaveBeenCalled();
      expect(app.priceChecker.initialize).toHaveBeenCalled();
    });

    it('should handle initialization errors', async () => {
      app.storage.initialize.mockRejectedValue(new Error('Storage error'));
      
      await expect(app.initialize()).rejects.toThrow('Storage error');
    });
  });

  describe('Settings Management', () => {
    beforeEach(async () => {
      await app.initialize();
    });

    it('should load settings successfully', async () => {
      const mockSettings = {
        theme: 'dark',
        voiceTimeout: 5000,
        autoConfirm: true
      };
      
      app.storage.get.mockResolvedValue(mockSettings);
      
      await app.loadSettings();
      
      expect(app.settings.theme).toBe('dark');
      expect(app.settings.voiceTimeout).toBe(5000);
      expect(app.settings.autoConfirm).toBe(true);
    });

    it('should use default settings when none exist', async () => {
      app.storage.get.mockResolvedValue(null);
      
      await app.loadSettings();
      
      expect(app.settings.theme).toBe('dark');
      expect(app.settings.sessionAutoSave).toBe(true);
      expect(app.settings.autoConfirm).toBe(false);
    });

    it('should save settings successfully', async () => {
      app.settings = { theme: 'light' };
      
      await app.saveSettings();
      
      expect(app.storage.set).toHaveBeenCalledWith('settings', app.settings);
    });

    it('should handle settings save from UI', async () => {
      const newSettings = {
        theme: 'light',
        voiceTimeout: 8000
      };
      
      await app.handleSettingsSave(newSettings);
      
      expect(app.settings.theme).toBe('light');
      expect(app.settings.voiceTimeout).toBe(8000);
      expect(app.storage.set).toHaveBeenCalled();
      expect(app.uiManager.showToast).toHaveBeenCalledWith('Settings saved successfully', 'success');
    });
  });

  describe('Session Management', () => {
    beforeEach(async () => {
      await app.initialize();
    });

    it('should start session successfully', async () => {
      const setId = 'LOB';
      
      await app.handleSessionStart(setId);
      
      expect(app.sessionManager.startSession).toHaveBeenCalledWith(setId);
      expect(app.uiManager.updateSessionInfo).toHaveBeenCalled();
      expect(app.uiManager.showToast).toHaveBeenCalledWith('Session started successfully', 'success');
    });

    it('should stop session successfully', () => {
      app.voiceEngine.isListening.mockReturnValue(true);
      
      app.handleSessionStop();
      
      expect(app.voiceEngine.stopListening).toHaveBeenCalled();
      expect(app.sessionManager.stopSession).toHaveBeenCalled();
      expect(app.uiManager.showToast).toHaveBeenCalledWith('Session stopped', 'info');
    });

    it('should clear session with confirmation', () => {
      app.handleSessionClear();
      
      expect(app.sessionManager.clearSession).toHaveBeenCalled();
      expect(app.uiManager.showToast).toHaveBeenCalledWith('Session cleared', 'info');
    });
  });

  describe('Voice Recognition', () => {
    beforeEach(async () => {
      await app.initialize();
    });

    it('should start voice recognition successfully', async () => {
      await app.handleVoiceStart();
      
      expect(app.voiceEngine.startListening).toHaveBeenCalled();
    });

    it('should stop voice recognition successfully', () => {
      app.voiceEngine.isListening.mockReturnValue(true);
      
      app.handleVoiceStop();
      
      expect(app.voiceEngine.stopListening).toHaveBeenCalled();
    });

    it('should test voice recognition successfully', async () => {
      await app.handleVoiceTest();
      
      expect(app.voiceEngine.testRecognition).toHaveBeenCalled();
      expect(app.uiManager.showToast).toHaveBeenCalledWith(
        'Voice test result: "test result"',
        'info'
      );
    });

    it('should handle voice result processing', async () => {
      const result = { transcript: 'blue eyes white dragon' };
      const mockCards = [
        { name: 'Blue-Eyes White Dragon', confidence: 0.95 }
      ];
      
      app.sessionManager.processVoiceInput.mockResolvedValue(mockCards);
      app.settings.autoConfirm = true;
      app.settings.autoConfirmThreshold = 85; // 85% threshold
      
      await app.handleVoiceResult(result);
      
      expect(app.sessionManager.processVoiceInput).toHaveBeenCalledWith(result.transcript);
      expect(app.sessionManager.addCard).toHaveBeenCalledWith({
        ...mockCards[0],
        quantity: 1
      });
    });
  });

  describe('Card Management', () => {
    beforeEach(async () => {
      await app.initialize();
    });

    it('should adjust card quantity successfully', async () => {
      const cardId = 'card1';
      const adjustment = 1;
      
      await app.handleQuantityAdjust(cardId, adjustment);
      
      expect(app.sessionManager.adjustCardQuantity).toHaveBeenCalledWith(cardId, adjustment);
      expect(app.uiManager.updateSessionInfo).toHaveBeenCalled();
    });

    it('should remove card successfully', async () => {
      const cardId = 'card1';
      
      await app.handleCardRemove(cardId);
      
      expect(app.sessionManager.removeCard).toHaveBeenCalledWith(cardId);
      expect(app.uiManager.showToast).toHaveBeenCalledWith('Removed: Test Card', 'success');
    });

    it('should refresh card pricing successfully', async () => {
      const cardId = 'card1';
      
      await app.handlePricingRefresh(cardId);
      
      expect(app.sessionManager.refreshCardPricing).toHaveBeenCalledWith(cardId);
      expect(app.uiManager.showToast).toHaveBeenCalledWith('Pricing refreshed: Test Card', 'success');
    });
  });

  describe('Application Lifecycle', () => {
    beforeEach(async () => {
      await app.initialize();
    });

    it('should handle app close gracefully', async () => {
      app.settings.sessionAutoSave = true;
      app.sessionManager.isSessionActive.mockReturnValue(true);
      app.voiceEngine.isListening.mockReturnValue(true);
      
      await app.handleAppClose();
      
      expect(app.sessionManager.saveSession).toHaveBeenCalled();
      expect(app.storage.set).toHaveBeenCalled();
      expect(app.voiceEngine.stopListening).toHaveBeenCalled();
    });

    it('should get application info', () => {
      const info = app.getInfo();
      
      expect(info.name).toBe('YGO Ripper UI v2');
      expect(info.version).toBe('2.1.0');
      expect(info.components.voiceEngine).toBe(true);
      expect(info.components.sessionManager).toBe(true);
    });
  });

  describe('Loading and UI Updates', () => {
    it('should update loading progress', () => {
      const progressBar = { style: { width: '0%' } };
      const loadingText = { textContent: 'Loading...' };
      
      global.document.getElementById.mockImplementation((id) => {
        if (id === 'loading-progress') return progressBar;
        return null;
      });
      
      global.document.querySelector.mockImplementation((selector) => {
        if (selector === '.loading-text') return loadingText;
        return null;
      });
      
      app.updateLoadingProgress(50, 'Loading test...');
      
      expect(progressBar.style.width).toBe('50%');
      expect(loadingText.textContent).toBe('Loading test...');
    });

    it('should show app after initialization', () => {
      const loadingScreen = { classList: { add: vi.fn(), remove: vi.fn() } };
      const appElement = { classList: { add: vi.fn(), remove: vi.fn() } };
      
      global.document.getElementById.mockImplementation((id) => {
        if (id === 'loading-screen') return loadingScreen;
        if (id === 'app') return appElement;
        return null;
      });
      
      app.showApp();
      
      expect(loadingScreen.classList.add).toHaveBeenCalledWith('hidden');
      expect(appElement.classList.remove).toHaveBeenCalledWith('hidden');
    });
  });

  describe('Error Handling', () => {
    it('should handle voice errors appropriately', () => {
      const error = { type: 'permission-denied', message: 'Access denied' };
      
      app.handleVoiceError(error);
      
      expect(app.uiManager.showToast).toHaveBeenCalledWith(
        'Microphone access denied. Please enable microphone permissions in your browser settings.',
        'error'
      );
    });

    it('should handle initialization errors gracefully', async () => {
      app.uiManager.initialize.mockRejectedValue(new Error('UI Error'));
      
      await expect(app.initialize()).rejects.toThrow('UI Error');
    });

    // NEW ERROR HANDLING TESTS FOR UNCOVERED PATHS
    it('should handle safe settings loading errors and use defaults', async () => {
      app.storage.get.mockRejectedValue(new Error('Settings load error'));
      
      await app.safeLoadSettings();
      
      expect(app.logger.warn).toHaveBeenCalledWith('Failed to load settings, using defaults:', expect.any(Error));
      expect(app.settings.theme).toBe('dark'); // Default value
    });

    it('should handle safe storage initialization errors with fallback', async () => {
      app.storage.initialize.mockRejectedValue(new Error('Storage initialization failed'));
      
      await expect(app.safeInitializeStorage()).rejects.toThrow('Storage error - using fallback storage');
      
      expect(app.logger.error).toHaveBeenCalledWith('Storage initialization failed:', expect.any(Error));
      expect(app.uiManager.showToast).toHaveBeenCalledWith('Local storage limited. Some features may not work offline.', 'warning');
    });

    it('should handle safe UI initialization errors and create minimal UI', async () => {
      app.uiManager.initialize.mockRejectedValue(new Error('UI initialization failed'));
      
      await expect(app.safeInitializeUI()).rejects.toThrow('UI Error');
      
      expect(app.logger.error).toHaveBeenCalledWith('UI initialization failed:', expect.any(Error));
    });

    it('should handle safe permission initialization errors', async () => {
      app.permissionManager.initialize.mockRejectedValue(new Error('Permission error'));
      
      await app.safeInitializePermissions();
      
      expect(app.logger.warn).toHaveBeenCalledWith('Permission manager initialization failed:', expect.any(Error));
      expect(app.uiManager.showToast).toHaveBeenCalledWith('Microphone permissions may be limited. Voice features might not work.', 'warning');
    });

    it('should handle safe voice initialization errors and continue without voice', async () => {
      app.voiceEngine.initialize.mockRejectedValue(new Error('Voice initialization failed'));
      
      await app.safeInitializeVoice();
      
      expect(app.logger.warn).toHaveBeenCalledWith('Voice engine initialization failed:', expect.any(Error));
      expect(app.voiceEngine).toBe(null);
      expect(app.uiManager.showToast).toHaveBeenCalledWith('Voice recognition not available. You can still type card names manually.', 'info');
    });

    it('should handle safe session initialization errors with retry', async () => {
      app.sessionManager.initialize
        .mockRejectedValueOnce(new Error('Session error'))
        .mockRejectedValueOnce(new Error('Retry failed'));
      
      await expect(app.safeInitializeSession()).rejects.toThrow('Session management failed - core functionality unavailable');
      
      expect(app.logger.error).toHaveBeenCalledWith('Session manager initialization failed:', expect.any(Error));
      expect(app.logger.error).toHaveBeenCalledWith('Session manager retry failed:', expect.any(Error));
    });

    it('should handle safe price checker initialization errors', async () => {
      app.priceChecker.initialize.mockRejectedValue(new Error('Price checker error'));
      
      await app.safeInitializePriceChecker();
      
      expect(app.logger.warn).toHaveBeenCalledWith('Price checker initialization failed:', expect.any(Error));
      expect(app.priceChecker).toBe(null);
      expect(app.uiManager.showToast).toHaveBeenCalledWith('Price checking service unavailable. Prices will not be shown.', 'warning');
    });

    it('should handle safe event handler setup errors', () => {
      // Mock setupEventHandlers to throw an error
      app.setupEventHandlers = vi.fn().mockImplementation(() => {
        throw new Error('Event handler error');
      });
      
      app.safeSetupEventHandlers();
      
      expect(app.logger.error).toHaveBeenCalledWith('Event handler setup failed:', expect.any(Error));
      expect(app.uiManager.showToast).toHaveBeenCalledWith('Some interface features may not respond correctly.', 'warning');
    });

    it('should handle safe initial data loading errors', async () => {
      app.loadInitialData = vi.fn().mockRejectedValueOnce(new Error('Data load error'));
      app.loadEssentialData = vi.fn().mockResolvedValueOnce(); // Make this succeed since the method exists but doesn't throw
      
      await app.safeLoadInitialData();
      
      expect(app.logger.warn).toHaveBeenCalledWith('Initial data loading failed:', expect.any(Error));
      expect(app.uiManager.showToast).toHaveBeenCalledWith('Some data could not be loaded. Functionality may be limited.', 'warning');
    });

    it('should handle application close errors gracefully', async () => {
      app.settings.sessionAutoSave = true;
      app.sessionManager.isSessionActive.mockReturnValue(true);
      app.sessionManager.saveSession.mockRejectedValue(new Error('Save error'));
      
      await app.handleAppClose();
      
      expect(app.logger.error).toHaveBeenCalledWith('Error during application close:', expect.any(Error));
    });
  });

  describe('Constructor and Initialization Scenarios', () => {
    it('should auto-initialize when skipInitialization is false', () => {
      // Test the constructor branch where initialization is NOT skipped
      const autoInitSpy = vi.fn();
      
      // Mock the initialize method before creating the app
      const originalApp = YGORipperApp;
      YGORipperApp.prototype.initialize = autoInitSpy;
      
      const autoInitApp = new YGORipperApp({ skipInitialization: false });
      
      expect(autoInitSpy).toHaveBeenCalled();
      
      // Restore original prototype
      YGORipperApp.prototype.initialize = originalApp.prototype.initialize;
    });

    it('should auto-initialize when no options provided', () => {
      const autoInitSpy = vi.fn();
      
      // Mock the initialize method before creating the app
      const originalApp = YGORipperApp;
      YGORipperApp.prototype.initialize = autoInitSpy;
      
      const autoInitApp = new YGORipperApp();
      
      expect(autoInitSpy).toHaveBeenCalled();
      
      // Restore original prototype
      YGORipperApp.prototype.initialize = originalApp.prototype.initialize;
    });

    it('should return existing initialization promise when already initializing', async () => {
      const firstPromise = app.initialize();
      const secondPromise = app.initialize();
      
      expect(firstPromise).toBe(secondPromise);
      
      await firstPromise;
    });
  });

  describe('Fallback Storage and UI', () => {
    it('should initialize fallback storage when regular storage fails', async () => {
      await app.initializeFallbackStorage();
      
      expect(app.storage).toBeDefined();
      expect(typeof app.storage.get).toBe('function');
      expect(typeof app.storage.set).toBe('function');
      expect(typeof app.storage.remove).toBe('function');
      expect(typeof app.storage.clear).toBe('function');
      expect(app.logger.info).toHaveBeenCalledWith('Initializing fallback storage');
    });

    it('should create minimal UI for critical errors', () => {
      const mockDiv = {
        innerHTML: '',
        style: {}
      };
      global.document.createElement.mockReturnValue(mockDiv);
      
      app.createMinimalUI();
      
      expect(app.logger.info).toHaveBeenCalledWith('Creating minimal UI for error display');
      expect(document.createElement).toHaveBeenCalledWith('div');
      expect(document.body.appendChild).toHaveBeenCalledWith(mockDiv);
    });

    it('should setup minimal event handlers for critical functions', () => {
      app.setupMinimalEventHandlers();
      
      expect(app.logger.info).toHaveBeenCalledWith('Setting up minimal event handlers');
      expect(global.window.addEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    });

    it('should load essential data only in minimal mode', async () => {
      await app.loadEssentialData();
      
      expect(app.logger.info).toHaveBeenCalledWith('Loading essential data only');
    });
  });

  describe('Loading Progress Edge Cases', () => {
    it('should update loading progress with fallback selectors', () => {
      // Test the fallback branch for loading progress
      global.document.getElementById.mockImplementation((id) => {
        if (id === 'loading-progress') return null; // Primary fails
        return null;
      });
      
      const fallbackProgressBar = { style: { width: '0%' } };
      global.document.querySelector.mockImplementation((selector) => {
        if (selector === '.progress-bar') return fallbackProgressBar; // Fallback succeeds
        if (selector === '.loading-text') return { textContent: 'Loading...' };
        return null;
      });
      
      app.updateLoadingProgress(75, 'Loading fallback test...');
      
      expect(fallbackProgressBar.style.width).toBe('75%');
    });

    it('should show app with fallback selectors', () => {
      // Test the fallback branch for showApp
      global.document.getElementById.mockImplementation((id) => {
        return null; // Primary selectors fail
      });
      
      const fallbackLoadingScreen = { classList: { add: vi.fn(), remove: vi.fn() } };
      const fallbackAppElement = { classList: { add: vi.fn(), remove: vi.fn() } };
      
      global.document.querySelector.mockImplementation((selector) => {
        if (selector === '.loading-screen') return fallbackLoadingScreen;
        if (selector === '#app') return fallbackAppElement;
        return null;
      });
      
      app.showApp();
      
      expect(fallbackLoadingScreen.classList.add).toHaveBeenCalledWith('hidden');
      expect(fallbackAppElement.classList.remove).toHaveBeenCalledWith('hidden');
    });
  });

  describe('Event Handler Coverage', () => {
    beforeEach(async () => {
      await app.initialize();
    });

    it('should handle sets filtered event', () => {
      const mockData = { filteredSets: ['LOB', 'MRD'] };
      
      app.handleSetsFiltered(mockData);
      
      // Verify the handler logs the event
      expect(app.logger.info).toHaveBeenCalledWith('Card sets filtered:', mockData);
    });

    it('should handle pack ripper tab activation', () => {
      app.currentTab = 'pack-ripper';
      
      app.handlePackRipperTabActivated();
      
      expect(app.logger.debug).toHaveBeenCalledWith('Pack ripper tab activated');
    });

    it('should handle session start from UI event', async () => {
      // Test the actual method instead of trying to access mock calls
      await app.handleSessionStart('LOB');
      
      expect(app.sessionManager.startSession).toHaveBeenCalledWith('LOB');
    });

    it('should handle session stop from UI event', () => {
      // Test the actual method instead of trying to access mock calls
      app.handleSessionStop();
      
      expect(app.sessionManager.stopSession).toHaveBeenCalled();
    });

    it('should handle price check from UI event', async () => {
      // Test the actual method instead of trying to access mock calls
      const formData = { cardName: 'Test Card' };
      
      await app.handlePriceCheck(formData);
      
      expect(app.priceChecker.checkPrice).toHaveBeenCalledWith(formData);
    });
  });

  describe('Additional Coverage Tests for Threshold', () => {
    test('should handle sets loaded with extra parameters', async () => {
        const app = new YGORipperApp({ skipInitialization: true });
        const mockData = { sets: [{ id: 'test', name: 'Test Set' }] };
        
        // Properly setup logger and uiManager
        app.logger = mockLogger;
        app.uiManager = {
            updateCardSets: vi.fn()
        };
        
        // Test the specific method signature with extra parameters
        app.handleSetsLoaded(mockData, undefined, 2);
        
        expect(app.uiManager.updateCardSets).toHaveBeenCalledWith(
            mockData.sets, 
            undefined, 
            2
        );
    });

    test('should handle voice error with network-error type', async () => {
        const app = new YGORipperApp({ skipInitialization: true });
        app.logger = mockLogger;
        app.uiManager = {
            updateVoiceStatus: vi.fn(),
            showToast: vi.fn()
        };
        
        const networkError = {
            type: 'network-error',
            message: 'Network connection required'
        };
        
        app.handleVoiceError(networkError);
        
        expect(app.uiManager.showToast).toHaveBeenCalledWith(
            'Network connection is required for voice recognition. Please check your internet connection.',
            'error'
        );
        expect(app.uiManager.updateVoiceStatus).toHaveBeenCalledWith('error');
    });

    test('should handle voice error with not-supported type', async () => {
        const app = new YGORipperApp({ skipInitialization: true });
        app.logger = mockLogger;
        app.uiManager = {
            updateVoiceStatus: vi.fn(),
            showToast: vi.fn()
        };
        
        const notSupportedError = {
            type: 'not-supported',
            message: 'Voice recognition not supported'
        };
        
        app.handleVoiceError(notSupportedError);
        
        expect(app.uiManager.showToast).toHaveBeenCalledWith(
            'Voice recognition is not supported in this browser. Please use Chrome, Edge, or Safari.',
            'error'
        );
    });

    test('should handle voice error with no-speech type', async () => {
        const app = new YGORipperApp({ skipInitialization: true });
        app.logger = mockLogger;
        app.uiManager = {
            updateVoiceStatus: vi.fn(),
            showToast: vi.fn()
        };
        
        const noSpeechError = {
            type: 'no-speech',
            message: 'No speech detected'
        };
        
        app.handleVoiceError(noSpeechError);
        
        expect(app.uiManager.showToast).toHaveBeenCalledWith(
            'No speech detected. Please try speaking louder and clearer.',
            'error'
        );
    });

    test('should handle price check error with timeout', async () => {
        const app = new YGORipperApp({ skipInitialization: true });
        app.logger = mockLogger;
        app.uiManager = {
            setLoading: vi.fn(),
            showToast: vi.fn()
        };
        
        const timeoutError = new Error('Price check timed out');
        const formData = { cardName: 'Test Card' };
        
        app.showPriceCheckError(timeoutError, formData);
        
        expect(app.uiManager.showToast).toHaveBeenCalledWith(
            'Price check failed: Price check timed out',
            'error'
        );
    });

    test('should handle showVoiceErrorRecovery with transcript', async () => {
        const app = new YGORipperApp({ skipInitialization: true });
        app.logger = { info: vi.fn() };
        app.offerManualCardInput = vi.fn();
        
        app.showVoiceErrorRecovery('Blue-Eyes White Dragon');
        
        expect(app.logger.info).toHaveBeenCalledWith(
            'Voice error recovery options:',
            expect.arrayContaining([
                { action: 'retry', label: 'Try Voice Again' },
                { action: 'manual', label: 'Type Card Name' }
            ])
        );
        expect(app.offerManualCardInput).toHaveBeenCalledWith('Blue-Eyes White Dragon');
    });

    test('should handle card addition fallback with minimal data', async () => {
        const app = new YGORipperApp({ skipInitialization: true });
        app.logger = mockLogger;
        app.sessionManager = {
            addCard: vi.fn()
                .mockRejectedValueOnce(new Error('Primary add failed'))
                .mockResolvedValueOnce(undefined)
        };
        app.showToast = vi.fn();
        
        const card = { name: 'Test Card', quantity: 2, rarity: 'Rare' };
        
        await app.safeAddCard(card);
        
        expect(app.sessionManager.addCard).toHaveBeenCalledTimes(2);
        expect(app.sessionManager.addCard).toHaveBeenLastCalledWith({
            name: 'Test Card',
            quantity: 2,
            rarity: 'Rare',
            id: expect.any(String)
        });
        expect(app.showToast).toHaveBeenCalledWith(
            'Added Test Card (some data may be missing)',
            'warning'
        );
    });

    test('should handle basic card name search fallback', async () => {
        const app = new YGORipperApp({ skipInitialization: true });
        app.logger = { info: vi.fn() };
        
        const result = await app.basicCardNameSearch('Blue-Eyes');
        
        expect(result).toEqual([]);
        expect(app.logger.info).toHaveBeenCalledWith('Using basic card name search fallback');
    });

    test('should handle voice input processing with complete fallback failure', async () => {
        const app = new YGORipperApp({ skipInitialization: true });
        app.logger = mockLogger;
        app.sessionManager = {
            processVoiceInput: vi.fn().mockRejectedValue(new Error('Processing failed'))
        };
        app.basicCardNameSearch = vi.fn().mockRejectedValue(new Error('Fallback failed'));
        
        const result = await app.safeProcessVoiceInput('test transcript');
        
        expect(result).toEqual([]);
        expect(app.logger.error).toHaveBeenCalledWith('Fallback card search failed:', expect.any(Error));
    });

    test('should handle price check with offline network status', async () => {
        const app = new YGORipperApp({ skipInitialization: true });
        app.logger = mockLogger;
        app.priceChecker = { checkPrice: vi.fn() };
        app.uiManager = { setLoading: vi.fn() };
        app.showPriceCheckError = vi.fn();
        
        // Mock navigator.onLine
        Object.defineProperty(navigator, 'onLine', {
            writable: true,
            value: false
        });
        
        await app.handlePriceCheck({ cardName: 'Test Card' });
        
        expect(app.showPriceCheckError).toHaveBeenCalledWith(
            expect.objectContaining({
                message: 'No internet connection available for price checking'
            }),
            { cardName: 'Test Card' }
        );
        
        // Restore navigator.onLine
        Object.defineProperty(navigator, 'onLine', {
            writable: true,
            value: true
        });
    });
  });
});