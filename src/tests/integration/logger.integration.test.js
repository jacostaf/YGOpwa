/**
 * Logger Integration Tests - Real Component Testing
 * 
 * Tests actual Logger functionality with real logging operations,
 * console output, and performance tracking. Targets the 406 uncovered lines.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { Logger } from '../../js/utils/Logger.js';

// Disable the mock for integration tests
vi.unmock('../../js/utils/Logger.js');

describe('Logger Integration Tests', () => {
  let logger;
  let consoleSpy;

  beforeEach(() => {
    logger = new Logger('TestModule');
    
    // Spy on console methods but don't suppress them
    consoleSpy = {
      log: vi.spyOn(console, 'log'),
      error: vi.spyOn(console, 'error'),
      warn: vi.spyOn(console, 'warn'),
      info: vi.spyOn(console, 'info'),
      debug: vi.spyOn(console, 'debug'),
      time: vi.spyOn(console, 'time'),
      timeEnd: vi.spyOn(console, 'timeEnd'),
      group: vi.spyOn(console, 'group'),
      groupEnd: vi.spyOn(console, 'groupEnd'),
      groupCollapsed: vi.spyOn(console, 'groupCollapsed')
    };

    // Mock location for development detection
    Object.defineProperty(window, 'location', {
      value: { hostname: 'localhost', protocol: 'http:', search: '' },
      configurable: true,
      writable: true
    });

    // Mock performance API
    global.performance = {
      now: vi.fn().mockReturnValue(Date.now()),
      getEntriesByType: vi.fn().mockReturnValue([{
        loadEventEnd: 1000,
        navigationStart: 100,
        domContentLoadedEventEnd: 800,
        responseStart: 300
      }]),
      memory: {
        usedJSHeapSize: 10000000,
        jsHeapSizeLimit: 50000000
      }
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('should initialize with correct module name and log level', () => {
    expect(logger.module).toBe('TestModule');
    expect(logger.currentLevel).toBe(logger.levels.DEBUG); // Development mode
    expect(logger.logs).toBeDefined();
    expect(logger.errors).toBeDefined();
    expect(logger.levels).toEqual({
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3,
      TRACE: 4
    });
  });

  test('should detect development environment correctly', () => {
    // Test localhost (current setup)
    expect(logger.isDevelopment()).toBe(true);

    // Test production environment
    Object.defineProperty(window, 'location', {
      value: { hostname: 'example.com', protocol: 'https:', search: '' },
      configurable: true,
      writable: true
    });
    const prodLogger = new Logger('ProdTest');
    expect(prodLogger.isDevelopment()).toBe(false);
  });

  test('should handle different log levels correctly', () => {
    logger.setLevel('ERROR');
    expect(logger.currentLevel).toBe(logger.levels.ERROR);

    // Clear previous logs
    logger.clearLogs();
    consoleSpy.log.mockClear();

    // Should log error
    logger.error('Test error');
    expect(consoleSpy.log).toHaveBeenCalled();

    // Should not log info (below ERROR level)
    consoleSpy.log.mockClear();
    logger.info('Test info');
    expect(consoleSpy.log).not.toHaveBeenCalled();
  });

  test('should log messages with proper formatting', () => {
    logger.clearLogs();
    consoleSpy.log.mockClear();

    logger.error('Error message', { key: 'value' });
    logger.warn('Warning message', 'extra', 'args');
    logger.info('Info message');
    logger.debug('Debug message');

    // Should have made console calls
    expect(consoleSpy.log).toHaveBeenCalled();
    expect(consoleSpy.log.mock.calls.length).toBeGreaterThan(3);
  });

  test('should store logs in memory with limits', () => {
    logger.clearLogs();
    
    // Generate more logs than max limit
    for (let i = 0; i < 1200; i++) {
      logger.info(`Test log ${i}`);
    }

    // Should not exceed maxLogs (1000)
    expect(logger.logs.length).toBeLessThanOrEqual(1000);
    
    // Should keep most recent logs
    const lastLog = logger.logs[logger.logs.length - 1];
    expect(lastLog.message).toContain('Test log 1199');
  });

  test('should track errors separately', () => {
    logger.clearErrors();
    
    logger.error('First error', { code: 'ERR001' });
    logger.error('Second error', { code: 'ERR002' });
    logger.info('Regular log');

    const errors = logger.getErrors();
    expect(errors.length).toBe(2);
    expect(errors[0].message).toContain('First error');
  });

  test('should handle performance timing', () => {
    const label = 'test-operation';
    
    logger.time(label);
    expect(logger.timers.has(label)).toBe(true);

    const duration = logger.timeEnd(label);
    expect(logger.timers.has(label)).toBe(false);
    expect(typeof duration).toBe('number');
  });

  test('should handle performance measurement with callback', async () => {
    const mockFn = vi.fn().mockResolvedValue('result');
    
    const result = await logger.perf('async-operation', mockFn);
    
    expect(result).toBe('result');
    expect(mockFn).toHaveBeenCalled();
  });

  test('should handle log grouping', () => {
    consoleSpy.group.mockClear();
    consoleSpy.groupEnd.mockClear();

    logger.group('Test Group');
    expect(consoleSpy.group).toHaveBeenCalledWith('[TestModule] Test Group');

    logger.info('Grouped message');
    
    logger.groupEnd();
    expect(consoleSpy.groupEnd).toHaveBeenCalled();

    // Test collapsed group
    consoleSpy.groupCollapsed.mockClear();
    logger.group('Collapsed Group', true);
    expect(consoleSpy.groupCollapsed).toHaveBeenCalledWith('[TestModule] Collapsed Group');
  });

  test('should filter logs by level', () => {
    logger.clearLogs();
    
    logger.error('Error message');
    logger.warn('Warning message');
    logger.info('Info message');
    logger.debug('Debug message');

    const errorLogs = logger.getLogs('ERROR');
    const allLogs = logger.getLogs();

    expect(errorLogs.length).toBe(1);
    expect(errorLogs[0].level).toBe('ERROR');
    expect(allLogs.length).toBeGreaterThan(1);
  });

  test('should clear logs and errors', () => {
    logger.error('Test error');
    logger.info('Test info');

    expect(logger.logs.length).toBeGreaterThan(0);
    expect(logger.errors.length).toBeGreaterThan(0);

    logger.clearLogs();
    // clearLogs() itself adds a log message, so expect 1 instead of 0
    expect(logger.logs.length).toBe(1);
    expect(logger.logs[0].message).toContain('Logs cleared');

    logger.clearErrors();
    expect(logger.errors.length).toBe(0);
  });

  test('should export logs as JSON', () => {
    logger.clearLogs();
    logger.info('Test message', { data: 'value' });
    
    const exportData = logger.exportLogs();
    
    expect(exportData).toBeDefined();
    expect(exportData.module).toBe('TestModule');
    expect(exportData.logs).toBeDefined();
    expect(exportData.errors).toBeDefined();
    expect(exportData.stats).toBeDefined();
    expect(exportData.stats.totalLogs).toBeGreaterThan(0);
  });

  test('should create child loggers', () => {
    const childLogger = logger.createChild('SubModule');
    
    expect(childLogger.module).toBe('TestModule:SubModule');
    expect(childLogger instanceof Logger).toBe(true);
  });

  test('should handle debug mode toggling', () => {
    logger.enableDebug();
    expect(logger.currentLevel).toBe(logger.levels.DEBUG);

    logger.disableDebug();
    expect(logger.currentLevel).toBe(logger.levels.INFO);
  });

  test('should format messages correctly', () => {
    const simple = logger.formatMessage('Simple message');
    expect(simple).toBe('Simple message');

    const withArgs = logger.formatMessage('Message with', 'string', 42);
    expect(withArgs).toContain('Message with string 42');

    const withObject = logger.formatMessage('Object:', { key: 'value' });
    expect(withObject).toContain('Object:');
    expect(withObject).toContain('{"key":"value"}');
  });

  test('should handle console output with proper styling', () => {
    consoleSpy.log.mockClear();
    
    // Use proper ISO timestamp format
    const timestamp = new Date().toISOString();
    logger.outputToConsole('ERROR', timestamp, 'Test error', []);
    
    expect(consoleSpy.log).toHaveBeenCalled();
    const firstCall = consoleSpy.log.mock.calls[0];
    expect(firstCall[0]).toContain('[TestModule]');
    expect(firstCall[0]).toContain('[ERROR]');
    expect(firstCall[0]).toContain('Test error');
    expect(firstCall[1]).toContain('color'); // Should contain CSS styling
  });

  test('should handle system information logging', () => {
    // Use the safe override utility from testUtils
    global.testUtils.safeOverride(global, 'navigator', {
      userAgent: 'Test Browser',
      platform: 'Test Platform',
      language: 'en-US',
      onLine: true,
      cookieEnabled: true
    });

    global.testUtils.safeOverride(global, 'screen', {
      width: 1920,
      height: 1080
    });

    global.testUtils.safeOverride(global, 'document', {
      referrer: 'https://example.com'
    });

    consoleSpy.group.mockClear();
    consoleSpy.log.mockClear();

    logger.logSystemInfo();

    expect(consoleSpy.group).toHaveBeenCalledWith('[TestModule] System Information');
    expect(consoleSpy.log).toHaveBeenCalled();
  });

  test('should handle performance information logging', () => {
    consoleSpy.group.mockClear();
    consoleSpy.log.mockClear();

    logger.logPerformanceInfo();

    expect(consoleSpy.group).toHaveBeenCalledWith('[TestModule] Performance Information');
    expect(consoleSpy.log).toHaveBeenCalled();
  });

  test('should handle error objects properly', () => {
    logger.clearErrors();
    
    const error = new Error('Test error');
    error.code = 'TEST_ERROR';

    logger.error('Error occurred:', error);

    const errorLogs = logger.getErrors();
    expect(errorLogs.length).toBe(1);
    expect(errorLogs[0].message).toContain('Error occurred:');
  });

  test('should maintain log history limits', () => {
    // Test with smaller limits for faster testing
    const originalMaxLogs = logger.maxLogs;
    const originalMaxErrors = logger.maxErrors;
    
    logger.maxLogs = 10;
    logger.maxErrors = 5;
    logger.clearLogs();
    logger.clearErrors();

    // Add more logs than limit (regular logs)
    for (let i = 0; i < 15; i++) {
      logger.info(`Log ${i}`);
    }

    // Add more errors than limit (error logs)
    for (let i = 0; i < 8; i++) {
      logger.error(`Error ${i}`);
    }

    expect(logger.logs.length).toBeLessThanOrEqual(logger.maxLogs);
    expect(logger.errors.length).toBeLessThanOrEqual(logger.maxErrors);
    
    // Should keep most recent entries - check the right arrays
    const allLogs = logger.getLogs();
    const allErrors = logger.getErrors();
    
    // Most recent regular log should be Log 14 (0-indexed, so 15 logs = 0-14)
    const mostRecentInfoLog = allLogs.filter(log => log.level === 'INFO').pop();
    expect(mostRecentInfoLog.message).toContain('Log 14');
    
    // Most recent error should be Error 7 (0-indexed, so 8 errors = 0-7)
    const mostRecentError = allErrors[allErrors.length - 1];
    expect(mostRecentError.message).toContain('Error 7');

    // Restore original limits
    logger.maxLogs = originalMaxLogs;
    logger.maxErrors = originalMaxErrors;
  });

  test('should handle scope operations correctly', () => {
    const scopedLogger = logger.scope('test-scope');
    
    expect(scopedLogger).toBeDefined();
    expect(typeof scopedLogger.end).toBe('function');
    
    // The scope method returns an object with logger methods spread in
    // so check for a core method like 'info'
    expect(typeof scopedLogger.info).toBe('function');

    // Test scoped operations
    scopedLogger.info('Scoped message');
    scopedLogger.end();
    
    // Timer should be cleaned up
    expect(logger.timers.has('test-scope-scope')).toBe(false);
  });

});