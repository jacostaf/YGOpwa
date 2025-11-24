/**
 * Logger - Advanced Logging System
 * 
 * Provides comprehensive logging capabilities with:
 * - Multiple log levels
 * - Console and storage output
 * - Performance timing
 * - Error tracking
 * - Debug mode support
 */

export class Logger {
    constructor(module = 'App') {
        this.module = module;
        this.startTime = Date.now();
        
        // Log levels
        this.levels = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3,
            TRACE: 4
        };
        
        // Current log level (can be configured)
        this.currentLevel = this.levels.INFO;
        
        // Enable debug mode if in development
        if (this.isDevelopment()) {
            this.currentLevel = this.levels.DEBUG;
        }
        
        // Log storage
        this.logs = [];
        this.maxLogs = 1000; // Keep last 1000 logs
        
        // Performance timing
        this.timers = new Map();
        
        // Error tracking
        this.errors = [];
        this.maxErrors = 100;
        
        // Console styling (legacy compatibility)
        this.styles = {
            ERROR: 'color: #ff4444; font-weight: bold;',
            WARN: 'color: #ffaa00; font-weight: bold;',
            INFO: 'color: #4444ff;',
            DEBUG: 'color: #888888;',
            TRACE: 'color: #666666; font-style: italic;'
        };

        // Batching support for noisy logs during tests
        this.batchingEnabled = false;
        this.batchWindowMs = 0;
        this.batchBuffer = [];
        this.batchTimer = null;
        
