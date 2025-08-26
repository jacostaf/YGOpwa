/**
 * Memory Management Base Class for YGOpwa Components
 * 
 * Provides systematic memory leak prevention with event listener tracking,
 * timer management, and component lifecycle management.
 * 
 * Features:
 * - Automatic event listener cleanup
 * - Timer and interval tracking
 * - Memory budget enforcement
 * - Resource disposal tracking
 * - Performance monitoring integration
 */

import { Logger } from './Logger.js';

/**
 * Base class providing memory management capabilities
 */
export class MemoryManagedComponent {
    constructor(componentName = 'Component', options = {}) {
        this.componentName = componentName;
        this.logger = new Logger(`MemoryManager:${componentName}`);
        
        // Memory management configuration
        this.memoryConfig = {
            maxEventListeners: options.maxEventListeners || 100,
            maxTimers: options.maxTimers || 50,
            maxCacheSize: options.maxCacheSize || 1000,
            memoryBudgetMB: options.memoryBudgetMB || 50,
            cleanupInterval: options.cleanupInterval || 30000, // 30 seconds
            ...options
        };
        
        // Tracked resources
        this.trackedResources = {
            eventListeners: new Map(), // element -> [{event, handler, options}]
            timers: new Set(), // timer IDs
            intervals: new Set(), // interval IDs
            animationFrames: new Set(), // animation frame IDs
            observers: new Set(), // PerformanceObserver, MutationObserver, etc.
            caches: new Map(), // cache name -> cache object
            streams: new Set(), // MediaStream objects
            connections: new Set() // WebSocket, EventSource, etc.
        };
        
        // Memory usage tracking
        this.memoryMetrics = {
            initialMemory: 0,
            currentMemory: 0,
            peakMemory: 0,
            lastCleanup: Date.now(),
            cleanupCount: 0
        };
        
        // Component state
        this.isDestroyed = false;
        this.destructionCallbacks = [];
        
        // Initialize memory tracking
        this.initializeMemoryTracking();
        
        this.logger.debug(`Memory-managed component '${componentName}' initialized`);
    }
    
    /**
     * Initialize memory usage baseline
     */
    initializeMemoryTracking() {
        if (performance.memory) {
            this.memoryMetrics.initialMemory = performance.memory.usedJSHeapSize;
            this.memoryMetrics.currentMemory = this.memoryMetrics.initialMemory;
        }
        
        // Set up periodic cleanup
        const cleanupTimer = setInterval(() => {
            if (!this.isDestroyed) {
                this.performPeriodicCleanup();
            }
        }, this.memoryConfig.cleanupInterval);
        
        // Track the cleanup timer itself
        this.trackedResources.intervals.add(cleanupTimer);
    }
    
    /**
     * Add event listener with automatic tracking
     */
    addTrackedEventListener(element, event, handler, options = {}) {
        if (this.isDestroyed) {
            this.logger.warn('Attempted to add event listener after component destruction');
            return;
        }
        
        // Check limits
        const totalListeners = Array.from(this.trackedResources.eventListeners.values())
            .reduce((sum, listeners) => sum + listeners.length, 0);
            
        if (totalListeners >= this.memoryConfig.maxEventListeners) {
            this.logger.warn(`Event listener limit reached: ${totalListeners}/${this.memoryConfig.maxEventListeners}`);
            this.performEventListenerCleanup();
        }
        
        // Add the event listener
        element.addEventListener(event, handler, options);
        
        // Track it for cleanup
        if (!this.trackedResources.eventListeners.has(element)) {
            this.trackedResources.eventListeners.set(element, []);
        }
        
        this.trackedResources.eventListeners.get(element).push({
            event,
            handler,
            options
        });
        
        this.logger.debug(`Tracked event listener: ${event} on ${element.tagName || element.constructor.name}`);
    }
    
    /**
     * Remove specific event listener
     */
    removeTrackedEventListener(element, event, handler) {
        element.removeEventListener(event, handler);
        
        const listeners = this.trackedResources.eventListeners.get(element);
        if (listeners) {
            const index = listeners.findIndex(l => l.event === event && l.handler === handler);
            if (index !== -1) {
                listeners.splice(index, 1);
                if (listeners.length === 0) {
                    this.trackedResources.eventListeners.delete(element);
                }
                this.logger.debug(`Removed tracked event listener: ${event}`);
            }
        }
    }
    
