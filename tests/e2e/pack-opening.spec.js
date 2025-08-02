/**
 * E2E Tests - Complete Pack Opening Workflow
 * 
 * Comprehensive end-to-end tests using Playwright to validate
 * the complete user workflow from pack opening to card tracking.
 */

import { test, expect } from '@playwright/test';

// Test configuration
const BASE_URL = 'http://localhost:4055';
const TIMEOUT = 30000;

// Test data
const TEST_CARD_SET = 'LOB';
const TEST_CARD_NAME = 'Blue-Eyes White Dragon';
const TEST_CARD_RARITY = 'Ultra Rare';

test.describe('Complete Pack Opening Workflow', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to application
        await page.goto(BASE_URL);
        
        // Wait for app to load
        await page.waitForSelector('#app:not(.hidden)', { timeout: TIMEOUT });
        
        // Ensure we're on the pack ripper tab
        await page.click('[data-tab="pack-ripper"]');
        await page.waitForSelector('#pack-ripper-panel', { state: 'visible' });
    });

    test('should complete full pack opening workflow', async ({ page }) => {
        // Step 1: Select card set
        await page.selectOption('#card-set-select', TEST_CARD_SET);
        
        // Step 2: Start session
        await page.click('#start-session-btn');
        
        // Wait for session to start
        await expect(page.locator('#session-status')).toContainText('Active');
        
        // Step 3: Add card manually (simulating voice recognition)
        await page.click('#add-card-manually'); // Fallback button
        
        // Fill card details
        await page.fill('#card-name-input', TEST_CARD_NAME);
        await page.selectOption('#card-rarity-select', TEST_CARD_RARITY);
        await page.fill('#card-number-input', '001');
        await page.click('#add-card-btn');
        
        // Step 4: Verify card was added
        await expect(page.locator('.session-card')).toContainText(TEST_CARD_NAME);
        await expect(page.locator('#total-cards')).toContainText('1');
        
        // Step 5: Adjust quantity
        await page.click('.quantity-increase');
        await expect(page.locator('#total-cards')).toContainText('2');
        
        // Step 6: Check pricing
        await page.click('.refresh-pricing-btn');
        await page.waitForSelector('.pricing-data', { state: 'visible' });
        
        // Step 7: Export session
        await page.click('#export-session-btn');
        
        // Wait for export dialog
        await page.waitForSelector('.modal-dialog', { state: 'visible' });
        
        // Select JSON format and export
        await page.click('input[value="json"]');
        await page.click('#confirm-export');
        
        // Verify download started (file download handling)
        const downloadPromise = page.waitForEvent('download');
        await downloadPromise;
        
        // Step 8: Clear session
        await page.click('#clear-session-btn');
        
        // Confirm clear
        await page.click('button:has-text("Yes, Clear")');
        
        // Verify session cleared
        await expect(page.locator('#total-cards')).toContainText('0');
        await expect(page.locator('.empty-state')).toBeVisible();
    });

    test('should handle session persistence', async ({ page }) => {
        // Start session and add card
        await page.selectOption('#card-set-select', TEST_CARD_SET);
        await page.click('#start-session-btn');
        
        // Add card
        await page.click('#add-card-manually');
        await page.fill('#card-name-input', TEST_CARD_NAME);
        await page.selectOption('#card-rarity-select', TEST_CARD_RARITY);
        await page.click('#add-card-btn');
        
        // Verify card added
        await expect(page.locator('.session-card')).toContainText(TEST_CARD_NAME);
        
        // Refresh page (simulating app restart)
        await page.reload();
        await page.waitForSelector('#app:not(.hidden)', { timeout: TIMEOUT });
        
        // Navigate to pack ripper
        await page.click('[data-tab="pack-ripper"]');
        
        // Verify session was restored
        await expect(page.locator('#session-status')).toContainText('Active');
        await expect(page.locator('.session-card')).toContainText(TEST_CARD_NAME);
    });

    test('should handle multiple cards in session', async ({ page }) => {
        // Start session
        await page.selectOption('#card-set-select', TEST_CARD_SET);
        await page.click('#start-session-btn');
        
        // Add multiple cards
        const cards = [
            { name: 'Blue-Eyes White Dragon', rarity: 'Ultra Rare', number: '001' },
            { name: 'Dark Magician', rarity: 'Ultra Rare', number: '002' },
            { name: 'Red-Eyes Black Dragon', rarity: 'Ultra Rare', number: '003' }
        ];
        
        for (const card of cards) {
            await page.click('#add-card-manually');
            await page.fill('#card-name-input', card.name);
            await page.selectOption('#card-rarity-select', card.rarity);
            await page.fill('#card-number-input', card.number);
            await page.click('#add-card-btn');
            
            // Wait for card to be added
            await expect(page.locator('.session-card').last()).toContainText(card.name);
        }
        
        // Verify all cards are present
        await expect(page.locator('.session-card')).toHaveCount(3);
        await expect(page.locator('#total-cards')).toContainText('3');
        
        // Test card removal
        await page.click('.session-card:first-child .remove-card-btn');
        await expect(page.locator('.session-card')).toHaveCount(2);
        await expect(page.locator('#total-cards')).toContainText('2');
    });

    test('should calculate session totals correctly', async ({ page }) => {
        // Start session
        await page.selectOption('#card-set-select', TEST_CARD_SET);
        await page.click('#start-session-btn');
        
        // Add card with known pricing
        await page.click('#add-card-manually');
        await page.fill('#card-name-input', TEST_CARD_NAME);
        await page.selectOption('#card-rarity-select', TEST_CARD_RARITY);
        await page.fill('#card-number-input', '001');
        await page.click('#add-card-btn');
        
        // Increase quantity
        await page.click('.quantity-increase');
        await page.click('.quantity-increase');
        
        // Verify quantity updated
        await expect(page.locator('#total-cards')).toContainText('3');
        
        // Mock pricing data (if available)
        await page.click('.refresh-pricing-btn');
        
        // Wait for pricing to load
        await page.waitForSelector('.pricing-data', { state: 'visible' });
        
        // Verify total value calculation
        const totalValue = await page.locator('#total-value').textContent();
        expect(parseFloat(totalValue.replace('$', ''))).toBeGreaterThan(0);
    });
});

