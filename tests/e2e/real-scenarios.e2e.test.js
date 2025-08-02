/**
 * Enhanced E2E Tests - Real Browser Scenarios
 * 
 * These tests address QA feedback by testing real browser interactions
 * instead of simulated/mocked scenarios. Tests actual permission flows,
 * network conditions, and cross-browser compatibility.
 */

import { test, expect } from '@playwright/test';

// Real browser permission testing utilities
class RealPermissionTester {
    constructor(page) {
        this.page = page;
    }

    async grantMicrophonePermission() {
        // Grant microphone permissions at browser level
        await this.page.context().grantPermissions(['microphone'], { origin: this.page.url() });
    }

    async denyMicrophonePermission() {
        // Deny microphone permissions at browser level
        await this.page.context().clearPermissions();
    }

    async testRealPermissionFlow() {
        // Test actual permission prompt handling
        const permissionPromise = this.page.waitForEvent('dialog');
        
        // Trigger permission request
        await this.page.click('[data-testid="voice-start-button"]');
        
        const dialog = await permissionPromise;
        return dialog;
    }

    async simulatePermissionRevocation() {
        // Simulate user revoking permission mid-session
        await this.page.context().clearPermissions();
        await this.page.reload();
    }
}

// Real network condition tester
class RealNetworkTester {
    constructor(page) {
        this.page = page;
    }

    async simulateOfflineMode() {
        // Set actual offline mode
        await this.page.context().setOffline(true);
    }

    async simulateSlowNetwork() {
        // Throttle network to simulate slow connection
        await this.page.route('**/*', async route => {
            await new Promise(resolve => setTimeout(resolve, 2000)); // 2s delay
            await route.continue();
        });
    }

    async simulateNetworkInstability() {
        // Intermittent network failures
        let requestCount = 0;
        await this.page.route('**/api/**', async route => {
            requestCount++;
            if (requestCount % 3 === 0) {
                // Fail every third request
                await route.abort();
            } else {
                await route.continue();
            }
        });
    }

    async simulateAPIEndpointFailure() {
        // Block actual API endpoints
        await this.page.route('**/tcgplayer/**', route => route.abort());
        await this.page.route('**/yugipedia/**', route => route.abort());
    }

    async restoreNetwork() {
        await this.page.context().setOffline(false);
        await this.page.unroute('**/*');
    }
}

// Memory monitoring for browser context
class BrowserMemoryMonitor {
    constructor(page) {
        this.page = page;
        this.measurements = [];
    }

    async measureMemory(label) {
        const metrics = await this.page.evaluate(() => {
            if (performance.memory) {
                return {
                    usedJSHeapSize: performance.memory.usedJSHeapSize,
                    totalJSHeapSize: performance.memory.totalJSHeapSize,
                    jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
                };
            }
            return null;
        });

        if (metrics) {
            this.measurements.push({
                label,
                timestamp: Date.now(),
                ...metrics
            });
        }

        return metrics;
    }

    async detectMemoryLeaks() {
        if (this.measurements.length < 2) return null;

        const first = this.measurements[0];
        const last = this.measurements[this.measurements.length - 1];
        
        const memoryGrowth = last.usedJSHeapSize - first.usedJSHeapSize;
        
        return {
            hasSignificantGrowth: memoryGrowth > 50 * 1024 * 1024, // 50MB threshold
            totalGrowth: memoryGrowth,
            measurements: this.measurements
        };
    }
}

// Cross-browser testing setup
const browsers = ['chromium', 'firefox', 'webkit'];

