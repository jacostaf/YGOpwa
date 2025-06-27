/**
 * Image Manager - Card Image Caching and Display
 * 
 * JavaScript equivalent of Python ImageManager from oldIteration.py
 * Handles card image downloading, caching, and display following YGOPRODeck API guidelines
 * - No hotlinking - download and host images locally
 * - Proper caching to avoid rate limits and IP blacklisting
 * - Async loading with proper error handling
 * - Different sizes for different display modes
 */

import { Logger } from './Logger.js';
import { config } from './config.js';

export class ImageManager {
    constructor() {
        this.logger = new Logger('ImageManager');
        
        // Cache configuration
        this.imageCache = new Map(); // In-memory cache for loaded images
        this.maxCacheSize = 1000; // Maximum number of cached images
        this.cachePrefix = 'ygo-card-image-'; // LocalStorage prefix for cached images
        
        // Standard sizes for different display modes (matching oldIteration.py scaled down)
        this.focusModeSize = { width: 60, height: 90 };    // Smaller for focus mode
        this.normalModeSize = { width: 100, height: 145 }; // Standard for normal mode
        this.detailModeSize = { width: 200, height: 290 }; // Larger for card details
        
        // Loading state management
        this.loadingImages = new Set(); // Track images currently being loaded
        this.loadingPromises = new Map(); // Store loading promises to avoid duplicate requests
        
        // Error handling
        this.failedImages = new Set(); // Track images that failed to load
        this.retryDelay = 1000; // Initial retry delay in ms
        this.maxRetries = 3; // Maximum number of retry attempts
    }

    /**
     * Load and display a card image
     * @param {string} cardId - Unique card identifier
     * @param {string} imageUrl - URL of the card image
     * @param {Object} size - Target size {width, height}
     * @param {HTMLElement} container - Container element to display the image
     * @returns {Promise<HTMLImageElement>} The loaded image element
     */
    async loadImageForDisplay(cardId, imageUrl, size = this.normalModeSize, container = null) {
        try {
            const cacheKey = this.generateCacheKey(cardId, imageUrl, size);
            
            // Check in-memory cache first
            if (this.imageCache.has(cacheKey)) {
                this.logger.debug(`Using cached image for card ${cardId}`);
                const cachedImg = this.imageCache.get(cacheKey);
                
                if (container) {
                    this.displayImage(cachedImg, container);
                }
                
                return cachedImg;
            }
            
            // Check if image is currently being loaded
            if (this.loadingPromises.has(cacheKey)) {
                this.logger.debug(`Waiting for existing load request for card ${cardId}`);
                return await this.loadingPromises.get(cacheKey);
            }
            
            // Start loading the image
            const loadPromise = this._loadAndCacheImage(cardId, imageUrl, size, cacheKey);
            this.loadingPromises.set(cacheKey, loadPromise);
            
            try {
                const img = await loadPromise;
                
                if (container) {
                    this.displayImage(img, container);
                }
                
                return img;
            } finally {
                this.loadingPromises.delete(cacheKey);
            }
            
        } catch (error) {
            this.logger.error(`Failed to load image for card ${cardId}:`, error);
            
            // Display placeholder on error
            if (container) {
                this.displayPlaceholder(container, `Card ${cardId}`);
            }
            
            throw error;
        }
    }

    /**
     * Load and cache image with proper error handling and retries
     * @private
     */
    async _loadAndCacheImage(cardId, imageUrl, size, cacheKey) {
        this.loadingImages.add(cardId);
        
        try {
            // Check if we've already failed to load this image
            if (this.failedImages.has(imageUrl)) {
                throw new Error(`Image previously failed to load: ${imageUrl}`);
            }
            
            this.logger.debug(`Loading image for card ${cardId} from ${imageUrl}`);
            
            // Try to load from browser cache first (localStorage)
            const cachedImageData = await this.getCachedImageData(cacheKey);
            if (cachedImageData) {
                this.logger.debug(`Using localStorage cached image for card ${cardId}`);
                const img = await this.createImageFromData(cachedImageData, size);
                this.cacheImageInMemory(cacheKey, img);
                return img;
            }
            
            // Download and process the image
            const img = await this.downloadAndProcessImage(imageUrl, size);
            
            // Cache the processed image
            this.cacheImageInMemory(cacheKey, img);
            await this.cacheImageData(cacheKey, img);
            
            this.logger.debug(`Successfully loaded and cached image for card ${cardId}`);
            return img;
            
        } catch (error) {
            this.logger.error(`Failed to load image for card ${cardId}:`, error);
            this.failedImages.add(imageUrl);
            throw error;
        } finally {
            this.loadingImages.delete(cardId);
        }
    }

