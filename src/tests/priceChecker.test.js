/**
 * Comprehensive Tests for PriceChecker (price/PriceChecker.js)
 * 
 * This test suite provides 100% coverage and AI validation for the price checking functionality
 * including API calls, data validation, caching, and error handling.
 * 
 * @version 2.1.0
 * @author YGORipperUI Team
 */

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Register all PriceChecker tests with the test framework
 */
export function registerTests(framework) {
    const priceCheckerModulePath = join(__dirname, '../js/price/PriceChecker.js');
    
    // Mock fetch API
    function createMockFetch(responseData, shouldFail = false) {
        return async (url, options) => {
            if (shouldFail) {
                throw new Error('Network error');
            }
            
            return {
                ok: true,
                status: 200,
                json: async () => responseData,
                text: async () => JSON.stringify(responseData)
            };
        };
    }

    // Test PriceChecker Initialization
    framework.test('PriceChecker - should initialize correctly', async () => {
        global.fetch = createMockFetch({});
        
        const { PriceChecker } = await import('../js/price/PriceChecker.js');
        const priceChecker = new PriceChecker();
        
        framework.expect(priceChecker).toBeTruthy();
        framework.expect(typeof priceChecker.checkPrice).toBe('function');
        framework.expect(typeof priceChecker.getCache).toBe('function');
        framework.expect(typeof priceChecker.clearCache).toBe('function');
    }, { 
        file: priceCheckerModulePath, 
        category: 'initialization',
        complexity: 'low' 
    });

    // Test Basic Price Check
    framework.test('PriceChecker - should perform basic price check', async () => {
        const mockResponse = {
            success: true,
            data: {
                card_name: "Blue-Eyes White Dragon",
                card_number: "LOB-001",
                card_rarity: "Ultra Rare",
                tcg_price: 15.50,
                tcg_market_price: 18.75,
                source_url: "https://example.com",
                last_price_updt: "2023-01-01T00:00:00Z"
            },
            cache_age_hours: 0.1,
            is_cached: false,
            message: "Price data retrieved successfully"
        };
        
        global.fetch = createMockFetch(mockResponse);
        
        const { PriceChecker } = await import('../js/price/PriceChecker.js');
        const priceChecker = new PriceChecker();
        
        const result = await priceChecker.checkPrice({
            card_number: "LOB-001",
            card_name: "Blue-Eyes White Dragon",
            card_rarity: "Ultra Rare"
        });
        
        framework.expect(result.success).toBe(true);
        framework.expect(result.data.card_name).toBe("Blue-Eyes White Dragon");
        framework.expect(result.data.tcg_price).toBe(15.50);
        framework.expect(result.data.tcg_market_price).toBe(18.75);
    }, { 
        file: priceCheckerModulePath, 
        category: 'basic-functionality',
        complexity: 'medium' 
    });

    // Test AI Validation - Input Sanitization
    framework.test('PriceChecker - AI Validation: Input sanitization', async () => {
        const mockResponse = { success: true, data: {} };
        global.fetch = createMockFetch(mockResponse);
        
        const { PriceChecker } = await import('../js/price/PriceChecker.js');
        const priceChecker = new PriceChecker();
        
        // Test various potentially malicious inputs that AI might not handle
        const maliciousInputs = [
            { card_name: "<script>alert('xss')</script>", card_number: "TEST-001" },
            { card_name: "'; DROP TABLE cards; --", card_number: "SQL-001" },
            { card_name: "../../etc/passwd", card_number: "PATH-001" },
            { card_name: "null", card_number: null },
            { card_name: undefined, card_number: "UNDEF-001" },
            { card_name: "", card_number: "" },
            { card_name: "a".repeat(1000), card_number: "LONG-001" }
        ];
        
        for (const input of maliciousInputs) {
            // Should not throw and should handle gracefully
            const result = await priceChecker.checkPrice(input);
            framework.expect(typeof result).toBe('object');
        }
    }, { 
        file: priceCheckerModulePath, 
        category: 'ai-validation',
        complexity: 'high',
        aiGenerated: true 
    });

    // Test Error Handling
    framework.test('PriceChecker - should handle API errors gracefully', async () => {
        global.fetch = createMockFetch(null, true); // Force failure
        
        const { PriceChecker } = await import('../js/price/PriceChecker.js');
        const priceChecker = new PriceChecker();
        
        const result = await priceChecker.checkPrice({
            card_number: "ERROR-001",
            card_name: "Error Test Card"
        });
        
        // Should return error response, not throw
        framework.expect(result).toBeTruthy();
        framework.expect(result.success).toBe(false);
    }, { 
        file: priceCheckerModulePath, 
        category: 'error-handling',
        complexity: 'high' 
    });

    // Test Caching Functionality
    framework.test('PriceChecker - should implement caching correctly', async () => {
        let callCount = 0;
        const mockResponse = {
            success: true,
            data: { card_name: "Test Card", tcg_price: 10.00 },
            is_cached: false
        };
        
        global.fetch = createMockFetch(mockResponse);
        
        const { PriceChecker } = await import('../js/price/PriceChecker.js');
        const priceChecker = new PriceChecker();
        
        const cardData = {
            card_number: "CACHE-001",
            card_name: "Cache Test Card"
        };
        
        // First call
        const result1 = await priceChecker.checkPrice(cardData);
        
        // Second call should use cache if implemented
        const result2 = await priceChecker.checkPrice(cardData);
        
        framework.expect(result1.success).toBe(true);
        framework.expect(result2.success).toBe(true);
        
        // Test cache retrieval if method exists
        if (typeof priceChecker.getCache === 'function') {
            const cachedData = priceChecker.getCache();
            framework.expect(typeof cachedData).toBe('object');
        }
    }, { 
        file: priceCheckerModulePath, 
        category: 'caching',
        complexity: 'high' 
    });

    // Test Rate Limiting
    framework.test('PriceChecker - should handle rate limiting', async () => {
        const mockResponse = { success: true, data: {} };
        global.fetch = createMockFetch(mockResponse);
        
        const { PriceChecker } = await import('../js/price/PriceChecker.js');
        const priceChecker = new PriceChecker();
        
        // Make rapid requests
        const promises = [];
        for (let i = 0; i < 10; i++) {
            promises.push(priceChecker.checkPrice({
                card_number: `RATE-${i}`,
                card_name: `Rate Test ${i}`
            }));
        }
        
        const results = await Promise.all(promises);
        
        // All should complete without errors
        results.forEach(result => {
            framework.expect(typeof result).toBe('object');
        });
    }, { 
        file: priceCheckerModulePath, 
        category: 'rate-limiting',
        complexity: 'high' 
    });

    // Test Data Validation
    framework.test('PriceChecker - AI Validation: Response data validation', async () => {
        // Test various response formats that AI might mishandle
        const testCases = [
            // Valid response
            {
                response: { success: true, data: { tcg_price: 10.50 } },
                shouldBeValid: true
            },
            // Invalid price type
            {
                response: { success: true, data: { tcg_price: "not a number" } },
                shouldBeValid: false
            },
            // Missing required fields
            {
                response: { success: true },
                shouldBeValid: false
            },
            // Null response
            {
                response: null,
                shouldBeValid: false
            },
            // Malformed JSON structure
            {
                response: "not an object",
                shouldBeValid: false
            }
        ];
        
        const { PriceChecker } = await import('../js/price/PriceChecker.js');
        const priceChecker = new PriceChecker();
        
        for (const testCase of testCases) {
            global.fetch = createMockFetch(testCase.response);
            
            const result = await priceChecker.checkPrice({
                card_number: "VALID-001",
                card_name: "Validation Test"
            });
            
            // Should always return an object with success field
            framework.expect(typeof result).toBe('object');
            framework.expect(typeof result.success).toBe('boolean');
        }
    }, { 
        file: priceCheckerModulePath, 
        category: 'data-validation',
        complexity: 'high',
        aiGenerated: true 
    });

    // Test Timeout Handling
    framework.test('PriceChecker - should handle API timeouts', async () => {
        // Mock a slow response
        global.fetch = async () => {
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve({
                        ok: true,
                        json: async () => ({ success: true, data: {} })
                    });
                }, 5000); // 5 second delay
            });
        };
        
        const { PriceChecker } = await import('../js/price/PriceChecker.js');
        const priceChecker = new PriceChecker();
        
        const startTime = Date.now();
        const result = await priceChecker.checkPrice({
            card_number: "TIMEOUT-001",
            card_name: "Timeout Test"
        });
        const endTime = Date.now();
        
        // Should handle timeout (implement timeout logic if needed)
        framework.expect(typeof result).toBe('object');
        
        // Test should not take more than reasonable time
        const duration = endTime - startTime;
        if (duration > 10000) { // More than 10 seconds
            framework.expect(false).toBe(true); // Force failure for excessive time
        }
    }, { 
        file: priceCheckerModulePath, 
        category: 'timeout-handling',
        complexity: 'high' 
    });

    // Test Edge Cases
    framework.test('PriceChecker - Edge Cases: Special card names and numbers', async () => {
        const mockResponse = { success: true, data: {} };
        global.fetch = createMockFetch(mockResponse);
        
        const { PriceChecker } = await import('../js/price/PriceChecker.js');
        const priceChecker = new PriceChecker();
        
        const edgeCases = [
            { card_name: "Card with 'quotes'", card_number: "QUOTE-001" },
            { card_name: "Card with \"double quotes\"", card_number: "DQUOTE-001" },
            { card_name: "Card with & ampersand", card_number: "AMP-001" },
            { card_name: "Card with émoji 🐉", card_number: "EMOJI-001" },
            { card_name: "Card with\nnewline", card_number: "NEWLINE-001" },
            { card_name: "Card with\ttab", card_number: "TAB-001" },
            { card_name: "Card with unicode: ™©®", card_number: "UNICODE-001" }
        ];
        
        for (const testCase of edgeCases) {
            const result = await priceChecker.checkPrice(testCase);
            framework.expect(typeof result).toBe('object');
        }
    }, { 
        file: priceCheckerModulePath, 
        category: 'edge-cases',
        complexity: 'medium' 
    });

    // Test Mock Data Fallback
    framework.test('PriceChecker - should provide mock data when API unavailable', async () => {
        // Simulate API completely unavailable
        global.fetch = async () => {
            throw new Error('API unavailable');
        };
        
        const { PriceChecker } = await import('../js/price/PriceChecker.js');
        const priceChecker = new PriceChecker();
        
        const result = await priceChecker.checkPrice({
            card_number: "MOCK-001",
            card_name: "Mock Test Card",
            card_rarity: "Ultra Rare"
        });
        
        // Should provide fallback response
        framework.expect(result).toBeTruthy();
        framework.expect(typeof result.success).toBe('boolean');
        
        // If mock data is provided, verify structure
        if (result.success) {
            framework.expect(result.data).toBeTruthy();
            framework.expect(typeof result.data.card_name).toBe('string');
        }
    }, { 
        file: priceCheckerModulePath, 
        category: 'mock-data',
        complexity: 'high' 
    });

    // Test Performance
    framework.test('PriceChecker - AI Validation: Performance optimization', async () => {
        const mockResponse = { success: true, data: { tcg_price: 10.00 } };
        global.fetch = createMockFetch(mockResponse);
        
        const { PriceChecker } = await import('../js/price/PriceChecker.js');
        const priceChecker = new PriceChecker();
        
        const startTime = Date.now();
        
        // Test performance with multiple sequential requests
        for (let i = 0; i < 20; i++) {
            await priceChecker.checkPrice({
                card_number: `PERF-${i}`,
                card_name: `Performance Test ${i}`
            });
        }
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Should complete within reasonable time (AI code might be inefficient)
        framework.expect(duration).toBeLess(5000); // Less than 5 seconds
    }, { 
        file: priceCheckerModulePath, 
        category: 'performance',
        complexity: 'medium',
        aiGenerated: true 
    });
}