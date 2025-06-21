/**
 * Test Script for Voice Recognition
 * 
 * This script tests the voice recognition functionality with real card data
 * in a Node.js environment.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { SessionManager } from './src/js/session/SessionManager.js';

// Simple console logger for Node.js
class SimpleLogger {
    constructor(prefix = 'Test') {
        this.prefix = `[${prefix}]`;
    }
    
    info(...args) {
        console.log(this.prefix, ...args);
    }
    
    debug(...args) {
        // Only show debug in development
        if (process.env.NODE_ENV === 'development') {
            console.debug(this.prefix, ...args);
        }
    }
    
    warn(...args) {
        console.warn(this.prefix, ...args);
    }
    
    error(...args) {
        console.error(this.prefix, ...args);
    }
}

// Test cases
const TEST_CASES = [
    { input: 'Blue-Eyes White Dragon', expected: 'Blue-Eyes White Dragon' },
    { input: 'Dark Magician', expected: 'Dark Magician' },
    { input: 'Red-Eyes Black Dragon', expected: 'Red-Eyes B. Dragon' },
    { input: 'Dark Magician Girl', expected: 'Dark Magician Girl' },
    { input: 'Exodia the Forbidden One', expected: 'Exodia the Forbidden One' },
    { input: 'Elemental Hero Neos', expected: 'Elemental HERO Neos' },
    { input: 'Stardust Dragon', expected: 'Stardust Dragon' },
    { input: 'Blue Eyes', expected: 'Blue-Eyes White Dragon' },
    { input: 'Red Eyes', expected: 'Red-Eyes B. Dragon' },
    { input: 'Dark Magician Girl Dragon Knight', expected: 'Dark Magician Girl the Dragon Knight' },
];

// Main test function
async function runTests() {
    console.log('🚀 Starting Voice Recognition Tests...');
    
    // Initialize SessionManager with a simple logger
    const sessionManager = new SessionManager(null, new SimpleLogger('SessionManager'));
    
    // Load a test set (Legend of Blue Eyes White Dragon)
    console.log('\n🔍 Loading test card set...');
    const testSetName = 'Legend of Blue Eyes White Dragon';
    
    try {
        // Load card sets
        console.log('Loading card sets...');
        const cardSets = await sessionManager.loadCardSets();
        console.log(`✅ Loaded ${cardSets.length} card sets`);
        
        // Find our test set
        const testSet = cardSets.find(set => 
            set.set_name && 
            set.set_name.toLowerCase().includes(testSetName.toLowerCase())
        );
        
        if (!testSet) {
            throw new Error(`Could not find test set: ${testSetName}`);
        }
        
        console.log(`\n🔍 Loading cards for set: ${testSet.set_name} (${testSet.set_code})`);
        
        // Load cards for the test set and set as current
        await sessionManager.loadSetCards(testSet.set_name);
        
        // Manually set the current set in the session manager
        sessionManager.currentSet = testSet;
        sessionManager.currentSetId = testSet.set_code;
        
        const setCards = sessionManager.setCards.get(testSet.set_name) || [];
        console.log(`✅ Loaded ${setCards.length} cards from set`);
        console.log(`ℹ️  Current set set to: ${sessionManager.currentSet.set_name} (${sessionManager.currentSetId})`);
        
        // Run test cases
        console.log('\n🧪 Running test cases...');
        let passed = 0;
        const results = [];
        
        for (const testCase of TEST_CASES) {
            const { input, expected } = testCase;
            console.log(`\n🔍 Testing: "${input}"`);
            
            try {
                console.log(`  🔎 Searching for matches...`);
                
                // Find matching cards
                const matches = await sessionManager.findCardsInCurrentSet(input);
                
                if (matches.length === 0) {
                    console.log('  ❌ No matches found');
                    results.push({ input, expected, success: false, reason: 'No matches found' });
                    continue;
                }
                
                const bestMatch = matches[0];
                // Access the card properties directly from the match object
                const matchedName = bestMatch.name;
                const score = bestMatch.confidence ? bestMatch.confidence.toFixed(2) : '0.00';
                const method = bestMatch.method || 'unknown';
                
                console.log(`  🎯 Best match: "${matchedName}" (score: ${score}, method: ${method})`);
                
                // Check if the match is correct
                const isMatch = matchedName.toLowerCase().includes(expected.toLowerCase());
                
                if (isMatch) {
                    console.log(`✅ Matched: "${matchedName}"`);
                    passed++;
                    results.push({ 
                        input, 
                        expected, 
                        matched: matchedName, 
                        score,
                        method,
                        success: true 
                    });
                } else {
                    console.log(`❌ Expected: "${expected}", Got: "${matchedName}"`);
                    results.push({ 
                        input, 
                        expected, 
                        matched: matchedName, 
                        score,
                        method,
                        success: false,
                        reason: 'Incorrect match'
                    });
                }
            } catch (error) {
                console.error(`❌ Error testing "${input}":`, error);
                results.push({ 
                    input, 
                    expected, 
                    success: false, 
                    reason: error.message 
                });
            }
        }
        
        // Print summary
        const total = TEST_CASES.length;
        const successRate = (passed / total * 100).toFixed(1);
        
        console.log('\n📊 Test Results:');
        console.log(`✅ Passed: ${passed}/${total} (${successRate}%)`);
        console.log(`❌ Failed: ${total - passed}/${total} (${(100 - parseFloat(successRate)).toFixed(1)}%)`);
        
        // Print detailed results
        console.log('\n📝 Detailed Results:');
        results.forEach((result, index) => {
            const status = result.success ? '✅' : '❌';
            console.log(`\n${index + 1}. ${status} "${result.input}"`);
            if (result.success) {
                console.log(`   Matched: "${result.matched}" (score: ${result.score}, method: ${result.method})`);
            } else {
                console.log(`   Expected: "${result.expected}"`);
                if (result.matched) {
                    console.log(`   Got: "${result.matched}" (score: ${result.score}, method: ${result.method})`);
                }
                console.log(`   Reason: ${result.reason || 'Unknown error'}`);
            }
        });
        
        return { passed, total, successRate, results };
        
    } catch (error) {
        console.error('❌ Test failed with error:', error);
        throw error;
    }
}

// Run the tests
runTests()
    .then(({ passed, total, successRate }) => {
        console.log(`\n🎉 Tests completed: ${passed}/${total} passed (${successRate}%)`);
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Test runner failed:', error);
        process.exit(1);
    });
