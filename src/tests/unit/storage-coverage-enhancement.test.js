import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Storage } from '../../js/utils/Storage.js';

describe('Storage - Coverage Enhancement Tests', () => {
    let storage;
    let mockLogger;

    beforeEach(() => {
        // Mock localStorage
        const localStorageMock = {
            getItem: vi.fn(),
            setItem: vi.fn(),
            removeItem: vi.fn(),
            clear: vi.fn(),
            length: 0,
            key: vi.fn()
        };
        
        Object.defineProperty(global, 'localStorage', {
            value: localStorageMock,
            writable: true
        });

        // Mock sessionStorage
        const sessionStorageMock = {
            getItem: vi.fn(),
            setItem: vi.fn(),
            removeItem: vi.fn(),
            clear: vi.fn(),
            length: 0,
            key: vi.fn()
        };
        
        Object.defineProperty(global, 'sessionStorage', {
            value: sessionStorageMock,
            writable: true
        });

        mockLogger = {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn()
        };

        storage = new Storage({
            logger: mockLogger,
            maxMemoryItems: 100
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.restoreAllMocks();
    });

    describe('Backend Availability and Selection', () => {
        it('should detect localStorage availability', () => {
            const isAvailable = storage.isLocalStorageAvailable();
            expect(isAvailable).toBe(true);
        });

        it('should handle localStorage detection errors', () => {
            // Mock localStorage to throw error
            Object.defineProperty(global, 'localStorage', {
                get() {
                    throw new Error('localStorage not available');
                }
            });

            const isAvailable = storage.isLocalStorageAvailable();
            expect(isAvailable).toBe(false);
        });

        it('should detect sessionStorage availability', () => {
            const isAvailable = storage.isSessionStorageAvailable();
            expect(isAvailable).toBe(true);
        });

        it('should select preferred backend when available', () => {
            storage.config.preferredBackend = 'localStorage';
            const backend = storage.selectBackend();
            expect(backend).toBe('localStorage');
        });

        it('should fallback to next available backend', () => {
            // Mock localStorage as unavailable
            Object.defineProperty(global, 'localStorage', {
                get() {
                    throw new Error('localStorage not available');
                }
            });

            storage.config.preferredBackend = 'localStorage';
            const backend = storage.selectBackend();
            expect(backend).toBe('sessionStorage');
        });

        it('should fallback to memory if no persistent storage available', () => {
            // Mock both localStorage and sessionStorage as unavailable
            Object.defineProperty(global, 'localStorage', {
                get() {
                    throw new Error('localStorage not available');
                }
            });
            Object.defineProperty(global, 'sessionStorage', {
                get() {
                    throw new Error('sessionStorage not available');
                }
            });

            const backend = storage.selectBackend();
            expect(backend).toBe('memory');
        });
    });

    describe('Error Handling with Real Code Paths', () => {
        it('should handle circular references', () => {
            const obj = { name: 'test' };
            obj.self = obj; // Create circular reference

            const result = storage.set('circular', obj);
            expect(result).resolves.toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Failed to serialize value for key circular:', 
                expect.any(Error)
            );
        });

        it('should handle set errors with throwOnError option', async () => {
            storage.config.throwOnError = true;
            
            // Mock setItem to throw error
            localStorage.setItem.mockImplementation(() => {
                throw new Error('Quota exceeded');
            });

            await expect(storage.set('test', 'value')).rejects.toThrow('Quota exceeded');
        });

        it('should handle localStorage quota exceeded', () => {
            localStorage.setItem.mockImplementation(() => {
                const error = new Error('QuotaExceededError');
                error.name = 'QuotaExceededError';
                throw error;
            });

            const result = storage.set('test', 'large_value');
            
            expect(result).resolves.toBe(false);
            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Storage quota exceeded for localStorage, falling back to memory'
            );
        });
    });

    describe('TTL and Expiration Real Implementation', () => {
        it('should handle TTL correctly', async () => {
            vi.useFakeTimers();
            
            await storage.set('ttl_test', 'value', { ttl: 1000 }); // 1 second TTL
            
            // Should exist immediately
            let result = await storage.get('ttl_test');
            expect(result).toBe('value');
            
            // Advance time by 1.5 seconds
            vi.advanceTimersByTime(1500);
            
            // Should be expired
            result = await storage.get('ttl_test');
            expect(result).toBe(null);
            
            vi.useRealTimers();
        });

        it('should handle explicit expiration time', async () => {
            vi.useFakeTimers();
            
            const expireAt = Date.now() + 2000; // 2 seconds from now
            await storage.set('expire_test', 'value', { expireAt });
            
            // Should exist immediately
            let result = await storage.get('expire_test');
            expect(result).toBe('value');
            
            // Advance time by 2.5 seconds
            vi.advanceTimersByTime(2500);
            
            // Should be expired
            result = await storage.get('expire_test');
            expect(result).toBe(null);
            
            vi.useRealTimers();
        });

        it('should not expire items without TTL', async () => {
            vi.useFakeTimers();
            
            await storage.set('no_ttl_test', 'value');
            
            // Advance time significantly
            vi.advanceTimersByTime(100000);
            
            // Should still exist
            const result = await storage.get('no_ttl_test');
            expect(result).toBe('value');
            
            vi.useRealTimers();
        });
    });

    describe('Batch Operations Real Code', () => {
        it('should handle batch set operations', async () => {
            const items = {
                'batch1': 'value1',
                'batch2': 'value2',
                'batch3': { nested: 'object' }
            };

            const results = await storage.batchSet(items);
            
            expect(results.batch1).toBe(true);
            expect(results.batch2).toBe(true);
            expect(results.batch3).toBe(true);
            
            // Verify values were set
            expect(await storage.get('batch1')).toBe('value1');
            expect(await storage.get('batch2')).toBe('value2');
            expect(await storage.get('batch3')).toEqual({ nested: 'object' });
        });

        it('should handle empty batch operations', async () => {
            const results = await storage.batchSet({});
            expect(results).toEqual({});
        });

        it('should handle batch operations with some failures', async () => {
            // Mock setItem to fail for specific key
            localStorage.setItem.mockImplementation((key, value) => {
                if (key.includes('batch2')) {
                    throw new Error('Storage error');
                }
            });

            const items = {
                'batch1': 'value1',
                'batch2': 'value2',
                'batch3': 'value3'
            };

            const results = await storage.batchSet(items);
            
            expect(results.batch1).toBe(true);
            expect(results.batch2).toBe(false);
            expect(results.batch3).toBe(true);
        });
    });

    describe('Storage Information Real Implementation', () => {
        it('should return storage info', () => {
            const info = storage.getStorageInfo();
            
            expect(info).toEqual({
                backend: expect.any(String),
                memoryItems: expect.any(Number),
                version: expect.any(String)
            });
        });

        it('should get comprehensive storage info', async () => {
            // Add some test data
            await storage.set('info_test1', 'value1');
            await storage.set('info_test2', { key: 'value' });
            
            const info = await storage.getComprehensiveStorageInfo();
            
            expect(info).toEqual({
                backend: expect.any(String),
                memoryItems: expect.any(Number),
                totalItems: expect.any(Number),
                estimatedSize: expect.any(Number),
                quota: expect.any(Object),
                version: expect.any(String)
            });
        });

        it('should handle storage usage estimation when not supported', async () => {
            // Mock navigator.storage as undefined
            Object.defineProperty(navigator, 'storage', {
                value: undefined,
                writable: true
            });

            const info = await storage.getComprehensiveStorageInfo();
            
            expect(info.quota).toEqual({
                usage: 'unknown',
                quota: 'unknown',
                available: 'unknown'
            });
        });
    });

    describe('Cleanup Operations Real Code', () => {
        it('should clean up expired entries', async () => {
            vi.useFakeTimers();
            
            // Set items with different TTLs
            await storage.set('cleanup1', 'value1', { ttl: 500 });
            await storage.set('cleanup2', 'value2', { ttl: 1500 });
            await storage.set('cleanup3', 'value3'); // No TTL
            
            // Advance time to expire first item
            vi.advanceTimersByTime(750);
            
            const removedCount = await storage.cleanupExpired();
            
            expect(removedCount).toBe(1);
            expect(await storage.get('cleanup1')).toBe(null);
            expect(await storage.get('cleanup2')).toBe('value2');
            expect(await storage.get('cleanup3')).toBe('value3');
            
            vi.useRealTimers();
        });

        it('should handle cleanup with storage errors', async () => {
            vi.useFakeTimers();
            
            await storage.set('cleanup_error', 'value', { ttl: 500 });
            
            // Mock removeItem to throw error
            localStorage.removeItem.mockImplementation(() => {
                throw new Error('Remove failed');
            });
            
            vi.advanceTimersByTime(750);
            
            const removedCount = await storage.cleanupExpired();
            
            expect(removedCount).toBe(0); // Should handle error gracefully
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Failed to remove expired item cleanup_error:', 
                expect.any(Error)
            );
            
            vi.useRealTimers();
        });
    });

    describe('Event Handling Real Code', () => {
        it('should handle storage change events', () => {
            const mockCallback = vi.fn();
            storage.onStorageChange(mockCallback);

            // Simulate storage event
            const storageEvent = new StorageEvent('storage', {
                key: 'test_key',
                oldValue: 'old_value',
                newValue: 'new_value',
                storageArea: localStorage
            });

            window.dispatchEvent(storageEvent);

            expect(mockCallback).toHaveBeenCalledWith({
                key: 'test_key',
                oldValue: 'old_value',
                newValue: 'new_value',
                storageArea: localStorage
            });
        });

        it('should handle missing window gracefully', () => {
            // Mock window as undefined
            const originalWindow = global.window;
            global.window = undefined;

            expect(() => {
                storage.onStorageChange(() => {});
            }).not.toThrow();

            global.window = originalWindow;
        });

        it('should handle storage event errors', () => {
            const errorCallback = vi.fn().mockImplementation(() => {
                throw new Error('Callback error');
            });
            
            storage.onStorageChange(errorCallback);

            const storageEvent = new StorageEvent('storage', {
                key: 'test_key',
                newValue: 'new_value'
            });

            expect(() => {
                window.dispatchEvent(storageEvent);
            }).not.toThrow();

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Error in storage change callback:', 
                expect.any(Error)
            );
        });
    });

    describe('Migration Real Code', () => {
        it('should migrate data between backends', async () => {
            // Set up data in memory backend
            storage.currentBackend = 'memory';
            await storage.set('migrate1', 'value1');
            await storage.set('migrate2', { complex: 'object' });

            // Migrate to localStorage
            const migratedCount = await storage.migrate('memory', 'localStorage');

            expect(migratedCount).toBe(2);
            
            // Switch to localStorage and verify data
            storage.currentBackend = 'localStorage';
            expect(await storage.get('migrate1')).toBe('value1');
            expect(await storage.get('migrate2')).toEqual({ complex: 'object' });
        });

        it('should handle migration from non-existent backend', async () => {
            const migratedCount = await storage.migrate('nonExistentBackend', 'memory');
            expect(migratedCount).toBe(0);
        });

        it('should handle migration errors gracefully', async () => {
            storage.currentBackend = 'memory';
            await storage.set('migrate_error', 'value');

            // Mock destination backend to throw errors
            localStorage.setItem.mockImplementation(() => {
                throw new Error('Migration failed');
            });

            const migratedCount = await storage.migrate('memory', 'localStorage');
            
            expect(migratedCount).toBe(0);
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Failed to migrate item migrate_error:', 
                expect.any(Error)
            );
        });
    });

    describe('Full Integration Real Code', () => {
        it('should handle complete initialization with memory fallback', async () => {
            // Mock all persistent storage as unavailable
            Object.defineProperty(global, 'localStorage', {
                get() {
                    throw new Error('localStorage unavailable');
                }
            });
            Object.defineProperty(global, 'sessionStorage', {
                get() {
                    throw new Error('sessionStorage unavailable');
                }
            });

            const result = await storage.initialize();

            expect(result).toBe(true);
            expect(storage.currentBackend).toBe('memory');
            expect(mockLogger.warn).toHaveBeenCalledWith(
                'No persistent storage available, using memory only'
            );
        });

        it('should handle recovery from corruption', async () => {
            // Mock getItem to return corrupted JSON
            localStorage.getItem.mockReturnValue('{"corrupted": json}');

            const result = await storage.get('corrupted_key');

            expect(result).toBe(null);
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Failed to parse stored value for key corrupted_key:', 
                expect.any(Error)
            );
        });

        it('should handle complex object storage and retrieval', async () => {
            const complexObject = {
                string: 'test',
                number: 42,
                boolean: true,
                null_value: null,
                array: [1, 2, 3],
                nested: {
                    deep: {
                        value: 'nested'
                    }
                },
                date: new Date().toISOString()
            };

            await storage.set('complex', complexObject);
            const retrieved = await storage.get('complex');

            expect(retrieved).toEqual(complexObject);
        });
    });

    describe('Memory Management Edge Cases', () => {
        it('should enforce memory limits', async () => {
            storage.config.maxMemoryItems = 2;
            storage.currentBackend = 'memory';

            await storage.set('mem1', 'value1');
            await storage.set('mem2', 'value2');
            await storage.set('mem3', 'value3'); // Should evict oldest

            expect(await storage.get('mem1')).toBe(null); // Evicted
            expect(await storage.get('mem2')).toBe('value2');
            expect(await storage.get('mem3')).toBe('value3');
        });

        it('should handle memory pressure scenarios', async () => {
            storage.config.maxMemoryItems = 3;
            storage.currentBackend = 'memory';

            // Fill memory to capacity
            await storage.set('pressure1', 'value1');
            await storage.set('pressure2', 'value2');
            await storage.set('pressure3', 'value3');

            // Access items to change LRU order
            await storage.get('pressure1'); // Make pressure1 most recent

            // Add new item, should evict pressure2 (least recently used)
            await storage.set('pressure4', 'value4');

            expect(await storage.get('pressure1')).toBe('value1'); // Still exists
            expect(await storage.get('pressure2')).toBe(null); // Evicted
            expect(await storage.get('pressure3')).toBe('value3'); // Still exists
            expect(await storage.get('pressure4')).toBe('value4'); // New item
        });

        it('should handle concurrent access patterns', async () => {
            const promises = [];
            
            // Simulate concurrent operations
            for (let i = 0; i < 10; i++) {
                promises.push(storage.set(`concurrent${i}`, `value${i}`));
                promises.push(storage.get(`concurrent${i}`));
            }

            const results = await Promise.all(promises);
            
            // Should handle all operations without errors
            expect(results.filter(r => r === false)).toHaveLength(0);
        });
    });

    describe('Configuration Edge Cases', () => {
        it('should handle invalid configuration gracefully', () => {
            const invalidStorage = new Storage({
                maxMemoryItems: -1, // Invalid
                preferredBackend: 'invalidBackend', // Invalid
                throwOnError: 'not_boolean' // Invalid type
            });

            expect(invalidStorage.config.maxMemoryItems).toBeGreaterThan(0);
            expect(['localStorage', 'sessionStorage', 'memory']).toContain(invalidStorage.config.preferredBackend);
        });

        it('should handle version tracking', async () => {
            await storage.set('version_test', 'value');
            
            const info = storage.getStorageInfo();
            expect(info.version).toBeDefined();
            expect(typeof info.version).toBe('string');
        });
    });
});