// Real permission testing across browsers
test.describe('Real Browser Permission Testing', () => {
    browsers.forEach(browserName => {
        test(`should handle real microphone permission denial in ${browserName}`, async ({ page, browserName: currentBrowser }) => {
            if (currentBrowser !== browserName) return;

            const permissionTester = new RealPermissionTester(page);
            const memoryMonitor = new BrowserMemoryMonitor(page);

            await page.goto('/');
            await memoryMonitor.measureMemory('baseline');

            // Start with permission denied
            await permissionTester.denyMicrophonePermission();

            // Try to start voice recognition
            await page.click('[data-testid="voice-start-button"]');

            // Verify error handling
            const errorMessage = await page.waitForSelector('[data-testid="error-toast"]', { timeout: 5000 });
            const errorText = await errorMessage.textContent();
            
            expect(errorText).toContain('microphone');
            expect(errorText).toContain('permission');

            // Verify recovery options are shown
            const retryButton = await page.locator('[data-testid="retry-button"]');
            const manualButton = await page.locator('[data-testid="manual-input-button"]');
            
            await expect(retryButton).toBeVisible();
            await expect(manualButton).toBeVisible();

            // Test memory usage during permission failure
            await memoryMonitor.measureMemory('permission-denied');
            const memoryAnalysis = await memoryMonitor.detectMemoryLeaks();
            
            expect(memoryAnalysis.hasSignificantGrowth).toBeFalsy();
        });

        test(`should handle real permission revocation during active session in ${browserName}`, async ({ page, browserName: currentBrowser }) => {
            if (currentBrowser !== browserName) return;

            const permissionTester = new RealPermissionTester(page);
            const memoryMonitor = new BrowserMemoryMonitor(page);

            await page.goto('/');
            await memoryMonitor.measureMemory('start');

            // Grant permission initially
            await permissionTester.grantMicrophonePermission();

            // Start voice recognition successfully
            await page.click('[data-testid="voice-start-button"]');
            
            // Verify voice is active
            const voiceStatus = await page.locator('[data-testid="voice-status"]');
            await expect(voiceStatus).toContainText('listening');

            // Revoke permission mid-session
            await permissionTester.simulatePermissionRevocation();

            // Trigger another voice action
            await page.click('[data-testid="voice-start-button"]');

            // Verify graceful handling of permission revocation
            const errorMessage = await page.waitForSelector('[data-testid="error-toast"]');
            const errorText = await errorMessage.textContent();
            
            expect(errorText).toContain('permission');

            // App should still be functional for manual input
            const manualInput = await page.locator('[data-testid="manual-card-input"]');
            await expect(manualInput).toBeEnabled();

            await memoryMonitor.measureMemory('permission-revoked');
            const memoryAnalysis = await memoryMonitor.detectMemoryLeaks();
            
            expect(memoryAnalysis.hasSignificantGrowth).toBeFalsy();
        });
    });
});

