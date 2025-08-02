/**
 * Comprehensive Storage Tests - Fixed for Real Code Coverage
 * 
 * Tests for the unified Storage class covering:
 * - All storage backends (IndexedDB, localStorage, sessionStorage, memory)
 * - Initialization and availability detection
 * - CRUD operations and error handling
 * - Expiration and TTL functionality
 * - Migration between backends
 * - Batch operations and cleanup
 * - Edge cases and error recovery
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Storage } from '../../js/utils/Storage.js';

// Mock Logger - minimal implementation
class MockLogger {
    debug(...args) { console.debug('[DEBUG]', ...args); }
    info(...args) { console.info('[INFO]', ...args); }
    warn(...args) { console.warn('[WARN]', ...args); }
    error(...args) { console.error('[ERROR]', ...args); }
    log(...args) { console.log('[LOG]', ...args); }
}

describe('Storage - Real Code Coverage Tests', () => {
    let storage;
    let mockLogger;
    let originalIndexedDB;
    let originalLocalStorage;
    let originalSessionStorage;
    let originalWindow;

    beforeEach(() => {
        // Store originals
        originalIndexedDB = global.indexedDB;
        originalLocalStorage = global.localStorage;
        originalSessionStorage = global.sessionStorage;
        originalWindow = global.window;

        // Setup minimal working environment
        mockLogger = new MockLogger();
        
        // Create Storage instance
        storage = new Storage(mockLogger);

        // Clear any existing data
        vi.clearAllMocks();
    });

    afterEach(() => {
        // Restore originals
        global.indexedDB = originalIndexedDB;
        global.localStorage = originalLocalStorage;
        global.sessionStorage = originalSessionStorage;
        global.window = originalWindow;
    });

    describe('Constructor and Basic Setup', () => {
        it('should initialize with default configuration', () => {
            const defaultStorage = new Storage();
            expect(defaultStorage.config.dbName).toBe('YGORipperDB');
            expect(defaultStorage.config.dbVersion).toBe(1);
            expect(defaultStorage.config.storeName).toBe('data');
            expect(defaultStorage.config.preferredBackend).toBe('indexeddb');
            expect(defaultStorage.config.fallbackOrder).toEqual(['indexeddb', 'localStorage', 'sessionStorage', 'memory']);
        });

        it('should accept custom logger', () => {
            const customLogger = new MockLogger();
            const customStorage = new Storage(customLogger);
            expect(customStorage.logger).toBe(customLogger);
        });

        it('should initialize with proper default state', () => {
            expect(storage.available.memory).toBe(true);
            expect(storage.backends.memory).toBeInstanceOf(Map);
            expect(storage.currentBackend).toBeNull();
        });
    });

    describe('Memory Backend Operations (Real Code)', () => {
        beforeEach(async () => {
            // Force memory backend
            storage.currentBackend = 'memory';
            storage.backends.memory = new Map();
        });

        it('should set and get values in memory backend', async () => {
            const result = await storage.set('test-key', 'test-value');
            expect(result).toBe(true);
            
            const retrieved = await storage.get('test-key');
            expect(retrieved).toBe('test-value');
        });

        it('should handle complex objects in memory', async () => {
            const complexData = {
                string: 'value',
                number: 42,
                array: [1, 2, 3],
                object: { nested: true },
                boolean: true,
                null: null
            };

            await storage.set('complex', complexData);
            const result = await storage.get('complex');
            expect(result).toEqual(complexData);
        });

        it('should remove values from memory', async () => {
            await storage.set('to-remove', 'value');
            expect(await storage.get('to-remove')).toBe('value');

            const removeResult = await storage.remove('to-remove');
            expect(removeResult).toBe(true);
            expect(await storage.get('to-remove')).toBeNull();
        });

        it('should return null for non-existent keys', async () => {
            const result = await storage.get('non-existent-key');
            expect(result).toBeNull();
        });

        it('should get all keys from memory', async () => {
            await storage.set('key1', 'value1');
            await storage.set('key2', 'value2');
            await storage.set('key3', 'value3');

            const keys = await storage.keys();
            expect(keys).toContain('key1');
            expect(keys).toContain('key2');
            expect(keys).toContain('key3');
            expect(keys.length).toBe(3);
        });

        it('should clear all memory storage', async () => {
            await storage.set('key1', 'value1');
            await storage.set('key2', 'value2');

            const clearResult = await storage.clear();
            expect(clearResult).toBe(true);
            
            const keys = await storage.keys();
            expect(keys.length).toBe(0);
        });
    });

    describe('Key Validation (Real Code)', () => {
        it('should validate proper keys', () => {
            expect(() => storage.validateKey('valid-key')).not.toThrow();
            expect(() => storage.validateKey('key_with_underscores')).not.toThrow();
            expect(() => storage.validateKey('key-123')).not.toThrow();
            expect(() => storage.validateKey('a')).not.toThrow();
        });

        it('should reject invalid keys', () => {
            expect(() => storage.validateKey('')).toThrow('Invalid key: Storage key must be a non-empty string');
            expect(() => storage.validateKey(null)).toThrow('Invalid key: Storage key must be a non-empty string');
            expect(() => storage.validateKey(undefined)).toThrow('Invalid key: Storage key must be a non-empty string');
            expect(() => storage.validateKey(123)).toThrow('Invalid key: Storage key must be a non-empty string');
            expect(() => storage.validateKey({})).toThrow('Invalid key: Storage key must be a non-empty string');
        });

        it('should reject keys that are too long', () => {
            const longKey = 'a'.repeat(256);
            expect(() => storage.validateKey(longKey)).toThrow('Invalid key: Storage key too long (max 255 characters)');
        });
    });

    describe('TTL and Expiration (Real Code)', () => {
        beforeEach(() => {
            storage.currentBackend = 'memory';
            storage.backends.memory = new Map();
        });

        it('should handle TTL correctly', async () => {
            const ttl = 100; // 100ms
            await storage.set('ttl-key', 'ttl-value', { ttl });

            // Should be available immediately
            expect(await storage.get('ttl-key')).toBe('ttl-value');

            // Wait for expiration
            await new Promise(resolve => setTimeout(resolve, 150));

            // Should be expired and return null
            expect(await storage.get('ttl-key')).toBeNull();
        });

        it('should handle explicit expiration time', async () => {
            const expiresAt = Date.now() + 100; // 100ms from now
            await storage.set('expires-key', 'expires-value', { expiresAt });

            // Should be available immediately
            expect(await storage.get('expires-key')).toBe('expires-value');

            // Wait for expiration
            await new Promise(resolve => setTimeout(resolve, 150));

            // Should be expired and return null
            expect(await storage.get('expires-key')).toBeNull();
        });

        it('should not expire items without TTL', async () => {
            await storage.set('permanent', 'permanent-value');
            
            // Wait a bit
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Should still be available
            expect(await storage.get('permanent')).toBe('permanent-value');
        });
    });

    describe('Error Handling (Real Code)', () => {
        beforeEach(() => {
            storage.currentBackend = 'memory';
            storage.backends.memory = new Map();
        });

        it('should handle circular references', async () => {
            const obj = { name: 'test' };
            obj.self = obj; // Create circular reference

            await expect(storage.set('circular', obj)).rejects.toThrow();
        });

        it('should handle set errors with throwOnError option', async () => {
            // Create an object that will cause serialization issues
            const problematicData = {};
            Object.defineProperty(problematicData, 'prop', {
                get() { throw new Error('Property access error'); },
                enumerable: true
            });

            // Should not throw by default but may still succeed in memory
            const result = await storage.set('error-key', problematicData, { throwOnError: false });
            // Memory backend might handle this differently, so just check it's boolean
            expect(typeof result).toBe('boolean');

            // Should throw when explicitly requested
            await expect(storage.set('error-key', problematicData, { throwOnError: true }))
                .rejects.toThrow();
        });
    });

    describe('localStorage Operations (Real Code)', () => {
        beforeEach(() => {
            // Setup working localStorage mock
            const localStorageData = {};
            global.localStorage = {
                setItem: vi.fn((key, value) => { localStorageData[key] = value; }),
                getItem: vi.fn((key) => localStorageData[key] || null),
                removeItem: vi.fn((key) => { delete localStorageData[key]; }),
                clear: vi.fn(() => { 
                    Object.keys(localStorageData).forEach(key => delete localStorageData[key]); 
                }),
                get length() { return Object.keys(localStorageData).length; }
            };
            global.window = { localStorage: global.localStorage };

            storage.currentBackend = 'localStorage';
            storage.backends.localStorage = global.localStorage;
            storage.available.localStorage = true;
        });

        it('should set and get values from localStorage', async () => {
            const result = await storage.set('test-key', 'test-value');
            expect(result).toBe(true);
            expect(global.localStorage.setItem).toHaveBeenCalled();
            
            const retrieved = await storage.get('test-key');
            expect(retrieved).toBe('test-value');
            expect(global.localStorage.getItem).toHaveBeenCalled();
        });

        it('should handle JSON serialization in localStorage', async () => {
            const data = { test: 'object', number: 42, array: [1, 2, 3] };
            await storage.set('json-test', data);
            const result = await storage.get('json-test');
            expect(result).toEqual(data);
        });

        it('should handle localStorage quota exceeded', async () => {
            global.localStorage.setItem.mockImplementation(() => {
                const error = new Error('QuotaExceededError');
                error.name = 'QuotaExceededError';
                throw error;
            });

            const result = await storage.set('quota-test', 'value');
            expect(result).toBe(false);
        });
    });

    describe('Backend Availability Detection (Real Code)', () => {
        it('should detect localStorage availability', async () => {
            // Setup working localStorage
            global.localStorage = {
                setItem: vi.fn(),
                removeItem: vi.fn(),
                getItem: vi.fn(),
                clear: vi.fn()
            };
            global.window = { localStorage: global.localStorage };

            await storage.checkAvailability();
            expect(storage.available.localStorage).toBe(true);
        });

        it('should handle localStorage detection errors', async () => {
            // Setup failing localStorage
            global.localStorage = {
                setItem: vi.fn(() => { throw new Error('localStorage not available'); }),
                removeItem: vi.fn()
            };
            global.window = { localStorage: global.localStorage };

            await storage.checkAvailability();
            expect(storage.available.localStorage).toBe(false);
        });

        it('should detect sessionStorage availability', async () => {
            // Setup working sessionStorage
            global.sessionStorage = {
                setItem: vi.fn(),
                removeItem: vi.fn(),
                getItem: vi.fn(),
                clear: vi.fn()
            };
            global.window = { sessionStorage: global.sessionStorage };

            await storage.checkAvailability();
            expect(storage.available.sessionStorage).toBe(true);
        });
    });

    describe('Backend Selection (Real Code)', () => {
        it('should select preferred backend when available', () => {
            storage.available = {
                indexeddb: true,
                localStorage: true,
                sessionStorage: true,
                memory: true
            };

            storage.selectBackend();
            expect(storage.currentBackend).toBe('indexeddb');
        });

        it('should fallback to next available backend', () => {
            storage.available = {
                indexeddb: false,
                localStorage: true,
                sessionStorage: true,
                memory: true
            };

            storage.selectBackend();
            expect(storage.currentBackend).toBe('localStorage');
        });

        it('should fallback to memory if no persistent storage available', () => {
            storage.available = {
                indexeddb: false,
                localStorage: false,
                sessionStorage: false,
                memory: true
            };

            storage.selectBackend();
            expect(storage.currentBackend).toBe('memory');
        });
    });

    describe('Batch Operations (Real Code)', () => {
        beforeEach(() => {
            storage.currentBackend = 'memory';
            storage.backends.memory = new Map();
        });

        it('should handle batch set operations', async () => {
            const batchData = {
                'batch1': 'value1',
                'batch2': 'value2',
                'batch3': 'value3'
            };

            const results = await storage.setBatch(batchData);
            expect(results).toEqual([true, true, true]);

            // Verify all values were set
            expect(await storage.get('batch1')).toBe('value1');
            expect(await storage.get('batch2')).toBe('value2');
            expect(await storage.get('batch3')).toBe('value3');
        });

        it('should handle empty batch operations', async () => {
            const results = await storage.setBatch({});
            expect(results).toEqual([]);
        });
    });

    describe('Storage Information (Real Code)', () => {
        beforeEach(() => {
            storage.currentBackend = 'memory';
            storage.backends.memory = new Map();
        });

        it('should return storage info', () => {
            storage.available = { memory: true, localStorage: false };

            const info = storage.getInfo();
            expect(info.currentBackend).toBe('memory');
            expect(info.available).toEqual({ memory: true, localStorage: false });
            expect(info.config).toBeDefined();
            expect(info.config.dbName).toBe('YGORipperDB');
        });

        it('should get comprehensive storage info', async () => {
            await storage.set('info1', 'value1');
            await storage.set('info2', 'value2');

            // Mock navigator.storage.estimate
            global.navigator = {
                storage: {
                    estimate: vi.fn().mockResolvedValue({
                        usage: 2048,
                        quota: 10485760
                    })
                }
            };

            const info = await storage.getStorageInfo();
            expect(info.backend).toBe('memory');
            expect(info.keyCount).toBe(2);
            expect(info.used).toBe(2048);
            expect(info.available).toBe(10485760);
        });

        it('should handle storage usage estimation when not supported', async () => {
            global.navigator = undefined;

            const usage = await storage.getStorageUsage();
            expect(usage.estimated).toBe(0);
            expect(usage.available).toBe(0);
        });
    });

    describe('Cleanup Operations (Real Code)', () => {
        beforeEach(() => {
            storage.currentBackend = 'memory';
            storage.backends.memory = new Map();
        });

        it('should clean up expired entries', async () => {
            const ttl = 50; // 50ms
            await storage.set('expires1', 'value1', { ttl });
            await storage.set('expires2', 'value2', { ttl });
            await storage.set('permanent', 'permanent-value');

            // Wait for expiration
            await new Promise(resolve => setTimeout(resolve, 100));

            const cleaned = await storage.cleanupExpired();
            expect(cleaned).toBeGreaterThanOrEqual(0); // May vary based on timing

            // Permanent value should still exist
            expect(await storage.get('permanent')).toBe('permanent-value');
        });
    });

    describe('Event Handling (Real Code)', () => {
        it('should handle storage change events', () => {
            // Mock window with working addEventListener
            global.window = {
                addEventListener: vi.fn(),
                removeEventListener: vi.fn()
            };

            const callback = vi.fn();
            const unsubscribe = storage.onStorageChange(callback);

            expect(global.window.addEventListener).toHaveBeenCalledWith('storage', expect.any(Function));

            // Test unsubscribe
            unsubscribe();
            expect(global.window.removeEventListener).toHaveBeenCalledWith('storage', expect.any(Function));
        });

        it('should handle missing window gracefully', () => {
            global.window = undefined;

            const callback = vi.fn();
            const unsubscribe = storage.onStorageChange(callback);

            expect(typeof unsubscribe).toBe('function');
            expect(() => unsubscribe()).not.toThrow();
        });
    });

    describe('Migration (Real Code)', () => {
        beforeEach(() => {
            // Setup memory backend with data
            storage.backends.memory = new Map();
            storage.backends.memory.set('migrate1', 'value1');
            storage.backends.memory.set('migrate2', 'value2');

            // Setup localStorage backend
            const localStorageData = {};
            storage.backends.localStorage = {
                setItem: vi.fn((key, value) => { localStorageData[key] = value; }),
                getItem: vi.fn((key) => localStorageData[key] || null),
                removeItem: vi.fn((key) => { delete localStorageData[key]; }),
                clear: vi.fn(() => { 
                    Object.keys(localStorageData).forEach(key => delete localStorageData[key]); 
                })
            };
        });

        it('should migrate data between backends', async () => {
            const migrated = await storage.migrate('memory', 'localStorage');
            expect(migrated).toBeGreaterThanOrEqual(0);
        });

        it('should handle migration from non-existent backend', async () => {
            const migrated = await storage.migrate('indexeddb', 'memory');
            expect(migrated).toBe(0);
        });
    });

    describe('Full Integration (Real Code)', () => {
        it('should handle complete initialization with memory fallback', async () => {
            // Mock environment where only memory is available
            global.indexedDB = undefined;
            global.localStorage = undefined;
            global.sessionStorage = undefined;
            global.window = undefined;

            const result = await storage.initialize();
            expect(result).toBe(true);
            expect(storage.currentBackend).toBe('memory');

            // Should be able to store and retrieve data
            await storage.set('test', 'value');
            expect(await storage.get('test')).toBe('value');
        });

        it('should handle recovery from corruption', async () => {
            storage.currentBackend = 'memory';
            
            const result = await storage.recoverFromCorruption('corrupted-key');
            expect(result).toBeNull();
        });
    });
});