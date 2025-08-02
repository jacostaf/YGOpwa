/**
 * Mock helpers for IndexedDB and Service Worker testing
 * Provides realistic storage and offline functionality mocking
 */

import { vi } from 'vitest';
import { mockIndexedDBData, mockServiceWorkerResponses } from './mockApiResponses.js';

/**
 * Create a mock IndexedDB implementation
 */
export function createMockIndexedDB() {
  const mockDB = {
    name: 'YGORipperDB',
    version: 1,
    stores: {},
    
    // Create object store
    createObjectStore: vi.fn().mockImplementation((storeName, options = {}) => {
      const store = {
        name: storeName,
        keyPath: options.keyPath || 'id',
        autoIncrement: options.autoIncrement || false,
        data: {},
        
        add: vi.fn().mockImplementation((value, key) => {
          const storeKey = key || value[store.keyPath] || Date.now().toString();
          store.data[storeKey] = value;
          return Promise.resolve(storeKey);
        }),
        
        put: vi.fn().mockImplementation((value, key) => {
          const storeKey = key || value[store.keyPath] || Date.now().toString();
          store.data[storeKey] = value;
          return Promise.resolve(storeKey);
        }),
        
        get: vi.fn().mockImplementation((key) => {
          return Promise.resolve(store.data[key] || null);
        }),
        
        getAll: vi.fn().mockImplementation(() => {
          return Promise.resolve(Object.values(store.data));
        }),
        
        delete: vi.fn().mockImplementation((key) => {
          delete store.data[key];
          return Promise.resolve();
        }),
        
        clear: vi.fn().mockImplementation(() => {
          store.data = {};
          return Promise.resolve();
        }),
        
        count: vi.fn().mockImplementation(() => {
          return Promise.resolve(Object.keys(store.data).length);
        }),
        
        createIndex: vi.fn(),
        index: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(null),
          getAll: vi.fn().mockResolvedValue([])
        })
      };
      
      mockDB.stores[storeName] = store;
      return store;
    }),
    
    // Transaction management
    transaction: vi.fn().mockImplementation((storeNames, mode = 'readonly') => {
      const stores = Array.isArray(storeNames) ? storeNames : [storeNames];
      const transaction = {
        mode,
        stores: {},
        oncomplete: null,
        onerror: null,
        onabort: null,
        
        objectStore: vi.fn().mockImplementation((storeName) => {
          return mockDB.stores[storeName] || mockDB.createObjectStore(storeName);
        }),
        
        abort: vi.fn(),
        
        // Mock completion
        _complete: function() {
          if (this.oncomplete) this.oncomplete();
        },
        
        _error: function(error) {
          if (this.onerror) this.onerror({ error });
        }
      };
      
      stores.forEach(storeName => {
        transaction.stores[storeName] = mockDB.stores[storeName] || mockDB.createObjectStore(storeName);
      });
      
      return transaction;
    }),
    
    close: vi.fn(),
    
    // Pre-populate with test data
    _populateTestData: function() {
      // Settings store
      const settingsStore = this.createObjectStore('settings');
      settingsStore.data['app-settings'] = mockIndexedDBData.settings;
      
      // Sessions store
      const sessionsStore = this.createObjectStore('sessions');
      mockIndexedDBData.sessions.forEach(session => {
        sessionsStore.data[session.id] = session;
      });
      
      // Card sets store
      const cardSetsStore = this.createObjectStore('cardSets');
      mockIndexedDBData.cardSets.forEach(cardSet => {
        cardSetsStore.data[cardSet.id] = cardSet;
      });
    }
  };
  
  return mockDB;
}

/**
 * Setup IndexedDB mocking
 */
export function setupIndexedDBMocks() {
  const mockDB = createMockIndexedDB();
  
  global.indexedDB = {
    open: vi.fn().mockImplementation((name, version) => {
      return new Promise((resolve) => {
        const request = {
          result: mockDB,
          error: null,
          onsuccess: null,
          onerror: null,
          onupgradeneeded: null,
          onblocked: null,
          
          // Simulate successful open
          _triggerSuccess: function() {
            if (this.onsuccess) this.onsuccess({ target: this });
          },
          
          _triggerUpgrade: function() {
            if (this.onupgradeneeded) this.onupgradeneeded({ target: this });
          }
        };
        
        // Simulate async operation
        setTimeout(() => {
          if (version && version > mockDB.version) {
            request._triggerUpgrade();
          }
          request._triggerSuccess();
          resolve(request);
        }, 0);
      });
    }),
    
    deleteDatabase: vi.fn().mockResolvedValue(undefined),
    
    cmp: vi.fn().mockImplementation((a, b) => {
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    })
  };
  
  // Populate test data
  mockDB._populateTestData();
  
  return mockDB;
}