    /**
     * Set timeout with automatic tracking
     */
    setTrackedTimeout(callback, delay, ...args) {
        if (this.isDestroyed) {
            this.logger.warn('Attempted to set timeout after component destruction');
            return null;
        }
        
        // Check limits
        if (this.trackedResources.timers.size >= this.memoryConfig.maxTimers) {
            this.logger.warn(`Timer limit reached: ${this.trackedResources.timers.size}/${this.memoryConfig.maxTimers}`);
            this.performTimerCleanup();
        }
        
        const wrappedCallback = (...callbackArgs) => {
            // Remove from tracking when timer executes
            this.trackedResources.timers.delete(timerId);
            callback.apply(this, callbackArgs);
        };
        
        const timerId = setTimeout(wrappedCallback, delay, ...args);
        this.trackedResources.timers.add(timerId);
        
        this.logger.debug(`Tracked timeout: ${timerId} (${delay}ms)`);
        return timerId;
    }
    
    /**
     * Set interval with automatic tracking
     */
    setTrackedInterval(callback, interval, ...args) {
        if (this.isDestroyed) {
            this.logger.warn('Attempted to set interval after component destruction');
            return null;
        }
        
        const intervalId = setInterval(callback, interval, ...args);
        this.trackedResources.intervals.add(intervalId);
        
        this.logger.debug(`Tracked interval: ${intervalId} (${interval}ms)`);
        return intervalId;
    }
    
    /**
     * Request animation frame with tracking
     */
    requestTrackedAnimationFrame(callback) {
        if (this.isDestroyed) {
            this.logger.warn('Attempted to request animation frame after component destruction');
            return null;
        }
        
        const wrappedCallback = (timestamp) => {
            // Remove from tracking when frame executes
            this.trackedResources.animationFrames.delete(frameId);
            callback(timestamp);
        };
        
        const frameId = requestAnimationFrame(wrappedCallback);
        this.trackedResources.animationFrames.add(frameId);
        
        return frameId;
    }
    
    /**
     * Track observers (PerformanceObserver, MutationObserver, etc.)
     */
    addTrackedObserver(observer) {
        if (this.isDestroyed) {
            this.logger.warn('Attempted to add observer after component destruction');
            return;
        }
        
        this.trackedResources.observers.add(observer);
        this.logger.debug(`Tracked observer: ${observer.constructor.name}`);
    }
    
    /**
     * Track cache with size enforcement
     */
    addTrackedCache(name, cache, maxSize = null) {
        if (this.isDestroyed) {
            this.logger.warn('Attempted to add cache after component destruction');
            return;
        }
        
        const cacheInfo = {
            cache,
            maxSize: maxSize || this.memoryConfig.maxCacheSize,
            created: Date.now()
        };
        
        this.trackedResources.caches.set(name, cacheInfo);
        this.logger.debug(`Tracked cache: ${name} (max: ${cacheInfo.maxSize})`);
    }
    
    /**
     * Track media streams
     */
    addTrackedStream(stream) {
        if (this.isDestroyed) {
            this.logger.warn('Attempted to add stream after component destruction');
            return;
        }
        
        this.trackedResources.streams.add(stream);
        this.logger.debug(`Tracked media stream: ${stream.id}`);
    }
    
    /**
     * Track connections (WebSocket, EventSource, etc.)
     */
    addTrackedConnection(connection) {
        if (this.isDestroyed) {
            this.logger.warn('Attempted to add connection after component destruction');
            return;
        }
        
        this.trackedResources.connections.add(connection);
        this.logger.debug(`Tracked connection: ${connection.constructor.name}`);
    }
    
    /**
     * Add callback to be executed during destruction
     */
    addDestructionCallback(callback, description = 'Custom cleanup') {
        this.destructionCallbacks.push({ callback, description });
    }
    
    /**
     * Perform periodic cleanup
     */
    performPeriodicCleanup() {
        const now = Date.now();
        
        // Update memory metrics
        if (performance.memory) {
            this.memoryMetrics.currentMemory = performance.memory.usedJSHeapSize;
            this.memoryMetrics.peakMemory = Math.max(
                this.memoryMetrics.peakMemory,
                this.memoryMetrics.currentMemory
            );
        }
        
        // Clean up caches if they exceed limits
        this.performCacheCleanup();
        
        // Clean up expired timers (defensive)
        this.performTimerCleanup();
        
        // Check memory budget
        this.checkMemoryBudget();
        
        this.memoryMetrics.lastCleanup = now;
        this.memoryMetrics.cleanupCount++;
        
        this.logger.debug(`Periodic cleanup #${this.memoryMetrics.cleanupCount} completed`);
    }
    
