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
        
        // Console styling
        this.styles = {
            ERROR: 'color: #ff4444; font-weight: bold;',
            WARN: 'color: #ffaa00; font-weight: bold;',
            INFO: 'color: #4444ff;',
            DEBUG: 'color: #888888;',
            TRACE: 'color: #666666; font-style: italic;'
        };
        
        this.info(`Logger initialized for module: ${module}`);
    }

    /**
     * Check if running in development mode
     * Works in both browser and Node.js environments
     */
    isDevelopment() {
        // Browser environment
        if (typeof window !== 'undefined' && window.location) {
            return (
                window.location.hostname === 'localhost' ||
                window.location.hostname === '127.0.0.1' ||
                window.location.protocol === 'file:' ||
                window.location.search.includes('debug=true')
            );
        }
        
        // Node.js environment - check NODE_ENV
        return process.env.NODE_ENV === 'development' || 
               process.env.NODE_ENV === 'test' ||
               process.env.DEBUG === 'true';
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
            message: this.formatMessage(message, ...args),
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
            return; // Skip if below current log level
        }
        
        const timestamp = new Date().toISOString();
        const formattedMessage = this.formatMessage(message, ...args);
        
        // Create log entry
        const logEntry = {
            timestamp,
            level,
            module: this.module,
            message: formattedMessage,
            args: args.length > 0 ? args : undefined
        };
        
        // Store log entry
        this.logs.push(logEntry);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
        
        // Output to console
        this.outputToConsole(level, timestamp, formattedMessage, args);
    }

    /**
     * Format message with arguments
     */
    formatMessage(message, ...args) {
        if (args.length === 0) {
            return message;
        }
        
        // Simple string formatting
        let formatted = message;
        args.forEach((arg, index) => {
            if (typeof arg === 'object') {
                formatted += ` ${JSON.stringify(arg)}`;
            } else {
                formatted += ` ${arg}`;
            }
        });
        
        return formatted;
    }

    /**
     * Output to console with styling
     */
    outputToConsole(level, timestamp, message, args) {
        const prefix = `[${timestamp.split('T')[1].split('.')[0]}] [${this.module}] [${level}]`;
        const style = this.styles[level];
        
        if (args.length > 0) {
            console.log(`%c${prefix} ${message}`, style, ...args);
        } else {
            console.log(`%c${prefix} ${message}`, style);
        }
    }

    /**
     * Start performance timer
     */
    time(label) {
        this.timers.set(label, {
            startTime: performance.now(),
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
        
        const endTime = performance.now();
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
        if (collapsed) {
            console.groupCollapsed(`[${this.module}] ${label}`);
        } else {
            console.group(`[${this.module}] ${label}`);
        }
    }

    /**
     * End log group
     */
    groupEnd() {
        console.groupEnd();
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
        this.info('User Agent:', navigator.userAgent);
        this.info('Platform:', navigator.platform);
        this.info('Language:', navigator.language);
        this.info('Online:', navigator.onLine);
        this.info('Cookies Enabled:', navigator.cookieEnabled);
        this.info('Screen Resolution:', `${screen.width}x${screen.height}`);
        this.info('Viewport Size:', `${window.innerWidth}x${window.innerHeight}`);
        this.info('Location:', window.location.href);
        this.info('Referrer:', document.referrer || 'None');
        this.groupEnd();
    }

    /**
     * Log performance information
     */
    logPerformanceInfo() {
        if ('performance' in window) {
            this.group('Performance Information');
            
            const navigation = performance.getEntriesByType('navigation')[0];
            if (navigation) {
                this.info('Page Load Time:', `${navigation.loadEventEnd - navigation.navigationStart}ms`);
                this.info('DOM Content Loaded:', `${navigation.domContentLoadedEventEnd - navigation.navigationStart}ms`);
                this.info('First Paint:', `${navigation.responseStart - navigation.navigationStart}ms`);
            }
            
            const memory = performance.memory || {};
            if (memory.usedJSHeapSize) {
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
            ...scopedLogger,
            end: () => {
                scopedLogger.timeEnd(`${label}-scope`);
            }
        };
    }
}