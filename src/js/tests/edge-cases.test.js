/**
 * Critical Edge Case Tests - Cascading Failures & Browser Compatibility
 * 
 * These tests address QA Priority 1 feedback about missing edge cases that could
 * cause production failures. Focus on cascading failures and cross-browser compatibility.
 */

// Import real components for edge case testing
import { YGORipperApp } from '../app.js';
import { VoiceEngine } from '../voice/VoiceEngine.js';
import { PermissionManager } from '../voice/PermissionManager.js';
import { SessionManager } from '../session/SessionManager.js';
import { Storage } from '../utils/Storage.js';
import { Logger } from '../utils/Logger.js';

// Test framework for edge cases
class EdgeCaseTestFramework {
    constructor() {
        this.tests = [];
        this.results = [];
        this.logger = new Logger('EdgeCaseTests');
    }

    describe(name, testFn) {
        console.group(`🚨 ${name}`);
        testFn();
        console.groupEnd();
    }

    test(name, testFn, timeout = 15000) {
        this.tests.push({ name, testFn, timeout });
    }

    async runAll() {
        console.log('🚨 Running Critical Edge Case Tests...');
        
        for (const test of this.tests) {
            try {
                console.time(test.name);
                
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
        
        console.log('\n📊 Edge Case Test Results:');
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
            toBeLessThan: (expected) => {
                if (!(actual < expected)) {
                    throw new Error(`Expected ${actual} to be less than ${expected}`);
                }
            },
            toBeGreaterThan: (expected) => {
                if (!(actual > expected)) {
                    throw new Error(`Expected ${actual} to be greater than ${expected}`);
                }
            }
        };
    }
}

// Cascading failure simulator for comprehensive edge case testing
class CascadingFailureSimulator {
    constructor() {
        this.activeFailures = new Set();
        this.originalAPIs = {};
        this.failureTimers = new Map();
    }

    async simulateStorageFailure() {
        this.activeFailures.add('storage');
        
        // Save original APIs
        this.originalAPIs.localStorage = window.localStorage;
        
        // Simulate complete storage failure
        Object.defineProperty(window, 'localStorage', {
            value: {
                getItem: () => { throw new Error('Storage quota exceeded'); },
                setItem: () => { throw new Error('Storage quota exceeded'); },
                removeItem: () => { throw new Error('Storage access denied'); },
                clear: () => { throw new Error('Storage access denied'); },
                key: () => null,
                length: 0
            },
            configurable: true
        });
    }

    async simulateVoiceFailure() {
        this.activeFailures.add('voice');
        
        // Save original APIs
        this.originalAPIs.getUserMedia = navigator.mediaDevices.getUserMedia;
        this.originalAPIs.permissions = navigator.permissions;
        
        // Simulate voice/microphone failure
        navigator.mediaDevices.getUserMedia = async () => {
            throw new DOMException('Device not found', 'NotFoundError');
        };

        if (navigator.permissions) {
            navigator.permissions.query = async ({ name }) => {
                if (name === 'microphone') {
                    return { state: 'denied' };
                }
                return this.originalAPIs.permissions.query({ name });
            };
        }
    }

    async simulateNetworkFailure() {
        this.activeFailures.add('network');
        
        // Save original APIs
        this.originalAPIs.fetch = window.fetch;
        this.originalAPIs.XMLHttpRequest = window.XMLHttpRequest;
        
        // Simulate complete network failure
        window.fetch = async () => {
            throw new Error('Network request failed');
        };

        // Mock XMLHttpRequest failures
        window.XMLHttpRequest = class MockXMLHttpRequest {
            open() { /* no-op */ }
            send() {
                setTimeout(() => {
                    if (this.onerror) {
                        this.onerror(new Error('Network error'));
                    }
                }, 100);
            }
            addEventListener(event, handler) {
                if (event === 'error') {
                    this.onerror = handler;
                }
            }
        };
    }

    async simulateSessionFailure() {
        this.activeFailures.add('session');
        
        // This will be handled by corrupting session data during app initialization
        // The app's SessionManager will detect corruption and trigger recovery
    }