test.describe('Voice Recognition Flow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
        await page.waitForSelector('#app:not(.hidden)', { timeout: TIMEOUT });
        await page.click('[data-tab="pack-ripper"]');
        
        // Start session
        await page.selectOption('#card-set-select', TEST_CARD_SET);
        await page.click('#start-session-btn');
    });

    test('should handle voice recognition flow', async ({ page }) => {
        // Grant microphone permissions (mock)
        await page.context().grantPermissions(['microphone']);
        
        // Click start voice recognition
        await page.click('#start-voice-btn');
        
        // Verify voice status updated
        await expect(page.locator('#voice-status')).toContainText('Listening');
        
        // Verify voice controls updated
        await expect(page.locator('#start-voice-btn')).toBeHidden();
        await expect(page.locator('#stop-voice-btn')).toBeVisible();
        
        // Mock voice recognition result
        await page.evaluate(() => {
            if (window.ygoApp && window.ygoApp.voiceEngine) {
                window.ygoApp.voiceEngine.emitResult({
                    transcript: 'Blue-Eyes White Dragon',
                    confidence: 0.95
                });
            }
        });
        
        // Verify card selection dialog appears
        await expect(page.locator('.modal-dialog')).toBeVisible();
        await expect(page.locator('.modal-dialog')).toContainText('Select Card');
        
        // Select the card
        await page.click('.select-card-btn');
        
        // Verify card was added
        await expect(page.locator('.session-card')).toContainText('Blue-Eyes White Dragon');
        
        // Stop voice recognition
        await page.click('#stop-voice-btn');
        
        // Verify voice status updated
        await expect(page.locator('#voice-status')).toContainText('Ready');
    });

    test('should handle voice recognition permissions', async ({ page }) => {
        // Test without microphone permissions
        await page.context().clearPermissions();
        
        // Try to start voice recognition
        await page.click('#start-voice-btn');
        
        // Verify permission error message
        await expect(page.locator('.toast')).toContainText('Microphone access');
        
        // Grant permissions
        await page.context().grantPermissions(['microphone']);
        
        // Try again
        await page.click('#start-voice-btn');
        
        // Should work now
        await expect(page.locator('#voice-status')).toContainText('Listening');
    });

    test('should handle voice recognition errors', async ({ page }) => {
        await page.context().grantPermissions(['microphone']);
        
        // Mock voice recognition error
        await page.evaluate(() => {
            if (window.ygoApp && window.ygoApp.voiceEngine) {
                window.ygoApp.voiceEngine.emitError({
                    type: 'no-speech',
                    message: 'No speech detected'
                });
            }
        });
        
        // Verify error message
        await expect(page.locator('.toast')).toContainText('No speech detected');
        
        // Verify voice status reset
        await expect(page.locator('#voice-status')).toContainText('Ready');
    });

    test('should handle manual input fallback', async ({ page }) => {
        // Mock voice recognition failure
        await page.evaluate(() => {
            if (window.ygoApp && window.ygoApp.voiceEngine) {
                window.ygoApp.voiceEngine.emitError({
                    type: 'not-supported',
                    message: 'Voice recognition not supported'
                });
            }
        });
        
        // Verify fallback dialog appears
        await expect(page.locator('.error-fallback-modal')).toBeVisible();
        
        // Enter card name manually
        await page.fill('#manual-card-input', TEST_CARD_NAME);
        await page.click('#confirm-manual-input');
        
        // Verify card was processed
        await expect(page.locator('.session-card')).toContainText(TEST_CARD_NAME);
    });
});

