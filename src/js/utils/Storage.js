/**
 * Storage - Unified Storage Management
 * 
 * Provides a unified interface for data storage with:
 * - IndexedDB (primary for large data)
 * - LocalStorage (fallback)
 * - SessionStorage (temporary data)
 * - In-memory storage (ultimate fallback)
 * - Automatic serialization/deserialization
 * - Error handling and fallback strategies
 */

import { Logger } from './Logger.js';

export class Storage {
    constructor(logger = null) {
        this.logger = logger || new Logger('Storage');
        
        // Storage backends
        this.backends = {
            indexeddb: null,
            localStorage: null,
            sessionStorage: null,
            memory: new Map()
        };
        
        // Configuration
        this.config = {
            dbName: 'YGORipperDB',
            dbVersion: 1,
            storeName: 'data',
            preferredBackend: 'indexeddb',
            fallbackOrder: ['indexeddb', 'localStorage', 'sessionStorage', 'memory']
        };
        
        // Availability flags
        this.available = {
            indexeddb: false,
            localStorage: false,
            sessionStorage: false,
            memory: true
        };
        
        // Current backend
        this.currentBackend = null;
        
        // Initialization promise
        this.initPromise = null;
    }

    /**
     * Initialize storage
     */
    async initialize() {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = this._performInitialization();
        return this.initPromise;
    }

    /**
     * Perform initialization
     */
    async _performInitialization() {
        this.logger.info('Initializing storage...');
        
        // Check availability of different storage backends
        await this.checkAvailability();
        
        // Initialize backends
        await this.initializeBackends();
        
        // Select best available backend
        this.selectBackend();
        
        this.logger.info(`Storage initialized with backend: ${this.currentBackend}`);
        return true;
    }

    /**
     * Check availability of storage backends
     */
    async checkAvailability() {
        // Check IndexedDB
        try {
            this.available.indexeddb = 'indexedDB' in window && indexedDB !== null;
            if (this.available.indexeddb) {
                // Test IndexedDB with a simple operation
                const testDB = await this.openIndexedDB('test', 1);
                testDB.close();
                this.logger.debug('IndexedDB is available');
            }
        } catch (error) {
            this.logger.warn('IndexedDB not available:', error);
            this.available.indexeddb = false;
        }

        // Check localStorage
        try {
            this.available.localStorage = 'localStorage' in window && localStorage !== null;
            if (this.available.localStorage) {
                // Test localStorage
                localStorage.setItem('test', 'test');
                localStorage.removeItem('test');
                this.logger.debug('localStorage is available');
            }
        } catch (error) {
            this.logger.warn('localStorage not available:', error);
            this.available.localStorage = false;
        }

        // Check sessionStorage
        try {
            this.available.sessionStorage = 'sessionStorage' in window && sessionStorage !== null;
            if (this.available.sessionStorage) {
                // Test sessionStorage
                sessionStorage.setItem('test', 'test');
                sessionStorage.removeItem('test');
                this.logger.debug('sessionStorage is available');
            }
        } catch (error) {
            this.logger.warn('sessionStorage not available:', error);
            this.available.sessionStorage = false;
        }

        this.logger.info('Storage availability:', this.available);
    }

    /**
     * Initialize storage backends
     */
    async initializeBackends() {
        // Initialize IndexedDB
        if (this.available.indexeddb) {
            try {
                this.backends.indexeddb = await this.initializeIndexedDB();
                this.logger.debug('IndexedDB backend initialized');
            } catch (error) {
                this.logger.error('Failed to initialize IndexedDB:', error);
                this.available.indexeddb = false;
            }
        }

        // Initialize localStorage
        if (this.available.localStorage) {
            this.backends.localStorage = localStorage;
            this.logger.debug('localStorage backend initialized');
        }

        // Initialize sessionStorage
        if (this.available.sessionStorage) {
            this.backends.sessionStorage = sessionStorage;
            this.logger.debug('sessionStorage backend initialized');
        }

        // Memory backend is always available
        this.logger.debug('Memory backend initialized');
    }

