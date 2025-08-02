export class Logger {
    constructor(moduleName = 'Unknown') {
        this.moduleName = moduleName;
        this.logHistory = [];
        this.isTestEnvironment = true;
    }

    // Core logging methods
    info(message, ...args) {
        this.logHistory.push({ level: 'info', message, args, timestamp: new Date() });
        if (process.env.NODE_ENV !== 'test') {
            console.log(`[${this.moduleName}] INFO:`, message, ...args);
        }
        return this;
    }

    warn(message, ...args) {
        this.logHistory.push({ level: 'warn', message, args, timestamp: new Date() });
        if (process.env.NODE_ENV !== 'test') {
            console.warn(`[${this.moduleName}] WARN:`, message, ...args);
        }
        return this;
    }

    error(message, ...args) {
        this.logHistory.push({ level: 'error', message, args, timestamp: new Date() });
        if (process.env.NODE_ENV !== 'test') {
            console.error(`[${this.moduleName}] ERROR:`, message, ...args);
        }
        return this;
    }

    debug(message, ...args) {
        this.logHistory.push({ level: 'debug', message, args, timestamp: new Date() });
        if (process.env.NODE_ENV !== 'test') {
            console.debug(`[${this.moduleName}] DEBUG:`, message, ...args);
        }
        return this;
    }

    // Scoped logger - returns a new logger instance with nested module name
    scope(subModule) {
        return new Logger(`${this.moduleName}:${subModule}`);
    }

    // Test utility methods
    getLogHistory() {
        return this.logHistory;
    }

    clearHistory() {
        this.logHistory = [];
        return this;
    }

    getLastLog() {
        return this.logHistory[this.logHistory.length - 1];
    }

    hasLogged(level, messagePattern) {
        return this.logHistory.some(log => 
            log.level === level && 
            (typeof messagePattern === 'string' 
                ? log.message.includes(messagePattern)
                : messagePattern.test(log.message)
            )
        );
    }
}

// Create a global instance for tests
export const mockLogger = new Logger('Test');

// Export as default for compatibility
export default Logger;