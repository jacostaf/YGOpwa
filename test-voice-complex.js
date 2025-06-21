/**
 * Test script for complex card name voice recognition
 * Tests the enhanced voice recognition with challenging card names
 */

import { SessionManager } from './src/js/session/SessionManager.js';
import { Logger } from './src/js/utils/Logger.js';

// Configure logger
const logger = new Logger('VoiceTest');
logger.setLevel('debug');

// Test cases for complex card names
const testCases = [
    // Test cases for Evil Hero Dead End Prison and similar complex names
    {
        name: 'Evil Hero Dead End Prison',
        variations: [
            'evil hero dead end prison',
            'evil hero deadend prison',
            'evilhero dead end prison',
            'evil hero dead and prison',
            'evil hero dead in prison',
            'evil hero dead n prison',
            'evil hero dead prison',
            'evil hero deadendprison',
            'dead end prison',
            'deadend prison'
        ],
        expectedMatch: 'Evil Hero Dead End Prison',
        setCode: 'SUDA'
    },
    {
        name: 'Tenyi Spirit - Adhara',
        variations: [
            'tenyi spirit adhara',
            'tenyi adhara',
            'tenyi spirit adara',
            'tenyi adara',
            'tenyinfinity adhara',
            'ten yin adhara',
            'tenyi spirit adara'
        ],
        expectedMatch: 'Tenyi Spirit - Adhara',
        setCode: 'MP22'
    },
    {
        name: 'Futsu no Mitama no Mitsurugi',
        variations: [
            'futsu no mitama no mitsurugi',
            'futsu mitama mitsurugi',
            'futsu no mitama mitsurugi',
            'futsu mitama no mitsurugi',
            'futsu no mitama',
            'mitama no mitsurugi',
            'futsu sword',
            'futsu blade'
        ],
        expectedMatch: 'Futsu no Mitama no Mitsurugi',
        setCode: 'PHNI'
    },
    {
        name: 'Blue-Eyes White Dragon',
        variations: [
            'blue eyes white dragon',
            'blue eyes whitedragon',
            'blue eyes',
            'blue eyes dragon',
            'blue eyes white',
            'blue eyes white dragoon',
            'blue eyes ultimate dragon',
            'blue eyes chaos max dragon'
        ],
        expectedMatch: 'Blue-Eyes White Dragon',
        setCode: 'SDBE'
    },
    {
        name: 'Dark Magician',
        variations: [
            'dark magician',
            'darkmagician',
            'dark magician girl',
            'dark magician of chaos',
            'dark magician girl the dragon knight',
            'dark magician the dragon knight'
        ],
        expectedMatch: 'Dark Magician',
        setCode: 'SDMY'
    }
];

// Helper function to run tests
async function runTests() {
    const sessionManager = new SessionManager(null, logger);
    
    // Initialize session manager
    await sessionManager.initialize();
    
    // Load all card sets
    await sessionManager.loadCardSets();
    
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    
    // Run each test case
    for (const testCase of testCases) {
        logger.info(`\n=== Testing: ${testCase.name} (${testCase.setCode}) ===`);
        
        // Find the set by code
        const set = sessionManager.getCardSets().find(s => 
            s.set_code === testCase.setCode || 
            s.code === testCase.setCode ||
            s.name.toLowerCase().includes(testCase.setCode.toLowerCase())
        );
        
        if (!set) {
            logger.warn(`  ❌ Set not found: ${testCase.setCode}`);
            failedTests++;
            continue;
        }
        
        // Start a session with this set
        await sessionManager.startSession(set.id);
        
        // Test each variation
        for (const variation of testCase.variations) {
            totalTests++;
            logger.info(`\nTesting variation: "${variation}"`);
            
            try {
                try {
                    logger.debug(`\n=== Testing variation: \"${variation}\" ===`);
                    
                    // Find cards matching this variation
                    const matches = await sessionManager.findCardsInCurrentSet(variation);
                    
                    // Debug: Log the matches found
                    logger.debug(`Found ${matches.length} total matches for variation: \"${variation}\"`);
                    if (matches.length > 0) {
                        logger.debug(`Top matches for \"${variation}\":`);
                        matches.slice(0, 5).forEach((match, idx) => {
                            logger.debug(`  ${idx + 1}. ${match.name} (${match.confidence.toFixed(2)}%)`);
                        });
                    }
                    
                    // Check if we found a match
                    const matchedCard = matches.find(card => 
                        card.name.toLowerCase() === testCase.expectedMatch.toLowerCase()
                    );
                    
                    if (matchedCard) {
                        logger.info(`  ✅ Matched: \"${matchedCard.name}\" (${matchedCard.confidence.toFixed(2)}%)`);
                        passedTests++;
                    } else {
                        logger.warn(`  ❌ No match found for variation: \"${variation}\"`);
                        if (matches.length > 0) {
                            logger.info(`  Top matches: ${matches.slice(0, 3).map(m => `"${m.name}" (${m.confidence.toFixed(2)}%`).join(', ')}`);
                        } else {
                            logger.info('  No matches found at all');
                        }
                        failedTests++;
                    }
                } catch (error) {
                    logger.error(`  ❌ Error testing variation "${variation}":`, error);
                    failedTests++;
                }
            } catch (error) {
                logger.error(`  ❌ Error testing variation "${variation}":`, error);
                failedTests++;
            }
        }
        
        // Clean up
        await sessionManager.stopSession();
    }
    
    // Print summary
    logger.info('\n=== Test Summary ===');
    logger.info(`Total tests: ${totalTests}`);
    logger.info(`Passed: ${passedTests} (${(passedTests / totalTests * 100).toFixed(1)}%)`);
    logger.info(`Failed: ${failedTests} (${(failedTests / totalTests * 100).toFixed(1)}%)`);
    
    process.exit(failedTests > 0 ? 1 : 0);
}

// Run the tests
runTests().catch(error => {
    logger.error('Test failed with error:', error);
    process.exit(1);
});
