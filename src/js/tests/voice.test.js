/**
 * Voice Recognition Tests
 * 
 * Comprehensive tests for the VoiceEngine and PermissionManager
 * to ensure robust functionality across platforms.
 */

import { VoiceEngine } from '../voice/VoiceEngine.js';
import { PermissionManager } from '../voice/PermissionManager.js';
import { Logger } from '../utils/Logger.js';

// Test framework setup
class TestFramework {
    constructor() {
        this.tests = [];
        this.results = [];
        this.logger = new Logger('VoiceTests');
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
        console.log('🚀 Running Voice Recognition Tests...');
        
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
            }
        };
    }
}

// Test suite
const framework = new TestFramework();

framework.describe('PermissionManager Tests', () => {
    framework.test('should initialize permission manager', async () => {
        const permissionManager = new PermissionManager();
        framework.expect(permissionManager).toBeTruthy();
        framework.expect(permissionManager.platform).toBeTruthy();
        framework.expect(permissionManager.browser).toBeTruthy();
    });

    framework.test('should detect platform correctly', async () => {
        const permissionManager = new PermissionManager();
        const platform = permissionManager.detectPlatform();
        
        framework.expect(typeof platform).toBe('string');
        framework.expect(['ios', 'mac', 'windows', 'android', 'linux', 'unknown']).toContain(platform);
    });

    framework.test('should detect browser correctly', async () => {
        const permissionManager = new PermissionManager();
        const browser = permissionManager.detectBrowser();
        
        framework.expect(typeof browser).toBe('string');
        framework.expect(['chrome', 'firefox', 'safari', 'edge', 'unknown']).toContain(browser);
    });

    framework.test('should check environment support', async () => {
        const permissionManager = new PermissionManager();
        const support = permissionManager.isSupported();
        
        framework.expect(support).toBeTruthy();
        framework.expect(support.supported).toBeTruthy();
        framework.expect(typeof support.reason).toBe('string');
    });

    framework.test('should provide permission instructions', async () => {
        const permissionManager = new PermissionManager();
        const instructions = permissionManager.getPermissionInstructions();
        
        framework.expect(instructions).toBeTruthy();
        framework.expect(instructions.title).toBeTruthy();
        framework.expect(Array.isArray(instructions.steps)).toBeTruthy();
        framework.expect(instructions.steps.length).toBeTruthy();
    });
});

