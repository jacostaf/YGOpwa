/**
 * End-to-End Tests for YGO Ripper UI v2
 * 
 * Comprehensive E2E tests using Playwright to validate complete user workflows,
 * error recovery scenarios, and real-world usage patterns.
 */

import { test, expect } from '@playwright/test';

// Test configuration
const TEST_URL = 'http://localhost:3000'; // Adjust based on your dev server
const TIMEOUT = 30000;

test.describe('Pack Opening Workflow E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(TEST_URL);
        await page.waitForLoadState('networkidle');
    });

    test('should complete full pack opening session with voice input', async ({ page }) => {
        // Grant microphone permissions (if possible in test environment)
        await page.context().grantPermissions(['microphone']);
        
        // Navigate to pack ripper tab
        await page.click('[data-testid="pack-ripper-tab"]');
        
        // Select a card set
        await page.selectOption('[data-testid="set-selector"]', 'LOB');
        
        // Start session
        await page.click('[data-testid="start-session-btn"]');
        await expect(page.locator('[data-testid="session-status"]')).toContainText('Active');
        
        // Test voice recognition (mock voice input)
        await page.click('[data-testid="voice-start-btn"]');
        await expect(page.locator('[data-testid="voice-status"]')).toContainText('Listening');
        
        // Simulate voice recognition result
        await page.evaluate(() => {
            window.ygoApp.handleVoiceResult({
                transcript: 'Blue-Eyes White Dragon',
                confidence: 0.95
            });
        });
        
        // Verify card was added
        await expect(page.locator('[data-testid="session-cards"]')).toContainText('Blue-Eyes White Dragon');
        await expect(page.locator('[data-testid="total-cards"]')).toContainText('1');
        
        // Add more cards
        await page.evaluate(() => {
            window.ygoApp.handleVoiceResult({
                transcript: 'Dark Magician',
                confidence: 0.90
            });
        });
        
        await expect(page.locator('[data-testid="total-cards"]')).toContainText('2');
        
        // Export session
        await page.click('[data-testid="export-session-btn"]');
        
        // Wait for download
        const downloadPromise = page.waitForEvent('download');
        await page.click('[data-testid="export-json-btn"]');
        const download = await downloadPromise;
        
        expect(download.suggestedFilename()).toMatch(/YGO_Session.*\.json$/);
        
        // Stop session
        await page.click('[data-testid="stop-session-btn"]');
        await expect(page.locator('[data-testid="session-status"]')).toContainText('Inactive');
    });

    test('should handle manual card input workflow', async ({ page }) => {
        // Navigate to pack ripper tab
        await page.click('[data-testid="pack-ripper-tab"]');
        
        // Select a card set and start session
        await page.selectOption('[data-testid="set-selector"]', 'LOB');
        await page.click('[data-testid="start-session-btn"]');
        
        // Use manual card input
        await page.fill('[data-testid="manual-card-input"]', 'Blue-Eyes White Dragon');
        await page.click('[data-testid="add-card-btn"]');
        
        // Verify card was added
        await expect(page.locator('[data-testid="session-cards"]')).toContainText('Blue-Eyes White Dragon');
        
        // Adjust quantity
        await page.click('[data-testid="increase-quantity-btn"]');
        await expect(page.locator('[data-testid="card-quantity"]')).toContainText('2');
        
        // Remove card
        await page.click('[data-testid="remove-card-btn"]');
        await expect(page.locator('[data-testid="session-cards"]')).not.toContainText('Blue-Eyes White Dragon');
    });

    test('should handle session import and export workflow', async ({ page }) => {
        // Create test session data
        const sessionData = {
            setId: 'LOB',
            setName: 'Legend of Blue Eyes White Dragon',
            cards: [
                {
                    id: 'test-1',
                    name: 'Blue-Eyes White Dragon',
                    rarity: 'Ultra Rare',
                    quantity: 1,
                    estimatedPrice: 50.00
                },
                {
                    id: 'test-2',
                    name: 'Dark Magician',
                    rarity: 'Ultra Rare',
                    quantity: 1,
                    estimatedPrice: 30.00
                }
            ],
            totalCards: 2,
            totalValue: 80.00,
            startTime: new Date().toISOString()
        };
        
        // Create and upload file
        const dataTransfer = await page.evaluateHandle((data) => {
            const dt = new DataTransfer();
            const file = new File([JSON.stringify(data)], 'test-session.json', { type: 'application/json' });
            dt.items.add(file);
            return dt;
        }, sessionData);
        
        await page.dispatchEvent('[data-testid="import-file-input"]', 'change', { dataTransfer });
        
        // Verify session was imported
        await expect(page.locator('[data-testid="session-status"]')).toContainText('Active');
        await expect(page.locator('[data-testid="total-cards"]')).toContainText('2');
        await expect(page.locator('[data-testid="total-value"]')).toContainText('$80.00');
    });
});

