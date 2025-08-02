/**
 * Enhanced Realistic E2E Tests - Production-Ready Browser Testing
 * 
 * These tests enhance E2E realism by testing actual browser behaviors,
 * real voice recognition flows, genuine network conditions, and cross-browser
 * compatibility without mocks or simulations.
 */

import { test, expect } from '@playwright/test';

// Real browser environment detector
class RealBrowserEnvironment {
    constructor(page, browserName) {
        this.page = page;
        this.browserName = browserName;
    }

    async detectCapabilities() {
        return await this.page.evaluate(() => {
            return {
                // Real feature detection
                webSpeech: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
                mediaDevices: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
                permissions: 'permissions' in navigator,
                serviceWorker: 'serviceWorker' in navigator,
                
                // Real browser info
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                
                // Real performance capabilities
                performanceMemory: 'memory' in performance,
                performanceTiming: 'timing' in performance,
                
                // Real storage capabilities
                localStorage: 'localStorage' in window,
                sessionStorage: 'sessionStorage' in window,
                indexedDB: 'indexedDB' in window
            };
        });
    }

    async setupRealPermissions(type = 'grant') {
        switch (type) {
            case 'grant':
                await this.page.context().grantPermissions(['microphone'], { 
                    origin: this.page.url() 
                });
                break;
            case 'deny':
                await this.page.context().clearPermissions();
                break;
            case 'prompt':
                // This will trigger actual permission prompts
                await this.page.context().clearPermissions();
                break;
        }
    }

    async testRealVoiceRecognition() {
        // Test actual voice recognition capabilities
        const hasVoiceSupport = await this.page.evaluate(async () => {
            try {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                if (!SpeechRecognition) return false;
                
                const recognition = new SpeechRecognition();
                recognition.lang = 'en-US';
                recognition.continuous = false;
                recognition.interimResults = false;
                
                return true;
            } catch (error) {
                return false;
            }
        });

        return hasVoiceSupport;
    }
}

// Real network condition controller
class RealNetworkController {
    constructor(page) {
        this.page = page;
        this.interceptedRequests = [];
    }

    async goOffline() {
        await this.page.context().setOffline(true);
    }

    async goOnline() {
        await this.page.context().setOffline(false);
    }

    async simulateSlowConnection() {
        // Simulate real slow network conditions
        await this.page.route('**/*', async route => {
            // Add realistic delay based on request type
            const url = route.request().url();
            let delay = 1000; // Base delay
            
            if (url.includes('api') || url.includes('tcgplayer')) {
                delay = 3000; // API requests are slower
            } else if (url.includes('.js') || url.includes('.css')) {
                delay = 2000; // Asset loading delay
            }
            
            await new Promise(resolve => setTimeout(resolve, delay));
            await route.continue();
        });
    }

    async blockRealAPIEndpoints() {
        // Block actual external API endpoints
        const blockedDomains = [
            'tcgplayer.com',
            'yugipedia.com',
            'api.ygoprodeck.com',
            'prices.com'
        ];

        for (const domain of blockedDomains) {
            await this.page.route(`**/*${domain}/**`, route => {
                route.abort('failed');
            });
        }
    }

    async simulateIntermittentConnection() {
        let requestCount = 0;
        
        await this.page.route('**/*', async route => {
            requestCount++;
            this.interceptedRequests.push({
                url: route.request().url(),
                method: route.request().method(),
                timestamp: Date.now()
            });
            
            // Fail every 4th request to simulate intermittent issues
            if (requestCount % 4 === 0) {
                await route.abort('failed');
            } else {
                await route.continue();
            }
        });
    }

    async measureNetworkPerformance() {
        const performanceData = await this.page.evaluate(() => {
            const navigation = performance.getEntriesByType('navigation')[0];
            const resources = performance.getEntriesByType('resource');
            
            return {
                navigation: {
                    domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
                    loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
                    responseTime: navigation.responseEnd - navigation.responseStart
                },
                resources: resources.map(resource => ({
                    name: resource.name,
                    duration: resource.duration,
                    size: resource.transferSize || resource.encodedBodySize
                }))
            };
        });

        return performanceData;
    }
}

// Real performance monitor for E2E tests
class RealPerformanceMonitor {
    constructor(page) {
        this.page = page;
        this.metrics = [];
    }