        // Initialization log removed to avoid noisy console output in tests
    }

    /**
     * Check if running in development mode
     */
    isDevelopment() {
        if (typeof window === 'undefined' || !window?.location) {
            return false;
        }

        const { hostname, protocol, search } = window.location;
        return (
            hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            protocol === 'file:' ||
            (typeof search === 'string' && search.includes('debug=true'))
        );
    }

    /**
     * Set log level
     */
    setLevel(level) {
        if (typeof level === 'string') {
            level = this.levels[level.toUpperCase()];
        }
        
        if (level !== undefined) {
            this.currentLevel = level;
            this.info(`Log level set to: ${Object.keys(this.levels)[level]}`);
        }
    }

    /**
     * Log error message
     */
    error(message, ...args) {
        this.log('ERROR', message, ...args);
        
        // Track error
        const error = {
            timestamp: new Date().toISOString(),
            module: this.module,
            message: this.safeString(message),
            stack: new Error().stack
        };
        
        this.errors.push(error);
        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }
    }

    /**
     * Log warning message
     */
    warn(message, ...args) {
        this.log('WARN', message, ...args);
    }

    /**
     * Log info message
     */
    info(message, ...args) {
        this.log('INFO', message, ...args);
    }

    /**
     * Log debug message
     */
    debug(message, ...args) {
        this.log('DEBUG', message, ...args);
    }

    /**
     * Log trace message
     */
    trace(message, ...args) {
        this.log('TRACE', message, ...args);
    }

    /**
     * Core logging method
     */
    log(level, message, ...args) {
        const levelNum = this.levels[level];

        if (levelNum > this.currentLevel) {
            return;
        }

        const timestamp = new Date().toISOString();
        const formattedMessage = this.safeString(message);

        const logEntry = {
            timestamp,
            level,
            module: this.module,
            message: formattedMessage,
            args: args.length > 0 ? args : undefined,
        };

        this.logs.push(logEntry);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        if (this.shouldBatch(level)) {
            this.enqueueBatch(logEntry, args);
        } else {
            this.outputToConsole(level, formattedMessage, args);
        }
    }

    shouldBatch(level) {
        return this.batchingEnabled && ['INFO', 'DEBUG', 'TRACE'].includes(level);
    }

    enqueueBatch(entry, args = []) {
        const details = `${entry.level}: ${entry.message}`;
        if (args.length > 0) {
            const argStrings = args.map((arg) => this.safeString(arg));
            this.batchBuffer.push({ ...entry, summary: `${details} ${argStrings.join(' ')}`.trim() });
        } else {
            this.batchBuffer.push({ ...entry, summary: details });
        }

        if (!this.batchTimer) {
            this.batchTimer = setTimeout(() => this.flushBatch(), this.batchWindowMs || 200);
        }
    }

    flushBatch() {
        if (!this.batchBuffer.length) {
            return;
        }

        const summaries = this.batchBuffer.map((entry) => entry.summary);
        console.log(`[${this.module}] Batch (${summaries.length})`, summaries);

        this.batchBuffer = [];
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }
    }

    enableBatching(windowMs = 250) {
        this.batchingEnabled = true;
        this.batchWindowMs = windowMs;
        this.batchBuffer = [];
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }
    }

    disableBatching() {
        this.flushBatch();
        this.batchingEnabled = false;
        this.batchWindowMs = 0;
    }

    logWithMetadata(level, message, metadata = {}) {
        this.log(level, message, metadata);
    }

    safeString(value) {
        if (value === null || value === undefined) {
            return '';
        }
        if (typeof value === 'string') {
            return value;
        }
        try {
            return JSON.stringify(value);
        } catch (error) {
            return String(value);
        }
    }

    resolveConsoleMethod(level) {
        switch (level) {
            case 'ERROR':
                return 'error';
            case 'WARN':
                return 'warn';
            case 'DEBUG':
                return 'debug';
            case 'TRACE':
                return 'debug';
            default:
                return 'log';
        }
    }

    /**
     * Output to console with styling
     */
    outputToConsole(level, message, args = []) {
        const timestamp = new Date().toISOString().split('T')[1]?.split('.')[0] || '';
        const prefix = `[${timestamp}] [${this.module}]`;
        const method = this.resolveConsoleMethod(level);
        const consoleFn = typeof console?.[method] === 'function'
            ? console[method].bind(console)
            : console.log.bind(console);
        consoleFn(prefix, message, ...args);
    }

    /**
     * Start performance timer
     */
    time(label) {
        const now = (typeof performance !== 'undefined' && typeof performance.now === 'function')
            ? performance.now()
            : Date.now();
        this.timers.set(label, {
            startTime: now,
            timestamp: new Date().toISOString()
        });
        
        this.debug(`Timer started: ${label}`);
    }

    /**
     * End performance timer
     */
    timeEnd(label) {
        const timer = this.timers.get(label);
        
        if (!timer) {
            this.warn(`Timer not found: ${label}`);
            return;
        }
        
        const endTime = (typeof performance !== 'undefined' && typeof performance.now === 'function')
            ? performance.now()
            : Date.now();
        const duration = endTime - timer.startTime;
        
        this.timers.delete(label);
        
        this.info(`Timer ${label}: ${duration.toFixed(2)}ms`);
        return duration;
    }

    /**
     * Log performance timing
     */
    perf(label, fn) {
        if (typeof fn === 'function') {
            // Wrap function
            this.time(label);
            try {
                const result = fn();
                if (result && typeof result.then === 'function') {
                    // Handle promise
                    return result.finally(() => {
                        this.timeEnd(label);
                    });
                } else {
                    this.timeEnd(label);
                    return result;
                }
            } catch (error) {
                this.timeEnd(label);
                throw error;
            }
        } else {
            // Just start timer
            this.time(label);
        }
    }

    /**
     * Group related log messages
     */
    group(label, collapsed = false) {
        const groupLabel = `[${this.module}] ${label}`;
        if (collapsed && typeof console.groupCollapsed === 'function') {
            console.groupCollapsed(groupLabel);
        } else if (typeof console.group === 'function') {
            console.group(groupLabel);
        } else {
            this.info(groupLabel);
        }
    }

    /**
     * End log group
     */
    groupEnd() {
        if (typeof console.groupEnd === 'function') {
            console.groupEnd();
        }
    }

    /**
     * Get all logs
     */
    getLogs(level = null) {
        if (level) {
            return this.logs.filter(log => log.level === level.toUpperCase());
        }
        return [...this.logs];
    }

    /**
     * Get all errors
     */
    getErrors() {
        return [...this.errors];
    }

    /**
     * Clear logs
     */
    clearLogs() {
        this.logs = [];
        this.info('Logs cleared');
    }

    /**
     * Clear errors
     */
    clearErrors() {
        this.errors = [];
        this.info('Errors cleared');
    }

    /**
     * Export logs
     */
    exportLogs() {
        return {
            module: this.module,
            timestamp: new Date().toISOString(),
            logs: this.logs,
            errors: this.errors,
            stats: {
                totalLogs: this.logs.length,
                totalErrors: this.errors.length,
                uptime: Date.now() - this.startTime
            }
        };
    }

    /**
     * Create a child logger
     */
    createChild(subModule) {
        const childLogger = new Logger(`${this.module}:${subModule}`);
        childLogger.currentLevel = this.currentLevel;
        return childLogger;
    }

    /**
     * Enable debug mode
     */
    enableDebug() {
        this.currentLevel = this.levels.DEBUG;
        this.info('Debug mode enabled');
    }

    /**
     * Disable debug mode
     */
    disableDebug() {
        this.currentLevel = this.levels.INFO;
        this.info('Debug mode disabled');
    }

    /**
     * Log system information
     */
    logSystemInfo() {
        this.group('System Information');
        if (typeof navigator !== 'undefined') {
            this.info('User Agent:', navigator.userAgent);
            this.info('Platform:', navigator.platform);
            this.info('Language:', navigator.language);
            this.info('Online:', navigator.onLine);
            this.info('Cookies Enabled:', navigator.cookieEnabled);
        } else {
            this.info('Navigator information not available in this environment');
        }

        if (typeof screen !== 'undefined') {
            this.info('Screen Resolution:', `${screen.width}x${screen.height}`);
        }

        if (typeof window !== 'undefined') {
            this.info('Viewport Size:', `${window.innerWidth}x${window.innerHeight}`);
            this.info('Location:', window?.location?.href || 'Unknown');
        }

        if (typeof document !== 'undefined') {
            this.info('Referrer:', document.referrer || 'None');
        }
        this.groupEnd();
    }

    /**
     * Log performance information
     */
    logPerformanceInfo() {
        if (typeof window !== 'undefined' && 'performance' in window) {
            this.group('Performance Information');
            
            const navigationEntries = typeof performance.getEntriesByType === 'function'
                ? performance.getEntriesByType('navigation')
                : [];
            const navigation = navigationEntries && navigationEntries[0];
            if (navigation) {
                this.info('Page Load Time:', `${navigation.loadEventEnd - navigation.navigationStart}ms`);
                this.info('DOM Content Loaded:', `${navigation.domContentLoadedEventEnd - navigation.navigationStart}ms`);
                this.info('First Paint:', `${navigation.responseStart - navigation.navigationStart}ms`);
            }
            
            const memory = performance.memory || {};
            if (memory && memory.usedJSHeapSize) {
                this.info('Memory Usage:', `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
                this.info('Memory Limit:', `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`);
            }
            
            this.groupEnd();
        }
    }

    /**
     * Create a scoped logger that automatically times operations
     */
    scope(label) {
        const scopedLogger = this.createChild(label);
        scopedLogger.time(`${label}-scope`);
        
        return {
            info: (...args) => scopedLogger.info(...args),
            warn: (...args) => scopedLogger.warn(...args),
            error: (...args) => scopedLogger.error(...args),
            debug: (...args) => scopedLogger.debug(...args),
            trace: (...args) => scopedLogger.trace(...args),
            log: (...args) => scopedLogger.log(...args),
            time: (...args) => scopedLogger.time(...args),
            timeEnd: (...args) => scopedLogger.timeEnd(...args),
            perf: (...args) => scopedLogger.perf(...args),
            group: (...args) => scopedLogger.group(...args),
            groupEnd: (...args) => scopedLogger.groupEnd(...args),
            end: () => {
                scopedLogger.timeEnd(`${label}-scope`);
            }
        };
    }
}
