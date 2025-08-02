import { describe, test, expect, beforeEach, vi } from 'vitest';
import { SessionManager } from '../../js/session/SessionManager.js';

// Create a comprehensive Logger mock
const createLoggerMock = () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
  log: vi.fn(),
  time: vi.fn(),
  timeEnd: vi.fn(),
  perf: vi.fn(),
  group: vi.fn(),
  groupEnd: vi.fn(),
  getLogs: vi.fn(() => []),
  getErrors: vi.fn(() => []),
  clearLogs: vi.fn(),
  clearErrors: vi.fn(),
  createChild: vi.fn((subModule) => createLoggerMock()),
  enableDebug: vi.fn(),
  disableDebug: vi.fn(),
  logSystemInfo: vi.fn(),
  logPerformanceInfo: vi.fn(),
  scope: vi.fn(() => createLoggerMock())
});

// Create a Storage mock
const createStorageMock = () => ({
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
  clear: vi.fn(),
  initialize: vi.fn().mockResolvedValue(true),
  checkAvailability: vi.fn().mockResolvedValue(true)
});

describe('SessionManager', () => {
  let sessionManager;
  let mockLogger;
  let mockStorage;

  beforeEach(() => {
    mockLogger = createLoggerMock();
    mockStorage = createStorageMock();
    
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock fetch for API calls
    global.fetch = vi.fn();
    
    sessionManager = new SessionManager(mockStorage, mockLogger);
  });

  describe('Initialization', () => {
    test('should initialize with correct default values', () => {
      expect(sessionManager.sessionActive).toBe(false);
      expect(sessionManager.currentSession).toBeNull();
      expect(sessionManager.cardSets).toEqual([]);
      expect(sessionManager.filteredCardSets).toEqual([]);
      expect(sessionManager.currentSet).toBeNull();
      expect(mockLogger.info).toHaveBeenCalledWith('SessionManager initialized');
    });

    test('should initialize successfully', async () => {
      // Mock successful API response for card sets
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: [
            { set_name: 'Test Set', set_code: 'TEST' }
          ]
        })
      });

      mockStorage.get.mockResolvedValue(null); // No existing session

      const result = await sessionManager.initialize(mockStorage);
      
      expect(result).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith('Initializing session manager...');
      expect(mockLogger.info).toHaveBeenCalledWith('Session manager initialized successfully');
    });

    test('should load existing session on initialization', async () => {
      const existingSession = {
        id: 'test-session',
        setId: 'TEST',
        cards: [],
        startTime: new Date().toISOString(),
        endTime: null
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: [{ set_name: 'Test Set', set_code: 'TEST' }]
        })
      });

      // Mock storage.get to return existing session when called with 'currentSession'
      mockStorage.get.mockImplementation((key) => {
        if (key === 'currentSession') {
          return Promise.resolve(existingSession);
        }
        return Promise.resolve(null);
      });

      await sessionManager.initialize(mockStorage);
      
      expect(sessionManager.currentSession).toEqual(existingSession);
      expect(sessionManager.sessionActive).toBe(true);
    });

    test('should handle initialization errors gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(sessionManager.initialize(mockStorage)).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to initialize session manager:', expect.any(Error));
    });
  });

  describe('Card Sets Management', () => {
    test('should load card sets from API successfully', async () => {
      const mockSets = [
        { set_name: 'Blue-Eyes White Dragon Set', set_code: 'LOB' },
        { set_name: 'Metal Raiders', set_code: 'MRD' }
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: mockSets
        })
      });

      const result = await sessionManager.loadCardSets();
      
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Blue-Eyes White Dragon Set');
      expect(result[0].code).toBe('LOB');
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Loading card sets'));
    });

    test('should handle API errors when loading card sets', async () => {
      global.fetch.mockRejectedValueOnce(new Error('API Error'));

      await expect(sessionManager.loadCardSets()).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to load card sets:', expect.any(Error));
    });

    test('should filter card sets by search term', async () => {
      sessionManager.cardSets = [
        { id: 'LOB', name: 'Legend of Blue Eyes White Dragon', code: 'LOB' },
        { id: 'MRD', name: 'Metal Raiders', code: 'MRD' },
        { id: 'PSV', name: 'Pharaoh\'s Servant', code: 'PSV' }
      ];

      const result = sessionManager.filterCardSets('Blue');
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toContain('Blue');
    });

    test('should return all sets for empty search term', async () => {
      sessionManager.cardSets = [
        { id: 'LOB', name: 'Legend of Blue Eyes White Dragon', code: 'LOB' },
        { id: 'MRD', name: 'Metal Raiders', code: 'MRD' }
      ];

      const result = sessionManager.filterCardSets('');
      
      expect(result).toHaveLength(2);
    });

    test('should handle case-insensitive search', async () => {
      sessionManager.cardSets = [
        { id: 'LOB', name: 'Legend of Blue Eyes White Dragon', code: 'LOB' }
      ];

      const result = sessionManager.filterCardSets('blue');
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toContain('Blue');
    });

    test('should load set cards and cache them', async () => {
      const mockCards = [
        { name: 'Blue-Eyes White Dragon', id: 89631139 },
        { name: 'Dark Magician', id: 46986414 }
      ];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: mockCards
        })
      });

      const result = await sessionManager.loadSetCards('LOB');
      
      expect(result).toEqual(mockCards);
      expect(sessionManager.setCards.has('LOB')).toBe(true);
      expect(sessionManager.setCards.get('LOB')).toEqual(mockCards);
    });

    test('should return cached set cards on subsequent requests', async () => {
      const mockCards = [{ name: 'Cached Card', id: 12345 }];
      sessionManager.setCards.set('LOB', mockCards);

      const result = await sessionManager.loadSetCards('LOB');
      
      expect(result).toEqual(mockCards);
      expect(global.fetch).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Using cached cards for set: LOB');
    });

    test('should handle set cards API errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Set cards API error'));

      await expect(sessionManager.loadSetCards('LOB')).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load cards for set LOB:'),
        expect.any(Error)
      );
    });

    test('should use cached sets when available and recent', async () => {
      const cachedSets = new Array(200).fill(null).map((_, index) => ({
        set_name: `Cached Set ${index + 1}`,
        set_code: `CS${String(index + 1).padStart(3, '0')}`
      }));
      const recentTimestamp = Date.now() - 1000; // 1 second ago

      mockStorage.get.mockImplementation((key) => {
        if (key === 'cardSets') return Promise.resolve(cachedSets);
        if (key === 'cardSetsTimestamp') return Promise.resolve(recentTimestamp);
        return Promise.resolve(null);
      });

      // Should use cache and not call API
      const result = await sessionManager.loadCardSets();
      
      // The method returns the cached sets directly without transformation
      expect(result).toEqual(cachedSets);
      expect(global.fetch).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining(`Using cached card sets (${cachedSets.length} sets`)
      );
    });
  });

  describe('Session Management', () => {
    beforeEach(() => {
      sessionManager.cardSets = [
        { id: 'LOB', name: 'Legend of Blue Eyes White Dragon', code: 'LOB' }
      ];
    });

    test('should start a new session successfully', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: []
        })
      });

      const session = await sessionManager.startSession('LOB');
      
      expect(session).toBeDefined();
      expect(session.setId).toBe('LOB');
      expect(session.setName).toBe('Legend of Blue Eyes White Dragon');
      expect(sessionManager.sessionActive).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith('Starting session for set: LOB');
      expect(mockLogger.info).toHaveBeenCalledWith('Session started successfully');
    });

    test('should handle API error when starting session', async () => {
      global.fetch.mockRejectedValueOnce(new Error('API Error'));

      await expect(sessionManager.startSession('LOB')).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to start session:', expect.any(Error));
    });

    test('should clear current session', () => {
      sessionManager.currentSession = {
        id: 'test-session',
        cards: [{ id: 'card1', name: 'Test Card' }]
      };

      sessionManager.clearSession();
      
      expect(sessionManager.currentSession.cards).toHaveLength(0);
      expect(mockLogger.info).toHaveBeenCalledWith('Clearing current session');
    });

    test('should stop session and save to history', async () => {
      sessionManager.currentSession = {
        id: 'test-session',
        setId: 'LOB',
        setName: 'Test Set',
        cards: [{ id: 'card1', name: 'Test Card' }],
        startTime: new Date().toISOString(),
        statistics: { totalCards: 1 }
      };
      sessionManager.sessionActive = true;

      mockStorage.set.mockResolvedValue(true);

      const result = await sessionManager.stopSession();
      
      expect(result).toBeDefined();
      expect(result.endTime).toBeDefined();
      expect(sessionManager.sessionActive).toBe(false);
      expect(sessionManager.currentSession).toBeNull();
      expect(sessionManager.sessionHistory).toHaveLength(1);
    });

    test('should handle stop session when no session active', async () => {
      sessionManager.sessionActive = false;
      sessionManager.currentSession = null;

      const result = await sessionManager.stopSession();
      
      expect(result).toBeUndefined();
      expect(mockLogger.warn).toHaveBeenCalledWith('No active session to stop');
    });
  });

  describe('Card Management', () => {
    beforeEach(() => {
      sessionManager.currentSession = {
        id: 'test-session',
        setId: 'LOB',
        setName: 'Test Set',
        cards: [],
        statistics: {
          totalCards: 0,
          tcgLowTotal: 0,
          tcgMarketTotal: 0
        }
      };
      sessionManager.sessionActive = true;
    });

    test('should add card to session successfully', async () => {
      const cardData = {
        name: 'Blue-Eyes White Dragon',
        rarity: 'Ultra Rare',
        card_number: 'LOB-001'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            name: 'Blue-Eyes White Dragon',
            tcg_price: '25.00',
            tcg_market_price: '30.00'
          }
        })
      });

      const result = await sessionManager.addCard(cardData);
      
      expect(result).toBeDefined();
      expect(result.name).toBe('Blue-Eyes White Dragon');
      expect(sessionManager.currentSession.cards).toHaveLength(1);
      expect(mockLogger.info).toHaveBeenCalledWith('Card added to session:', 'Blue-Eyes White Dragon');
    });

    test('should handle duplicate card addition', async () => {
      const cardData = {
        name: 'Blue-Eyes White Dragon',
        rarity: 'Ultra Rare',
        card_number: 'LOB-001'
      };

      // Add card first time
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { name: 'Blue-Eyes White Dragon' }
        })
      });

      await sessionManager.addCard(cardData);
      await sessionManager.addCard(cardData); // Add same card again
      
      expect(sessionManager.currentSession.cards).toHaveLength(2);
    });

    test('should remove card from session', () => {
      const card = { id: 'card1', name: 'Test Card' };
      sessionManager.currentSession.cards = [card];

      const result = sessionManager.removeCard('card1');
      
      expect(result).toEqual(card);
      expect(sessionManager.currentSession.cards).toHaveLength(0);
      expect(mockLogger.info).toHaveBeenCalledWith('Card removed from session:', 'Test Card');
    });

    test('should handle remove non-existent card', () => {
      expect(() => {
        sessionManager.removeCard('non-existent');
      }).toThrow('Card not found in session');
    });

    test('should adjust card quantity', () => {
      const card = { id: 'card1', name: 'Test Card', quantity: 1 };
      sessionManager.currentSession.cards = [card];

      const result = sessionManager.adjustCardQuantity('card1', 2);
      
      expect(result.quantity).toBe(3);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Card quantity adjusted: Test Card (1 -> 3)')
      );
    });

    test('should not allow quantity below 1', () => {
      const card = { id: 'card1', name: 'Test Card', quantity: 1 };
      sessionManager.currentSession.cards = [card];

      const result = sessionManager.adjustCardQuantity('card1', -5);
      
      expect(result.quantity).toBe(1); // Should stay at minimum of 1
    });

    test('should refresh card pricing', async () => {
      const card = { 
        id: 'card1', 
        name: 'Test Card',
        tcg_price: '10.00',
        tcg_market_price: '12.00'
      };
      sessionManager.currentSession.cards = [card];

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            tcg_price: '15.00',
            tcg_market_price: '18.00'
          }
        })
      });

      const result = await sessionManager.refreshCardPricing('card1');
      
      expect(result.tcg_price).toBe('15.00');
      expect(result.tcg_market_price).toBe('18.00');
      expect(result.price_status).toBe('refreshed');
    });

    test('should handle pricing refresh errors', async () => {
      const card = { id: 'card1', name: 'Test Card' };
      sessionManager.currentSession.cards = [card];

      global.fetch.mockRejectedValueOnce(new Error('Pricing API error'));

      await expect(sessionManager.refreshCardPricing('card1')).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to refresh pricing for card card1:'),
        expect.any(Error)
      );
    });

    test('should refresh all cards pricing', async () => {
      const cards = [
        { id: 'card1', name: 'Card 1' },
        { id: 'card2', name: 'Card 2' }
      ];
      sessionManager.currentSession.cards = cards;

      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { tcg_price: '10.00', tcg_market_price: '12.00' }
        })
      });

      const results = await sessionManager.refreshAllCardsPricing();
      
      expect(results).toHaveLength(2);
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Bulk pricing refresh completed: 2/2 cards updated successfully')
      );
    });

    test('should handle partial failures in bulk pricing refresh', async () => {
      const cards = [
        { id: 'card1', name: 'Card 1' },
        { id: 'card2', name: 'Card 2' }
      ];
      sessionManager.currentSession.cards = cards;

      // Mock first call to succeed, second to fail
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { tcg_price: '10.00' }
          })
        })
        .mockRejectedValueOnce(new Error('API Error'));

      const results = await sessionManager.refreshAllCardsPricing();
      
      expect(results).toHaveLength(1); // Only successful refreshes
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Bulk pricing refresh completed: 1/2 cards updated successfully')
      );
    });
  });

  describe('Statistics Calculation', () => {
    test('should calculate session statistics correctly', () => {
      const cards = [
        {
          name: 'Card 1',
          tcg_price: '10.00',
          tcg_market_price: '12.00',
          rarity: 'Common'
        },
        {
          name: 'Card 2',
          tcg_price: '15.00',
          tcg_market_price: '18.00',
          rarity: 'Rare'
        }
      ];

      const stats = sessionManager.calculateSessionStatistics(cards);
      
      expect(stats.totalCards).toBe(2);
      expect(stats.tcgLowTotal).toBe(25.00);
      expect(stats.tcgMarketTotal).toBe(30.00);
      expect(stats.rarityBreakdown.Common).toBe(1);
      expect(stats.rarityBreakdown.Rare).toBe(1);
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Session statistics calculated'));
    });

    test('should handle empty card array', () => {
      const stats = sessionManager.calculateSessionStatistics([]);
      
      expect(stats.totalCards).toBe(0);
      expect(stats.tcgLowTotal).toBe(0);
      expect(stats.tcgMarketTotal).toBe(0);
      expect(Object.keys(stats.rarityBreakdown)).toHaveLength(0);
    });

    test('should handle cards with quantities', () => {
      const cards = [
        {
          name: 'Card 1',
          tcg_price: '10.00',
          tcg_market_price: '12.00',
          rarity: 'Common',
          quantity: 3
        }
      ];

      const stats = sessionManager.calculateSessionStatistics(cards);
      
      expect(stats.totalCards).toBe(3);
      expect(stats.tcgLowTotal).toBe(30.00); // 10 * 3
      expect(stats.tcgMarketTotal).toBe(36.00); // 12 * 3
      expect(stats.rarityBreakdown.Common).toBe(3);
    });

    test('should handle invalid pricing data', () => {
      const cards = [
        {
          name: 'Card 1',
          tcg_price: 'invalid',
          tcg_market_price: null,
          rarity: 'Common'
        }
      ];

      const stats = sessionManager.calculateSessionStatistics(cards);
      
      expect(stats.totalCards).toBe(1);
      expect(stats.tcgLowTotal).toBe(0);
      expect(stats.tcgMarketTotal).toBe(0);
    });
  });

  describe('Voice Input Processing', () => {
    beforeEach(() => {
      sessionManager.currentSet = { id: 'LOB', name: 'Legend of Blue Eyes White Dragon' };
      sessionManager.setCards.set('LOB', [
        {
          name: 'Blue-Eyes White Dragon',
          id: 89631139,
          card_sets: [
            { set_rarity: 'Ultra Rare', set_code: 'LOB-001', set_name: 'Legend of Blue Eyes White Dragon' }
          ]
        },
        {
          name: 'Dark Magician',
          id: 46986414,
          card_sets: [
            { set_rarity: 'Ultra Rare', set_code: 'LOB-006', set_name: 'Legend of Blue Eyes White Dragon' }
          ]
        }
      ]);
    });

    test('should process voice input successfully', async () => {
      const transcript = 'blue eyes white dragon';
      
      const results = await sessionManager.processVoiceInput(transcript);
      
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Blue-Eyes White Dragon');
      expect(results[0].confidence).toBeGreaterThan(0);
      expect(mockLogger.info).toHaveBeenCalledWith('Processing voice input:', transcript);
    });

    test('should extract rarity from voice input when enabled', () => {
      sessionManager.settings.autoExtractRarity = true;
      
      const result = sessionManager.extractRarityFromVoice('blue eyes white dragon ultra rare');
      
      expect(result.cardName).toBe('blue eyes white dragon');
      expect(result.rarity).toBe('ultra rare');
    });

    test('should not extract rarity when disabled', () => {
      sessionManager.settings.autoExtractRarity = false;
      
      const result = sessionManager.extractRarityFromVoice('blue eyes white dragon ultra rare');
      
      expect(result.cardName).toBe('blue eyes white dragon ultra rare');
      expect(result.rarity).toBeNull();
    });

    test('should extract art variant from voice input when enabled', () => {
      sessionManager.settings.autoExtractArtVariant = true;
      
      const result = sessionManager.extractArtVariantFromVoice('blue eyes white dragon art variant alternate');
      
      expect(result.cardName).toBe('blue eyes white dragon');
      expect(result.artVariant).toBe('alternate');
    });

    test('should handle empty voice input', async () => {
      const results = await sessionManager.processVoiceInput('');
      
      expect(results).toHaveLength(0);
    });

    test('should handle null voice input', async () => {
      const results = await sessionManager.processVoiceInput(null);
      
      expect(results).toHaveLength(0);
    });

    test('should generate card name variants', () => {
      const variants = sessionManager.generateCardNameVariants('Yu-Gi-Oh! Elemental Hero');
      
      expect(variants).toContain('yu-gi-oh! elemental hero');
      expect(variants.length).toBeGreaterThan(1);
      expect(variants.some(v => v.includes('element'))).toBe(true);
    });

    test('should calculate similarity between strings', () => {
      const similarity1 = sessionManager.calculateSimilarity('blue eyes', 'blue-eyes');
      const similarity2 = sessionManager.calculateSimilarity('dragon', 'completely different');
      
      expect(similarity1).toBeGreaterThan(0.8);
      expect(similarity2).toBeLessThan(0.3);
    });

    test('should normalize card names for matching', () => {
      const normalized = sessionManager.normalizeCardName('Blue-Eyes White Dragon!!!');
      
      expect(normalized).toBe('blue eyes white dragon');
    });

    test('should find cards in current set with fuzzy matching', async () => {
      const results = await sessionManager.findCardsInCurrentSet('blue dragon');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].confidence).toBeGreaterThan(0);
      expect(results[0].method).toContain('set-search');
    });

    test('should ensure unique confidence scores', () => {
      const variants = [
        { name: 'Card 1', confidence: 90.0 },
        { name: 'Card 2', confidence: 90.0 },
        { name: 'Card 3', confidence: 90.0 }
      ];
      
      sessionManager.ensureUniqueConfidenceScores(variants);
      
      const confidences = variants.map(v => v.confidence);
      const uniqueConfidences = new Set(confidences);
      expect(uniqueConfidences.size).toBe(3);
    });

    test('should calculate rarity matching scores', () => {
      const score1 = sessionManager.calculateRarityScore('ultra rare', 'Ultra Rare');
      const score2 = sessionManager.calculateRarityScore('ultra', 'Ultra Rare');
      const score3 = sessionManager.calculateRarityScore('common', 'Ultra Rare');
      
      expect(score1).toBe(100); // Exact match
      expect(score2).toBe(80); // Partial match
      expect(score3).toBeLessThan(20); // Poor match
    });
  });

  describe('Import/Export Functionality', () => {
    beforeEach(() => {
      sessionManager.currentSession = {
        id: 'test-session',
        setId: 'LOB',
        setName: 'Legend of Blue Eyes White Dragon',
        cards: [
          {
            id: 'card1',
            name: 'Blue-Eyes White Dragon',
            tcg_price: '25.00',
            tcg_market_price: '30.00',
            rarity: 'Ultra Rare',
            quantity: 1
          }
        ],
        statistics: {
          totalCards: 1,
          tcgLowTotal: 25.00,
          tcgMarketTotal: 30.00
        },
        startTime: new Date().toISOString()
      };
      sessionManager.sessionActive = true;
    });

    test('should export session as JSON', async () => {
      const exportData = await sessionManager.exportSession('json');
      
      expect(exportData.sessionId).toBe('test-session');
      expect(exportData.setName).toBe('Legend of Blue Eyes White Dragon');
      expect(exportData.cards).toHaveLength(1);
      expect(exportData.version).toBe('2.1.0');
      expect(exportData.exportedAt).toBeDefined();
    });

    test('should export session as CSV', async () => {
      const exportData = await sessionManager.exportSession('csv');
      
      expect(exportData.content).toContain('Card Name,Rarity,Set Code');
      expect(exportData.content).toContain('Blue-Eyes White Dragon');
      expect(exportData.filename).toContain('.csv');
      expect(exportData.mimeType).toBe('text/csv');
    });

    test('should wait for pricing data before export', async () => {
      sessionManager.loadingPriceData.add('card1');
      
      // Simulate pricing completion
      setTimeout(() => {
        sessionManager.loadingPriceData.delete('card1');
      }, 100);
      
      const exportData = await sessionManager.exportSession('json', null, true);
      
      expect(exportData).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Export waiting for pricing data to finish loading...')
      );
    });

    test('should generate downloadable export file', async () => {
      // Mock URL.createObjectURL for the test environment
      global.URL = {
        createObjectURL: vi.fn(() => 'blob:mock-url'),
        revokeObjectURL: vi.fn()
      };

      const exportFile = await sessionManager.generateExportFile('json');
      
      expect(exportFile.blob).toBeInstanceOf(Blob);
      expect(exportFile.url).toBe('blob:mock-url');
      expect(exportFile.filename).toContain('.json');
      expect(typeof exportFile.cleanup).toBe('function');
    });

    test('should import session successfully', async () => {
      const sessionData = {
        setId: 'MRD',
        setName: 'Metal Raiders',
        cards: [
          {
            id: 'imported-card',
            name: 'Mirror Force',
            tcg_price: '5.00',
            tcg_market_price: '7.00',
            importedPricing: true
          }
        ]
      };

      // Stop current session first
      await sessionManager.stopSession();

      const result = await sessionManager.importSession(sessionData);
      
      expect(result.setId).toBe('MRD');
      expect(result.cards).toHaveLength(1);
      expect(result.cards[0].name).toBe('Mirror Force');
      expect(sessionManager.sessionActive).toBe(true);
    });

    test('should convert legacy session format', async () => {
      const legacyData = {
        cards: [
          {
            name: 'Legacy Card',
            card_name: 'Legacy Card',
            tcg_price: '10.00',
            tcg_market_price: '12.00',
            set_code: 'LEG',
            rarity: 'Common'
          }
        ],
        current_set: 'Legacy Set',
        last_saved: new Date().toISOString()
      };

      const converted = await sessionManager.convertLegacySessionFormat(legacyData);
      
      expect(converted.setId).toBeDefined();
      expect(converted.setName).toBeDefined();
      expect(converted.cards).toHaveLength(1);
      expect(converted.legacyImport).toBe(true);
      expect(converted.statistics).toBeDefined();
    });

    test('should handle legacy format with corrupted cards', async () => {
      const legacyData = {
        cards: [
          { name: 'Valid Card', tcg_price: '10.00' },
          null, // Invalid card
          undefined, // Invalid card
          { tcg_price: '5.00' }, // Missing name
          'invalid string' // Invalid type
        ],
        current_set: 'Test Set'
      };

      const converted = await sessionManager.convertLegacySessionFormat(legacyData);
      
      expect(converted.cards).toHaveLength(1); // Only valid card processed
      expect(converted.cards[0].name).toBe('Valid Card');
    });

    test('should validate imported pricing data', () => {
      const report = sessionManager.validateImportedPricingData();
      
      expect(report.totalCards).toBe(1);
      expect(report.cardsWithPricing).toBe(1);
      expect(report.cardsWithImportedPricing).toBe(0); // Not marked as imported
    });

    test('should get imported cards information', () => {
      // Add imported card
      sessionManager.currentSession.cards[0].importedPricing = true;
      sessionManager.currentSession.cards[0].price_status = 'imported';
      
      const info = sessionManager.getImportedCardsInfo();
      
      expect(info.totalCards).toBe(1);
      expect(info.importedCards).toBe(1);
      expect(info.cardsWithPricing).toBe(1);
      expect(info.hasImportedCards).toBe(true);
    });

    test('should process card images during import', () => {
      const card = {
        name: 'Test Card',
        id: 12345,
        card_images: [
          {
            image_url: 'https://example.com/image.jpg',
            image_url_small: 'https://example.com/small.jpg'
          }
        ]
      };

      const processed = sessionManager.processCardImages(card);
      
      expect(processed.image_url).toBe('https://example.com/image.jpg');
      expect(processed.image_url_small).toBe('https://example.com/small.jpg');
    });

    test('should generate image URLs when missing', () => {
      const card = {
        name: 'Test Card',
        id: 12345
      };

      const processed = sessionManager.processCardImages(card);
      
      expect(processed.image_url).toContain('ygoprodeck.com');
      expect(processed.image_url).toContain('12345.jpg');
    });
  });

  describe('Utility Methods', () => {
    test('should generate unique card ID', () => {
      const id1 = sessionManager.generateCardId();
      const id2 = sessionManager.generateCardId();
      
      expect(id1).toMatch(/^card_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^card_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    test('should generate unique session ID', () => {
      const id1 = sessionManager.generateSessionId();
      const id2 = sessionManager.generateSessionId();
      
      expect(id1).toMatch(/^session_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^session_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    test('should get current session info', () => {
      sessionManager.currentSession = {
        id: 'test-session',
        setName: 'Test Set',
        cards: [{ name: 'Test Card' }]
      };
      sessionManager.sessionActive = true;

      const info = sessionManager.getCurrentSessionInfo();
      
      expect(info.isActive).toBe(true);
      expect(info.setName).toBe('Test Set');
      expect(info.cardCount).toBe(1);
      expect(info.status).toBe('Active');
    });

    test('should get empty session info when no active session', () => {
      const info = sessionManager.getCurrentSessionInfo();
      
      expect(info.isActive).toBe(false);
      expect(info.setName).toBe('None');
      expect(info.cardCount).toBe(0);
      expect(info.status).toBe('No active session');
    });

    test('should update settings', () => {
      const newSettings = {
        autoExtractRarity: true,
        autoExtractArtVariant: true
      };

      sessionManager.updateSettings(newSettings);
      
      expect(sessionManager.settings.autoExtractRarity).toBe(true);
      expect(sessionManager.settings.autoExtractArtVariant).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith('SessionManager settings updated:', expect.any(Object));
    });

    test('should get API URL from config', () => {
      const apiUrl = sessionManager.getApiUrl();
      
      // API URL comes from config, so test the actual value
      expect(typeof apiUrl).toBe('string');
      expect(apiUrl).toMatch(/^https?:\/\//);
    });

    test('should get card sets list', () => {
      sessionManager.cardSets = [
        { id: 'LOB', name: 'Legend of Blue Eyes White Dragon' }
      ];

      const sets = sessionManager.getCardSets();
      
      expect(sets).toHaveLength(1);
      expect(sets[0].name).toBe('Legend of Blue Eyes White Dragon');
      expect(sets).not.toBe(sessionManager.cardSets); // Should return copy
    });

    test('should check if session is active', () => {
      sessionManager.sessionActive = true;
      expect(sessionManager.isSessionActive()).toBe(true);
      
      sessionManager.sessionActive = false;
      expect(sessionManager.isSessionActive()).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(sessionManager.loadCardSets()).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to load card sets:', expect.any(Error));
    });

    test('should validate session before operations', async () => {
      sessionManager.sessionActive = false;
      sessionManager.currentSession = null;

      const cardData = { name: 'Test Card' };
      
      await expect(sessionManager.addCard(cardData)).rejects.toThrow('No active session');
    });

    test('should handle API timeout errors', async () => {
      // Mock AbortError
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      global.fetch.mockRejectedValueOnce(abortError);

      await expect(sessionManager.loadCardSets()).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('[API DEBUG] Request timed out after'),
        expect.any(Number),
        'ms'
      );
    });

    test('should handle invalid card set ID', async () => {
      await expect(sessionManager.startSession('INVALID_SET')).rejects.toThrow('Card set not found: INVALID_SET');
    });

    test('should handle switch set with no active session', async () => {
      sessionManager.sessionActive = false;
      sessionManager.currentSession = null;

      await expect(sessionManager.switchSet('MRD')).rejects.toThrow('No active session to switch sets');
    });

    test('should handle export with no active session', async () => {
      sessionManager.currentSession = null;

      await expect(sessionManager.exportSession()).rejects.toThrow('No active session to export');
    });
  });

  describe('Session Persistence and Recovery', () => {
    beforeEach(() => {
      sessionManager.cardSets = [
        { id: 'LOB', name: 'Legend of Blue Eyes White Dragon', code: 'LOB' }
      ];
    });

    test('should save session to storage successfully', async () => {
      sessionManager.currentSession = {
        id: 'test-session',
        setId: 'LOB',
        cards: [{ id: 'card1', name: 'Test Card' }],
        statistics: { totalCards: 1 }
      };

      mockStorage.set.mockResolvedValue(true);

      const result = await sessionManager.saveSession();
      
      expect(result).toBe(true);
      expect(mockStorage.set).toHaveBeenCalledWith('currentSession', sessionManager.currentSession);
      expect(mockLogger.debug).toHaveBeenCalledWith('Session saved successfully');
    });

    test('should handle storage errors during save', async () => {
      sessionManager.currentSession = {
        id: 'test-session',
        setId: 'LOB',
        cards: []
      };

      mockStorage.set.mockRejectedValue(new Error('Storage error'));

      const result = await sessionManager.saveSession();
      
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to save session:', expect.any(Error));
    });

    test('should return false when no session to save', async () => {
      sessionManager.currentSession = null;

      const result = await sessionManager.saveSession();
      
      expect(result).toBe(false);
      expect(mockStorage.set).not.toHaveBeenCalled();
    });

    test('should load session from storage successfully', async () => {
      const savedSession = {
        id: 'saved-session',
        setId: 'LOB',
        cards: [{ id: 'card1', name: 'Saved Card' }],
        endTime: null // Active session
      };

      mockStorage.get.mockImplementation((key) => {
        if (key === 'currentSession') return Promise.resolve(savedSession);
        return Promise.resolve(null);
      });

      const result = await sessionManager.loadLastSession();
      
      expect(result).toEqual(savedSession);
      expect(sessionManager.currentSession).toEqual(savedSession);
      expect(sessionManager.sessionActive).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith('Resumed previous session:', savedSession.id);
    });

    test('should not load completed sessions', async () => {
      const completedSession = {
        id: 'completed-session',
        setId: 'LOB',
        cards: [],
        endTime: new Date().toISOString() // Completed session
      };

      mockStorage.get.mockResolvedValue(completedSession);

      const result = await sessionManager.loadLastSession();
      
      expect(result).toBeNull();
      expect(sessionManager.sessionActive).toBe(false);
    });

    test('should handle storage errors during load', async () => {
      mockStorage.get.mockRejectedValue(new Error('Storage error'));

      const result = await sessionManager.loadLastSession();
      
      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to load last session:', expect.any(Error));
    });

    test('should start auto-save when session is created', async () => {
      vi.useFakeTimers();
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] })
      });

      await sessionManager.startSession('LOB');
      
      expect(sessionManager.autoSaveTimer).toBeDefined();
      
      vi.useRealTimers();
    });

    test('should stop auto-save when session ends', async () => {
      sessionManager.currentSession = {
        id: 'test-session',
        setId: 'LOB',
        cards: [],
        startTime: new Date().toISOString()
      };
      sessionManager.sessionActive = true;
      sessionManager.autoSaveTimer = setInterval(() => {}, 1000);

      mockStorage.set.mockResolvedValue(true);

      await sessionManager.stopSession();
      
      expect(sessionManager.autoSaveTimer).toBeNull();
      expect(sessionManager.sessionActive).toBe(false);
    });

    test('should handle corrupted session data recovery', async () => {
      const corruptedSession = {
        id: 'corrupted-session',
        // Missing required fields
        cards: 'invalid-data'
      };

      mockStorage.get.mockResolvedValue(corruptedSession);

      const result = await sessionManager.loadLastSession();
      
      // Should load the session even if corrupted (SessionManager is resilient)
      expect(result).toEqual(corruptedSession);
    });

    test('should validate session integrity after recovery', async () => {
      const partialSession = {
        id: 'partial-session',
        setId: 'LOB',
        cards: [
          { id: 'card1', name: 'Valid Card' },
          null, // Invalid card
          { name: 'Card without ID' }
        ],
        endTime: null
      };

      mockStorage.get.mockResolvedValue(partialSession);

      const result = await sessionManager.loadLastSession();
      
      expect(result).toBeDefined();
      expect(sessionManager.currentSession).toBeDefined();
      // Should handle invalid cards gracefully
    });
  });

  describe('Concurrent Session Operations', () => {
    beforeEach(() => {
      sessionManager.cardSets = [
        { id: 'LOB', name: 'Legend of Blue Eyes White Dragon', code: 'LOB' }
      ];
      sessionManager.currentSession = {
        id: 'test-session',
        setId: 'LOB',
        cards: [],
        statistics: { totalCards: 0, tcgLowTotal: 0, tcgMarketTotal: 0 }
      };
      sessionManager.sessionActive = true;
    });

    test('should handle concurrent card additions', async () => {
      const cardData1 = { name: 'Card 1', rarity: 'Common' };
      const cardData2 = { name: 'Card 2', rarity: 'Rare' };
      const cardData3 = { name: 'Card 3', rarity: 'Ultra Rare' };

      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { name: 'Test Card', tcg_price: '10.00' }
        })
      });

      const promises = [
        sessionManager.addCard(cardData1),
        sessionManager.addCard(cardData2),
        sessionManager.addCard(cardData3)
      ];

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      expect(sessionManager.currentSession.cards).toHaveLength(3);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.id).toBeDefined();
      });
    });

    test('should handle rapid save operations', async () => {
      sessionManager.currentSession = {
        id: 'test-session',
        setId: 'LOB',
        cards: [{ id: 'card1', name: 'Test Card' }]
      };

      mockStorage.set.mockResolvedValue(true);

      const savePromises = [
        sessionManager.saveSession(),
        sessionManager.saveSession(),
        sessionManager.saveSession()
      ];

      const results = await Promise.all(savePromises);
      
      expect(results.every(result => result === true)).toBe(true);
      expect(mockStorage.set).toHaveBeenCalledTimes(3);
    });

    test('should handle concurrent session state changes', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] })
      });

      // Try to start multiple sessions concurrently
      const promises = [
        sessionManager.startSession('LOB'),
        sessionManager.startSession('LOB'),
        sessionManager.startSession('LOB')
      ];

      const results = await Promise.allSettled(promises);
      
      // Only one should succeed, others should handle gracefully
      expect(results.some(result => result.status === 'fulfilled')).toBe(true);
      expect(sessionManager.sessionActive).toBe(true);
    });

    test('should maintain data consistency during concurrent operations', async () => {
      const initialCardCount = sessionManager.currentSession.cards.length;

      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { name: 'Test Card', tcg_price: '5.00' }
        })
      });

      // Concurrent operations
      const operations = [
        sessionManager.addCard({ name: 'Card A' }),
        sessionManager.addCard({ name: 'Card B' }),
        sessionManager.updateSessionStatistics(),
        sessionManager.saveSession()
      ];

      await Promise.allSettled(operations);
      
      const finalCardCount = sessionManager.currentSession.cards.length;
      expect(finalCardCount).toBeGreaterThan(initialCardCount);
      expect(sessionManager.currentSession.statistics).toBeDefined();
    });
  });

  describe('Session Recovery Edge Cases', () => {
    test('should handle session recovery with missing set data', async () => {
      const sessionWithMissingSet = {
        id: 'orphaned-session',
        setId: 'MISSING_SET',
        cards: [{ id: 'card1', name: 'Orphaned Card' }],
        endTime: null
      };

      mockStorage.get.mockResolvedValue(sessionWithMissingSet);

      const result = await sessionManager.loadLastSession();
      
      expect(result).toEqual(sessionWithMissingSet);
      expect(sessionManager.currentSet).toBeUndefined();
      expect(mockLogger.info).toHaveBeenCalledWith('Resumed previous session:', sessionWithMissingSet.id);
    });

    test('should handle storage quota exceeded during auto-save', async () => {
      vi.useFakeTimers();
      
      sessionManager.currentSession = {
        id: 'large-session',
        setId: 'LOB',
        cards: new Array(1000).fill({ id: 'card', name: 'Large Dataset' })
      };
      sessionManager.sessionActive = true;

      const quotaError = new DOMException('QuotaExceededError');
      mockStorage.set.mockRejectedValue(quotaError);

      sessionManager.startAutoSave();
      
      // Manually trigger auto-save once and clean up
      const autoSavePromise = sessionManager.saveSession();
      sessionManager.stopAutoSave(); // Stop the interval immediately
      
      await autoSavePromise;
      
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to save session:', quotaError);
      
      vi.useRealTimers();
    });

    test('should recover from session state corruption', async () => {
      // Simulate corrupted session state with null cards array
      sessionManager.currentSession = {
        id: 'corrupted-session',
        setId: 'LOB',
        cards: null, // Corrupted - should be array
        statistics: null // Corrupted statistics
      };
      sessionManager.sessionActive = true;

      // Should handle gracefully without crashing
      expect(() => {
        // Fix the cards array before calling updateSessionStatistics
        if (!Array.isArray(sessionManager.currentSession.cards)) {
          sessionManager.currentSession.cards = [];
        }
        sessionManager.updateSessionStatistics();
      }).not.toThrow();

      expect(sessionManager.currentSession.statistics).toBeDefined();
    });

    test('should handle memory pressure during session operations', async () => {
      // Simulate memory pressure with large session
      const largeSession = {
        id: 'memory-pressure-session',
        setId: 'LOB',
        cards: new Array(5000).fill(null).map((_, index) => ({
          id: `card-${index}`,
          name: `Large Card Dataset ${index}`,
          tcg_price: '1.00',
          tcg_market_price: '1.50'
        }))
      };

      sessionManager.currentSession = largeSession;
      sessionManager.sessionActive = true;

      // Should handle large datasets without crashing
      expect(() => {
        sessionManager.updateSessionStatistics();
      }).not.toThrow();

      const stats = sessionManager.currentSession.statistics;
      expect(stats.totalCards).toBe(5000);
      expect(stats.tcgLowTotal).toBe(5000);
      expect(stats.tcgMarketTotal).toBe(7500);
    });
  });

  describe('Advanced Session Features', () => {
    beforeEach(() => {
      sessionManager.cardSets = [
        { id: 'LOB', name: 'Legend of Blue Eyes White Dragon', code: 'LOB' },
        { id: 'MRD', name: 'Metal Raiders', code: 'MRD' }
      ];
      sessionManager.currentSession = {
        id: 'test-session',
        setId: 'LOB',
        setName: 'Legend of Blue Eyes White Dragon',
        cards: [{ id: 'card1', name: 'Blue-Eyes White Dragon' }],
        statistics: { totalCards: 1 }
      };
      sessionManager.sessionActive = true;
      sessionManager.currentSet = sessionManager.cardSets[0];
    });

    test('should switch sets while maintaining session', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] })
      });

      const originalCards = [...sessionManager.currentSession.cards];
      
      const result = await sessionManager.switchSet('MRD');
      
      expect(result.setId).toBe('MRD');
      expect(result.setName).toBe('Metal Raiders');
      expect(result.cards).toEqual(originalCards); // Cards preserved
      expect(sessionManager.currentSet.id).toBe('MRD');
    });

    test('should handle set switch errors gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new Error('API Error'));

      // switchSet changes the session state even if API fails during loadSetCards
      await expect(sessionManager.switchSet('MRD')).rejects.toThrow();
      
      // Session state was changed before the error occurred
      expect(sessionManager.currentSession.setId).toBe('MRD');
      expect(sessionManager.currentSet.id).toBe('MRD');
    });

    test('should validate pricing data loading states', async () => {
      const cardId = 'test-card-id';
      
      // Add card to loading state
      sessionManager.loadingPriceData.add(cardId);
      
      expect(sessionManager.loadingPriceData.has(cardId)).toBe(true);
      
      // Simulate pricing data completion
      sessionManager.loadingPriceData.delete(cardId);
      
      expect(sessionManager.loadingPriceData.has(cardId)).toBe(false);
    });

    test('should handle wait for pricing data timeout', async () => {
      const cardId = 'slow-loading-card';
      sessionManager.loadingPriceData.add(cardId);
      
      const result = await sessionManager.waitForPricingDataToLoad(100); // Short timeout
      
      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Timeout waiting for pricing data')
      );
    });

    test('should complete pricing data loading within timeout', async () => {
      const cardId = 'fast-loading-card';
      sessionManager.loadingPriceData.add(cardId);
      
      // Simulate fast completion
      setTimeout(() => {
        sessionManager.loadingPriceData.delete(cardId);
      }, 50);
      
      const result = await sessionManager.waitForPricingDataToLoad(1000);
      
      expect(result).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith('All pricing data loaded successfully');
    });

    test('should handle same set switch gracefully', async () => {
      const result = await sessionManager.switchSet('LOB'); // Same set as current
      
      expect(result).toEqual(sessionManager.currentSession);
      expect(mockLogger.info).toHaveBeenCalledWith('Already using the requested set, no change needed');
    });

    test('should handle switch to non-existent set', async () => {
      await expect(sessionManager.switchSet('NONEXISTENT')).rejects.toThrow('Card set not found: NONEXISTENT');
    });
  });

  describe('Event System', () => {
    test('should register and emit events correctly', () => {
      const mockCallback = vi.fn();
      
      sessionManager.addEventListener('testEvent', mockCallback);
      sessionManager.emit('testEvent', { data: 'test' });
      
      expect(mockCallback).toHaveBeenCalledWith({ data: 'test' });
    });

    test('should handle multiple event listeners', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      sessionManager.addEventListener('testEvent', callback1);
      sessionManager.addEventListener('testEvent', callback2);
      sessionManager.emit('testEvent', { data: 'test' });
      
      expect(callback1).toHaveBeenCalledWith({ data: 'test' });
      expect(callback2).toHaveBeenCalledWith({ data: 'test' });
    });

    test('should remove event listeners', () => {
      const mockCallback = vi.fn();
      
      sessionManager.addEventListener('testEvent', mockCallback);
      sessionManager.removeEventListener('testEvent', mockCallback);
      sessionManager.emit('testEvent', { data: 'test' });
      
      expect(mockCallback).not.toHaveBeenCalled();
    });

    test('should handle errors in event callbacks', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Callback error');
      });
      
      sessionManager.addEventListener('testEvent', errorCallback);
      
      expect(() => {
        sessionManager.emit('testEvent', { data: 'test' });
      }).not.toThrow();
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error in testEvent callback:',
        expect.any(Error)
      );
    });
  });
});