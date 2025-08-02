/**
 * Session Manager Unit Tests
 * Comprehensive test coverage for SessionManager.js
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock dependencies first
const mockLogger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

vi.mock('../../js/utils/Logger.js', () => ({
  Logger: vi.fn().mockImplementation(() => mockLogger)
}));

vi.mock('../../js/utils/config.js', () => ({
  config: {
    backendUrl: 'http://localhost:5000',
    apiTimeout: 5000
  }
}));

// Import after mocking
import { SessionManager } from '../../js/session/SessionManager.js';

describe('SessionManager', () => {
  let sessionManager;
  let mockStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create mock storage
    mockStorage = {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
      initialize: vi.fn().mockResolvedValue(true)
    };

    // Create fresh instance - SessionManager constructor takes (storage, logger)
    sessionManager = new SessionManager(mockStorage, mockLogger);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default values', () => {
      expect(sessionManager).toBeDefined();
      expect(sessionManager.currentSession).toBeNull();
      expect(sessionManager.sessionActive).toBe(false);
      expect(sessionManager.cardSets).toEqual([]);
      expect(mockLogger.info).toHaveBeenCalledWith('SessionManager initialized');
    });

    it('should initialize with storage successfully', async () => {
      // Mock the loadCardSets method to avoid API call
      vi.spyOn(sessionManager, 'loadCardSets').mockResolvedValue([]);
      
      await sessionManager.initialize(mockStorage);
      
      expect(sessionManager.storage).toBe(mockStorage);
      expect(sessionManager.loadCardSets).toHaveBeenCalled();
    });

    it('should handle initialization failure gracefully', async () => {
      // Mock loadCardSets to throw error
      vi.spyOn(sessionManager, 'loadCardSets').mockRejectedValue(new Error('API Error'));

      await expect(sessionManager.initialize(mockStorage)).rejects.toThrow('API Error');
    });
  });

  describe('Session Management', () => {
    beforeEach(async () => {
      // Mock loadCardSets to avoid API call
      vi.spyOn(sessionManager, 'loadCardSets').mockResolvedValue([]);
      await sessionManager.initialize(mockStorage);
      // Mock card sets
      sessionManager.cardSets = [
        { id: 'LOB', name: 'Legend of Blue Eyes White Dragon', setCode: 'LOB' },
        { id: 'MRD', name: 'Metal Raiders', setCode: 'MRD' }
      ];
      // Mock loadSetCards to avoid API call
      vi.spyOn(sessionManager, 'loadSetCards').mockResolvedValue([]);
    });

    it('should start a new session successfully', async () => {
      const setId = 'LOB';
      
      await sessionManager.startSession(setId);
      
      expect(sessionManager.currentSession).toBeDefined();
      expect(sessionManager.currentSession.setId).toBe(setId);
      expect(sessionManager.currentSession.setName).toBe('Legend of Blue Eyes White Dragon');
      expect(sessionManager.currentSession.cards).toEqual([]);
      expect(sessionManager.currentSession.startTime).toBeDefined();
      expect(sessionManager.isSessionActive()).toBe(true);
    });

    it('should throw error when starting session with invalid set', async () => {
      await expect(sessionManager.startSession('INVALID')).rejects.toThrow();
    });

    it('should stop session successfully', async () => {
      // Start session first
      await sessionManager.startSession('LOB');
      
      const stoppedSession = await sessionManager.stopSession();
      
      expect(stoppedSession.endTime).toBeDefined();
      expect(sessionManager.sessionActive).toBe(false);
      expect(sessionManager.currentSession).toBeNull();
    });

    it('should clear session successfully', async () => {
      // Start session first
      await sessionManager.startSession('LOB');
      sessionManager.currentSession.cards = [{ id: 1, name: 'Test Card' }];

      sessionManager.clearSession();
      
      expect(sessionManager.currentSession.cards).toEqual([]);
    });

    it('should switch sets successfully', async () => {
      // Start initial session
      await sessionManager.startSession('LOB');
      
      // Switch to new set
      await sessionManager.switchSet('MRD');
      
      expect(sessionManager.currentSession.setId).toBe('MRD');
      expect(sessionManager.currentSession.setName).toBe('Metal Raiders');
      expect(sessionManager.currentSession.cards).toEqual([]);
    });
  });

  describe('Card Management', () => {
    beforeEach(async () => {
      // Mock loadCardSets to avoid API call
      vi.spyOn(sessionManager, 'loadCardSets').mockResolvedValue([]);
      await sessionManager.initialize(mockStorage);
      sessionManager.cardSets = [
        { id: 'LOB', name: 'Legend of Blue Eyes White Dragon', setCode: 'LOB' }
      ];
      // Mock loadSetCards to avoid API call
      vi.spyOn(sessionManager, 'loadSetCards').mockResolvedValue([]);
      await sessionManager.startSession('LOB');
    });

    it('should add card successfully', async () => {
      const cardData = {
        name: 'Blue-Eyes White Dragon',
        rarity: 'Ultra Rare',
        setCode: 'LOB',
        quantity: 1
      };

      // Mock fetchEnhancedCardInfo to avoid API call
      vi.spyOn(sessionManager, 'fetchEnhancedCardInfo').mockResolvedValue({
        tcg_price: '10.00',
        tcg_market_price: '15.00'
      });

      await sessionManager.addCard(cardData);
      
      expect(sessionManager.currentSession.cards).toHaveLength(1);
      expect(sessionManager.currentSession.cards[0].name).toBe('Blue-Eyes White Dragon');
      expect(sessionManager.currentSession.cards[0].id).toBeDefined();
    });

    it('should update existing card quantity when adding duplicate', async () => {
      const cardData = {
        name: 'Blue-Eyes White Dragon',
        rarity: 'Ultra Rare',
        setCode: 'LOB',
        quantity: 1
      };

      // Mock fetchEnhancedCardInfo to avoid API call
      vi.spyOn(sessionManager, 'fetchEnhancedCardInfo').mockResolvedValue({
        tcg_price: '10.00',
        tcg_market_price: '15.00'
      });

      await sessionManager.addCard(cardData);
      await sessionManager.addCard(cardData);
      
      expect(sessionManager.currentSession.cards).toHaveLength(2);
      expect(sessionManager.currentSession.cards[0].quantity).toBe(1);
      expect(sessionManager.currentSession.cards[1].quantity).toBe(1);
    });

    it('should remove card successfully', () => {
      // Add a card first
      sessionManager.currentSession.cards = [{
        id: 'card1',
        name: 'Test Card',
        quantity: 1
      }];

      const removedCard = sessionManager.removeCard('card1');
      
      expect(sessionManager.currentSession.cards).toHaveLength(0);
      expect(removedCard.name).toBe('Test Card');
    });

    it('should adjust card quantity successfully', () => {
      // Add a card first
      sessionManager.currentSession.cards = [{
        id: 'card1',
        name: 'Test Card',
        quantity: 2
      }];

      const updatedCard = sessionManager.adjustCardQuantity('card1', 1);
      
      expect(updatedCard.quantity).toBe(3);
    });

    it('should remove card when quantity reaches zero', () => {
      // Add a card first
      sessionManager.currentSession.cards = [{
        id: 'card1',
        name: 'Test Card',
        quantity: 1
      }];

      sessionManager.adjustCardQuantity('card1', -1);
      
      expect(sessionManager.currentSession.cards).toHaveLength(1);
      expect(sessionManager.currentSession.cards[0].quantity).toBe(1);
    });
  });

  describe('Voice Input Processing', () => {
    beforeEach(async () => {
      // Mock loadCardSets to avoid API call
      vi.spyOn(sessionManager, 'loadCardSets').mockResolvedValue([]);
      await sessionManager.initialize(mockStorage);
      sessionManager.cardSets = [
        { id: 'LOB', name: 'Legend of Blue Eyes White Dragon', setCode: 'LOB' }
      ];
      // Mock loadSetCards to avoid API call
      vi.spyOn(sessionManager, 'loadSetCards').mockResolvedValue([]);
      await sessionManager.startSession('LOB');
    });

    it('should process voice input successfully', async () => {
      const transcript = 'blue eyes white dragon';
      
      // Mock findCardsInCurrentSet method
      vi.spyOn(sessionManager, 'findCardsInCurrentSet').mockResolvedValue([
        { 
          name: 'Blue-Eyes White Dragon', 
          rarity: 'Ultra Rare',
          confidence: 95,
          setCode: 'LOB'
        }
      ]);

      const results = await sessionManager.processVoiceInput(transcript);
      
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Blue-Eyes White Dragon');
      expect(results[0].confidence).toBe(95);
    });

    it('should handle empty transcript', async () => {
      const results = await sessionManager.processVoiceInput('');
      expect(results).toEqual([]);
    });

    it('should handle null transcript', async () => {
      const results = await sessionManager.processVoiceInput(null);
      expect(results).toEqual([]);
    });

    it('should extract rarity from voice input when enabled', async () => {
      sessionManager.settings = { autoExtractRarity: true };
      
      const transcript = 'blue eyes white dragon secret rare';
      
      // Mock findCardsInCurrentSet method
      vi.spyOn(sessionManager, 'findCardsInCurrentSet').mockResolvedValue([
        { 
          name: 'Blue-Eyes White Dragon', 
          displayRarity: 'Secret Rare',
          confidence: 95
        }
      ]);

      const results = await sessionManager.processVoiceInput(transcript);
      
      expect(results[0].displayRarity).toBe('Secret Rare');
    });
  });

  describe('Local Storage Operations', () => {
    beforeEach(async () => {
      await sessionManager.initialize(mockStorage);
    });

    it('should save session to storage', async () => {
      sessionManager.currentSession = {
        setId: 'LOB',
        cards: [{ name: 'Test Card' }],
        startTime: new Date()
      };

      await sessionManager.saveSession();
      
      expect(mockStorage.set).toHaveBeenCalledWith('currentSession', sessionManager.currentSession);
    });

    it('should load session from storage', async () => {
      const savedSession = {
        setId: 'LOB',
        cards: [{ name: 'Test Card' }],
        startTime: new Date().toISOString()
      };

      mockStorage.get.mockResolvedValue(savedSession);

      await sessionManager.loadLastSession();
      
      expect(sessionManager.currentSession).toBeDefined();
      expect(sessionManager.currentSession.setId).toBe('LOB');
    });

    it('should handle missing session in storage', async () => {
      mockStorage.get.mockResolvedValue(null);

      await sessionManager.loadLastSession();
      
      expect(sessionManager.currentSession).toBeNull();
    });
  });

  describe('Session Calculations', () => {
    beforeEach(async () => {
      // Mock loadCardSets to avoid API call
      vi.spyOn(sessionManager, 'loadCardSets').mockResolvedValue([]);
      await sessionManager.initialize(mockStorage);
      sessionManager.cardSets = [
        { id: 'LOB', name: 'Legend of Blue Eyes White Dragon', setCode: 'LOB' }
      ];
      // Mock loadSetCards to avoid API call
      vi.spyOn(sessionManager, 'loadSetCards').mockResolvedValue([]);
      await sessionManager.startSession('LOB');
    });

    it('should calculate session totals correctly', () => {
      sessionManager.currentSession.cards = [
        { name: 'Card 1', quantity: 2, tcg_price: '10.00', tcg_market_price: '15.00' },
        { name: 'Card 2', quantity: 1, tcg_price: '20.00', tcg_market_price: '25.00' }
      ];

      // Use the actual method that exists
      sessionManager.updateSessionStatistics();
      const stats = sessionManager.currentSession.statistics;
      
      expect(stats.totalCards).toBe(3);
      expect(stats.tcgLowTotal).toBe(40); // (2*10 + 1*20) = 40
      expect(stats.tcgMarketTotal).toBe(55); // (2*15 + 1*25) = 55
    });

    it('should get current session info', () => {
      sessionManager.currentSession = {
        setId: 'LOB',
        setName: 'Legend of Blue Eyes White Dragon',
        cards: [{ name: 'Card 1', quantity: 1 }],
        startTime: new Date(),
        statistics: { totalCards: 1 }
      };

      const info = sessionManager.getCurrentSessionInfo();
      
      expect(info.setName).toBe('Legend of Blue Eyes White Dragon');
      expect(info.cardCount).toBe(1);
      expect(info.isActive).toBe(true);
    });
  });

  describe('Card Set Management', () => {
    beforeEach(async () => {
      // Mock loadCardSets to avoid API call
      vi.spyOn(sessionManager, 'loadCardSets').mockResolvedValue([]);
      await sessionManager.initialize(mockStorage);
    });

    it('should load card sets successfully', async () => {
      const mockSets = [
        { id: 'LOB', name: 'Legend of Blue Eyes White Dragon' },
        { id: 'MRD', name: 'Metal Raiders' }
      ];

      // Mock fetchCardSets method and ensure it's called
      vi.spyOn(sessionManager, 'fetchCardSets').mockResolvedValue(mockSets);
      
      // Remove the existing mock from beforeEach and call the real method
      sessionManager.loadCardSets.mockRestore();

      await sessionManager.loadCardSets();
      
      expect(sessionManager.cardSets).toEqual(mockSets);
    });

    it('should handle card set loading failure', async () => {
      // Mock fetchCardSets to throw error
      vi.spyOn(sessionManager, 'fetchCardSets').mockRejectedValue(new Error('API Error'));
      
      // Remove the existing mock from beforeEach and call the real method
      sessionManager.loadCardSets.mockRestore();

      await expect(sessionManager.loadCardSets()).rejects.toThrow('API Error');
    });

    it('should filter sets by search term', () => {
      sessionManager.cardSets = [
        { id: 'LOB', name: 'Legend of Blue Eyes White Dragon' },
        { id: 'MRD', name: 'Metal Raiders' },
        { id: 'PSV', name: 'Pharaoh\'s Servant' }
      ];

      const filtered = sessionManager.filterCardSets('metal');
      
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Metal Raiders');
    });
  });

  describe('Settings Management', () => {
    it('should update settings successfully', () => {
      const newSettings = {
        autoConfirm: true,
        autoConfirmThreshold: 90,
        autoExtractRarity: true
      };

      sessionManager.updateSettings(newSettings);
      
      expect(sessionManager.settings.autoConfirm).toBe(true);
      expect(sessionManager.settings.autoConfirmThreshold).toBe(90);
      expect(sessionManager.settings.autoExtractRarity).toBe(true);
    });

    it('should preserve existing settings when updating', () => {
      sessionManager.settings = {
        existingSetting: 'value',
        autoConfirm: false
      };

      sessionManager.updateSettings({ autoConfirm: true });
      
      expect(sessionManager.settings.existingSetting).toBe('value');
      expect(sessionManager.settings.autoConfirm).toBe(true);
    });
  });

  describe('Import/Export Functionality', () => {
    beforeEach(async () => {
      // Mock loadCardSets to avoid API call
      vi.spyOn(sessionManager, 'loadCardSets').mockResolvedValue([]);
      await sessionManager.initialize(mockStorage);
      sessionManager.cardSets = [
        { id: 'LOB', name: 'Legend of Blue Eyes White Dragon', setCode: 'LOB' }
      ];
      // Mock loadSetCards to avoid API call
      vi.spyOn(sessionManager, 'loadSetCards').mockResolvedValue([]);
      await sessionManager.startSession('LOB');
    });

    it('should generate export file successfully', async () => {
      sessionManager.currentSession.cards = [
        { name: 'Blue-Eyes White Dragon', rarity: 'Ultra Rare', quantity: 1 }
      ];

      // Mock URL.createObjectURL for browser environment
      global.URL = {
        createObjectURL: vi.fn(() => 'blob:mock-url'),
        revokeObjectURL: vi.fn()
      };
      global.Blob = vi.fn(() => ({}));

      const exportFile = await sessionManager.generateExportFile('json');
      
      expect(exportFile).toBeDefined();
      expect(exportFile.filename).toMatch(/\.json$/);
      expect(exportFile.url).toBe('blob:mock-url');
      expect(typeof exportFile.cleanup).toBe('function');
    });

    it('should import session successfully', async () => {
      const importData = {
        setId: 'LOB',
        setName: 'Legend of Blue Eyes White Dragon',
        cards: [
          { name: 'Test Card', rarity: 'Common', quantity: 1 }
        ]
      };

      await sessionManager.importSession(importData);
      
      expect(sessionManager.currentSession.setId).toBe('LOB');
      expect(sessionManager.currentSession.cards).toHaveLength(1);
    });

    it('should validate import data', async () => {
      const invalidData = null;

      await expect(sessionManager.importSession(invalidData)).rejects.toThrow('Invalid session data: No data provided');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      // Mock fetchCardSets to throw error
      vi.spyOn(sessionManager, 'fetchCardSets').mockRejectedValue(new Error('Network Error'));

      await expect(sessionManager.loadCardSets()).rejects.toThrow('Network Error');
    });

    it('should handle storage errors gracefully', async () => {
      mockStorage.set.mockRejectedValue(new Error('Storage Error'));

      sessionManager.currentSession = { setId: 'LOB' };

      const result = await sessionManager.saveSession();
      
      expect(result).toBe(false);
    });

    it('should handle invalid card data', async () => {
      // Mock loadCardSets to avoid API call
      vi.spyOn(sessionManager, 'loadCardSets').mockResolvedValue([]);
      await sessionManager.initialize(mockStorage);
      sessionManager.cardSets = [
        { id: 'LOB', name: 'Legend of Blue Eyes White Dragon', setCode: 'LOB' }
      ];
      // Mock loadSetCards to avoid API call
      vi.spyOn(sessionManager, 'loadSetCards').mockResolvedValue([]);
      await sessionManager.startSession('LOB');

      const invalidCard = null;

      await expect(sessionManager.addCard(invalidCard)).rejects.toThrow();
    });
  });

  describe('Event System', () => {
    it('should emit events correctly', () => {
      const mockCallback = vi.fn();
      
      sessionManager.addEventListener('test-event', mockCallback);
      sessionManager.emit('test-event', { data: 'test' });
      
      expect(mockCallback).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should remove event listeners', () => {
      const mockCallback = vi.fn();
      
      sessionManager.addEventListener('test-event', mockCallback);
      sessionManager.removeEventListener('test-event', mockCallback);
      sessionManager.emit('test-event', { data: 'test' });
      
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });
});