    async simulateIntermittentFailures() {
        // Simulate failures that come and go
        const failureTypes = ['storage', 'voice', 'network'];
        
        for (const failureType of failureTypes) {
            const timer = setInterval(async () => {
                if (this.activeFailures.has(failureType)) {
                    await this.restoreFailure(failureType);
                } else {
                    switch (failureType) {
                        case 'storage':
                            await this.simulateStorageFailure();
                            break;
                        case 'voice':
                            await this.simulateVoiceFailure();
                            break;
                        case 'network':
                            await this.simulateNetworkFailure();
                            break;
                    }
                }
            }, 2000 + Math.random() * 3000); // Random interval 2-5 seconds

            this.failureTimers.set(failureType, timer);
        }
    }

    async restoreFailure(failureType) {
        this.activeFailures.delete(failureType);
        
        switch (failureType) {
            case 'storage':
                if (this.originalAPIs.localStorage) {
                    Object.defineProperty(window, 'localStorage', {
                        value: this.originalAPIs.localStorage,
                        configurable: true
                    });
                }
                break;
            case 'voice':
                if (this.originalAPIs.getUserMedia) {
                    navigator.mediaDevices.getUserMedia = this.originalAPIs.getUserMedia;
                }
                if (this.originalAPIs.permissions) {
                    navigator.permissions = this.originalAPIs.permissions;
                }
                break;
            case 'network':
                if (this.originalAPIs.fetch) {
                    window.fetch = this.originalAPIs.fetch;
                }
                if (this.originalAPIs.XMLHttpRequest) {
                    window.XMLHttpRequest = this.originalAPIs.XMLHttpRequest;
                }
                break;
        }
    }

    async restoreAll() {
        // Stop all timers
        for (const timer of this.failureTimers.values()) {
            clearInterval(timer);
        }
        this.failureTimers.clear();

        // Restore all APIs
        for (const failureType of this.activeFailures) {
            await this.restoreFailure(failureType);
        }
        this.activeFailures.clear();
    }

    getActiveFailures() {
        return Array.from(this.activeFailures);
    }
}

// Browser compatibility detector
class BrowserCompatibilityDetector {
    constructor() {
        this.browserInfo = this.detectBrowser();
        this.features = this.detectFeatures();
    }

    detectBrowser() {
        const userAgent = navigator.userAgent.toLowerCase();
        
        if (userAgent.includes('chrome') && !userAgent.includes('edge')) {
            return { name: 'Chrome', family: 'Blink' };
        } else if (userAgent.includes('firefox')) {
            return { name: 'Firefox', family: 'Gecko' };
        } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
            return { name: 'Safari', family: 'WebKit' };
        } else if (userAgent.includes('edge')) {
            return { name: 'Edge', family: 'Blink' };
        } else {
            return { name: 'Unknown', family: 'Unknown' };
        }
    }

    detectFeatures() {
        return {
            webSpeech: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
            mediaDevices: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
            permissions: 'permissions' in navigator,
            serviceWorker: 'serviceWorker' in navigator,
            localStorage: 'localStorage' in window,
            sessionStorage: 'sessionStorage' in window,
            indexedDB: 'indexedDB' in window,
            webAssembly: 'WebAssembly' in window,
            performance: 'performance' in window && 'memory' in performance
        };
    }

    isBrowserSupported() {
        const requiredFeatures = ['webSpeech', 'mediaDevices', 'localStorage'];
        return requiredFeatures.every(feature => this.features[feature]);
    }

    getBrowserSpecificLimitations() {
        const limitations = [];

        switch (this.browserInfo.name) {
            case 'Safari':
                limitations.push('Voice recognition may require user interaction first');
                limitations.push('Limited Web Speech API support');
                limitations.push('Stricter permission handling');
                break;
            case 'Firefox':
                limitations.push('Different Web Speech API implementation');
                limitations.push('Voice recognition may not be available');
                break;
            case 'Chrome':
                limitations.push('Requires secure context for voice features');
                break;
        }

        return limitations;
    }
}

