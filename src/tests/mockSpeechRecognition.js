/**
 * Mock Speech Recognition API for Testing
 * 
 * Provides comprehensive mocks for Web Speech API testing
 */

import { vi } from 'vitest';

export function setupSpeechRecognitionMocks() {
  // Mock SpeechRecognitionEvent
  global.SpeechRecognitionEvent = vi.fn().mockImplementation((type, eventInitDict) => ({
    type,
    results: eventInitDict?.results || [],
    resultIndex: eventInitDict?.resultIndex || 0,
    interpretation: eventInitDict?.interpretation || null,
    emma: eventInitDict?.emma || null
  }));

  // Mock SpeechRecognitionResult
  global.SpeechRecognitionResult = vi.fn().mockImplementation(() => ({
    length: 1,
    item: vi.fn(),
    0: {
      transcript: 'mock transcript',
      confidence: 0.9
    }
  }));

  // Mock SpeechRecognitionAlternative
  global.SpeechRecognitionAlternative = vi.fn().mockImplementation(() => ({
    transcript: 'mock transcript',
    confidence: 0.9
  }));

  // Mock SpeechRecognitionError
  global.SpeechRecognitionErrorEvent = vi.fn().mockImplementation((type, eventInitDict) => ({
    type,
    error: eventInitDict?.error || 'network',
    message: eventInitDict?.message || 'Mock error'
  }));

  // Enhanced SpeechRecognition mock with realistic behavior
  const createSpeechRecognitionMock = () => {
    const instance = {
      continuous: false,
      grammars: null,
      interimResults: false,
      lang: 'en-US',
      maxAlternatives: 1,
      serviceURI: '',
      
      // Event handlers
      onaudioend: null,
      onaudiostart: null,
      onend: null,
      onerror: null,
      onnomatch: null,
      onresult: null,
      onsoundend: null,
      onsoundstart: null,
      onspeechend: null,
      onspeechstart: null,
      onstart: null,
      
      // Methods
      start: vi.fn().mockImplementation(function() {
        // Simulate starting recognition
        setTimeout(() => {
          if (this.onstart) this.onstart();
          if (this.onaudiostart) this.onaudiostart();
          if (this.onspeechstart) this.onspeechstart();
        }, 10);
        
        // Simulate result after delay
        setTimeout(() => {
          if (this.onresult) {
            const mockEvent = {
              type: 'result',
              results: [{
                0: { transcript: 'blue eyes white dragon', confidence: 0.9 },
                length: 1,
                isFinal: true
              }],
              resultIndex: 0
            };
            this.onresult(mockEvent);
          }
        }, 100);
        
        // Simulate end
        setTimeout(() => {
          if (this.onspeechend) this.onspeechend();
          if (this.onaudioend) this.onaudioend();
          if (this.onend) this.onend();
        }, 200);
      }),
      
      stop: vi.fn().mockImplementation(function() {
        setTimeout(() => {
          if (this.onend) this.onend();
        }, 10);
      }),
      
      abort: vi.fn().mockImplementation(function() {
        setTimeout(() => {
          if (this.onend) this.onend();
        }, 10);
      }),
      
      addEventListener: vi.fn().mockImplementation(function(event, handler) {
        this[`on${event}`] = handler;
      }),
      
      removeEventListener: vi.fn().mockImplementation(function(event, handler) {
        if (this[`on${event}`] === handler) {
          this[`on${event}`] = null;
        }
      }),
      
      dispatchEvent: vi.fn()
    };
    
    return instance;
  };

  global.SpeechRecognition = vi.fn().mockImplementation(createSpeechRecognitionMock);
  global.webkitSpeechRecognition = global.SpeechRecognition;
}