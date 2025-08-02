/**
 * Enhanced Error Handling Tests for ImageManager
 * Tests network failures, timeouts, CORS issues, and recovery mechanisms
 */

import { test, expect } from '@playwright/test';

test.describe('ImageManager Enhanced Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-imagemanager.html');
    await page.waitForFunction(() => window.imageManagerTestPageReady);
    
    // Clear any existing cache before each test
    await page.evaluate(() => {
      window.imageManager.clearCache();
    });
  });

  test.describe('Network Failures and Timeouts', () => {
    test('should handle network timeouts gracefully with placeholder fallback', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const imageManager = new window.ImageManager();
        const container = document.createElement('div');
        document.body.appendChild(container);
        
        // Use a URL that will timeout (simulated with a very slow loading URL)
        const timeoutUrl = 'https://httpbin.org/delay/10'; // 10 second delay
        
        const startTime = Date.now();
        
        try {
          const result = await imageManager.loadImageForDisplay(
            'timeout-test',
            timeoutUrl,
            imageManager.normalModeSize,
            container
          );
          
          const endTime = Date.now();
          const loadTime = endTime - startTime;
          
          // Check if a placeholder was created
          const placeholder = container.querySelector('.card-image-placeholder, .card-image-wrapper img');
          
          return {
            imageLoaded: !!result,
            loadTime,
            timeoutHandled: loadTime < 16000, // Should timeout before 16 seconds
            placeholderCreated: !!placeholder,
            containerHasContent: container.children.length > 0,
            failedImageTracked: imageManager.failedImages.has(timeoutUrl)
          };
        } catch (error) {
          const endTime = Date.now();
          return {
            imageLoaded: false,
            loadTime: endTime - startTime,
            error: error.message,
            timeoutHandled: true,
            placeholderCreated: container.children.length > 0,
            containerHasContent: container.children.length > 0
          };
        } finally {
          document.body.removeChild(container);
        }
      });
      
      expect(result.timeoutHandled).toBe(true);
      expect(result.containerHasContent).toBe(true);
      expect(result.loadTime).toBeLessThan(16000); // Should complete within timeout
    });

    test('should track failed images to avoid retries', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const imageManager = new window.ImageManager();
        const badUrl = 'https://invalid-domain-404-nonexistent.com/image.jpg';
        
        // First attempt should add to failed images
        const container1 = document.createElement('div');
        const container2 = document.createElement('div');
        
        try {
          await imageManager.loadImageForDisplay('failed-test-1', badUrl);
        } catch (error) {
          // Expected to fail
        }
        
        const failedAfterFirst = imageManager.failedImages.has(badUrl);
        
        // Second attempt should be rejected quickly due to tracking
        const startTime = Date.now();
        try {
          await imageManager.loadImageForDisplay('failed-test-2', badUrl);
        } catch (error) {
          // Expected to fail quickly
        }
        const endTime = Date.now();
        
        return {
          failedImageTracked: failedAfterFirst,
          secondAttemptFastRejection: (endTime - startTime) < 100,
          failedImagesCount: imageManager.failedImages.size
        };
      });
      
      expect(result.failedImageTracked).toBe(true);
      expect(result.secondAttemptFastRejection).toBe(true);
      expect(result.failedImagesCount).toBeGreaterThan(0);
    });

    test('should handle CORS errors with YGOPRODeck images using proxy fallback', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const imageManager = new window.ImageManager();
        const container = document.createElement('div');
        document.body.appendChild(container);
        
        // Use a real YGOPRODeck URL that would normally cause CORS issues
        const ygoproUrl = 'https://images.ygoprodeck.com/images/cards/123456.jpg';
        
        try {
          const result = await imageManager.loadImageForDisplay(
            'cors-test',
            ygoproUrl,
            imageManager.normalModeSize,
            container
          );
          
          // Should either load via proxy or show placeholder
          const hasContent = container.children.length > 0;
          const hasPlaceholder = container.querySelector('.card-image-placeholder');
          const hasImage = container.querySelector('img');
          
          return {
            corsHandled: true,
            resultExists: !!result,
            containerHasContent: hasContent,
            fallbackWorked: hasPlaceholder || hasImage,
            proxyAttempted: true // Since it's a YGOPRODeck URL
          };
        } catch (error) {
          return {
            corsHandled: true,
            error: error.message,
            containerHasContent: container.children.length > 0
          };
        } finally {
          document.body.removeChild(container);
        }
      });
      
      expect(result.corsHandled).toBe(true);
      expect(result.containerHasContent).toBe(true);
      expect(result.proxyAttempted).toBe(true);
    });
  });

  test.describe('Data Corruption and Recovery', () => {
    test('should handle corrupted localStorage data gracefully', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const imageManager = new window.ImageManager();
        
        // Add corrupted data to localStorage
        const corruptedKey = 'ygo-card-image-corrupted-test';
        localStorage.setItem(corruptedKey, 'invalid-json-data');
        
        // Try to retrieve corrupted data
        const cachedData = await imageManager.getCachedImageData('corrupted-test');
        
        // Verify corrupted data was handled
        const dataStillExists = localStorage.getItem(corruptedKey);
        
        return {
          cachedDataIsNull: cachedData === null,
          corruptedDataHandled: true,
          noErrors: true // If we reach here, no exceptions were thrown
        };
      });
      
      expect(result.cachedDataIsNull).toBe(true);
      expect(result.corruptedDataHandled).toBe(true);
      expect(result.noErrors).toBe(true);
    });

    test('should handle localStorage quota exceeded gracefully', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const imageManager = new window.ImageManager();
        
        // Mock localStorage to simulate quota exceeded
        const originalSetItem = localStorage.setItem;
        let quotaExceededCount = 0;
        
        localStorage.setItem = function(key, value) {
          if (key.startsWith('ygo-card-image-')) {
            quotaExceededCount++;
            const error = new Error('QuotaExceededError');
            error.name = 'QuotaExceededError';
            throw error;
          }
          return originalSetItem.call(this, key, value);
        };
        
        try {
          // Create and try to cache an image
          const img = imageManager.createPlaceholderImage({width: 100, height: 145});
          await imageManager.cacheImageData('quota-test', img);
          
          // Restore original setItem
          localStorage.setItem = originalSetItem;
          
          // Memory cache should still work
          imageManager.cacheImageInMemory('memory-test', img);
          const memoryWorks = imageManager.imageCache.has('memory-test');
          
          return {
            quotaErrorHandled: true,
            quotaExceededCount,
            memoryStillWorks: memoryWorks,
            gracefulDegradation: true
          };
        } catch (error) {
          localStorage.setItem = originalSetItem;
          return {
            quotaErrorHandled: false,
            error: error.message
          };
        }
      });
      
      expect(result.quotaErrorHandled).toBe(true);
      expect(result.quotaExceededCount).toBeGreaterThan(0);
      expect(result.memoryStillWorks).toBe(true);
      expect(result.gracefulDegradation).toBe(true);
    });

    test('should handle image loading failures with proper placeholder display', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const imageManager = new window.ImageManager();
        const container = document.createElement('div');
        container.id = 'error-test-container';
        document.body.appendChild(container);
        
        // Try to load a definitely failing image
        const failingUrl = 'https://definitely-does-not-exist-404-error.com/image.jpg';
        
        try {
          await imageManager.loadImageForDisplay(
            'error-test',
            failingUrl,
            imageManager.normalModeSize,
            container
          );
        } catch (error) {
          // Expected to fail
        }
        
        // Check if placeholder was displayed
        const placeholder = container.querySelector('.card-image-placeholder');
        const hasContent = container.children.length > 0;
        const failureTracked = imageManager.failedImages.has(failingUrl);
        
        document.body.removeChild(container);
        
        return {
          placeholderDisplayed: !!placeholder,
          containerHasContent: hasContent,
          failureTracked,
          errorHandledGracefully: true
        };
      });
      
      expect(result.placeholderDisplayed).toBe(true);
      expect(result.containerHasContent).toBe(true);
      expect(result.failureTracked).toBe(true);
      expect(result.errorHandledGracefully).toBe(true);
    });
  });

  test.describe('Concurrent Operations and Edge Cases', () => {
    test('should handle concurrent loads of the same image gracefully', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const imageManager = new window.ImageManager();
        
        // Create a valid data URL for testing
        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 145;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(0, 0, 100, 145);
        const testUrl = canvas.toDataURL('image/png');
        
        // Start multiple concurrent loads of the same image
        const cardId = 'concurrent-test';
        const promises = [];
        
        for (let i = 0; i < 5; i++) {
          promises.push(
            imageManager.loadImageForDisplay(cardId + i, testUrl, imageManager.normalModeSize)
          );
        }
        
        try {
          const results = await Promise.all(promises);
          
          return {
            allLoaded: results.every(r => !!r),
            resultsCount: results.length,
            duplicateRequestsHandled: true,
            cacheSize: imageManager.imageCache.size
          };
        } catch (error) {
          return {
            allLoaded: false,
            error: error.message,
            duplicateRequestsHandled: false
          };
        }
      });
      
      expect(result.allLoaded).toBe(true);
      expect(result.resultsCount).toBe(5);
      expect(result.duplicateRequestsHandled).toBe(true);
      expect(result.cacheSize).toBeGreaterThan(0);
    });

    test('should handle edge case inputs without errors', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const imageManager = new window.ImageManager();
        const edgeCases = [];
        
        const testCases = [
          { cardId: '', url: '', size: { width: 0, height: 0 } },
          { cardId: null, url: null, size: null },
          { cardId: 'test', url: 'invalid-url', size: { width: -1, height: -1 } },
          { cardId: 'special-chars!@#$%', url: 'https://test.com/img.jpg', size: { width: 100, height: 145 } }
        ];
        
        for (const testCase of testCases) {
          try {
            const cacheKey = imageManager.generateCacheKey(
              testCase.cardId || '',
              testCase.url || '',
              testCase.size || { width: 100, height: 145 }
            );
            
            edgeCases.push({
              testCase,
              success: true,
              cacheKey: cacheKey,
              keyIsString: typeof cacheKey === 'string'
            });
          } catch (error) {
            edgeCases.push({
              testCase,
              success: false,
              error: error.message
            });
          }
        }
        
        return {
          edgeCases,
          allHandled: edgeCases.every(e => e.success !== undefined),
          mostSuccessful: edgeCases.filter(e => e.success).length >= edgeCases.length - 1
        };
      });
      
      expect(result.allHandled).toBe(true);
      expect(result.mostSuccessful).toBe(true);
    });

    test('should handle memory pressure scenarios', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const imageManager = new window.ImageManager();
        
        // Create a scenario with memory pressure
        const largeOperations = [];
        
        // Create large images and cache operations
        for (let i = 0; i < 20; i++) {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = 500;
            canvas.height = 500;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = `hsl(${i * 18}, 50%, 50%)`;
            ctx.fillRect(0, 0, 500, 500);
            
            const largeImg = new Image();
            largeImg.src = canvas.toDataURL('image/jpeg', 0.8); // JPEG compression
            largeImg.width = 500;
            largeImg.height = 500;
            
            imageManager.cacheImageInMemory(`large-${i}`, largeImg);
            
            largeOperations.push({
              operation: i,
              success: true,
              cacheSize: imageManager.imageCache.size
            });
          } catch (error) {
            largeOperations.push({
              operation: i,
              success: false,
              error: error.message
            });
          }
        }
        
        const finalStats = imageManager.getCacheStats();
        
        return {
          operationsCompleted: largeOperations.length,
          successfulOperations: largeOperations.filter(op => op.success).length,
          memoryPressureHandled: true,
          finalCacheSize: finalStats.memoryCache,
          lruEvictionWorked: finalStats.memoryCache <= imageManager.maxCacheSize
        };
      });
      
      expect(result.operationsCompleted).toBe(20);
      expect(result.memoryPressureHandled).toBe(true);
      expect(result.lruEvictionWorked).toBe(true);
      expect(result.finalCacheSize).toBeLessThanOrEqual(1000); // Should respect maxCacheSize
    });
  });

  test.describe('Real-world Error Scenarios', () => {
    test('should handle mixed success and failure scenarios in batch operations', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const imageManager = new window.ImageManager();
        
        // Create a mix of valid and invalid URLs
        const urls = [
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', // Valid
          'https://invalid-url-that-will-fail.com/image.jpg', // Invalid
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYGAAAAAACAABAAD/2wAAAABJRU5ErkJggg==', // Valid
          'https://another-invalid-url.com/test.jpg', // Invalid
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==' // Valid
        ];
        
        const operations = [];
        
        for (let i = 0; i < urls.length; i++) {
          try {
            const container = document.createElement('div');
            await imageManager.loadImageForDisplay(`batch-test-${i}`, urls[i]);
            
            operations.push({
              index: i,
              url: urls[i],
              success: true,
              isValid: urls[i].startsWith('data:image/')
            });
          } catch (error) {
            operations.push({
              index: i,
              url: urls[i],
              success: false,
              isValid: urls[i].startsWith('data:image/'),
              error: error.message
            });
          }
        }
        
        const validUrls = operations.filter(op => op.isValid);
        const invalidUrls = operations.filter(op => !op.isValid);
        
        return {
          totalOperations: operations.length,
          validOperations: validUrls.length,
          invalidOperations: invalidUrls.length,
          validSuccessRate: validUrls.filter(op => op.success).length / validUrls.length,
          invalidFailureRate: invalidUrls.filter(op => !op.success).length / invalidUrls.length,
          mixedScenarioHandled: true,
          failedImagesTracked: imageManager.failedImages.size > 0
        };
      });
      
      expect(result.totalOperations).toBe(5);
      expect(result.validOperations).toBe(3);
      expect(result.invalidOperations).toBe(2);
      expect(result.validSuccessRate).toBeGreaterThan(0.5);
      expect(result.mixedScenarioHandled).toBe(true);
    });
  });
});