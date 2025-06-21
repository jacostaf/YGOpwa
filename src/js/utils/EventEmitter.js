/**
 * Simple EventEmitter implementation for browser
 * Provides basic event emitting/listening functionality
 */
export class EventEmitter {
    constructor() {
        this.events = new Map();
    }

    /**
     * Add an event listener
     * @param {string} event - Event name
     * @param {Function} listener - Callback function
     * @returns {Function} Unsubscribe function
     */
    on(event, listener) {
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }
        this.events.get(event).add(listener);
        
        // Return unsubscribe function
        return () => this.off(event, listener);
    }

    /**
     * Remove an event listener
     * @param {string} event - Event name
     * @param {Function} listener - Callback function to remove
     */
    off(event, listener) {
        if (this.events.has(event)) {
            const listeners = this.events.get(event);
            listeners.delete(listener);
            
            if (listeners.size === 0) {
                this.events.delete(event);
            }
        }
    }

    /**
     * Add a one-time event listener
     * @param {string} event - Event name
     * @param {Function} listener - Callback function
     */
    once(event, listener) {
        const onceWrapper = (...args) => {
            this.off(event, onceWrapper);
            listener.apply(this, args);
        };
        this.on(event, onceWrapper);
    }

    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {...*} args - Arguments to pass to listeners
     * @returns {boolean} True if event had listeners
     */
    emit(event, ...args) {
        if (!this.events.has(event)) {
            return false;
        }
        
        const listeners = this.events.get(event);
        listeners.forEach(listener => {
            try {
                listener.apply(this, args);
            } catch (error) {
                console.error(`Error in event listener for '${event}':`, error);
            }
        });
        
        return true;
    }

    /**
     * Remove all listeners for an event, or all events if no event specified
     * @param {string} [event] - Optional event name
     */
    removeAllListeners(event) {
        if (event) {
            this.events.delete(event);
        } else {
            this.events.clear();
        }
    }
}

export default EventEmitter;