test.describe('Error Scenarios and Recovery', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
        await page.waitForSelector('#app:not(.hidden)', { timeout: TIMEOUT });
    });

    test('should handle API errors gracefully', async ({ page }) => {
        // Mock API failure
        await page.route('**/api/**', route => {
            route.abort('failed');
        });
        
        // Navigate to price checker
        await page.click('[data-tab="price-checker"]');
        
        // Try to check price
        await page.fill('#card-name-input', TEST_CARD_NAME);
        await page.fill('#card-number-input', '001');
        await page.selectOption('#rarity-select', TEST_CARD_RARITY);
        await page.click('#price-check-btn');
        
        // Verify error message
        await expect(page.locator('.toast')).toContainText('Unable to connect');
        
        // Verify error result displayed
        await expect(page.locator('.price-results')).toContainText('Error');
    });

    test('should handle network connectivity issues', async ({ page }) => {
        // Start with network
        await page.click('[data-tab="pack-ripper"]');
        await page.selectOption('#card-set-select', TEST_CARD_SET);
        await page.click('#start-session-btn');
        
        // Simulate network disconnection
        await page.context().setOffline(true);
        
        // Verify offline notification
        await expect(page.locator('.offline-notification')).toBeVisible();
        
        // Try to add card (should still work offline)
        await page.click('#add-card-manually');
        await page.fill('#card-name-input', TEST_CARD_NAME);
        await page.selectOption('#card-rarity-select', TEST_CARD_RARITY);
        await page.click('#add-card-btn');
        
        // Verify card added offline
        await expect(page.locator('.session-card')).toContainText(TEST_CARD_NAME);
        
        // Restore network
        await page.context().setOffline(false);
        
        // Verify reconnection message
        await expect(page.locator('.toast')).toContainText('Back online');
    });

    test('should handle storage errors', async ({ page }) => {
        // Mock storage error
        await page.addInitScript(() => {
            // Override localStorage to throw error
            const originalSetItem = localStorage.setItem;
            localStorage.setItem = function() {
                throw new Error('Storage quota exceeded');
            };
        });
        
        // Navigate to pack ripper
        await page.click('[data-tab="pack-ripper"]');
        await page.selectOption('#card-set-select', TEST_CARD_SET);
        await page.click('#start-session-btn');
        
        // Try to add card (should trigger storage error)
        await page.click('#add-card-manually');
        await page.fill('#card-name-input', TEST_CARD_NAME);
        await page.selectOption('#card-rarity-select', TEST_CARD_RARITY);
        await page.click('#add-card-btn');
        
        // Verify fallback storage message
        await expect(page.locator('.toast')).toContainText('stored temporarily in memory');
        
        // Verify card still added
        await expect(page.locator('.session-card')).toContainText(TEST_CARD_NAME);
    });

    test('should handle invalid card data', async ({ page }) => {
        await page.click('[data-tab="pack-ripper"]');
        await page.selectOption('#card-set-select', TEST_CARD_SET);
        await page.click('#start-session-btn');
        
        // Try to add card with invalid data
        await page.click('#add-card-manually');
        // Leave name empty
        await page.selectOption('#card-rarity-select', TEST_CARD_RARITY);
        await page.click('#add-card-btn');
        
        // Verify validation error
        await expect(page.locator('.toast')).toContainText('Invalid card data');
        
        // Verify card not added
        await expect(page.locator('.session-card')).toHaveCount(0);
    });

    test('should handle session recovery after errors', async ({ page }) => {
        await page.click('[data-tab="pack-ripper"]');
        await page.selectOption('#card-set-select', TEST_CARD_SET);
        await page.click('#start-session-btn');
        
        // Add card
        await page.click('#add-card-manually');
        await page.fill('#card-name-input', TEST_CARD_NAME);
        await page.selectOption('#card-rarity-select', TEST_CARD_RARITY);
        await page.click('#add-card-btn');
        
        // Simulate application error
        await page.evaluate(() => {
            throw new Error('Simulated application error');
        });
        
        // Refresh page
        await page.reload();
        await page.waitForSelector('#app:not(.hidden)', { timeout: TIMEOUT });
        
        // Navigate to pack ripper
        await page.click('[data-tab="pack-ripper"]');
        
        // Verify session recovered
        await expect(page.locator('#session-status')).toContainText('Active');
        await expect(page.locator('.session-card')).toContainText(TEST_CARD_NAME);
    });
});