// Real network failure testing
test.describe('Real Network Failure Testing', () => {
    test('should handle actual API endpoint failures', async ({ page }) => {
        const networkTester = new RealNetworkTester(page);
        const memoryMonitor = new BrowserMemoryMonitor(page);

        await page.goto('/');
        await memoryMonitor.measureMemory('baseline');

        // Block actual API endpoints
        await networkTester.simulateAPIEndpointFailure();

        // Try price checking with real API failure
        await page.fill('[data-testid="card-name-input"]', 'Blue-Eyes White Dragon');
        await page.click('[data-testid="price-check-button"]');

        // Verify error handling for real API failure
        const errorMessage = await page.waitForSelector('[data-testid="error-toast"]', { timeout: 10000 });
        const errorText = await errorMessage.textContent();
        
        expect(errorText).toContain('price');
        expect(errorText).toContain('failed');

        // Verify recovery options
        const retryButton = await page.locator('[data-testid="retry-price-check"]');
        const skipButton = await page.locator('[data-testid="skip-price-check"]');
        
        await expect(retryButton).toBeVisible();
        await expect(skipButton).toBeVisible();

        // App should continue functioning without prices
        await skipButton.click();
        
        const cardInput = await page.locator('[data-testid="card-name-input"]');
        await expect(cardInput).toBeEnabled();

        await memoryMonitor.measureMemory('api-failure');
        const memoryAnalysis = await memoryMonitor.detectMemoryLeaks();
        
        expect(memoryAnalysis.hasSignificantGrowth).toBeFalsy();
    });

    test('should handle real offline/online transitions', async ({ page }) => {
        const networkTester = new RealNetworkTester(page);
        const memoryMonitor = new BrowserMemoryMonitor(page);

        await page.goto('/');
        await memoryMonitor.measureMemory('online');

        // Go offline
        await networkTester.simulateOfflineMode();

        // Verify offline state detection
        const offlineIndicator = await page.waitForSelector('[data-testid="offline-indicator"]', { timeout: 5000 });
        await expect(offlineIndicator).toBeVisible();

        // Try operations while offline
        await page.fill('[data-testid="card-name-input"]', 'Dark Magician');
        await page.click('[data-testid="price-check-button"]');

        // Should show offline message
        const offlineMessage = await page.waitForSelector('[data-testid="offline-message"]');
        await expect(offlineMessage).toBeVisible();

        await memoryMonitor.measureMemory('offline');

        // Go back online
        await networkTester.restoreNetwork();

        // Verify online state recovery
        await page.waitForSelector('[data-testid="offline-indicator"]', { state: 'hidden', timeout: 5000 });

        // Retry the operation
        await page.click('[data-testid="price-check-button"]');

        // Should work again
        const priceResults = await page.waitForSelector('[data-testid="price-results"]', { timeout: 10000 });
        await expect(priceResults).toBeVisible();

        await memoryMonitor.measureMemory('back-online');
        const memoryAnalysis = await memoryMonitor.detectMemoryLeaks();
        
        expect(memoryAnalysis.hasSignificantGrowth).toBeFalsy();
    });

    test('should handle network instability and high latency', async ({ page }) => {
        const networkTester = new RealNetworkTester(page);
        const memoryMonitor = new BrowserMemoryMonitor(page);

        await page.goto('/');
        await memoryMonitor.measureMemory('stable-network');

        // Simulate unstable network
        await networkTester.simulateNetworkInstability();

        // Try multiple operations
        for (let i = 0; i < 5; i++) {
            await page.fill('[data-testid="card-name-input"]', `Test Card ${i}`);
            await page.click('[data-testid="price-check-button"]');
            
            // Some should fail, some should succeed
            try {
                await page.waitForSelector('[data-testid="price-results"]', { timeout: 3000 });
            } catch {
                // Expected - some requests should fail
                const errorMessage = await page.locator('[data-testid="error-toast"]');
                if (await errorMessage.isVisible()) {
                    // Error should be handled gracefully
                    expect(await errorMessage.textContent()).toBeTruthy();
                }
            }
            
            await page.waitForTimeout(1000); // Wait between requests
        }

        // App should remain stable despite network issues
        const cardInput = await page.locator('[data-testid="card-name-input"]');
        await expect(cardInput).toBeEnabled();

        await memoryMonitor.measureMemory('unstable-network');
        const memoryAnalysis = await memoryMonitor.detectMemoryLeaks();
        
        // Memory should not grow excessively despite network issues
        expect(memoryAnalysis.hasSignificantGrowth).toBeFalsy();
    });
});

// Memory leak detection during error cycles
test.describe('Real Memory Leak Detection', () => {
    test('should not leak memory during repeated error recovery cycles', async ({ page }) => {
        const networkTester = new RealNetworkTester(page);
        const permissionTester = new RealPermissionTester(page);
        const memoryMonitor = new BrowserMemoryMonitor(page);

        await page.goto('/');
        await memoryMonitor.measureMemory('baseline');

        // Simulate repeated error cycles
        for (let cycle = 0; cycle < 10; cycle++) {
            // Network failure cycle
            await networkTester.simulateAPIEndpointFailure();
            await page.fill('[data-testid="card-name-input"]', `Cycle ${cycle}`);
            await page.click('[data-testid="price-check-button"]');
            
            // Wait for error
            await page.waitForSelector('[data-testid="error-toast"]', { timeout: 5000 });
            
            // Restore network
            await networkTester.restoreNetwork();
            
            // Permission failure cycle (if available)
            if (cycle % 3 === 0) {
                await permissionTester.denyMicrophonePermission();
                await page.click('[data-testid="voice-start-button"]');
                await page.waitForSelector('[data-testid="error-toast"]');
                await permissionTester.grantMicrophonePermission();
            }

            // Force garbage collection in browser
            await page.evaluate(() => {
                if (window.gc) {
                    window.gc();
                }
            });

            await memoryMonitor.measureMemory(`cycle-${cycle}`);
        }

        // Analyze memory usage
        const memoryAnalysis = await memoryMonitor.detectMemoryLeaks();
        
        // Should not have significant memory growth
        expect(memoryAnalysis.hasSignificantGrowth).toBeFalsy();
        
        if (memoryAnalysis.totalGrowth > 0) {
            console.log(`Memory growth: ${(memoryAnalysis.totalGrowth / 1024 / 1024).toFixed(2)}MB`);
        }
    });

    test('should handle concurrent error scenarios without memory leaks', async ({ page }) => {
        const networkTester = new RealNetworkTester(page);
        const memoryMonitor = new BrowserMemoryMonitor(page);

        await page.goto('/');
        await memoryMonitor.measureMemory('start');

        // Simulate concurrent failures
        await networkTester.simulateNetworkInstability();

        // Start multiple operations concurrently
        const operations = [];
        
        for (let i = 0; i < 5; i++) {
            operations.push(
                page.fill(`[data-testid="card-name-input"]`, `Concurrent Card ${i}`)
                    .then(() => page.click('[data-testid="price-check-button"]'))
                    .catch(() => {}) // Ignore failures
            );
        }

        // Wait for all operations to complete or fail
        await Promise.allSettled(operations);

        // Let any cleanup occur
        await page.waitForTimeout(2000);

        // Force garbage collection
        await page.evaluate(() => {
            if (window.gc) {
                window.gc();
            }
        });

        await memoryMonitor.measureMemory('concurrent-operations');
        const memoryAnalysis = await memoryMonitor.detectMemoryLeaks();
        
        expect(memoryAnalysis.hasSignificantGrowth).toBeFalsy();
    });
});

