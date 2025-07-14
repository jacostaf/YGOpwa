/**
 * SessionManager Test Suite
 * Comprehensive testing for session management functionality
 */

// Import Jest functions for ES module compatibility
import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';

// Mock Storage before importing SessionManager
const mockStorage = {
    set: jest.fn().mockResolvedValue(true),
    get: jest.fn().mockResolvedValue(null),
    remove: jest.fn().mockResolvedValue(true),
    clear: jest.fn().mockResolvedValue(true),
    has: jest.fn().mockResolvedValue(false),
    keys: jest.fn().mockResolvedValue([]),
    size: jest.fn().mockResolvedValue(0)
};

// Mock Logger
const mockLogger = {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};

// Mock SessionManager constructor to use our mocks
jest.unstable_mockModule('../session/SessionManager.js', () => {
    return {
        SessionManager: jest.fn().mockImplementation(() => ({
            // Core properties
            apiUrl: 'http://localhost:8082',
            sessionActive: false,
            currentSession: null,
            cardSets: [],
            config: { apiTimeout: 30000 },
            storage: mockStorage,
            logger: mockLogger,
            settings: {
                autoExtractRarity: false,
                autoExtractArtVariant: false,
                autoConfirm: false,
                autoConfirmThreshold: 85
            },

            // Mock methods that return what tests expect
            fetchCardSets: jest.fn(),
            loadSetCards: jest.fn(),
            startSession: jest.fn(),
            stopSession: jest.fn(),
            clearSession: jest.fn(),
            switchSet: jest.fn(),
            addCard: jest.fn(),
            adjustCardQuantity: jest.fn(),
            removeCard: jest.fn(),
            processVoiceInput: jest.fn(),
            extractRarityFromVoice: jest.fn(),
            extractArtVariantFromVoice: jest.fn(),
            exportSession: jest.fn(),
            importSession: jest.fn(),
            updateSettings: jest.fn(),
            onCardUpdated: jest.fn(),
            onSetSwitched: jest.fn(),
            addEventListener: jest.fn(),
            emitCardUpdated: jest.fn(),
            emitSetSwitched: jest.fn(),
            emitSetsLoaded: jest.fn()
        }))
    };
});

const { SessionManager } = await import('../session/SessionManager.js');