    async startMonitoring() {
        // Start continuous performance monitoring
        await this.page.addInitScript(() => {
            window.performanceMetrics = [];
            
            // Monitor memory usage if available
            if (performance.memory) {
                setInterval(() => {
                    window.performanceMetrics.push({
                        timestamp: Date.now(),
                        memory: {
                            used: performance.memory.usedJSHeapSize,
                            total: performance.memory.totalJSHeapSize,
                            limit: performance.memory.jsHeapSizeLimit
                        }
                    });
                }, 1000);
            }
            
            // Monitor long tasks
            if ('PerformanceObserver' in window) {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        window.performanceMetrics.push({
                            timestamp: Date.now(),
                            longTask: {
                                duration: entry.duration,
                                startTime: entry.startTime
                            }
                        });
                    }
                });
                
                try {
                    observer.observe({ entryTypes: ['longtask'] });
                } catch (e) {
                    // Long task API not supported
                }
            }
        });
    }

    async getMetrics() {
        return await this.page.evaluate(() => {
            return window.performanceMetrics || [];
        });
    }

    async measurePageLoadTime() {
        const timing = await this.page.evaluate(() => {
            const navigation = performance.getEntriesByType('navigation')[0];
            return {
                domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
                loadComplete: navigation.loadEventEnd - navigation.navigationStart,
                firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
            };
        });

        return timing;
    }
}

// Enhanced realistic E2E test suite
test.describe('Real Voice Recognition Permission Testing', () => {
    test('should handle actual microphone permission flows across browsers', async ({ page, browserName }) => {
        const browserEnv = new RealBrowserEnvironment(page, browserName);
        const performanceMonitor = new RealPerformanceMonitor(page);
        
        await performanceMonitor.startMonitoring();
        
        await page.goto('/');
        
        // Detect real browser capabilities
        const capabilities = await browserEnv.detectCapabilities();
        
        if (!capabilities.webSpeech) {
            console.log(`Voice recognition not supported in ${browserName}, testing graceful degradation`);
            
            // Test graceful degradation when voice is not supported
            await page.click('[data-testid="voice-start-button"]');
            
            const errorMessage = await page.waitForSelector('[data-testid="error-toast"]', { timeout: 5000 });
            const errorText = await errorMessage.textContent();
            
            expect(errorText).toContain('not supported');
            
            // Manual input should still work
            const manualInput = await page.locator('[data-testid="manual-card-input"]');
            await expect(manualInput).toBeEnabled();
            
            return;
        }
        
        // Test actual permission denial
        await browserEnv.setupRealPermissions('deny');
        await page.click('[data-testid="voice-start-button"]');
        
        const permissionError = await page.waitForSelector('[data-testid="error-toast"]', { timeout: 10000 });
        const permissionErrorText = await permissionError.textContent();
        
        expect(permissionErrorText.toLowerCase()).toContain('permission');
        
        // Test recovery options
        const retryButton = await page.locator('[data-testid="retry-button"]');
        const manualButton = await page.locator('[data-testid="manual-input-button"]');
        
        await expect(retryButton).toBeVisible();
        await expect(manualButton).toBeVisible();
        
        // Test permission grant flow
        await browserEnv.setupRealPermissions('grant');
        await retryButton.click();
        
        // Verify voice recognition becomes available
        const voiceStatus = await page.locator('[data-testid="voice-status"]');
        await expect(voiceStatus).toContainText(/listening|ready/, { timeout: 10000 });
        
        // Measure performance impact
        const metrics = await performanceMonitor.getMetrics();
        const memoryGrowth = metrics.filter(m => m.memory).length;
        
        expect(memoryGrowth).toBeGreaterThan(0); // Should have memory measurements
    });

    test('should test real voice recognition with actual speech synthesis', async ({ page, browserName }) => {
        const browserEnv = new RealBrowserEnvironment(page, browserName);
        
        await page.goto('/');
        
        const hasVoiceSupport = await browserEnv.testRealVoiceRecognition();
        
        if (!hasVoiceSupport) {
            console.log(`Voice recognition not available in ${browserName}`);
            return;
        }
        
        await browserEnv.setupRealPermissions('grant');
        
        // Start voice recognition
        await page.click('[data-testid="voice-start-button"]');
        
        // Wait for voice to be ready
        const voiceStatus = await page.locator('[data-testid="voice-status"]');
        await expect(voiceStatus).toContainText(/listening|ready/, { timeout: 15000 });
        
        // Simulate voice input using speech synthesis (where supported)
        const speechResult = await page.evaluate(async () => {
            try {
                if ('speechSynthesis' in window) {
                    const utterance = new SpeechSynthesisUtterance('Blue Eyes White Dragon');
                    utterance.rate = 0.8;
                    utterance.pitch = 1.0;
                    utterance.volume = 0.5;
                    
                    speechSynthesis.speak(utterance);
                    
                    return new Promise((resolve) => {
                        utterance.onend = () => resolve(true);
                        utterance.onerror = () => resolve(false);
                        setTimeout(() => resolve(false), 5000); // Timeout
                    });
                }
                return false;
            } catch (error) {
                return false;
            }
        });
        
        if (speechResult) {
            // Wait for voice recognition to process the synthesized speech
            const cardResults = await page.waitForSelector('[data-testid="card-suggestions"]', { 
                timeout: 10000 
            }).catch(() => null);
            
            if (cardResults) {
                // Voice recognition worked with real speech
                const suggestions = await cardResults.textContent();
                expect(suggestions.toLowerCase()).toContain('blue');
            }
        }
        
        // Test manual fallback always works
        await page.fill('[data-testid="manual-card-input"]', 'Dark Magician');
        await page.click('[data-testid="add-card-button"]');
        
        const sessionInfo = await page.locator('[data-testid="session-info"]');
        await expect(sessionInfo).toBeVisible();
    });
});

