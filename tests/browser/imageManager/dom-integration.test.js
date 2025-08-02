/**
 * DOM Integration Tests for ImageManager
 * Tests DOM manipulation, container updates, and element lifecycle management
 */

import { test, expect } from '@playwright/test';

test.describe('ImageManager DOM Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test-imagemanager.html');
    await page.waitForFunction(() => window.imageManagerTestPageReady);
  });

  test('should display image in container correctly', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const imageManager = new window.ImageManager();
      const container = document.createElement('div');
      container.style.width = '200px';
      container.style.height = '290px';
      
      // Create a test image
      const img = imageManager.createPlaceholderImage({width: 100, height: 145});
      
      // Display the image
      imageManager.displayImage(img, container);
      
      const wrapper = container.querySelector('.card-image-wrapper');
      const displayedImg = container.querySelector('.card-image');
      
      return {
        containerCleared: container.children.length === 1,
        wrapperCreated: !!wrapper,
        imageDisplayed: !!displayedImg,
        wrapperClassName: wrapper ? wrapper.className : null,
        imageClassName: displayedImg ? displayedImg.className : null,
        imageAlt: displayedImg ? displayedImg.alt : null,
        imageSrc: displayedImg ? displayedImg.src.substring(0, 50) + '...' : null,
        imageStyle: displayedImg ? {
          width: displayedImg.style.width,
          height: displayedImg.style.height,
          objectFit: displayedImg.style.objectFit
        } : null
      };
    });
    
    expect(result.containerCleared).toBe(true);
    expect(result.wrapperCreated).toBe(true);
    expect(result.imageDisplayed).toBe(true);
    expect(result.wrapperClassName).toBe('card-image-wrapper');
    expect(result.imageClassName).toBe('card-image');
    expect(result.imageAlt).toBe('Yu-Gi-Oh Card');
    expect(result.imageStyle.width).toBe('100px');
    expect(result.imageStyle.height).toBe('145px');
    expect(result.imageStyle.objectFit).toBe('contain');
  });

  test('should display placeholder correctly', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const imageManager = new window.ImageManager();
      const container = document.createElement('div');
      
      // Add some existing content to test clearing
      container.innerHTML = '<div>Existing content</div>';
      
      // Display placeholder
      imageManager.displayPlaceholder(container, 'Test Card Name');
      
      const placeholder = container.querySelector('.card-image-placeholder');
      const placeholderContent = container.querySelector('.placeholder-content');
      const placeholderIcon = container.querySelector('.placeholder-icon');
      const placeholderText = container.querySelector('.placeholder-text');
      
      return {
        containerCleared: container.children.length === 1,
        placeholderCreated: !!placeholder,
        placeholderContentCreated: !!placeholderContent,
        placeholderClassName: placeholder ? placeholder.className : null,
        placeholderIcon: placeholderIcon ? placeholderIcon.textContent : null,
        placeholderText: placeholderText ? placeholderText.textContent : null,
        innerHTML: container.innerHTML
      };
    });
    
    expect(result.containerCleared).toBe(true);
    expect(result.placeholderCreated).toBe(true);
    expect(result.placeholderContentCreated).toBe(true);
    expect(result.placeholderClassName).toBe('card-image-placeholder');
    expect(result.placeholderIcon).toBe('🃏');
    expect(result.placeholderText).toBe('Test Card Name');
  });

  test('should display loading indicator correctly', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const imageManager = new window.ImageManager();
      const container = document.createElement('div');
      
      // Add some existing content to test clearing
      container.innerHTML = '<div>Existing content</div>';
      
      // Display loading indicator
      imageManager.displayLoading(container);
      
      const loading = container.querySelector('.card-image-loading');
      const loadingContent = container.querySelector('.loading-content');
      const loadingSpinner = container.querySelector('.loading-spinner');
      const loadingText = container.querySelector('.loading-text');
      
      return {
        containerCleared: container.children.length === 1,
        loadingCreated: !!loading,
        loadingContentCreated: !!loadingContent,
        loadingClassName: loading ? loading.className : null,
        loadingSpinnerCreated: !!loadingSpinner,
        loadingText: loadingText ? loadingText.textContent : null,
        innerHTML: container.innerHTML
      };
    });
    
    expect(result.containerCleared).toBe(true);
    expect(result.loadingCreated).toBe(true);
    expect(result.loadingContentCreated).toBe(true);
    expect(result.loadingClassName).toBe('card-image-loading');
    expect(result.loadingSpinnerCreated).toBe(true);
    expect(result.loadingText).toBe('Loading image...');
  });

  test('should handle container replacement correctly', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const imageManager = new window.ImageManager();
      const container = document.createElement('div');
      
      // Start with loading
      imageManager.displayLoading(container);
      const initialLoadingExists = !!container.querySelector('.card-image-loading');
      
      // Replace with placeholder
      imageManager.displayPlaceholder(container, 'Card Name');
      const loadingRemovedPlaceholderAdded = !container.querySelector('.card-image-loading') && 
                                            !!container.querySelector('.card-image-placeholder');
      
      // Replace with image
      const img = imageManager.createPlaceholderImage({width: 100, height: 145});
      imageManager.displayImage(img, container);
      const placeholderRemovedImageAdded = !container.querySelector('.card-image-placeholder') && 
                                          !!container.querySelector('.card-image-wrapper');
      
      return {
        initialLoadingExists,
        loadingRemovedPlaceholderAdded,
        placeholderRemovedImageAdded,
        finalContainerChildren: container.children.length
      };
    });
    
    expect(result.initialLoadingExists).toBe(true);
    expect(result.loadingRemovedPlaceholderAdded).toBe(true);
    expect(result.placeholderRemovedImageAdded).toBe(true);
    expect(result.finalContainerChildren).toBe(1);
  });

  test('should handle multiple containers independently', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const imageManager = new window.ImageManager();
      const container1 = document.createElement('div');
      const container2 = document.createElement('div');
      const container3 = document.createElement('div');
      
      // Display different content in each container
      imageManager.displayLoading(container1);
      imageManager.displayPlaceholder(container2, 'Card 2');
      
      const img = imageManager.createPlaceholderImage({width: 100, height: 145});
      imageManager.displayImage(img, container3);
      
      return {
        container1HasLoading: !!container1.querySelector('.card-image-loading'),
        container2HasPlaceholder: !!container2.querySelector('.card-image-placeholder'),
        container3HasImage: !!container3.querySelector('.card-image-wrapper'),
        container1Children: container1.children.length,
        container2Children: container2.children.length,
        container3Children: container3.children.length
      };
    });
    
    expect(result.container1HasLoading).toBe(true);
    expect(result.container2HasPlaceholder).toBe(true);
    expect(result.container3HasImage).toBe(true);
    expect(result.container1Children).toBe(1);
    expect(result.container2Children).toBe(1);
    expect(result.container3Children).toBe(1);
  });

  test('should handle DOM element creation and styling', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const imageManager = new window.ImageManager();
      const container = document.createElement('div');
      
      // Test image display
      const img = imageManager.createPlaceholderImage({width: 150, height: 200});
      imageManager.displayImage(img, container);
      
      const wrapper = container.querySelector('.card-image-wrapper');
      const displayedImg = container.querySelector('.card-image');
      
      // Get computed styles
      const wrapperStyle = window.getComputedStyle(wrapper);
      const imgStyle = window.getComputedStyle(displayedImg);
      
      return {
        wrapperDisplay: wrapperStyle.display,
        wrapperAlignItems: wrapperStyle.alignItems,
        wrapperJustifyContent: wrapperStyle.justifyContent,
        imgWidth: displayedImg.style.width,
        imgHeight: displayedImg.style.height,
        imgObjectFit: displayedImg.style.objectFit,
        imgClassName: displayedImg.className,
        imgAlt: displayedImg.alt
      };
    });
    
    expect(result.wrapperDisplay).toBe('flex');
    expect(result.wrapperAlignItems).toBe('center');
    expect(result.wrapperJustifyContent).toBe('center');
    expect(result.imgWidth).toBe('150px');
    expect(result.imgHeight).toBe('200px');
    expect(result.imgObjectFit).toBe('contain');
    expect(result.imgClassName).toBe('card-image');
    expect(result.imgAlt).toBe('Yu-Gi-Oh Card');
  });

  test('should handle image source copying correctly', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const imageManager = new window.ImageManager();
      const container = document.createElement('div');
      
      // Create original image with data URL
      const originalImg = imageManager.createPlaceholderImage({width: 100, height: 145});
      const originalSrc = originalImg.src;
      
      // Display image (which creates a new image element)
      imageManager.displayImage(originalImg, container);
      
      const displayedImg = container.querySelector('.card-image');
      
      return {
        originalSrc: originalSrc.substring(0, 50) + '...',
        displayedSrc: displayedImg.src.substring(0, 50) + '...',
        srcMatches: originalImg.src === displayedImg.src,
        displayedImgIsNewElement: originalImg !== displayedImg
      };
    });
    
    expect(result.srcMatches).toBe(true);
    expect(result.displayedImgIsNewElement).toBe(true);
  });

  test('should handle error cases gracefully', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const imageManager = new window.ImageManager();
      
      try {
        // Test with null container
        imageManager.displayImage(null, null);
        return { nullContainerHandled: false };
      } catch (error) {
        // Should handle null container gracefully or throw meaningful error
        return { 
          nullContainerHandled: true,
          errorMessage: error.message
        };
      }
    });
    
    expect(result.nullContainerHandled).toBe(true);
  });

  test('should handle CSS class application correctly', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const imageManager = new window.ImageManager();
      const container = document.createElement('div');
      
      // Test all display methods for proper CSS classes
      imageManager.displayLoading(container);
      const loadingClasses = Array.from(container.querySelector('.card-image-loading').classList);
      
      imageManager.displayPlaceholder(container, 'Test');
      const placeholderClasses = Array.from(container.querySelector('.card-image-placeholder').classList);
      
      const img = imageManager.createPlaceholderImage({width: 100, height: 145});
      imageManager.displayImage(img, container);
      const wrapperClasses = Array.from(container.querySelector('.card-image-wrapper').classList);
      const imageClasses = Array.from(container.querySelector('.card-image').classList);
      
      return {
        loadingClasses,
        placeholderClasses,
        wrapperClasses,
        imageClasses
      };
    });
    
    expect(result.loadingClasses).toContain('card-image-loading');
    expect(result.placeholderClasses).toContain('card-image-placeholder');
    expect(result.wrapperClasses).toContain('card-image-wrapper');
    expect(result.imageClasses).toContain('card-image');
  });
});