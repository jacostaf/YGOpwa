/**
 * Test Setup for Integration Tests
 * 
 * Provides common setup, utilities, and mocks for all integration tests
 */

import { vi, beforeEach, afterEach } from 'vitest';
import { setupSpeechRecognitionMocks } from './mockSpeechRecognition.js';

// Mock localStorage / sessionStorage with resets that survive vi.clearAllMocks
const createStorageMock = () => {
  let storage = {};

  const mock = {
    getItem: vi.fn((key) =>
      Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null
    ),
    setItem: vi.fn((key, value) => {
      storage[key] = String(value);
    }),
    removeItem: vi.fn((key) => {
      delete storage[key];
    }),
    clear: vi.fn(() => {
      storage = {};
    }),
    key: vi.fn((index) => Object.keys(storage)[index] || null),
    get length() {
      return Object.keys(storage).length;
    },
    get _storage() {
      return storage;
    },
    _reset: () => {
      storage = {};
    }
  };

  return mock;
};

const resetWebStorageMocks = () => {
  const local = createStorageMock();
  const session = createStorageMock();
  global.localStorage = local;
  global.sessionStorage = session;
  if (global.window) {
    global.window.localStorage = local;
    global.window.sessionStorage = session;
  }
};

resetWebStorageMocks();

// Mock Web Speech API
global.webkitSpeechRecognition = vi.fn().mockImplementation(() => ({
  continuous: true,
  interimResults: true,
  lang: 'en-US',
  maxAlternatives: 5,
  serviceURI: '',
  start: vi.fn(),
  stop: vi.fn(),
  abort: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
  onerror: null,
  onresult: null,
  onstart: null,
  onend: null,
  onnomatch: null,
  onsoundstart: null,
  onsoundend: null,
  onspeechstart: null,
  onspeechend: null,
  onaudiostart: null,
  onaudioend: null
}));

global.SpeechRecognition = global.webkitSpeechRecognition;

// Mock IndexedDB with proper async handling
global.indexedDB = {
  open: vi.fn().mockImplementation(() => {
    const request = {
      addEventListener: vi.fn(),
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      result: null
    };
    
    // Simulate async success
    setTimeout(() => {
      if (request.onsuccess) {
        request.result = {
          createObjectStore: vi.fn(),
          transaction: vi.fn().mockReturnValue({
            objectStore: vi.fn().mockReturnValue({
              add: vi.fn(),
              get: vi.fn().mockReturnValue({ onsuccess: null, result: null }),
              put: vi.fn().mockReturnValue({ onsuccess: null }),
              delete: vi.fn().mockReturnValue({ onsuccess: null }),
              getAll: vi.fn().mockReturnValue({ onsuccess: null, result: [] })
            })
          })
        };
        request.onsuccess({ target: request });
      }
    }, 0);
    
    return request;
  }),
  deleteDatabase: vi.fn()
};

// Mock Service Worker and navigator
const createNavigatorMock = () => ({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  platform: 'MacIntel',
  language: 'en-US',
  onLine: true,
  cookieEnabled: true,
  serviceWorker: {
    register: vi.fn().mockResolvedValue({
      installing: null,
      waiting: null,
      active: null,
      scope: 'http://localhost:3000/',
      update: vi.fn(),
      unregister: vi.fn()
    }),
    ready: Promise.resolve({
      installing: null,
      waiting: null,
      active: null,
      scope: 'http://localhost:3000/',
      update: vi.fn(),
      unregister: vi.fn()
    }),
    controller: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  },
  mediaDevices: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: vi.fn().mockReturnValue([{
        stop: vi.fn(),
        enabled: true
      }])
    }),
    enumerateDevices: vi.fn().mockResolvedValue([])
  },
  permissions: {
    query: vi.fn().mockResolvedValue({
      state: 'granted',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    })
  }
});

const resetNavigatorMocks = () => {
  const navigatorMock = createNavigatorMock();
  if (!global.navigator) {
    global.navigator = {};
  }

  Object.entries(navigatorMock).forEach(([key, value]) => {
    Object.defineProperty(global.navigator, key, {
      value,
      configurable: true,
      writable: true
    });
  });

  if (global.window) {
    Object.defineProperty(global.window, 'navigator', {
      value: global.navigator,
      configurable: true,
      writable: true
    });
  }
};