    /**
     * Initialize IndexedDB
     */
    async initializeIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.config.dbName, this.config.dbVersion);
            
            request.onerror = () => {
                reject(new Error('Failed to open IndexedDB'));
            };
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object store if it doesn't exist
                if (!db.objectStoreNames.contains(this.config.storeName)) {
                    db.createObjectStore(this.config.storeName, { keyPath: 'key' });
                }
            };
        });
    }

    /**
     * Open IndexedDB for testing
     */
    async openIndexedDB(name, version) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(name, version);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    /**
     * Select the best available backend
     */
    selectBackend() {
        for (const backend of this.config.fallbackOrder) {
            if (this.available[backend]) {
                this.currentBackend = backend;
                this.logger.info(`Selected storage backend: ${backend}`);
                return;
            }
        }
        
        // Fallback to memory
        this.currentBackend = 'memory';
        this.logger.warn('No persistent storage available, using memory only');
    }

    /**
     * Get value from storage
     */
    async get(key) {
        try {
            // Validate key
            this.validateKey(key);
            
            // Ensure we have a backend selected
            if (!this.currentBackend) {
                await this.initialize();
            }
            
            let value;
            switch (this.currentBackend) {
                case 'indexeddb':
                    value = await this.getFromIndexedDB(key);
                    break;
                case 'localStorage':
                    value = this.getFromWebStorage(this.backends.localStorage, key);
                    break;
                case 'sessionStorage':
                    value = this.getFromWebStorage(this.backends.sessionStorage, key);
                    break;
                case 'memory':
                    value = this.getFromMemory(key);
                    break;
                default:
                    throw new Error(`Unknown backend: ${this.currentBackend}`);
            }
            
            // Handle expired data
            if (value && typeof value === 'object' && value.expiresAt) {
                if (Date.now() > value.expiresAt) {
                    await this.remove(key);
                    return null;
                }
                return value.data;
            }
            
            return value;
        } catch (error) {
            this.logger.error(`Failed to get value for key ${key}:`, error);
            return null;
        }
    }

    /**
     * Set value in storage
     */
    async set(key, value, options = {}) {
        try {
            // Validate key
            this.validateKey(key);
            
            // Handle expiration
            if (options.expiresAt || options.ttl) {
                const expiresAt = options.expiresAt || (Date.now() + options.ttl);
                value = {
                    data: value,
                    expiresAt: expiresAt,
                    timestamp: Date.now()
                };
            }
            
            // Handle circular references
            let serializedValue;
            try {
                serializedValue = JSON.stringify(value);
            } catch (error) {
                if (error.message.includes('circular')) {
                    throw new Error('Cannot store circular reference');
                }
                throw error;
            }
            
            // Check for quota exceeded
            try {
                // Ensure we have a backend selected
                if (!this.currentBackend) {
                    await this.initialize();
                }
                
                switch (this.currentBackend) {
                    case 'indexeddb':
                        return await this.setInIndexedDB(key, value);
                    case 'localStorage':
                        return this.setInWebStorage(this.backends.localStorage, key, value);
                    case 'sessionStorage':
                        return this.setInWebStorage(this.backends.sessionStorage, key, value);
                    case 'memory':
                        return this.setInMemory(key, value);
                    default:
                        throw new Error(`Unknown backend: ${this.currentBackend}`);
                }
            } catch (error) {
                if (error.name === 'QuotaExceededError' || error.message.includes('quota')) {
                    console.error('Storage quota exceeded for key:', key);
                    return false;
                }
                throw error;
            }
        } catch (error) {
            this.logger.error(`Failed to set value for key ${key}:`, error);
            if (options.throwOnError !== false) {
                throw error;
            }
            return false;
        }
    }

    /**
     * Remove value from storage
     */
    async remove(key) {
        try {
            switch (this.currentBackend) {
                case 'indexeddb':
                    return await this.removeFromIndexedDB(key);
                case 'localStorage':
                    return this.removeFromWebStorage(this.backends.localStorage, key);
                case 'sessionStorage':
                    return this.removeFromWebStorage(this.backends.sessionStorage, key);
                case 'memory':
                    return this.removeFromMemory(key);
                default:
                    throw new Error(`Unknown backend: ${this.currentBackend}`);
            }
        } catch (error) {
            this.logger.error(`Failed to remove value for key ${key}:`, error);
            throw error;
        }
    }

    /**
     * Get all keys
     */
    async keys() {
        try {
            switch (this.currentBackend) {
                case 'indexeddb':
                    return await this.getKeysFromIndexedDB();
                case 'localStorage':
                    return this.getKeysFromWebStorage(this.backends.localStorage);
                case 'sessionStorage':
                    return this.getKeysFromWebStorage(this.backends.sessionStorage);
                case 'memory':
                    return Array.from(this.backends.memory.keys());
                default:
                    throw new Error(`Unknown backend: ${this.currentBackend}`);
            }
        } catch (error) {
            this.logger.error('Failed to get keys:', error);
            return [];
        }
    }

    /**
     * Clear all data
     */
    async clear() {
        try {
            switch (this.currentBackend) {
                case 'indexeddb':
                    return await this.clearIndexedDB();
                case 'localStorage':
                    return this.clearWebStorage(this.backends.localStorage);
                case 'sessionStorage':
                    return this.clearWebStorage(this.backends.sessionStorage);
                case 'memory':
                    return this.clearMemory();
                default:
                    throw new Error(`Unknown backend: ${this.currentBackend}`);
            }
        } catch (error) {
            this.logger.error('Failed to clear storage:', error);
            throw error;
        }
    }

    // IndexedDB methods
    async getFromIndexedDB(key) {
        const db = this.backends.indexeddb;
        const transaction = db.transaction([this.config.storeName], 'readonly');
        const store = transaction.objectStore(this.config.storeName);
        
        return new Promise((resolve, reject) => {
            const request = store.get(key);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const result = request.result;
                resolve(result ? result.value : null);
            };
        });
    }

    async setInIndexedDB(key, value) {
        const db = this.backends.indexeddb;
        const transaction = db.transaction([this.config.storeName], 'readwrite');
        const store = transaction.objectStore(this.config.storeName);
        
        return new Promise((resolve, reject) => {
            const request = store.put({ key, value, timestamp: Date.now() });
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(true);
        });
    }

    async removeFromIndexedDB(key) {
        const db = this.backends.indexeddb;
        const transaction = db.transaction([this.config.storeName], 'readwrite');
        const store = transaction.objectStore(this.config.storeName);
        
        return new Promise((resolve, reject) => {
            const request = store.delete(key);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(true);
        });
    }

    async getKeysFromIndexedDB() {
        const db = this.backends.indexeddb;
        const transaction = db.transaction([this.config.storeName], 'readonly');
        const store = transaction.objectStore(this.config.storeName);
        
        return new Promise((resolve, reject) => {
            const request = store.getAllKeys();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async clearIndexedDB() {
        const db = this.backends.indexeddb;
        const transaction = db.transaction([this.config.storeName], 'readwrite');
        const store = transaction.objectStore(this.config.storeName);
        
        return new Promise((resolve, reject) => {
            const request = store.clear();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(true);
        });
    }

    // Web Storage methods (localStorage/sessionStorage)
    getFromWebStorage(storage, key) {
        const item = storage.getItem(key);
        if (item === null) return null;
        
        try {
            return JSON.parse(item);
        } catch (error) {
            console.error(`Failed to parse stored value for key ${key}:`, error);
            // Return null for invalid JSON instead of the raw string
            return null;
        }
    }

    setInWebStorage(storage, key, value) {
        const serialized = JSON.stringify(value);
        storage.setItem(key, serialized);
        return true;
    }

    removeFromWebStorage(storage, key) {
        storage.removeItem(key);
        return true;
    }

    getKeysFromWebStorage(storage) {
        return Object.keys(storage);
    }

    clearWebStorage(storage) {
        storage.clear();
        return true;
    }

    // Memory methods
    getFromMemory(key) {
        const value = this.backends.memory.get(key);
        return value !== undefined ? value : null;
    }

    setInMemory(key, value) {
        // Convert undefined to null for consistency
        this.backends.memory.set(key, value === undefined ? null : value);
        return true;
    }

    removeFromMemory(key) {
        return this.backends.memory.delete(key);
    }

    clearMemory() {
        this.backends.memory.clear();
        return true;
    }

    /**
     * Get storage information
     */
    getInfo() {
        return {
            currentBackend: this.currentBackend,
            available: this.available,
            config: this.config
        };
    }

    /**
     * Estimate storage usage (where possible)
     */
    async getStorageUsage() {
        const usage = {
            backend: this.currentBackend,
            estimated: 0,
            available: 0
        };

        try {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                usage.estimated = estimate.usage || 0;
                usage.available = estimate.quota || 0;
            }
        } catch (error) {
            this.logger.warn('Failed to get storage usage estimate:', error);
        }

        return usage;
    }

    /**
     * Migrate data between backends
     */
    async migrate(fromBackend, toBackend) {
        this.logger.info(`Migrating data from ${fromBackend} to ${toBackend}`);
        
        // Get all keys from source backend directly
        let keys = [];
        try {
            switch (fromBackend) {
                case 'indexeddb':
                    if (this.backends.indexeddb) {
                        keys = await this.getKeysFromIndexedDB();
                    }
                    break;
                case 'localStorage':
                    if (this.backends.localStorage) {
                        keys = this.getKeysFromWebStorage(this.backends.localStorage);
                    }
                    break;
                case 'sessionStorage':
                    if (this.backends.sessionStorage) {
                        keys = this.getKeysFromWebStorage(this.backends.sessionStorage);
                    }
                    break;
                case 'memory':
                    keys = Array.from(this.backends.memory.keys());
                    break;
            }
        } catch (error) {
            this.logger.error(`Failed to get keys from ${fromBackend}:`, error);
            return 0;
        }
        
        // Migrate each key
        let migrated = 0;
        for (const key of keys) {
            try {
                // Get value from source backend directly
                let value;
                switch (fromBackend) {
                    case 'indexeddb':
                        value = await this.getFromIndexedDB(key);
                        break;
                    case 'localStorage':
                        value = this.getFromWebStorage(this.backends.localStorage, key);
                        break;
                    case 'sessionStorage':
                        value = this.getFromWebStorage(this.backends.sessionStorage, key);
                        break;
                    case 'memory':
                        value = this.getFromMemory(key);
                        break;
                }
                
                // Set value in target backend directly
                switch (toBackend) {
                    case 'indexeddb':
                        await this.setInIndexedDB(key, value);
                        break;
                    case 'localStorage':
                        this.setInWebStorage(this.backends.localStorage, key, value);
                        break;
                    case 'sessionStorage':
                        this.setInWebStorage(this.backends.sessionStorage, key, value);
                        break;
                    case 'memory':
                        this.setInMemory(key, value);
                        break;
                }
                
                migrated++;
            } catch (error) {
                this.logger.error(`Failed to migrate key ${key}:`, error);
            }
        }
        
        this.logger.info(`Migrated ${migrated}/${keys.length} keys`);
        return migrated;
    }

    /**
     * Validate storage key
     */
    validateKey(key) {
        if (!key || typeof key !== 'string') {
            throw new Error('Invalid key: Storage key must be a non-empty string');
        }
        
        if (key.length > 255) {
            throw new Error('Invalid key: Storage key too long (max 255 characters)');
        }
        
        return true;
    }

    /**
     * Handle batch operations
     */
    async setBatch(batchData) {
        const results = [];
        
        for (const [key, value] of Object.entries(batchData)) {
            try {
                await this.set(key, value);
                results.push(true);
            } catch (error) {
                this.logger.error(`Batch set failed for key ${key}:`, error);
                results.push(false);
            }
        }
        
        return results;
    }

    /**
     * Get storage info including usage
     */
    async getStorageInfo() {
        const usage = await this.getStorageUsage();
        const keys = await this.keys();
        
        return {
            backend: this.currentBackend,
            keyCount: keys.length,
            used: usage.estimated,
            available: usage.available,
            total: usage.available, // Add total property that tests expect
            quota: usage.available
        };
    }

    /**
     * Clean up expired entries
     */
    async cleanupExpired() {
        const keys = await this.keys();
        let cleanedCount = 0;
        
        for (const key of keys) {
            try {
                const value = await this.get(key);
                if (value && typeof value === 'object' && value.expiresAt) {
                    if (Date.now() > value.expiresAt) {
                        await this.remove(key);
                        cleanedCount++;
                    }
                }
            } catch (error) {
                this.logger.error(`Error checking expiration for key ${key}:`, error);
            }
        }
        
        return cleanedCount;
    }

    /**
     * Handle storage change events
     */
    onStorageChange(callback) {
        if (typeof window !== 'undefined' && window.addEventListener) {
            const wrappedCallback = (event) => {
                // Transform StorageEvent to match test expectations
                callback({
                    key: event.key,
                    newValue: event.newValue,
                    oldValue: event.oldValue,
                    type: 'change'
                });
            };
            window.addEventListener('storage', wrappedCallback);
            return () => window.removeEventListener('storage', wrappedCallback);
        }
        return () => {};
    }

    /**
     * Recover from corrupted storage
     */
    async recoverFromCorruption(key) {
        try {
            // Attempt to get the corrupted value
            const result = await this.get(key);
            return result;
        } catch (error) {
            console.error(`Storage corruption detected for key ${key}:`, error);
            // Remove corrupted entry
            try {
                await this.remove(key);
            } catch (removeError) {
                console.error(`Failed to remove corrupted key ${key}:`, removeError);
            }
            return null;
        }
    }
}