/**
 * Session Manager Tests
 * 
 * Comprehensive tests for the SessionManager to ensure robust
 * session management, storage operations, and data integrity.
 */

import { SessionManager } from '../session/SessionManager.js';
import { Logger } from '../utils/Logger.js';
import { Storage } from '../utils/Storage.js';

// Test framework setup
class TestFramework {
    constructor() {
        this.tests = [];
        this.results = [];
        this.logger = new Logger('SessionTests');
    }

    describe(name, testFn) {
        console.group(`🧪 ${name}`);
        testFn();
        console.groupEnd();
    }

    test(name, testFn) {
        this.tests.push({ name, testFn });
    }

    async runAll() {
        console.log('🚀 Running Session Manager Tests...');
        
        for (const test of this.tests) {
            try {
                console.time(test.name);
                await test.testFn();
                console.timeEnd(test.name);
                console.log(`✅ ${test.name}`);
                this.results.push({ name: test.name, status: 'passed' });
            } catch (error) {
                console.error(`❌ ${test.name}:`, error);
                this.results.push({ name: test.name, status: 'failed', error });
            }
        }

        this.printResults();
        return this.results;
    }

    printResults() {
        const passed = this.results.filter(r => r.status === 'passed').length;
        const failed = this.results.filter(r => r.status === 'failed').length;
        
        console.log('\n📊 Test Results:');
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📈 Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%`);
    }

    expect(actual) {
        return {
            toBe: (expected) => {
                if (actual !== expected) {
                    throw new Error(`Expected ${expected}, got ${actual}`);
                }
            },
            toEqual: (expected) => {
                if (JSON.stringify(actual) !== JSON.stringify(expected)) {
                    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
                }
            },
            toBeTruthy: () => {
                if (!actual) {
                    throw new Error(`Expected truthy value, got ${actual}`);
                }
            },
            toBeFalsy: () => {
                if (actual) {
                    throw new Error(`Expected falsy value, got ${actual}`);
                }
            },
            toThrow: () => {
                let threw = false;
                try {
                    if (typeof actual === 'function') {
                        actual();
                    }
                } catch (error) {
                    threw = true;
                }
                if (!threw) {
                    throw new Error('Expected function to throw');
                }
            },
            toContain: (expected) => {
                if (!actual.includes(expected)) {
                    throw new Error(`Expected ${actual} to contain ${expected}`);
                }
            },
            toBeGreaterThan: (expected) => {
                if (!(actual > expected)) {
                    throw new Error(`Expected ${actual} to be greater than ${expected}`);
                }
            },
            toBeLessThan: (expected) => {
                if (!(actual < expected)) {
                    throw new Error(`Expected ${actual} to be less than ${expected}`);
                }
            }
        };
    }
}

// Mock Storage for testing
class MockStorage {
    constructor() {
        this.data = new Map();
    }

    async get(key) {
        return this.data.get(key);
    }

    async set(key, value) {
        this.data.set(key, value);
    }

    async remove(key) {
        this.data.delete(key);
    }

    async clear() {
        this.data.clear();
    }

    async keys() {
        return Array.from(this.data.keys());
    }

    async initialize() {
        // Mock initialization
        return true;
    }
}

// Test suite
const framework = new TestFramework();

framework.describe('SessionManager Initialization Tests', () => {
    framework.test('should create session manager with default settings', async () => {
        const sessionManager = new SessionManager();
        
        framework.expect(sessionManager).toBeTruthy();
        framework.expect(sessionManager.sessionActive).toBeFalsy();
        framework.expect(sessionManager.currentSession).toBe(null);
        framework.expect(Array.isArray(sessionManager.sessionHistory)).toBeTruthy();
        framework.expect(Array.isArray(sessionManager.cardSets)).toBeTruthy();
    });

    framework.test('should initialize with custom storage and logger', async () => {
        const mockStorage = new MockStorage();
        const logger = new Logger('TestSession');
        const sessionManager = new SessionManager(mockStorage, logger);
        
        framework.expect(sessionManager.storage).toBe(mockStorage);
        framework.expect(sessionManager.logger).toBe(logger);
    });

    framework.test('should initialize with storage successfully', async () => {
        const mockStorage = new MockStorage();
        const sessionManager = new SessionManager();
        
        await sessionManager.initialize(mockStorage);
        
        framework.expect(sessionManager.storage).toBe(mockStorage);
    });

    framework.test('should update settings correctly', async () => {
        const sessionManager = new SessionManager();
        const newSettings = {
            autoExtractRarity: true,
            autoExtractArtVariant: true
        };
        
        sessionManager.updateSettings(newSettings);
        
        framework.expect(sessionManager.settings.autoExtractRarity).toBeTruthy();
        framework.expect(sessionManager.settings.autoExtractArtVariant).toBeTruthy();
    });
});

framework.describe('Session Management Tests', () => {
    let sessionManager;
    let mockStorage;

    framework.test('should start session with valid set', async () => {
        mockStorage = new MockStorage();
        sessionManager = new SessionManager(mockStorage);
        
        // Mock card sets data
        sessionManager.cardSets = [
            { id: 'LOB', name: 'Legend of Blue Eyes White Dragon', code: 'LOB' }
        ];
        
        await sessionManager.startSession('LOB');
        
        framework.expect(sessionManager.sessionActive).toBeTruthy();
        framework.expect(sessionManager.currentSession).toBeTruthy();
        framework.expect(sessionManager.currentSession.setId).toBe('LOB');
        framework.expect(sessionManager.currentSession.setName).toBe('Legend of Blue Eyes White Dragon');
    });

    framework.test('should throw error when starting session with invalid set', async () => {
        const sessionManager = new SessionManager();
        
        try {
            await sessionManager.startSession('INVALID_SET');
            framework.expect(false).toBeTruthy(); // Should not reach here
        } catch (error) {
            framework.expect(error.message).toContain('not found');
        }
    });

    framework.test('should stop session correctly', async () => {
        mockStorage = new MockStorage();
        sessionManager = new SessionManager(mockStorage);
        
        // Start a session first
        sessionManager.cardSets = [
            { id: 'LOB', name: 'Legend of Blue Eyes White Dragon', code: 'LOB' }
        ];
        await sessionManager.startSession('LOB');
        
        // Stop the session
        sessionManager.stopSession();
        
        framework.expect(sessionManager.sessionActive).toBeFalsy();
        framework.expect(sessionManager.currentSession).toBe(null);
    });

    framework.test('should clear session correctly', async () => {
        mockStorage = new MockStorage();
        sessionManager = new SessionManager(mockStorage);
        
        // Start session and add some cards
        sessionManager.cardSets = [
            { id: 'LOB', name: 'Legend of Blue Eyes White Dragon', code: 'LOB' }
        ];
        await sessionManager.startSession('LOB');
        
        // Add a card
        await sessionManager.addCard({
            name: 'Blue-Eyes White Dragon',
            rarity: 'Ultra Rare',
            cardNumber: '001',
            quantity: 1
        });
        
        // Clear session
        sessionManager.clearSession();
        
        framework.expect(sessionManager.currentSession.cards.length).toBe(0);
        framework.expect(sessionManager.currentSession.totalCards).toBe(0);
        framework.expect(sessionManager.currentSession.totalValue).toBe(0);
    });

    framework.test('should get current session info', async () => {
        mockStorage = new MockStorage();
        sessionManager = new SessionManager(mockStorage);
        
        // Test when no session is active
        let sessionInfo = sessionManager.getCurrentSessionInfo();
        framework.expect(sessionInfo.active).toBeFalsy();
        
        // Start a session
        sessionManager.cardSets = [
            { id: 'LOB', name: 'Legend of Blue Eyes White Dragon', code: 'LOB' }
        ];
        await sessionManager.startSession('LOB');
        
        sessionInfo = sessionManager.getCurrentSessionInfo();
        framework.expect(sessionInfo.active).toBeTruthy();
        framework.expect(sessionInfo.setName).toBe('Legend of Blue Eyes White Dragon');
        framework.expect(sessionInfo.totalCards).toBe(0);
        framework.expect(sessionInfo.totalValue).toBe(0);
    });
});

framework.describe('Card Management Tests', () => {
    let sessionManager;
    let mockStorage;

    framework.test('should add card to session', async () => {
        mockStorage = new MockStorage();
        sessionManager = new SessionManager(mockStorage);
        
        // Start session
        sessionManager.cardSets = [
            { id: 'LOB', name: 'Legend of Blue Eyes White Dragon', code: 'LOB' }
        ];
        await sessionManager.startSession('LOB');
        
        // Add a card
        const card = {
            name: 'Blue-Eyes White Dragon',
            rarity: 'Ultra Rare',
            cardNumber: '001',
            quantity: 1
        };
        
        await sessionManager.addCard(card);
        
        framework.expect(sessionManager.currentSession.cards.length).toBe(1);
        framework.expect(sessionManager.currentSession.totalCards).toBe(1);
        framework.expect(sessionManager.currentSession.cards[0].name).toBe('Blue-Eyes White Dragon');
    });

    framework.test('should update existing card quantity when adding duplicate', async () => {
        mockStorage = new MockStorage();
        sessionManager = new SessionManager(mockStorage);
        
        // Start session
        sessionManager.cardSets = [
            { id: 'LOB', name: 'Legend of Blue Eyes White Dragon', code: 'LOB' }
        ];
        await sessionManager.startSession('LOB');
        
        // Add same card twice
        const card = {
            name: 'Blue-Eyes White Dragon',
            rarity: 'Ultra Rare',
            cardNumber: '001',
            quantity: 1
        };
        
        await sessionManager.addCard(card);
        await sessionManager.addCard(card);
        
        framework.expect(sessionManager.currentSession.cards.length).toBe(1);
        framework.expect(sessionManager.currentSession.totalCards).toBe(2);
        framework.expect(sessionManager.currentSession.cards[0].quantity).toBe(2);
    });

    framework.test('should remove card from session', async () => {
        mockStorage = new MockStorage();
        sessionManager = new SessionManager(mockStorage);
        
        // Start session and add card
        sessionManager.cardSets = [
            { id: 'LOB', name: 'Legend of Blue Eyes White Dragon', code: 'LOB' }
        ];
        await sessionManager.startSession('LOB');
        
        const card = {
            name: 'Blue-Eyes White Dragon',
            rarity: 'Ultra Rare',
            cardNumber: '001',
            quantity: 1
        };
        
        await sessionManager.addCard(card);
        const cardId = sessionManager.currentSession.cards[0].id;
        
        // Remove the card
        const removedCard = sessionManager.removeCard(cardId);
        
        framework.expect(removedCard).toBeTruthy();
        framework.expect(sessionManager.currentSession.cards.length).toBe(0);
        framework.expect(sessionManager.currentSession.totalCards).toBe(0);
    });

    framework.test('should adjust card quantity', async () => {
        mockStorage = new MockStorage();
        sessionManager = new SessionManager(mockStorage);
        
        // Start session and add card
        sessionManager.cardSets = [
            { id: 'LOB', name: 'Legend of Blue Eyes White Dragon', code: 'LOB' }
        ];
        await sessionManager.startSession('LOB');
        
        const card = {
            name: 'Blue-Eyes White Dragon',
            rarity: 'Ultra Rare',
            cardNumber: '001',
            quantity: 2
        };
        
        await sessionManager.addCard(card);
        const cardId = sessionManager.currentSession.cards[0].id;
        
        // Adjust quantity
        const updatedCard = sessionManager.adjustCardQuantity(cardId, 1);
        
        framework.expect(updatedCard.quantity).toBe(3);
        framework.expect(sessionManager.currentSession.totalCards).toBe(3);
        
        // Adjust quantity down
        sessionManager.adjustCardQuantity(cardId, -2);
        framework.expect(sessionManager.currentSession.cards[0].quantity).toBe(1);
        framework.expect(sessionManager.currentSession.totalCards).toBe(1);
    });

    framework.test('should remove card when quantity becomes zero', async () => {
        mockStorage = new MockStorage();
        sessionManager = new SessionManager(mockStorage);
        
        // Start session and add card
        sessionManager.cardSets = [
            { id: 'LOB', name: 'Legend of Blue Eyes White Dragon', code: 'LOB' }
        ];
        await sessionManager.startSession('LOB');
        
        const card = {
            name: 'Blue-Eyes White Dragon',
            rarity: 'Ultra Rare',
            cardNumber: '001',
            quantity: 1
        };
        
        await sessionManager.addCard(card);
        const cardId = sessionManager.currentSession.cards[0].id;
        
        // Adjust quantity to zero
        sessionManager.adjustCardQuantity(cardId, -1);
        
        framework.expect(sessionManager.currentSession.cards.length).toBe(0);
        framework.expect(sessionManager.currentSession.totalCards).toBe(0);
    });
});

framework.describe('Voice Processing Tests', () => {
    let sessionManager;

    framework.test('should process voice input and extract rarity', async () => {
        sessionManager = new SessionManager();
        sessionManager.settings.autoExtractRarity = true;
        
        const result = sessionManager.extractRarityFromVoice('Blue-Eyes White Dragon ultra rare');
        
        framework.expect(result.cardName).toBe('Blue-Eyes White Dragon');
        framework.expect(result.rarity).toBe('Ultra Rare');
    });

    framework.test('should process voice input and extract art variant', async () => {
        sessionManager = new SessionManager();
        sessionManager.settings.autoExtractArtVariant = true;
        
        const result = sessionManager.extractArtVariantFromVoice('Blue-Eyes White Dragon art variant A');
        
        framework.expect(result.cardName).toBe('Blue-Eyes White Dragon');
        framework.expect(result.artVariant).toBe('A');
    });

    framework.test('should not extract when auto-extract is disabled', async () => {
        sessionManager = new SessionManager();
        sessionManager.settings.autoExtractRarity = false;
        sessionManager.settings.autoExtractArtVariant = false;
        
        const rarityResult = sessionManager.extractRarityFromVoice('Blue-Eyes White Dragon ultra rare');
        const artResult = sessionManager.extractArtVariantFromVoice('Blue-Eyes White Dragon art variant A');
        
        framework.expect(rarityResult.cardName).toBe('Blue-Eyes White Dragon ultra rare');
        framework.expect(rarityResult.rarity).toBe(null);
        framework.expect(artResult.cardName).toBe('Blue-Eyes White Dragon art variant A');
        framework.expect(artResult.artVariant).toBe(null);
    });

    framework.test('should process voice input with multiple extractions', async () => {
        sessionManager = new SessionManager();
        sessionManager.settings.autoExtractRarity = true;
        sessionManager.settings.autoExtractArtVariant = true;
        
        const transcript = 'Blue-Eyes White Dragon ultra rare art variant A';
        
        // Process through voice input pipeline
        const cards = await sessionManager.processVoiceInput(transcript);
        
        // Should return empty array since no session is active and no card sets loaded
        framework.expect(Array.isArray(cards)).toBeTruthy();
    });
});

framework.describe('Storage Operations Tests', () => {
    let sessionManager;
    let mockStorage;

    framework.test('should save session to storage', async () => {
        mockStorage = new MockStorage();
        sessionManager = new SessionManager(mockStorage);
        
        // Start session and add card
        sessionManager.cardSets = [
            { id: 'LOB', name: 'Legend of Blue Eyes White Dragon', code: 'LOB' }
        ];
        await sessionManager.startSession('LOB');
        
        await sessionManager.addCard({
            name: 'Blue-Eyes White Dragon',
            rarity: 'Ultra Rare',
            cardNumber: '001',
            quantity: 1
        });
        
        // Save session
        await sessionManager.saveSession();
        
        // Verify it was saved
        const savedSession = await mockStorage.get('currentSession');
        framework.expect(savedSession).toBeTruthy();
        framework.expect(savedSession.setName).toBe('Legend of Blue Eyes White Dragon');
        framework.expect(savedSession.cards.length).toBe(1);
    });

    framework.test('should load session from storage', async () => {
        mockStorage = new MockStorage();
        
        // Save a session first
        const sessionData = {
            setId: 'LOB',
            setName: 'Legend of Blue Eyes White Dragon',
            cards: [
                {
                    id: 'test-card-1',
                    name: 'Blue-Eyes White Dragon',
                    rarity: 'Ultra Rare',
                    cardNumber: '001',
                    quantity: 1
                }
            ],
            totalCards: 1,
            totalValue: 0,
            startTime: new Date().toISOString()
        };
        
        await mockStorage.set('currentSession', sessionData);
        
        // Create new session manager and load
        sessionManager = new SessionManager(mockStorage);
        await sessionManager.loadLastSession();
        
        framework.expect(sessionManager.sessionActive).toBeTruthy();
        framework.expect(sessionManager.currentSession.setName).toBe('Legend of Blue Eyes White Dragon');
        framework.expect(sessionManager.currentSession.cards.length).toBe(1);
        framework.expect(sessionManager.currentSession.totalCards).toBe(1);
    });

    framework.test('should handle missing session data gracefully', async () => {
        mockStorage = new MockStorage();
        sessionManager = new SessionManager(mockStorage);
        
        // Try to load when no session exists
        await sessionManager.loadLastSession();
        
        framework.expect(sessionManager.sessionActive).toBeFalsy();
        framework.expect(sessionManager.currentSession).toBe(null);
    });
});

framework.describe('Session Calculations Tests', () => {
    let sessionManager;
    let mockStorage;

    framework.test('should calculate session totals correctly', async () => {
        mockStorage = new MockStorage();
        sessionManager = new SessionManager(mockStorage);
        
        // Start session
        sessionManager.cardSets = [
            { id: 'LOB', name: 'Legend of Blue Eyes White Dragon', code: 'LOB' }
        ];
        await sessionManager.startSession('LOB');
        
        // Add cards with different quantities
        await sessionManager.addCard({
            name: 'Blue-Eyes White Dragon',
            rarity: 'Ultra Rare',
            cardNumber: '001',
            quantity: 2,
            estimatedPrice: 50.00
        });
        
        await sessionManager.addCard({
            name: 'Dark Magician',
            rarity: 'Ultra Rare',
            cardNumber: '002',
            quantity: 1,
            estimatedPrice: 30.00
        });
        
        // Calculate totals
        sessionManager.calculateSessionTotals();
        
        framework.expect(sessionManager.currentSession.totalCards).toBe(3);
        framework.expect(sessionManager.currentSession.totalValue).toBe(130.00); // (50*2) + (30*1)
    });

    framework.test('should handle pricing data correctly', async () => {
        mockStorage = new MockStorage();
        sessionManager = new SessionManager(mockStorage);
        
        // Start session
        sessionManager.cardSets = [
            { id: 'LOB', name: 'Legend of Blue Eyes White Dragon', code: 'LOB' }
        ];
        await sessionManager.startSession('LOB');
        
        // Add card
        await sessionManager.addCard({
            name: 'Blue-Eyes White Dragon',
            rarity: 'Ultra Rare',
            cardNumber: '001',
            quantity: 1
        });
        
        const cardId = sessionManager.currentSession.cards[0].id;
        
        // Update pricing data
        sessionManager.updateCardPricing(cardId, {
            tcgLow: 45.00,
            tcgMarket: 55.00,
            tcgHigh: 75.00,
            estimatedPrice: 55.00
        });
        
        const updatedCard = sessionManager.currentSession.cards[0];
        framework.expect(updatedCard.tcgLow).toBe(45.00);
        framework.expect(updatedCard.tcgMarket).toBe(55.00);
        framework.expect(updatedCard.estimatedPrice).toBe(55.00);
    });

    framework.test('should get session statistics', async () => {
        mockStorage = new MockStorage();
        sessionManager = new SessionManager(mockStorage);
        
        // Start session
        sessionManager.cardSets = [
            { id: 'LOB', name: 'Legend of Blue Eyes White Dragon', code: 'LOB' }
        ];
        await sessionManager.startSession('LOB');
        
        // Add cards
        await sessionManager.addCard({
            name: 'Blue-Eyes White Dragon',
            rarity: 'Ultra Rare',
            cardNumber: '001',
            quantity: 1,
            estimatedPrice: 50.00
        });
        
        await sessionManager.addCard({
            name: 'Dark Magician',
            rarity: 'Rare',
            cardNumber: '002',
            quantity: 2,
            estimatedPrice: 20.00
        });
        
        const stats = sessionManager.getSessionStatistics();
        
        framework.expect(stats.totalCards).toBe(3);
        framework.expect(stats.uniqueCards).toBe(2);
        framework.expect(stats.totalValue).toBe(90.00); // 50 + (20*2)
        framework.expect(stats.rarityBreakdown).toBeTruthy();
        framework.expect(stats.rarityBreakdown['Ultra Rare']).toBe(1);
        framework.expect(stats.rarityBreakdown['Rare']).toBe(2);
    });
});

framework.describe('Error Handling Tests', () => {
    framework.test('should handle card not found error', async () => {
        const sessionManager = new SessionManager();
        
        try {
            sessionManager.removeCard('non-existent-id');
            framework.expect(false).toBeTruthy(); // Should not reach here
        } catch (error) {
            framework.expect(error.message).toContain('not found');
        }
    });

    framework.test('should handle session not active error', async () => {
        const sessionManager = new SessionManager();
        
        try {
            await sessionManager.addCard({
                name: 'Test Card',
                rarity: 'Common',
                quantity: 1
            });
            framework.expect(false).toBeTruthy(); // Should not reach here
        } catch (error) {
            framework.expect(error.message).toContain('No active session');
        }
    });

    framework.test('should handle invalid card data', async () => {
        const mockStorage = new MockStorage();
        const sessionManager = new SessionManager(mockStorage);
        
        // Start session
        sessionManager.cardSets = [
            { id: 'LOB', name: 'Legend of Blue Eyes White Dragon', code: 'LOB' }
        ];
        await sessionManager.startSession('LOB');
        
        try {
            await sessionManager.addCard({
                // Missing required name field
                rarity: 'Common',
                quantity: 1
            });
            framework.expect(false).toBeTruthy(); // Should not reach here
        } catch (error) {
            framework.expect(error.message).toContain('Invalid card data');
        }
    });
});

framework.describe('Session Manager Error Boundary Tests', () => {
    framework.test('should handle safe session initialization with error recovery', async () => {
        const mockStorage = new MockStorage();
        const sessionManager = new SessionManager(mockStorage);
        
        // Mock storage failure during initialization
        mockStorage.get = async () => {
            throw new Error('Storage corrupted');
        };
        
        const result = await sessionManager.safeInitialize();
        
        // Should complete without throwing and return status
        framework.expect(typeof result).toBe('boolean');
    });

    framework.test('should handle safe card addition with validation fallback', async () => {
        const mockStorage = new MockStorage();
        const sessionManager = new SessionManager(mockStorage);
        
        // Start session first
        sessionManager.cardSets = [
            { id: 'TEST', name: 'Test Set', code: 'TEST' }
        ];
        await sessionManager.startSession('TEST');
        
        // Test adding invalid card data
        const invalidCard = {
            // Missing required name field
            rarity: 'Common',
            quantity: 1
        };
        
        const result = await sessionManager.safeAddCard(invalidCard);
        
        // Should handle gracefully with minimal data
        framework.expect(typeof result).toBe('boolean');
    });

    framework.test('should handle safe session save with storage error recovery', async () => {
        const mockStorage = new MockStorage();
        const sessionManager = new SessionManager(mockStorage);
        
        // Start session
        sessionManager.cardSets = [
            { id: 'TEST', name: 'Test Set', code: 'TEST' }
        ];
        await sessionManager.startSession('TEST');
        
        // Mock storage save failure
        mockStorage.set = async () => {
            throw new Error('Storage write failed');
        };
        
        const result = await sessionManager.safeSaveSession();
        
        // Should not throw - gracefully handle error
        framework.expect(typeof result).toBe('boolean');
    });

    framework.test('should handle safe session load with corrupted data recovery', async () => {
        const mockStorage = new MockStorage();
        const sessionManager = new SessionManager(mockStorage);
        
        // Mock corrupted session data
        await mockStorage.set('currentSession', 'invalid-json-data');
        
        const result = await sessionManager.safeLoadSession();
        
        // Should handle corrupted data gracefully
        framework.expect(typeof result).toBe('boolean');
        framework.expect(sessionManager.sessionActive).toBeFalsy();
    });

    framework.test('should handle safe voice processing with error boundaries', async () => {
        const sessionManager = new SessionManager();
        sessionManager.settings.autoExtractRarity = true;
        
        // Mock card search failure
        sessionManager.searchCards = async () => {
            throw new Error('Card search service unavailable');
        };
        
        const result = await sessionManager.safeProcessVoiceInput('Blue-Eyes White Dragon');
        
        // Should return empty array but not throw
        framework.expect(Array.isArray(result)).toBeTruthy();
        framework.expect(result.length).toBe(0);
    });

    framework.test('should handle safe data export with error recovery', async () => {
        const mockStorage = new MockStorage();
        const sessionManager = new SessionManager(mockStorage);
        
        // Start session and add card
        sessionManager.cardSets = [
            { id: 'TEST', name: 'Test Set', code: 'TEST' }
        ];
        await sessionManager.startSession('TEST');
        
        await sessionManager.addCard({
            name: 'Test Card',
            rarity: 'Common',
            quantity: 1
        });
        
        // Mock JSON stringify failure
        const originalStringify = JSON.stringify;
        JSON.stringify = () => {
            throw new Error('Circular reference');
        };
        
        const result = await sessionManager.safeExportSession('json');
        
        framework.expect(result).toBeTruthy();
        framework.expect(result.success).toBeFalsy();
        framework.expect(result.error).toContain('export failed');
        
        // Restore
        JSON.stringify = originalStringify;
    });

    framework.test('should handle safe card validation with error recovery', async () => {
        const sessionManager = new SessionManager();
        
        const invalidCards = [
            null,
            undefined,
            {},
            { name: '' },
            { name: 'Valid Name', quantity: 'invalid' },
            { name: 'Valid Name', quantity: -1 }
        ];
        
        for (const invalidCard of invalidCards) {
            const result = sessionManager.safeValidateCard(invalidCard);
            
            framework.expect(result).toBeTruthy();
            framework.expect(result.isValid).toBeFalsy();
            framework.expect(result.errors).toBeTruthy();
            framework.expect(Array.isArray(result.errors)).toBeTruthy();
        }
    });

    framework.test('should handle safe card quantity adjustment with bounds checking', async () => {
        const mockStorage = new MockStorage();
        const sessionManager = new SessionManager(mockStorage);
        
        // Start session and add card
        sessionManager.cardSets = [
            { id: 'TEST', name: 'Test Set', code: 'TEST' }
        ];
        await sessionManager.startSession('TEST');
        
        await sessionManager.addCard({
            name: 'Test Card',
            rarity: 'Common',
            quantity: 1
        });
        
        const cardId = sessionManager.currentSession.cards[0].id;
        
        // Test extreme adjustments
        const result1 = sessionManager.safeAdjustCardQuantity(cardId, -1000);
        framework.expect(result1.quantity).toBe(0); // Should not go negative
        
        const result2 = sessionManager.safeAdjustCardQuantity(cardId, 1000);
        framework.expect(result2.quantity).toBeLessThan(100); // Should have reasonable maximum
    });

    framework.test('should handle safe calculation with error recovery', async () => {
        const mockStorage = new MockStorage();
        const sessionManager = new SessionManager(mockStorage);
        
        // Start session and add cards with problematic pricing data
        sessionManager.cardSets = [
            { id: 'TEST', name: 'Test Set', code: 'TEST' }
        ];
        await sessionManager.startSession('TEST');
        
        await sessionManager.addCard({
            name: 'Test Card 1',
            rarity: 'Common',
            quantity: 1,
            estimatedPrice: 'invalid'
        });
        
        await sessionManager.addCard({
            name: 'Test Card 2',
            rarity: 'Common',
            quantity: 1,
            estimatedPrice: null
        });
        
        const result = sessionManager.safeCalculateSessionTotals();
        
        framework.expect(result).toBeTruthy();
        framework.expect(typeof result.totalValue).toBe('number');
        framework.expect(result.totalValue).toBe(0); // Should handle invalid prices
        framework.expect(result.totalCards).toBe(2);
    });
});

framework.describe('Session Manager Recovery Mechanisms Tests', () => {
    framework.test('should implement retry logic for transient storage failures', async () => {
        const mockStorage = new MockStorage();
        const sessionManager = new SessionManager(mockStorage);
        
        let attemptCount = 0;
        mockStorage.set = async (key, value) => {
            attemptCount++;
            if (attemptCount < 3) {
                throw new Error('Transient storage failure');
            }
            mockStorage.data.set(key, value);
        };
        
        sessionManager.cardSets = [
            { id: 'TEST', name: 'Test Set', code: 'TEST' }
        ];
        await sessionManager.startSession('TEST');
        
        const result = await sessionManager.saveSessionWithRetry(3);
        
        framework.expect(result).toBeTruthy();
        framework.expect(attemptCount).toBe(3);
    });

    framework.test('should provide fallback data when primary sources fail', async () => {
        const sessionManager = new SessionManager();
        
        // Mock card data source failure
        sessionManager.loadCardSets = async () => {
            throw new Error('Card data service unavailable');
        };
        
        const result = await sessionManager.safeLoadCardSetsWithFallback();
        
        framework.expect(result).toBeTruthy();
        framework.expect(Array.isArray(result.cardSets)).toBeTruthy();
        framework.expect(result.source).toBe('fallback');
    });

    framework.test('should handle safe session cleanup on errors', async () => {
        const mockStorage = new MockStorage();
        const sessionManager = new SessionManager(mockStorage);
        
        // Start session
        sessionManager.cardSets = [
            { id: 'TEST', name: 'Test Set', code: 'TEST' }
        ];
        await sessionManager.startSession('TEST');
        
        // Add some cards
        await sessionManager.addCard({
            name: 'Test Card',
            rarity: 'Common',
            quantity: 1
        });
        
        // Simulate critical error
        const error = new Error('Critical session error');
        error.name = 'CriticalError';
        
        await sessionManager.safeCleanupOnError(error);
        
        framework.expect(sessionManager.sessionActive).toBeFalsy();
        framework.expect(sessionManager.currentSession).toBe(null);
    });

    framework.test('should provide safe session status reporting', async () => {
        const sessionManager = new SessionManager();
        
        // Mock internal status corruption
        sessionManager._internalStatus = undefined;
        sessionManager.currentSession = { corrupted: true };
        
        const status = sessionManager.safeGetSessionStatus();
        
        framework.expect(status).toBeTruthy();
        framework.expect(typeof status.isActive).toBe('boolean');
        framework.expect(typeof status.totalCards).toBe('number');
        framework.expect(typeof status.totalValue).toBe('number');
        framework.expect(typeof status.errorCount).toBe('number');
        framework.expect(Array.isArray(status.recentErrors)).toBeTruthy();
    });

    framework.test('should handle safe import with data validation', async () => {
        const sessionManager = new SessionManager();
        
        const malformedData = [
            null,
            'invalid-json',
            { invalidStructure: true },
            { cards: 'not-an-array' },
            { cards: [{ invalidCard: true }] }
        ];
        
        for (const data of malformedData) {
            const result = await sessionManager.safeImportSession(data);
            
            framework.expect(result).toBeTruthy();
            framework.expect(result.success).toBeFalsy();
            framework.expect(result.error).toBeTruthy();
        }
    });
});

framework.describe('Session Manager Data Integrity Tests', () => {
    framework.test('should validate session data integrity during operations', async () => {
        const mockStorage = new MockStorage();
        const sessionManager = new SessionManager(mockStorage);
        
        sessionManager.cardSets = [
            { id: 'TEST', name: 'Test Set', code: 'TEST' }
        ];
        await sessionManager.startSession('TEST');
        
        // Corrupt session data
        sessionManager.currentSession.cards = 'not-an-array';
        
        const integrityCheck = sessionManager.validateSessionIntegrity();
        
        framework.expect(integrityCheck).toBeTruthy();
        framework.expect(integrityCheck.isValid).toBeFalsy();
        framework.expect(Array.isArray(integrityCheck.errors)).toBeTruthy();
        framework.expect(integrityCheck.errors.length).toBeGreaterThan(0);
    });

    framework.test('should handle safe card data sanitization', async () => {
        const sessionManager = new SessionManager();
        
        const unsafeCards = [
            {
                name: '<script>alert("xss")</script>Blue-Eyes',
                rarity: 'Ultra Rare',
                quantity: 1
            },
            {
                name: 'Valid Card',
                rarity: 'javascript:alert("xss")',
                quantity: 1
            },
            {
                name: 'Another Card',
                description: 'data:text/html,<script>alert("xss")</script>',
                quantity: 1
            }
        ];
        
        for (const unsafeCard of unsafeCards) {
            const sanitized = sessionManager.sanitizeCardData(unsafeCard);
            
            framework.expect(sanitized.name).not.toContain('<script>');
            framework.expect(sanitized.rarity).not.toContain('javascript:');
            framework.expect(sanitized.description || '').not.toContain('data:text/html');
        }
    });

    framework.test('should handle safe price data validation', async () => {
        const sessionManager = new SessionManager();
        
        const invalidPrices = [
            'not-a-number',
            -10,
            Infinity,
            NaN,
            { invalid: 'object' },
            null
        ];
        
        for (const invalidPrice of invalidPrices) {
            const result = sessionManager.validatePriceData({
                tcgLow: invalidPrice,
                tcgMarket: invalidPrice,
                tcgHigh: invalidPrice
            });
            
            framework.expect(result.isValid).toBeFalsy();
            framework.expect(Array.isArray(result.errors)).toBeTruthy();
        }
    });

    framework.test('should handle safe rarity extraction with error boundaries', async () => {
        const sessionManager = new SessionManager();
        sessionManager.settings.autoExtractRarity = true;
        
        const problematicInputs = [
            null,
            undefined,
            '',
            'a'.repeat(1000), // Very long string
            'special chars: 你好 🎮 ∑∆π',
            'multi\nline\ninput'
        ];
        
        for (const input of problematicInputs) {
            const result = sessionManager.safeExtractRarityFromVoice(input);
            
            framework.expect(result).toBeTruthy();
            framework.expect(typeof result.cardName).toBe('string');
            framework.expect(result.rarity === null || typeof result.rarity === 'string').toBeTruthy();
        }
    });
});

framework.describe('Session Manager Performance & Memory Tests', () => {
    framework.test('should handle large session data efficiently', async () => {
        const mockStorage = new MockStorage();
        const sessionManager = new SessionManager(mockStorage);
        
        sessionManager.cardSets = [
            { id: 'TEST', name: 'Test Set', code: 'TEST' }
        ];
        await sessionManager.startSession('TEST');
        
        // Add many cards to test performance
        const startTime = Date.now();
        
        for (let i = 0; i < 100; i++) {
            await sessionManager.addCard({
                name: `Test Card ${i}`,
                rarity: 'Common',
                quantity: 1,
                estimatedPrice: Math.random() * 100
            });
        }
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        framework.expect(sessionManager.currentSession.cards.length).toBe(100);
        framework.expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    });

    framework.test('should handle safe memory cleanup', async () => {
        const mockStorage = new MockStorage();
        const sessionManager = new SessionManager(mockStorage);
        
        sessionManager.cardSets = [
            { id: 'TEST', name: 'Test Set', code: 'TEST' }
        ];
        await sessionManager.startSession('TEST');
        
        // Add cards with large data
        for (let i = 0; i < 10; i++) {
            await sessionManager.addCard({
                name: `Test Card ${i}`,
                rarity: 'Common',
                quantity: 1,
                largeData: 'x'.repeat(10000) // Large string data
            });
        }
        
        // Perform memory cleanup
        const cleanupResult = sessionManager.performMemoryCleanup();
        
        framework.expect(cleanupResult).toBeTruthy();
        framework.expect(typeof cleanupResult.freedMemory).toBe('number');
        framework.expect(cleanupResult.success).toBeTruthy();
    });

    framework.test('should handle concurrent operations safely', async () => {
        const mockStorage = new MockStorage();
        const sessionManager = new SessionManager(mockStorage);
        
        sessionManager.cardSets = [
            { id: 'TEST', name: 'Test Set', code: 'TEST' }
        ];
        await sessionManager.startSession('TEST');
        
        // Simulate concurrent card additions
        const addPromises = [];
        for (let i = 0; i < 10; i++) {
            addPromises.push(sessionManager.safeAddCard({
                name: `Concurrent Card ${i}`,
                rarity: 'Common',
                quantity: 1
            }));
        }
        
        const results = await Promise.allSettled(addPromises);
        
        // All operations should complete without corruption
        const successfulOps = results.filter(r => r.status === 'fulfilled').length;
        framework.expect(successfulOps).toBeGreaterThan(0);
        framework.expect(sessionManager.currentSession.cards.length).toBeGreaterThan(0);
    });
});

// Export for manual testing
window.runSessionTests = () => framework.runAll();

// Auto-run if in test mode
if (window.location.search.includes('test=session')) {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            framework.runAll();
        }, 1000);
    });
}

console.log('🧪 Session Manager tests loaded. Run with: runSessionTests()');

export { framework as SessionTestFramework };