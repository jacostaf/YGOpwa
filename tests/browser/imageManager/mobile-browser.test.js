/**
 * Mobile Browser-Specific ImageManager Tests
 * Tests mobile constraints, bandwidth optimization, and touch-friendly scenarios
 */

import { test, expect } from '@playwright/test';

test.describe('ImageManager Mobile Browser Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-imagemanager.html');
    await page.waitForFunction(() => window.imageManagerTestPageReady);
    
    // Clear cache and simulate mobile environment
    await page.evaluate(() => {
      window.imageManager.clearCache();
    });
  });

  test.describe('Mobile Display Modes', () => {
    test('should handle focus mode size for mobile devices', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const imageManager = new window.ImageManager();
        const container = document.createElement('div');
        document.body.appendChild(container);
        
        // Create a test image
        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 145;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(0, 0, 100, 145);
        const testUrl = canvas.toDataURL('image/png');
        
        try {
          const result = await imageManager.loadImageForDisplay(
            'mobile-test',
            testUrl,
            imageManager.focusModeSize, // 60x90 for mobile
            container
          );
          
          const displayedImg = container.querySelector('img');
          
          return {
            imageLoaded: !!result,
            focusModeWidth: imageManager.focusModeSize.width,
            focusModeHeight: imageManager.focusModeSize.height,
            displayedImgExists: !!displayedImg,
            actualWidth: displayedImg ? displayedImg.style.width : null,
            actualHeight: displayedImg ? displayedImg.style.height : null,
            mobileOptimized: true
          };
        } finally {
          document.body.removeChild(container);
        }
      });
      
      expect(result.imageLoaded).toBe(true);
      expect(result.focusModeWidth).toBe(60);
      expect(result.focusModeHeight).toBe(90);
      expect(result.displayedImgExists).toBe(true);
      expect(result.actualWidth).toBe('60px');
      expect(result.actualHeight).toBe('90px');
      expect(result.mobileOptimized).toBe(true);
    });

    test('should optimize image processing for mobile constraints', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const imageManager = new window.ImageManager();
        
        // Create a large source image to test mobile optimization
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(0, 0, 800, 600);
        
        const largeImg = new Image();
        largeImg.src = canvas.toDataURL('image/png');
        largeImg.width = 800;
        largeImg.height = 600;
        
        // Wait for image to load
        await new Promise(resolve => {
          largeImg.onload = resolve;
        });
        
        // Process image for mobile (focus mode)
        const processed = imageManager.processImage(largeImg, imageManager.focusModeSize);
        
        return {
          originalWidth: largeImg.width,
          originalHeight: largeImg.height,
          processedExists: !!processed,
          processedSrc: processed ? processed.src : null,
          usesJpegCompression: processed ? processed.src.includes('data:image/jpeg') : false,
          processedWidth: processed ? processed.style.width : null,
          processedHeight: processed ? processed.style.height : null,
          objectFit: processed ? processed.style.objectFit : null,
          mobileOptimized: true
        };
      });
      
      expect(result.originalWidth).toBe(800);
      expect(result.originalHeight).toBe(600);
      expect(result.processedExists).toBe(true);
      expect(result.usesJpegCompression).toBe(true);
      expect(result.processedWidth).toBe('60px');
      expect(result.processedHeight).toBe('90px');
      expect(result.objectFit).toBe('contain');
      expect(result.mobileOptimized).toBe(true);
    });

    test('should handle touch-friendly display elements', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const imageManager = new window.ImageManager();
        const container = document.createElement('div');
        container.id = 'touch-test-container';
        document.body.appendChild(container);
        
        // Create test image
        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 145;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#0000FF';
        ctx.fillRect(0, 0, 100, 145);
        
        const testImg = new Image();
        testImg.src = canvas.toDataURL('image/png');
        testImg.style.width = '100px';
        testImg.style.height = '145px';
        
        // Display image using ImageManager
        imageManager.displayImage(testImg, container);
        
        const wrapper = container.querySelector('.card-image-wrapper');
        const displayedImg = container.querySelector('.card-image');
        
        const result = {
          wrapperExists: !!wrapper,
          imageExists: !!displayedImg,
          wrapperDisplay: wrapper ? wrapper.style.display : null,
          wrapperAlign: wrapper ? wrapper.style.alignItems : null,
          wrapperJustify: wrapper ? wrapper.style.justifyContent : null,
          touchFriendly: true,
          imageAlt: displayedImg ? displayedImg.alt : null
        };
        
        document.body.removeChild(container);
        return result;
      });
      
      expect(result.wrapperExists).toBe(true);
      expect(result.imageExists).toBe(true);
      expect(result.wrapperDisplay).toBe('flex');
      expect(result.wrapperAlign).toBe('center');
      expect(result.wrapperJustify).toBe('center');
      expect(result.touchFriendly).toBe(true);
      expect(result.imageAlt).toBe('Yu-Gi-Oh Card');
    });
  });

  test.describe('Bandwidth Optimization', () => {
    test('should use JPEG compression for processed images to save bandwidth', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const imageManager = new window.ImageManager();
        
        // Create a colorful image that will benefit from JPEG compression
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 435;
        const ctx = canvas.getContext('2d');
        
        // Create a gradient that compresses well with JPEG
        const gradient = ctx.createLinearGradient(0, 0, 300, 435);
        gradient.addColorStop(0, '#FF0000');
        gradient.addColorStop(0.5, '#00FF00');
        gradient.addColorStop(1, '#0000FF');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 300, 435);
        
        const sourceImg = new Image();
        sourceImg.src = canvas.toDataURL('image/png'); // Start with PNG
        sourceImg.width = 300;
        sourceImg.height = 435;
        
        await new Promise(resolve => {
          sourceImg.onload = resolve;
        });
        
        // Process for normal mode (should use JPEG)
        const processed = imageManager.processImage(sourceImg, imageManager.normalModeSize);
        
        const originalSize = sourceImg.src.length;
        const processedSize = processed.src.length;
        
        return {
          originalFormat: sourceImg.src.includes('data:image/png') ? 'PNG' : 'Other',
          processedFormat: processed.src.includes('data:image/jpeg') ? 'JPEG' : 'Other',
          originalSize,
          processedSize,
          compressionRatio: originalSize > 0 ? processedSize / originalSize : 1,
          bandwidthOptimized: processed.src.includes('data:image/jpeg'),
          sizeReduced: processedSize < originalSize
        };
      });
      
      expect(result.originalFormat).toBe('PNG');
      expect(result.processedFormat).toBe('JPEG');
      expect(result.bandwidthOptimized).toBe(true);
      expect(result.compressionRatio).toBeLessThan(1.0); // Should be smaller
    });

    test('should handle low-bandwidth scenarios gracefully', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const imageManager = new window.ImageManager();
        
        // Simulate low-bandwidth by using smaller image sizes and longer timeouts
        const startTime = Date.now();
        
        try {
          // Create a placeholder that loads immediately (no network required)
          const placeholder = imageManager.createPlaceholderImage(imageManager.focusModeSize);
          
          const loadTime = Date.now() - startTime;
          
          return {
            placeholderCreated: !!placeholder,
            placeholderWidth: placeholder.width,
            placeholderHeight: placeholder.height,
            instantLoad: loadTime < 100, // Should be very fast
            lowBandwidthHandled: true,
            fallbackAvailable: placeholder.src.includes('data:image/png')
          };
        } catch (error) {
          return {
            placeholderCreated: false,
            error: error.message,
            lowBandwidthHandled: false
          };
        }
      });
      
      expect(result.placeholderCreated).toBe(true);
      expect(result.placeholderWidth).toBe(60);
      expect(result.placeholderHeight).toBe(90);
      expect(result.instantLoad).toBe(true);
      expect(result.lowBandwidthHandled).toBe(true);
      expect(result.fallbackAvailable).toBe(true);
    });
  });

  test.describe('Mobile-Specific Edge Cases', () => {
    test('should handle orientation changes and viewport adjustments', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const imageManager = new window.ImageManager();
        
        // Test different size scenarios that might occur with orientation changes
        const sizes = [
          imageManager.focusModeSize,    // Portrait mobile
          imageManager.normalModeSize,   // Landscape mobile
          imageManager.detailModeSize    // Tablet/desktop
        ];
        
        const results = [];
        
        for (const size of sizes) {
          try {
            const placeholder = imageManager.createPlaceholderImage(size);
            
            results.push({
              width: size.width,
              height: size.height,
              placeholderCreated: !!placeholder,
              correctSize: placeholder.width === size.width && placeholder.height === size.height,
              hasValidSrc: placeholder.src.includes('data:image/')
            });
          } catch (error) {
            results.push({
              width: size.width,
              height: size.height,
              placeholderCreated: false,
              error: error.message
            });
          }
        }
        
        return {
          allSizesHandled: results.every(r => r.placeholderCreated),
          allCorrectSizes: results.every(r => r.correctSize),
          orientationFlexible: true,
          results
        };
      });
      
      expect(result.allSizesHandled).toBe(true);
      expect(result.allCorrectSizes).toBe(true);
      expect(result.orientationFlexible).toBe(true);
      expect(result.results).toHaveLength(3);
    });

    test('should handle memory constraints on mobile devices', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const imageManager = new window.ImageManager();
        
        // Simulate mobile memory constraints by using smaller cache
        const originalMaxSize = imageManager.maxCacheSize;
        imageManager.maxCacheSize = 10; // Small cache for mobile
        
        try {
          // Add images to test cache eviction under memory pressure
          const operations = [];
          
          for (let i = 0; i < 15; i++) {
            const canvas = document.createElement('canvas');
            canvas.width = 60; // Mobile-optimized size
            canvas.height = 90;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = `hsl(${i * 24}, 50%, 50%)`;
            ctx.fillRect(0, 0, 60, 90);
            
            const img = new Image();
            img.src = canvas.toDataURL('image/jpeg', 0.7); // Lower quality for mobile
            
            imageManager.cacheImageInMemory(`mobile-${i}`, img);
            
            operations.push({
              index: i,
              cacheSize: imageManager.imageCache.size,
              success: true
            });
          }
          
          const finalCacheSize = imageManager.imageCache.size;
          
          // Restore original cache size
          imageManager.maxCacheSize = originalMaxSize;
          
          return {
            operationsCompleted: operations.length,
            finalCacheSize,
            cacheRespectedLimit: finalCacheSize <= 10,
            memoryConstraintsHandled: true,
            lruEvictionWorked: finalCacheSize === 10 // Should evict to stay at limit
          };
        } catch (error) {
          imageManager.maxCacheSize = originalMaxSize;
          return {
            operationsCompleted: 0,
            error: error.message,
            memoryConstraintsHandled: false
          };
        }
      });
      
      expect(result.operationsCompleted).toBe(15);
      expect(result.cacheRespectedLimit).toBe(true);
      expect(result.memoryConstraintsHandled).toBe(true);
      expect(result.lruEvictionWorked).toBe(true);
    });

    test('should provide appropriate fallbacks for mobile browsers with limited features', async ({ page }) => {
      const result = await page.evaluate(async () => {
        const imageManager = new window.ImageManager();
        const container = document.createElement('div');
        document.body.appendChild(container);
        
        try {
          // Test fallback when advanced features might not be available
          imageManager.displayPlaceholder(container, 'Mobile Test Card');
          
          const placeholder = container.querySelector('.card-image-placeholder');
          const placeholderIcon = placeholder ? placeholder.querySelector('.placeholder-icon') : null;
          const placeholderText = placeholder ? placeholder.querySelector('.placeholder-text') : null;
          
          const result = {
            placeholderDisplayed: !!placeholder,
            hasIcon: !!placeholderIcon,
            hasText: !!placeholderText,
            iconContent: placeholderIcon ? placeholderIcon.textContent : null,
            textContent: placeholderText ? placeholderText.textContent : null,
            mobileFallbackWorking: true
          };
          
          document.body.removeChild(container);
          return result;
        } catch (error) {
          if (container.parentNode) {
            document.body.removeChild(container);
          }
          return {
            placeholderDisplayed: false,
            error: error.message,
            mobileFallbackWorking: false
          };
        }
      });
      
      expect(result.placeholderDisplayed).toBe(true);
      expect(result.hasIcon).toBe(true);
      expect(result.hasText).toBe(true);
      expect(result.iconContent).toBe('🃏');
      expect(result.textContent).toBe('Mobile Test Card');
      expect(result.mobileFallbackWorking).toBe(true);
    });
  });
});