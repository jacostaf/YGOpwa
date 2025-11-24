import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Storage } from '../../js/utils/Storage.js';

describe('Storage - Coverage Improvement Tests', () => {
    let storage;
    let mockLogger;

    beforeEach(() => {
        mockLogger = {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn()
        };

        storage = new Storage();
        storage.logger = mockLogger;
        storage.currentBackend = 'memory';
        storage.backends.memory = new Map();
        storage.available.memory = true;
        
    });

    afterEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    describe('Storage Initialization', () => {
        it('should initialize storage successfully', async () => {
            const initSpy = vi.spyOn(storage, '_performInitialization').mockResolvedValue(true);
            const result = await storage.initialize();
            expect(result).toBe(true);
            expect(initSpy).toHaveBeenCalledTimes(1);
        });

        it('should check backend availability helpers', () => {
            const localAvailable = storage.isLocalStorageAvailable();
            const sessionAvailable = storage.isSessionStorageAvailable();
            expect(typeof localAvailable).toBe('boolean');
            expect(typeof sessionAvailable).toBe('boolean');
        });

        it('should return same promise on multiple initialize calls', async () => {
            const initSpy = vi.spyOn(storage, '_performInitialization').mockResolvedValue(true);
            const promise1 = storage.initialize();
            const promise2 = storage.initialize();
            
            await promise1;
            await promise2;
            expect(initSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('Storage Operations', () => {
        beforeEach(() => {
            storage.currentBackend = 'memory';
            storage.backends.memory = new Map();
        });

        it('should store and retrieve data', async () => {
            await storage.set('testKey', { data: 'test value' });
            const result = await storage.get('testKey');
            
            expect(result).toEqual({ data: 'test value' });
        });

        it('should remove data', async () => {
            await storage.set('testKey', 'value');
            await storage.remove('testKey');
            const result = await storage.get('testKey');
            
            expect(result).toBe(null);
        });

        it('should get all keys', async () => {
            await storage.set('key1', 'value1');
            await storage.set('key2', 'value2');
            
            const keys = await storage.keys();
            
            expect(keys).toContain('key1');
            expect(keys).toContain('key2');
        });

        it('should clear all data', async () => {
            await storage.set('key1', 'value1');
            await storage.set('key2', 'value2');
            
            await storage.clear();
            
            const keys = await storage.keys();
            expect(keys.length).toBe(0);
        });
    });

    describe('Advanced Storage Features', () => {
        beforeEach(() => {
            storage.currentBackend = 'memory';
            storage.backends.memory = new Map();
        });

        it('should handle batch operations', async () => {
            const batchData = {
                key1: 'value1',
                key2: 'value2',
                key3: 'value3'
            };
            
            await storage.setBatch(batchData);
            
            const result1 = await storage.get('key1');
            const result2 = await storage.get('key2');
            
            expect(result1).toBe('value1');
            expect(result2).toBe('value2');
        });

        it('should get storage information', async () => {
            await storage.set('testKey', 'testValue');
            
            const info = await storage.getStorageInfo();
            
            expect(info).toHaveProperty('backend');
            expect(info).toHaveProperty('available');
        });

        it('should handle storage usage calculation', async () => {
            const usage = await storage.getStorageUsage();
            
            expect(usage).toHaveProperty('estimated');
            expect(usage).toHaveProperty('available');
        });

        it('should cleanup expired data', async () => {
            await storage.set('expired-key', 'value', { ttl: 0 });
            const result = await storage.cleanupExpired();
            expect(result).toBeGreaterThanOrEqual(0);
        });
    });
});
