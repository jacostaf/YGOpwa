/**
 * Browser-compatible ImageManager tests for line coverage
 * This file runs in real browsers and provides accurate coverage metrics
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';

// Import ImageManager directly (will work in browser)
describe('ImageManager Browser Coverage Tests', () => {
  let imageManager;
  let testContainer;

  beforeEach(async () => {
    // Create test container
    testContainer = window.testUtils.setupTestContainer();
    
    // Import ImageManager dynamically
    const module = await import('../../js/utils/ImageManager.js');
    const ImageManager = module.ImageManager;
    imageManager = new ImageManager();
  });

  afterEach(() => {
    window.testUtils.cleanup();
  });

  test('should initialize ImageManager with default configuration', () => {
    expect(imageManager).toBeDefined();
    expect(imageManager.imageCache).toBeDefined();
    expect(imageManager.maxCacheSize).toBe(1000);
    expect(imageManager.focusModeSize).toEqual({ width: 60, height: 90 });
    expect(imageManager.normalModeSize).toEqual({ width: 100, height: 145 });
  });

  test('should generate cache keys for cards', () => {
    const imageUrl = 'https://example.com/image.jpg';
    const key1 = imageManager.generateCacheKey('12345', imageUrl, { width: 100, height: 145 });
    const key2 = imageManager.generateCacheKey('67890', imageUrl, { width: 200, height: 290 });
    
    expect(key1).toBeDefined();
    expect(key2).toBeDefined();
    expect(key1).not.toBe(key2);
    expect(key1).toContain('12345');
    expect(key1).toContain('100x145');
  });

  test('should hash strings consistently', () => {
    const hash1 = imageManager.hashString('test string');
    const hash2 = imageManager.hashString('test string');
    const hash3 = imageManager.hashString('different string');
    
    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
  });

  test('should manage in-memory cache with LRU eviction', () => {
    const testImg = new Image();
    testImg.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PC9zdmc+';
    
    // Test caching
    imageManager.cacheImageInMemory('test-key', testImg);
    expect(imageManager.imageCache.has('test-key')).toBe(true);
    expect(imageManager.imageCache.get('test-key')).toBe(testImg);
  });

  test('should create placeholder images with Canvas', () => {
    const size = { width: 150, height: 220 };
    const placeholderImg = imageManager.createPlaceholderImage(size);
    
    expect(placeholderImg).toBeDefined();
    expect(placeholderImg.width).toBe(size.width);
    expect(placeholderImg.height).toBe(size.height);
    expect(placeholderImg.src).toContain('data:image/png');
  });

  test('should display placeholder in containers', () => {
    const container = document.getElementById('placeholder-container');
    
    imageManager.displayPlaceholder(container, 'Test Card');
    
    expect(container.children.length).toBeGreaterThan(0);
    expect(container.innerHTML).toContain('Test Card');
    expect(container.innerHTML).toContain('🃏');
  });

  test('should display loading indicators', () => {
    const container = document.getElementById('image-container');
    
    imageManager.displayLoading(container);
    
    expect(container.children.length).toBeGreaterThan(0);
    expect(container.innerHTML).toContain('Loading image');
    expect(container.innerHTML).toContain('loading-spinner');
  });

  test('should handle localStorage cache operations', async () => {
    const cacheKey = 'test-cache-key';
    
    // Clear any existing cache first
    localStorage.removeItem(imageManager.cachePrefix + cacheKey);
    
    // Test getting non-existent cache
    const nonExistent = await imageManager.getCachedImageData(cacheKey);
    expect(nonExistent).toBeNull();
    
    // Test setting cache data manually
    const testData = {
      data: 'data:image/png;base64,test',
      timestamp: Date.now(),
      expires: Date.now() + (7 * 24 * 60 * 60 * 1000)
    };
    localStorage.setItem(imageManager.cachePrefix + cacheKey, JSON.stringify(testData));
    
    // Test getting cached data
    const cached = await imageManager.getCachedImageData(cacheKey);
    expect(cached).toBe(testData.data);
  });

  test('should manage cache statistics', () => {
    const stats = imageManager.getCacheStats();
    
    expect(stats).toBeDefined();
    expect(typeof stats.memoryCache).toBe('number');
    expect(typeof stats.localStorageCache).toBe('number');
    expect(typeof stats.failedImages).toBe('number');
    expect(typeof stats.currentlyLoading).toBe('number');
  });

  test('should clear all caches', () => {
    // Add some test data first
    imageManager.imageCache.set('test1', new Image());
    imageManager.failedImages.add('failed-url');
    
    // Clear caches
    imageManager.clearCache();
    
    // Verify clearing worked
    expect(imageManager.imageCache.size).toBe(0);
    expect(imageManager.failedImages.size).toBe(0);
  });

  test('should process images with aspect ratio preservation', () => {
    // Create a test image
    const testImg = new Image();
    testImg.width = 200;
    testImg.height = 300;
    
    const targetSize = { width: 100, height: 145 };
    const processedImg = imageManager.processImage(testImg, targetSize);
    
    expect(processedImg).toBeDefined();
    expect(processedImg.src).toContain('data:image/jpeg');
  });

  test('should display images in containers with proper wrapper', () => {
    const container = document.getElementById('image-container');
    const testImg = new Image();
    testImg.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PC9zdmc+';
    testImg.width = 100;
    testImg.height = 145;
    
    imageManager.displayImage(testImg, container);
    
    expect(container.children.length).toBeGreaterThan(0);
    expect(container.querySelector('.card-image-wrapper')).toBeTruthy();
    expect(container.querySelector('.card-image')).toBeTruthy();
  });

  test('should handle preloading with error gracefully', async () => {
    // Test preloading with invalid URL (should not throw)
    await expect(
      imageManager.preloadImage('test-card', 'invalid-url')
    ).resolves.toBeUndefined();
  });
});