    /**
     * Download image with proper error handling and fallback for CORS issues
     * @private
     */
    async downloadAndProcessImage(imageUrl, size) {
        return new Promise(async (resolve, reject) => {
            // For YGOPRODeck images, always use backend proxy to avoid CORS issues
            // Never try to load them directly due to CORS restrictions
            if (imageUrl && imageUrl.startsWith('https://images.ygoprodeck.com/')) {
                this.logger.debug(`YGOPRODeck image detected, using backend proxy: ${imageUrl}`);
                try {
                    const proxyResult = await this.loadImageViaProxy(imageUrl, size);
                    resolve(proxyResult);
                    return;
                } catch (proxyError) {
                    this.logger.warn(`Backend proxy failed for ${imageUrl}:`, proxyError.message);
                    // Fallback to placeholder for YGOPRODeck images
                    const placeholderImg = this.createPlaceholderImage(size);
                    resolve(placeholderImg);
                    return;
                }
            }
            
            // For non-YGOPRODeck images, use normal loading
            const img = new Image();
            
            // Set crossOrigin for cross-origin images to avoid tainted canvas issues
            img.crossOrigin = 'anonymous';
            
            // Set up event handlers
            img.onload = () => {
                this.logger.debug(`Image downloaded successfully: ${imageUrl}`);
                
                // Process the image (resize if needed)
                const processedImg = this.processImage(img, size);
                resolve(processedImg);
            };
            
            img.onerror = (error) => {
                this.logger.error(`Failed to download image: ${imageUrl}`, error);
                
                // For non-YGOPRODeck images, create a placeholder
                const placeholderImg = this.createPlaceholderImage(size);
                resolve(placeholderImg);
            };
            
            // Start the download
            img.src = imageUrl;
            
            // Set timeout for the request
            setTimeout(() => {
                if (!img.complete) {
                    this.logger.debug(`Creating placeholder for timed out image: ${imageUrl}`);
                    const placeholderImg = this.createPlaceholderImage(size);
                    resolve(placeholderImg);
                }
            }, 15000); // 15 second timeout
        });
    }

    /**
     * Load image via backend proxy
     * @private
     */
    async loadImageViaProxy(imageUrl, size) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            let temp =config.API_URL ||'http://127.0.0.1:8081'
            
            const proxyUrl = `${temp}/cards/image?url=${encodeURIComponent(imageUrl)}`;
            this.logger.debug(`Loading via proxy: ${imageUrl} -> ${proxyUrl}`);
            
