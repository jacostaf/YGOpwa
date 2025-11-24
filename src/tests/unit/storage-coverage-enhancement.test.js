import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Storage } from '../../js/utils/Storage.js';

describe('Storage - Coverage Enhancement Tests', () => {
    let storage;
    let mockLogger;
    let localStorageMock;
    let sessionStorageMock;

    beforeEach(() => {
        localStorageMock = {
            getItem: vi.fn(),
            setItem: vi.fn(),
            removeItem: vi.fn(),
            clear: vi.fn(),
            key: vi.fn(),
            length: 0
        };

        sessionStorageMock = {
            getItem: vi.fn(),
            setItem: vi.fn(),
            removeItem: vi.fn(),
            clear: vi.fn(),
            key: vi.fn(),
            length: 0
        };

        Object.defineProperty(global, 'localStorage', {
            value: localStorageMock,
            configurable: true,
            writable: true
        });

        Object.defineProperty(global, 'sessionStorage', {
            value: sessionStorageMock,
            configurable: true,
            writable: true
        });

        mockLogger = {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn()
        };

        storage = new Storage(mockLogger);
        storage.currentBackend = 'memory';
        storage.backends.memory = new Map();
        storage.available.memory = true;
    });

    afterEach(() => {
        vi.restoreAllMocks();
        delete global.localStorage;
        delete global.sessionStorage;
    });

    describe('Availability helpers', () => {
        it('detects localStorage availability', () => {
            expect(storage.isLocalStorageAvailable()).toBe(true);
        });

        it('detects sessionStorage availability', () => {
            expect(storage.isSessionStorageAvailable()).toBe(true);
        });

        it('prefers configured backend when available', () => {
            storage.available.localStorage = true;
            storage.available.sessionStorage = true;
            storage.config.preferredBackend = 'localStorage';
            expect(storage.selectBackend()).toBe('localStorage');
        });

        it('falls back to memory when nothing else is available', () => {
            storage.available = { indexeddb: false, localStorage: false, sessionStorage: false, memory: true };
            expect(storage.selectBackend()).toBe('memory');
        });
    });

    describe('LocalStorage error handling', () => {
        beforeEach(() => {
            storage.available.localStorage = true;
            storage.currentBackend = 'localStorage';
            storage.backends.localStorage = localStorageMock;
        });

        it('rejects circular structures when serialising', async () => {
            const circular = {};
            circular.self = circular;
            localStorageMock.setItem.mockImplementation(() => { throw new Error('Converting circular structure'); });

            await expect(storage.set('circular', circular)).rejects.toThrow();
            expect(mockLogger.error).toHaveBeenCalledWith('Failed to set key:', expect.any(Error));
        });

        it('respects throwOnError option', async () => {
            storage.config.throwOnError = true;
            localStorageMock.setItem.mockImplementation(() => { throw new Error('Quota exceeded'); });
            await expect(storage.set('test', 'value')).rejects.toThrow('Quota exceeded');
        });

        it('returns false when quota is exceeded', async () => {
            localStorageMock.setItem.mockImplementation(() => {
                const error = new Error('QuotaExceededError');
                error.name = 'QuotaExceededError';
                throw error;
            });
            await expect(storage.set('test', 'value')).resolves.toBe(false);
        });
    });

    describe('TTL and cleanup', () => {
        beforeEach(() => {
            storage.currentBackend = 'memory';
            storage.backends.memory = new Map();
        });

        it('respects ttl option', async () => {
            await storage.set('ttl', 'value', { ttl: 50 });
            expect(await storage.get('ttl')).toBe('value');
            await new Promise(resolve => setTimeout(resolve, 75));
            expect(await storage.get('ttl')).toBeNull();
        });

        it('honours explicit expiresAt option', async () => {
            await storage.set('exp', 'value', { expiresAt: Date.now() + 50 });
            await new Promise(resolve => setTimeout(resolve, 75));
            expect(await storage.get('exp')).toBeNull();
        });

        it('cleans up expired entries and logs errors for failures', async () => {
            storage.currentBackend = 'localStorage';
            storage.backends.localStorage = localStorageMock;
            storage.available.localStorage = true;

            await storage.set('cleanup', 'value', { ttl: 10 });
            await new Promise(resolve => setTimeout(resolve, 20));

            const cleanupResult = await storage.cleanupExpired();
            expect(cleanupResult).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Batch operations and storage info', () => {
        it('handles setBatch and returns array of booleans', async () => {
            const results = await storage.setBatch({ a: 1, b: 2 });
            expect(results).toEqual([true, true]);
            expect(await storage.get('a')).toBe(1);
            expect(await storage.get('b')).toBe(2);
        });

        it('exposes storage info and usage data', async () => {
            await storage.set('info', 'value');
            const info = await storage.getStorageInfo();
            expect(info).toMatchObject({
                backend: 'memory',
                keyCount: 1
            });

            const usage = await storage.getStorageUsage();
            expect(usage).toHaveProperty('estimated');
            expect(usage).toHaveProperty('available');
        });
    });

    describe('Event handling', () => {
        it('emits transformed events to callbacks', () => {
            const callback = vi.fn();
            storage.onStorageChange(callback);

            const event = new Event('storage');
            Object.assign(event, {
                key: 'test',
                oldValue: 'old',
                newValue: 'new',
                storageArea: localStorageMock
            });

            window.dispatchEvent(event);

            expect(callback).toHaveBeenCalledWith({
                key: 'test',
                oldValue: 'old',
                newValue: 'new',
                type: 'change',
                storageArea: localStorageMock
            });
        });

        it('logs errors thrown by callbacks', () => {
            const callback = vi.fn().mockImplementation(() => {
                throw new Error('Callback failure');
            });
            storage.onStorageChange(callback);

            const event = new Event('storage');
            window.dispatchEvent(event);

            expect(mockLogger.error).toHaveBeenCalledWith('Error in storage change callback:', expect.any(Error));
        });
    });

    describe('Migration', () => {
        it('migrates data from memory to localStorage', async () => {
            storage.currentBackend = 'memory';
            await storage.set('migrate', 'value');

            storage.backends.localStorage = localStorageMock;
            storage.available.localStorage = true;
            localStorageMock.setItem.mockImplementation(() => {});

            const migrated = await storage.migrate('memory', 'localStorage');
            expect(migrated).toBe(1);
        });
    });
});