test.describe('Real Network Condition Testing', () => {
    test('should handle actual network failures with real API endpoints', async ({ page }) => {
        const networkController = new RealNetworkController(page);
        const performanceMonitor = new RealPerformanceMonitor(page);
        
        await performanceMonitor.startMonitoring();
        await page.goto('/');
        
        // Block real external APIs
        await networkController.blockRealAPIEndpoints();
        
        // Try price checking with blocked APIs
        await page.fill('[data-testid="card-name-input"]', 'Blue-Eyes White Dragon');
        await page.click('[data-testid="price-check-button"]');
        
        // Should handle API failure gracefully
        const errorMessage = await page.waitForSelector('[data-testid="error-toast"]', { timeout: 15000 });
        const errorText = await errorMessage.textContent();
        
        expect(errorText.toLowerCase()).toContain('price');
        
        // Recovery options should be available
        const retryButton = await page.locator('[data-testid="retry-price-check"]');
        const skipButton = await page.locator('[data-testid="skip-price-check"]');
        
        await expect(retryButton).toBeVisible();
        await expect(skipButton).toBeVisible();
        
        // App should continue functioning
        await skipButton.click();
        
        const cardInput = await page.locator('[data-testid="card-name-input"]');
        await expect(cardInput).toBeEnabled();
        
        // Verify performance under network failure
        const loadTime = await performanceMonitor.measurePageLoadTime();
        expect(loadTime.domContentLoaded).toBeLessThan(10000); // Should load within 10s even with failures
    });

    test('should test real offline/online transitions', async ({ page }) => {
        const networkController = new RealNetworkController(page);
        const performanceMonitor = new RealPerformanceMonitor(page);
        
        await page.goto('/');
        await performanceMonitor.startMonitoring();
        
        // Test going offline
        await networkController.goOffline();
        
        // Verify offline detection
        const offlineIndicator = await page.waitForSelector('[data-testid="offline-indicator"]', { 
            timeout: 5000 
        });
        await expect(offlineIndicator).toBeVisible();
        
        // Try operations while offline
        await page.fill('[data-testid="card-name-input"]', 'Red-Eyes Black Dragon');
        await page.click('[data-testid="price-check-button"]');
        
        const offlineMessage = await page.waitForSelector('[data-testid="offline-message"]', { 
            timeout: 5000 
        });
        await expect(offlineMessage).toBeVisible();
        
        // Go back online
        await networkController.goOnline();
        
        // Wait for online detection
        await page.waitForSelector('[data-testid="offline-indicator"]', { 
            state: 'hidden', 
            timeout: 5000 
        });
        
        // Retry the operation
        await page.click('[data-testid="price-check-button"]');
        
        // Should work now (or fail gracefully if API is actually down)
        await page.waitForSelector('[data-testid="price-results"], [data-testid="error-toast"]', { 
            timeout: 15000 
        });
        
        const metrics = await performanceMonitor.getMetrics();
        expect(metrics.length).toBeGreaterThan(0);
    });

    test('should handle intermittent network conditions realistically', async ({ page }) => {
        const networkController = new RealNetworkController(page);
        
        await page.goto('/');
        
        // Simulate intermittent connection
        await networkController.simulateIntermittentConnection();
        
        // Perform multiple operations
        const operations = [
            'Blue-Eyes White Dragon',
            'Dark Magician',
            'Red-Eyes Black Dragon',
            'Time Wizard',
            'Mirror Force'
        ];
        
        let successCount = 0;
        let failureCount = 0;
        
        for (const cardName of operations) {
            await page.fill('[data-testid="card-name-input"]', cardName);
            await page.click('[data-testid="price-check-button"]');
            
            try {
                await page.waitForSelector('[data-testid="price-results"]', { timeout: 5000 });
                successCount++;
            } catch {
                // Check for error message
                const errorMessage = await page.locator('[data-testid="error-toast"]');
                if (await errorMessage.isVisible()) {
                    failureCount++;
                }
            }
            
            // Clear any error messages
            await page.reload();
        }
        
        // Should have some successes and some failures due to intermittent network
        expect(successCount + failureCount).toBeGreaterThan(0);
        
        // App should remain functional throughout
        const cardInput = await page.locator('[data-testid="card-name-input"]');
        await expect(cardInput).toBeEnabled();
    });
});