// Performance testing under error conditions
test.describe('Real Performance Under Error Conditions', () => {
    test('should maintain performance during continuous error conditions', async ({ page }) => {
        const networkTester = new RealNetworkTester(page);
        
        await page.goto('/');

        // Start continuous error simulation
        await networkTester.simulateSlowNetwork();

        const performanceMetrics = [];

        // Measure response times under error conditions
        for (let i = 0; i < 5; i++) {
            const startTime = Date.now();
            
            await page.fill('[data-testid="card-name-input"]', `Performance Test ${i}`);
            await page.click('[data-testid="price-check-button"]');
            
            // Wait for either success or error
            try {
                await page.waitForSelector('[data-testid="price-results"], [data-testid="error-toast"]', { timeout: 10000 });
            } catch {
                // Timeout is acceptable under slow conditions
            }
            
            const endTime = Date.now();
            performanceMetrics.push(endTime - startTime);
        }

        // Verify UI remains responsive
        const avgResponseTime = performanceMetrics.reduce((a, b) => a + b, 0) / performanceMetrics.length;
        
        // Should complete within reasonable time even with errors
        expect(avgResponseTime).toBeLessThan(15000); // 15 seconds max

        // UI should remain interactive
        const cardInput = await page.locator('[data-testid="card-name-input"]');
        await expect(cardInput).toBeEnabled();
        
        const cancelButton = await page.locator('[data-testid="cancel-operation"]');
        if (await cancelButton.isVisible()) {
            await expect(cancelButton).toBeEnabled();
        }
    });

    test('should handle browser resource constraints gracefully', async ({ page }) => {
        const memoryMonitor = new BrowserMemoryMonitor(page);

        await page.goto('/');
        await memoryMonitor.measureMemory('start');

        // Simulate resource-intensive operations
        await page.evaluate(() => {
            // Create memory pressure
            const arrays = [];
            for (let i = 0; i < 100; i++) {
                arrays.push(new Array(100000).fill(i));
            }
            window.testArrays = arrays; // Keep references
        });

        await memoryMonitor.measureMemory('memory-pressure');

        // App should still function under pressure
        await page.fill('[data-testid="card-name-input"]', 'Resource Test Card');
        await page.click('[data-testid="price-check-button"]');

        // Should handle operation despite resource pressure
        try {
            await page.waitForSelector('[data-testid="price-results"], [data-testid="error-toast"]', { timeout: 10000 });
        } catch {
            // App should at least remain responsive
            const cardInput = await page.locator('[data-testid="card-name-input"]');
            await expect(cardInput).toBeEnabled();
        }

        // Cleanup test memory pressure
        await page.evaluate(() => {
            delete window.testArrays;
            if (window.gc) {
                window.gc();
            }
        });

        await memoryMonitor.measureMemory('cleanup');
    });
});

