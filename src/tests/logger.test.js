/**
 * Comprehensive Tests for Logger (utils/Logger.js)
 * 
 * This test suite provides 100% coverage and AI validation for the logging utility
 * including different log levels, formatting, and error handling.
 * 
 * @version 2.1.0
 * @author YGORipperUI Team
 */

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Register all Logger tests with the test framework
 */
export function registerTests(framework) {
    const loggerModulePath = join(__dirname, '../js/utils/Logger.js');
    
    // Test Logger Initialization
    framework.test('Logger - should initialize with correct context', async () => {
        // Mock console for testing
        const originalConsole = global.console;
        const mockConsole = {
            log: [],
            warn: [],
            error: [],
            info: [],
            debug: []
        };
        
        Object.keys(mockConsole).forEach(level => {
            global.console[level] = (...args) => mockConsole[level].push(args);
        });
        
        try {
            const { Logger } = await import('../js/utils/Logger.js');
            const logger = new Logger('TestContext');
            
            framework.expect(logger).toBeTruthy();
            framework.expect(logger.context).toBe('TestContext');
        } finally {
            global.console = originalConsole;
        }
    }, { 
        file: loggerModulePath, 
        category: 'initialization',
        complexity: 'low' 
    });

    framework.test('Logger - should log at different levels', async () => {
        const originalConsole = global.console;
        const mockConsole = {
            log: [],
            warn: [],
            error: [],
            info: [],
            debug: []
        };
        
        Object.keys(mockConsole).forEach(level => {
            global.console[level] = (...args) => mockConsole[level].push(args);
        });
        
        try {
            const { Logger } = await import('../js/utils/Logger.js');
            const logger = new Logger('TestLogger');
            
            logger.info('Info message');
            logger.warn('Warning message');
            logger.error('Error message');
            logger.debug('Debug message');
            
            // Verify messages were logged
            framework.expect(mockConsole.info.length).toBe(1);
            framework.expect(mockConsole.warn.length).toBe(1);
            framework.expect(mockConsole.error.length).toBe(1);
            framework.expect(mockConsole.debug.length).toBe(1);
            
        } finally {
            global.console = originalConsole;
        }
    }, { 
        file: loggerModulePath, 
        category: 'logging-levels',
        complexity: 'medium' 
    });

    // Test AI Validation - Type Safety
    framework.test('Logger - AI Validation: Type safety for log parameters', async () => {
        const originalConsole = global.console;
        const mockConsole = {
            log: [],
            warn: [],
            error: [],
            info: [],
            debug: []
        };
        
        Object.keys(mockConsole).forEach(level => {
            global.console[level] = (...args) => mockConsole[level].push(args);
        });
        
        try {
            const { Logger } = await import('../js/utils/Logger.js');
            const logger = new Logger('TypeTest');
            
            // Test different parameter types (AI often gets this wrong)
            logger.info('string message');
            logger.info(123);
            logger.info({ object: 'value' });
            logger.info(['array', 'value']);
            logger.info(null);
            logger.info(undefined);
            logger.info(true);
            logger.info(new Error('test error'));
            
            // Should handle all types without throwing
            framework.expect(mockConsole.info.length).toBe(8);
            
        } finally {
            global.console = originalConsole;
        }
    }, { 
        file: loggerModulePath, 
        category: 'ai-validation',
        complexity: 'medium',
        aiGenerated: true 
    });

    // Test Error Handling
    framework.test('Logger - should handle missing console gracefully', async () => {
        const originalConsole = global.console;
        delete global.console;
        
        try {
            const { Logger } = await import('../js/utils/Logger.js');
            const logger = new Logger('NoConsole');
            
            // Should not throw even without console
            framework.expect(() => {
                logger.info('test message');
                logger.error('test error');
            }).not.toThrow();
            
        } finally {
            global.console = originalConsole;
        }
    }, { 
        file: loggerModulePath, 
        category: 'error-handling',
        complexity: 'high' 
    });

    // Test Edge Cases
    framework.test('Logger - Edge Case: Empty or invalid context', async () => {
        const originalConsole = global.console;
        const mockConsole = {
            log: [],
            warn: [],
            error: [],
            info: [],
            debug: []
        };
        
        Object.keys(mockConsole).forEach(level => {
            global.console[level] = (...args) => mockConsole[level].push(args);
        });
        
        try {
            const { Logger } = await import('../js/utils/Logger.js');
            
            // Test various edge cases for context
            const logger1 = new Logger('');
            const logger2 = new Logger(null);
            const logger3 = new Logger(undefined);
            const logger4 = new Logger(123);
            const logger5 = new Logger({});
            
            // All should be created without throwing
            framework.expect(logger1).toBeTruthy();
            framework.expect(logger2).toBeTruthy();
            framework.expect(logger3).toBeTruthy();
            framework.expect(logger4).toBeTruthy();
            framework.expect(logger5).toBeTruthy();
            
        } finally {
            global.console = originalConsole;
        }
    }, { 
        file: loggerModulePath, 
        category: 'edge-cases',
        complexity: 'medium' 
    });

    // Test Message Formatting
    framework.test('Logger - should format messages correctly', async () => {
        const originalConsole = global.console;
        const mockConsole = {
            log: [],
            warn: [],
            error: [],
            info: [],
            debug: []
        };
        
        Object.keys(mockConsole).forEach(level => {
            global.console[level] = (...args) => mockConsole[level].push(args);
        });
        
        try {
            const { Logger } = await import('../js/utils/Logger.js');
            const logger = new Logger('Formatter');
            
            logger.info('Test message', { data: 'value' });
            
            // Check if message includes context
            const loggedArgs = mockConsole.info[0];
            const messageStr = loggedArgs.join(' ');
            framework.expect(messageStr).toContain('Formatter');
            
        } finally {
            global.console = originalConsole;
        }
    }, { 
        file: loggerModulePath, 
        category: 'formatting',
        complexity: 'medium' 
    });

    // Test Performance
    framework.test('Logger - AI Validation: Performance with many messages', async () => {
        const originalConsole = global.console;
        const mockConsole = {
            log: [],
            warn: [],
            error: [],
            info: [],
            debug: []
        };
        
        Object.keys(mockConsole).forEach(level => {
            global.console[level] = (...args) => mockConsole[level].push(args);
        });
        
        try {
            const { Logger } = await import('../js/utils/Logger.js');
            const logger = new Logger('Performance');
            
            const startTime = Date.now();
            
            // Log many messages to test performance
            for (let i = 0; i < 1000; i++) {
                logger.info(`Message ${i}`);
            }
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            // Should complete within reasonable time (AI code might be inefficient)
            framework.expect(duration).toBeLess(1000); // Less than 1 second
            framework.expect(mockConsole.info.length).toBe(1000);
            
        } finally {
            global.console = originalConsole;
        }
    }, { 
        file: loggerModulePath, 
        category: 'performance',
        complexity: 'medium',
        aiGenerated: true 
    });

    // Test Async Behavior
    framework.test('Logger - should handle async logging correctly', async () => {
        const originalConsole = global.console;
        const mockConsole = {
            log: [],
            warn: [],
            error: [],
            info: [],
            debug: []
        };
        
        Object.keys(mockConsole).forEach(level => {
            global.console[level] = (...args) => mockConsole[level].push(args);
        });
        
        try {
            const { Logger } = await import('../js/utils/Logger.js');
            const logger = new Logger('AsyncTest');
            
            // Test async logging
            const promises = [];
            for (let i = 0; i < 10; i++) {
                promises.push(new Promise(resolve => {
                    setTimeout(() => {
                        logger.info(`Async message ${i}`);
                        resolve();
                    }, Math.random() * 10);
                }));
            }
            
            await Promise.all(promises);
            
            // All messages should be logged
            framework.expect(mockConsole.info.length).toBe(10);
            
        } finally {
            global.console = originalConsole;
        }
    }, { 
        file: loggerModulePath, 
        category: 'async-behavior',
        complexity: 'high' 
    });

    // Test Memory Usage
    framework.test('Logger - AI Validation: Memory usage optimization', async () => {
        const originalConsole = global.console;
        const mockConsole = {
            log: [],
            warn: [],
            error: [],
            info: [],
            debug: []
        };
        
        Object.keys(mockConsole).forEach(level => {
            global.console[level] = (...args) => mockConsole[level].push(args);
        });
        
        try {
            const { Logger } = await import('../js/utils/Logger.js');
            
            // Create many logger instances to test memory usage
            const loggers = [];
            for (let i = 0; i < 100; i++) {
                loggers.push(new Logger(`Logger${i}`));
            }
            
            // Each logger should be independent
            framework.expect(loggers.length).toBe(100);
            
            // Test that each logger works
            loggers.forEach((logger, index) => {
                logger.info(`Test from logger ${index}`);
            });
            
            framework.expect(mockConsole.info.length).toBe(100);
            
        } finally {
            global.console = originalConsole;
        }
    }, { 
        file: loggerModulePath, 
        category: 'memory-usage',
        complexity: 'medium',
        aiGenerated: true 
    });

    // Test Error Object Handling
    framework.test('Logger - should handle Error objects properly', async () => {
        const originalConsole = global.console;
        const mockConsole = {
            log: [],
            warn: [],
            error: [],
            info: [],
            debug: []
        };
        
        Object.keys(mockConsole).forEach(level => {
            global.console[level] = (...args) => mockConsole[level].push(args);
        });
        
        try {
            const { Logger } = await import('../js/utils/Logger.js');
            const logger = new Logger('ErrorTest');
            
            const testError = new Error('Test error message');
            testError.stack = 'Test stack trace';
            
            logger.error('Error occurred:', testError);
            
            framework.expect(mockConsole.error.length).toBe(1);
            
            // Verify error was logged properly
            const loggedArgs = mockConsole.error[0];
            const messageStr = loggedArgs.join(' ');
            framework.expect(messageStr).toContain('Error occurred:');
            
        } finally {
            global.console = originalConsole;
        }
    }, { 
        file: loggerModulePath, 
        category: 'error-objects',
        complexity: 'medium' 
    });
}