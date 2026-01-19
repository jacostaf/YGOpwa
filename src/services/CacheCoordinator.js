/**
 * CacheCoordinator - Manages cache invalidation across services
 *
 * Problem solved: Multiple services have independent caches that can become
 * inconsistent when data changes. This coordinator provides a central event
 * bus for cache invalidation.
 *
 * Usage:
 *   // Register a cache
 *   cacheCoordinator.registerCache('collection', {
 *     invalidate: () => collectionManager.invalidateCache(),
 *     clear: () => collectionManager.clearCache()
 *   });
 *
 *   // Configure which caches to invalidate on events
 *   cacheCoordinator.registerInvalidationTrigger('card-added', ['collection', 'dashboard', 'stats']);
 *
 *   // When a card is added, invalidate all related caches
 *   cacheCoordinator.invalidate('card-added', { cardId: '123' });
 */

class CacheCoordinator {
  constructor() {
    /** @type {Map<string, {invalidate?: Function, clear?: Function}>} */
    this._caches = new Map();

    /** @type {Map<string, Set<string>>} */
    this._invalidationMap = new Map();

    // Default invalidation triggers
    this._setupDefaultTriggers();
  }

  /**
   * Register a cache with its invalidation handlers
   * @param {string} name - Cache identifier
   * @param {Object} handlers - Object with invalidate and/or clear functions
   */
  registerCache(name, handlers) {
    if (!handlers || typeof handlers !== 'object') {
      console.warn(`[CacheCoordinator] Invalid handlers for cache "${name}"`);
      return;
    }
    this._caches.set(name, handlers);
    console.log(`[CacheCoordinator] Registered cache: ${name}`);
  }

  /**
   * Unregister a cache
   * @param {string} name - Cache identifier
   */
  unregisterCache(name) {
    this._caches.delete(name);
  }

  /**
   * Register which caches should be invalidated when an event occurs
   * @param {string} event - Event name (e.g., 'card-added', 'price-updated')
   * @param {string[]} cacheNames - Array of cache names to invalidate
   */
  registerInvalidationTrigger(event, cacheNames) {
    if (!this._invalidationMap.has(event)) {
      this._invalidationMap.set(event, new Set());
    }
    const set = this._invalidationMap.get(event);
    cacheNames.forEach(name => set.add(name));
  }

  /**
   * Invalidate caches associated with an event
   * @param {string} event - Event name
   * @param {*} [data] - Optional event data passed to invalidation handlers
   */
  invalidate(event, data) {
    const cacheNames = this._invalidationMap.get(event);
    if (!cacheNames || cacheNames.size === 0) {
      console.debug(`[CacheCoordinator] No caches registered for event: ${event}`);
      return;
    }

    console.log(`[CacheCoordinator] Invalidating caches for event: ${event}`, [...cacheNames]);

    for (const name of cacheNames) {
      const cache = this._caches.get(name);
      if (cache && typeof cache.invalidate === 'function') {
        try {
          cache.invalidate(data);
        } catch (err) {
          console.error(`[CacheCoordinator] Error invalidating cache "${name}":`, err);
        }
      }
    }
  }

  /**
   * Clear all registered caches
   */
  clearAll() {
    console.log('[CacheCoordinator] Clearing all caches');
    for (const [name, cache] of this._caches) {
      if (typeof cache.clear === 'function') {
        try {
          cache.clear();
        } catch (err) {
          console.error(`[CacheCoordinator] Error clearing cache "${name}":`, err);
        }
      } else if (typeof cache.invalidate === 'function') {
        // Fallback to invalidate if clear not available
        try {
          cache.invalidate();
        } catch (err) {
          console.error(`[CacheCoordinator] Error invalidating cache "${name}":`, err);
        }
      }
    }
  }

  /**
   * Get list of registered caches
   * @returns {string[]}
   */
  getRegisteredCaches() {
    return [...this._caches.keys()];
  }

  /**
   * Get invalidation triggers for an event
   * @param {string} event
   * @returns {string[]}
   */
  getTriggersForEvent(event) {
    const set = this._invalidationMap.get(event);
    return set ? [...set] : [];
  }

  /**
   * Set up default invalidation triggers for common events
   * @private
   */
  _setupDefaultTriggers() {
    // When a card is added to collection
    this.registerInvalidationTrigger('card-added', ['collection', 'dashboard', 'stats']);

    // When a card is removed from collection
    this.registerInvalidationTrigger('card-removed', ['collection', 'dashboard', 'stats']);

    // When collection is modified
    this.registerInvalidationTrigger('collection-modified', ['collection', 'dashboard']);

    // When prices are updated
    this.registerInvalidationTrigger('price-updated', ['collection', 'dashboard', 'stats']);

    // When user logs in/out
    this.registerInvalidationTrigger('auth-change', ['collection', 'dashboard', 'stats', 'user']);

    // Full refresh (clear everything)
    this.registerInvalidationTrigger('full-refresh', ['collection', 'dashboard', 'stats', 'price', 'user']);
  }
}

// Export singleton instance
export const cacheCoordinator = new CacheCoordinator();
export default cacheCoordinator;
