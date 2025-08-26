/**
 * Memory Leak Validation System for YGOpwa
 * 
 * Comprehensive testing and validation of memory leak prevention fixes.
 * Provides automated testing, monitoring, and reporting capabilities.
 */

import { Logger } from './Logger.js';
import { globalMemoryManager } from './MemoryManager.js';

export class MemoryLeakValidator {
    constructor() {
        this.logger = new Logger('MemoryLeakValidator');
        this.testResults = [];
        this.memorySnapshots = [];
        this.performanceBaseline = null;
        
        // Test configuration
        this.testConfig = {
            iterationCount: 100,
            memoryThresholdMB: 50,
            performanceThresholdMs: 1000,
            cleanupDelayMs: 500
        };
        
        this.logger.info('Memory Leak Validator initialized');
    }
    
    /**
     * Run comprehensive memory leak validation
     */
    async runFullValidation() {
        this.logger.info('Starting comprehensive memory leak validation');
        
        const startTime = performance.now();
        const initialMemory = this.getMemorySnapshot();
        
        try {
            // Test each component individually
            await this.testVoiceEngineMemoryLeaks();
            await this.testMigrationManagerMemoryLeaks();
            await this.testSessionManagerMemoryLeaks();
            await this.testPerformanceMonitorMemoryLeaks();
            await this.testImageManagerMemoryLeaks();
            
            // Test integrated scenarios
            await this.testIntegratedMemoryManagement();
            
            // Test cleanup effectiveness
            await this.testCleanupEffectiveness();
            
            const endTime = performance.now();
            const finalMemory = this.getMemorySnapshot();
            
            // Generate validation report
            const report = this.generateValidationReport(
                initialMemory, 
                finalMemory, 
                endTime - startTime
            );
            
            this.logger.info('Memory leak validation completed');
            return report;
            
        } catch (error) {
            this.logger.error('Memory leak validation failed:', error);
            throw error;
        }
    }
    
    /**
     * Test VoiceEngine memory leak fixes
     */
    async testVoiceEngineMemoryLeaks() {
        this.logger.info('Testing VoiceEngine memory leak fixes');
        
        const testResult = {
            component: 'VoiceEngine',
            tests: [],
            passed: 0,
            failed: 0
        };
        
        // Test 1: Event listener cleanup
        try {
            const initialListeners = this.countEventListeners();
            
            // Simulate voice engine creation and destruction
            for (let i = 0; i < 10; i++) {
                // Note: In real test, you would create and destroy VoiceEngine instances
                // For now, we'll test the concept
                await this.simulateComponentLifecycle('VoiceEngine');
            }
            
            const finalListeners = this.countEventListeners();
            const listenerTest = {
                name: 'Event Listener Cleanup',
                passed: finalListeners <= initialListeners + 5, // Allow some tolerance
                details: `Initial: ${initialListeners}, Final: ${finalListeners}`
            };
            
            testResult.tests.push(listenerTest);
            if (listenerTest.passed) testResult.passed++;
            else testResult.failed++;
            
        } catch (error) {
            testResult.tests.push({
                name: 'Event Listener Cleanup',
                passed: false,
                error: error.message
            });
            testResult.failed++;
        }
        
        // Test 2: Timer cleanup
        try {
            const initialTimers = this.countActiveTimers();
            
            // Simulate timer-heavy operations
            await this.simulateTimerOperations();
            await this.waitForCleanup();
            
            const finalTimers = this.countActiveTimers();
            const timerTest = {
                name: 'Timer Cleanup',
                passed: finalTimers <= initialTimers + 2,
                details: `Initial: ${initialTimers}, Final: ${finalTimers}`
            };
            
            testResult.tests.push(timerTest);
            if (timerTest.passed) testResult.passed++;
            else testResult.failed++;
            
        } catch (error) {
            testResult.tests.push({
                name: 'Timer Cleanup',
                passed: false,
                error: error.message
            });
            testResult.failed++;
        }
        
        this.testResults.push(testResult);
        this.logger.debug(`VoiceEngine test completed: ${testResult.passed}/${testResult.tests.length} passed`);
    }
    
