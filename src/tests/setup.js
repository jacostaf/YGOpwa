/**
 * Test Setup for Integration Tests
 * 
 * Provides common setup, utilities, and mocks for all integration tests
 */

import { vi, beforeEach, afterEach } from 'vitest';
import { setupSpeechRecognitionMocks } from './mockSpeechRecognition.js';

// Enable manual mocks
vi.mock('../js/utils/Logger.js');

// Mock localStorage
const createStorageMock = () => {
  let storage = {}; // Use let instead of const to allow reassignment
  
  const mock = {
    getItem: vi.fn((key) => storage[key] || null),
    setItem: vi.fn((key, value) => {
      storage[key] = String(value);
    }),
    removeItem: vi.fn((key) => {
      delete storage[key];
    }),
    clear: vi.fn(() => {
      // Reset the storage object and clear all references
      storage = {};
    }),
    key: vi.fn((index) => Object.keys(storage)[index] || null),
    get length() {
      return Object.keys(storage).length;
    },
    // Add reference to internal storage for debugging
    _storage: storage,
    // Method to reset storage reference
    _reset: () => {
      storage = {};
    }
  };
  
  return mock;
};

global.localStorage = createStorageMock();
global.sessionStorage = createStorageMock();

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
global.navigator = {
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
};

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

// Enhanced DOM element factory for UIManager DOM element mocking
function createMockDOMElement(tagName = 'div') {
    const element = {
        tagName: tagName.toUpperCase(),
        id: '',
        className: '',
        classList: {
            add: vi.fn(),
            remove: vi.fn(),
            toggle: vi.fn((className, force) => {
                const hasClass = element.className.includes(className);
                if (force === true || (force === undefined && !hasClass)) {
                    element.classList.add(className);
                    return true;
                } else if (force === false || (force === undefined && hasClass)) {
                    element.classList.remove(className);
                    return false;
                }
                return hasClass;
            }),
            contains: vi.fn((className) => element.className.includes(className))
        },
        style: {
            display: '',
            visibility: '',
            opacity: '',
            setProperty: vi.fn(),
            removeProperty: vi.fn(),
            getPropertyValue: vi.fn().mockReturnValue('')
        },
        dataset: {},
        innerHTML: '',
        textContent: '',
        value: '',
        checked: false,
        disabled: false,
        hidden: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        setAttribute: vi.fn((name, value) => {
            element[name] = value;
            if (name === 'class') element.className = value;
        }),
        getAttribute: vi.fn((attr) => {
            if (attr === 'id') return element.id;
            if (attr === 'class') return element.className;
            return element[attr] || null;
        }),
        removeAttribute: vi.fn((name) => {
            delete element[name];
            if (name === 'class') element.className = '';
        }),
        hasAttribute: vi.fn((name) => {
            if (name === 'class') return Boolean(element.className);
            return element[name] !== undefined;
        }),
        appendChild: vi.fn(),
        removeChild: vi.fn(),
        querySelector: vi.fn(),
        querySelectorAll: vi.fn(() => []),
        getBoundingClientRect: vi.fn(() => ({
            top: 0, left: 0, right: 100, bottom: 100, width: 100, height: 100
        })),
        scrollIntoView: vi.fn(),
        focus: vi.fn(),
        blur: vi.fn(),
        click: vi.fn(),
        remove: vi.fn(),
        toggleAttribute: vi.fn(),
        title: '',
        parentNode: null,
        children: [],
        firstChild: null,
        lastChild: null
    };
    return element;
}

// Override document methods to return properly mocked elements for UIManager
global.document.getElementById = vi.fn((id) => {
    if (id) {
        const element = createMockDOMElement('div');
        element.id = id;
        return element;
    }
    return null;
});

global.document.querySelector = vi.fn((selector) => {
    if (selector) {
        const element = createMockDOMElement('div');
        return element;
    }
    return null;
});

global.document.querySelectorAll = vi.fn((selector) => {
    if (selector) {
        // Return array of mock elements for common selectors
        if (selector === '.tab-btn' || selector === '.tab-panel') {
            return [createMockDOMElement('div'), createMockDOMElement('div')];
        }
        return [createMockDOMElement('div')];
    }
    return [];
});

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn().mockImplementation((cb) => {
  setTimeout(cb, 0);
});

global.cancelAnimationFrame = vi.fn();

// Global setup for all tests
beforeEach(() => {
  // Reset all mocks
  vi.clearAllMocks();
  
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