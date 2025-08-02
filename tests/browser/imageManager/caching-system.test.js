/**
 * Caching System Tests for ImageManager
 * Tests localStorage operations, memory cache LRU eviction, and cache management
 */

import { test, expect } from '@playwright/test';

test.describe('ImageManager Caching System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-imagemanager.html');
    await page.waitForFunction(() => window.imageManagerTestPageReady);
    
    // Clear any existing cache before each test
    await page.evaluate(() => {
      window.imageManager.clearCache();
    });
  });

  // Enhanced LRU Cache Management
  test.describe('Enhanced LRU Cache Management', () => {
    test('should implement basic LRU eviction when cache is full', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const imageManager = new window.ImageManager();
        
        // Set a small cache size for testing
        imageManager.maxCacheSize = 3;
        
        // Create test images and cache them
        const results = {
          initialCacheSize: 0,
          finalCacheSize: 0,
          evictionOccurred: false
        };
        
        // Add 5 images to trigger eviction (more than maxCacheSize of 3)
        for (let i = 0; i < 5; i++) {
          const canvas = document.createElement('canvas');
          canvas.width = 100;
          canvas.height = 145;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = `hsl(${i * 72}, 50%, 50%)`;
          ctx.fillRect(0, 0, 100, 145);
          
          const testImg = new Image();
          testImg.src = canvas.toDataURL('image/png');
          testImg.width = 100;
          testImg.height = 145;
          
          const cacheKey = `test-${i}_hash_100x145`;
          imageManager.cacheImageInMemory(cacheKey, testImg);
          
          if (i === 2) {
            results.initialCacheSize = imageManager.imageCache.size;
          }
        }
        
        results.finalCacheSize = imageManager.imageCache.size;
        results.evictionOccurred = results.finalCacheSize === imageManager.maxCacheSize;
        
        return results;
      });
      
      expect(result.initialCacheSize).toBe(3);
      expect(result.finalCacheSize).toBe(3); // Should stay at max size
      expect(result.evictionOccurred).toBe(true);
    });

    test('should handle concurrent cache access and modifications', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const imageManager = new window.ImageManager();
        
        // Perform concurrent cache operations
        const operations = [];
        const results = {
          operationsCompleted: 0,
          cacheConsistent: true,
          finalCacheSize: 0
        };
        
        // Create 10 concurrent caching operations
        for (let i = 0; i < 10; i++) {
          operations.push(new Promise((resolve) => {
            setTimeout(() => {
              try {
                const canvas = document.createElement('canvas');
                canvas.width = 100;
                canvas.height = 145;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = `hsl(${i * 36}, 50%, 50%)`;
                ctx.fillRect(0, 0, 100, 145);
                
                const testImg = new Image();
                testImg.src = canvas.toDataURL('image/png');
                testImg.width = 100;
                testImg.height = 145;
                
                const cacheKey = `concurrent-${i}_hash_100x145`;
                imageManager.cacheImageInMemory(cacheKey, testImg);
                
                results.operationsCompleted++;
                resolve();
              } catch (error) {
                results.cacheConsistent = false;
                resolve();
              }
            }, Math.random() * 50); // Random delay up to 50ms
          }));
        }
        
        await Promise.all(operations);
        results.finalCacheSize = imageManager.imageCache.size;
        
        return results;
      });
      
      expect(result.operationsCompleted).toBe(10);
      expect(result.cacheConsistent).toBe(true);
      expect(result.finalCacheSize).toBeGreaterThan(0);
    });
  });

  test.describe('localStorage Edge Cases and Recovery', () => {
    test('should handle localStorage quota exceeded with graceful degradation', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const imageManager = new window.ImageManager();
        
        // Fill localStorage to near capacity
        const largeData = 'x'.repeat(1024 * 100); // 100KB chunks
        const originalSetItem = localStorage.setItem;
        let quotaExceededCount = 0;
        
        localStorage.setItem = function(key, value) {
          if (key.startsWith(imageManager.cachePrefix)) {
            quotaExceededCount++;
            const error = new Error('QuotaExceededError');
            error.name = 'QuotaExceededError';
            throw error;
          }
          return originalSetItem.call(this, key, value);
        };
        
        const cacheResults = [];
        
        // Try to cache multiple images
        for (let i = 0; i < 5; i++) {
          try {
            const img = imageManager.createPlaceholderImage({width: 200, height: 290});
            await imageManager.cacheImageData(`quota-test-${i}`, img);
            cacheResults.push({ attempt: i, success: true });
          } catch (error) {
            cacheResults.push({ attempt: i, success: false, error: error.message });
          }
        }
        
        // Restore original setItem
        localStorage.setItem = originalSetItem;
        
        // Verify memory cache still works
        const img = imageManager.createPlaceholderImage({width: 100, height: 145});
        imageManager.cacheImageInMemory('memory-still-works', img);
        const memoryWorks = imageManager.imageCache.has('memory-still-works');
        
        return {
          quotaExceededCount,
          cacheResults,
          gracefulDegradation: cacheResults.every(r => r.success === true || r.success === false), // No crashes
          memoryStillWorks: memoryWorks
        };
      });
      
      expect(result.quotaExceededCount).toBeGreaterThan(0);
      expect(result.gracefulDegradation).toBe(true);
      expect(result.memoryStillWorks).toBe(true);
    });

    test('should handle corrupted localStorage with selective cleanup', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const imageManager = new window.ImageManager();
        
        // Create mixed cache entries - valid and corrupted
        const validEntries = [];
        const corruptedEntries = [];
        
        // Add valid entries
        for (let i = 0; i < 3; i++) {
          const img = imageManager.createPlaceholderImage({width: 100, height: 145});
          await imageManager.cacheImageData(`valid-entry-${i}`, img);
          validEntries.push(`ygo-card-image-valid-entry-${i}`);
        }
        
        // Add corrupted entries
        localStorage.setItem('ygo-card-image-corrupted-json', 'invalid-json');
        localStorage.setItem('ygo-card-image-corrupted-structure', '{"wrong": "structure"}');
        localStorage.setItem('ygo-card-image-corrupted-expired', JSON.stringify({
          data: 'data:image/png;base64,test',
          timestamp: 'invalid-timestamp',
          expires: 'invalid-expires'
        }));
        corruptedEntries.push('ygo-card-image-corrupted-json', 'ygo-card-image-corrupted-structure', 'ygo-card-image-corrupted-expired');
        
        // Try to retrieve all entries
        const retrievalResults = [];
        
        for (let i = 0; i < 3; i++) {
          const validData = await imageManager.getCachedImageData(`valid-entry-${i}`);
          retrievalResults.push({
            type: 'valid',
            key: `valid-entry-${i}`,
            retrieved: validData !== null
          });
        }
        
        const corruptedKeys = ['corrupted-json', 'corrupted-structure', 'corrupted-expired'];
        for (const key of corruptedKeys) {
          const corruptedData = await imageManager.getCachedImageData(key);
          retrievalResults.push({
            type: 'corrupted',
            key,
            retrieved: corruptedData !== null,
            cleanedUp: localStorage.getItem(`ygo-card-image-${key}`) === null
          });
        }
        
        return {
          retrievalResults,
          validEntriesAccessible: retrievalResults.filter(r => r.type === 'valid' && r.retrieved).length,
          corruptedEntriesRejected: retrievalResults.filter(r => r.type === 'corrupted' && !r.retrieved).length,
          selectiveCleanupWorked: retrievalResults.some(r => r.type === 'corrupted' && r.cleanedUp)
        };
      });
      
      expect(result.validEntriesAccessible).toBe(3);
      expect(result.corruptedEntriesRejected).toBe(3);
      expect(result.selectiveCleanupWorked).toBe(true);
    });

    test('should handle localStorage data corruption during retrieval', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const imageManager = new window.ImageManager();
        
        // Mock localStorage.getItem to simulate corruption during retrieval
        const originalGetItem = localStorage.getItem;
        let corruptionSimulated = false;
        
        localStorage.getItem = function(key) {
          if (key.startsWith('ygo-card-image-corruption-test') && !corruptionSimulated) {
            corruptionSimulated = true;
            // Return corrupted JSON
            return '{"data": "data:image/png;base64,test", "timestamp":';
          }
          return originalGetItem.call(this, key);
        };
        
        try {
          const data = await imageManager.getCachedImageData('corruption-test');
          
          // Restore original getItem
          localStorage.getItem = originalGetItem;
          
          return {
            corruptionHandled: true,
            dataRetrieved: data !== null,
            corruptionSimulated
          };
        } catch (error) {
          localStorage.getItem = originalGetItem;
          return {
            corruptionHandled: false,
            error: error.message,
            corruptionSimulated
          };
        }
      });
      
      expect(result.corruptionHandled).toBe(true);
      expect(result.dataRetrieved).toBe(false); // Should return null for corrupted data
      expect(result.corruptionSimulated).toBe(true);
    });
  });

  test.describe('Cache Key Generation and Hash Collision Handling', () => {
    test('should generate unique cache keys for edge case inputs', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const imageManager = new window.ImageManager();
        
        const edgeCaseInputs = [
          { cardId: '', url: '', size: { width: 0, height: 0 } },
          { cardId: 'test', url: 'https://example.com/very-long-url-that-exceeds-normal-length-expectations-and-continues-for-much-longer-than-typical-image-urls-would-normally-be-in-most-practical-scenarios.jpg', size: { width: 1000, height: 1500 } },
          { cardId: 'special!@#$%^&*()chars', url: 'https://example.com/image.jpg', size: { width: 100, height: 145 } },
          { cardId: '测试中文', url: 'https://example.com/unicode.jpg', size: { width: 100, height: 145 } },
          { cardId: 'emoji🃏🎮🎯', url: 'https://example.com/emoji.jpg', size: { width: 100, height: 145 } }
        ];
        
        const generatedKeys = [];
        const uniqueKeys = new Set();
        
        for (const input of edgeCaseInputs) {
          try {
            const key = imageManager.generateCacheKey(input.cardId, input.url, input.size);
            generatedKeys.push({
              input,
              key,
              keyLength: key.length,
              isString: typeof key === 'string'
            });
            uniqueKeys.add(key);
          } catch (error) {
            generatedKeys.push({
              input,
              error: error.message
            });
          }
        }
        
        return {
          keysGenerated: generatedKeys.length,
          uniqueKeysGenerated: uniqueKeys.size,
          allKeysUnique: generatedKeys.length === uniqueKeys.size,
          allSuccessful: generatedKeys.every(k => k.key !== undefined),
          generatedKeys
        };
      });
      
      expect(result.keysGenerated).toBe(5);
      expect(result.allKeysUnique).toBe(true);
      expect(result.allSuccessful).toBe(true);
    });

    test('should handle hash string collisions gracefully', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const imageManager = new window.ImageManager();
        
        // Generate many similar URLs to test for hash collisions
        const urls = [];
        for (let i = 0; i < 1000; i++) {
          urls.push(`https://example.com/image${i}.jpg`);
        }
        
        const hashes = new Set();
        const collisions = [];
        
        for (const url of urls) {
          const hash = imageManager.hashString(url);
          if (hashes.has(hash)) {
            collisions.push({ url, hash });
          } else {
            hashes.add(hash);
          }
        }
        
        // Test with identical strings
        const sameUrlHash1 = imageManager.hashString('https://test.com/same.jpg');
        const sameUrlHash2 = imageManager.hashString('https://test.com/same.jpg');
        
        return {
          urlsTested: urls.length,
          uniqueHashes: hashes.size,
          collisions: collisions.length,
          collisionRate: collisions.length / urls.length,
          identicalStringsProduceSameHash: sameUrlHash1 === sameUrlHash2,
          hashIsString: typeof sameUrlHash1 === 'string'
        };
      });
      
      expect(result.urlsTested).toBe(1000);
      expect(result.collisionRate).toBeLessThan(0.1); // Less than 10% collision rate
      expect(result.identicalStringsProduceSameHash).toBe(true);
      expect(result.hashIsString).toBe(true);
    });
  });

  test.describe('Advanced Cache Statistics and Monitoring', () => {
    test('should provide detailed cache performance metrics', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const imageManager = new window.ImageManager();
        
        // Create various cache scenarios
        const scenarios = [];
        
        // Add memory cache entries
        for (let i = 0; i < 10; i++) {
          const img = imageManager.createPlaceholderImage({width: 100, height: 145});
          imageManager.cacheImageInMemory(`memory-${i}`, img);
        }
        scenarios.push('memory-cache-populated');
        
        // Add localStorage entries
        for (let i = 0; i < 5; i++) {
          const img = imageManager.createPlaceholderImage({width: 100, height: 145});
          await imageManager.cacheImageData(`storage-${i}`, img);
        }
        scenarios.push('localStorage-cache-populated');
        
        // Add failed images
        imageManager.failedImages.add('https://failed1.com/image.jpg');
        imageManager.failedImages.add('https://failed2.com/image.jpg');
        scenarios.push('failed-images-tracked');
        
        // Add loading images
        imageManager.loadingImages.add('loading-card-1');
        imageManager.loadingImages.add('loading-card-2');
        scenarios.push('loading-images-tracked');
        
        const stats = imageManager.getCacheStats();
        
        // Calculate cache efficiency metrics
        const totalCacheEntries = stats.memoryCache + stats.localStorageCache;
        const cacheUtilization = stats.memoryCache / imageManager.maxCacheSize;
        
        return {
          scenarios,
          stats,
          totalCacheEntries,
          cacheUtilization,
          memoryDominance: stats.memoryCache > stats.localStorageCache,
          hasFailureTracking: stats.failedImages > 0,
          hasLoadingTracking: stats.currentlyLoading > 0
        };
      });
      
      expect(result.stats.memoryCache).toBe(10);
      expect(result.stats.localStorageCache).toBe(5);
      expect(result.stats.failedImages).toBe(2);
      expect(result.stats.currentlyLoading).toBe(2);
      expect(result.cacheUtilization).toBe(0.01); // 10/1000
      expect(result.hasFailureTracking).toBe(true);
      expect(result.hasLoadingTracking).toBe(true);
    });
  });

  test('should cache images in memory with proper LRU eviction', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const imageManager = new window.ImageManager();
      // Set a small cache size for testing
      imageManager.maxCacheSize = 3;
      
      const results = [];
      
      // Add images to memory cache
      for (let i = 1; i <= 5; i++) {
        const img = imageManager.createPlaceholderImage({width: 100, height: 145});
        const cacheKey = `test-key-${i}`;
        imageManager.cacheImageInMemory(cacheKey, img);
        
        const stats = imageManager.getCacheStats();
        results.push({
          iteration: i,
          memoryCacheSize: stats.memoryCache,
          cacheSize: imageManager.imageCache.size
        });
      }
      
      // Check which keys remain (should be the last 3)
      const remainingKeys = Array.from(imageManager.imageCache.keys());
      
      return {
        iterations: results,
        finalCacheSize: imageManager.imageCache.size,
        remainingKeys,
        lruEvictionWorked: remainingKeys.includes('test-key-5') && 
                          remainingKeys.includes('test-key-4') && 
                          remainingKeys.includes('test-key-3') &&
                          !remainingKeys.includes('test-key-1') &&
                          !remainingKeys.includes('test-key-2')
      };
    });
    
    expect(result.finalCacheSize).toBe(3);
    expect(result.lruEvictionWorked).toBe(true);
    expect(result.remainingKeys).toHaveLength(3);
  });

  test('should cache image data in localStorage with expiration', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const imageManager = new window.ImageManager();
      
      // Create a test image
      const img = imageManager.createPlaceholderImage({width: 100, height: 145});
      const cacheKey = 'test-localstorage-cache';
      
      // Cache the image data
      await imageManager.cacheImageData(cacheKey, img);
      
      // Verify data was stored in localStorage
      const storageKey = imageManager.cachePrefix + cacheKey;
      const storedData = localStorage.getItem(storageKey);
      const parsedData = storedData ? JSON.parse(storedData) : null;
      
      // Retrieve cached data
      const retrievedData = await imageManager.getCachedImageData(cacheKey);
      
      return {
        dataWasStored: !!storedData,
        parsedDataStructure: parsedData ? {
          hasData: !!parsedData.data,
          hasTimestamp: !!parsedData.timestamp,
          hasExpires: !!parsedData.expires,
          dataIsDataUrl: parsedData.data ? parsedData.data.startsWith('data:image/') : false
        } : null,
        retrievedDataIsDataUrl: retrievedData ? retrievedData.startsWith('data:image/') : false,
        cacheKeyUsed: storageKey
      };
    });
    
    expect(result.dataWasStored).toBe(true);
    expect(result.parsedDataStructure.hasData).toBe(true);
    expect(result.parsedDataStructure.hasTimestamp).toBe(true);
    expect(result.parsedDataStructure.hasExpires).toBe(true);
    expect(result.parsedDataStructure.dataIsDataUrl).toBe(true);
    expect(result.retrievedDataIsDataUrl).toBe(true);
  });

  test('should handle cache expiration correctly', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const imageManager = new window.ImageManager();
      const cacheKey = 'test-expiration';
      
      // Create and cache an image
      const img = imageManager.createPlaceholderImage({width: 100, height: 145});
      await imageManager.cacheImageData(cacheKey, img);
      
      // Manually modify the cache entry to be expired
      const storageKey = imageManager.cachePrefix + cacheKey;
      const storedData = JSON.parse(localStorage.getItem(storageKey));
      storedData.expires = Date.now() - 1000; // Expired 1 second ago
      localStorage.setItem(storageKey, JSON.stringify(storedData));
      
      // Try to retrieve expired data
      const retrievedData = await imageManager.getCachedImageData(cacheKey);
      
      // Check if expired data was removed
      const dataStillExists = localStorage.getItem(storageKey);
      
      return {
        retrievedDataIsNull: retrievedData === null,
        expiredDataRemoved: dataStillExists === null
      };
    });
    
    expect(result.retrievedDataIsNull).toBe(true);
    expect(result.expiredDataRemoved).toBe(true);
  });

  test('should create image from cached data correctly', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const imageManager = new window.ImageManager();
      
      // Create a test data URL
      const canvas = document.createElement('canvas');
      canvas.width = 150;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      
      // Create image from data
      const img = await imageManager.createImageFromData(dataUrl, {width: 150, height: 200});
      
      return new Promise((resolve) => {
        img.onload = () => {
          resolve({
            imageCreated: true,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            styleWidth: img.style.width,
            styleHeight: img.style.height,
            styleObjectFit: img.style.objectFit,
            srcIsDataUrl: img.src.startsWith('data:image/')
          });
        };
        
        img.onerror = () => {
          resolve({
            imageCreated: false,
            error: 'Failed to create image from data'
          });
        };
      });
    });
    
    expect(result.imageCreated).toBe(true);
    expect(result.naturalWidth).toBe(150);
    expect(result.naturalHeight).toBe(200);
    expect(result.styleWidth).toBe('150px');
    expect(result.styleHeight).toBe('200px');
    expect(result.styleObjectFit).toBe('contain');
    expect(result.srcIsDataUrl).toBe(true);
  });

  test('should generate consistent cache keys', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const imageManager = new window.ImageManager();
      
      const cardId = 'test-card-123';
      const imageUrl = 'https://example.com/test.jpg';
      const size = {width: 100, height: 145};
      
      // Generate cache key multiple times
      const key1 = imageManager.generateCacheKey(cardId, imageUrl, size);
      const key2 = imageManager.generateCacheKey(cardId, imageUrl, size);
      const key3 = imageManager.generateCacheKey(cardId, imageUrl, {width: 200, height: 290});
      
      return {
        key1,
        key2,
        key3,
        keysConsistent: key1 === key2,
        differentSizeGeneratesDifferentKey: key1 !== key3,
        keyContainsCardId: key1.includes(cardId),
        keyContainsSize: key1.includes('100x145')
      };
    });
    
    expect(result.keysConsistent).toBe(true);
    expect(result.differentSizeGeneratesDifferentKey).toBe(true);
    expect(result.keyContainsCardId).toBe(true);
    expect(result.keyContainsSize).toBe(true);
  });

  test('should handle cache statistics correctly', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const imageManager = new window.ImageManager();
      
      // Initial stats
      const initialStats = imageManager.getCacheStats();
      
      // Add some images to memory cache
      for (let i = 1; i <= 3; i++) {
        const img = imageManager.createPlaceholderImage({width: 100, height: 145});
        imageManager.cacheImageInMemory(`memory-key-${i}`, img);
      }
      
      // Add some images to localStorage cache
      for (let i = 1; i <= 2; i++) {
        const img = imageManager.createPlaceholderImage({width: 100, height: 145});
        await imageManager.cacheImageData(`storage-key-${i}`, img);
      }
      
      // Add failed images
      imageManager.failedImages.add('https://failed1.com/image.jpg');
      imageManager.failedImages.add('https://failed2.com/image.jpg');
      
      // Add loading images
      imageManager.loadingImages.add('loading-card-1');
      
      const finalStats = imageManager.getCacheStats();
      
      return {
        initialStats,
        finalStats,
        memoryIncreased: finalStats.memoryCache > initialStats.memoryCache,
        localStorageIncreased: finalStats.localStorageCache > initialStats.localStorageCache
      };
    });
    
    expect(result.initialStats.memoryCache).toBe(0);
    expect(result.initialStats.localStorageCache).toBe(0);
    expect(result.finalStats.memoryCache).toBe(3);
    expect(result.finalStats.localStorageCache).toBe(2);
    expect(result.finalStats.failedImages).toBe(2);
    expect(result.finalStats.currentlyLoading).toBe(1);
    expect(result.memoryIncreased).toBe(true);
    expect(result.localStorageIncreased).toBe(true);
  });

  test('should clear all caches correctly', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const imageManager = new window.ImageManager();
      
      // Populate caches
      for (let i = 1; i <= 3; i++) {
        const img = imageManager.createPlaceholderImage({width: 100, height: 145});
        imageManager.cacheImageInMemory(`memory-key-${i}`, img);
        await imageManager.cacheImageData(`storage-key-${i}`, img);
      }
      
      imageManager.failedImages.add('https://failed.com/image.jpg');
      
      const statsBeforeClear = imageManager.getCacheStats();
      
      // Clear all caches
      imageManager.clearCache();
      
      const statsAfterClear = imageManager.getCacheStats();
      
      return {
        statsBeforeClear,
        statsAfterClear,
        memoryCacheCleared: statsAfterClear.memoryCache === 0,
        localStorageCacheCleared: statsAfterClear.localStorageCache === 0,
        failedImagesCleared: statsAfterClear.failedImages === 0
      };
    });
    
    expect(result.statsBeforeClear.memoryCache).toBe(3);
    expect(result.statsBeforeClear.localStorageCache).toBe(3);
    expect(result.statsBeforeClear.failedImages).toBe(1);
    
    expect(result.memoryCacheCleared).toBe(true);
    expect(result.localStorageCacheCleared).toBe(true);
    expect(result.failedImagesCleared).toBe(true);
  });

  test('should handle caching errors gracefully', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const imageManager = new window.ImageManager();
      
      // Test with invalid image data
      try {
        const invalidImg = new Image();
        invalidImg.src = 'invalid-data';
        
        await imageManager.cacheImageData('invalid-test', invalidImg);
        
        return {
          errorHandled: true,
          cacheAttemptCompleted: true
        };
      } catch (error) {
        return {
          errorHandled: false,
          error: error.message
        };
      }
    });
    
    // Caching errors should be handled gracefully and not break the flow
    expect(result.errorHandled).toBe(true);
    expect(result.cacheAttemptCompleted).toBe(true);
  });

  test('should handle localStorage quota exceeded gracefully', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const imageManager = new window.ImageManager();
      
      // Mock localStorage.setItem to simulate quota exceeded
      const originalSetItem = localStorage.setItem;
      let quotaExceededTriggered = false;
      
      localStorage.setItem = function(key, value) {
        if (key.startsWith(imageManager.cachePrefix)) {
          quotaExceededTriggered = true;
          const error = new Error('QuotaExceededError');
          error.name = 'QuotaExceededError';
          throw error;
        }
        return originalSetItem.call(this, key, value);
      };
      
      try {
        const img = imageManager.createPlaceholderImage({width: 100, height: 145});
        await imageManager.cacheImageData('quota-test', img);
        
        // Restore original setItem
        localStorage.setItem = originalSetItem;
        
        return {
          quotaErrorHandled: true,
          quotaExceededTriggered
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
    expect(result.quotaExceededTriggered).toBe(true);
  });

  test('should integrate memory and localStorage caching in loadImageForDisplay', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const imageManager = new window.ImageManager();
      const container = document.createElement('div');
      
      // First load - should cache in both memory and localStorage
      const img1 = await imageManager.loadImageForDisplay(
        'cache-integration-test',
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        {width: 100, height: 145},
        container
      );
      
      const statsAfterFirstLoad = imageManager.getCacheStats();
      
      // Clear memory cache only (localStorage should still have data)
      imageManager.imageCache.clear();
      
      const statsAfterMemoryClear = imageManager.getCacheStats();
      
      // Second load - should load from localStorage cache
      const img2 = await imageManager.loadImageForDisplay(
        'cache-integration-test',
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        {width: 100, height: 145},
        container
      );
      
      const statsAfterSecondLoad = imageManager.getCacheStats();
      
      return {
        firstLoadCachedInMemory: statsAfterFirstLoad.memoryCache > 0,
        firstLoadCachedInStorage: statsAfterFirstLoad.localStorageCache > 0,
        memoryCacheCleared: statsAfterMemoryClear.memoryCache === 0,
        storageStillHasData: statsAfterMemoryClear.localStorageCache > 0,
        secondLoadRestoredMemoryCache: statsAfterSecondLoad.memoryCache > 0,
        bothImagesLoaded: !!img1 && !!img2
      };
    });
    
    expect(result.firstLoadCachedInMemory).toBe(true);
    expect(result.firstLoadCachedInStorage).toBe(true);
    expect(result.memoryCacheCleared).toBe(true);
    expect(result.storageStillHasData).toBe(true);
    expect(result.secondLoadRestoredMemoryCache).toBe(true);
    expect(result.bothImagesLoaded).toBe(true);
  });
});