test.describe('Price Checking Workflow E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(TEST_URL);
        await page.waitForLoadState('networkidle');
    });

    test('should complete price check workflow', async ({ page }) => {
        // Navigate to price checker tab
        await page.click('[data-testid="price-checker-tab"]');
        
        // Fill in card details
        await page.fill('[data-testid="card-name-input"]', 'Blue-Eyes White Dragon');
        await page.selectOption('[data-testid="rarity-selector"]', 'Ultra Rare');
        await page.fill('[data-testid="card-number-input"]', '001');
        
        // Submit price check
        await page.click('[data-testid="check-price-btn"]');
        
        // Wait for results (with loading state)
        await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
        await expect(page.locator('[data-testid="loading-indicator"]')).toBeHidden({ timeout: TIMEOUT });
        
        // Verify price results
        await expect(page.locator('[data-testid="price-results"]')).toBeVisible();
        await expect(page.locator('[data-testid="tcg-low"]')).toContainText('$');
        await expect(page.locator('[data-testid="tcg-market"]')).toContainText('$');
        await expect(page.locator('[data-testid="tcg-high"]')).toContainText('$');
    });

    test('should handle price check errors gracefully', async ({ page }) => {
        // Navigate to price checker tab
        await page.click('[data-testid="price-checker-tab"]');
        
        // Test with invalid card name
        await page.fill('[data-testid="card-name-input"]', 'NonExistentCard123');
        await page.click('[data-testid="check-price-btn"]');
        
        // Should show error message
        await expect(page.locator('[data-testid="error-toast"]')).toBeVisible();
        await expect(page.locator('[data-testid="error-toast"]')).toContainText('not found');
        
        // Test network error simulation
        await page.route('**/api/price-check', (route) => {
            route.abort('failed');
        });
        
        await page.fill('[data-testid="card-name-input"]', 'Blue-Eyes White Dragon');
        await page.click('[data-testid="check-price-btn"]');
        
        // Should show network error
        await expect(page.locator('[data-testid="error-toast"]')).toContainText('network');
    });
});

test.describe('Voice Recognition Error Recovery E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(TEST_URL);
        await page.waitForLoadState('networkidle');
    });

    test('should handle voice permission denied gracefully', async ({ page }) => {
        // Navigate to pack ripper tab
        await page.click('[data-testid="pack-ripper-tab"]');
        
        // Select set and start session
        await page.selectOption('[data-testid="set-selector"]', 'LOB');
        await page.click('[data-testid="start-session-btn"]');
        
        // Simulate permission denied
        await page.evaluate(() => {
            window.ygoApp.handleVoiceError({
                type: 'permission-denied',
                message: 'Microphone access denied'
            });
        });
        
        // Should show error message with recovery options
        await expect(page.locator('[data-testid="error-toast"]')).toContainText('Microphone access denied');
        await expect(page.locator('[data-testid="manual-input-option"]')).toBeVisible();
        
        // Should be able to continue with manual input
        await page.click('[data-testid="manual-input-option"]');
        await expect(page.locator('[data-testid="manual-card-input"]')).toBeFocused();
    });

    test('should handle voice recognition timeout with user feedback', async ({ page }) => {
        await page.context().grantPermissions(['microphone']);
        
        // Navigate to pack ripper tab
        await page.click('[data-testid="pack-ripper-tab"]');
        
        // Start session
        await page.selectOption('[data-testid="set-selector"]', 'LOB');
        await page.click('[data-testid="start-session-btn"]');
        
        // Start voice recognition
        await page.click('[data-testid="voice-start-btn"]');
        
        // Simulate timeout
        await page.evaluate(() => {
            window.ygoApp.handleVoiceError({
                type: 'timeout',
                message: 'Recognition timeout'
            });
        });
        
        // Should show timeout message with recovery options
        await expect(page.locator('[data-testid="error-toast"]')).toContainText('taking longer than expected');
        await expect(page.locator('[data-testid="retry-voice-btn"]')).toBeVisible();
        await expect(page.locator('[data-testid="extend-timeout-btn"]')).toBeVisible();
        
        // Test retry option
        await page.click('[data-testid="retry-voice-btn"]');
        await expect(page.locator('[data-testid="voice-status"]')).toContainText('Listening');
    });

    test('should handle network errors during voice processing', async ({ page }) => {
        await page.context().grantPermissions(['microphone']);
        
        // Navigate to pack ripper tab
        await page.click('[data-testid="pack-ripper-tab"]');
        
        // Start session
        await page.selectOption('[data-testid="set-selector"]', 'LOB');
        await page.click('[data-testid="start-session-btn"]');
        
        // Simulate network error during voice processing
        await page.route('**/api/voice-process', (route) => {
            route.abort('failed');
        });
        
        // Simulate voice input
        await page.evaluate(() => {
            window.ygoApp.handleVoiceError({
                type: 'network-error',
                message: 'Network connection failed'
            });
        });
        
        // Should show network error with offline options
        await expect(page.locator('[data-testid="error-toast"]')).toContainText('Network connection');
        await expect(page.locator('[data-testid="work-offline-btn"]')).toBeVisible();
        
        // Test offline mode
        await page.click('[data-testid="work-offline-btn"]');
        await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    });
});

