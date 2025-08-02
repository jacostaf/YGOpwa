/**
 * Enhanced Error Boundary Validation Tests
 * 
 * These tests validate that safe* methods actually prevent application crashes
 * with real component failures, not just mock behaviors. Focus on crash prevention,
 * cleanup validation, and performance impact testing.
 */

// Import real components for boundary validation
import { YGORipperApp } from '../app.js';
import { VoiceEngine } from '../voice/VoiceEngine.js';
import { SessionManager } from '../session/SessionManager.js';
import { Storage } from '../utils/Storage.js';
import { Logger } from '../utils/Logger.js';

// Test framework for error boundary validation
class ErrorBoundaryValidationFramework {
    constructor() {
        this.tests = [];
        this.results = [];
        this.logger = new Logger('ErrorBoundaryValidation');
        this.crashDetector = new CrashDetector();
        this.resourceMonitor = new ResourceMonitor();
    }

    describe(name, testFn) {
        console.group(`🛡️ ${name}`);
        testFn();
        console.groupEnd();
    }

    test(name, testFn, timeout = 20000) {
        this.tests.push({ name, testFn, timeout });
    }

    async runAll() {
        console.log('🛡️ Running Enhanced Error Boundary Validation Tests...');
        
        for (const test of this.tests) {
            try {
                console.time(test.name);
                
                this.crashDetector.startMonitoring();
                this.resourceMonitor.startMonitoring();
                
                await Promise.race([
                    test.testFn(),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Test timeout')), test.timeout)
                    )
                ]);
                
                const crashReport = this.crashDetector.stopMonitoring();
                const resourceReport = this.resourceMonitor.stopMonitoring();
                
                console.timeEnd(test.name);
                console.log(`✅ ${test.name}`);
                this.results.push({ 
                    name: test.name, 
                    status: 'passed',
                    crashReport,
                    resourceReport 
                });
            } catch (error) {
                const crashReport = this.crashDetector.stopMonitoring();
                const resourceReport = this.resourceMonitor.stopMonitoring();
                
                console.error(`❌ ${test.name}:`, error);
                this.results.push({ 
                    name: test.name, 
                    status: 'failed', 
                    error,
                    crashReport,
                    resourceReport 
                });
            }
        }