/**
 * Create a mock Service Worker
 */
export function createMockServiceWorker() {
  const mockServiceWorker = {
    state: 'activated',
    scriptURL: '/sw.js',
    
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    postMessage: vi.fn(),
    
    // Mock cache operations
    _caches: new Map(),
    
    _handleFetch: function(event) {
      const { request } = event;
      const url = request.url || request;
      
      // Check cache first
      const cachedResponse = this._caches.get(url);
      if (cachedResponse) {
        return Promise.resolve(cachedResponse);
      }
      
      // Simulate network request
      if (url.includes('/api/')) {
        return Promise.resolve(new Response(
          JSON.stringify(mockServiceWorkerResponses.offline.fallback),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        ));
      }
      
      return Promise.reject(new Error('Network error'));
    },
    
    _addToCache: function(request, response) {
      const url = request.url || request;
      this._caches.set(url, response);
    }
  };
  
  return mockServiceWorker;
}

/**
 * Setup Service Worker mocking
 */
export function setupServiceWorkerMocks() {
  const mockServiceWorker = createMockServiceWorker();
  
  global.navigator.serviceWorker = {
    register: vi.fn().mockImplementation((scriptURL) => {
      return Promise.resolve({
        installing: null,
        waiting: null,
        active: mockServiceWorker,
        scope: 'http://localhost:3000/',
        update: vi.fn().mockResolvedValue(undefined),
        unregister: vi.fn().mockResolvedValue(true),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      });
    }),
    
    ready: Promise.resolve({
      installing: null,
      waiting: null,
      active: mockServiceWorker,
      scope: 'http://localhost:3000/',
      update: vi.fn().mockResolvedValue(undefined),
      unregister: vi.fn().mockResolvedValue(true)
    }),
    
    controller: mockServiceWorker,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    
    getRegistration: vi.fn().mockResolvedValue({
      active: mockServiceWorker,
      scope: 'http://localhost:3000/'
    }),
    
    getRegistrations: vi.fn().mockResolvedValue([{
      active: mockServiceWorker,
      scope: 'http://localhost:3000/'
    }])
  };
  
  // Mock caches API
  global.caches = {
    open: vi.fn().mockImplementation((cacheName) => {
      return Promise.resolve({
        name: cacheName,
        
        match: vi.fn().mockImplementation((request) => {
          const url = request.url || request;
          return Promise.resolve(mockServiceWorker._caches.get(url) || null);
        }),
        
        add: vi.fn().mockImplementation((request) => {
          const url = request.url || request;
          const response = new Response('cached content', { status: 200 });
          mockServiceWorker._addToCache(url, response);
          return Promise.resolve();
        }),
        
        addAll: vi.fn().mockImplementation((requests) => {
          requests.forEach(request => {
            const url = request.url || request;
            const response = new Response('cached content', { status: 200 });
            mockServiceWorker._addToCache(url, response);
          });
          return Promise.resolve();
        }),
        
        put: vi.fn().mockImplementation((request, response) => {
          const url = request.url || request;
          mockServiceWorker._addToCache(url, response);
          return Promise.resolve();
        }),
        
        delete: vi.fn().mockImplementation((request) => {
          const url = request.url || request;
          mockServiceWorker._caches.delete(url);
          return Promise.resolve(true);
        }),
        
        keys: vi.fn().mockImplementation(() => {
          return Promise.resolve(Array.from(mockServiceWorker._caches.keys()));
        })
      });
    }),
    
    match: vi.fn().mockImplementation((request) => {
      const url = request.url || request;
      return Promise.resolve(mockServiceWorker._caches.get(url) || null);
    }),
    
    has: vi.fn().mockResolvedValue(true),
    delete: vi.fn().mockResolvedValue(true),
    keys: vi.fn().mockResolvedValue(['v1'])
  };
  
  return mockServiceWorker;
}

/**
 * Setup all storage and offline mocks
 */
export function setupStorageMocks() {
  const mockDB = setupIndexedDBMocks();
  const mockServiceWorker = setupServiceWorkerMocks();
  
  return {
    indexedDB: mockDB,
    serviceWorker: mockServiceWorker
  };
}