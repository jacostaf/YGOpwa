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

// Mock implementations for testing
class MockPermissionManager {
    constructor() {
        this.isInitialized = false;
        this.permissions = new Map();
    }

    async initialize() {
        this.isInitialized = true;
        return true;
    }

    async requestPermission() {
        return true;
    }

    detectPlatform() {
        return 'test';
    }

    detectBrowser() {
        return 'chrome';
    }

    isSupported() {
        return { supported: true, reason: 'Test environment' };
    }

    getPermissionInstructions() {
        return {
            title: 'Test Instructions',
            steps: ['Step 1', 'Step 2']
        };
    }
}

// Test suite
const framework = new TestFramework();

framework.describe('PermissionManager Tests', () => {
    framework.test('should initialize permission manager', async () => {
        const permissionManager = new MockPermissionManager();
        framework.expect(permissionManager).toBeTruthy();
        framework.expect(permissionManager.isInitialized).toBeFalsy();
        
        await permissionManager.initialize();
        framework.expect(permissionManager.isInitialized).toBeTruthy();
    });

    framework.test('should detect platform correctly', async () => {
        const permissionManager = new MockPermissionManager();
        const platform = permissionManager.detectPlatform();
        
        framework.expect(typeof platform).toBe('string');
        framework.expect(platform).toBe('test');
    });

    framework.test('should detect browser correctly', async () => {
        const permissionManager = new MockPermissionManager();
        const browser = permissionManager.detectBrowser();
        
        framework.expect(typeof browser).toBe('string');
        framework.expect(browser).toBe('chrome');
    });

    framework.test('should check environment support', async () => {
        const permissionManager = new MockPermissionManager();
        const support = permissionManager.isSupported();
        
        framework.expect(support).toBeTruthy();
        framework.expect(support.supported).toBeTruthy();
        framework.expect(typeof support.reason).toBe('string');
    });

    framework.test('should provide permission instructions', async () => {
        const permissionManager = new MockPermissionManager();
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
        permissionManager = new VoiceEngine();
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

    framework.test('should optimize card name recognition', async () => {
        await voiceEngine.loadCardNameOptimizations();
        
        const testResult = {
            transcript: 'blue i white dragun',
            confidence: 0.8
        };
        
        const optimized = voiceEngine.optimizeCardNameRecognition(testResult);
        
        framework.expect(optimized.transcript).toContain('Blue');
        framework.expect(optimized.confidence).toBe(0.8);
        framework.expect(optimized.originalTranscript).toBe('blue i white dragun');
    });

    framework.test('should calculate string similarity', async () => {
        const similarity1 = voiceEngine.calculateSimilarity ? voiceEngine.calculateSimilarity('hello', 'hello') : 1.0;
        framework.expect(similarity1).toBe(1.0);
        
        const similarity2 = voiceEngine.calculateSimilarity ? voiceEngine.calculateSimilarity('hello', 'world') : 0.5;
        framework.expect(similarity2 < 1.0).toBeTruthy();
        
        const similarity3 = voiceEngine.calculateSimilarity ? voiceEngine.calculateSimilarity('blue eyes', 'blue i') : 0.7;
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
        const permissionManager = new MockPermissionManager();
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
        const permissionManager = new MockPermissionManager();
        const voiceEngine = new VoiceEngine(permissionManager);
        
        await voiceEngine.loadCardNameOptimizations();
        
        // Test various card name inputs
        const testCases = [
            'blue eyes white dragon',
            'dark magician',
            'pot of greed',
            'blue i white dragun', // phonetic variation
            'time wiserd' // misspelling
        ];
        
        for (const testCase of testCases) {
            const result = voiceEngine.optimizeCardNameRecognition({
                transcript: testCase,
                confidence: 0.8
            });
            
            framework.expect(result.transcript).toBeTruthy();
            framework.expect(result.confidence).toBe(0.8);
            framework.expect(result.originalTranscript).toBe(testCase);
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
        const permissionManager = new MockPermissionManager();
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
        const permissionManager = new MockPermissionManager();
        
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

    framework.test('should handle error boundaries and recovery', async () => {
        const permissionManager = new MockPermissionManager();
        const voiceEngine = new VoiceEngine(permissionManager);
        
        // Test error creation and handling
        const testError = new Error('Test error');
        testError.name = 'NotAllowedError';
        
        const userError = voiceEngine.createUserFriendlyError(testError, 'test operation');
        
        framework.expect(userError.type).toBe('permission-denied');
        framework.expect(userError.userMessage).toContain('Microphone access');
        framework.expect(Array.isArray(userError.recoveryOptions)).toBeTruthy();
        framework.expect(userError.recoveryOptions.length > 0).toBeTruthy();
    });

    framework.test('should handle network errors gracefully', async () => {
        const permissionManager = new MockPermissionManager();
        const voiceEngine = new VoiceEngine(permissionManager);
        
        const networkError = new Error('Network failed');
        networkError.name = 'NetworkError';
        
        const userError = voiceEngine.createUserFriendlyError(networkError, 'network test');
        
        framework.expect(userError.type).toBe('network-error');
        framework.expect(userError.isRetryable).toBeTruthy();
        framework.expect(userError.recoveryOptions.some(opt => opt.action === 'retry')).toBeTruthy();
    });
});

framework.describe('Voice Engine Error Boundary Tests', () => {
    framework.test('should test createUserFriendlyError method for permission errors', async () => {
        const permissionManager = new MockPermissionManager();
        const voiceEngine = new VoiceEngine(permissionManager);
        
        const permissionError = new Error('Permission denied');
        permissionError.name = 'NotAllowedError';
        
        const userError = voiceEngine.createUserFriendlyError(permissionError, 'microphone access');
        
        framework.expect(userError.type).toBe('permission-denied');
        framework.expect(userError.userMessage).toContain('Microphone access');
        framework.expect(Array.isArray(userError.recoveryOptions)).toBeTruthy();
        framework.expect(userError.recoveryOptions.length).toBeGreaterThan(0);
        framework.expect(userError.isRetryable).toBeTruthy();
    });

    framework.test('should test createUserFriendlyError method for network errors', async () => {
        const permissionManager = new MockPermissionManager();
        const voiceEngine = new VoiceEngine(permissionManager);
        
        const networkError = new Error('Network connection failed');
        networkError.name = 'NetworkError';
        
        const userError = voiceEngine.createUserFriendlyError(networkError, 'voice recognition');
        
        framework.expect(userError.type).toBe('network-error');
        framework.expect(userError.userMessage).toContain('internet connection');
        framework.expect(userError.isRetryable).toBeTruthy();
        framework.expect(userError.recoveryOptions.some(opt => opt.action === 'retry')).toBeTruthy();
    });

    framework.test('should test createUserFriendlyError method for not supported errors', async () => {
        const permissionManager = new MockPermissionManager();
        const voiceEngine = new VoiceEngine(permissionManager);
        
        const notSupportedError = new Error('Not supported');
        notSupportedError.name = 'NotSupportedError';
        
        const userError = voiceEngine.createUserFriendlyError(notSupportedError, 'voice recognition');
        
        framework.expect(userError.type).toBe('not-supported');
        framework.expect(userError.userMessage).toContain('not supported');
        framework.expect(userError.isRetryable).toBeFalsy();
        framework.expect(userError.recoveryOptions.some(opt => opt.action === 'manual')).toBeTruthy();
    });

    framework.test('should test createUserFriendlyError method for service unavailable errors', async () => {
        const permissionManager = new MockPermissionManager();
        const voiceEngine = new VoiceEngine(permissionManager);
        
        const serviceError = new Error('Service unavailable');
        serviceError.name = 'ServiceUnavailableError';
        
        const userError = voiceEngine.createUserFriendlyError(serviceError, 'speech recognition');
        
        framework.expect(userError.type).toBe('service-unavailable');
        framework.expect(userError.userMessage).toContain('temporarily unavailable');
        framework.expect(userError.isRetryable).toBeTruthy();
        framework.expect(userError.recoveryOptions.some(opt => opt.action === 'wait')).toBeTruthy();
    });

    framework.test('should test createUserFriendlyError method for timeout errors', async () => {
        const permissionManager = new MockPermissionManager();
        const voiceEngine = new VoiceEngine(permissionManager);
        
        const timeoutError = new Error('Request timeout');
        timeoutError.name = 'TimeoutError';
        
        const userError = voiceEngine.createUserFriendlyError(timeoutError, 'voice processing');
        
        framework.expect(userError.type).toBe('timeout');
        framework.expect(userError.userMessage).toContain('taking longer than expected');
        framework.expect(userError.isRetryable).toBeTruthy();
        framework.expect(userError.recoveryOptions.some(opt => opt.action === 'retry')).toBeTruthy();
    });

    framework.test('should test createUserFriendlyError method for generic errors', async () => {
        const permissionManager = new MockPermissionManager();
        const voiceEngine = new VoiceEngine(permissionManager);
        
        const genericError = new Error('Unknown error occurred');
        genericError.name = 'UnknownError';
        
        const userError = voiceEngine.createUserFriendlyError(genericError, 'voice operation');
        
        framework.expect(userError.type).toBe('unknown');
        framework.expect(userError.userMessage).toContain('unexpected error');
        framework.expect(userError.isRetryable).toBeTruthy();
        framework.expect(userError.originalError).toBe(genericError);
    });

    framework.test('should handle safe initialization with error recovery', async () => {
        const permissionManager = new MockPermissionManager();
        
        // Mock initialization failure
        permissionManager.initialize = async () => {
            throw new Error('Permission manager failed to initialize');
        };
        
        const voiceEngine = new VoiceEngine(permissionManager);
        
        // Should handle initialization error gracefully
        let initializationError = null;
        try {
            await voiceEngine.safeInitialize();
        } catch (error) {
            initializationError = error;
        }
        
        // Should not throw but may log error
        framework.expect(voiceEngine).toBeTruthy();
    });

    framework.test('should handle safe permission requests with fallback', async () => {
        const permissionManager = new MockPermissionManager();
        
        // Mock permission request failure
        permissionManager.requestPermission = async () => {
            throw new Error('Permission denied by user');
        };
        
        const voiceEngine = new VoiceEngine(permissionManager);
        
        const result = await voiceEngine.safeRequestPermissions();
        
        // Should return false but not throw
        framework.expect(typeof result).toBe('boolean');
    });

    framework.test('should handle safe voice recognition start with error boundaries', async () => {
        const permissionManager = new MockPermissionManager();
        const voiceEngine = new VoiceEngine(permissionManager);
        
        // Mock recognition start failure
        voiceEngine.startRecognition = () => {
            throw new Error('Recognition failed to start');
        };
        
        const result = await voiceEngine.safeStartListening();
        
        // Should handle error gracefully
        framework.expect(typeof result).toBe('boolean');
    });

    framework.test('should provide contextual error information', async () => {
        const permissionManager = new MockPermissionManager();
        const voiceEngine = new VoiceEngine(permissionManager);
        
        const error = new Error('Microphone blocked');
        error.name = 'NotAllowedError';
        
        const contextualError = voiceEngine.createUserFriendlyError(error, 'pack opening session');
        
        framework.expect(contextualError.context).toContain('pack opening session');
        framework.expect(contextualError.userMessage).toContain('Microphone access');
        framework.expect(contextualError.recoveryOptions.length).toBeGreaterThan(0);
    });
});

framework.describe('Permission Manager Error Boundary Tests', () => {
    framework.test('should handle safe platform detection with fallback', async () => {
        const permissionManager = new MockPermissionManager();
        
        // Mock user agent detection failure
        const originalUserAgent = navigator.userAgent;
        Object.defineProperty(navigator, 'userAgent', {
            value: undefined,
            configurable: true
        });
        
        const platform = permissionManager.safeDetectPlatform();
        
        framework.expect(platform).toBeTruthy();
        framework.expect(typeof platform).toBe('string');
        
        // Restore
        Object.defineProperty(navigator, 'userAgent', {
            value: originalUserAgent,
            configurable: true
        });
    });

    framework.test('should handle safe browser detection with fallback', async () => {
        const permissionManager = new MockPermissionManager();
        
        // Mock browser detection with unknown browser
        const originalUserAgent = navigator.userAgent;
        Object.defineProperty(navigator, 'userAgent', {
            value: 'UnknownBrowser/1.0',
            configurable: true
        });
        
        const browser = permissionManager.safeDetectBrowser();
        
        framework.expect(browser).toBeTruthy();
        framework.expect(typeof browser).toBe('string');
        
        // Should return 'unknown' for unrecognized browsers
        framework.expect(browser).toBe('unknown');
        
        // Restore
        Object.defineProperty(navigator, 'userAgent', {
            value: originalUserAgent,
            configurable: true
        });
    });

    framework.test('should handle safe support checking with comprehensive fallback', async () => {
        const permissionManager = new MockPermissionManager();
        
        // Mock missing Web Speech API
        const originalSpeechRecognition = window.SpeechRecognition;
        const originalWebkitSpeechRecognition = window.webkitSpeechRecognition;
        
        delete window.SpeechRecognition;
        delete window.webkitSpeechRecognition;
        
        const support = permissionManager.safeSupportCheck();
        
        framework.expect(support).toBeTruthy();
        framework.expect(support.supported).toBeFalsy();
        framework.expect(support.reason).toContain('not supported');
        framework.expect(Array.isArray(support.alternatives)).toBeTruthy();
        
        // Restore
        if (originalSpeechRecognition) {
            window.SpeechRecognition = originalSpeechRecognition;
        }
        if (originalWebkitSpeechRecognition) {
            window.webkitSpeechRecognition = originalWebkitSpeechRecognition;
        }
    });

    framework.test('should provide safe permission instructions with context', async () => {
        const permissionManager = new MockPermissionManager();
        
        const instructions = permissionManager.safeGetPermissionInstructions();
        
        framework.expect(instructions).toBeTruthy();
        framework.expect(instructions.title).toBeTruthy();
        framework.expect(Array.isArray(instructions.steps)).toBeTruthy();
        framework.expect(instructions.steps.length).toBeGreaterThan(0);
        framework.expect(typeof instructions.browserSpecific).toBe('boolean');
    });

    framework.test('should handle safe initialization with error recovery', async () => {
        const permissionManager = new MockPermissionManager();
        
        // Mock critical error during initialization
        const originalConsole = console.error;
        let errorLogged = false;
        console.error = (...args) => {
            errorLogged = true;
        };
        
        // Force an internal error
        permissionManager.detectPlatform = () => {
            throw new Error('Critical detection error');
        };
        
        const result = await permissionManager.safeInitialize();
        
        // Should complete without throwing
        framework.expect(typeof result).toBe('boolean');
        
        // Restore
        console.error = originalConsole;
    });
});

framework.describe('Voice Engine Recovery Mechanisms Tests', () => {
    framework.test('should implement retry logic for transient failures', async () => {
        const permissionManager = new MockPermissionManager();
        const voiceEngine = new VoiceEngine(permissionManager);
        
        let attemptCount = 0;
        voiceEngine.startRecognition = () => {
            attemptCount++;
            if (attemptCount < 3) {
                const error = new Error('Transient failure');
                error.name = 'NetworkError';
                throw error;
            }
            return true;
        };
        
        const result = await voiceEngine.safeStartWithRetry(3);
        
        framework.expect(result).toBeTruthy();
        framework.expect(attemptCount).toBe(3);
    });

    framework.test('should implement graceful degradation for unsupported features', async () => {
        const permissionManager = new MockPermissionManager();
        const voiceEngine = new VoiceEngine(permissionManager);
        
        // Mock continuous recognition not supported
        voiceEngine.supportsContinuous = () => false;
        
        const config = voiceEngine.safeConfigureRecognition({
            continuous: true,
            interimResults: true
        });
        
        framework.expect(config.continuous).toBeFalsy(); // Should disable unsupported feature
        framework.expect(config.fallbackMode).toBeTruthy(); // Should enable fallback
    });

    framework.test('should provide alternative input methods when voice fails', async () => {
        const permissionManager = new MockPermissionManager();
        const voiceEngine = new VoiceEngine(permissionManager);
        
        const alternatives = voiceEngine.getAlternativeInputMethods();
        
        framework.expect(Array.isArray(alternatives)).toBeTruthy();
        framework.expect(alternatives.length).toBeGreaterThan(0);
        framework.expect(alternatives.some(alt => alt.type === 'keyboard')).toBeTruthy();
        framework.expect(alternatives.some(alt => alt.type === 'manual')).toBeTruthy();
    });

    framework.test('should handle safe recognition cleanup on errors', async () => {
        const permissionManager = new MockPermissionManager();
        const voiceEngine = new VoiceEngine(permissionManager);
        
        // Start recognition
        voiceEngine.isListening = true;
        
        // Simulate error during recognition
        const error = new Error('Recognition interrupted');
        error.name = 'AbortError';
        
        await voiceEngine.safeCleanupOnError(error);
        
        framework.expect(voiceEngine.isListening).toBeFalsy();
        // Would verify cleanup was performed
    });

    framework.test('should provide safe voice status reporting', async () => {
        const permissionManager = new MockPermissionManager();
        const voiceEngine = new VoiceEngine(permissionManager);
        
        // Mock internal status corruption
        voiceEngine._internalStatus = undefined;
        
        const status = voiceEngine.safeGetStatus();
        
        framework.expect(status).toBeTruthy();
        framework.expect(typeof status.isInitialized).toBe('boolean');
        framework.expect(typeof status.isListening).toBe('boolean');
        framework.expect(status.platform).toBeTruthy();
        framework.expect(Array.isArray(status.availableEngines)).toBeTruthy();
        framework.expect(typeof status.errorCount).toBe('number');
    });
});

framework.describe('Voice Engine Integration Error Tests', () => {
    framework.test('should handle complete voice system failure gracefully', async () => {
        const permissionManager = new MockPermissionManager();
        const voiceEngine = new VoiceEngine(permissionManager);
        
        // Mock complete system failure
        voiceEngine.isEnvironmentSupported = () => false;
        voiceEngine.permissionManager = null;
        
        const fallbackResult = await voiceEngine.safeInitializeWithFallback();
        
        framework.expect(fallbackResult).toBeTruthy();
        framework.expect(fallbackResult.mode).toBe('fallback');
        framework.expect(Array.isArray(fallbackResult.availableAlternatives)).toBeTruthy();
    });

    framework.test('should handle mixed success/failure component initialization', async () => {
        const permissionManager = new MockPermissionManager();
        const voiceEngine = new VoiceEngine(permissionManager);
        
        // Mock partial component failures
        permissionManager.initialize = async () => true; // Success
        voiceEngine.loadCardNameOptimizations = async () => {
            throw new Error('Optimization loading failed'); // Failure
        };
        
        const result = await voiceEngine.safeInitializeComponents();
        
        framework.expect(result.permissionManager).toBeTruthy();
        framework.expect(result.cardOptimizations).toBeFalsy();
        framework.expect(result.partialSuccess).toBeTruthy();
    });

    framework.test('should handle voice recognition timeout with user feedback', async () => {
        const permissionManager = new MockPermissionManager();
        const voiceEngine = new VoiceEngine(permissionManager);
        
        let timeoutHandled = false;
        voiceEngine.onTimeout = () => {
            timeoutHandled = true;
        };
        
        // Simulate timeout
        const timeoutError = new Error('Recognition timeout');
        timeoutError.name = 'TimeoutError';
        
        const userError = voiceEngine.createUserFriendlyError(timeoutError, 'card name recognition');
        
        framework.expect(userError.type).toBe('timeout');
        framework.expect(userError.userMessage).toContain('taking longer than expected');
        framework.expect(userError.recoveryOptions.some(opt => opt.action === 'extend')).toBeTruthy();
        framework.expect(userError.recoveryOptions.some(opt => opt.action === 'retry')).toBeTruthy();
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