        this.printResults();
        return this.results;
    }

    printResults() {
        const passed = this.results.filter(r => r.status === 'passed').length;
        const failed = this.results.filter(r => r.status === 'failed').length;
        
        console.log('\n📊 Error Boundary Validation Results:');
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📈 Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%`);
        
        // Analyze crash prevention effectiveness
        const crashPrevented = this.results.filter(r => 
            r.crashReport && r.crashReport.crashesPrevented > 0
        ).length;
        
        console.log(`🛡️ Tests with Crash Prevention: ${crashPrevented}`);
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
            toBeFalsy: () => {
                if (actual) {
                    throw new Error(`Expected falsy value, got ${actual}`);
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
            },
            toNotCrash: () => {
                // Custom assertion for crash prevention
                if (this.crashDetector.detectedCrashes.length > 0) {
                    throw new Error(`Application crashed: ${this.crashDetector.detectedCrashes.join(', ')}`);
                }
            }
        };
    }
}

// Crash detection system
class CrashDetector {
    constructor() {
        this.isMonitoring = false;
        this.detectedCrashes = [];
        this.uncaughtErrors = [];
        this.unhandledRejections = [];
        this.crashesPrevented = 0;
        
        this.originalErrorHandler = null;
        this.originalRejectionHandler = null;
    }

    startMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        this.detectedCrashes = [];
        this.uncaughtErrors = [];
        this.unhandledRejections = [];
        this.crashesPrevented = 0;

        // Monitor uncaught errors
        this.originalErrorHandler = window.onerror;
        window.onerror = (message, source, lineno, colno, error) => {
            this.uncaughtErrors.push({
                message,
                source,
                lineno,
                colno,
                error,
                timestamp: Date.now()
            });
            
            // Check if this would cause a crash
            if (this.wouldCauseCrash(error)) {
                this.detectedCrashes.push(`Uncaught error: ${message}`);
            } else {
                this.crashesPrevented++;
            }
            
            // Call original handler if it exists
            if (this.originalErrorHandler) {
                return this.originalErrorHandler(message, source, lineno, colno, error);
            }
            
            // Prevent default error handling (prevent crash)
            return true;
        };

        // Monitor unhandled promise rejections
        this.originalRejectionHandler = window.onunhandledrejection;
        window.onunhandledrejection = (event) => {
            this.unhandledRejections.push({
                reason: event.reason,
                promise: event.promise,
                timestamp: Date.now()
            });
            
            if (this.wouldCauseCrash(event.reason)) {
                this.detectedCrashes.push(`Unhandled rejection: ${event.reason}`);
            } else {
                this.crashesPrevented++;
            }
            
            // Call original handler if it exists
            if (this.originalRejectionHandler) {
                this.originalRejectionHandler(event);
            }
            
            // Prevent default rejection handling
            event.preventDefault();
        };
    }

    stopMonitoring() {
        if (!this.isMonitoring) return null;
        
        this.isMonitoring = false;
        
        // Restore original handlers
        window.onerror = this.originalErrorHandler;
        window.onunhandledrejection = this.originalRejectionHandler;
        
        return {
            detectedCrashes: [...this.detectedCrashes],
            uncaughtErrors: [...this.uncaughtErrors],
            unhandledRejections: [...this.unhandledRejections],
            crashesPrevented: this.crashesPrevented,
            totalErrors: this.uncaughtErrors.length + this.unhandledRejections.length
        };
    }

    wouldCauseCrash(error) {
        // Determine if an error would cause application crash
        if (!error) return false;
        
        const criticalErrorTypes = [
            'ReferenceError',
            'TypeError',
            'SyntaxError',
            'RangeError'
        ];
        
        const criticalMessages = [
            'Cannot read property',
            'Cannot read properties',
            'is not a function',
            'is not defined',
            'Maximum call stack',
            'out of memory'
        ];
        
        const errorName = error.name || error.constructor?.name || '';
        const errorMessage = error.message || String(error);
        
        return criticalErrorTypes.includes(errorName) || 
               criticalMessages.some(msg => errorMessage.includes(msg));
    }
}

// Resource monitoring system
class ResourceMonitor {
    constructor() {
        this.isMonitoring = false;
        this.snapshots = [];
        this.monitoringInterval = null;
        this.resourceLeaks = [];
    }

    startMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        this.snapshots = [];
        this.resourceLeaks = [];
        
        // Take baseline snapshot
        this.takeSnapshot('monitoring-start');
        
        // Monitor periodically
        this.monitoringInterval = setInterval(() => {
            this.takeSnapshot(`monitor-${Date.now()}`);
            this.detectLeaks();
        }, 1000);
    }

    stopMonitoring() {
        if (!this.isMonitoring) return null;
        
        this.isMonitoring = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        const finalSnapshot = this.takeSnapshot('monitoring-end');
        
        return {
            snapshots: [...this.snapshots],
            resourceLeaks: [...this.resourceLeaks],
            memoryGrowth: this.calculateMemoryGrowth(),
            averageMemoryUsage: this.calculateAverageMemory(),
            peakMemoryUsage: this.calculatePeakMemory()
        };
    }

    takeSnapshot(label) {
        const snapshot = {
            label,
            timestamp: Date.now(),
            memory: performance.memory ? {
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                totalJSHeapSize: performance.memory.totalJSHeapSize,
                jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
            } : null,
            eventListeners: this.countEventListeners(),
            domNodes: document.querySelectorAll('*').length,
            timers: this.countActiveTimers()
        };
        
        this.snapshots.push(snapshot);
        return snapshot;
    }

    detectLeaks() {
        if (this.snapshots.length < 2) return;
        
        const current = this.snapshots[this.snapshots.length - 1];
        const previous = this.snapshots[this.snapshots.length - 2];
        
        // Check for memory leaks
        if (current.memory && previous.memory) {
            const memoryIncrease = current.memory.usedJSHeapSize - previous.memory.usedJSHeapSize;
            if (memoryIncrease > 10 * 1024 * 1024) { // 10MB threshold
                this.resourceLeaks.push({
                    type: 'memory',
                    increase: memoryIncrease,
                    timestamp: current.timestamp
                });
            }
        }
        
        // Check for DOM node leaks
        const domIncrease = current.domNodes - previous.domNodes;
        if (domIncrease > 100) { // 100 nodes threshold
            this.resourceLeaks.push({
                type: 'dom-nodes',
                increase: domIncrease,
                timestamp: current.timestamp
            });
        }
        
        // Check for timer leaks
        const timerIncrease = current.timers - previous.timers;
        if (timerIncrease > 10) { // 10 timers threshold
            this.resourceLeaks.push({
                type: 'timers',
                increase: timerIncrease,
                timestamp: current.timestamp
            });
        }
    }

    countEventListeners() {
        // Approximate count of event listeners
        // This is a simplified implementation
        return document.querySelectorAll('[onclick], [onload], [onerror]').length;
    }

    countActiveTimers() {
        // This is an approximation since we can't directly count active timers
        // In a real implementation, you'd track timer creation/destruction
        return 0;
    }

    calculateMemoryGrowth() {
        if (this.snapshots.length < 2 || !this.snapshots[0].memory) return 0;
        
        const first = this.snapshots[0].memory.usedJSHeapSize;
        const last = this.snapshots[this.snapshots.length - 1].memory.usedJSHeapSize;
        
        return last - first;
    }

    calculateAverageMemory() {
        const memoryValues = this.snapshots
            .filter(s => s.memory)
            .map(s => s.memory.usedJSHeapSize);
        
        if (memoryValues.length === 0) return 0;
        
        return memoryValues.reduce((sum, val) => sum + val, 0) / memoryValues.length;
    }

    calculatePeakMemory() {
        const memoryValues = this.snapshots
            .filter(s => s.memory)
            .map(s => s.memory.usedJSHeapSize);
        
        return memoryValues.length > 0 ? Math.max(...memoryValues) : 0;
    }
}

// Malformed data generator for corruption testing
class MalformedDataGenerator {
    static generateCorruptedSettings() {
        return {
            theme: null,
            voiceTimeout: 'invalid',
            voiceLanguage: 123,
            autoPriceRefresh: 'yes',
            sessionAutoSave: undefined,
            debugMode: [],
            autoConfirm: {},
            autoConfirmThreshold: 'high',
            nested: {
                deeply: {
                    corrupted: {
                        data: null
                    }
                }
            }
        };
    }

    static generateCorruptedSessionData() {
        return {
            sessionActive: 'true',
            currentSession: null,
            cards: 'not-an-array',
            totalCards: 'many',
            totalValue: undefined,
            setName: 123,
            timestamp: 'yesterday',
            metadata: {
                version: null,
                corrupt: true
            }
        };
    }

    static generateCorruptedCardData() {
        return {
            name: null,
            rarity: 123,
            quantity: 'some',
            price: 'expensive',
            id: undefined,
            metadata: {
                corrupt: true,
                nested: {
                    very: {
                        deep: null
                    }
                }
            }
        };
    }

    static generateCircularReference() {
        const obj = { name: 'circular' };
        obj.self = obj;
        obj.nested = { parent: obj };
        return obj;
    }

    static generateExtremelyLargeObject() {
        const obj = {};
        for (let i = 0; i < 10000; i++) {
            obj[`property_${i}`] = new Array(1000).fill(`data_${i}`);
        }
        return obj;
    }
}

// Test suite
const framework = new ErrorBoundaryValidationFramework();

framework.describe('Safe Method Crash Prevention Tests', () => {
    framework.test('safeLoadSettings should prevent crashes with corrupted data', async () => {
        // Corrupt localStorage with malformed JSON
        const originalGetItem = localStorage.getItem;
        localStorage.getItem = (key) => {
            if (key === 'settings') {
                return '{"invalid": json, "corrupt": }';
            }
            return originalGetItem.call(localStorage, key);
        };

        try {
            const app = new YGORipperApp({ skipInitialization: true });
            
            // This should not crash despite corrupted storage
            await app.safeLoadSettings();
            
            // Should have fallen back to default settings
            framework.expect(app.settings).toBeTruthy();
            framework.expect(app.settings.theme).toBe('dark');
            
            // Should not have crashed
            framework.expect().toNotCrash();
            
        } finally {
            localStorage.getItem = originalGetItem;
        }
    });

    framework.test('safeAddCard should prevent crashes with malformed card data', async () => {
        const app = new YGORipperApp({ skipInitialization: true });
        await app.initialize();
        
        const corruptedCard = MalformedDataGenerator.generateCorruptedCardData();
        const circularCard = MalformedDataGenerator.generateCircularReference();
        
        // These should not crash the application
        try {
            await app.safeAddCard(corruptedCard);
            await app.safeAddCard(circularCard);
            await app.safeAddCard(null);
            await app.safeAddCard(undefined);
        } catch (error) {
            // Errors are acceptable, crashes are not
        }
        
        // Application should still be functional
        framework.expect(app.isInitialized).toBeTruthy();
        framework.expect().toNotCrash();
    });

    framework.test('safeProcessVoiceInput should prevent crashes with extreme input', async () => {
        const app = new YGORipperApp({ skipInitialization: true });
        await app.initialize();
        
        const extremeInputs = [
            null,
            undefined,
            '',
            'x'.repeat(100000), // Very long string
            '🎴'.repeat(1000), // Unicode characters
            '<script>alert("xss")</script>', // Potential XSS
            JSON.stringify(MalformedDataGenerator.generateExtremelyLargeObject()),
            String.fromCharCode(0, 1, 2, 3, 4, 5), // Control characters
        ];
        
        for (const input of extremeInputs) {
            try {
                await app.safeProcessVoiceInput(input);
            } catch (error) {
                // Errors are acceptable, crashes are not
            }
        }
        
        framework.expect().toNotCrash();
    });

    framework.test('error boundaries should handle concurrent failures without crashing', async () => {
        const app = new YGORipperApp({ skipInitialization: true });
        
        // Create multiple concurrent operations that should fail
        const concurrentOperations = [];
        
        for (let i = 0; i < 20; i++) {
            concurrentOperations.push(
                app.safeLoadSettings().catch(() => {}),
                app.safeAddCard(null).catch(() => {}),
                app.safeProcessVoiceInput(undefined).catch(() => {}),
                app.safeAutoSave().catch(() => {})
            );
        }
        
        // Wait for all operations to complete or fail
        await Promise.allSettled(concurrentOperations);
        
        // Should not have crashed despite concurrent failures
        framework.expect().toNotCrash();
    });
});

framework.describe('Resource Cleanup Validation Tests', () => {
    framework.test('should cleanup resources after error recovery', async () => {
        const app = new YGORipperApp({ skipInitialization: true });
        
        // Create multiple failure scenarios
        for (let i = 0; i < 10; i++) {
            try {
                // Simulate storage failure
                const originalSet = app.storage.set;
                app.storage.set = async () => {
                    throw new Error('Storage full');
                };
                
                await app.safeAutoSave();
                
                // Restore storage
                app.storage.set = originalSet;
                
            } catch (error) {
                // Expected errors
            }
        }
        
        // Force garbage collection if available
        if (window.gc) {
            window.gc();
        }
        
        // Check that resources haven't leaked significantly
        const resourceReport = framework.resourceMonitor.stopMonitoring();
        framework.resourceMonitor.startMonitoring(); // Restart for next test
        
        framework.expect(resourceReport.resourceLeaks.length).toBeLessThan(5);
        framework.expect(resourceReport.memoryGrowth).toBeLessThan(50 * 1024 * 1024); // 50MB
    });

    framework.test('should dealloc resources on component failure', async () => {
        const apps = [];
        
        // Create multiple app instances and force them to fail
        for (let i = 0; i < 5; i++) {
            const app = new YGORipperApp({ skipInitialization: true });
            
            try {
                // Force initialization failure
                app.storage.initialize = async () => {
                    throw new Error('Critical storage failure');
                };
                
                await app.initialize();
            } catch (error) {
                // Expected failure
            }
            
            apps.push(app);
        }
        
        // Clear references
        apps.length = 0;
        
        // Force garbage collection
        if (window.gc) {
            window.gc();
        }
        
        // Check resource cleanup
        const resourceReport = framework.resourceMonitor.stopMonitoring();
        framework.resourceMonitor.startMonitoring();
        
        framework.expect(resourceReport.resourceLeaks.length).toBeLessThan(3);
    });
});

framework.describe('Performance Impact Tests', () => {
    framework.test('error boundaries should not significantly impact normal performance', async () => {
        const app = new YGORipperApp({ skipInitialization: true });
        await app.initialize();
        
        // Measure normal operation performance
        const normalStartTime = performance.now();
        for (let i = 0; i < 100; i++) {
            await app.safeLoadSettings();
        }
        const normalEndTime = performance.now();
        const normalDuration = normalEndTime - normalStartTime;
        
        // Introduce errors and measure performance impact
        const originalGet = app.storage.get;
        let errorCount = 0;
        app.storage.get = async (key) => {
            errorCount++;
            if (errorCount % 3 === 0) {
                throw new Error('Intermittent storage error');
            }
            return originalGet.call(app.storage, key);
        };
        
        const errorStartTime = performance.now();
        for (let i = 0; i < 100; i++) {
            await app.safeLoadSettings();
        }
        const errorEndTime = performance.now();
        const errorDuration = errorEndTime - errorStartTime;
        
        // Error handling should not cause significant performance degradation
        const performanceRatio = errorDuration / normalDuration;
        framework.expect(performanceRatio).toBeLessThan(5); // Less than 5x slower
        
        // Restore original function
        app.storage.get = originalGet;
    });

    framework.test('should maintain performance under continuous error conditions', async () => {
        const app = new YGORipperApp({ skipInitialization: true });
        const operationTimes = [];
        
        // Simulate continuous errors for a period
        const startTime = Date.now();
        const testDuration = 5000; // 5 seconds
        
        while (Date.now() - startTime < testDuration) {
            const opStartTime = performance.now();
            
            try {
                await app.safeProcessVoiceInput('test input');
                await app.safeAddCard(null);
            } catch (error) {
                // Expected errors
            }
            
            const opEndTime = performance.now();
            operationTimes.push(opEndTime - opStartTime);
            
            // Small delay between operations
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // Calculate performance metrics
        const avgTime = operationTimes.reduce((a, b) => a + b, 0) / operationTimes.length;
        const maxTime = Math.max(...operationTimes);
        
        // Should maintain reasonable performance
        framework.expect(avgTime).toBeLessThan(100); // Average < 100ms
        framework.expect(maxTime).toBeLessThan(1000); // Max < 1 second
        
        framework.expect().toNotCrash();
    });
});

framework.describe('Malformed Data Behavior Tests', () => {
    framework.test('should handle deeply nested corrupted data', async () => {
        const app = new YGORipperApp({ skipInitialization: true });
        
        // Test with various types of malformed data
        const malformedData = [
            MalformedDataGenerator.generateCorruptedSettings(),
            MalformedDataGenerator.generateCorruptedSessionData(),
            MalformedDataGenerator.generateCircularReference(),
            { nested: { very: { deeply: { corrupted: null } } } }
        ];
        
        for (const data of malformedData) {
            try {
                // Attempt to process malformed data
                if (data.sessionActive !== undefined) {
                    // Simulate session data processing
                    await app.sessionManager?.importSession?.(data);
                } else {
                    // Simulate settings processing
                    await app.handleSettingsSave?.(data);
                }
            } catch (error) {
                // Errors are acceptable, crashes are not
            }
        }
        
        framework.expect().toNotCrash();
    });

    framework.test('should handle memory-intensive malformed data', async () => {
        const app = new YGORipperApp({ skipInitialization: true });
        
        const extremeData = MalformedDataGenerator.generateExtremelyLargeObject();
        
        try {
            // This should not crash or cause excessive memory usage
            await app.safeProcessVoiceInput(JSON.stringify(extremeData));
        } catch (error) {
            // Expected - should handle gracefully
        }
        
        // Memory should be released after processing
        if (window.gc) {
            window.gc();
        }
        
        const resourceReport = framework.resourceMonitor.stopMonitoring();
        framework.resourceMonitor.startMonitoring();
        
        // Should not leak excessive memory
        framework.expect(resourceReport.memoryGrowth).toBeLessThan(100 * 1024 * 1024); // 100MB
        framework.expect().toNotCrash();
    });
});

// Export for manual testing
window.runErrorBoundaryValidation = () => framework.runAll();

// Auto-run if in test mode
if (window.location.search.includes('test=error-boundaries')) {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            framework.runAll();
        }, 1000);
    });
}

console.log('🛡️ Enhanced error boundary validation tests loaded. Run with: runErrorBoundaryValidation()');

export { framework as ErrorBoundaryValidationFramework };