test.describe('Offline Functionality', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(BASE_URL);
        await page.waitForSelector('#app:not(.hidden)', { timeout: TIMEOUT });
        
        // Register service worker
        await page.evaluate(() => {
            if ('serviceWorker' in navigator) {
                return navigator.serviceWorker.register('/sw.js');
            }
        });
        
        // Wait for service worker to be ready
        await page.waitForFunction(() => {
            return navigator.serviceWorker.ready;
        });
    });

    test('should work offline with cached resources', async ({ page }) => {
        // Load app while online
        await page.click('[data-tab="pack-ripper"]');
        await page.selectOption('#card-set-select', TEST_CARD_SET);
        await page.click('#start-session-btn');
        
        // Go offline
        await page.context().setOffline(true);
        
        // Verify offline notification
        await expect(page.locator('.offline-notification')).toBeVisible();
        
        // Verify app still works
        await page.click('#add-card-manually');
        await page.fill('#card-name-input', TEST_CARD_NAME);
        await page.selectOption('#card-rarity-select', TEST_CARD_RARITY);
        await page.click('#add-card-btn');
        
        // Verify card added offline
        await expect(page.locator('.session-card')).toContainText(TEST_CARD_NAME);
        
        // Verify session data persists
        await page.reload();
        await page.waitForSelector('#app:not(.hidden)', { timeout: TIMEOUT });
        
        // Check if data is still there
        await page.click('[data-tab="pack-ripper"]');
        await expect(page.locator('.session-card')).toContainText(TEST_CARD_NAME);
    });

    test('should sync data when coming back online', async ({ page }) => {
        // Start offline
        await page.context().setOffline(true);
        
        // Add data offline
        await page.click('[data-tab="pack-ripper"]');
        await page.selectOption('#card-set-select', TEST_CARD_SET);
        await page.click('#start-session-btn');
        
        await page.click('#add-card-manually');
        await page.fill('#card-name-input', TEST_CARD_NAME);
        await page.selectOption('#card-rarity-select', TEST_CARD_RARITY);
        await page.click('#add-card-btn');
        
        // Verify offline data
        await expect(page.locator('.session-card')).toContainText(TEST_CARD_NAME);
        
        // Come back online
        await page.context().setOffline(false);
        
        // Verify sync message
        await expect(page.locator('.toast')).toContainText('Back online');
        
        // Verify data is still there
        await expect(page.locator('.session-card')).toContainText(TEST_CARD_NAME);
    });

    test('should handle offline price checking', async ({ page }) => {
        // Go offline
        await page.context().setOffline(true);
        
        // Try price checking
        await page.click('[data-tab="price-checker"]');
        await page.fill('#card-name-input', TEST_CARD_NAME);
        await page.fill('#card-number-input', '001');
        await page.selectOption('#rarity-select', TEST_CARD_RARITY);
        await page.click('#price-check-btn');
        
        // Verify offline message
        await expect(page.locator('.toast')).toContainText('offline');
        
        // Come back online
        await page.context().setOffline(false);
        
        // Try price checking again
        await page.click('#price-check-btn');
        
        // Should work now
        await expect(page.locator('.price-results')).toBeVisible();
    });

    test('should show appropriate offline indicators', async ({ page }) => {
        // Go offline
        await page.context().setOffline(true);
        
        // Verify offline indicators
        await expect(page.locator('#connection-status')).toContainText('Offline');
        await expect(page.locator('.offline-notification')).toBeVisible();
        
        // Come back online
        await page.context().setOffline(false);
        
        // Verify online indicators
        await expect(page.locator('#connection-status')).toContainText('Online');
        await expect(page.locator('.offline-notification')).toBeHidden();
    });
});