    /**
     * Clean up event listeners that may have been orphaned
     */
    performEventListenerCleanup() {
        let cleaned = 0;
        
        for (const [element, listeners] of this.trackedResources.eventListeners) {
            // Check if element is still in the DOM or if it's a valid object
            if (!element || (element.nodeType && !document.contains(element))) {
                // Element is no longer in DOM, clean up its listeners
                listeners.forEach(({ event, handler }) => {
                    try {
                        element.removeEventListener(event, handler);
                        cleaned++;
                    } catch (error) {
                        // Element might be already cleaned up
                    }
                });
                this.trackedResources.eventListeners.delete(element);
            }
        }
        
        if (cleaned > 0) {
            this.logger.info(`Cleaned up ${cleaned} orphaned event listeners`);
        }
    }
    
    /**
     * Clean up caches that exceed size limits
     */
    performCacheCleanup() {
        for (const [name, cacheInfo] of this.trackedResources.caches) {
            const { cache, maxSize } = cacheInfo;
            
            if (cache instanceof Map) {
                if (cache.size > maxSize) {
                    // LRU eviction for Map caches
                    const excess = cache.size - maxSize;
                    const keysToDelete = Array.from(cache.keys()).slice(0, excess);
                    keysToDelete.forEach(key => cache.delete(key));
                    
                    this.logger.debug(`Cache '${name}' cleaned: removed ${excess} entries`);
                }
            } else if (cache instanceof Set) {
                if (cache.size > maxSize) {
                    // Convert to array, slice, and reconstruct for Set caches
                    const entries = Array.from(cache);
                    cache.clear();
                    entries.slice(-maxSize).forEach(entry => cache.add(entry));
                    
                    this.logger.debug(`Cache '${name}' cleaned: kept ${maxSize} most recent entries`);
                }
            }
        }
    }
    
    /**
     * Clean up potentially stale timers
     */
    performTimerCleanup() {
        // Clear any timers that might be stale (defensive cleanup)
        // This is mainly for edge cases where timer tracking gets out of sync
        if (this.trackedResources.timers.size > this.memoryConfig.maxTimers * 1.5) {
            this.logger.warn(`Excessive timer count detected: ${this.trackedResources.timers.size}`);
            // Clear all tracked timers as a defensive measure
            this.clearAllTimers();
        }
    }
    
    /**
     * Check memory budget and warn if exceeded
     */
    checkMemoryBudget() {
        if (!performance.memory) return;
        
        const currentMB = this.memoryMetrics.currentMemory / 1024 / 1024;
        const initialMB = this.memoryMetrics.initialMemory / 1024 / 1024;
        const deltaMB = currentMB - initialMB;
        
        if (deltaMB > this.memoryConfig.memoryBudgetMB) {
            this.logger.warn(
                `Memory budget exceeded: ${deltaMB.toFixed(1)}MB used, ` +
                `budget: ${this.memoryConfig.memoryBudgetMB}MB`
            );
            
            // Trigger aggressive cleanup
            this.performAggressiveCleanup();
        }
    }
    
    /**
     * Perform aggressive cleanup when memory budget is exceeded
     */
    performAggressiveCleanup() {
        this.logger.info('Performing aggressive cleanup due to memory budget exceeded');
        
        // Clean up all caches more aggressively
        for (const [name, cacheInfo] of this.trackedResources.caches) {
            const { cache } = cacheInfo;
            const originalSize = cache.size;
            
            if (cache instanceof Map) {
                // Keep only 25% of entries
                const keepSize = Math.floor(originalSize * 0.25);
                const keysToDelete = Array.from(cache.keys()).slice(0, originalSize - keepSize);
                keysToDelete.forEach(key => cache.delete(key));
            } else if (cache instanceof Set) {
                const entries = Array.from(cache);
                cache.clear();
                entries.slice(-Math.floor(originalSize * 0.25)).forEach(entry => cache.add(entry));
            }
            
            this.logger.debug(`Aggressively cleaned cache '${name}': ${originalSize} -> ${cache.size}`);
        }
        
        // Force garbage collection if available (Chrome DevTools)
        if (window.gc) {
            window.gc();
            this.logger.debug('Forced garbage collection');
        }
    }
    