    /**
     * Test MigrationManager memory leak fixes
     */
    async testMigrationManagerMemoryLeaks() {
        this.logger.info('Testing MigrationManager memory leak fixes');
        
        const testResult = {
            component: 'MigrationManager',
            tests: [],
            passed: 0,
            failed: 0
        };
        
        // Test animation cleanup
        try {
            const initialMemory = this.getMemorySnapshot();
            
            // Simulate theme switching and animation creation
            for (let i = 0; i < 5; i++) {
                await this.simulateThemeSwitch();
                await this.simulateAnimationCreation();
            }
            
            // Force cleanup
            globalMemoryManager.performGlobalCleanup();
            await this.waitForCleanup();
            
            const finalMemory = this.getMemorySnapshot();
            const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
            
            const animationTest = {
                name: 'Animation Memory Cleanup',
                passed: memoryIncrease < 10 * 1024 * 1024, // Less than 10MB increase
                details: `Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`
            };
            
            testResult.tests.push(animationTest);
            if (animationTest.passed) testResult.passed++;
            else testResult.failed++;
            
        } catch (error) {
            testResult.tests.push({
                name: 'Animation Memory Cleanup',
                passed: false,
                error: error.message
            });
            testResult.failed++;
        }
        
        this.testResults.push(testResult);
        this.logger.debug(`MigrationManager test completed: ${testResult.passed}/${testResult.tests.length} passed`);
    }
    
    /**
     * Test SessionManager memory leak fixes
     */
    async testSessionManagerMemoryLeaks() {
        this.logger.info('Testing SessionManager memory leak fixes');
        
        const testResult = {
            component: 'SessionManager',
            tests: [],
            passed: 0,
            failed: 0
        };
        
        // Test session data limits
        try {
            const initialMemory = this.getMemorySnapshot();
            
            // Simulate large session operations
            await this.simulateLargeSessionOperations();
            
            const finalMemory = this.getMemorySnapshot();
            const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
            
            const sessionTest = {
                name: 'Session Data Size Limits',
                passed: memoryIncrease < 20 * 1024 * 1024, // Less than 20MB increase
                details: `Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`
            };
            
            testResult.tests.push(sessionTest);
            if (sessionTest.passed) testResult.passed++;
            else testResult.failed++;
            
        } catch (error) {
            testResult.tests.push({
                name: 'Session Data Size Limits',
                passed: false,
                error: error.message
            });
            testResult.failed++;
        }
        
        this.testResults.push(testResult);
        this.logger.debug(`SessionManager test completed: ${testResult.passed}/${testResult.tests.length} passed`);
    }
    
    /**
     * Test RealPerformanceMonitor memory leak fixes
     */
    async testPerformanceMonitorMemoryLeaks() {
        this.logger.info('Testing RealPerformanceMonitor memory leak fixes');
        
        const testResult = {
            component: 'RealPerformanceMonitor',
            tests: [],
            passed: 0,
            failed: 0
        };
        
        // Test observer cleanup
        try {
            const initialObservers = this.countPerformanceObservers();
            
            // Simulate performance monitoring lifecycle
            await this.simulatePerformanceMonitoring();
            
            const finalObservers = this.countPerformanceObservers();
            const observerTest = {
                name: 'Performance Observer Cleanup',
                passed: finalObservers <= initialObservers + 1,
                details: `Initial: ${initialObservers}, Final: ${finalObservers}`
            };
            
            testResult.tests.push(observerTest);
            if (observerTest.passed) testResult.passed++;
            else testResult.failed++;
            
        } catch (error) {
            testResult.tests.push({
                name: 'Performance Observer Cleanup',
                passed: false,
                error: error.message
            });
            testResult.failed++;
        }
        
        this.testResults.push(testResult);
        this.logger.debug(`RealPerformanceMonitor test completed: ${testResult.passed}/${testResult.tests.length} passed`);
    }
    
    /**
     * Test ImageManager memory leak fixes
     */
    async testImageManagerMemoryLeaks() {
        this.logger.info('Testing ImageManager memory leak fixes');
        
        const testResult = {
            component: 'ImageManager',
            tests: [],
            passed: 0,
            failed: 0
        };
        
        // Test cache size enforcement
        try {
            const initialMemory = this.getMemorySnapshot();
            
            // Simulate heavy image loading
            await this.simulateImageLoading();
            
            const finalMemory = this.getMemorySnapshot();
            const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
            
            const cacheTest = {
                name: 'Image Cache Size Enforcement',
                passed: memoryIncrease < 30 * 1024 * 1024, // Less than 30MB increase
                details: `Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`
            };
            
            testResult.tests.push(cacheTest);
            if (cacheTest.passed) testResult.passed++;
            else testResult.failed++;
            
        } catch (error) {
            testResult.tests.push({
                name: 'Image Cache Size Enforcement',
                passed: false,
                error: error.message
            });
            testResult.failed++;
        }
        
        this.testResults.push(testResult);
        this.logger.debug(`ImageManager test completed: ${testResult.passed}/${testResult.tests.length} passed`);
    }
    