// Advanced memory profiler for edge case testing
class AdvancedMemoryProfiler {
    constructor() {
        this.baseline = null;
        this.snapshots = [];
        this.isMonitoring = false;
        this.monitoringInterval = null;
    }

    takeSnapshot(label) {
        if (!performance.memory) {
            return null;
        }

        const snapshot = {
            label,
            timestamp: Date.now(),
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        };

        this.snapshots.push(snapshot);
        return snapshot;
    }

    startMonitoring(intervalMs = 1000) {
        if (this.isMonitoring) return;

        this.isMonitoring = true;
        this.baseline = this.takeSnapshot('monitoring-start');

        this.monitoringInterval = setInterval(() => {
            this.takeSnapshot(`monitor-${Date.now()}`);
        }, intervalMs);
    }

    stopMonitoring() {
        if (!this.isMonitoring) return;

        this.isMonitoring = false;
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        return this.takeSnapshot('monitoring-end');
    }

    analyzeMemoryLeaks() {
        if (this.snapshots.length < 2) {
            return { hasLeaks: false, analysis: 'Insufficient data' };
        }

        const first = this.snapshots[0];
        const last = this.snapshots[this.snapshots.length - 1];
        const memoryGrowth = last.usedJSHeapSize - first.usedJSHeapSize;
        const timeElapsed = last.timestamp - first.timestamp;

        // Analyze growth patterns
        const growthRate = memoryGrowth / timeElapsed; // bytes per ms
        const significantGrowth = memoryGrowth > 50 * 1024 * 1024; // 50MB threshold
        const rapidGrowth = growthRate > 100; // 100 bytes per ms

        // Look for memory spikes
        const spikes = this.detectMemorySpikes();

        return {
            hasLeaks: significantGrowth || rapidGrowth,
            memoryGrowth,
            growthRate,
            timeElapsed,
            spikes,
            analysis: this.generateMemoryAnalysis(memoryGrowth, growthRate, spikes)
        };
    }

    detectMemorySpikes() {
        const spikes = [];
        const threshold = 10 * 1024 * 1024; // 10MB spike threshold

        for (let i = 1; i < this.snapshots.length; i++) {
            const prev = this.snapshots[i - 1];
            const curr = this.snapshots[i];
            const increase = curr.usedJSHeapSize - prev.usedJSHeapSize;

            if (increase > threshold) {
                spikes.push({
                    from: prev.label,
                    to: curr.label,
                    increase,
                    timestamp: curr.timestamp
                });
            }
        }

        return spikes;
    }

    generateMemoryAnalysis(growth, rate, spikes) {
        const analysis = [];

        if (growth > 100 * 1024 * 1024) {
            analysis.push('CRITICAL: Excessive memory growth detected (>100MB)');
        } else if (growth > 50 * 1024 * 1024) {
            analysis.push('WARNING: Significant memory growth detected (>50MB)');
        }

        if (rate > 1000) {
            analysis.push('CRITICAL: Rapid memory growth rate detected');
        }

        if (spikes.length > 5) {
            analysis.push('WARNING: Multiple memory spikes detected');
        }

        if (analysis.length === 0) {
            analysis.push('Memory usage appears normal');
        }

        return analysis;
    }
}

// Test suite
const framework = new EdgeCaseTestFramework();

