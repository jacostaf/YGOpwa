/**
 * Jest Setup Configuration
 * Global test environment setup for YGOpwa testing
 */

// Import Jest functions for ES module compatibility
import { jest } from '@jest/globals';

// Mock AbortSignal.timeout for Node.js compatibility
if (!AbortSignal.timeout) {
    AbortSignal.timeout = function(delay) {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), delay);
        return controller.signal;
    };
}

// Mock Web Speech API globally
class MockSpeechRecognition {
    constructor() {
        this.continuous = false;
        this.interimResults = false;
        this.lang = 'en-US';
        this.maxAlternatives = 1;
        
        this.onstart = null;
        this.onend = null;
        this.onresult = null;
        this.onerror = null;
        
        this.isStarted = false;
    }
    
    start() {
        this.isStarted = true;
        if (this.onstart) {
            setTimeout(() => this.onstart(), 10);
        }
    }
    
    stop() {
        this.isStarted = false;
        if (this.onend) {
            setTimeout(() => this.onend(), 10);
        }
    }
    
    abort() {
        this.isStarted = false;
        if (this.onend) {
            setTimeout(() => this.onend(), 10);
        }
    }
    
    // Test helpers
    simulateResult(transcript, confidence = 0.9) {
        if (this.onresult && this.isStarted) {
            const mockEvent = {
                results: [[{
                    transcript,
                    confidence,
                    isFinal: true
                }]],
                resultIndex: 0
            };
            this.onresult(mockEvent);
        }
    }
    
    simulateError(error = 'no-speech') {
        if (this.onerror && this.isStarted) {
            this.onerror({ error });
        }
    }
}

// Global mocks
global.window = global.window || {};
global.window.webkitSpeechRecognition = MockSpeechRecognition;
global.window.SpeechRecognition = MockSpeechRecognition;
global.window.isSecureContext = true;

// Mock Navigator
global.navigator = {
    userAgent: 'Mozilla/5.0 (Test Environment)',
    mediaDevices: {
        getUserMedia: jest.fn().mockResolvedValue({
            getTracks: jest.fn().mockReturnValue([
                { stop: jest.fn() }
            ])
        })
    },
    permissions: {
        query: jest.fn().mockResolvedValue({
            state: 'granted'
        })
    }
};

// Mock localStorage and IndexedDB
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};
global.localStorage = localStorageMock;

// Mock IndexedDB
global.indexedDB = {
    open: jest.fn(),
    deleteDatabase: jest.fn()
};

// Mock fetch for API calls
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
            success: true,
            data: {}
        })
    })
);

// Mock performance API
global.performance = {
    memory: {
        usedJSMemory: 1000000,
        totalJSMemory: 2000000,
        jsMemoryLimit: 4000000
    },
    now: jest.fn(() => Date.now())
};

// Console suppression for cleaner test output
const originalError = console.error;
const originalWarn = console.warn;

beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
});

afterEach(() => {
    jest.restoreAllMocks();
});

// Suppress console errors/warnings during tests unless specifically testing them
console.error = (...args) => {
    if (args[0] && typeof args[0] === 'string' && args[0].includes('TEST_ERROR')) {
        originalError(...args);
    }
};

console.warn = (...args) => {
    if (args[0] && typeof args[0] === 'string' && args[0].includes('TEST_WARN')) {
        originalWarn(...args);
    }
};