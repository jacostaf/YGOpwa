import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ErrorBoundary } from '../../js/utils/ErrorBoundary.js';
import { Logger } from '../../js/utils/Logger.js';
import { ImageManager } from '../../js/utils/ImageManager.js';
import { Storage } from '../../js/utils/Storage.js';

describe('Utils - Additional Coverage Tests', () => {
    
    describe('ErrorBoundary - Edge Cases', () => {
        let errorBoundary;
        let mockLogger;

        beforeEach(() => {
            mockLogger = {
                error: vi.fn(),
                warn: vi.fn(),
                info: vi.fn()
            };
            
            errorBoundary = new ErrorBoundary();
            errorBoundary.logger = mockLogger;
        });

        it('should handle async errors with retry mechanism', async () => {
            let attempts = 0;
            const operation = vi.fn().mockImplementation(async () => {
                attempts++;
                if (attempts < 3) {
                    throw new Error('Temporary failure');
                }
                return 'success';
            });

            const result = await errorBoundary.retryAsync(operation, 3, 100);
            
            expect(result).toBe('success');
            expect(attempts).toBe(3);
            expect(mockLogger.warn).toHaveBeenCalledTimes(2);
        });

        it('should handle critical errors with fallback', () => {
            const criticalOperation = () => {
                throw new Error('Critical system error');
            };
            
            const fallback = vi.fn().mockReturnValue('fallback result');
            
            const result = errorBoundary.withFallback(criticalOperation, fallback);
            
            expect(result).toBe('fallback result');
            expect(fallback).toHaveBeenCalled();
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Critical error, using fallback:',
                expect.any(Error)
            );
        });

        it('should track error frequency for monitoring', () => {
            const error1 = new Error('Test error 1');
            const error2 = new Error('Test error 2');
            
            errorBoundary.trackError(error1);
            errorBoundary.trackError(error1);
            errorBoundary.trackError(error2);
            
            const stats = errorBoundary.getErrorStats();
            
            expect(stats['Test error 1']).toBe(2);
            expect(stats['Test error 2']).toBe(1);
        });

        it('should handle DOM errors specifically', () => {
            const domError = new DOMException('NotFoundError');
            
            errorBoundary.handleDOMError(domError, 'querySelector');
            
            expect(mockLogger.warn).toHaveBeenCalledWith(
                'DOM operation failed:',
                'querySelector',
                domError
            );
        });
    });

    describe('Logger - Advanced Features', () => {
        let logger;
        let consoleSpies;

        beforeEach(() => {
            consoleSpies = {
                log: vi.spyOn(console, 'log').mockImplementation(),
                warn: vi.spyOn(console, 'warn').mockImplementation(),
                error: vi.spyOn(console, 'error').mockImplementation(),
                debug: vi.spyOn(console, 'debug').mockImplementation()
            };
            
            logger = new Logger('TestModule');
        });

        afterEach(() => {
            Object.values(consoleSpies).forEach(spy => spy.mockRestore());
        });

        it('should support structured logging with metadata', () => {
            const metadata = {
                userId: '123',
                action: 'card_add',
                timestamp: Date.now()
            };
            
            logger.logWithMetadata('info', 'Card added', metadata);
            
            expect(consoleSpies.log).toHaveBeenCalledWith(
                expect.stringContaining('[TestModule]'),
                'Card added',
                metadata
            );
        });

        it('should batch log entries for performance', () => {
            logger.enableBatching(100); // 100ms batch window
            
            logger.info('Message 1');
            logger.info('Message 2');
            logger.info('Message 3');
            
            // Should not log immediately
            expect(consoleSpies.log).not.toHaveBeenCalled();
            
            // Flush batch
            logger.flushBatch();
            
            expect(consoleSpies.log).toHaveBeenCalledTimes(1);
            expect(consoleSpies.log).toHaveBeenCalledWith(
                expect.stringContaining('Batch'),
                expect.arrayContaining([
                    expect.stringContaining('Message 1'),
                    expect.stringContaining('Message 2'),
                    expect.stringContaining('Message 3')
                ])
            );
        });

        it('should filter logs by level in production', () => {
            logger.setLevel('error'); // Only error and above
            
            logger.debug('Debug message');
            logger.info('Info message');
            logger.warn('Warning message');
            logger.error('Error message');
            
            expect(consoleSpies.debug).not.toHaveBeenCalled();
            expect(consoleSpies.log).not.toHaveBeenCalled();
            expect(consoleSpies.warn).not.toHaveBeenCalled();
            expect(consoleSpies.error).toHaveBeenCalledTimes(1);
        });

        it('should format complex objects properly', () => {
            const complexData = {
                cards: [
                    { id: 1, name: 'Card 1' },
                    { id: 2, name: 'Card 2' }
                ],
                session: {
                    id: 'sess123',
                    startTime: new Date()
                }
            };
            
            logger.info('Complex data:', complexData);
            
            expect(consoleSpies.log).toHaveBeenCalledWith(
                expect.stringContaining('[TestModule]'),
                'Complex data:',
                complexData
            );
        });
    });

    describe('ImageManager - Advanced Caching', () => {
        let imageManager;
        let mockLogger;

        beforeEach(() => {
            mockLogger = {
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn(),
                debug: vi.fn()
            };
            
            imageManager = new ImageManager();
            imageManager.logger = mockLogger;
        });

        it('should implement LRU cache eviction', () => {
            imageManager.maxCacheSize = 3;
            
            // Add images
            const img1 = new Image();
            const img2 = new Image();
            const img3 = new Image();
            const img4 = new Image();
            
            imageManager.cache.set('url1', img1);
            imageManager.cache.set('url2', img2);
            imageManager.cache.set('url3', img3);
            
            // Access url1 to make it recently used
            imageManager.cache.get('url1');
            
            // Add new image, should evict url2 (least recently used)
            imageManager.addToCache('url4', img4);
            
            expect(imageManager.cache.has('url1')).toBe(true);
            expect(imageManager.cache.has('url2')).toBe(false);
            expect(imageManager.cache.has('url3')).toBe(true);
            expect(imageManager.cache.has('url4')).toBe(true);
        });

        it('should preload images in background', async () => {
            const urls = [
                'https://example.com/card1.jpg',
                'https://example.com/card2.jpg',
                'https://example.com/card3.jpg'
            ];
            
            const loadPromises = imageManager.preloadImages(urls);
            
            expect(loadPromises).toHaveLength(3);
            expect(mockLogger.debug).toHaveBeenCalledWith(
                'Preloading images:',
                urls
            );
        });

        it('should handle memory pressure by reducing cache', () => {
            // Fill cache
            for (let i = 0; i < 10; i++) {
                imageManager.cache.set(`url${i}`, new Image());
            }
            
            // Simulate memory pressure
            imageManager.handleMemoryPressure();
            
            expect(imageManager.cache.size).toBeLessThan(10);
            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Memory pressure detected, reducing image cache'
            );
        });
    });

    describe('Storage - Quota Management', () => {
        let storage;
        let mockLogger;

        beforeEach(() => {
            mockLogger = {
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn()
            };
            
            storage = new Storage();
            storage.logger = mockLogger;
            storage.backend = 'localStorage';
            storage.initialized = true;
        });

        it('should estimate remaining storage quota', async () => {
            // Mock navigator.storage.estimate
            global.navigator.storage = {
                estimate: vi.fn().mockResolvedValue({
                    usage: 1024 * 1024, // 1MB used
                    quota: 10 * 1024 * 1024 // 10MB quota
                })
            };
            
            const remaining = await storage.getRemainingQuota();
            
            expect(remaining).toBe(9 * 1024 * 1024);
            expect(mockLogger.info).toHaveBeenCalledWith(
                'Storage quota:',
                expect.objectContaining({
                    used: 1024 * 1024,
                    total: 10 * 1024 * 1024,
                    remaining: 9 * 1024 * 1024
                })
            );
        });

        it('should clean up old data when approaching quota', async () => {
            // Set up test data with timestamps
            const now = Date.now();
            localStorage.setItem('ygo_old_data', JSON.stringify({
                timestamp: now - 7 * 24 * 60 * 60 * 1000, // 7 days old
                data: 'old'
            }));
            localStorage.setItem('ygo_new_data', JSON.stringify({
                timestamp: now - 1 * 60 * 60 * 1000, // 1 hour old
                data: 'new'
            }));
            
            await storage.cleanupOldData(3); // Keep data from last 3 days
            
            expect(localStorage.getItem('ygo_old_data')).toBe(null);
            expect(localStorage.getItem('ygo_new_data')).not.toBe(null);
        });

        it('should compress data before storing when needed', async () => {
            const largeData = {
                cards: Array(1000).fill({
                    name: 'Test Card',
                    description: 'A'.repeat(100)
                })
            };
            
            // Mock compression
            storage.compress = vi.fn().mockReturnValue('compressed_data');
            storage.shouldCompress = vi.fn().mockReturnValue(true);
            
            await storage.set('large_data', largeData);
            
            expect(storage.compress).toHaveBeenCalledWith(largeData);
            expect(localStorage.getItem('ygo_large_data')).toContain('compressed_data');
        });
    });
});