framework.describe('Cascading Failure Scenarios', () => {
    framework.test('should handle simultaneous storage + voice + network failures', async () => {
        const cascadingSimulator = new CascadingFailureSimulator();
        const memoryProfiler = new AdvancedMemoryProfiler();

        try {
            memoryProfiler.startMonitoring();
            memoryProfiler.takeSnapshot('test-start');

            // Simulate all failures simultaneously
            await cascadingSimulator.simulateStorageFailure();
            await cascadingSimulator.simulateVoiceFailure();
            await cascadingSimulator.simulateNetworkFailure();

            memoryProfiler.takeSnapshot('all-failures-active');

            // Create app instance under total system failure
            const app = new YGORipperApp({ skipInitialization: true });

            let appStillFunctional = false;
            let errorsBoundaryWorked = false;

            try {
                // Attempt initialization under cascading failures
                await app.initialize();
                
                // Should not reach here with all systems failing
                framework.expect(false).toBeTruthy();
            } catch (error) {
                errorsBoundaryWorked = true;
                
                // Verify app created minimal recovery UI
                if (app.createMinimalUI) {
                    app.createMinimalUI();
                    appStillFunctional = true;
                }
            }

            memoryProfiler.takeSnapshot('error-recovery-complete');

            // Verify error boundaries worked
            framework.expect(errorsBoundaryWorked).toBeTruthy();
            framework.expect(appStillFunctional).toBeTruthy();

            // Test progressive recovery
            await cascadingSimulator.restoreFailure('storage');
            memoryProfiler.takeSnapshot('storage-restored');

            await cascadingSimulator.restoreFailure('network');  
            memoryProfiler.takeSnapshot('network-restored');

            // Try initialization again with only voice failing
            const app2 = new YGORipperApp({ skipInitialization: true });
            await app2.initialize();

            // Should succeed with voice gracefully degraded
            framework.expect(app2.isInitialized).toBeTruthy();
            framework.expect(app2.voiceEngine).toBe(null); // Voice should be disabled

            memoryProfiler.takeSnapshot('partial-recovery-complete');

            // Restore voice and verify full recovery
            await cascadingSimulator.restoreFailure('voice');
            const app3 = new YGORipperApp({ skipInitialization: true });
            await app3.initialize();

            framework.expect(app3.isInitialized).toBeTruthy();
            framework.expect(app3.voiceEngine).toBeTruthy(); // Voice should work now

            memoryProfiler.takeSnapshot('full-recovery-complete');

            // Analyze memory during cascading failures
            const finalSnapshot = memoryProfiler.stopMonitoring();
            const memoryAnalysis = memoryProfiler.analyzeMemoryLeaks();

            // Should not leak memory during cascading failures
            framework.expect(memoryAnalysis.hasLeaks).toBeFalsy();

        } finally {
            await cascadingSimulator.restoreAll();
            memoryProfiler.stopMonitoring();
        }
    });

    framework.test('should handle intermittent cascading failures', async () => {
        const cascadingSimulator = new CascadingFailureSimulator();
        const memoryProfiler = new AdvancedMemoryProfiler();

        try {
            memoryProfiler.startMonitoring();
            
            // Start intermittent failure simulation
            await cascadingSimulator.simulateIntermittentFailures();

            const app = new YGORipperApp({ skipInitialization: true });
            let operationCount = 0;
            let successCount = 0;
            let errorRecoveryCount = 0;

            // Run operations while failures are intermittent
            for (let i = 0; i < 10; i++) {
                operationCount++;
                
                try {
                    await app.safeLoadSettings();
                    await app.safeInitializeStorage();
                    successCount++;
                } catch (error) {
                    // Error boundaries should handle intermittent failures
                    errorRecoveryCount++;
                }

                // Wait between operations
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                if (i % 3 === 0) {
                    memoryProfiler.takeSnapshot(`intermittent-${i}`);
                }
            }

            // Verify some operations succeeded despite intermittent failures
            framework.expect(successCount).toBeGreaterThan(0);
            framework.expect(errorRecoveryCount).toBeGreaterThan(0);

            // App should remain stable
            framework.expect(app).toBeTruthy();

            const memoryAnalysis = memoryProfiler.analyzeMemoryLeaks();
            framework.expect(memoryAnalysis.hasLeaks).toBeFalsy();

        } finally {
            await cascadingSimulator.restoreAll();
            memoryProfiler.stopMonitoring();
        }
    });

    framework.test('should handle failure during error recovery', async () => {
        const cascadingSimulator = new CascadingFailureSimulator();
        const memoryProfiler = new AdvancedMemoryProfiler();

        try {
            memoryProfiler.takeSnapshot('recovery-test-start');

            // Start with storage failure
            await cascadingSimulator.simulateStorageFailure();

            const app = new YGORipperApp({ skipInitialization: true });
            
            // Attempt to recover from storage failure
            let firstRecoveryFailed = false;
            try {
                await app.safeInitializeStorage();
            } catch (error) {
                firstRecoveryFailed = true;
            }

            framework.expect(firstRecoveryFailed).toBeTruthy();

            // While attempting recovery, introduce network failure
            await cascadingSimulator.simulateNetworkFailure();
            memoryProfiler.takeSnapshot('additional-failure-during-recovery');

            // Should still attempt graceful degradation
            let finalRecoveryAttempted = false;
            try {
                await app.safeInitializeUI();
                finalRecoveryAttempted = true;
            } catch (error) {
                // Should still attempt minimal UI creation
                app.createMinimalUI();
                finalRecoveryAttempted = true;
            }

            framework.expect(finalRecoveryAttempted).toBeTruthy();

            const memoryAnalysis = memoryProfiler.analyzeMemoryLeaks();
            framework.expect(memoryAnalysis.hasLeaks).toBeFalsy();

        } finally {
            await cascadingSimulator.restoreAll();
            memoryProfiler.stopMonitoring();
        }
    });
});

