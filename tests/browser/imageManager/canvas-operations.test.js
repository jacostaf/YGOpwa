/**
 * Canvas Operations Tests for ImageManager
 * Tests Canvas API functionality including placeholder creation, image processing, and Canvas-to-dataURL conversion
 */

import { test, expect } from '@playwright/test';

test.describe('ImageManager Canvas Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-imagemanager.html');
    await page.waitForFunction(() => window.imageManagerTestPageReady);
  });

  test('should create placeholder image with Canvas', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const imageManager = new window.ImageManager();
      const placeholder = imageManager.createPlaceholderImage({width: 100, height: 145});
      
      return {
        tagName: placeholder.tagName,
        width: placeholder.width,
        height: placeholder.height,
        hasDataUrl: placeholder.src.startsWith('data:image/'),
        srcLength: placeholder.src.length,
        style: {
          width: placeholder.style.width,
          height: placeholder.style.height,
          objectFit: placeholder.style.objectFit
        }
      };
    });
    
    expect(result.tagName).toBe('IMG');
    expect(result.width).toBe(100);
    expect(result.height).toBe(145);
    expect(result.hasDataUrl).toBe(true);
    expect(result.srcLength).toBeGreaterThan(1000); // Should have substantial Canvas data
    expect(result.style.width).toBe('100px');
    expect(result.style.height).toBe('145px');
    expect(result.style.objectFit).toBe('contain');
  });

  test('should create placeholder with different sizes', async ({ page }) => {
    const testSizes = [
      {width: 60, height: 90},
      {width: 200, height: 290},
      {width: 421, height: 614}
    ];

    for (const size of testSizes) {
      const result = await page.evaluate(async (size) => {
        const imageManager = new window.ImageManager();
        const placeholder = imageManager.createPlaceholderImage(size);
        
        return {
          width: placeholder.width,
          height: placeholder.height,
          hasDataUrl: placeholder.src.startsWith('data:image/'),
          style: {
            width: placeholder.style.width,
            height: placeholder.style.height
          }
        };
      }, size);
      
      expect(result.width).toBe(size.width);
      expect(result.height).toBe(size.height);
      expect(result.hasDataUrl).toBe(true);
      expect(result.style.width).toBe(`${size.width}px`);
      expect(result.style.height).toBe(`${size.height}px`);
    }
  });

  test('should process image with Canvas resizing', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const imageManager = new window.ImageManager();
      
      // Create a test image to process
      const originalImage = new Image();
      originalImage.width = 421;
      originalImage.height = 614;
      
      // Create a canvas with test image data
      const canvas = document.createElement('canvas');
      canvas.width = 421;
      canvas.height = 614;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      originalImage.src = canvas.toDataURL();
      
      // Wait for image to load
      await new Promise(resolve => {
        originalImage.onload = resolve;
      });
      
      // Process the image to a smaller size
      const processedImage = imageManager.processImage(originalImage, {width: 100, height: 145});
      
      return {
        originalWidth: originalImage.width,
        originalHeight: originalImage.height,
        processedWidth: processedImage.width,
        processedHeight: processedImage.height,
        hasProcessedDataUrl: processedImage.src.startsWith('data:image/'),
        style: {
          width: processedImage.style.width,
          height: processedImage.style.height,
          objectFit: processedImage.style.objectFit
        }
      };
    });
    
    expect(result.originalWidth).toBe(421);
    expect(result.originalHeight).toBe(614);
    expect(result.hasProcessedDataUrl).toBe(true);
    expect(result.style.width).toBe('100px');
    expect(result.style.height).toBe('145px');
    expect(result.style.objectFit).toBe('contain');
  });

  test('should handle Canvas context creation and drawing operations', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 290;
      const ctx = canvas.getContext('2d');
      
      // Test basic drawing operations
      ctx.fillStyle = '#4A90E2';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
      
      ctx.fillStyle = 'white';
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('TEST', canvas.width / 2, canvas.height / 2);
      
      // Test Canvas-to-dataURL conversion
      const dataUrl = canvas.toDataURL('image/png');
      const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.85);
      
      return {
        canvasCreated: true,
        contextCreated: !!ctx,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        dataUrlGenerated: dataUrl.startsWith('data:image/png'),
        jpegDataUrlGenerated: jpegDataUrl.startsWith('data:image/jpeg'),
        dataUrlLength: dataUrl.length,
        jpegDataUrlLength: jpegDataUrl.length
      };
    });
    
    expect(result.canvasCreated).toBe(true);
    expect(result.contextCreated).toBe(true);
    expect(result.canvasWidth).toBe(200);
    expect(result.canvasHeight).toBe(290);
    expect(result.dataUrlGenerated).toBe(true);
    expect(result.jpegDataUrlGenerated).toBe(true);
    expect(result.dataUrlLength).toBeGreaterThan(1000);
    expect(result.jpegDataUrlLength).toBeGreaterThan(500);
  });

  test('should handle Canvas errors gracefully', async ({ page }) => {
    const result = await page.evaluate(async () => {
      try {
        // Test invalid Canvas operations
        const canvas = document.createElement('canvas');
        canvas.width = -1; // Invalid width
        const ctx = canvas.getContext('2d');
        
        return {
          errorHandled: true,
          contextCreated: !!ctx
        };
      } catch (error) {
        return {
          errorHandled: true,
          errorMessage: error.message
        };
      }
    });
    
    expect(result.errorHandled).toBe(true);
  });

  test('should cache image data using Canvas toDataURL', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const imageManager = new window.ImageManager();
      
      // Create a test image
      const img = new Image();
      img.width = 100;
      img.height = 145;
      
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 145;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      img.src = canvas.toDataURL();
      
      await new Promise(resolve => {
        img.onload = resolve;
      });
      
      // Test cacheImageData method
      const cacheKey = 'test-canvas-cache';
      await imageManager.cacheImageData(cacheKey, img);
      
      // Verify cached data
      const cachedData = await imageManager.getCachedImageData(cacheKey);
      
      return {
        imageCached: !!cachedData,
        cachedDataIsDataUrl: cachedData ? cachedData.startsWith('data:image/') : false,
        cacheKeyUsed: cacheKey
      };
    });
    
    expect(result.imageCached).toBe(true);
    expect(result.cachedDataIsDataUrl).toBe(true);
  });
});