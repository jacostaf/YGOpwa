import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ImageManager } from '../../js/utils/ImageManager.js';

describe('ImageManager - Coverage Improvement Tests', () => {
    let imageManager;
    let mockLogger;
    let mockCanvas;
    let mockCtx;

    beforeEach(() => {
        mockLogger = {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn()
        };

        // Mock canvas context
        mockCtx = {
            drawImage: vi.fn(),
            clearRect: vi.fn(),
            fillRect: vi.fn(),
            fillStyle: '',
            globalAlpha: 1
        };

        mockCanvas = {
            getContext: vi.fn().mockReturnValue(mockCtx),
            toBlob: vi.fn((callback) => callback(new Blob(['test'], { type: 'image/jpeg' }))),
            width: 0,
            height: 0
        };

        // Mock document.createElement for canvas
        global.document.createElement = vi.fn((tag) => {
            if (tag === 'canvas') return mockCanvas;
            return document.createElement(tag);
        });

        imageManager = new ImageManager();
        imageManager.logger = mockLogger;

        // Mock Image constructor
        global.Image = class {
            constructor() {
                this.onload = null;
                this.onerror = null;
                this.src = '';
            }
            
            set src(value) {
                this._src = value;
                // Simulate successful load by default
                setTimeout(() => {
                    if (this.onload) this.onload();
                }, 10);
            }
            
            get src() {
                return this._src;
            }
        };
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Image Processing Operations', () => {
        it('should resize image with aspect ratio preservation', async () => {
            const img = new Image();
            img.width = 800;
            img.height = 600;
            
            const resized = await imageManager.resizeImage(img, 400, 300);
            
            expect(mockCanvas.width).toBe(400);
            expect(mockCanvas.height).toBe(300);
            expect(mockCtx.drawImage).toHaveBeenCalledWith(img, 0, 0, 400, 300);
        });

        it('should handle image compression with quality settings', async () => {
            const blob = new Blob(['test image data'], { type: 'image/png' });
            
            const compressed = await imageManager.compressImage(blob, {
                maxWidth: 500,
                maxHeight: 500,
                quality: 0.7
            });
            
            expect(compressed).toBeInstanceOf(Blob);
            expect(compressed.type).toBe('image/jpeg');
        });

        it('should generate image thumbnails', async () => {
            const img = new Image();
            img.width = 1000;
            img.height = 1000;
            
            const thumbnail = await imageManager.generateThumbnail(img, 150);
            
            expect(mockCanvas.width).toBe(150);
            expect(mockCanvas.height).toBe(150);
            expect(mockCtx.drawImage).toHaveBeenCalled();
        });

        it('should handle image rotation', async () => {
            const img = new Image();
            img.width = 600;
            img.height = 400;
            
            // Mock context methods for rotation
            mockCtx.save = vi.fn();
            mockCtx.restore = vi.fn();
            mockCtx.translate = vi.fn();
            mockCtx.rotate = vi.fn();
            
            const rotated = await imageManager.rotateImage(img, 90);
            
            expect(mockCanvas.width).toBe(400); // Swapped dimensions
            expect(mockCanvas.height).toBe(600);
            expect(mockCtx.rotate).toHaveBeenCalledWith(Math.PI / 2);
        });
    });

    describe('Cache Management', () => {
        it('should cache processed images', async () => {
            const url = 'https://example.com/card.jpg';
            const img = new Image();
            
            // First load
            const result1 = await imageManager.loadImage(url);
            expect(mockLogger.debug).toHaveBeenCalledWith('Loading image:', url);
            
            // Second load should come from cache
            const result2 = await imageManager.loadImage(url);
            expect(result2).toBe(result1);
            expect(imageManager.cache.has(url)).toBe(true);
        });

        it('should handle cache size limits', async () => {
            imageManager.maxCacheSize = 3;
            
            // Load more images than cache size
            for (let i = 0; i < 5; i++) {
                await imageManager.loadImage(`https://example.com/card${i}.jpg`);
            }
            
            expect(imageManager.cache.size).toBe(3);
            // First two should have been evicted
            expect(imageManager.cache.has('https://example.com/card0.jpg')).toBe(false);
            expect(imageManager.cache.has('https://example.com/card1.jpg')).toBe(false);
        });

        it('should clear cache on demand', () => {
            imageManager.cache.set('url1', new Image());
            imageManager.cache.set('url2', new Image());
            
            imageManager.clearCache();
            
            expect(imageManager.cache.size).toBe(0);
            expect(mockLogger.info).toHaveBeenCalledWith('Image cache cleared');
        });
    });

    describe('Error Handling', () => {
        it('should handle image load failures with retry', async () => {
            let attemptCount = 0;
            global.Image = class {
                constructor() {
                    this.onload = null;
                    this.onerror = null;
                }
                
                set src(value) {
                    this._src = value;
                    attemptCount++;
                    setTimeout(() => {
                        if (attemptCount < 3 && this.onerror) {
                            this.onerror(new Error('Network error'));
                        } else if (this.onload) {
                            this.onload();
                        }
                    }, 10);
                }
                
                get src() {
                    return this._src;
                }
            };
            
            const result = await imageManager.loadImageWithRetry('https://example.com/card.jpg', 3);
            
            expect(attemptCount).toBe(3);
            expect(result).toBeTruthy();
            expect(mockLogger.warn).toHaveBeenCalledTimes(2); // Two retries
        });

        it('should handle corrupt image data gracefully', async () => {
            global.Image = class {
                constructor() {
                    this.onload = null;
                    this.onerror = null;
                }
                
                set src(value) {
                    this._src = value;
                    setTimeout(() => {
                        if (this.onerror) {
                            this.onerror(new Error('Invalid image data'));
                        }
                    }, 10);
                }
                
                get src() {
                    return this._src;
                }
            };
            
            await expect(imageManager.loadImage('https://example.com/corrupt.jpg'))
                .rejects.toThrow('Invalid image data');
        });

        it('should validate image dimensions', async () => {
            const img = new Image();
            img.width = 10000; // Too large
            img.height = 10000;
            
            const isValid = imageManager.validateImageDimensions(img, {
                maxWidth: 2000,
                maxHeight: 2000
            });
            
            expect(isValid).toBe(false);
            expect(mockLogger.warn).toHaveBeenCalledWith('Image dimensions exceed limits:', {
                width: 10000,
                height: 10000,
                maxWidth: 2000,
                maxHeight: 2000
            });
        });
    });

    describe('Utility Functions', () => {
        it('should extract image metadata', async () => {
            const img = new Image();
            img.width = 800;
            img.height = 600;
            img.src = 'https://example.com/card.jpg';
            
            const metadata = imageManager.getImageMetadata(img);
            
            expect(metadata).toEqual({
                width: 800,
                height: 600,
                aspectRatio: 800 / 600,
                src: 'https://example.com/card.jpg',
                size: null // Size not available from Image object
            });
        });

        it('should convert blob to data URL', async () => {
            const blob = new Blob(['test data'], { type: 'image/png' });
            
            // Mock FileReader
            global.FileReader = class {
                readAsDataURL(blob) {
                    setTimeout(() => {
                        this.onload({ target: { result: 'data:image/png;base64,dGVzdCBkYXRh' } });
                    }, 10);
                }
            };
            
            const dataUrl = await imageManager.blobToDataUrl(blob);
            
            expect(dataUrl).toBe('data:image/png;base64,dGVzdCBkYXRh');
        });

        it('should detect image format from blob', async () => {
            const jpegBlob = new Blob(['fake jpeg'], { type: 'image/jpeg' });
            const pngBlob = new Blob(['fake png'], { type: 'image/png' });
            const webpBlob = new Blob(['fake webp'], { type: 'image/webp' });
            
            expect(imageManager.getImageFormat(jpegBlob)).toBe('jpeg');
            expect(imageManager.getImageFormat(pngBlob)).toBe('png');
            expect(imageManager.getImageFormat(webpBlob)).toBe('webp');
        });
    });
});