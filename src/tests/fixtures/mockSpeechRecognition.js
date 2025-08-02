/**
 * Mock helpers for Web Speech API testing
 * Provides realistic speech recognition mocking for consistent testing
 */

import { vi } from 'vitest';
import { mockVoiceResults } from './mockApiResponses.js';

/**
 * Create a mock SpeechRecognition instance
 */
export function createMockSpeechRecognition() {
  const mockRecognition = {
    continuous: true,
    interimResults: true,
    lang: 'en-US',
    maxAlternatives: 5,
    serviceURI: '',
    grammars: null,
    
    // Event handlers
    onaudiostart: null,
    onaudioend: null,
    onend: null,
    onerror: null,
    onnomatch: null,
    onresult: null,
    onsoundstart: null,
    onsoundend: null,
    onspeechstart: null,
    onspeechend: null,
    onstart: null,
    
    // Methods
    start: vi.fn(),
    stop: vi.fn(),
    abort: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    
    // Mock control methods
    _triggerStart: function() {
      if (this.onstart) this.onstart();
      this._fireEvent('start');
    },
    
    _triggerResult: function(resultType = 'success') {
      const result = mockVoiceResults[resultType];
      const event = {
        results: [{
          0: { transcript: result.transcript, confidence: result.confidence },
          isFinal: result.isFinal,
          length: 1
        }],
        resultIndex: 0
      };
      
      if (this.onresult) this.onresult(event);
      this._fireEvent('result', event);
    },
    
    _triggerError: function(errorType = 'network') {
      const event = {
        error: errorType,
        message: `Speech recognition error: ${errorType}`
      };
      
      if (this.onerror) this.onerror(event);
      this._fireEvent('error', event);
    },
    
    _triggerEnd: function() {
      if (this.onend) this.onend();
      this._fireEvent('end');
    },
    
    _fireEvent: function(type, data = {}) {
      // Simulate event firing for addEventListener
      const listeners = this._listeners || {};
      if (listeners[type]) {
        listeners[type].forEach(callback => callback(data));
      }
    },
    
    // Override addEventListener to track listeners
    addEventListener: vi.fn().mockImplementation(function(type, callback) {
      if (!this._listeners) this._listeners = {};
      if (!this._listeners[type]) this._listeners[type] = [];
      this._listeners[type].push(callback);
    }),
    
    removeEventListener: vi.fn().mockImplementation(function(type, callback) {
      if (!this._listeners || !this._listeners[type]) return;
      const index = this._listeners[type].indexOf(callback);
      if (index > -1) {
        this._listeners[type].splice(index, 1);
      }
    })
  };
  
  return mockRecognition;
}

/**
 * Mock permissions for speech recognition
 */
export function mockSpeechPermissions(granted = true) {
  global.navigator.permissions = {
    query: vi.fn().mockImplementation((descriptor) => {
      if (descriptor.name === 'microphone') {
        return Promise.resolve({
          state: granted ? 'granted' : 'denied',
          addEventListener: vi.fn(),
          removeEventListener: vi.fn()
        });
      }
      return Promise.resolve({ state: 'granted' });
    })
  };
  
  global.navigator.mediaDevices = {
    getUserMedia: vi.fn().mockImplementation(() => {
      if (granted) {
        return Promise.resolve({
          getTracks: vi.fn().mockReturnValue([{
            stop: vi.fn(),
            enabled: true,
            kind: 'audio'
          }])
        });
      } else {
        return Promise.reject(new Error('Permission denied'));
      }
    }),
    enumerateDevices: vi.fn().mockResolvedValue([
      { kind: 'audioinput', deviceId: 'default', label: 'Default Microphone' }
    ])
  };
}

/**
 * Setup comprehensive speech recognition mocking
 */
export function setupSpeechRecognitionMocks() {
  const mockRecognition = createMockSpeechRecognition();
  
  global.webkitSpeechRecognition = vi.fn().mockImplementation(() => mockRecognition);
  global.SpeechRecognition = global.webkitSpeechRecognition;
  
  // Check if speech recognition is supported
  global.speechRecognitionSupported = true;
  
  mockSpeechPermissions(true);
  
  return mockRecognition;
}