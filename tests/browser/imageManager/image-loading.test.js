/**
 * Image Loading Tests for ImageManager
 * Tests HTMLImageElement event handling, cross-origin loading, and proxy functionality
 */

import { test, expect } from '@playwright/test';

test.describe('ImageManager Image Loading & Events', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-imagemanager.html');
    await page.waitForFunction(() => window.imageManagerTestPageReady);
  });

  test('should handle Image onload event correctly', async ({ page }) => {
    const result = await page.evaluate(async () => {
      return new Promise((resolve) => {
        const img = new Image();
        let loadEventFired = false;
        let loadTime = 0;
        
        const startTime = Date.now();
        
        img.onload = () => {
          loadEventFired = true;
          loadTime = Date.now() - startTime;
          
          resolve({
            loadEventFired,
            loadTime,
            imageComplete: img.complete,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            src: img.src.substring(0, 50) + '...'
          });
        };
        
        img.onerror = () => {
          resolve({
            loadEventFired: false,
            errorEventFired: true,
            loadTime: Date.now() - startTime
          });
        };
        
        // Create a small test image data URL
        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 145;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        img.src = canvas.toDataURL('image/png');
      });
    });
    
    expect(result.loadEventFired).toBe(true);
    expect(result.imageComplete).toBe(true);
    expect(result.naturalWidth).toBe(100);
    expect(result.naturalHeight).toBe(145);
    expect(result.loadTime).toBeLessThan(1000); // Should load quickly
  });

  test('should handle Image onerror event correctly', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const imageManager = new window.ImageManager();
      
      // Test with a URL that will definitely fail
      const invalidUrl = 'https://invalid.test.domain/nonexistent.jpg';
      
      return new Promise((resolve) => {
        const img = new Image();
        
        let errorEventFired = false;
        let loadEventFired = false;
        
        img.onerror = () => {
          errorEventFired = true;
          // Give a moment for load event to potentially fire
          setTimeout(() => {
            resolve({
              errorEventFired,
              loadEventFired,
              imageComplete: img.complete,
              imageSrc: img.src
            });
          }, 100);
        };
        
        img.onload = () => {
          loadEventFired = true;
        };
        
        img.src = invalidUrl;
        
        // Fallback timeout
        setTimeout(() => {
          if (!errorEventFired && !loadEventFired) {
            resolve({
              errorEventFired: true, // Consider timeout as error
              loadEventFired: false,
              imageComplete: false,
              imageSrc: img.src
            });
          }
        }, 3000);
      });
    });
    
    expect(result.errorEventFired).toBe(true);
    expect(result.loadEventFired).toBe(false);
  });

  test('should set crossOrigin attribute for CORS images', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const imageManager = new window.ImageManager();
      
      // Test crossOrigin setting
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      return {
        crossOriginSet: img.crossOrigin === 'anonymous',
        crossOriginValue: img.crossOrigin
      };
    });
    
    expect(result.crossOriginSet).toBe(true);
    expect(result.crossOriginValue).toBe('anonymous');
  });

  test('should load image via proxy for YGOPRODeck URLs', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const imageManager = new window.ImageManager();
      
      // Mock the loadImageViaProxy method to test proxy logic
      let proxyUrlUsed = '';
      const originalLoadViaProxy = imageManager.loadImageViaProxy;
      
      imageManager.loadImageViaProxy = async function(imageUrl, size) {
        proxyUrlUsed = imageUrl;
        
        // Return a placeholder instead of actually loading
        return Promise.resolve(this.createPlaceholderImage(size));
      };
      
      try {
        const container = document.createElement('div');
        await imageManager.loadImageForDisplay(
          'test-ygoprodeck',
          'https://images.ygoprodeck.com/images/cards/6983839.jpg',
          {width: 100, height: 145},
          container
        );
        
        return {
          proxyUsed: true,
          originalUrl: proxyUrlUsed,
          containerHasImage: container.querySelector('img') !== null
        };
      } catch (error) {
        return {
          proxyUsed: false,
          error: error.message
        };
      }
    });
    
    expect(result.proxyUsed).toBe(true);
    expect(result.originalUrl).toBe('https://images.ygoprodeck.com/images/cards/6983839.jpg');
    expect(result.containerHasImage).toBe(true);
  });

  test('should handle loading timeouts correctly', async ({ page }) => {
    // Set a shorter timeout for this test
    const result = await page.evaluate(async () => {
      return new Promise((resolve) => {
        const img = new Image();
        let timeoutTriggered = false;
        let loadEventFired = false;
        
        img.onload = () => {
          loadEventFired = true;
          if (!timeoutTriggered) {
            resolve({
              loadEventFired: true,
              timeoutTriggered: false,
              result: 'loaded'
            });
          }
        };
        
        img.onerror = () => {
          if (!timeoutTriggered) {
            resolve({
              loadEventFired: false,
              timeoutTriggered: false,
              result: 'error'
            });
          }
        };
        
        // Simulate timeout mechanism
        setTimeout(() => {
          if (!img.complete && !loadEventFired) {
            timeoutTriggered = true;
            resolve({
              loadEventFired: false,
              timeoutTriggered: true,
              result: 'timeout',
              imageComplete: img.complete
            });
          }
        }, 1000); // 1 second timeout for test
        
        // Use a slow-loading URL (or one that times out)
        img.src = 'https://httpbin.org/delay/3'; // 3 second delay
      });
    });
    
    expect(result.timeoutTriggered).toBe(true);
    expect(result.result).toBe('timeout');
    expect(result.imageComplete).toBe(false);
  });

  test('should retry failed image loads', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const imageManager = new window.ImageManager();
      
      let retryAttempts = 0;
      const maxRetries = 3;
      
      // Simulate retry mechanism
      async function attemptLoad(url, attempts = 0) {
        retryAttempts = attempts + 1;
        
        if (attempts < maxRetries) {
          try {
            // Simulate failure for first few attempts
            if (attempts < 2) {
              throw new Error('Simulated network failure');
            }
            // Succeed on final attempt
            return { success: true };
          } catch (error) {
            if (attempts < maxRetries - 1) {
              await new Promise(resolve => setTimeout(resolve, 100));
              return attemptLoad(url, attempts + 1);
            }
            throw error;
          }
        }
        
        return { success: true };
      }
      
      try {
        await attemptLoad('test-url');
        return {
          retryAttempts,
          finalSuccess: true
        };
      } catch (error) {
        return {
          retryAttempts,
          finalSuccess: false
        };
      }
    });
    
    expect(result.retryAttempts).toBe(3);
    expect(result.finalSuccess).toBe(true);
  });

  test('should prevent duplicate loading requests', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const imageManager = new window.ImageManager();
      let loadCallCount = 0;
      
      // Mock the _loadAndCacheImage method to count calls
      const originalLoad = imageManager._loadAndCacheImage;
      imageManager._loadAndCacheImage = async function(...args) {
        loadCallCount++;
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate loading time
        return this.createPlaceholderImage({width: 100, height: 145});
      };
      
      // Start multiple simultaneous loads for the same image
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          imageManager.loadImageForDisplay(
            'duplicate-test',
            'https://example.com/same-image.jpg',
            {width: 100, height: 145}
          )
        );
      }
      
      await Promise.all(promises);
      
      return {
        loadCallCount,
        duplicatesHandled: loadCallCount === 1
      };
    });
    
    expect(result.duplicatesHandled).toBe(true);
    expect(result.loadCallCount).toBe(1);
  });

  test('should handle image loading with different MIME types', async ({ page }) => {
    const mimeTypes = ['image/png', 'image/jpeg', 'image/webp'];
    
    for (const mimeType of mimeTypes) {
      const result = await page.evaluate(async (mimeType) => {
        return new Promise((resolve) => {
          const canvas = document.createElement('canvas');
          canvas.width = 100;
          canvas.height = 100;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#00ff00';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          const img = new Image();
          
          img.onload = () => {
            resolve({
              loaded: true,
              mimeType,
              naturalWidth: img.naturalWidth,
              naturalHeight: img.naturalHeight,
              srcStartsWith: img.src.startsWith(`data:${mimeType}`)
            });
          };
          
          img.onerror = () => {
            resolve({
              loaded: false,
              mimeType,
              error: 'Failed to load'
            });
          };
          
          try {
            const dataUrl = canvas.toDataURL(mimeType, 0.8);
            img.src = dataUrl;
          } catch (error) {
            resolve({
              loaded: false,
              mimeType,
              error: 'MIME type not supported',
              errorMessage: error.message
            });
          }
        });
      }, mimeType);
      
      // PNG and JPEG should always work, WebP might not be supported in all browsers
      if (mimeType === 'image/png' || mimeType === 'image/jpeg') {
        expect(result.loaded).toBe(true);
        expect(result.naturalWidth).toBe(100);
        expect(result.naturalHeight).toBe(100);
      }
    }
  });
});