            // Set crossOrigin to anonymous to avoid CORS tainted canvas issues
            // This allows canvas operations like toDataURL() to work with the proxy-loaded images
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                this.logger.debug(`Successfully loaded image via proxy: ${imageUrl}`);
                const processedImg = this.processImage(img, size);
                resolve(processedImg);
            };
            
            img.onerror = (error) => {
                this.logger.error(`Proxy image loading failed: ${proxyUrl}`, error);
                reject(new Error(`Proxy failed for ${imageUrl}`));
            };
            
            img.src = proxyUrl;
            
            // Timeout for proxy requests
            setTimeout(() => {
                if (!img.complete) {
                    reject(new Error(`Proxy timeout for ${imageUrl}`));
                }
            }, 10000); // 10 second timeout for proxy
        });
    }

    /**
     * Create a placeholder image when real image fails to load
     * @private
     */
    createPlaceholderImage(size) {
        const canvas = document.createElement('canvas');
        canvas.width = size.width;
        canvas.height = size.height;
        const ctx = canvas.getContext('2d');
        
        // Fill background with a card-like color
        ctx.fillStyle = '#4A90E2';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add border
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
        
        // Add card icon
        ctx.fillStyle = 'white';
        ctx.font = `${Math.floor(size.height * 0.3)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🃏', canvas.width / 2, canvas.height / 2);
        
        // Create image element from canvas
        const img = new Image();
        img.src = canvas.toDataURL('image/png');
        img.style.width = `${size.width}px`;
        img.style.height = `${size.height}px`;
        img.style.objectFit = 'contain';
        
        return img;
    }

    /**
     * Process image (resize while maintaining aspect ratio)
     * @private
     */
    processImage(img, targetSize) {
        // Create canvas for image processing
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Calculate dimensions maintaining aspect ratio
        const aspectRatio = img.width / img.height;
        let { width, height } = targetSize;
        
        if (aspectRatio > (width / height)) {
            // Image is wider, constrain by width
            height = width / aspectRatio;
        } else {
            // Image is taller, constrain by height
            width = height * aspectRatio;
        }
        
        // Set canvas size
        canvas.width = width;
        canvas.height = height;
        
        // Draw and resize image
        ctx.drawImage(img, 0, 0, width, height);
        
        // Create new image element from canvas
        const processedImg = new Image();
        processedImg.src = canvas.toDataURL('image/jpeg', 0.85); // 85% quality
        processedImg.style.width = `${targetSize.width}px`;
        processedImg.style.height = `${targetSize.height}px`;
        processedImg.style.objectFit = 'contain';
        
        return processedImg;
    }

    /**
     * Display image in container
     */
    displayImage(img, container) {
        // Clear container
        container.innerHTML = '';
        
        // Create image wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'card-image-wrapper';
        
        // Create new image element instead of cloning to fix data URL display issues
        const displayImg = new Image();
        displayImg.src = img.src; // Copy the src instead of cloning
        displayImg.className = 'card-image';
        displayImg.alt = 'Yu-Gi-Oh Card';
        
        // Copy styles from original image
        displayImg.style.width = img.style.width;
        displayImg.style.height = img.style.height;
        displayImg.style.objectFit = img.style.objectFit;
        
        wrapper.appendChild(displayImg);
        container.appendChild(wrapper);
    }

    /**
     * Display placeholder when image loading fails
     */
    displayPlaceholder(container, altText = 'Card Image') {
        container.innerHTML = '';
        
        const placeholder = document.createElement('div');
        placeholder.className = 'card-image-placeholder';
        placeholder.innerHTML = `
            <div class="placeholder-content">
                <div class="placeholder-icon">🃏</div>
                <div class="placeholder-text">${altText}</div>
            </div>
        `;
        
        container.appendChild(placeholder);
    }

    /**
     * Display loading indicator
     */
    displayLoading(container) {
        container.innerHTML = '';
        
        const loading = document.createElement('div');
        loading.className = 'card-image-loading';
        loading.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-text">Loading image...</div>
            </div>
        `;
        
        container.appendChild(loading);
    }

    /**
     * Cache image in memory with LRU eviction
     * @private
     */
    cacheImageInMemory(cacheKey, img) {
        // Implement LRU eviction if cache is full
        if (this.imageCache.size >= this.maxCacheSize) {
            const oldestKey = this.imageCache.keys().next().value;
            this.imageCache.delete(oldestKey);
            this.logger.debug(`Evicted oldest cached image: ${oldestKey}`);
        }
        
        this.imageCache.set(cacheKey, img);
        this.logger.debug(`Cached image in memory: ${cacheKey}`);
    }

    /**
     * Cache image data in localStorage
     * @private
     */
    async cacheImageData(cacheKey, img) {
        try {
            // Convert image to data URL for storage
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            
            // Store in localStorage with expiration
            const cacheData = {
                data: dataUrl,
                timestamp: Date.now(),
                expires: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
            };
            
            localStorage.setItem(this.cachePrefix + cacheKey, JSON.stringify(cacheData));
            this.logger.debug(`Cached image data in localStorage: ${cacheKey}`);
            
        } catch (error) {
            this.logger.warn(`Failed to cache image data: ${error.message}`);
            // Don't throw - caching failure shouldn't break image display
        }
    }

    /**
     * Get cached image data from localStorage
     * @private
     */
    async getCachedImageData(cacheKey) {
        try {
            const cached = localStorage.getItem(this.cachePrefix + cacheKey);
            if (!cached) return null;
            
            const cacheData = JSON.parse(cached);
            
            // Check if cache has expired
            if (Date.now() > cacheData.expires) {
                localStorage.removeItem(this.cachePrefix + cacheKey);
                return null;
            }
            
            return cacheData.data;
            
        } catch (error) {
            this.logger.warn(`Failed to get cached image data: ${error.message}`);
            return null;
        }
    }

    /**
     * Create image element from cached data
     * @private
     */
    async createImageFromData(dataUrl, size) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                img.style.width = `${size.width}px`;
                img.style.height = `${size.height}px`;
                img.style.objectFit = 'contain';
                resolve(img);
            };
            
            img.onerror = () => {
                reject(new Error('Failed to create image from cached data'));
            };
            
            img.src = dataUrl;
        });
    }

    /**
     * Generate cache key for image
     * @private
     */
    generateCacheKey(cardId, imageUrl, size) {
        const urlHash = this.hashString(imageUrl);
        const sizeKey = `${size.width}x${size.height}`;
        return `${cardId}_${urlHash}_${sizeKey}`;
    }

    /**
     * Simple string hash function
     * @private
     */
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(16);
    }

    /**
     * Preload images for better performance
     */
    async preloadImage(cardId, imageUrl, size = this.normalModeSize) {
        try {
            await this.loadImageForDisplay(cardId, imageUrl, size);
            this.logger.debug(`Preloaded image for card ${cardId}`);
        } catch (error) {
            this.logger.debug(`Failed to preload image for card ${cardId}:`, error.message);
            // Don't throw - preloading failure shouldn't break the app
        }
    }

    /**
     * Clear cache (for cleanup or settings changes)
     */
    clearCache() {
        this.imageCache.clear();
        this.failedImages.clear();
        
        // Clear localStorage cache
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith(this.cachePrefix)) {
                localStorage.removeItem(key);
            }
        });
        
        this.logger.info('Image cache cleared');
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        const localStorageCount = Object.keys(localStorage)
            .filter(key => key.startsWith(this.cachePrefix)).length;
            
        return {
            memoryCache: this.imageCache.size,
            localStorageCache: localStorageCount,
            failedImages: this.failedImages.size,
            currentlyLoading: this.loadingImages.size
        };
    }
}