// Cross-browser error boundary testing
test.describe('Cross-Browser Error Boundary Validation', () => {
    browsers.forEach(browserName => {
        test(`should handle errors consistently across ${browserName}`, async ({ page, browserName: currentBrowser }) => {
            if (currentBrowser !== browserName) return;

            const networkTester = new RealNetworkTester(page);
            const permissionTester = new RealPermissionTester(page);

            await page.goto('/');

            // Test error handling consistency across browsers
            const testScenarios = [
                {
                    name: 'Network Failure',
                    setup: () => networkTester.simulateAPIEndpointFailure(),
                    action: () => page.click('[data-testid="price-check-button"]'),
                    expectedError: 'price'
                },
                {
                    name: 'Permission Denied',
                    setup: () => permissionTester.denyMicrophonePermission(),
                    action: () => page.click('[data-testid="voice-start-button"]'),
                    expectedError: 'permission'
                }
            ];

            for (const scenario of testScenarios) {
                console.log(`Testing ${scenario.name} in ${browserName}`);
                
                await scenario.setup();
                await scenario.action();

                // Verify error is handled consistently
                const errorMessage = await page.waitForSelector('[data-testid="error-toast"]', { timeout: 5000 });
                const errorText = await errorMessage.textContent();
                
                expect(errorText.toLowerCase()).toContain(scenario.expectedError);

                // Verify recovery options are available
                const recoveryOptions = await page.locator('[data-testid*="recovery-"]');
                const optionCount = await recoveryOptions.count();
                
                expect(optionCount).toBeGreaterThan(0);

                // Clear error state
                await page.reload();
            }
        });
    });
});

// Stress testing with realistic data
test.describe('Stress Testing with Realistic YGO Data', () => {
    test('should handle large session data without performance degradation', async ({ page }) => {
        const memoryMonitor = new BrowserMemoryMonitor(page);

        await page.goto('/');
        await memoryMonitor.measureMemory('empty-session');

        // Start a session
        await page.click('[data-testid="start-session-button"]');
        await page.selectOption('[data-testid="card-set-select"]', 'Supreme Darkness');

        // Add many cards rapidly
        const cardNames = [
            'Blue-Eyes White Dragon', 'Dark Magician', 'Red-Eyes Black Dragon',
            'Time Wizard', 'Mirror Force', 'Pot of Greed', 'Raigeki',
            'Harpie Lady', 'Celtic Guardian', 'Fissure', 'Trap Hole',
            'Mystical Space Typhoon', 'Change of Heart', 'Monster Reborn',
            'Sangan', 'Witch of the Black Forest', 'Exodia the Forbidden One'
        ];

        for (let i = 0; i < 50; i++) {
            const cardName = cardNames[i % cardNames.length];
            
            await page.fill('[data-testid="manual-card-input"]', `${cardName} ${i}`);
            await page.click('[data-testid="add-card-button"]');
            
            // Add small delay to prevent overwhelming the UI
            if (i % 10 === 0) {
                await page.waitForTimeout(100);
                await memoryMonitor.measureMemory(`cards-${i}`);
            }
        }

        // Verify session is still responsive
        const sessionInfo = await page.locator('[data-testid="session-info"]');
        await expect(sessionInfo).toBeVisible();
        
        const cardCount = await page.locator('[data-testid="card-count"]');
        const countText = await cardCount.textContent();
        expect(parseInt(countText)).toBeGreaterThan(40);

        // Test export with large dataset
        await page.click('[data-testid="export-session-button"]');
        
        // Should complete without timeout
        const exportComplete = page.waitForEvent('download', { timeout: 30000 });
        await page.click('[data-testid="confirm-export-button"]');
        
        const download = await exportComplete;
        expect(download).toBeTruthy();

        await memoryMonitor.measureMemory('large-session-complete');
        const memoryAnalysis = await memoryMonitor.detectMemoryLeaks();
        
        // Memory should be reasonable even with large dataset
        expect(memoryAnalysis.hasSignificantGrowth).toBeFalsy();
    });
});

console.log('🌐 Enhanced E2E tests loaded for real browser scenarios');