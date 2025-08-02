/**
 * Validation test for mock infrastructure
 * Ensures all mocks are working correctly before proceeding with component tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { setupSpeechRecognitionMocks } from '../fixtures/mockSpeechRecognition.js';
import { setupStorageMocks } from '../fixtures/mockStorage.js';
import { mockApiResponses } from '../fixtures/mockApiResponses.js';

describe('Mock Infrastructure Validation', () => {
  let mockRecognition, mockStorage;
  
  beforeEach(() => {
    mockRecognition = setupSpeechRecognitionMocks();
    mockStorage = setupStorageMocks();
  });

  describe('Speech Recognition Mocks', () => {
    it('should create mock speech recognition instance', () => {
      const recognition = new window.webkitSpeechRecognition();
      expect(recognition).toBeDefined();
      expect(recognition.start).toBeDefined();
      expect(recognition.stop).toBeDefined();
      expect(recognition.continuous).toBe(true);
    });

    it('should handle speech recognition events', () => {
      const recognition = new window.webkitSpeechRecognition();
      let resultReceived = false;
      
      recognition.onresult = () => {
        resultReceived = true;
      };
      
      recognition._triggerResult('success');
      expect(resultReceived).toBe(true);
    });

    it('should handle speech recognition errors', () => {
      const recognition = new window.webkitSpeechRecognition();
      let errorReceived = false;
      
      recognition.onerror = () => {
        errorReceived = true;
      };
      
      recognition._triggerError('network');
      expect(errorReceived).toBe(true);
    });
  });

  describe('IndexedDB Mocks', () => {
    it('should open database successfully', async () => {
      const request = await indexedDB.open('testDB', 1);
      expect(request.result).toBeDefined();
      expect(request.result.name).toBe('YGORipperDB');
    });

    it('should create and use object stores', async () => {
      const request = await indexedDB.open('testDB', 1);
      const db = request.result;
      
      const store = db.createObjectStore('testStore');
      expect(store).toBeDefined();
      expect(store.add).toBeDefined();
      expect(store.get).toBeDefined();
    });

    it('should handle data operations', async () => {
      const request = await indexedDB.open('testDB', 1);
      const db = request.result;
      const store = db.createObjectStore('testStore');
      
      await store.add({ id: 'test1', data: 'value1' });
      const result = await store.get('test1');
      
      expect(result).toEqual({ id: 'test1', data: 'value1' });
    });
  });

  describe('Service Worker Mocks', () => {
    it('should register service worker', async () => {
      const registration = await navigator.serviceWorker.register('/sw.js');
      expect(registration).toBeDefined();
      expect(registration.scope).toBe('http://localhost:3000/');
    });

    it('should handle cache operations', async () => {
      const cache = await caches.open('test-cache');
      expect(cache).toBeDefined();
      
      await cache.add('/test-url');
      const cached = await cache.match('/test-url');
      expect(cached).toBeDefined();
    });
  });

  describe('API Response Mocks', () => {
    it('should provide card sets data', () => {
      const cardSets = mockApiResponses.cardSets.success;
      expect(cardSets.success).toBe(true);
      expect(cardSets.data).toBeInstanceOf(Array);
      expect(cardSets.data.length).toBeGreaterThan(0);
    });

    it('should provide price check data', () => {
      const priceCheck = mockApiResponses.priceCheck.success;
      expect(priceCheck.success).toBe(true);
      expect(priceCheck.data.cardName).toBe('Blue-Eyes White Dragon');
      expect(priceCheck.data.prices).toBeDefined();
    });

    it('should provide error responses', () => {
      const error = mockApiResponses.cardSets.error;
      expect(error.success).toBe(false);
      expect(error.error).toBeDefined();
    });
  });

  describe('Browser API Mocks', () => {
    it('should mock fetch API', async () => {
      const response = await fetch('/api/test');
      expect(response).toBeDefined();
      expect(response.ok).toBe(true);
    });

    it('should mock localStorage', () => {
      localStorage.setItem('test', 'value');
      expect(localStorage.getItem('test')).toBe('value');
    });

    it('should mock navigator permissions', async () => {
      const permission = await navigator.permissions.query({ name: 'microphone' });
      expect(permission.state).toBe('granted');
    });
  });
});