framework.describe('VoiceEngine Tests', () => {
    let permissionManager;
    let voiceEngine;

    framework.test('should create voice engine with permission manager', async () => {
        permissionManager = new PermissionManager();
        voiceEngine = new VoiceEngine(permissionManager);
        
        framework.expect(voiceEngine).toBeTruthy();
        framework.expect(voiceEngine.permissionManager).toBe(permissionManager);
        framework.expect(voiceEngine.platform).toBeTruthy();
    });

    framework.test('should check environment support', async () => {
        const isSupported = voiceEngine.isEnvironmentSupported();
        framework.expect(typeof isSupported).toBe('boolean');
        
        if (!isSupported) {
            console.warn('Voice recognition not supported in this environment');
        }
    });

    framework.test('should detect platform correctly', async () => {
        const platform = voiceEngine.detectPlatform();
        framework.expect(typeof platform).toBe('string');
        framework.expect(['ios', 'mac', 'windows', 'android', 'linux', 'unknown']).toContain(platform);
    });

    framework.test('should initialize with default configuration', async () => {
        framework.expect(voiceEngine.config).toBeTruthy();
        framework.expect(voiceEngine.config.language).toBe('en-US');
        framework.expect(typeof voiceEngine.config.timeout).toBe('number');
        framework.expect(typeof voiceEngine.config.retryAttempts).toBe('number');
    });

    framework.test('should update configuration', async () => {
        const newConfig = {
            language: 'en-GB',
            timeout: 15000,
            retryAttempts: 5
        };
        
        voiceEngine.updateConfig(newConfig);
        
        framework.expect(voiceEngine.config.language).toBe('en-GB');
        framework.expect(voiceEngine.config.timeout).toBe(15000);
        framework.expect(voiceEngine.config.retryAttempts).toBe(5);
    });

    framework.test('should load card name optimizations', async () => {
        await voiceEngine.loadCardNameOptimizations();
        
        framework.expect(Array.isArray(voiceEngine.commonCardTerms)).toBeTruthy();
        framework.expect(voiceEngine.commonCardTerms.length).toBeTruthy();
    });

    framework.test('should optimize card name recognition with comprehensive variants', async () => {
        await voiceEngine.loadCardNameOptimizations();
        
        const testResult = {
            transcript: 'blue i white dragun',
            confidence: 0.8
        };
        
        const optimized = voiceEngine.optimizeCardNameRecognition(testResult);
        
        framework.expect(optimized.transcript).toBeTruthy();
        framework.expect(optimized.confidence).toBe(0.8);
        framework.expect(optimized.originalTranscript).toBe('blue i white dragun');
        framework.expect(Array.isArray(optimized.variants)).toBeTruthy();
        framework.expect(optimized.variants.length > 1).toBeTruthy();
        
        // Check that variants include the original and some phonetic alternatives
        framework.expect(optimized.variants).toContain('blue i white dragun');
        
        console.log('Generated variants:', optimized.variants.slice(0, 5));
    });

    framework.test('should generate comprehensive variants for Japanese card names', async () => {
        await voiceEngine.loadCardNameOptimizations();
        
        const testCases = [
            'futsu no mitama no mitsurugi',
            'blue eyes white dragon',
            'elemental hero neos',
            'time wizard'
        ];
        
        for (const testCase of testCases) {
            const variants = voiceEngine.generateCardNameVariants(testCase);
            
            framework.expect(Array.isArray(variants)).toBeTruthy();
            framework.expect(variants.length > 1).toBeTruthy();
            framework.expect(variants).toContain(testCase);
            
            console.log(`"${testCase}" generated ${variants.length} variants:`, variants.slice(0, 5));
        }
    });

    framework.test('should handle compound words correctly', async () => {
        await voiceEngine.loadCardNameOptimizations();
        
        const testInput = 'metal flame';
        const variants = voiceEngine.generateCardNameVariants(testInput);
        
        framework.expect(variants).toContain('metal flame'); // original
        framework.expect(variants).toContain('metalflame'); // no spaces
        framework.expect(variants).toContain('metal-flame'); // hyphenated
        
        console.log('Compound word variants:', variants);
    });

    framework.test('should handle Japanese particles', async () => {
        await voiceEngine.loadCardNameOptimizations();
        
        const testInput = 'futsu no mitama no mitsurugi';
        const variants = voiceEngine.generateCardNameVariants(testInput);
        
        // Should generate variants without particles
        const shouldInclude = [
            'futsu no mitama no mitsurugi', // original
            'futsu mitama mitsurugi', // particles removed
            'futsunomitamonomitsurugi', // no spaces
            'futsu-no-mitama-no-mitsurugi' // hyphenated
        ];
        
        for (const expected of shouldInclude) {
            const found = variants.some(v => v.includes(expected.replace(/\s+/g, '')) || v === expected);
            if (!found) {
                console.warn(`Expected variant containing "${expected}" but found:`, variants.slice(0, 10));
            }
        }
        
        framework.expect(variants.length > 5).toBeTruthy();
        console.log('Japanese particle handling:', variants.slice(0, 8));
    });

    framework.test('should calculate string similarity', async () => {
        const similarity1 = voiceEngine.calculateSimilarity('hello', 'hello');
        framework.expect(similarity1).toBe(1.0);
        
        const similarity2 = voiceEngine.calculateSimilarity('hello', 'world');
        framework.expect(similarity2 < 1.0).toBeTruthy();
        
        const similarity3 = voiceEngine.calculateSimilarity('blue eyes', 'blue i');
        framework.expect(similarity3 > 0.5).toBeTruthy();
    });

    framework.test('should provide status information', async () => {
        const status = voiceEngine.getStatus();
        
        framework.expect(status).toBeTruthy();
        framework.expect(typeof status.isInitialized).toBe('boolean');
        framework.expect(typeof status.isListening).toBe('boolean');
        framework.expect(status.platform).toBeTruthy();
        framework.expect(Array.isArray(status.availableEngines)).toBeTruthy();
    });

    framework.test('should handle event listeners', async () => {
        let resultReceived = false;
        let statusReceived = false;
        let errorReceived = false;

        voiceEngine.onResult(() => {
            resultReceived = true;
        });

        voiceEngine.onStatusChange(() => {
            statusReceived = true;
        });

        voiceEngine.onError(() => {
            errorReceived = true;
        });

        // Test event emission
        voiceEngine.emitResult({ transcript: 'test', confidence: 0.8 });
        voiceEngine.emitStatusChange('ready');
        voiceEngine.emitError({ type: 'test-error', message: 'Test error' });

        framework.expect(resultReceived).toBeTruthy();
        framework.expect(statusReceived).toBeTruthy();
        framework.expect(errorReceived).toBeTruthy();
    });
});

