/**
 * EventEmitter - Lightweight event system with proper cleanup support
 *
 * Features:
 * - Returns unsubscribe functions to prevent memory leaks
 * - Supports one-time listeners (once)
 * - Error isolation between listeners
 * - Set-based storage prevents duplicate registrations
 *
 * Usage:
 *   const emitter = new EventEmitter();
 *   const unsubscribe = emitter.on('event', callback);
 *   // Later, to clean up:
 *   unsubscribe();
 */

export class EventEmitter {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();

    /** @type {Map<string, Set<Function>>} */
    this._onceListeners = new Map();
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Handler function
   * @returns {Function} Unsubscribe function - call this to remove the listener
   */
  on(event, callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('EventEmitter: callback must be a function');
    }

    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }

    this._listeners.get(event).add(callback);

    // Return unsubscribe function for easy cleanup
    return () => {
      this.off(event, callback);
    };
  }

  /**
   * Alias for on() - matches DOM addEventListener API
   * @param {string} event - Event name
   * @param {Function} callback - Handler function
   * @returns {Function} Unsubscribe function
   */
  addEventListener(event, callback) {
    return this.on(event, callback);
  }

  /**
   * Subscribe to an event, but only fire once
   * @param {string} event - Event name
   * @param {Function} callback - Handler function
   * @returns {Function} Unsubscribe function
   */
  once(event, callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('EventEmitter: callback must be a function');
    }

    if (!this._onceListeners.has(event)) {
      this._onceListeners.set(event, new Set());
    }

    this._onceListeners.get(event).add(callback);

    return () => {
      this._onceListeners.get(event)?.delete(callback);
    };
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} callback - Handler to remove
   * @returns {boolean} Whether the callback was found and removed
   */
  off(event, callback) {
    const removed = this._listeners.get(event)?.delete(callback) ?? false;
    this._onceListeners.get(event)?.delete(callback);
    return removed;
  }

  /**
   * Alias for off() - matches DOM removeEventListener API
   * @param {string} event - Event name
   * @param {Function} callback - Handler to remove
   * @returns {boolean} Whether removed
   */
  removeEventListener(event, callback) {
    return this.off(event, callback);
  }

  /**
   * Remove all listeners for a specific event, or all events if no event specified
   * @param {string} [event] - Optional event name
   */
  removeAllListeners(event) {
    if (event !== undefined) {
      this._listeners.delete(event);
      this._onceListeners.delete(event);
    } else {
      this._listeners.clear();
      this._onceListeners.clear();
    }
  }

  /**
   * Emit an event with optional data
   * @param {string} event - Event name
   * @param {...*} args - Event arguments
   */
  emit(event, ...args) {
    // Call regular listeners
    const listeners = this._listeners.get(event);
    if (listeners) {
      // Iterate over a copy to allow listeners to remove themselves safely
      for (const callback of [...listeners]) {
        try {
          callback(...args);
        } catch (err) {
          console.error(`[EventEmitter] Error in listener for "${event}":`, err);
        }
      }
    }

    // Call once listeners and remove them
    const onceListeners = this._onceListeners.get(event);
    if (onceListeners && onceListeners.size > 0) {
      for (const callback of [...onceListeners]) {
        try {
          callback(...args);
        } catch (err) {
          console.error(`[EventEmitter] Error in once listener for "${event}":`, err);
        }
      }
      this._onceListeners.delete(event);
    }
  }

  /**
   * Get the count of listeners for an event
   * @param {string} event - Event name
   * @returns {number}
   */
  listenerCount(event) {
    const regular = this._listeners.get(event)?.size ?? 0;
    const once = this._onceListeners.get(event)?.size ?? 0;
    return regular + once;
  }

  /**
   * Check if there are any listeners for an event
   * @param {string} event - Event name
   * @returns {boolean}
   */
  hasListeners(event) {
    return this.listenerCount(event) > 0;
  }

  /**
   * Get all registered event names
   * @returns {string[]}
   */
  eventNames() {
    const events = new Set([
      ...this._listeners.keys(),
      ...this._onceListeners.keys()
    ]);
    return [...events];
  }

  /**
   * Clean up all listeners - call this when destroying the emitter
   */
  destroy() {
    this._listeners.clear();
    this._onceListeners.clear();
  }
}

export default EventEmitter;