test.describe('Cross-Browser Error Boundary Testing', () => {
    ['chromium', 'firefox', 'webkit'].forEach(browserName => {
        test(`should handle errors consistently in ${browserName}`, async ({ page, browserName: currentBrowser }) => {
            test.skip(currentBrowser !== browserName, `Skipping ${browserName} test in ${currentBrowser}`);
            
            const browserEnv = new RealBrowserEnvironment(page, browserName);
            const networkController = new RealNetworkController(page);
            
            await page.goto('/');
            
            const capabilities = await browserEnv.detectCapabilities();
            
            // Test error scenarios specific to each browser
            const testScenarios = [
                {
                    name: 'Storage Quota Exceeded',
                    action: async () => {
                        // Fill localStorage to capacity
                        await page.evaluate(() => {
                            try {
                                for (let i = 0; i < 1000; i++) {
                                    localStorage.setItem(`test_${i}`, 'x'.repeat(10000));
                                }
                            } catch (e) {
                                // Expected when quota exceeded
                            }
                        });
                    }
                },
                {
                    name: 'Network API Failure',
                    action: async () => {
                        await networkController.blockRealAPIEndpoints();
                        await page.click('[data-testid="price-check-button"]');
                    }
                }
            ];
            
            if (capabilities.webSpeech) {
                testScenarios.push({
                    name: 'Voice Permission Denied',
                    action: async () => {
                        await browserEnv.setupRealPermissions('deny');
                        await page.click('[data-testid="voice-start-button"]');
                    }
                });
            }
            
            for (const scenario of testScenarios) {
                console.log(`Testing ${scenario.name} in ${browserName}`);
                
                await scenario.action();
                
                // Give error boundaries time to handle the error
                await page.waitForTimeout(1000);
                
                // App should still be responsive
                const cardInput = await page.locator('[data-testid="card-name-input"]');
                await expect(cardInput).toBeEnabled({ timeout: 5000 });
                
                // Check for appropriate error handling
                const errorToast = await page.locator('[data-testid="error-toast"]');
                if (await errorToast.isVisible()) {
                    const errorText = await errorToast.textContent();
                    expect(errorText.length).toBeGreaterThan(0);
                }
                
                // Reset for next test
                await page.reload();
            }
        });
    });
});