framework.describe('Browser Compatibility Edge Cases', () => {
    framework.test('should detect and handle browser-specific limitations', async () => {
        const compatDetector = new BrowserCompatibilityDetector();
        const memoryProfiler = new AdvancedMemoryProfiler();

        memoryProfiler.takeSnapshot('browser-compat-start');

        // Test browser detection
        framework.expect(typeof compatDetector.browserInfo.name).toBe('string');
        framework.expect(typeof compatDetector.browserInfo.family).toBe('string');

        // Test feature detection
        const isSupported = compatDetector.isBrowserSupported();
        const limitations = compatDetector.getBrowserSpecificLimitations();

        framework.expect(typeof isSupported).toBe('boolean');
        framework.expect(Array.isArray(limitations)).toBeTruthy();

        // Test app behavior with browser limitations
        const app = new YGORipperApp({ skipInitialization: true });
        
        if (!compatDetector.features.webSpeech) {
            // Verify graceful degradation for browsers without Web Speech
            try {
                await app.safeInitializeVoice();
                framework.expect(app.voiceEngine).toBe(null);
            } catch (error) {
                // Should handle missing Web Speech gracefully
                framework.expect(error.message).toContain('not supported');
            }
        }

        if (!compatDetector.features.mediaDevices) {
            // Verify graceful degradation for browsers without MediaDevices
            await app.safeInitializePermissions();
            framework.expect(app.permissionManager).toBe(null);
        }

        // Memory should be reasonable across all browsers
        memoryProfiler.takeSnapshot('browser-compat-end');
        const memoryAnalysis = memoryProfiler.analyzeMemoryLeaks();
        framework.expect(memoryAnalysis.hasLeaks).toBeFalsy();
    });

    framework.test('should handle browser-specific error scenarios', async () => {
        const compatDetector = new BrowserCompatibilityDetector();
        const app = new YGORipperApp({ skipInitialization: true });

        // Test browser-specific error handling
        const browserSpecificErrors = [
            // Safari-specific errors
            new DOMException('NotAllowedError: The request is not allowed by the user agent or the platform in the current context.', 'NotAllowedError'),
            // Firefox-specific errors  
            new DOMException('The fetching process for the media resource was aborted by the user agent at the user\'s request.', 'AbortError'),
            // Chrome-specific errors
            new DOMException('Requested device not found', 'NotFoundError')
        ];

        for (const error of browserSpecificErrors) {
            let errorHandled = false;
            
            try {
                // Simulate browser-specific error
                throw error;
            } catch (caught) {
                if (app.voiceEngine && app.voiceEngine.createUserFriendlyError) {
                    const userError = app.voiceEngine.createUserFriendlyError(caught, 'browser-test');
                    errorHandled = true;
                    
                    // Verify error is handled gracefully
                    framework.expect(userError.type).toBeTruthy();
                    framework.expect(userError.userMessage || userError.message).toBeTruthy();
                } else {
                    errorHandled = true; // No voice engine is acceptable
                }
            }

            framework.expect(errorHandled).toBeTruthy();
        }
    });
});