test.describe('Application Error Boundary E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(TEST_URL);
        await page.waitForLoadState('networkidle');
    });

    test('should handle component initialization failures gracefully', async ({ page }) => {
        // Simulate component failure
        await page.evaluate(() => {
            // Force storage initialization failure
            window.ygoApp.storage.initialize = () => {
                throw new Error('Storage initialization failed');
            };
        });
        
        // Trigger re-initialization
        await page.evaluate(() => {
            window.ygoApp.safeInitializeStorage();
        });
        
        // Should show warning but continue functioning
        await expect(page.locator('[data-testid="warning-toast"]')).toContainText('storage limited');
        
        // App should still be functional with fallback storage
        await page.click('[data-testid="price-checker-tab"]');
        await expect(page.locator('[data-testid="price-checker-form"]')).toBeVisible();
    });

    test('should handle session corruption recovery', async ({ page }) => {
        // Navigate to pack ripper and start session
        await page.click('[data-testid="pack-ripper-tab"]');
        await page.selectOption('[data-testid="set-selector"]', 'LOB');
        await page.click('[data-testid="start-session-btn"]');
        
        // Add some cards
        await page.evaluate(() => {
            window.ygoApp.handleVoiceResult({
                transcript: 'Blue-Eyes White Dragon',
                confidence: 0.95
            });
        });
        
        // Simulate session corruption
        await page.evaluate(() => {
            window.ygoApp.sessionManager.currentSession.cards = 'corrupted-data';
        });
        
        // Trigger session validation
        await page.evaluate(() => {
            window.ygoApp.sessionManager.validateSessionIntegrity();
        });
        
        // Should detect corruption and offer recovery
        await expect(page.locator('[data-testid="session-error-modal"]')).toBeVisible();
        await expect(page.locator('[data-testid="session-error-modal"]')).toContainText('corrupted');
        
        // Should offer to reset session
        await page.click('[data-testid="reset-session-btn"]');
        await expect(page.locator('[data-testid="session-status"]')).toContainText('Inactive');
    });

    test('should handle critical errors with minimal UI fallback', async ({ page }) => {
        // Simulate critical UI manager failure
        await page.evaluate(() => {
            window.ygoApp.uiManager = null;
        });
        
        // Trigger operation that requires UI manager
        await page.evaluate(() => {
            window.ygoApp.safeInitializeUI();
        });
        
        // Should create minimal UI
        await expect(page.locator('[data-testid="minimal-ui"]')).toBeVisible();
        await expect(page.locator('[data-testid="minimal-ui"]')).toContainText('Application Error');
        
        // Should have refresh option
        await expect(page.locator('[data-testid="refresh-btn"]')).toBeVisible();
    });
});

