/**
 * Unit tests for PermissionManager.js
 * Tests microphone permission handling across different platforms and browsers
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PermissionManager } from '../../js/voice/PermissionManager.js';

describe('PermissionManager', () => {
  let permissionManager;

  beforeEach(() => {
    permissionManager = new PermissionManager();
  });

  describe('Initialization', () => {
    it('should initialize with correct default state', () => {
      expect(permissionManager.microphonePermission).toBe('unknown');
      expect(permissionManager.platform).toBeDefined();
      expect(permissionManager.browser).toBeDefined();
      expect(permissionManager.strategies).toBeInstanceOf(Array);
      expect(permissionManager.strategies.length).toBeGreaterThan(0);
    });

    it('should initialize strategies in correct priority order', () => {
      const priorities = permissionManager.strategies.map(s => s.priority);
      const sortedPriorities = [...priorities].sort((a, b) => b - a);
      
      expect(priorities).toEqual(sortedPriorities);
    });

    it('should initialize successfully', async () => {
      const result = await permissionManager.initialize();
      expect(result).toBe(true);
    });

    it('should check current permission state during initialization', async () => {
      const checkStateSpy = vi.spyOn(permissionManager, 'checkCurrentPermissionState');
      
      await permissionManager.initialize();
      
      expect(checkStateSpy).toHaveBeenCalled();
    });
  });

  describe('Permission State Checking', () => {
    it('should check permission state with Permissions API', async () => {
      const mockQuery = vi.fn().mockResolvedValue({ state: 'granted' });
      global.navigator.permissions = { query: mockQuery };
      
      const state = await permissionManager.checkCurrentPermissionState();
      
      expect(state).toBe('granted');
      expect(mockQuery).toHaveBeenCalledWith({ name: 'microphone' });
    });

    it('should return unknown when Permissions API is not available', async () => {
      global.navigator.permissions = undefined;
      
      const state = await permissionManager.checkCurrentPermissionState();
      
      expect(state).toBe('unknown');
    });

    it('should handle permission query errors', async () => {
      const mockQuery = vi.fn().mockRejectedValue(new Error('Permission query failed'));
      global.navigator.permissions = { query: mockQuery };
      
      const state = await permissionManager.checkCurrentPermissionState();
      
      expect(state).toBe('unknown');
    });
  });

  describe('Permission Monitoring', () => {
    it('should setup permission monitoring when available', async () => {
      const mockPermissionQuery = {
        state: 'granted',
        addEventListener: vi.fn()
      };
      
      global.navigator.permissions = {
        query: vi.fn().mockResolvedValue(mockPermissionQuery)
      };
      
      await permissionManager.setupPermissionMonitoring();
      
      expect(mockPermissionQuery.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should handle permission changes', async () => {
      const mockPermissionQuery = {
        state: 'granted',
        addEventListener: vi.fn()
      };
      
      global.navigator.permissions = {
        query: vi.fn().mockResolvedValue(mockPermissionQuery)
      };
      
      let changeCallback;
      mockPermissionQuery.addEventListener.mockImplementation((event, callback) => {
        if (event === 'change') {
          changeCallback = callback;
        }
      });
      
      await permissionManager.setupPermissionMonitoring();
      
      // Simulate permission change
      mockPermissionQuery.state = 'denied';
      changeCallback();
      
      expect(permissionManager.microphonePermission).toBe('denied');
    });

    it('should handle monitoring setup failures', async () => {
      global.navigator.permissions = {
        query: vi.fn().mockRejectedValue(new Error('Query failed'))
      };
      
      await expect(permissionManager.setupPermissionMonitoring()).resolves.not.toThrow();
    });
  });

  describe('Permission Request Strategies', () => {
    it('should find best available strategy', async () => {
      // Mock all strategies as available
      permissionManager.strategies.forEach(strategy => {
        strategy.test = vi.fn().mockReturnValue(true);
        strategy.request = vi.fn().mockResolvedValue({ state: 'granted' });
      });
      
      const result = await permissionManager.requestMicrophone();
      
      expect(result.state).toBe('granted');
      
      // Should use highest priority strategy
      const highestPriorityStrategy = permissionManager.strategies[0];
      expect(highestPriorityStrategy.request).toHaveBeenCalled();
    });

    it('should throw error when no strategy is available', async () => {
      // Mock all strategies as unavailable
      permissionManager.strategies.forEach(strategy => {
        strategy.test = vi.fn().mockReturnValue(false);
      });
      
      await expect(permissionManager.requestMicrophone()).rejects.toThrow('No permission request strategy available');
    });

    it('should handle strategy request failures', async () => {
      permissionManager.strategies[0].test = vi.fn().mockReturnValue(true);
      permissionManager.strategies[0].request = vi.fn().mockRejectedValue(new Error('Strategy failed'));
      
      await expect(permissionManager.requestMicrophone()).rejects.toThrow('Strategy failed');
    });
  });

  describe('Permissions API Strategy', () => {
    it('should return granted permission immediately', async () => {
      global.navigator.permissions = {
        query: vi.fn().mockResolvedValue({ state: 'granted' })
      };
      
      const result = await permissionManager.requestViaPermissionsAPI();
      
      expect(result.state).toBe('granted');
      expect(result.method).toBe('permissions-api');
    });

    it('should return denied permission immediately', async () => {
      global.navigator.permissions = {
        query: vi.fn().mockResolvedValue({ state: 'denied' })
      };
      
      const result = await permissionManager.requestViaPermissionsAPI();
      
      expect(result.state).toBe('denied');
      expect(result.method).toBe('permissions-api');
    });

    it('should trigger getUserMedia for prompt state', async () => {
      global.navigator.permissions = {
        query: vi.fn()
          .mockResolvedValueOnce({ state: 'prompt' })
          .mockResolvedValueOnce({ state: 'granted' })
      };
      
      const mockStream = {
        getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }])
      };
      
      global.navigator.mediaDevices = {
        getUserMedia: vi.fn().mockResolvedValue(mockStream)
      };
      
      const result = await permissionManager.requestViaPermissionsAPI();
      
      expect(result.state).toBe('granted');
      expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: true,
        video: false
      });
    });

    it('should handle NotAllowedError', async () => {
      global.navigator.permissions = {
        query: vi.fn().mockResolvedValue({ state: 'prompt' })
      };
      
      const notAllowedError = new Error('Permission denied');
      notAllowedError.name = 'NotAllowedError';
      
      global.navigator.mediaDevices = {
        getUserMedia: vi.fn().mockRejectedValue(notAllowedError)
      };
      
      const result = await permissionManager.requestViaPermissionsAPI();
      
      expect(result.state).toBe('denied');
      expect(result.method).toBe('permissions-api');
    });
  });

  describe('getUserMedia Strategy', () => {
    it('should request permission successfully', async () => {
      const mockStream = {
        getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }])
      };
      
      global.navigator.mediaDevices = {
        getUserMedia: vi.fn().mockResolvedValue(mockStream)
      };
      
      const result = await permissionManager.requestViaGetUserMedia();
      
      expect(result.state).toBe('granted');
      expect(result.method).toBe('getusermedia');
    });

    it('should handle NotAllowedError', async () => {
      const notAllowedError = new Error('Permission denied');
      notAllowedError.name = 'NotAllowedError';
      
      global.navigator.mediaDevices = {
        getUserMedia: vi.fn().mockRejectedValue(notAllowedError)
      };
      
      const result = await permissionManager.requestViaGetUserMedia();
      
      expect(result.state).toBe('denied');
      expect(result.message).toContain('Microphone access denied');
    });

    it('should handle NotFoundError', async () => {
      const notFoundError = new Error('No microphone found');
      notFoundError.name = 'NotFoundError';
      
      global.navigator.mediaDevices = {
        getUserMedia: vi.fn().mockRejectedValue(notFoundError)
      };
      
      const result = await permissionManager.requestViaGetUserMedia();
      
      expect(result.state).toBe('denied');
      expect(result.message).toContain('No microphone found');
    });

    it('should handle NotReadableError', async () => {
      const notReadableError = new Error('Microphone in use');
      notReadableError.name = 'NotReadableError';
      
      global.navigator.mediaDevices = {
        getUserMedia: vi.fn().mockRejectedValue(notReadableError)
      };
      
      const result = await permissionManager.requestViaGetUserMedia();
      
      expect(result.state).toBe('denied');
      expect(result.message).toContain('being used by another application');
    });

    it('should handle SecurityError', async () => {
      const securityError = new Error('Security error');
      securityError.name = 'SecurityError';
      
      global.navigator.mediaDevices = {
        getUserMedia: vi.fn().mockRejectedValue(securityError)
      };
      
      const result = await permissionManager.requestViaGetUserMedia();
      
      expect(result.state).toBe('denied');
      expect(result.message).toContain('security restrictions');
    });
  });

  describe('Legacy getUserMedia Strategy', () => {
    it('should request permission successfully via modern getUserMedia', async () => {
      const mockStream = {
        getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }])
      };
      
      global.navigator.mediaDevices = {
        getUserMedia: vi.fn().mockResolvedValue(mockStream)
      };
      
      const result = await permissionManager.requestViaLegacyGetUserMedia();
      
      expect(result.state).toBe('granted');
      expect(result.method).toBe('legacy-getusermedia');
    });

    it('should request permission via legacy navigator.getUserMedia', async () => {
      global.navigator.mediaDevices = undefined;
      
      const mockStream = { stop: vi.fn() };
      global.navigator.getUserMedia = vi.fn().mockImplementation((constraints, success, error) => {
        success(mockStream);
      });
      
      const result = await permissionManager.requestViaLegacyGetUserMedia();
      
      expect(result.state).toBe('granted');
      expect(result.method).toBe('legacy-getusermedia');
    });

    it('should request permission via webkit getUserMedia', async () => {
      global.navigator.mediaDevices = undefined;
      global.navigator.getUserMedia = undefined;
      
      const mockStream = { stop: vi.fn() };
      global.navigator.webkitGetUserMedia = vi.fn().mockImplementation((constraints, success, error) => {
        success(mockStream);
      });
      
      const result = await permissionManager.requestViaLegacyGetUserMedia();
      
      expect(result.state).toBe('granted');
      expect(result.method).toBe('legacy-getusermedia');
    });

    it('should handle legacy permission errors', async () => {
      global.navigator.mediaDevices = undefined;
      
      const permissionError = new Error('Permission denied');
      permissionError.name = 'PermissionDeniedError';
      
      global.navigator.getUserMedia = vi.fn().mockImplementation((constraints, success, error) => {
        error(permissionError);
      });
      
      const result = await permissionManager.requestViaLegacyGetUserMedia();
      
      expect(result.state).toBe('denied');
      expect(result.message).toContain('Microphone access denied');
    });

    it('should throw error when no getUserMedia method is available', async () => {
      global.navigator.mediaDevices = undefined;
      global.navigator.getUserMedia = undefined;
      global.navigator.webkitGetUserMedia = undefined;
      global.navigator.mozGetUserMedia = undefined;
      
      await expect(permissionManager.requestViaLegacyGetUserMedia()).rejects.toThrow('No getUserMedia method available');
    });
  });

  describe('Platform Detection', () => {
    it('should detect iOS platform', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        configurable: true
      });
      
      const manager = new PermissionManager();
      expect(manager.platform).toBe('ios');
    });

    it('should detect macOS platform', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        configurable: true
      });
      
      const manager = new PermissionManager();
      expect(manager.platform).toBe('mac');
    });

    it('should detect Windows platform', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        configurable: true
      });
      
      const manager = new PermissionManager();
      expect(manager.platform).toBe('windows');
    });

    it('should detect Android platform', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 10; SM-G975F)',
        configurable: true
      });
      
      const manager = new PermissionManager();
      expect(manager.platform).toBe('android');
    });
  });

  describe('Browser Detection', () => {
    it('should detect Chrome browser', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        configurable: true
      });
      
      const manager = new PermissionManager();
      expect(manager.browser).toBe('chrome');
    });

    it('should detect Firefox browser', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
        configurable: true
      });
      
      const manager = new PermissionManager();
      expect(manager.browser).toBe('firefox');
    });

    it('should detect Safari browser', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
        configurable: true
      });
      
      const manager = new PermissionManager();
      expect(manager.browser).toBe('safari');
    });

    it('should detect Edge browser', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59',
        configurable: true
      });
      
      const manager = new PermissionManager();
      expect(manager.browser).toBe('edge');
    });
  });

  describe('Permission Instructions', () => {
    it('should provide iOS Safari instructions', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
        configurable: true
      });
      
      const manager = new PermissionManager();
      const instructions = manager.getPermissionInstructions();
      
      expect(instructions.title).toBe('Enable Microphone Access');
      expect(instructions.steps).toContain('Go to Settings > Safari > Camera & Microphone');
    });

    it('should provide macOS instructions', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        configurable: true
      });
      
      const manager = new PermissionManager();
      const instructions = manager.getPermissionInstructions();
      
      expect(instructions.steps).toContain('Go to System Preferences > Security & Privacy > Privacy');
    });

    it('should provide Windows instructions', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        configurable: true
      });
      
      const manager = new PermissionManager();
      const instructions = manager.getPermissionInstructions();
      
      expect(instructions.steps).toContain('Go to Settings > Privacy > Microphone');
    });

    it('should provide generic instructions for unknown platforms', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Unknown Platform)',
        configurable: true
      });
      
      const manager = new PermissionManager();
      const instructions = manager.getPermissionInstructions();
      
      expect(instructions.steps).toContain('Check your browser settings for microphone permissions');
    });

    it('should show permission instructions', () => {
      const instructions = permissionManager.showPermissionInstructions();
      
      expect(instructions.title).toBe('Enable Microphone Access');
      expect(instructions.steps).toBeInstanceOf(Array);
      expect(instructions.notes).toBeInstanceOf(Array);
    });
  });

  describe('Support Detection', () => {
    it('should detect supported environment', () => {
      Object.defineProperty(window, 'isSecureContext', {
        value: true,
        configurable: true
      });
      
      global.navigator.mediaDevices = {
        getUserMedia: vi.fn()
      };
      
      const support = permissionManager.isSupported();
      
      expect(support.supported).toBe(true);
      expect(support.reason).toBe('Microphone access is supported');
    });

    it('should detect insecure context', () => {
      Object.defineProperty(window, 'isSecureContext', {
        value: false,
        configurable: true
      });
      
      const support = permissionManager.isSupported();
      
      expect(support.supported).toBe(false);
      expect(support.reason).toContain('secure context');
    });

    it('should detect missing getUserMedia', () => {
      Object.defineProperty(window, 'isSecureContext', {
        value: true,
        configurable: true
      });
      
      global.navigator.mediaDevices = undefined;
      global.navigator.getUserMedia = undefined;
      global.navigator.webkitGetUserMedia = undefined;
      global.navigator.mozGetUserMedia = undefined;
      
      const support = permissionManager.isSupported();
      
      expect(support.supported).toBe(false);
      expect(support.reason).toContain('getUserMedia is not supported');
    });
  });

  describe('State Management', () => {
    it('should return current permission state', () => {
      // Ensure navigator.mediaDevices exists for this test
      global.navigator.mediaDevices = {
        getUserMedia: vi.fn()
      };
      
      permissionManager.microphonePermission = 'granted';
      
      const state = permissionManager.getPermissionState();
      
      expect(state.microphone).toBe('granted');
      expect(state.platform).toBeDefined();
      expect(state.browser).toBeDefined();
      expect(state.hasPermissionsAPI).toBeDefined();
      expect(state.hasGetUserMedia).toBeDefined();
    });

    it('should reset permission state', () => {
      permissionManager.microphonePermission = 'granted';
      
      permissionManager.resetPermissionState();
      
      expect(permissionManager.microphonePermission).toBe('unknown');
    });
  });

  describe('Event Handling', () => {
    it('should register and trigger permission change callbacks', () => {
      const callback = vi.fn();
      permissionManager.onPermissionChange(callback);
      
      permissionManager.emitPermissionChange('granted');
      
      expect(callback).toHaveBeenCalledWith('granted');
    });

    it('should handle callback errors gracefully', () => {
      const errorCallback = vi.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });
      
      permissionManager.onPermissionChange(errorCallback);
      
      expect(() => {
        permissionManager.emitPermissionChange('granted');
      }).not.toThrow();
    });
  });
});