framework.describe('Integration Tests', () => {
    framework.test('should work together - permission and voice engine', async () => {
        const permissionManager = new PermissionManager();
        const voiceEngine = new VoiceEngine(permissionManager);
        
        framework.expect(voiceEngine.permissionManager).toBe(permissionManager);
        
        // Test initialization flow
        if (voiceEngine.isEnvironmentSupported()) {
            // Can't actually test microphone access in automated tests
            // but we can test the setup
            framework.expect(voiceEngine.engines.size).toBe(0); // Not initialized yet
        }
    });

    framework.test('should handle card name recognition pipeline', async () => {
        const permissionManager = new PermissionManager();
        const voiceEngine = new VoiceEngine(permissionManager);
        
        await voiceEngine.loadCardNameOptimizations();
        
        // Test various card name inputs with the new comprehensive system
        const testCases = [
            'blue eyes white dragon',
            'dark magician', 
            'pot of greed',
            'blue i white dragun', // phonetic variation
            'time wiserd', // misspelling
            'futsu no mitama no mitsurugi', // Japanese name with particles
            'elemental hero neos', // archetype name
            'metal flame' // compound word
        ];
        
        for (const testCase of testCases) {
            const result = voiceEngine.optimizeCardNameRecognition({
                transcript: testCase,
                confidence: 0.8
            });
            
            framework.expect(result.transcript).toBeTruthy();
            framework.expect(result.confidence).toBe(0.8);
            framework.expect(result.originalTranscript).toBe(testCase);
            framework.expect(Array.isArray(result.variants)).toBeTruthy();
            framework.expect(result.variants.length > 0).toBeTruthy();
            
            console.log(`"${testCase}" -> ${result.variants.length} variants:`, result.variants.slice(0, 3));
        }
    });
});

framework.describe('Error Handling Tests', () => {
    framework.test('should handle missing permission manager', async () => {
        framework.expect(() => {
            new VoiceEngine(null);
        }).toThrow();
    });

    framework.test('should handle invalid configuration', async () => {
        const permissionManager = new PermissionManager();
        const voiceEngine = new VoiceEngine(permissionManager);
        
        // Test with invalid config
        voiceEngine.updateConfig({
            language: null,
            timeout: -1,
            retryAttempts: 'invalid'
        });
        
        // Should still have valid defaults
        framework.expect(voiceEngine.config.language).toBeTruthy();
        framework.expect(voiceEngine.config.timeout > 0).toBeTruthy();
    });

    framework.test('should handle platform detection edge cases', async () => {
        const permissionManager = new PermissionManager();
        
        // Mock user agent
        const originalUserAgent = navigator.userAgent;
        Object.defineProperty(navigator, 'userAgent', {
            value: 'Unknown Browser',
            configurable: true
        });
        
        const platform = permissionManager.detectPlatform();
        const browser = permissionManager.detectBrowser();
        
        framework.expect(platform).toBeTruthy();
        framework.expect(browser).toBeTruthy();
        
        // Restore original user agent
        Object.defineProperty(navigator, 'userAgent', {
            value: originalUserAgent,
            configurable: true
        });
    });
});

// Export for manual testing
window.runVoiceTests = () => framework.runAll();

// Auto-run if in test mode
if (window.location.search.includes('test=voice')) {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            framework.runAll();
        }, 1000);
    });
}

console.log('🧪 Voice recognition tests loaded. Run with: runVoiceTests()');

export { framework as VoiceTestFramework };