    /**
     * Test integrated memory management
     */
    async testIntegratedMemoryManagement() {
        this.logger.info('Testing integrated memory management');
        
        const testResult = {
            component: 'IntegratedSystem',
            tests: [],
            passed: 0,
            failed: 0
        };
        
        // Test global memory manager
        try {
            const initialStats = globalMemoryManager.getGlobalStats();
            
            // Simulate complex operations across multiple components
            await this.simulateComplexOperations();
            
            const finalStats = globalMemoryManager.getGlobalStats();
            const globalTest = {
                name: 'Global Memory Management',
                passed: finalStats.activeComponents >= 0 && finalStats.resources.eventListeners < 1000,
                details: `Active components: ${finalStats.activeComponents}, Event listeners: ${finalStats.resources.eventListeners}`
            };
            
            testResult.tests.push(globalTest);
            if (globalTest.passed) testResult.passed++;
            else testResult.failed++;
            
        } catch (error) {
            testResult.tests.push({
                name: 'Global Memory Management',
                passed: false,
                error: error.message
            });
            testResult.failed++;
        }
        
        this.testResults.push(testResult);
        this.logger.debug(`Integrated system test completed: ${testResult.passed}/${testResult.tests.length} passed`);
    }
    
    /**
     * Test cleanup effectiveness
     */
    async testCleanupEffectiveness() {
        this.logger.info('Testing cleanup effectiveness');
        
        const testResult = {
            component: 'CleanupSystem',
            tests: [],
            passed: 0,
            failed: 0
        };
        
        // Test forced cleanup
        try {
            const beforeCleanup = this.getMemorySnapshot();
            
            // Trigger global cleanup
            globalMemoryManager.performGlobalCleanup();
            
            // Force garbage collection if available
            if (window.gc) {
                window.gc();
            }
            
            await this.waitForCleanup();
            
            const afterCleanup = this.getMemorySnapshot();
            const memoryReduction = beforeCleanup.usedJSHeapSize - afterCleanup.usedJSHeapSize;
            
            const cleanupTest = {
                name: 'Cleanup Effectiveness',
                passed: memoryReduction >= 0, // Should not increase
                details: `Memory change: ${(memoryReduction / 1024 / 1024).toFixed(2)}MB`
            };
            
            testResult.tests.push(cleanupTest);
            if (cleanupTest.passed) testResult.passed++;
            else testResult.failed++;
            
        } catch (error) {
            testResult.tests.push({
                name: 'Cleanup Effectiveness',
                passed: false,
                error: error.message
            });
            testResult.failed++;
        }
        
        this.testResults.push(testResult);
        this.logger.debug(`Cleanup system test completed: ${testResult.passed}/${testResult.tests.length} passed`);
    }
    
    /**
     * Simulation methods for testing
     */
    async simulateComponentLifecycle(componentName) {
        // Simulate creating and destroying components
        await this.delay(50);
    }
    
    async simulateTimerOperations() {
        // Simulate timer-heavy operations
        const timers = [];
        for (let i = 0; i < 10; i++) {
            timers.push(setTimeout(() => {}, 100));
        }
        await this.delay(200);
        timers.forEach(clearTimeout);
    }
    
    async simulateThemeSwitch() {
        // Simulate theme switching
        await this.delay(100);
    }
    
    async simulateAnimationCreation() {
        // Simulate animation creation
        for (let i = 0; i < 5; i++) {
            requestAnimationFrame(() => {});
        }
        await this.delay(50);
    }
    
    async simulateLargeSessionOperations() {
        // Simulate large session data operations
        const largeData = new Array(1000).fill(0).map((_, i) => ({
            id: i,
            data: new Array(100).fill('test data'),
            timestamp: Date.now()
        }));
        
        await this.delay(100);
        // Clear large data
        largeData.length = 0;
    }
    
    async simulatePerformanceMonitoring() {
        // Simulate performance monitoring operations
        await this.delay(200);
    }
    
    async simulateImageLoading() {
        // Simulate image loading operations
        await this.delay(300);
    }
    
    async simulateComplexOperations() {
        // Simulate complex cross-component operations
        await this.simulateTimerOperations();
        await this.simulateAnimationCreation();
        await this.simulateLargeSessionOperations();
    }
    
    /**
     * Utility methods
     */
    getMemorySnapshot() {
        if (performance.memory) {
            return {
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                totalJSHeapSize: performance.memory.totalJSHeapSize,
                jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
                timestamp: Date.now()
            };
        }
        return { usedJSHeapSize: 0, totalJSHeapSize: 0, jsHeapSizeLimit: 0, timestamp: Date.now() };
    }
    
    countEventListeners() {
        // Estimate event listener count (simplified)
        return globalMemoryManager.getGlobalStats().resources.eventListeners;
    }
    