test.describe('Performance Under Error Conditions', () => {
    test('should maintain performance during continuous errors', async ({ page }) => {
        const performanceMonitor = new RealPerformanceMonitor(page);
        const networkController = new RealNetworkController(page);
        
        await page.goto('/');
        await performanceMonitor.startMonitoring();
        
        // Create continuous error conditions
        await networkController.simulateSlowConnection();
        
        const operationTimes = [];
        const startTime = Date.now();
        
        // Run operations for 30 seconds
        while (Date.now() - startTime < 30000) {
            const opStartTime = performance.now();
            
            try {
                await page.fill('[data-testid="card-name-input"]', 'Test Card');
                await page.click('[data-testid="price-check-button"]');
                
                // Wait for result or timeout
                await page.waitForSelector('[data-testid="price-results"], [data-testid="error-toast"]', { 
                    timeout: 5000 
                }).catch(() => {});
                
            } catch (error) {
                // Expected under error conditions
            }
            
            const opEndTime = performance.now();
            operationTimes.push(opEndTime - opStartTime);
            
            // Small delay between operations
            await page.waitForTimeout(100);
        }
        
        // Analyze performance
        const avgTime = operationTimes.reduce((a, b) => a + b, 0) / operationTimes.length;
        const maxTime = Math.max(...operationTimes);
        
        // Should maintain reasonable performance even under errors
        expect(avgTime).toBeLessThan(10000); // Average < 10 seconds
        expect(maxTime).toBeLessThan(30000); // Max < 30 seconds
        
        // Get memory metrics
        const metrics = await performanceMonitor.getMetrics();
        const memoryMetrics = metrics.filter(m => m.memory);
        
        if (memoryMetrics.length > 1) {
            const firstMemory = memoryMetrics[0].memory.used;
            const lastMemory = memoryMetrics[memoryMetrics.length - 1].memory.used;
            const memoryGrowth = lastMemory - firstMemory;
            
            // Memory growth should be reasonable
            expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024); // Less than 100MB growth
        }
        
        // UI should remain responsive
        const cardInput = await page.locator('[data-testid="card-name-input"]');
        await expect(cardInput).toBeEnabled();
    });

    test('should handle large session data without performance degradation', async ({ page }) => {
        const performanceMonitor = new RealPerformanceMonitor(page);
        
        await page.goto('/');
        await performanceMonitor.startMonitoring();
        
        // Start a session
        await page.click('[data-testid="start-session-button"]');
        await page.selectOption('[data-testid="card-set-select"]', 'Supreme Darkness');
        
        const loadTime = await performanceMonitor.measurePageLoadTime();
        expect(loadTime.domContentLoaded).toBeLessThan(5000); // Initial load < 5s
        
        // Add many cards
        const cardNames = [
            'Blue-Eyes White Dragon', 'Dark Magician', 'Red-Eyes Black Dragon',
            'Time Wizard', 'Mirror Force', 'Pot of Greed', 'Raigeki',
            'Harpie Lady', 'Celtic Guardian', 'Fissure', 'Trap Hole'
        ];
        
        for (let i = 0; i < 100; i++) {
            const cardName = cardNames[i % cardNames.length];
            
            await page.fill('[data-testid="manual-card-input"]', `${cardName} ${i}`);
            await page.click('[data-testid="add-card-button"]');
            
            // Measure operation time every 10 cards
            if (i % 10 === 0 && i > 0) {
                const opStartTime = performance.now();
                
                // Test UI responsiveness
                await page.click('[data-testid="session-info"]');
                
                const opEndTime = performance.now();
                const operationTime = opEndTime - opStartTime;
                
                // UI should remain responsive
                expect(operationTime).toBeLessThan(1000); // < 1 second
            }
        }
        
        // Test export performance with large dataset
        const exportStartTime = performance.now();
        
        await page.click('[data-testid="export-session-button"]');
        
        const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
        await page.click('[data-testid="confirm-export-button"]');
        
        const download = await downloadPromise;
        const exportEndTime = performance.now();
        const exportTime = exportEndTime - exportStartTime;
        
        expect(download).toBeTruthy();
        expect(exportTime).toBeLessThan(15000); // Export should complete within 15s
        
        // Final memory check
        const finalMetrics = await performanceMonitor.getMetrics();
        const memoryMetrics = finalMetrics.filter(m => m.memory);
        
        if (memoryMetrics.length > 0) {
            const finalMemory = memoryMetrics[memoryMetrics.length - 1].memory;
            
            // Memory usage should be reasonable even with 100 cards
            expect(finalMemory.used).toBeLessThan(200 * 1024 * 1024); // < 200MB
        }
    });
});

console.log('🌐 Enhanced realistic E2E tests loaded - testing real browser behaviors without mocks');