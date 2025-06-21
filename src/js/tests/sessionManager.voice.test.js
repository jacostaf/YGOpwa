/**
 * SessionManager Voice Recognition Tests
 * 
 * Tests for the SessionManager's voice recognition functionality
 * with real card data from the backend API.
 */

import { SessionManager } from '../session/SessionManager.js';
import { Logger } from '../utils/Logger.js';

// Test framework setup
class TestFramework {
    constructor() {
        this.tests = [];
        this.results = [];
        this.logger = new Logger('SessionManagerVoiceTests');
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
        console.log('🚀 Running SessionManager Voice Recognition Tests...');
        
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
            toBeTruthy: () => {
                if (!actual) {
                    throw new Error(`Expected truthy value, got ${actual}`);
                }
            },
            toBeGreaterThan: (min) => {
                if (actual <= min) {
                    throw new Error(`Expected value greater than ${min}, got ${actual}`);
                }
            },
            toBeInstanceOf: (expected) => {
                if (!(actual instanceof expected)) {
                    throw new Error(`Expected instance of ${expected.name}, got ${actual.constructor.name}`);
                }
            },
            toContain: (expected) => {
                if (!actual.includes(expected)) {
                    throw new Error(`Expected ${actual} to contain ${expected}`);
                }
            }
        };
    }
}

// Test suite
const framework = new TestFramework();

framework.describe('SessionManager Voice Recognition Tests', () => {
    let sessionManager;
    
    // Setup before all tests
    framework.test('should initialize SessionManager', async () => {
        sessionManager = new SessionManager();
        framework.expect(sessionManager).toBeTruthy();
        
        // Wait for initialization if needed
        if (sessionManager.initializationPromise) {
            await sessionManager.initializationPromise;
        }
    });
    
    framework.test('should load card sets from API', async () => {
        const cardSets = await sessionManager.fetchCardSets();
        framework.expect(cardSets).toBeTruthy();
        framework.expect(cardSets.length).toBeGreaterThan(0);
        console.log(`Loaded ${cardSets.length} card sets`);
    });
    
    framework.test('should find cards by fuzzy match', async () => {
        // Test with a known card name
        const testCardName = "Blue-Eyes White Dragon";
        const matches = await sessionManager.findCardsByFuzzyMatch(testCardName);
        
        framework.expect(matches).toBeTruthy();
        framework.expect(matches.length).toBeGreaterThan(0);
        
        // Check if the first match has a high enough score
        const firstMatch = matches[0];
        framework.expect(firstMatch.score).toBeGreaterThan(0.7);
        
        console.log(`Found ${matches.length} matches for "${testCardName}"`);
        console.log(`Best match: "${firstMatch.card.name}" (score: ${firstMatch.score.toFixed(2)})`);
    });
    
    framework.test('should find cards in current set', async () => {
        // First, load a set (using Legend of Blue Eyes White Dragon as an example)
        const setToLoad = "Legend of Blue Eyes White Dragon";
        await sessionManager.loadSetCards(setToLoad);
        
        // Test with a card that should be in this set
        const testCardName = "Blue-Eyes White Dragon";
        const matches = await sessionManager.findCardsInCurrentSet(testCardName);
        
        framework.expect(matches).toBeTruthy();
        framework.expect(matches.length).toBeGreaterThan(0);
        
        // Check if the first match has a high enough score
        const firstMatch = matches[0];
        framework.expect(firstMatch.score).toBeGreaterThan(0.7);
        
        console.log(`Found ${matches.length} matches in current set for "${testCardName}"`);
        console.log(`Best match: "${firstMatch.card.name}" (score: ${firstMatch.score.toFixed(2)})`);
    });
    
    framework.test('should process voice input with rarity', async () => {
        // Test with a card name and rarity
        const testInput = "Blue-Eyes White Dragon secret rare";
        const recognizedCards = await sessionManager.processVoiceInput(testInput);
        
        framework.expect(recognizedCards).toBeTruthy();
        framework.expect(recognizedCards.length).toBeGreaterThan(0);
        
        console.log(`Processed voice input: "${testInput}"`);
        console.log(`Found ${recognizedCards.length} matching cards`);
        
        if (recognizedCards.length > 0) {
            console.log('Top matches:');
            recognizedCards.slice(0, 3).forEach((card, index) => {
                console.log(`${index + 1}. ${card.card.name} (score: ${card.score.toFixed(2)}, rarity: ${card.rarity || 'N/A'})`);
            });
        }
    });
    
    framework.test('should handle mispronounced card names', async () => {
        // Test with common mispronunciations or typos
        const testCases = [
            { input: "Blue Eyes White Dragon", expected: "Blue-Eyes White Dragon" },
            { input: "Dark Magician Girl", expected: "Dark Magician Girl" },
            { input: "Exodia the Forbidden One", expected: "Exodia the Forbidden One" },
            { input: "Red Eyes Black Dragon", expected: "Red-Eyes B. Dragon" },
            { input: "Elemental Hero Neos", expected: "Elemental HERO Neos" }
        ];
        
        for (const testCase of testCases) {
            const matches = await sessionManager.findCardsByFuzzyMatch(testCase.input);
            framework.expect(matches.length).toBeGreaterThan(0);
            
            const bestMatch = matches[0];
            console.log(`Input: "${testCase.input}"`);
            console.log(`  Best match: "${bestMatch.card.name}" (score: ${bestMatch.score.toFixed(2)})`);
            
            // Check if the best match contains the expected name (case insensitive)
            framework.expect(
                bestMatch.card.name.toLowerCase().includes(testCase.expected.toLowerCase())
            ).toBeTruthy();
        }
    });
});

// Export for manual testing
function runSessionManagerVoiceTests() {
    return framework.runAll();
}

// Auto-run if in test mode
if (window.location.search.includes('test=session-voice')) {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('Starting SessionManager Voice Recognition Tests...');
        runSessionManagerVoiceTests().then(results => {
            console.log('All tests completed!', results);
        }).catch(error => {
            console.error('Error running tests:', error);
        });
    });
}

export { runSessionManagerVoiceTests };