    /**
     * Clear all tracked timers
     */
    clearAllTimers() {
        // Clear timeouts
        this.trackedResources.timers.forEach(timerId => {
            clearTimeout(timerId);
        });
        this.trackedResources.timers.clear();
        
        // Clear intervals
        this.trackedResources.intervals.forEach(intervalId => {
            clearInterval(intervalId);
        });
        this.trackedResources.intervals.clear();
        
        // Clear animation frames
        this.trackedResources.animationFrames.forEach(frameId => {
            cancelAnimationFrame(frameId);
        });
        this.trackedResources.animationFrames.clear();
        
        this.logger.debug('Cleared all timers, intervals, and animation frames');
    }
    
    /**
     * Clear all tracked event listeners
     */
    clearAllEventListeners() {
        let cleared = 0;
        
        for (const [element, listeners] of this.trackedResources.eventListeners) {
            listeners.forEach(({ event, handler }) => {
                try {
                    element.removeEventListener(event, handler);
                    cleared++;
                } catch (error) {
                    // Element might be already cleaned up
                    this.logger.debug(`Failed to remove listener: ${error.message}`);
                }
            });
        }
        
        this.trackedResources.eventListeners.clear();
        this.logger.debug(`Cleared ${cleared} event listeners`);
    }
    
    /**
     * Clear all tracked observers
     */
    clearAllObservers() {
        let cleared = 0;
        
        this.trackedResources.observers.forEach(observer => {
            try {
                if (typeof observer.disconnect === 'function') {
                    observer.disconnect();
                    cleared++;
                }
            } catch (error) {
                this.logger.debug(`Failed to disconnect observer: ${error.message}`);
            }
        });
        
        this.trackedResources.observers.clear();
        this.logger.debug(`Disconnected ${cleared} observers`);
    }
    
    /**
     * Clear all tracked streams
     */
    clearAllStreams() {
        let cleared = 0;
        
        this.trackedResources.streams.forEach(stream => {
            try {
                stream.getTracks().forEach(track => track.stop());
                cleared++;
            } catch (error) {
                this.logger.debug(`Failed to stop stream: ${error.message}`);
            }
        });
        
        this.trackedResources.streams.clear();
        this.logger.debug(`Stopped ${cleared} media streams`);
    }
    
    /**
     * Clear all tracked connections
     */
    clearAllConnections() {
        let cleared = 0;
        
        this.trackedResources.connections.forEach(connection => {
            try {
                if (typeof connection.close === 'function') {
                    connection.close();
                    cleared++;
                }
            } catch (error) {
                this.logger.debug(`Failed to close connection: ${error.message}`);
            }
        });
        
        this.trackedResources.connections.clear();
        this.logger.debug(`Closed ${cleared} connections`);
    }
    
    /**
     * Get memory usage statistics
     */
    getMemoryStats() {
        const stats = {
            component: this.componentName,
            isDestroyed: this.isDestroyed,
            resources: {
                eventListeners: Array.from(this.trackedResources.eventListeners.values())
                    .reduce((sum, listeners) => sum + listeners.length, 0),
                timers: this.trackedResources.timers.size,
                intervals: this.trackedResources.intervals.size,
                animationFrames: this.trackedResources.animationFrames.size,
                observers: this.trackedResources.observers.size,
                caches: this.trackedResources.caches.size,
                streams: this.trackedResources.streams.size,
                connections: this.trackedResources.connections.size
            },
            memory: { ...this.memoryMetrics }
        };
        
        if (performance.memory) {
            const currentMB = performance.memory.usedJSHeapSize / 1024 / 1024;
            const initialMB = this.memoryMetrics.initialMemory / 1024 / 1024;
            stats.memory.currentMB = currentMB.toFixed(2);
            stats.memory.initialMB = initialMB.toFixed(2);
            stats.memory.deltaMB = (currentMB - initialMB).toFixed(2);
        }
        
        return stats;
    }
    
    /**
     * Destroy component and clean up all resources
     */
    destroy() {
        if (this.isDestroyed) {
            this.logger.warn('Component already destroyed');
            return;
        }
        
        this.logger.info(`Destroying memory-managed component: ${this.componentName}`);
        
        const startTime = performance.now();
        const stats = this.getMemoryStats();
        
        // Execute custom destruction callbacks
        this.destructionCallbacks.forEach(({ callback, description }) => {
            try {
                callback.call(this);
                this.logger.debug(`Executed destruction callback: ${description}`);
            } catch (error) {
                this.logger.error(`Destruction callback failed (${description}):`, error);
            }
        });
        
        // Clear all tracked resources
        this.clearAllEventListeners();
        this.clearAllTimers();
        this.clearAllObservers();
        this.clearAllStreams();
        this.clearAllConnections();
        
        // Clear caches
        this.trackedResources.caches.clear();
        
        // Mark as destroyed
        this.isDestroyed = true;
        
        const duration = performance.now() - startTime;
        this.logger.info(
            `Component '${this.componentName}' destroyed in ${duration.toFixed(2)}ms. ` +
            `Cleaned up: ${stats.resources.eventListeners} listeners, ` +
            `${stats.resources.timers} timers, ${stats.resources.intervals} intervals, ` +
            `${stats.resources.observers} observers`
        );
    }
}

