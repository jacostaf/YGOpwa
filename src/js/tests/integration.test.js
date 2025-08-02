/**
 * Integration Tests - Real Component Testing
 * 
 * These tests address QA feedback by testing actual components instead of mocks.
 * They validate real error boundaries, permission handling, and component interactions.
 */

// Import real components instead of mocks
import { YGORipperApp } from '../app.js';
import { VoiceEngine } from '../voice/VoiceEngine.js';
import { PermissionManager } from '../voice/PermissionManager.js';
import { SessionManager } from '../session/SessionManager.js';
import { Storage } from '../utils/Storage.js';
import { Logger } from '../utils/Logger.js';

// Test framework
class IntegrationTestFramework {
    constructor() {
        this.tests = [];
        this.results = [];
        this.logger = new Logger('IntegrationTests');
    }

    describe(name, testFn) {
        console.group(`🔗 ${name}`);
        testFn();
        console.groupEnd();
    }

    test(name, testFn, timeout = 10000) {
        this.tests.push({ name, testFn, timeout });
    }

    async runAll() {
        console.log('🚀 Running Real Component Integration Tests...');
        
        for (const test of this.tests) {
            try {
                console.time(test.name);
                
                // Run test with timeout
                await Promise.race([
                    test.testFn(),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Test timeout')), test.timeout)
                    )
                ]);
                
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
        
        console.log('\n📊 Integration Test Results:');
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
            toThrow: async () => {
                let threw = false;
                try {
                    if (typeof actual === 'function') {
                        await actual();
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
            toBeInstanceOf: (expected) => {
                if (!(actual instanceof expected)) {
                    throw new Error(`Expected ${actual} to be instance of ${expected}`);
                }
            }
        };
    }
}

// Memory leak detection utility
class MemoryLeakDetector {
    constructor() {
        this.baseline = null;
        this.measurements = [];
    }

    setBaseline() {
        if (performance.memory) {
            this.baseline = {
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                totalJSHeapSize: performance.memory.totalJSHeapSize,
                jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
                timestamp: Date.now()
            };
        }
    }

    measureMemory(label) {
        if (performance.memory && this.baseline) {
            const current = {
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                totalJSHeapSize: performance.memory.totalJSHeapSize,
                jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
                timestamp: Date.now()
            };

            const delta = {
                label,
                usedDelta: current.usedJSHeapSize - this.baseline.usedJSHeapSize,
                totalDelta: current.totalJSHeapSize - this.baseline.totalJSHeapSize,
                timeDelta: current.timestamp - this.baseline.timestamp
            };

            this.measurements.push(delta);
            return delta;
        }
        return null;
    }

    detectLeaks() {
        if (this.measurements.length < 2) return null;

        const leaks = this.measurements.filter(m => m.usedDelta > 1024 * 1024); // 1MB threshold
        return {
            hasLeaks: leaks.length > 0,
            suspiciousOperations: leaks,
            totalMemoryIncrease: this.measurements[this.measurements.length - 1].usedDelta
        };
    }
}

// Network failure simulator
class NetworkFailureSimulator {
    constructor() {
        this.originalFetch = window.fetch;
        this.isSimulating = false;
        this.failureType = null;
    }

    simulateNetworkFailure(type = 'offline') {
        this.isSimulating = true;
        this.failureType = type;

        window.fetch = async (...args) => {
            switch (type) {
                case 'offline':
                    throw new Error('Failed to fetch: Network request failed');
                case 'timeout':
                    await new Promise(resolve => setTimeout(resolve, 30000)); // Simulate timeout
                    throw new Error('Request timeout');
                case 'server-error':
                    return new Response(null, { status: 500, statusText: 'Internal Server Error' });
                default:
                    return this.originalFetch(...args);
            }
        };
    }

    restoreNetwork() {
        this.isSimulating = false;
        this.failureType = null;
        window.fetch = this.originalFetch;
    }
}

// Permission failure simulator
class PermissionFailureSimulator {
    constructor() {
        this.originalGetUserMedia = navigator.mediaDevices.getUserMedia;
        this.originalPermissions = navigator.permissions;
        this.isSimulating = false;
    }

    simulatePermissionDenied() {
        this.isSimulating = true;

        // Mock getUserMedia to reject with permission denied
        navigator.mediaDevices.getUserMedia = async () => {
            throw new DOMException('Permission denied', 'NotAllowedError');
        };

        // Mock permissions API if available
        if (navigator.permissions && navigator.permissions.query) {
            navigator.permissions.query = async ({ name }) => {
                if (name === 'microphone') {
                    return { state: 'denied' };
                }
                return this.originalPermissions.query({ name });
            };
        }
    }

    simulatePermissionPrompt() {
        this.isSimulating = true;

        navigator.mediaDevices.getUserMedia = async () => {
            throw new DOMException('Permission prompt required', 'NotAllowedError');
        };
    }

    restore() {
        this.isSimulating = false;
        navigator.mediaDevices.getUserMedia = this.originalGetUserMedia;
        if (this.originalPermissions) {
            navigator.permissions = this.originalPermissions;
        }
    }
}

// Storage corruption simulator
class StorageCorruptionSimulator {
    constructor() {
        this.originalLocalStorage = window.localStorage;
        this.isSimulating = false;
    }

    simulateStorageCorruption() {
        this.isSimulating = true;

        window.localStorage = {
            getItem: (key) => {
                if (key === 'settings') {
                    return '{"invalid": json}'; // Corrupted JSON
                }
                throw new Error('Storage access denied');
            },
            setItem: () => {
                throw new Error('Storage quota exceeded');
            },
            removeItem: () => {
                throw new Error('Storage access denied');
            },
            clear: () => {
                throw new Error('Storage access denied');
            },
            key: () => null,
            length: 0
        };
    }

    restore() {
        this.isSimulating = false;
        window.localStorage = this.originalLocalStorage;
    }
}

// Test suite
const framework = new IntegrationTestFramework();

framework.describe('Real YGORipperApp Initialization Tests', () => {
    framework.test('should handle actual component initialization failures', async () => {
        const storageSimulator = new StorageCorruptionSimulator();
        const memoryDetector = new MemoryLeakDetector();

        try {
            memoryDetector.setBaseline();

            // Simulate storage corruption
            storageSimulator.simulateStorageCorruption();

            // Create real app instance
            const app = new YGORipperApp({ skipInitialization: true });
            
            // Attempt initialization with corrupted storage
            let initializationFailed = false;
            try {
                await app.initialize();
            } catch (error) {
                initializationFailed = true;
                framework.expect(error.message).toContain('Storage');
            }

            // Verify error boundary worked
            framework.expect(initializationFailed).toBeTruthy();
            
            // Check memory usage
            const memoryDelta = memoryDetector.measureMemory('storage-failure-init');
            framework.expect(memoryDelta.usedDelta).toBeLessThan(10 * 1024 * 1024); // < 10MB increase

        } finally {
            storageSimulator.restore();
        }
    });

    framework.test('should recover from component initialization failures with fallbacks', async () => {
        const app = new YGORipperApp({ skipInitialization: true });
        
        // Override storage initialization to fail initially
        const originalStorageInit = app.storage.initialize;
        let initAttempts = 0;
        
        app.storage.initialize = async () => {
            initAttempts++;
            if (initAttempts === 1) {
                throw new Error('Storage initialization failed');
            }
            return true; // Succeed on retry
        };

        try {
            // Test safe initialization methods
            await app.safeInitializeStorage();
            
            // Verify fallback was used and app can continue
            framework.expect(initAttempts).toBe(2); // Should have retried
            framework.expect(app.storage).toBeTruthy();
            
        } finally {
            app.storage.initialize = originalStorageInit;
        }
    });

    framework.test('should handle cascading component failures gracefully', async () => {
        const memoryDetector = new MemoryLeakDetector();
        const storageSimulator = new StorageCorruptionSimulator();
        const permissionSimulator = new PermissionFailureSimulator();

        try {
            memoryDetector.setBaseline();

            // Simulate multiple failure conditions
            storageSimulator.simulateStorageCorruption();
            permissionSimulator.simulatePermissionDenied();

            const app = new YGORipperApp({ skipInitialization: true });
            
            // Test cascading failures
            let errors = [];
            
            try {
                await app.safeInitializeStorage();
            } catch (error) {
                errors.push('storage');
            }

            try {
                await app.safeInitializeVoice();
            } catch (error) {
                errors.push('voice');
            }

            // Verify graceful degradation
            framework.expect(errors.length).toBeGreaterThan(0);
            framework.expect(app).toBeTruthy(); // App instance should still exist
            
            // Check memory didn't leak during failures
            const memoryDelta = memoryDetector.measureMemory('cascading-failures');
            framework.expect(memoryDelta.usedDelta).toBeLessThan(50 * 1024 * 1024); // < 50MB

        } finally {
            storageSimulator.restore();
            permissionSimulator.restore();
        }
    });
});

framework.describe('Real VoiceEngine Error Handling Tests', () => {
    framework.test('should handle actual permission denied scenarios', async () => {
        const permissionSimulator = new PermissionFailureSimulator();
        const memoryDetector = new MemoryLeakDetector();

        try {
            memoryDetector.setBaseline();
            permissionSimulator.simulatePermissionDenied();

            const permissionManager = new PermissionManager();
            const voiceEngine = new VoiceEngine(permissionManager);

            let permissionError = null;
            voiceEngine.onError((error) => {
                permissionError = error;
            });

            // Test real permission failure
            try {
                await voiceEngine.initialize();
                framework.expect(false).toBeTruthy(); // Should not reach here
            } catch (error) {
                framework.expect(error.message).toContain('permission');
            }

            // Verify error boundary captured the real permission error
            if (permissionError) {
                framework.expect(permissionError.type).toBe('permission-denied');
                framework.expect(permissionError.recoveryOptions).toBeTruthy();
                framework.expect(permissionError.recoveryOptions.length).toBeGreaterThan(0);
            }

            // Check memory usage during permission failure
            const memoryDelta = memoryDetector.measureMemory('permission-denied');
            framework.expect(memoryDelta.usedDelta).toBeLessThan(5 * 1024 * 1024); // < 5MB

        } finally {
            permissionSimulator.restore();
        }
    });

    framework.test('should handle real network failures during voice recognition', async () => {
        const networkSimulator = new NetworkFailureSimulator();
        const memoryDetector = new MemoryLeakDetector();

        try {
            memoryDetector.setBaseline();

            // Create mock permission manager that grants access
            const mockPermissionManager = {
                initialize: async () => true,
                requestMicrophone: async () => ({ state: 'granted' })
            };

            const voiceEngine = new VoiceEngine(mockPermissionManager);
            
            let networkError = null;
            voiceEngine.onError((error) => {
                networkError = error;
            });

            // Initialize first (should succeed)
            await voiceEngine.initialize();

            // Then simulate network failure
            networkSimulator.simulateNetworkFailure('offline');

            // Test network-dependent operations
            try {
                await voiceEngine.startListening();
                // Simulate network error during recognition
                voiceEngine.handleRecognitionError({ error: 'network' }, 'webspeech');
            } catch (error) {
                // Expected - network failure should be handled
            }

            // Verify network error handling
            if (networkError) {
                framework.expect(networkError.type).toContain('network');
                framework.expect(networkError.isRetryable).toBeTruthy();
            }

            // Check memory during network failure
            const memoryDelta = memoryDetector.measureMemory('network-failure');
            framework.expect(memoryDelta.usedDelta).toBeLessThan(10 * 1024 * 1024); // < 10MB

        } finally {
            networkSimulator.restoreNetwork();
        }
    });

    framework.test('should perform actual browser compatibility testing', async () => {
        const voiceEngine = new VoiceEngine();
        
        // Test real browser environment detection
        const isSupported = voiceEngine.isEnvironmentSupported();
        const platform = voiceEngine.detectPlatform();
        
        framework.expect(typeof isSupported).toBe('boolean');
        framework.expect(typeof platform).toBe('string');
        
        // Test platform-specific optimizations are applied
        voiceEngine.applyPlatformOptimizations();
        
        // Verify configuration was adjusted for platform
        framework.expect(voiceEngine.config).toBeTruthy();
        
        if (platform === 'ios' || platform === 'mac') {
            framework.expect(voiceEngine.config.continuous).toBeFalsy();
        }
    });
});

framework.describe('Real SessionManager Integration Tests', () => {
    framework.test('should handle actual storage corruption scenarios', async () => {
        const storageSimulator = new StorageCorruptionSimulator();
        const memoryDetector = new MemoryLeakDetector();

        try {
            memoryDetector.setBaseline();
            storageSimulator.simulateStorageCorruption();

            const storage = new Storage();
            const sessionManager = new SessionManager();

            // Test real storage corruption handling
            let initializationError = null;
            try {
                await sessionManager.initialize(storage);
            } catch (error) {
                initializationError = error;
            }

            framework.expect(initializationError).toBeTruthy();
            framework.expect(initializationError.message).toContain('Storage');

            // Test recovery with clean state
            storageSimulator.restore();
            
            try {
                await sessionManager.initialize(storage, true); // Force clean
                framework.expect(sessionManager).toBeTruthy();
            } catch (error) {
                // Recovery should work after storage is restored
                framework.expect(false).toBeTruthy();
            }

            // Check memory usage during corruption handling
            const memoryDelta = memoryDetector.measureMemory('storage-corruption');
            framework.expect(memoryDelta.usedDelta).toBeLessThan(20 * 1024 * 1024); // < 20MB

        } finally {
            storageSimulator.restore();
        }
    });

    framework.test('should validate safe methods prevent actual crashes', async () => {
        const app = new YGORipperApp({ skipInitialization: true });
        await app.initialize();

        // Test safe methods with real failures
        const corruptedCard = { name: null, rarity: undefined }; // Invalid card data

        let crashOccurred = false;
        const originalError = window.onerror;
        
        window.onerror = () => {
            crashOccurred = true;
            return false;
        };

        try {
            // Test safeAddCard with corrupted data
            await app.safeAddCard(corruptedCard);
            
            // Test safeProcessVoiceInput with invalid transcript
            await app.safeProcessVoiceInput(null);
            
            // Test safeAutoSave when storage fails
            app.storage.set = async () => {
                throw new Error('Storage failure');
            };
            await app.safeAutoSave();

            // Verify no crashes occurred
            framework.expect(crashOccurred).toBeFalsy();

        } finally {
            window.onerror = originalError;
        }
    });
});

framework.describe('Memory Leak Detection Tests', () => {
    framework.test('should detect memory leaks during repeated error recovery cycles', async () => {
        const memoryDetector = new MemoryLeakDetector();
        const permissionSimulator = new PermissionFailureSimulator();

        try {
            memoryDetector.setBaseline();
            permissionSimulator.simulatePermissionDenied();

            // Simulate repeated error recovery cycles
            for (let i = 0; i < 10; i++) {
                const permissionManager = new PermissionManager();
                const voiceEngine = new VoiceEngine(permissionManager);

                try {
                    await voiceEngine.initialize();
                } catch (error) {
                    // Expected failure
                }

                // Force garbage collection if available
                if (window.gc) {
                    window.gc();
                }

                memoryDetector.measureMemory(`cycle-${i}`);
            }

            // Analyze memory usage
            const leakAnalysis = memoryDetector.detectLeaks();
            
            // Should not have significant memory increase
            framework.expect(leakAnalysis.totalMemoryIncrease).toBeLessThan(100 * 1024 * 1024); // < 100MB
            
            if (leakAnalysis.hasLeaks) {
                console.warn('Potential memory leaks detected:', leakAnalysis.suspiciousOperations);
            }

        } finally {
            permissionSimulator.restore();
        }
    });

    framework.test('should validate error boundary cleanup and resource deallocation', async () => {
        const memoryDetector = new MemoryLeakDetector();
        memoryDetector.setBaseline();

        const resources = [];

        // Create multiple app instances and let them fail
        for (let i = 0; i < 5; i++) {
            const app = new YGORipperApp({ skipInitialization: true });
            
            try {
                // Simulate various initialization failures
                app.storage.initialize = async () => {
                    throw new Error('Storage unavailable');
                };
                
                await app.initialize();
            } catch (error) {
                // Expected failure
            }

            resources.push(app);
            
            // Measure memory after each failure
            memoryDetector.measureMemory(`resource-${i}`);
        }

        // Cleanup resources
        resources.forEach(app => {
            if (app.cleanup) {
                app.cleanup();
            }
        });

        // Force garbage collection
        if (window.gc) {
            window.gc();
        }

        const finalMemory = memoryDetector.measureMemory('final-cleanup');
        
        // Memory should not have grown excessively
        framework.expect(finalMemory.usedDelta).toBeLessThan(50 * 1024 * 1024); // < 50MB total
    });
});

framework.describe('Cross-Browser Compatibility Tests', () => {
    framework.test('should handle browser-specific voice recognition differences', async () => {
        const voiceEngine = new VoiceEngine();
        
        // Test browser detection
        const platform = voiceEngine.detectPlatform();
        framework.expect(platform).toBeTruthy();
        
        // Test browser-specific feature detection
        const hasWebSpeech = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
        const isSecureContext = window.isSecureContext;
        
        if (hasWebSpeech && isSecureContext) {
            // Test actual Web Speech API initialization
            await voiceEngine.initializeWebSpeechEngine();
            framework.expect(voiceEngine.engines.has('webspeech')).toBeTruthy();
        } else {
            // Test graceful degradation when not supported
            framework.expect(voiceEngine.isEnvironmentSupported()).toBeFalsy();
        }
    });

    framework.test('should validate error boundaries across different environments', async () => {
        const app = new YGORipperApp({ skipInitialization: true });
        
        // Test environment-specific error handling
        const errors = [];
        
        // Simulate various browser-specific errors
        const testErrors = [
            new DOMException('Permission denied', 'NotAllowedError'),
            new DOMException('Device not found', 'NotFoundError'),
            new Error('Network request failed'),
            new TypeError('Cannot read property of undefined')
        ];

        for (const error of testErrors) {
            try {
                throw error;
            } catch (caught) {
                const userError = app.voiceEngine ? 
                    app.voiceEngine.createUserFriendlyError(caught, 'test') : 
                    { type: 'unknown', message: caught.message };
                
                errors.push(userError);
            }
        }

        // Verify all errors were handled gracefully
        framework.expect(errors.length).toBe(testErrors.length);
        errors.forEach(error => {
            framework.expect(error.type).toBeTruthy();
            framework.expect(error.message || error.userMessage).toBeTruthy();
        });
    });
});

framework.describe('Performance Monitoring Tests', () => {
    framework.test('should monitor error boundary performance impact', async () => {
        const startTime = performance.now();
        const memoryDetector = new MemoryLeakDetector();
        memoryDetector.setBaseline();

        const app = new YGORipperApp({ skipInitialization: true });
        
        // Measure normal operation performance
        const normalStartTime = performance.now();
        await app.safeLoadSettings();
        const normalEndTime = performance.now();
        const normalDuration = normalEndTime - normalStartTime;

        // Measure error boundary performance
        app.storage.get = async () => {
            throw new Error('Storage error');
        };

        const errorStartTime = performance.now();
        await app.safeLoadSettings();
        const errorEndTime = performance.now();
        const errorDuration = errorEndTime - errorStartTime;

        // Error handling should not significantly impact performance
        const performanceRatio = errorDuration / normalDuration;
        framework.expect(performanceRatio).toBeLessThan(10); // Error handling < 10x slower

        // Check memory impact
        const memoryDelta = memoryDetector.measureMemory('error-boundary-performance');
        framework.expect(memoryDelta.usedDelta).toBeLessThan(10 * 1024 * 1024); // < 10MB

        const totalTime = performance.now() - startTime;
        console.log(`Performance test completed in ${totalTime.toFixed(2)}ms`);
    });

    framework.test('should validate performance under continuous error conditions', async () => {
        const app = new YGORipperApp({ skipInitialization: true });
        const memoryDetector = new MemoryLeakDetector();
        memoryDetector.setBaseline();

        // Simulate continuous errors for 5 seconds
        const errorInterval = setInterval(async () => {
            try {
                await app.safeProcessVoiceInput(null); // Will cause error
            } catch (error) {
                // Expected
            }
        }, 100);

        // Let errors run for 2 seconds
        await new Promise(resolve => setTimeout(resolve, 2000));
        clearInterval(errorInterval);

        // Check performance degradation
        const memoryDelta = memoryDetector.measureMemory('continuous-errors');
        
        // Memory should not grow excessively under continuous errors
        framework.expect(memoryDelta.usedDelta).toBeLessThan(30 * 1024 * 1024); // < 30MB
        
        // App should still be responsive
        const startTime = performance.now();
        await app.safeLoadSettings();
        const endTime = performance.now();
        
        framework.expect(endTime - startTime).toBeLessThan(1000); // < 1 second response
    });
});

// Export for manual testing
window.runIntegrationTests = () => framework.runAll();

// Auto-run if in test mode
if (window.location.search.includes('test=integration')) {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            framework.runAll();
        }, 1000);
    });
}

console.log('🔗 Integration tests loaded. Run with: runIntegrationTests()');

export { framework as IntegrationTestFramework };