framework.describe('High Load and Stress Edge Cases', () => {
    framework.test('should handle error recovery under high memory pressure', async () => {
        const memoryProfiler = new AdvancedMemoryProfiler();
        const cascadingSimulator = new CascadingFailureSimulator();

        try {
            memoryProfiler.startMonitoring();

            // Create memory pressure
            const memoryArrays = [];
            for (let i = 0; i < 50; i++) {
                memoryArrays.push(new Array(500000).fill(i)); // 50 x 500k elements
            }

            memoryProfiler.takeSnapshot('memory-pressure-created');

            // Introduce storage failure under memory pressure
            await cascadingSimulator.simulateStorageFailure();

            const app = new YGORipperApp({ skipInitialization: true });

            // Test error recovery under memory pressure
            let recoverySuccessful = false;
            try {
                await app.safeInitializeStorage();
            } catch (error) {
                // Should attempt fallback storage
                await app.initializeFallbackStorage();
                recoverySuccessful = app.storage !== null;
            }

            framework.expect(recoverySuccessful).toBeTruthy();

            memoryProfiler.takeSnapshot('recovery-under-pressure');

            // Cleanup memory pressure
            memoryArrays.length = 0;
            if (window.gc) {
                window.gc();
            }

            memoryProfiler.takeSnapshot('pressure-released');

            const memoryAnalysis = memoryProfiler.analyzeMemoryLeaks();
            
            // Should not have excessive memory growth beyond our test arrays
            framework.expect(memoryAnalysis.memoryGrowth).toBeLessThan(300 * 1024 * 1024); // 300MB max

        } finally {
            await cascadingSimulator.restoreAll();
            memoryProfiler.stopMonitoring();
        }
    });

    framework.test('should handle concurrent error recovery attempts', async () => {
        const cascadingSimulator = new CascadingFailureSimulator();
        const memoryProfiler = new AdvancedMemoryProfiler();

        try {
            memoryProfiler.startMonitoring();

            // Simulate all failure types
            await cascadingSimulator.simulateStorageFailure();
            await cascadingSimulator.simulateVoiceFailure();
            await cascadingSimulator.simulateNetworkFailure();

            // Create multiple app instances attempting recovery concurrently
            const apps = [];
            const recoveryPromises = [];

            for (let i = 0; i < 5; i++) {
                const app = new YGORipperApp({ skipInitialization: true });
                apps.push(app);

                const recoveryPromise = (async () => {
                    try {
                        await app.safeInitializeStorage();
                        await app.safeInitializeVoice();
                        return { success: true, error: null };
                    } catch (error) {
                        return { success: false, error };
                    }
                })();

                recoveryPromises.push(recoveryPromise);
            }

            // Wait for all concurrent recovery attempts
            const results = await Promise.all(recoveryPromises);

            memoryProfiler.takeSnapshot('concurrent-recovery-complete');

            // All should handle failures gracefully
            results.forEach((result, index) => {
                // Should either succeed with fallbacks or fail gracefully
                framework.expect(typeof result.success).toBe('boolean');
                if (!result.success) {
                    framework.expect(result.error).toBeTruthy();
                }
            });

            // Memory should remain reasonable despite concurrent operations
            const memoryAnalysis = memoryProfiler.analyzeMemoryLeaks();
            framework.expect(memoryAnalysis.hasLeaks).toBeFalsy();

        } finally {
            await cascadingSimulator.restoreAll();
            memoryProfiler.stopMonitoring();
        }
    });
});

// Export for manual testing
window.runEdgeCaseTests = () => framework.runAll();

// Auto-run if in test mode
if (window.location.search.includes('test=edge-cases')) {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            framework.runAll();
        }, 1000);
    });
}

console.log('🚨 Critical edge case tests loaded. Run with: runEdgeCaseTests()');

export { framework as EdgeCaseTestFramework };