/**
 * Memory Manager Singleton
 * Provides global memory monitoring and cleanup coordination
 */
export class MemoryManager {
    constructor() {
        this.logger = new Logger('MemoryManager');
        this.components = new Set();
        this.globalStats = {
            totalComponents: 0,
            activeComponents: 0,
            destroyedComponents: 0
        };
        
        // Global memory monitoring
        this.startGlobalMonitoring();
        
        this.logger.info('Global Memory Manager initialized');
    }
    
    /**
     * Register a memory-managed component
     */
    registerComponent(component) {
        if (!(component instanceof MemoryManagedComponent)) {
            this.logger.warn('Attempted to register non-memory-managed component');
            return;
        }
        
        this.components.add(component);
        this.globalStats.totalComponents++;
        this.globalStats.activeComponents++;
        
        this.logger.debug(`Registered component: ${component.componentName}`);
    }
    
    /**
     * Unregister a component (called during destruction)
     */
    unregisterComponent(component) {
        if (this.components.has(component)) {
            this.components.delete(component);
            this.globalStats.activeComponents--;
            this.globalStats.destroyedComponents++;
            
            this.logger.debug(`Unregistered component: ${component.componentName}`);
        }
    }
    
    /**
     * Start global memory monitoring
     */
    startGlobalMonitoring() {
        // Monitor every 30 seconds
        setInterval(() => {
            this.performGlobalCheck();
        }, 30000);
        
        // Monitor on page visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.performGlobalCleanup();
            }
        });
        
        // Monitor on page unload
        window.addEventListener('beforeunload', () => {
            this.destroyAllComponents();
        });
    }
    
    /**
     * Perform global memory check
     */
    performGlobalCheck() {
        if (!performance.memory) return;
        
        const memoryMB = performance.memory.usedJSHeapSize / 1024 / 1024;
        const stats = this.getGlobalStats();
        
        this.logger.debug(
            `Global memory check: ${memoryMB.toFixed(1)}MB used, ` +
            `${stats.activeComponents} active components`
        );
        
        // If memory usage is high, trigger cleanup
        if (memoryMB > 200) { // 200MB threshold
            this.logger.warn(`High memory usage detected: ${memoryMB.toFixed(1)}MB`);
            this.performGlobalCleanup();
        }
    }
    
    /**
     * Perform global cleanup
     */
    performGlobalCleanup() {
        this.logger.info('Performing global memory cleanup');
        
        for (const component of this.components) {
            if (!component.isDestroyed) {
                component.performPeriodicCleanup();
            }
        }
    }
    
    /**
     * Destroy all registered components
     */
    destroyAllComponents() {
        this.logger.info(`Destroying all ${this.components.size} registered components`);
        
        for (const component of this.components) {
            if (!component.isDestroyed) {
                component.destroy();
            }
        }
        
        this.components.clear();
        this.globalStats.activeComponents = 0;
        this.globalStats.destroyedComponents = this.globalStats.totalComponents;
    }
    
    /**
     * Get global memory statistics
     */
    getGlobalStats() {
        const componentStats = Array.from(this.components)
            .filter(c => !c.isDestroyed)
            .map(c => c.getMemoryStats());
        
        const aggregated = componentStats.reduce((acc, stats) => {
            acc.eventListeners += stats.resources.eventListeners;
            acc.timers += stats.resources.timers;
            acc.intervals += stats.resources.intervals;
            acc.observers += stats.resources.observers;
            acc.caches += stats.resources.caches;
            return acc;
        }, {
            eventListeners: 0,
            timers: 0,
            intervals: 0,
            observers: 0,
            caches: 0
        });
        
        return {
            ...this.globalStats,
            activeComponents: this.components.size,
            resources: aggregated,
            components: componentStats
        };
    }
}

// Global instance
export const globalMemoryManager = new MemoryManager();