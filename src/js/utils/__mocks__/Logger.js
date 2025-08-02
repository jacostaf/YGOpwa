import { vi } from 'vitest';

export class Logger {
  constructor(module = 'App') {
    this.module = module;
    this.info = vi.fn();
    this.warn = vi.fn();
    this.error = vi.fn();
    this.debug = vi.fn();
    this.log = vi.fn();
    this.trace = vi.fn();
    this.time = vi.fn();
    this.timeEnd = vi.fn();
    this.perf = vi.fn();
    this.group = vi.fn();
    this.groupEnd = vi.fn();
    this.getLogs = vi.fn().mockReturnValue([]);
    this.getErrors = vi.fn().mockReturnValue([]);
    this.clearLogs = vi.fn();
    this.clearErrors = vi.fn();
    this.exportLogs = vi.fn().mockReturnValue({});
    this.createChild = vi.fn().mockImplementation((subModule) => new Logger(`${module}:${subModule}`));
    this.enableDebug = vi.fn();
    this.disableDebug = vi.fn();
    this.logSystemInfo = vi.fn();
    this.logPerformanceInfo = vi.fn();
    this.scope = vi.fn().mockImplementation((label) => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
      log: vi.fn(),
      time: vi.fn(),
      timeEnd: vi.fn(),
      perf: vi.fn(),
      group: vi.fn(),
      groupEnd: vi.fn(),
      end: vi.fn()
    }));
    this.setLevel = vi.fn();
    this.isDevelopment = vi.fn().mockReturnValue(false);
  }
}