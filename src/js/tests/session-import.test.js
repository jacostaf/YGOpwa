/**
 * Test session import functionality
 * Tests both legacy pack_session.json format and new format
 */

import { SessionManager } from '../session/SessionManager.js';
import { Logger } from '../utils/Logger.js';

// Sample legacy format data (based on the issue description)
const legacySessionData = {
    "cards": [
        {
            "atk": 2500,
            "attribute": "FIRE",
            "card_images": [
                {
                    "id": 27704731,
                    "image_url": "https://images.ygoprodeck.com/images/cards/27704731.jpg",
                    "image_url_cropped": "https://images.ygoprodeck.com/images/cards_cropped/27704731.jpg",
                    "image_url_small": "https://images.ygoprodeck.com/images/cards_small/27704731.jpg"
                }
            ],
            "card_prices": [
                {
                    "amazon_price": "0.00",
                    "cardmarket_price": "0.88",
                    "coolstuffinc_price": "0.00",
                    "ebay_price": "0.00",
                    "tcgplayer_price": "2.07"
                }
            ],
            "card_sets": [
                {
                    "set_code": "SUDA-EN014",
                    "set_name": "Supreme Darkness",
                    "set_price": "0",
                    "set_rarity": "Quarter Century Secret Rare",
                    "set_rarity_code": ""
                }
            ],
            "def": 1600,
            "desc": "Cannot be Normal Summoned/Set. Must first be Special Summoned with \"Max Metalmorph\"...",
            "frameType": "effect",
            "humanReadableCardType": "Effect Monster",
            "id": 27704731,
            "level": 6,
            "name": "Metalflame Swordsman",
            "race": "Machine",
            "target_set_codes": ["SUDA-EN014"],
            "target_set_name": "Supreme Darkness",
            "target_set_variants": 2,
            "type": "Effect Monster",
            "typeline": ["Machine", "Effect"],
            "ygoprodeck_url": "https://ygoprodeck.com/card/metalflame-swordsman-14779",
            "card_name": "Metalflame Swordsman - Supreme Darkness (SUDA)",
            "card_rarity": "Ultra Rare",
            "art_variant": "None",
            "tcg_price": 0.1,
            "tcg_market_price": 2.12,
            "price_status": "loaded",
            "quantity": 1,
            "timestamp": "2025-06-10T20:41:06.638802",
            "booster_set_name": "Supreme Darkness Metalflame Swordsman?Language=English&Page=1",
            "card_number": "SUDA-EN014",
            "last_price_updt": "Wed, 11 Jun 2025 01:39:47 GMT",
            "scrape_success": true,
            "set_code": "SUDA",
            "source_url": "https://www.tcgplayer.com/product/610823/yugioh-supreme-darkness-metalflame-swordsman?Language=English&page=1"
        }
    ],
    "current_set": "Supreme Darkness",
    "set_cards": [],
    "last_saved": "2025-06-10T20:51:00.000000"
};

// Sample new format data (current export format)
const currentExportData = {
    "sessionId": "session-123",
    "setName": "Supreme Darkness",
    "cards": [
        {
            "name": "Metalflame Swordsman",
            "rarity": "Ultra Rare",
            "setCode": "SUDA",
            "price": 2.12,
            "timestamp": "2025-06-10T20:41:06.638802"
        }
    ],
    "startTime": "2025-06-10T20:40:00.000000",
    "statistics": {
        "totalCards": 1,
        "totalValue": 2.12
    },
    "version": "2.1.0"
};

// Sample future format data (with explicit setId)
const futureFormatData = {
    "setId": "SUDA",
    "setName": "Supreme Darkness",
    "cards": [
        {
            "name": "Metalflame Swordsman",
            "rarity": "Ultra Rare",
            "setCode": "SUDA",
            "price": 2.12,
            "timestamp": "2025-06-10T20:41:06.638802"
        }
    ],
    "startTime": "2025-06-10T20:40:00.000000",
    "statistics": {
        "totalCards": 1,
        "totalValue": 2.12
    }
};

async function testLegacyImport() {
    console.log('Testing legacy pack_session.json import...');
    
    const logger = new Logger('SessionImportTest');
    const sessionManager = new SessionManager(null, logger);
    
    try {
        // This should currently fail with "Invalid session data"
        await sessionManager.importSession(legacySessionData);
        console.log('✅ Legacy import succeeded (unexpected)');
        return false;
    } catch (error) {
        if (error.message === 'Invalid session data') {
            console.log('❌ Legacy import failed as expected:', error.message);
            return true; // This confirms the bug exists
        } else {
            console.log('❌ Legacy import failed with unexpected error:', error.message);
            return false;
        }
    }
}

async function testCurrentFormatImport() {
    console.log('Testing current export format import...');
    
    const logger = new Logger('SessionImportTest');
    const sessionManager = new SessionManager(null, logger);
    
    // Mock the cardSets for testing
    sessionManager.cardSets = [
        {
            id: 'SUDA',
            name: 'Supreme Darkness',
            code: 'SUDA',
            set_name: 'Supreme Darkness',
            set_code: 'SUDA'
        }
    ];
    
    try {
        const result = await sessionManager.importSession(currentExportData);
        console.log('✅ Current format import succeeded');
        return true;
    } catch (error) {
        console.log('❌ Current format import failed:', error.message);
        return false;
    }
}

async function testFutureFormatImport() {
    console.log('Testing future format import...');
    
    const logger = new Logger('SessionImportTest');
    const sessionManager = new SessionManager(null, logger);
    
    // Mock the cardSets for testing
    sessionManager.cardSets = [
        {
            id: 'SUDA',
            name: 'Supreme Darkness',
            code: 'SUDA',
            set_name: 'Supreme Darkness',
            set_code: 'SUDA'
        }
    ];
    
    try {
        const result = await sessionManager.importSession(futureFormatData);
        console.log('✅ Future format import succeeded');
        return true;
    } catch (error) {
        console.log('❌ Future format import failed:', error.message);
        return false;
    }
}

async function runTests() {
    console.log('=== Session Import Tests ===');
    
    const legacyResult = await testLegacyImport();
    const newResult = await testNewFormatImport();
    
    console.log('\n=== Test Results ===');
    console.log(`Legacy format test (should confirm bug exists): ${legacyResult ? 'PASS' : 'FAIL'}`);
    console.log(`New format test (should work): ${newResult ? 'PASS' : 'FAIL'}`);
    
    if (legacyResult && newResult) {
        console.log('\n✅ All tests passed - bug confirmed and new format works');
    } else {
        console.log('\n❌ Some tests failed');
    }
}

// Export for use in other contexts
export { legacySessionData, newSessionData, testLegacyImport, testNewFormatImport };

// Run tests if this file is executed directly
if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].endsWith('session-import.test.js')) {
    runTests().catch(console.error);
}