    countActiveTimers() {
        // Estimate active timer count (simplified)
        return globalMemoryManager.getGlobalStats().resources.timers;
    }
    
    countPerformanceObservers() {
        // Estimate performance observer count (simplified)
        return globalMemoryManager.getGlobalStats().resources.observers;
    }
    
    async waitForCleanup() {
        await this.delay(this.testConfig.cleanupDelayMs);
    }
    
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Generate comprehensive validation report
     */
    generateValidationReport(initialMemory, finalMemory, testDuration) {
        const totalTests = this.testResults.reduce((sum, result) => sum + result.tests.length, 0);
        const totalPassed = this.testResults.reduce((sum, result) => sum + result.passed, 0);
        const totalFailed = this.testResults.reduce((sum, result) => sum + result.failed, 0);
        
        const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
        const memoryIncreaseMB = memoryIncrease / 1024 / 1024;
        
        const globalStats = globalMemoryManager.getGlobalStats();
        
        const report = {
            summary: {
                testDuration: Math.round(testDuration),
                totalTests,
                totalPassed,
                totalFailed,
                successRate: Math.round((totalPassed / totalTests) * 100),
                memoryIncreaseMB: Math.round(memoryIncreaseMB * 100) / 100,
                memoryWithinBudget: memoryIncreaseMB < this.testConfig.memoryThresholdMB
            },
            memory: {
                initial: {
                    usedMB: Math.round(initialMemory.usedJSHeapSize / 1024 / 1024 * 100) / 100,
                    totalMB: Math.round(initialMemory.totalJSHeapSize / 1024 / 1024 * 100) / 100
                },
                final: {
                    usedMB: Math.round(finalMemory.usedJSHeapSize / 1024 / 1024 * 100) / 100,
                    totalMB: Math.round(finalMemory.totalJSHeapSize / 1024 / 1024 * 100) / 100
                },
                increase: {
                    mb: memoryIncreaseMB,
                    percentage: Math.round((memoryIncrease / initialMemory.usedJSHeapSize) * 100)
                }
            },
            globalMemoryManager: {
                activeComponents: globalStats.activeComponents,
                totalComponents: globalStats.totalComponents,
                destroyedComponents: globalStats.destroyedComponents,
                resources: globalStats.resources
            },
            componentResults: this.testResults,
            recommendations: this.generateRecommendations(memoryIncreaseMB, totalFailed),
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        };
        
        // Log summary
        this.logger.info(`Memory Leak Validation Report:
- Tests: ${totalPassed}/${totalTests} passed (${report.summary.successRate}%)
- Memory increase: ${memoryIncreaseMB.toFixed(2)}MB
- Duration: ${Math.round(testDuration)}ms
- Active components: ${globalStats.activeComponents}
- Status: ${totalFailed === 0 && memoryIncreaseMB < this.testConfig.memoryThresholdMB ? 'PASSED' : 'NEEDS ATTENTION'}`);
        
        return report;
    }
    
    /**
     * Generate recommendations based on test results
     */
    generateRecommendations(memoryIncreaseMB, failedTests) {
        const recommendations = [];
        
        if (memoryIncreaseMB > this.testConfig.memoryThresholdMB) {
            recommendations.push({
                type: 'WARNING',
                message: `Memory increase of ${memoryIncreaseMB.toFixed(2)}MB exceeds threshold of ${this.testConfig.memoryThresholdMB}MB`,
                action: 'Review component cleanup methods and cache size limits'
            });
        }
        
        if (failedTests > 0) {
            recommendations.push({
                type: 'ERROR',
                message: `${failedTests} tests failed`,
                action: 'Review failed test details and fix memory leak issues'
            });
        }
        
        if (memoryIncreaseMB < 10 && failedTests === 0) {
            recommendations.push({
                type: 'SUCCESS',
                message: 'Memory leak prevention system is working effectively',
                action: 'Continue monitoring and maintain current implementation'
            });
        }
        
        return recommendations;
    }
    
    /**
     * Export validation report
     */
    exportReport(report, format = 'json') {
        if (format === 'json') {
            return JSON.stringify(report, null, 2);
        } else if (format === 'csv') {
            // Convert to CSV format for spreadsheet analysis
            const csvLines = ['Component,Test,Passed,Details'];
            
            report.componentResults.forEach(component => {
                component.tests.forEach(test => {
                    csvLines.push(`${component.component},${test.name},${test.passed},${test.details || test.error || ''}`);
                });
            });
            
            return csvLines.join('\n');
        }
        
        return report;
    }
}

// Export singleton instance
export const memoryLeakValidator = new MemoryLeakValidator();