resetNavigatorMocks();

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn()
};

// Mock window.confirm and window.alert
global.confirm = vi.fn().mockReturnValue(true);
global.alert = vi.fn();

// Mock URL.createObjectURL for file downloads
if (!global.URL) {
  global.URL = {};
}
global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

const originalGetElementById = document.getElementById.bind(document);
const originalQuerySelector = document.querySelector.bind(document);
const originalQuerySelectorAll = document.querySelectorAll.bind(document);

const wrapMethod = (object, method) => {
    if (object && typeof object[method] === 'function') {
        const original = object[method].bind(object);
        object[method] = vi.fn((...args) => original(...args));
    } else if (object && object[method] === undefined) {
        object[method] = vi.fn();
    }
};

const ensureProperty = (object, key, defaultValue) => {
    if (!(key in object)) {
        Object.defineProperty(object, key, {
            configurable: true,
            writable: true,
            value: defaultValue
        });
    }
};

function augmentDomElement(element) {
    if (!element || element.__yg_augmented) {
        return element;
    }

    if (element.classList) {
        wrapMethod(element.classList, 'add');
        wrapMethod(element.classList, 'remove');
        wrapMethod(element.classList, 'toggle');
        wrapMethod(element.classList, 'contains');
    }

    if (element.style) {
        wrapMethod(element.style, 'setProperty');
        wrapMethod(element.style, 'removeProperty');
        wrapMethod(element.style, 'getPropertyValue');
    }

    wrapMethod(element, 'appendChild');
    wrapMethod(element, 'removeChild');
    wrapMethod(element, 'querySelector');
    wrapMethod(element, 'querySelectorAll');
    wrapMethod(element, 'getBoundingClientRect');
    wrapMethod(element, 'scrollIntoView');
    wrapMethod(element, 'focus');
    wrapMethod(element, 'blur');
    wrapMethod(element, 'click');
    wrapMethod(element, 'remove');
    wrapMethod(element, 'addEventListener');
    wrapMethod(element, 'removeEventListener');
    wrapMethod(element, 'setAttribute');
    wrapMethod(element, 'getAttribute');
    wrapMethod(element, 'removeAttribute');
    wrapMethod(element, 'toggleAttribute');

    ensureProperty(element, 'dataset', {});
    ensureProperty(element, 'value', '');
    ensureProperty(element, 'checked', false);
    ensureProperty(element, 'disabled', false);
    ensureProperty(element, 'hidden', false);

    element.__yg_augmented = true;
    return element;
}

// Enhanced DOM element factory for UIManager DOM element mocking
function createMockDOMElement(tagName = 'div') {
    const element = document.createElement(tagName);
    return augmentDomElement(element);
}

const assignDocumentMocks = () => {
    document.getElementById = vi.fn((id) => {
        const existing = originalGetElementById(id);
        if (existing) {
            return augmentDomElement(existing);
        }
        if (!id) return null;
        const element = createMockDOMElement('div');
        element.id = id;
        return element;
    });

    document.querySelector = vi.fn((selector) => {
        const existing = originalQuerySelector(selector);
        if (existing) {
            return augmentDomElement(existing);
        }
        if (!selector) return null;
        return createMockDOMElement('div');
    });

    document.querySelectorAll = vi.fn((selector) => {
        const existing = originalQuerySelectorAll(selector);
        if (existing && existing.length) {
            existing.forEach(node => augmentDomElement(node));
            return existing;
        }
        if (!selector) return [];
        if (selector === '.tab-btn' || selector === '.tab-panel') {
            return [createMockDOMElement('div'), createMockDOMElement('div')];
        }
        return [createMockDOMElement('div')];
    });
};

assignDocumentMocks();

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn().mockImplementation((cb) => {
  setTimeout(cb, 0);
});

global.cancelAnimationFrame = vi.fn();