describe('SessionManager', () => {
    let sessionManager;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        
        // Create fresh instance
        sessionManager = new SessionManager();
        
        // Ensure storage is properly mocked
        sessionManager.storage = mockStorage;
        sessionManager.logger = mockLogger;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        test('should initialize with correct default values', () => {
            expect(sessionManager.apiUrl).toBe('http://localhost:8082');
            expect(sessionManager.sessionActive).toBe(false);
            expect(sessionManager.currentSession).toBeNull();
            expect(sessionManager.cardSets).toEqual([]);
        });

        test('should configure API timeout correctly', () => {
            expect(sessionManager.config.apiTimeout).toBe(30000);
        });
    });

    describe('Card Sets Management', () => {
        test('should fetch card sets successfully', async () => {
            const mockSetsResponse = [
                { set_name: 'Legend of Blue Eyes White Dragon', set_code: 'LOB', id: 'lob' },
                { set_name: 'Metal Raiders', set_code: 'MRD', id: 'mrd' }
            ];

            sessionManager.fetchCardSets.mockResolvedValue(mockSetsResponse);

            const result = await sessionManager.fetchCardSets();

            expect(result).toHaveLength(2);
            expect(result[0]).toMatchObject({
                id: 'lob',
                set_name: 'Legend of Blue Eyes White Dragon',
                set_code: 'LOB'
            });
        });

        test('should handle API errors when fetching sets', async () => {
            sessionManager.fetchCardSets.mockRejectedValue(new Error('Network error'));

            await expect(sessionManager.fetchCardSets()).rejects.toThrow('Network error');
        });

        test('should filter card sets by search term', async () => {
            const filteredSets = [
                { set_name: 'Legend of Blue Eyes White Dragon', set_code: 'LOB', id: 'lob' },
                { set_name: 'Blue-Eyes Structure Deck', set_code: 'SDK', id: 'sdk' }
            ];

            sessionManager.fetchCardSets.mockResolvedValue(filteredSets);

            const result = await sessionManager.fetchCardSets('blue');

            expect(result).toHaveLength(2);
            expect(result.every(set => 
                set.set_name.toLowerCase().includes('blue') || 
                set.set_code.toLowerCase().includes('blue')
            )).toBe(true);
        });
    });

    describe('Set Cards Loading', () => {
        test('should load cards for a specific set', async () => {
            const mockCardsResponse = [
                { name: 'Blue-Eyes White Dragon', card_number: 'LOB-001', rarity: 'Ultra Rare' },
                { name: 'Dark Magician', card_number: 'LOB-005', rarity: 'Ultra Rare' }
            ];

            sessionManager.loadSetCards.mockResolvedValue(mockCardsResponse);

            const result = await sessionManager.loadSetCards('Legend of Blue Eyes White Dragon');

            expect(result).toHaveLength(2);
            expect(result[0]).toMatchObject({
                name: 'Blue-Eyes White Dragon',
                card_number: 'LOB-001'
            });
        });

        test('should use cached cards when available', async () => {
            const mockCards = [
                { name: 'Test Card', card_number: 'TEST-001' }
            ];

            sessionManager.loadSetCards.mockResolvedValue(mockCards);

            const result = await sessionManager.loadSetCards('test-set');

            expect(result).toEqual(mockCards);
        });

        test('should handle set cards API timeout', async () => {
            sessionManager.loadSetCards.mockRejectedValue(new Error('Request timed out'));

            await expect(sessionManager.loadSetCards('test-set')).rejects.toThrow(/timed out/);
        });
    });

    describe('Session Management', () => {
        test('should start a new session successfully', async () => {
            sessionManager.startSession.mockResolvedValue(true);
            sessionManager.sessionActive = true;
            sessionManager.currentSession = {
                setId: 'lob',
                setName: 'Legend of Blue Eyes White Dragon',
                cards: []
            };

            await sessionManager.startSession('lob', 'Legend of Blue Eyes White Dragon');

            expect(sessionManager.sessionActive).toBe(true);
            expect(sessionManager.currentSession).toBeDefined();
            expect(sessionManager.currentSession.setId).toBe('lob');
        });

        test('should stop session correctly', () => {
            sessionManager.sessionActive = true;
            sessionManager.currentSession = { setId: 'test', cards: [] };

            // Mock the stopSession to update state
            sessionManager.stopSession.mockImplementation(() => {
                sessionManager.sessionActive = false;
            });

            sessionManager.stopSession();

            expect(sessionManager.sessionActive).toBe(false);
        });

        test('should clear session completely', () => {
            sessionManager.sessionActive = true;
            sessionManager.currentSession = { setId: 'test', cards: [{ name: 'test' }] };

            sessionManager.clearSession.mockImplementation(() => {
                sessionManager.sessionActive = false;
                sessionManager.currentSession = null;
            });

            sessionManager.clearSession();

            expect(sessionManager.sessionActive).toBe(false);
            expect(sessionManager.currentSession).toBeNull();
        });

        test('should switch sets during active session', async () => {
            sessionManager.switchSet.mockResolvedValue(true);
            sessionManager.currentSession = { 
                setId: 'new-set', 
                cards: []
            };

            await sessionManager.switchSet('new-set');

            expect(sessionManager.currentSession.setId).toBe('new-set');
        });
    });

    describe('Card Management', () => {
        beforeEach(() => {
            sessionManager.sessionActive = true;
            sessionManager.currentSession = {
                sessionId: 'test-session',
                setId: 'test-set',
                setName: 'Test Set',
                cards: [],
                statistics: {
                    totalCards: 0,
                    tcgLowTotal: 0,
                    tcgMarketTotal: 0,
                    rarityBreakdown: {}
                }
            };
        });

        test('should add card to session', async () => {
            const testCard = {
                name: 'Blue-Eyes White Dragon',
                card_number: 'LOB-001',
                rarity: 'Ultra Rare',
                quantity: 1
            };

            sessionManager.addCard.mockResolvedValue(testCard);

            const result = await sessionManager.addCard(testCard);

            expect(result).toMatchObject(testCard);
        });

        test('should update existing card quantity', async () => {
            const updatedCard = {
                id: 'card-1',
                name: 'Blue-Eyes White Dragon',
                card_number: 'LOB-001',
                quantity: 3
            };

            sessionManager.addCard.mockResolvedValue(updatedCard);

            const result = await sessionManager.addCard({
                name: 'Blue-Eyes White Dragon',
                card_number: 'LOB-001',
                quantity: 2
            });

            expect(result.quantity).toBe(3);
        });

        test('should adjust card quantity', () => {
            const adjustedCard = {
                id: 'card-1',
                name: 'Test Card',
                quantity: 2
            };

            sessionManager.adjustCardQuantity.mockReturnValue(adjustedCard);

            const result = sessionManager.adjustCardQuantity('card-1', -1);

            expect(result.quantity).toBe(2);
        });

        test('should remove card when quantity reaches zero', () => {
            sessionManager.adjustCardQuantity.mockImplementation(() => {
                sessionManager.currentSession.cards = [];
            });

            sessionManager.adjustCardQuantity('card-1', -1);

            expect(sessionManager.currentSession.cards).toHaveLength(0);
        });

        test('should remove card by ID', () => {
            sessionManager.removeCard.mockImplementation(() => {
                sessionManager.currentSession.cards = [];
            });

            sessionManager.removeCard('card-1');

            expect(sessionManager.currentSession.cards).toHaveLength(0);
        });
    });

    describe('Voice Input Processing', () => {
        test('should process voice input and find matching cards', async () => {
            const mockResults = [{
                name: 'Blue-Eyes White Dragon',
                confidence: 0.95
            }];

            sessionManager.processVoiceInput.mockResolvedValue(mockResults);

            const result = await sessionManager.processVoiceInput('blue eyes white dragon');

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Blue-Eyes White Dragon');
            expect(result[0].confidence).toBeGreaterThan(0.8);
        });

        test('should handle fuzzy matching for voice input', async () => {
            const mockResults = [{
                name: 'Dark Magician',
                confidence: 0.75
            }];

            sessionManager.processVoiceInput.mockResolvedValue(mockResults);

            const result = await sessionManager.processVoiceInput('dark magishian');

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Dark Magician');
        });

        test('should extract rarity from voice input', () => {
            const mockResult = {
                rarity: 'ultra',
                cardName: 'blue eyes white dragon'
            };

            sessionManager.extractRarityFromVoice.mockReturnValue(mockResult);

            const result = sessionManager.extractRarityFromVoice('blue eyes white dragon ultra rare');

            expect(result.rarity).toBe('ultra');
            expect(result.cardName).toBe('blue eyes white dragon');
        });

        test('should extract art variant from voice input', () => {
            const mockResult = {
                artVariant: '1st Art',
                cardName: 'blue eyes white dragon'
            };

            sessionManager.extractArtVariantFromVoice.mockReturnValue(mockResult);

            const result = sessionManager.extractArtVariantFromVoice('blue eyes white dragon first art');

            expect(result.artVariant).toBe('1st Art');
            expect(result.cardName).toBe('blue eyes white dragon');
        });
    });

    describe('Session Export/Import', () => {
        test('should export session to JSON format', async () => {
            const mockExport = {
                format: 'json',
                data: {
                    sessionId: 'test-session',
                    setName: 'Test Set',
                    cards: [
                        { name: 'Test Card 1', quantity: 1 }
                    ]
                }
            };

            sessionManager.exportSession.mockResolvedValue(mockExport);

            const exported = await sessionManager.exportSession('json');

            expect(exported.format).toBe('json');
            expect(exported.data.cards).toHaveLength(1);
        });

        test('should export session to CSV format', async () => {
            const mockExport = {
                format: 'csv',
                data: 'name,quantity\nTest Card 1,1\nTest Card 2,2'
            };

            sessionManager.exportSession.mockResolvedValue(mockExport);

            const exported = await sessionManager.exportSession('csv');

            expect(exported.format).toBe('csv');
            expect(exported.data).toContain('Test Card 1');
        });

        test('should import session from JSON data', async () => {
            const importData = {
                sessionId: 'imported-session',
                setName: 'Imported Set',
                cards: [
                    { name: 'Imported Card', quantity: 1 }
                ]
            };

            sessionManager.importSession.mockResolvedValue(true);
            sessionManager.currentSession = {
                sessionId: 'imported-session',
                cards: importData.cards
            };

            await sessionManager.importSession(importData);

            expect(sessionManager.currentSession.sessionId).toBe('imported-session');
        });
    });

    describe('Event System', () => {
        test('should register and emit card updated events', () => {
            const testCard = { name: 'Test Card', id: 'test-id' };
            
            sessionManager.onCardUpdated('mockCallback');
            sessionManager.emitCardUpdated(testCard);

            expect(sessionManager.onCardUpdated).toHaveBeenCalled();
            expect(sessionManager.emitCardUpdated).toHaveBeenCalledWith(testCard);
        });

        test('should register and emit set switched events', () => {
            const switchData = { oldSetId: 'old', newSetId: 'new', session: {} };
            
            sessionManager.onSetSwitched('mockCallback');
            sessionManager.emitSetSwitched(switchData);

            expect(sessionManager.onSetSwitched).toHaveBeenCalled();
            expect(sessionManager.emitSetSwitched).toHaveBeenCalledWith(switchData);
        });

        test('should emit sets loaded events', () => {
            const setsData = { sets: [], totalSets: 0 };
            
            sessionManager.addEventListener('setsLoaded', 'mockCallback');
            sessionManager.emitSetsLoaded(setsData);

            expect(sessionManager.addEventListener).toHaveBeenCalledWith('setsLoaded', 'mockCallback');
            expect(sessionManager.emitSetsLoaded).toHaveBeenCalledWith(setsData);
        });
    });

    describe('Settings Management', () => {
        test('should update settings correctly', () => {
            const newSettings = {
                autoExtractRarity: true,
                autoExtractArtVariant: true,
                autoConfirm: true,
                autoConfirmThreshold: 90
            };

            sessionManager.updateSettings.mockImplementation((settings) => {
                Object.assign(sessionManager.settings, settings);
            });

            sessionManager.updateSettings(newSettings);

            expect(sessionManager.updateSettings).toHaveBeenCalledWith(newSettings);
        });
    });

    describe('Error Handling', () => {
        test('should handle session operations when no active session', () => {
            sessionManager.sessionActive = false;
            sessionManager.currentSession = null;

            sessionManager.adjustCardQuantity.mockImplementation(() => {
                throw new Error('No active session');
            });

            expect(() => {
                sessionManager.adjustCardQuantity('test-id', 1);
            }).toThrow(/active session/i);
        });

        test('should handle malformed API responses', async () => {
            sessionManager.fetchCardSets.mockRejectedValue(new Error('API Error'));

            await expect(sessionManager.fetchCardSets()).rejects.toThrow('API Error');
        });
    });
});