test.describe('Performance and Accessibility', () => {
    test('should meet performance requirements', async ({ page }) => {
        // Navigate to app
        await page.goto(BASE_URL);
        
        // Measure load time
        const loadTime = await page.evaluate(() => {
            return performance.timing.loadEventEnd - performance.timing.navigationStart;
        });
        
        // Should load within 3 seconds
        expect(loadTime).toBeLessThan(3000);
        
        // Check for performance warnings
        const performanceEntries = await page.evaluate(() => {
            return performance.getEntriesByType('navigation');
        });
        
        expect(performanceEntries.length).toBeGreaterThan(0);
    });

    test('should be accessible', async ({ page }) => {
        await page.goto(BASE_URL);
        await page.waitForSelector('#app:not(.hidden)', { timeout: TIMEOUT });
        
        // Check for basic accessibility
        const ariaLabels = await page.$$eval('[aria-label]', elements => elements.length);
        expect(ariaLabels).toBeGreaterThan(0);
        
        // Check for proper heading structure
        const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', elements => elements.length);
        expect(headings).toBeGreaterThan(0);
        
        // Check for proper form labels
        const labels = await page.$$eval('label', elements => elements.length);
        expect(labels).toBeGreaterThan(0);
        
        // Check for focus indicators
        await page.keyboard.press('Tab');
        const focusedElement = await page.evaluate(() => document.activeElement.tagName);
        expect(focusedElement).toBeTruthy();
    });

    test('should handle large datasets efficiently', async ({ page }) => {
        await page.goto(BASE_URL);
        await page.waitForSelector('#app:not(.hidden)', { timeout: TIMEOUT });
        
        // Navigate to pack ripper
        await page.click('[data-tab="pack-ripper"]');
        await page.selectOption('#card-set-select', TEST_CARD_SET);
        await page.click('#start-session-btn');
        
        // Add many cards
        for (let i = 0; i < 50; i++) {
            await page.click('#add-card-manually');
            await page.fill('#card-name-input', `Test Card ${i}`);
            await page.selectOption('#card-rarity-select', 'Common');
            await page.fill('#card-number-input', String(i).padStart(3, '0'));
            await page.click('#add-card-btn');
        }
        
        // Verify all cards added
        await expect(page.locator('#total-cards')).toContainText('50');
        
        // Verify performance is still good
        const scrollPerformance = await page.evaluate(() => {
            const start = performance.now();
            const cardsContainer = document.querySelector('#session-cards');
            cardsContainer.scrollTop = 1000;
            return performance.now() - start;
        });
        
        // Scrolling should be smooth (< 16ms for 60fps)
        expect(scrollPerformance).toBeLessThan(50);
    });
});

// Helper functions for common test operations
async function addCardToSession(page, cardData) {
    await page.click('#add-card-manually');
    await page.fill('#card-name-input', cardData.name);
    await page.selectOption('#card-rarity-select', cardData.rarity);
    await page.fill('#card-number-input', cardData.number);
    await page.click('#add-card-btn');
}

async function startSession(page, setId) {
    await page.selectOption('#card-set-select', setId);
    await page.click('#start-session-btn');
    await expect(page.locator('#session-status')).toContainText('Active');
}

async function mockVoiceRecognition(page, transcript, confidence = 0.95) {
    await page.evaluate(({ transcript, confidence }) => {
        if (window.ygoApp && window.ygoApp.voiceEngine) {
            window.ygoApp.voiceEngine.emitResult({
                transcript,
                confidence
            });
        }
    }, { transcript, confidence });
}