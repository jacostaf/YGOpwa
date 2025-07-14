/**
 * Resource Manager - Memory and Resource Management Utility
 * 
 * Provides resource management capabilities for the YGO Ripper application:
 * - Component registration and cleanup
 * - Memory monitoring and optimization
 * - Error boundary functionality
 * - Timeout and interval management with automatic cleanup
 */

import { Logger } from './Logger.js';

class ResourceManager {
    constructor() {
        this.logger = new Logger('ResourceManager');
        this.components = new Map();
        this.timeouts = new Set();
        this.intervals = new Set();
        this.cleanupCallbacks = new Map();
        this.errorHandlers = new Map();
        this.activeRequests = new Set();
        this.memoryUsage = {
            components: 0,
            timeouts: 0,
            intervals: 0,
            requests: 0
        };
        
        // Bind cleanup to window events
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
        
        window.addEventListener('unload', () => {
            this.cleanup();
        });
        
        this.logger.info('ResourceManager initialized');
    }

    /**
     * Register a component for resource management
     */
    registerComponent(componentId, component) {
        this.components.set(componentId, {
            instance: component,
            registeredAt: Date.now(),
            cleanupCallbacks: []
        });
        
        this.memoryUsage.components = this.components.size;
        this.logger.debug(`Component registered: ${componentId}`);
    }

    /**
     * Unregister a component
     */
    unregisterComponent(componentId) {
        const component = this.components.get(componentId);
        if (component) {
            // Run component cleanup callbacks
            component.cleanupCallbacks.forEach(callback => {
                try {
                    callback();
                } catch (error) {
                    this.logger.error(`Error in cleanup callback for ${componentId}:`, error);
                }
            });
            
            this.components.delete(componentId);
            this.memoryUsage.components = this.components.size;
            this.logger.debug(`Component unregistered: ${componentId}`);
        }
    }

    /**
     * Register a cleanup callback for a component
     */
    registerCleanupCallback(callbackId, callback) {
        this.cleanupCallbacks.set(callbackId, callback);
        this.logger.debug(`Cleanup callback registered: ${callbackId}`);
    }

    /**
     * Set timeout with automatic cleanup tracking
     */
    setTimeout(callback, delay) {
        const timeoutId = window.setTimeout(() => {
            this.timeouts.delete(timeoutId);
            this.memoryUsage.timeouts = this.timeouts.size;
            callback();
        }, delay);
        
        this.timeouts.add(timeoutId);
        this.memoryUsage.timeouts = this.timeouts.size;
        return timeoutId;
    }

    /**
     * Clear timeout
     */
    clearTimeout(timeoutId) {
        window.clearTimeout(timeoutId);
        this.timeouts.delete(timeoutId);
        this.memoryUsage.timeouts = this.timeouts.size;
    }

    /**
     * Set interval with automatic cleanup tracking
     */
    setInterval(callback, delay) {
        const intervalId = window.setInterval(callback, delay);
        this.intervals.add(intervalId);
        this.memoryUsage.intervals = this.intervals.size;
        return intervalId;
    }

    /**
     * Clear interval
     */
    clearInterval(intervalId) {
        window.clearInterval(intervalId);
        this.intervals.delete(intervalId);
        this.memoryUsage.intervals = this.intervals.size;
    }

    /**
     * Track fetch requests for cleanup
     */
    async trackFetch(url, options = {}) {
        const controller = new AbortController();
        const request = { url, controller, startTime: Date.now() };
        
        this.activeRequests.add(request);
        this.memoryUsage.requests = this.activeRequests.size;
        
        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            
            this.activeRequests.delete(request);
            this.memoryUsage.requests = this.activeRequests.size;
            
            return response;
        } catch (error) {
            this.activeRequests.delete(request);
            this.memoryUsage.requests = this.activeRequests.size;
            throw error;
        }
    }

    /**
     * Handle errors with registered error handlers
     */
    handleError(type, error) {
        this.logger.error(`Error (${type}):`, error);
        
        const handler = this.errorHandlers.get(type);
        if (handler) {
            try {
                handler(error);
            } catch (handlerError) {
                this.logger.error(`Error in error handler for ${type}:`, handlerError);
            }
        }
    }

    /**
     * Register error handler
     */
    registerErrorHandler(type, handler) {
        this.errorHandlers.set(type, handler);
        this.logger.debug(`Error handler registered for type: ${type}`);
    }

    /**
     * Get memory usage statistics
     */
    getMemoryUsage() {
        return {
            ...this.memoryUsage,
            totalComponents: this.components.size,
            totalTimeouts: this.timeouts.size,
            totalIntervals: this.intervals.size,
            totalRequests: this.activeRequests.size,
            cleanupCallbacks: this.cleanupCallbacks.size
        };
    }

    /**
     * Force cleanup of all resources
     */
    cleanup() {
        this.logger.info('Starting resource cleanup...');
        
        // Clear all timeouts
        for (const timeoutId of this.timeouts) {
            window.clearTimeout(timeoutId);
        }
        this.timeouts.clear();
        
        // Clear all intervals
        for (const intervalId of this.intervals) {
            window.clearInterval(intervalId);
        }
        this.intervals.clear();
        
        // Abort active requests
        for (const request of this.activeRequests) {
            try {
                request.controller.abort();
            } catch (error) {
                this.logger.warn('Error aborting request:', error);
            }
        }
        this.activeRequests.clear();
        
        // Run cleanup callbacks
        for (const [callbackId, callback] of this.cleanupCallbacks) {
            try {
                callback();
                this.logger.debug(`Cleanup callback executed: ${callbackId}`);
            } catch (error) {
                this.logger.error(`Error in cleanup callback ${callbackId}:`, error);
            }
        }
        
        // Cleanup components
        for (const [componentId, component] of this.components) {
            try {
                if (component.instance && typeof component.instance.cleanup === 'function') {
                    component.instance.cleanup();
                }
                this.logger.debug(`Component cleaned up: ${componentId}`);
            } catch (error) {
                this.logger.error(`Error cleaning up component ${componentId}:`, error);
            }
        }
        this.components.clear();
        
        // Update memory usage
        this.memoryUsage = {
            components: 0,
            timeouts: 0,
            intervals: 0,
            requests: 0
        };
        
        this.logger.info('Resource cleanup completed');
    }
}

// Global resource manager instance
let resourceManagerInstance = null;

/**
 * Get the global resource manager instance
 */
export function getResourceManager() {
    if (!resourceManagerInstance) {
        resourceManagerInstance = new ResourceManager();
    }
    return resourceManagerInstance;
}

/**
 * Create an error boundary function
 */
export function createErrorBoundary(componentName) {
    const resourceManager = getResourceManager();
    
    return function errorBoundary(target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        
        descriptor.value = async function(...args) {
            try {
                return await originalMethod.apply(this, args);
            } catch (error) {
                resourceManager.handleError(componentName, error);
                throw error; // Re-throw to maintain original behavior
            }
        };
        
        return descriptor;
    };
}

/**
 * Cleanup all resources (for manual cleanup)
 */
export function cleanupAllResources() {
    if (resourceManagerInstance) {
        resourceManagerInstance.cleanup();
    }
}

export default ResourceManager;