// Global setup for all tests
beforeEach(() => {
  // Reset all mocks
  vi.clearAllMocks();

  // Reapply DOM/storage/navigator mocks because vi.clearAllMocks removes implementations
  resetWebStorageMocks();
  resetNavigatorMocks();
  assignDocumentMocks();
  
  // Reset storage
  if (global.localStorage && global.localStorage.clear) {
    global.localStorage.clear();
  }
  if (global.sessionStorage && global.sessionStorage.clear) {
    global.sessionStorage.clear();
  }
  
  // Setup fetch mock (needs to be reset after clearAllMocks)
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue({ success: true }),
    text: vi.fn().mockResolvedValue(''),
    blob: vi.fn().mockResolvedValue(new Blob()),
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0))
  });
  
  // Setup window properties with proper configurability
  if (global.window) {
    Object.defineProperty(window, 'isSecureContext', {
      value: true,
      configurable: true,
      writable: true
    });
    
    // Fix JSDOM location property - only define if not already defined or if configurable
    const locationDescriptor = Object.getOwnPropertyDescriptor(window, 'location');
    if (!locationDescriptor || locationDescriptor.configurable !== false) {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'http://localhost:3000',
          protocol: 'http:',
          host: 'localhost:3000',
          hostname: 'localhost',
          port: '3000',
          pathname: '/',
          search: '',
          hash: '',
          origin: 'http://localhost:3000',
          reload: vi.fn(),
          replace: vi.fn(),
          assign: vi.fn()
        },
        writable: true,
        configurable: true
      });
    }
    
    // Setup screen and window dimensions
    Object.defineProperty(window, 'screen', {
      value: {
        width: 1920,
        height: 1080
      },
      configurable: true,
      writable: true
    });
    
    Object.defineProperty(window, 'innerWidth', {
      value: 1200,
      configurable: true,
      writable: true
    });
    
    Object.defineProperty(window, 'innerHeight', {
      value: 800,
      configurable: true,
      writable: true
    });
  }
  
  // Setup document with safe property assignment
  if (global.document) {
    Object.defineProperty(document, 'referrer', {
      value: '',
      configurable: true,
      writable: true
    });
  }
  
  // Setup performance API with writable properties
  Object.defineProperty(global, 'performance', {
    value: {
      now: vi.fn().mockReturnValue(Date.now()),
      getEntriesByType: vi.fn().mockReturnValue([]),
      memory: {
        usedJSHeapSize: 1024 * 1024,
        jsHeapSizeLimit: 10 * 1024 * 1024
      }
    },
    configurable: true,
    writable: true
  });
  
  // Setup speech recognition mocks
  setupSpeechRecognitionMocks();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  
  // Safe DOM cleanup - only if document and body exist
  if (typeof document !== 'undefined' && document.body && document.body.innerHTML !== undefined) {
    try {
      document.body.innerHTML = '';
    } catch (e) {
      // Ignore cleanup errors in test environment
    }
  }
});

// Global test utilities
global.testUtils = {
  // Wait for async operations to complete
  waitFor: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Create mock API response
  mockApiResponse: (data, success = true) => ({
    ok: success,
    status: success ? 200 : 500,
    json: () => Promise.resolve(success ? { success: true, data } : { success: false, error: 'API Error' })
  }),
  
  // Create mock DOM event
  mockEvent: (type, properties = {}) => ({
    type,
    target: properties.target || {},
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    ...properties
  }),

  // Setup common DOM structure for tests
  setupBasicDOM: () => {
    if (typeof document !== 'undefined' && document.body) {
      document.body.innerHTML = `
        <div id="test-container">
          <div id="loading-screen">
            <div class="progress-bar"></div>
            <div class="loading-text">Loading...</div>
          </div>
          <div id="app" class="hidden">
            <div id="toast-container"></div>
          </div>
        </div>
      `;
    }
  },

  // Safe property override for tests
  safeOverride: (object, property, value) => {
    const descriptor = Object.getOwnPropertyDescriptor(object, property);
    if (!descriptor || descriptor.configurable !== false) {
      Object.defineProperty(object, property, {
        value,
        configurable: true,
        writable: true
      });
      return true;
    }
    return false;
  }
};
