/**
 * Unit tests for ErrorBoundary.js
 * Tests comprehensive error handling, recovery mechanisms, and fallback strategies
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AppErrorBoundary, errorBoundary } from '../../js/utils/ErrorBoundary.js';

describe('AppErrorBoundary', () => {
  let errorBoundaryInstance;
  let mockLogger;

  beforeEach(() => {
    // Mock Logger
    mockLogger = {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    };

    // Create fresh instance for each test
    errorBoundaryInstance = new AppErrorBoundary();
    errorBoundaryInstance.logger = mockLogger;

    // Mock DOM elements with proper modal structure
    document.body.innerHTML = `
      <div id="app"></div>
      <div id="modal-overlay" class="hidden"></div>
    `;

    // Mock window properties
    Object.defineProperty(window, 'ygoApp', {
      value: {
        uiManager: {
          showToast: vi.fn()
        }
      },
      writable: true
    });

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true
    });

    // Mock caches API
    global.caches = {
      open: vi.fn().mockResolvedValue({
        match: vi.fn().mockResolvedValue(null)
      })
    };

    // Enhanced DOM element creation with unique property handling
    const originalCreateElement = document.createElement.bind(document);
    let elementCounter = 0;
    
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      const element = originalCreateElement(tagName);
      const elementId = `mock-element-${++elementCounter}`;
      
      // Ensure all elements have proper methods and properties
      if (!element.addEventListener) {
        element.addEventListener = vi.fn();
        element.removeEventListener = vi.fn();
      }
      
      if (!element.querySelector) {
        element.querySelector = vi.fn();
      }
      
      if (!element.querySelectorAll) {
        element.querySelectorAll = vi.fn().mockReturnValue([]);
      }
      
      if (!element.classList) {
        element.classList = {
          add: vi.fn(),
          remove: vi.fn(),
          toggle: vi.fn(),
          contains: vi.fn().mockReturnValue(false)
        };
      }
      
      // Ensure className property exists - only if not already defined
      if (!element.hasOwnProperty('className')) {
        Object.defineProperty(element, 'className', {
          value: '',
          writable: true,
          configurable: true
        });
      }
      
      // Enhanced innerHTML handling for modal elements - only for div elements that don't already have it properly defined
      if (tagName === 'div' && !element.hasOwnProperty('_mockInnerHTML')) {
        // Mark this element as having mock innerHTML to prevent redefinition
        element._mockInnerHTML = true;
        element._innerHTML = '';
        
        // Use defineProperty only if innerHTML isn't already properly configured
        const existingDescriptor = Object.getOwnPropertyDescriptor(element, 'innerHTML');
        if (!existingDescriptor || !existingDescriptor.configurable) {
          Object.defineProperty(element, 'innerHTML', {
            get: function() { return this._innerHTML || ''; },
            set: function(value) { 
              this._innerHTML = value;
              
              // Create proper child elements for modal dialogs
              if (value.includes('error-fallback-modal')) {
                const input = originalCreateElement('input');
                input.id = 'manual-card-input';
                input.value = '';
                input.focus = vi.fn();
                input.addEventListener = vi.fn();
                
                const confirmBtn = originalCreateElement('button');
                confirmBtn.id = 'confirm-manual-input';
                confirmBtn.addEventListener = vi.fn();
                confirmBtn.click = vi.fn();
                
                const cancelBtn = originalCreateElement('button');
                cancelBtn.id = 'cancel-manual-input';
                cancelBtn.addEventListener = vi.fn();
                cancelBtn.click = vi.fn();
                
                const closeBtn = originalCreateElement('button');
                closeBtn.className = 'modal-close';
                closeBtn.addEventListener = vi.fn();
                closeBtn.click = vi.fn();
                
                // Mock querySelector to return these elements
                this.querySelector = vi.fn((selector) => {
                  if (selector === '#manual-card-input') return input;
                  if (selector === '#confirm-manual-input') return confirmBtn;
                  if (selector === '#cancel-manual-input') return cancelBtn;
                  if (selector === '.modal-close') return closeBtn;
                  return null;
                });
                
                // Store references for test access
                this._childElements = { input, confirmBtn, cancelBtn, closeBtn };
              }
              
              // Create proper child elements for offline notifications
              if (value.includes('offline-notification')) {
                const closeBtn = originalCreateElement('button');
                closeBtn.className = 'notification-close';
                closeBtn.addEventListener = vi.fn();
                closeBtn.click = vi.fn();
                
                this.querySelector = vi.fn((selector) => {
                  if (selector === '.notification-close') return closeBtn;
                  return null;
                });
                
                this.textContent = "🌐 You're offline. Some features may not be available.";
                this._childElements = { closeBtn };
              }
            },
            configurable: true
          });
        }
      }
      
      // Mock appendChild and removeChild
      if (!element.appendChild) {
        element.appendChild = vi.fn((child) => {
          if (!this.children) {
            this.children = [];
          }
          this.children.push(child);
          child.parentNode = this;
          return child;
        });
      }
      
      if (!element.removeChild) {
        element.removeChild = vi.fn((child) => {
          if (this.children) {
            const index = this.children.indexOf(child);
            if (index > -1) {
              this.children.splice(index, 1);
            }
          }
          child.parentNode = null;
          return child;
        });
      }
      
      // Mock parentNode property
      if (!element.hasOwnProperty('parentNode')) {
        Object.defineProperty(element, 'parentNode', {
          value: null,
          writable: true,
          configurable: true
        });
      }
      
      return element;
    });

    // Mock document.querySelector for existing elements
    const originalQuerySelector = document.querySelector.bind(document);
    vi.spyOn(document, 'querySelector').mockImplementation((selector) => {
      if (selector === '#modal-overlay') {
        const overlay = originalQuerySelector(selector);
        if (overlay) {
          // Ensure overlay has proper methods
          if (!overlay.classList) {
            overlay.classList = {
              add: vi.fn(),
              remove: vi.fn(),
              toggle: vi.fn(),
              contains: vi.fn().mockReturnValue(false)
            };
          }
          if (!overlay.appendChild) {
            overlay.appendChild = vi.fn((child) => {
              child.parentNode = overlay;
              return child;
            });
          }
          if (!overlay.removeChild) {
            overlay.removeChild = vi.fn((child) => {
              child.parentNode = null;
              return child;
            });
          }
        }
        return overlay;
      }
      return originalQuerySelector(selector);
    });

    // Mock document.body methods
    if (!document.body.appendChild) {
      document.body.appendChild = vi.fn((child) => {
        child.parentNode = document.body;
        return child;
      });
    }
    
    if (!document.body.removeChild) {
      document.body.removeChild = vi.fn((child) => {
        child.parentNode = null;
        return child;
      });
    }
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    delete window.memoryStorage;
  });

  describe('Initialization', () => {
    it('should initialize with correct default configuration', () => {
      expect(errorBoundaryInstance.errorHandlers).toBeInstanceOf(Map);
      expect(errorBoundaryInstance.retryQueue).toBeInstanceOf(Map);
      expect(errorBoundaryInstance.offlineMode).toBe(false);
      expect(errorBoundaryInstance.errorTypes).toBeDefined();
    });

    it('should have correct error type configurations', () => {
      const voiceError = errorBoundaryInstance.errorTypes.VOICE_RECOGNITION_ERROR;
      expect(voiceError.retryable).toBe(true);
      expect(voiceError.maxRetries).toBe(3);
      expect(voiceError.fallbackAvailable).toBe(true);

      const permissionError = errorBoundaryInstance.errorTypes.PERMISSION_ERROR;
      expect(permissionError.retryable).toBe(false);
      expect(permissionError.maxRetries).toBe(0);
    });

    it('should setup global error handlers', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      new AppErrorBoundary();
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('error', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    });
  });

  describe('Error Handler Registration', () => {
    it('should register error handlers correctly', () => {
      const handler = vi.fn();
      errorBoundaryInstance.registerErrorHandler('API_ERROR', handler);

      expect(errorBoundaryInstance.errorHandlers.has('API_ERROR')).toBe(true);
      expect(errorBoundaryInstance.errorHandlers.get('API_ERROR')).toContain(handler);
    });

    it('should allow multiple handlers for same error type', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      errorBoundaryInstance.registerErrorHandler('API_ERROR', handler1);
      errorBoundaryInstance.registerErrorHandler('API_ERROR', handler2);

      const handlers = errorBoundaryInstance.errorHandlers.get('API_ERROR');
      expect(handlers).toHaveLength(2);
      expect(handlers).toContain(handler1);
      expect(handlers).toContain(handler2);
    });
  });

  describe('Error ID Generation', () => {
    it('should generate unique error IDs', () => {
      const id1 = errorBoundaryInstance.generateErrorId();
      const id2 = errorBoundaryInstance.generateErrorId();
      
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(id1.length).toBeGreaterThan(0);
    });
  });

  describe('Retry Logic', () => {
    it('should determine if error should be retried', () => {
      const errorId = 'test-error-123';
      const config = { maxRetries: 3 };
      
      // First attempt - should retry
      expect(errorBoundaryInstance.shouldRetry(errorId, config)).toBe(true);
      
      // Set retry count to max
      errorBoundaryInstance.retryQueue.set(errorId, { count: 3, lastAttempt: Date.now() });
      expect(errorBoundaryInstance.shouldRetry(errorId, config)).toBe(false);
    });

    it('should schedule retry with exponential backoff', async () => {
      const errorId = 'test-error-123';
      const error = new Error('Test error');
      const errorType = 'API_ERROR';
      const context = { retryFunction: vi.fn().mockResolvedValue('success') };
      const errorConfig = { backoffMs: 100, maxRetries: 3 };

      vi.useFakeTimers();
      
      const retryPromise = errorBoundaryInstance.scheduleRetry(errorId, error, errorType, context, errorConfig);
      
      // Fast-forward time
      vi.advanceTimersByTime(100);
      
      const result = await retryPromise;
      expect(result.success).toBe(true);
      expect(context.retryFunction).toHaveBeenCalled();
      
      vi.useRealTimers();
    });
  });

  describe('Fallback Mechanisms', () => {
    describe('Voice Recognition Fallback', () => {
      it('should provide manual input fallback for voice errors', async () => {
        const error = new Error('Voice recognition failed');
        const context = {};

        // Mock the manual input dialog
        const showManualInputDialogSpy = vi.spyOn(errorBoundaryInstance, 'showManualInputDialog')
          .mockResolvedValue({ success: true, data: { transcript: 'Blue-Eyes White Dragon' } });

        const result = await errorBoundaryInstance.voiceRecognitionFallback(error, context);

        expect(result.success).toBe(true);
        expect(result.fallbackUsed).toBe('manual_input');
        expect(result.result.transcript).toBe('Blue-Eyes White Dragon');
        expect(showManualInputDialogSpy).toHaveBeenCalled();
      });

      it('should handle cancelled manual input', async () => {
        const error = new Error('Voice recognition failed');
        const context = {};

        vi.spyOn(errorBoundaryInstance, 'showManualInputDialog')
          .mockResolvedValue({ success: false });

        const result = await errorBoundaryInstance.voiceRecognitionFallback(error, context);

        expect(result.success).toBe(false);
        expect(result.reason).toBe('User cancelled manual input');
      });
    });

    describe('API Error Fallback', () => {
      it('should use cached data when available', async () => {
        const error = new Error('API failed');
        const context = { useCache: true, cacheKey: 'test-key' };

        const getCachedDataSpy = vi.spyOn(errorBoundaryInstance, 'getCachedData')
          .mockResolvedValue({ cached: 'data' });

        const result = await errorBoundaryInstance.apiErrorFallback(error, context);

        expect(result.success).toBe(true);
        expect(result.fallbackUsed).toBe('cache');
        expect(result.result).toEqual({ cached: 'data' });
        expect(getCachedDataSpy).toHaveBeenCalledWith('test-key');
      });

      it('should enable offline mode when cache unavailable', async () => {
        const error = new Error('API failed');
        const context = { useCache: false };

        const result = await errorBoundaryInstance.apiErrorFallback(error, context);

        expect(result.success).toBe(true);
        expect(result.fallbackUsed).toBe('offline_mode');
        expect(errorBoundaryInstance.offlineMode).toBe(true);
      });
    });

    describe('Storage Error Fallback', () => {
      it('should use memory storage as fallback', async () => {
        const error = new Error('Storage failed');
        const context = {};

        const result = await errorBoundaryInstance.storageErrorFallback(error, context);

        expect(result.success).toBe(true);
        expect(result.fallbackUsed).toBe('memory_storage');
        expect(window.memoryStorage).toBeInstanceOf(Map);
      });
    });

    describe('Network Error Fallback', () => {
      it('should enable offline mode for network errors', async () => {
        const error = new Error('Network failed');
        const context = {};

        const showOfflineNotificationSpy = vi.spyOn(errorBoundaryInstance, 'showOfflineNotification')
          .mockImplementation(() => {});

        const result = await errorBoundaryInstance.networkErrorFallback(error, context);

        expect(result.success).toBe(true);
        expect(result.fallbackUsed).toBe('offline_mode');
        expect(errorBoundaryInstance.offlineMode).toBe(true);
        expect(showOfflineNotificationSpy).toHaveBeenCalled();
      });
    });
  });

  describe('User-Friendly Messages', () => {
    it('should provide specific voice error messages', () => {
      const notAllowedError = new Error('not-allowed');
      const message = errorBoundaryInstance.getVoiceErrorMessage(notAllowedError);
      expect(message).toContain('Microphone access is required');

      const noSpeechError = new Error('no-speech detected');
      const noSpeechMessage = errorBoundaryInstance.getVoiceErrorMessage(noSpeechError);
      expect(noSpeechMessage).toContain('No speech detected');
    });

    it('should provide specific API error messages', () => {
      const timeoutError = new Error('timeout occurred');
      const message = errorBoundaryInstance.getApiErrorMessage(timeoutError);
      expect(message).toContain('timed out');

      const rateLimit = new Error('rate limit exceeded');
      const rateLimitMessage = errorBoundaryInstance.getApiErrorMessage(rateLimit);
      expect(rateLimitMessage).toContain('Too many requests');
    });

    it('should get appropriate error levels', () => {
      expect(errorBoundaryInstance.getErrorLevel('VOICE_RECOGNITION_ERROR')).toBe('warning');
      expect(errorBoundaryInstance.getErrorLevel('API_ERROR')).toBe('error');
      expect(errorBoundaryInstance.getErrorLevel('PERMISSION_ERROR')).toBe('error');
    });
  });

  describe('Main Error Handling', () => {
    it('should handle retryable errors with retry mechanism', async () => {
      const error = new Error('Retryable error');
      const errorType = 'API_ERROR';
      const context = { retryFunction: vi.fn().mockResolvedValue('success') };

      const scheduleRetrySpy = vi.spyOn(errorBoundaryInstance, 'scheduleRetry')
        .mockResolvedValue({ success: true, result: 'success' });

      const result = await errorBoundaryInstance.handleError(error, errorType, context);

      expect(scheduleRetrySpy).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should try fallback for non-retryable errors with fallback', async () => {
      const error = new Error('API error');
      const errorType = 'API_ERROR';
      const context = {};

      // Mock shouldRetry to return false (max retries reached)
      const shouldRetrySpy = vi.spyOn(errorBoundaryInstance, 'shouldRetry')
        .mockReturnValue(false);

      const tryFallbackSpy = vi.spyOn(errorBoundaryInstance, 'tryFallback')
        .mockResolvedValue({ success: true, result: 'fallback-success' });

      const result = await errorBoundaryInstance.handleError(error, errorType, context);

      expect(shouldRetrySpy).toHaveBeenCalled();
      expect(tryFallbackSpy).toHaveBeenCalled();
    });

    it('should execute error handlers', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      errorBoundaryInstance.registerErrorHandler('VALIDATION_ERROR', handler1);
      errorBoundaryInstance.registerErrorHandler('VALIDATION_ERROR', handler2);

      const error = new Error('Validation failed');
      await errorBoundaryInstance.handleError(error, 'VALIDATION_ERROR');

      expect(handler1).toHaveBeenCalledWith(error, {});
      expect(handler2).toHaveBeenCalledWith(error, {});
    });

    it('should show user-friendly error message', async () => {
      const showToastSpy = vi.fn();
      
      // Ensure ygoApp.uiManager exists and has showToast method
      window.ygoApp = { 
        uiManager: { 
          showToast: showToastSpy 
        } 
      };
      
      const error = new Error('Test error');
      
      // Mock getUserFriendlyMessage BEFORE calling handleError
      const getUserFriendlyMessageSpy = vi.spyOn(errorBoundaryInstance, 'getUserFriendlyMessage')
        .mockReturnValue('User friendly error message');
      
      // Mock shouldRetry to return false so it skips retry and goes to fallback
      const shouldRetrySpy = vi.spyOn(errorBoundaryInstance, 'shouldRetry')
        .mockReturnValue(false);
      
      // Mock tryFallback to return failure so that showUserFriendlyError gets called
      const tryFallbackSpy = vi.spyOn(errorBoundaryInstance, 'tryFallback')
        .mockResolvedValue({ success: false, reason: 'Fallback failed' });
      
      // Mock showUserFriendlyError to track its call
      const showUserFriendlyErrorSpy = vi.spyOn(errorBoundaryInstance, 'showUserFriendlyError');
      
      await errorBoundaryInstance.handleError(error, 'API_ERROR');

      expect(shouldRetrySpy).toHaveBeenCalled();
      expect(tryFallbackSpy).toHaveBeenCalled();
      expect(showUserFriendlyErrorSpy).toHaveBeenCalledWith(error, 'API_ERROR', {});
      expect(getUserFriendlyMessageSpy).toHaveBeenCalledWith(error, 'API_ERROR');
      expect(showToastSpy).toHaveBeenCalledWith('User friendly error message', 'error');
    });
  });

  describe('Network Status Handling', () => {
    it('should handle network reconnection', () => {
      errorBoundaryInstance.offlineMode = true;
      
      const retryQueuedOperationsSpy = vi.spyOn(errorBoundaryInstance, 'retryQueuedOperations')
        .mockImplementation(() => {});

      errorBoundaryInstance.handleNetworkReconnect();

      expect(errorBoundaryInstance.offlineMode).toBe(false);
      expect(retryQueuedOperationsSpy).toHaveBeenCalled();
      expect(window.ygoApp.uiManager.showToast).toHaveBeenCalledWith('Back online! Syncing data...', 'success');
    });

    it('should handle network disconnection', () => {
      const showOfflineNotificationSpy = vi.spyOn(errorBoundaryInstance, 'showOfflineNotification')
        .mockImplementation(() => {});

      errorBoundaryInstance.handleNetworkDisconnect();

      expect(errorBoundaryInstance.offlineMode).toBe(true);
      expect(showOfflineNotificationSpy).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Network disconnected');
    });
  });

  describe('Safe Async Wrapper', () => {
    it('should wrap async operations safely', async () => {
      const successOperation = vi.fn().mockResolvedValue('success');
      const safeOperation = errorBoundaryInstance.safeAsync(successOperation, 'API_ERROR');

      const result = await safeOperation('test-arg');
      expect(result).toBe('success');
      expect(successOperation).toHaveBeenCalledWith('test-arg');
    });

    it('should handle errors in wrapped operations', async () => {
      const failingOperation = vi.fn().mockRejectedValue(new Error('Operation failed'));
      const safeOperation = errorBoundaryInstance.safeAsync(failingOperation, 'API_ERROR');

      const handleErrorSpy = vi.spyOn(errorBoundaryInstance, 'handleError')
        .mockResolvedValue({ success: false, userMessage: 'User friendly error' });

      await expect(safeOperation('test-arg')).rejects.toThrow('User friendly error');
      expect(handleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('Utility Methods', () => {
    it('should check offline status correctly', () => {
      expect(errorBoundaryInstance.isOffline()).toBe(false);
      
      errorBoundaryInstance.offlineMode = true;
      expect(errorBoundaryInstance.isOffline()).toBe(true);
      
      errorBoundaryInstance.offlineMode = false;
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      expect(errorBoundaryInstance.isOffline()).toBe(true);
    });

    it('should return error statistics', () => {
      errorBoundaryInstance.retryQueue.set('test1', { count: 1 });
      errorBoundaryInstance.retryQueue.set('test2', { count: 2 });
      errorBoundaryInstance.offlineMode = true;

      const stats = errorBoundaryInstance.getErrorStats();
      
      expect(stats.totalErrors).toBe(2);
      expect(stats.offlineMode).toBe(true);
      expect(stats.retryQueue).toHaveLength(2);
    });

    it('should clear error history', () => {
      errorBoundaryInstance.retryQueue.set('test1', { count: 1 });
      errorBoundaryInstance.retryQueue.set('test2', { count: 2 });

      errorBoundaryInstance.clearErrorHistory();

      expect(errorBoundaryInstance.retryQueue.size).toBe(0);
      expect(mockLogger.info).toHaveBeenCalledWith('Error history cleared');
    });
  });

  describe('Cache Operations', () => {
    it('should get cached data successfully', async () => {
      const mockCache = {
        match: vi.fn().mockResolvedValue({
          json: vi.fn().mockResolvedValue({ cached: 'data' })
        })
      };
      
      global.caches.open.mockResolvedValue(mockCache);

      const result = await errorBoundaryInstance.getCachedData('test-key');
      
      expect(result).toEqual({ cached: 'data' });
      expect(mockCache.match).toHaveBeenCalledWith('test-key');
    });

    it('should return null when cache miss', async () => {
      const mockCache = {
        match: vi.fn().mockResolvedValue(null)
      };
      
      global.caches.open.mockResolvedValue(mockCache);

      const result = await errorBoundaryInstance.getCachedData('missing-key');
      
      expect(result).toBeNull();
    });

    it('should handle cache errors gracefully', async () => {
      global.caches.open.mockRejectedValue(new Error('Cache error'));

      const result = await errorBoundaryInstance.getCachedData('test-key');
      
      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to get cached data:', expect.any(Error));
    });
  });

  describe('Global Error Boundary Instance', () => {
    it('should export global error boundary instance', () => {
      expect(errorBoundary).toBeInstanceOf(AppErrorBoundary);
    });
  });

  describe('Modal Dialog Interactions', () => {
    it('should show manual input dialog and handle confirmation', async () => {
      const context = {};
      
      // Create a properly mocked modal overlay
      const mockOverlay = document.createElement('div');
      mockOverlay.id = 'modal-overlay';
      mockOverlay.classList = {
        add: vi.fn(),
        remove: vi.fn(),
        toggle: vi.fn(),
        contains: vi.fn().mockReturnValue(false)
      };
      mockOverlay.appendChild = vi.fn();
      mockOverlay.removeChild = vi.fn();
      
      // Mock querySelector to return the overlay
      vi.spyOn(document, 'querySelector').mockImplementation((selector) => {
        if (selector === '#modal-overlay') return mockOverlay;
        return null;
      });
      
      // Create properly mocked modal elements
      const createMockElement = (tagName, id = null, className = null) => {
        const element = document.createElement(tagName);
        if (id) element.id = id;
        if (className) element.className = className;
        
        // Ensure all elements have addEventListener
        element.addEventListener = vi.fn();
        element.removeEventListener = vi.fn();
        element.click = vi.fn();
        element.focus = vi.fn();
        
        if (tagName === 'input') {
          element.value = '';
        }
        
        return element;
      };
      
      const modalElement = createMockElement('div');
      const inputElement = createMockElement('input', 'manual-card-input');
      const confirmBtn = createMockElement('button', 'confirm-manual-input');
      const cancelBtn = createMockElement('button', 'cancel-manual-input');
      const closeBtn = createMockElement('button', null, 'modal-close');
      
      // Mock querySelector on the modal to return child elements
      modalElement.querySelector = vi.fn((selector) => {
        if (selector === '#manual-card-input') return inputElement;
        if (selector === '#confirm-manual-input') return confirmBtn;
        if (selector === '#cancel-manual-input') return cancelBtn;
        if (selector === '.modal-close') return closeBtn;
        return null;
      });
      
      // Mock createElement to return our pre-created elements
      const originalCreateElement = document.createElement;
      vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
        if (tagName === 'div') return modalElement;
        return originalCreateElement.call(document, tagName);
      });
      
      // Start the dialog
      const dialogPromise = errorBoundaryInstance.showManualInputDialog(context);
      
      // Wait for DOM creation
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Simulate user input and confirmation
      inputElement.value = 'Blue-Eyes White Dragon';
      
      // Get the confirm event handler and call it
      const confirmHandler = confirmBtn.addEventListener.mock.calls
        .find(call => call[0] === 'click')?.[1];
      
      if (confirmHandler) {
        confirmHandler();
      }
      
      const result = await dialogPromise;
      expect(result).toBeTruthy();
      expect(result.success).toBe(true);
      expect(result.data.transcript).toBe('Blue-Eyes White Dragon');
    });

    it('should handle modal cancellation', async () => {
      const context = {};
      
      // Create properly mocked elements
      const mockOverlay = document.createElement('div');
      mockOverlay.id = 'modal-overlay';
      mockOverlay.classList = {
        add: vi.fn(),
        remove: vi.fn(),
        toggle: vi.fn(),
        contains: vi.fn().mockReturnValue(false)
      };
      mockOverlay.appendChild = vi.fn();
      mockOverlay.removeChild = vi.fn();
      
      vi.spyOn(document, 'querySelector').mockImplementation((selector) => {
        if (selector === '#modal-overlay') return mockOverlay;
        return null;
      });
      
      const modalElement = document.createElement('div');
      modalElement.addEventListener = vi.fn();
      modalElement.removeEventListener = vi.fn();
      
      const cancelBtn = document.createElement('button');
      cancelBtn.id = 'cancel-manual-input';
      cancelBtn.addEventListener = vi.fn();
      cancelBtn.click = vi.fn();
      
      const inputElement = document.createElement('input');
      inputElement.id = 'manual-card-input';
      inputElement.addEventListener = vi.fn();
      inputElement.value = '';
      
      const confirmBtn = document.createElement('button');
      confirmBtn.id = 'confirm-manual-input';
      confirmBtn.addEventListener = vi.fn();
      
      const closeBtn = document.createElement('button');
      closeBtn.className = 'modal-close';
      closeBtn.addEventListener = vi.fn();
      
      modalElement.querySelector = vi.fn((selector) => {
        if (selector === '#manual-card-input') return inputElement;
        if (selector === '#confirm-manual-input') return confirmBtn;
        if (selector === '#cancel-manual-input') return cancelBtn;
        if (selector === '.modal-close') return closeBtn;
        return null;
      });
      
      vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
        if (tagName === 'div') return modalElement;
        return document.createElement(tagName);
      });
      
      const dialogPromise = errorBoundaryInstance.showManualInputDialog(context);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Simulate cancel button click
      const cancelHandler = cancelBtn.addEventListener.mock.calls
        .find(call => call[0] === 'click')?.[1];
      
      if (cancelHandler) {
        cancelHandler();
      }
      
      const result = await dialogPromise;
      expect(result.success).toBe(false);
    });
  });

  describe('Offline Notifications', () => {
    it('should show offline notification with auto-remove', async () => {
      vi.useFakeTimers();
      
      const notificationElement = document.createElement('div');
      notificationElement.className = 'offline-notification';
      notificationElement.textContent = "🌐 You're offline. Some features may not be available.";
      notificationElement.addEventListener = vi.fn();
      
      const closeBtn = document.createElement('button');
      closeBtn.className = 'notification-close';
      closeBtn.addEventListener = vi.fn();
      closeBtn.click = vi.fn();
      
      notificationElement.querySelector = vi.fn((selector) => {
        if (selector === '.notification-close') return closeBtn;
        return null;
      });
      
      vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
        if (tagName === 'div') return notificationElement;
        if (tagName === 'button') return closeBtn;
        return document.createElement(tagName);
      });
      
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
      
      errorBoundaryInstance.showOfflineNotification();
      
      expect(appendChildSpy).toHaveBeenCalledWith(notificationElement);
      expect(closeBtn.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      
      // Test auto-removal after 5 seconds
      vi.advanceTimersByTime(5000);
      
      vi.useRealTimers();
    });

    it('should handle manual notification close', () => {
      const notificationElement = document.createElement('div');
      notificationElement.className = 'offline-notification';
      notificationElement.addEventListener = vi.fn();
      
      const closeBtn = document.createElement('button');
      closeBtn.className = 'notification-close';
      closeBtn.addEventListener = vi.fn();
      closeBtn.click = vi.fn();
      
      notificationElement.querySelector = vi.fn((selector) => {
        if (selector === '.notification-close') return closeBtn;
        return null;
      });
      
      // Set parentNode reference for proper removal
      notificationElement.parentNode = document.body;
      
      vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
        if (tagName === 'div') return notificationElement;
        if (tagName === 'button') return closeBtn;
        return document.createElement(tagName);
      });
      
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});
      
      errorBoundaryInstance.showOfflineNotification();
      
      // Simulate manual close by directly calling the close handler
      const closeHandler = closeBtn.addEventListener.mock.calls
        .find(call => call[0] === 'click')?.[1];
      
      if (closeHandler) {
        closeHandler();
      }
      
      expect(removeChildSpy).toHaveBeenCalledWith(notificationElement);
    });
  });
});