test.describe('Performance and Stress Testing E2E', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(TEST_URL);
        await page.waitForLoadState('networkidle');
    });

    test('should handle large session data efficiently', async ({ page }) => {
        // Navigate to pack ripper
        await page.click('[data-testid="pack-ripper-tab"]');
        await page.selectOption('[data-testid="set-selector"]', 'LOB');
        await page.click('[data-testid="start-session-btn"]');
        
        // Add many cards quickly
        const startTime = Date.now();
        
        for (let i = 0; i < 50; i++) {
            await page.evaluate((index) => {
                window.ygoApp.handleVoiceResult({
                    transcript: `Test Card ${index}`,
                    confidence: 0.8
                });
            }, i);
        }
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Should complete in reasonable time
        expect(duration).toBeLessThan(10000); // 10 seconds
        
        // Verify UI updates correctly
        await expect(page.locator('[data-testid="total-cards"]')).toContainText('50');
        
        // Should still be responsive
        await page.click('[data-testid="export-session-btn"]');
        await expect(page.locator('[data-testid="export-modal"]')).toBeVisible({ timeout: 5000 });
    });

    test('should handle concurrent operations without corruption', async ({ page }) => {
        // Start session
        await page.click('[data-testid="pack-ripper-tab"]');
        await page.selectOption('[data-testid="set-selector"]', 'LOB');
        await page.click('[data-testid="start-session-btn"]');
        
        // Simulate multiple concurrent operations
        await page.evaluate(() => {
            const promises = [];
            for (let i = 0; i < 10; i++) {
                promises.push(
                    window.ygoApp.sessionManager.safeAddCard({
                        name: `Concurrent Card ${i}`,
                        rarity: 'Common',
                        quantity: 1
                    })
                );
            }
            return Promise.allSettled(promises);
        });
        
        // Should handle concurrent operations without corruption
        await expect(page.locator('[data-testid="total-cards"]')).toContainText(/[1-9][0-9]*/);
        
        // Session integrity should be maintained
        const integrityCheck = await page.evaluate(() => {
            return window.ygoApp.sessionManager.validateSessionIntegrity();
        });
        
        expect(integrityCheck.isValid).toBe(true);
    });
});

test.describe('Offline and Network Error Scenarios E2E', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(TEST_URL);
        await page.waitForLoadState('networkidle');
    });

    test('should handle offline mode gracefully', async ({ page }) => {
        // Start a session while online
        await page.click('[data-testid="pack-ripper-tab"]');
        await page.selectOption('[data-testid="set-selector"]', 'LOB');
        await page.click('[data-testid="start-session-btn"]');
        
        // Add some cards
        await page.evaluate(() => {
            window.ygoApp.handleVoiceResult({
                transcript: 'Blue-Eyes White Dragon',
                confidence: 0.95
            });
        });
        
        // Simulate going offline
        await page.context().setOffline(true);
        
        // Should detect offline status
        await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
        
        // Should still allow basic operations
        await page.fill('[data-testid="manual-card-input"]', 'Dark Magician');
        await page.click('[data-testid="add-card-btn"]');
        
        // Card should be added to local session
        await expect(page.locator('[data-testid="total-cards"]')).toContainText('2');
        
        // Price checking should show offline message
        await page.click('[data-testid="price-checker-tab"]');
        await page.fill('[data-testid="card-name-input"]', 'Blue-Eyes White Dragon');
        await page.click('[data-testid="check-price-btn"]');
        
        await expect(page.locator('[data-testid="offline-message"]')).toContainText('offline');
        
        // Going back online should sync data
        await page.context().setOffline(false);
        await expect(page.locator('[data-testid="sync-indicator"]')).toBeVisible();
        await expect(page.locator('[data-testid="offline-indicator"]')).toBeHidden();
    });

    test('should handle intermittent connectivity gracefully', async ({ page }) => {
        // Start price check
        await page.click('[data-testid="price-checker-tab"]');
        await page.fill('[data-testid="card-name-input"]', 'Blue-Eyes White Dragon');
        
        // Simulate intermittent network failure
        let failCount = 0;
        await page.route('**/api/price-check', (route) => {
            failCount++;
            if (failCount <= 2) {
                route.abort('failed');
            } else {
                route.continue();
            }
        });
        
        await page.click('[data-testid="check-price-btn"]');
        
        // Should show retry option
        await expect(page.locator('[data-testid="retry-btn"]')).toBeVisible();
        
        // Retry should eventually succeed
        await page.click('[data-testid="retry-btn"]');
        await expect(page.locator('[data-testid="price-results"]')).toBeVisible({ timeout: TIMEOUT });
    });
});

test.describe('Accessibility and User Experience E2E', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(TEST_URL);
        await page.waitForLoadState('networkidle');
    });

    test('should be accessible via keyboard navigation', async ({ page }) => {
        // Test tab navigation
        await page.keyboard.press('Tab');
        await expect(page.locator('[data-testid="price-checker-tab"]')).toBeFocused();
        
        await page.keyboard.press('Tab');
        await expect(page.locator('[data-testid="pack-ripper-tab"]')).toBeFocused();
        
        // Navigate to pack ripper via keyboard
        await page.keyboard.press('Enter');
        await expect(page.locator('[data-testid="set-selector"]')).toBeVisible();
        
        // Test form navigation
        await page.keyboard.press('Tab');
        await expect(page.locator('[data-testid="set-selector"]')).toBeFocused();
        
        // Select option via keyboard
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
        
        // Continue to start session button
        await page.keyboard.press('Tab');
        await expect(page.locator('[data-testid="start-session-btn"]')).toBeFocused();
        
        await page.keyboard.press('Enter');
        await expect(page.locator('[data-testid="session-status"]')).toContainText('Active');
    });

    test('should provide proper ARIA labels and screen reader support', async ({ page }) => {
        // Check for essential ARIA labels
        await expect(page.locator('[data-testid="voice-start-btn"]')).toHaveAttribute('aria-label');
        await expect(page.locator('[data-testid="session-status"]')).toHaveAttribute('aria-live');
        await expect(page.locator('[data-testid="error-toast"]')).toHaveAttribute('role', 'alert');
        
        // Check form labels
        await page.click('[data-testid="price-checker-tab"]');
        await expect(page.locator('[data-testid="card-name-input"]')).toHaveAttribute('aria-describedby');
        await expect(page.locator('label[for*="card-name"]')).toBeVisible();
    });

    test('should handle different viewport sizes responsively', async ({ page }) => {
        // Test mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });
        
        // Navigation should be accessible
        await expect(page.locator('[data-testid="mobile-menu-btn"]')).toBeVisible();
        await page.click('[data-testid="mobile-menu-btn"]');
        await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
        
        // Forms should be usable
        await page.click('[data-testid="pack-ripper-tab"]');
        await expect(page.locator('[data-testid="set-selector"]')).toBeVisible();
        
        // Test tablet viewport
        await page.setViewportSize({ width: 768, height: 1024 });
        await expect(page.locator('[data-testid="tablet-layout"]')).toBeVisible();
        
        // Test desktop viewport
        await page.setViewportSize({ width: 1920, height: 1080 });
        await expect(page.locator('[data-testid="desktop-layout"]')).toBeVisible();
    });
});

// Test data and utilities
const mockSessionData = {
    setId: 'LOB',
    setName: 'Legend of Blue Eyes White Dragon',
    cards: [
        {
            id: 'test-1',
            name: 'Blue-Eyes White Dragon',
            rarity: 'Ultra Rare',
            cardNumber: '001',
            quantity: 1,
            estimatedPrice: 50.00,
            tcgLow: 45.00,
            tcgMarket: 55.00,
            tcgHigh: 75.00
        },
        {
            id: 'test-2',
            name: 'Dark Magician',
            rarity: 'Ultra Rare',
            cardNumber: '002',
            quantity: 1,
            estimatedPrice: 30.00,
            tcgLow: 25.00,
            tcgMarket: 35.00,
            tcgHigh: 50.00
        }
    ],
    totalCards: 2,
    totalValue: 80.00,
    startTime: new Date().toISOString()
};

// Helper functions for common test operations
async function startTestSession(page, setId = 'LOB') {
    await page.click('[data-testid="pack-ripper-tab"]');
    await page.selectOption('[data-testid="set-selector"]', setId);
    await page.click('[data-testid="start-session-btn"]');
    await expect(page.locator('[data-testid="session-status"]')).toContainText('Active');
}

async function addCardViaVoice(page, cardName, confidence = 0.9) {
    await page.evaluate((name, conf) => {
        window.ygoApp.handleVoiceResult({
            transcript: name,
            confidence: conf
        });
    }, cardName, confidence);
}

async function waitForPriceResults(page) {
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeHidden({ timeout: TIMEOUT });
    await expect(page.locator('[data-testid="price-results"]')).toBeVisible();
}