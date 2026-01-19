/**
 * DashboardService.js
 *
 * Service for aggregating and providing dashboard statistics
 * Features:
 * - Aggregates data from SessionManager and VoiceEngine
 * - Tracks recent activity (price checks, pack openings, training)
 * - Calculates quick stats
 * - Persists activity history in localStorage
 * - Provides formatted data for dashboard display
 */

import { cacheCoordinator } from './CacheCoordinator.js';

export default class DashboardService {
  constructor(options = {}) {
    this.sessionManager = options.sessionManager || null;
    this.voiceEngine = options.voiceEngine || null;
    this.storage = options.storage || null;

    // Activity history
    this.activityHistory = [];
    this.maxActivityItems = 50; // Store max 50 items

    // Cache for stats (to avoid recalculating every render)
    this.statsCache = {
      mainStats: null,
      quickStats: null,
      lastUpdate: null
    };
    this.cacheTimeout = 5000; // 5 seconds cache

    // Initialize
    this.loadActivityHistory();

    // Register with CacheCoordinator for cross-service cache invalidation
    this._registerWithCacheCoordinator();
  }

  /**
   * Register this service's cache with the CacheCoordinator
   * @private
   */
  _registerWithCacheCoordinator() {
    cacheCoordinator.registerCache('dashboard', {
      invalidate: () => this.clearCache(),
      clear: () => this.clearCache()
    });
  }

  /**
   * Clear the stats cache
   */
  clearCache() {
    this.statsCache = {
      mainStats: null,
      quickStats: null,
      lastUpdate: null
    };
  }

  /**
   * Set SessionManager reference
   * @param {Object} sessionManager - SessionManager instance
   */
  setSessionManager(sessionManager) {
    this.sessionManager = sessionManager;
  }

  /**
   * Set VoiceEngine reference
   * @param {Object} voiceEngine - VoiceEngine instance
   */
  setVoiceEngine(voiceEngine) {
    this.voiceEngine = voiceEngine;
  }

  /**
   * Set Storage reference
   * @param {Object} storage - Storage instance
   */
  setStorage(storage) {
    this.storage = storage;
  }

  /**
   * Load activity history from localStorage
   * @private
   */
  loadActivityHistory() {
    try {
      const stored = localStorage.getItem('dashboard_activity');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Ensure parsed data is an array
        this.activityHistory = Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.error('Failed to load activity history:', error);
      this.activityHistory = [];
    }
  }

  /**
   * Save activity history to localStorage
   * @private
   */
  saveActivityHistory() {
    try {
      localStorage.setItem('dashboard_activity', JSON.stringify(this.activityHistory));
    } catch (error) {
      console.error('Failed to save activity history:', error);
    }
  }

  /**
   * Add an activity to the history
   * @param {string} type - Activity type ('price', 'pack', 'training')
   * @param {string} name - Activity name/description
   * @param {string} value - Activity value or status
   */
  addActivity(type, name, value) {
    const activity = {
      type,
      name,
      value,
      timestamp: Date.now(),
      date: new Date().toISOString()
    };

    // Add to beginning of array
    this.activityHistory.unshift(activity);

    // Trim to max items
    if (this.activityHistory.length > this.maxActivityItems) {
      this.activityHistory = this.activityHistory.slice(0, this.maxActivityItems);
    }

    // Save to localStorage
    this.saveActivityHistory();
  }

  /**
   * Get recent activity (last N items)
   * @param {number} limit - Number of items to return (default: 5)
   * @returns {Array} Array of activity items
   */
  getRecentActivity(limit = 5) {
    // Ensure activityHistory is always an array
    if (!Array.isArray(this.activityHistory)) {
      this.activityHistory = [];
    }

    return this.activityHistory.slice(0, limit).map(activity => ({
      type: activity.type,
      name: activity.name,
      value: activity.value,
      timestamp: activity.timestamp,
      typeLabel: this.getActivityTypeLabel(activity.type),
      icon: this.getActivityIcon(activity.type)
    }));
  }

  /**
   * Get activity type label
   * @private
   * @param {string} type - Activity type
   * @returns {string} Label
   */
  getActivityTypeLabel(type) {
    const labels = {
      price: 'Price Check',
      pack: 'Pack Opening',
      training: 'Voice Training'
    };
    return labels[type] || 'Activity';
  }

  /**
   * Get activity icon
   * @private
   * @param {string} type - Activity type
   * @returns {string} Lucide icon name
   */
  getActivityIcon(type) {
    const icons = {
      price: 'DollarSign',
      pack: 'Package',
      training: 'Headphones'
    };
    return icons[type] || 'Activity';
  }

  /**
   * Get main dashboard stats (3 cards)
   * @returns {Array} Array of stat objects
   */
  getMainStats() {
    try {
      // Check cache
      if (this.isCacheValid() && Array.isArray(this.statsCache.mainStats)) {
        return this.statsCache.mainStats;
      }

      const stats = [
        this.getRecognitionAccuracyStat(),
        this.getPacksOpenedStat(),
        this.getCollectionValueStat()
      ];

      // Update cache
      this.statsCache.mainStats = stats;
      this.statsCache.lastUpdate = Date.now();

      return stats;
    } catch (error) {
      console.error('Error getting main stats:', error);
      // Return default stats if error occurs
      return [
        { label: 'Recognition Accuracy', value: 'N/A', icon: 'Activity', trend: null, trendClass: 'text-green-400 bg-green-400/10' },
        { label: 'Packs Opened', value: '0', icon: 'Package', trend: null, trendClass: 'text-green-400 bg-green-400/10' },
        { label: 'Collection Value', value: '$0', icon: 'Wallet', trend: null, trendClass: 'text-green-400 bg-green-400/10' }
      ];
    }
  }

  /**
   * Get Recognition Accuracy stat
   * @private
   * @returns {Object} Stat object
   */
  getRecognitionAccuracyStat() {
    let accuracy = 0;
    let trend = 'N/A';

    if (this.voiceEngine) {
      // Try to get accuracy from voice engine
      // This would need to be implemented in VoiceEngine
      // For now, use a placeholder calculation
      const stats = this.voiceEngine.stats || {};
      const totalRecognitions = stats.totalRecognitions || 0;
      const successfulRecognitions = stats.successfulRecognitions || 0;

      if (totalRecognitions > 0) {
        accuracy = Math.round((successfulRecognitions / totalRecognitions) * 100);
        trend = '+2%'; // Placeholder - would need historical data
      }
    }

    return {
      label: 'Recognition Accuracy',
      value: accuracy > 0 ? `${accuracy}%` : 'N/A',
      icon: 'Activity',
      trend: accuracy > 0 ? trend : null,
      trendClass: 'text-green-400 bg-green-400/10'
    };
  }

  /**
   * Get Packs Opened stat
   * @private
   * @returns {Object} Stat object
   */
  getPacksOpenedStat() {
    let packsOpened = 0;
    let trend = null;

    if (this.sessionManager && this.sessionManager.sessionHistory) {
      // Count pack openings from session history
      const history = Array.isArray(this.sessionManager.sessionHistory)
        ? this.sessionManager.sessionHistory
        : [];
      packsOpened = history.length;

      // Calculate trend (packs this week)
      const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const recentPacks = history.filter(session => {
        const sessionDate = new Date(session.createdAt || session.timestamp);
        return sessionDate.getTime() > weekAgo;
      });

      if (recentPacks.length > 0) {
        trend = `+${recentPacks.length} this week`;
      }
    }

    return {
      label: 'Packs Opened',
      value: packsOpened.toString(),
      icon: 'Package',
      trend: trend,
      trendClass: 'text-green-400 bg-green-400/10'
    };
  }

  /**
   * Get Collection Value stat
   * @private
   * @returns {Object} Stat object
   */
  getCollectionValueStat() {
    let totalValue = 0;
    let trend = null;

    if (this.sessionManager && this.sessionManager.sessionHistory) {
      // Calculate total value from all sessions
      const history = Array.isArray(this.sessionManager.sessionHistory)
        ? this.sessionManager.sessionHistory
        : [];

      history.forEach(session => {
        if (session && Array.isArray(session.cards)) {
          session.cards.forEach(card => {
            const price = card.tcgPlayerMarketPrice || card.tcgPlayerLowPrice || 0;
            totalValue += parseFloat(price) || 0;
          });
        }
      });

      // Calculate trend (value this month)
      const monthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      let monthValue = 0;

      history.forEach(session => {
        if (!session) return;
        const sessionDate = new Date(session.createdAt || session.timestamp);
        if (sessionDate.getTime() > monthAgo && Array.isArray(session.cards)) {
          session.cards.forEach(card => {
            const price = card.tcgPlayerMarketPrice || card.tcgPlayerLowPrice || 0;
            monthValue += parseFloat(price) || 0;
          });
        }
      });

      if (monthValue > 0) {
        trend = `+$${monthValue.toFixed(0)} this month`;
      }
    }

    return {
      label: 'Collection Value',
      value: totalValue > 0 ? `$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '$0',
      icon: 'Wallet',
      trend: trend,
      trendClass: 'text-green-400 bg-green-400/10'
    };
  }

  /**
   * Get quick stats (4 items)
   * @returns {Array} Array of quick stat objects
   */
  getQuickStats() {
    try {
      // Check cache
      if (this.isCacheValid() && Array.isArray(this.statsCache.quickStats)) {
        return this.statsCache.quickStats;
      }

      const stats = [
        this.getTotalValueQuickStat(),
        this.getTopCardStat(),
        this.getRareCardsStat(),
        this.getRecentAddsStat()
      ];

      // Update cache
      this.statsCache.quickStats = stats;

      return stats;
    } catch (error) {
      console.error('Error getting quick stats:', error);
      // Return default stats if error occurs
      return [
        { label: 'Total Value', value: '$0' },
        { label: 'Top Card', value: 'None' },
        { label: 'Rare Count', value: '0' },
        { label: 'Recent Adds', value: '0' }
      ];
    }
  }

  /**
   * Get Total Value quick stat
   * @private
   * @returns {Object} Stat object
   */
  getTotalValueQuickStat() {
    let totalValue = 0;

    // Try to get from CollectionsService first (more accurate)
    const collectionSummary = window.app?.collectionsService?.summary;
    if (collectionSummary) {
      totalValue = parseFloat(collectionSummary.total_value) || 0;
    } else if (this.sessionManager && this.sessionManager.sessionHistory) {
      // Fallback to session history
      const history = Array.isArray(this.sessionManager.sessionHistory)
        ? this.sessionManager.sessionHistory
        : [];
      history.forEach(session => {
        if (session && Array.isArray(session.cards)) {
          session.cards.forEach(card => {
            const price = card.tcgPlayerMarketPrice || card.tcgPlayerLowPrice || 0;
            totalValue += parseFloat(price) || 0;
          });
        }
      });
    }

    return {
      label: 'Total Value',
      value: totalValue > 0 ? `$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '$0'
    };
  }

  /**
   * Get Top Card quick stat
   * @private
   * @returns {Object} Stat object
   */
  getTopCardStat() {
    let topCardName = 'None';
    let maxPrice = 0;

    // We need to iterate over all cards. 
    // Ideally CollectionsService would provide this.
    // For now, iterate session history as fallback or if collection service doesn't have individual cards loaded.

    if (this.sessionManager && this.sessionManager.sessionHistory) {
      const history = Array.isArray(this.sessionManager.sessionHistory)
        ? this.sessionManager.sessionHistory
        : [];

      history.forEach(session => {
        if (session && Array.isArray(session.cards)) {
          session.cards.forEach(card => {
            const price = parseFloat(card.tcgPlayerMarketPrice || card.tcgPlayerLowPrice || 0);
            if (price > maxPrice) {
              maxPrice = price;
              topCardName = card.name;
            }
          });
        }
      });
    }

    // Truncate if too long
    if (topCardName.length > 15) {
      topCardName = topCardName.substring(0, 12) + '...';
    }

    return {
      label: 'Top Card',
      value: topCardName
    };
  }

  /**
   * Get Recent Adds quick stat
   * @private
   * @returns {Object} Stat object
   */
  getRecentAddsStat() {
    let recentCount = 0;
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

    if (this.sessionManager && this.sessionManager.sessionHistory) {
      const history = Array.isArray(this.sessionManager.sessionHistory)
        ? this.sessionManager.sessionHistory
        : [];

      history.forEach(session => {
        const sessionDate = new Date(session.createdAt || session.timestamp).getTime();
        if (sessionDate > oneWeekAgo && session.cards) {
          recentCount += session.cards.length;
        }
      });
    }

    return {
      label: 'Recent Adds',
      value: recentCount.toString()
    };
  }

  /**
   * Get Cards Recognized quick stat
   * @private
   * @returns {Object} Stat object
   */
  getCardsRecognizedStat() {
    let totalCards = 0;

    if (this.sessionManager && this.sessionManager.sessionHistory) {
      const history = Array.isArray(this.sessionManager.sessionHistory)
        ? this.sessionManager.sessionHistory
        : [];
      history.forEach(session => {
        if (session && Array.isArray(session.cards)) {
          totalCards += session.cards.length;
        }
      });
    }

    return {
      label: 'Cards Recognized',
      value: totalCards.toLocaleString('en-US')
    };
  }

  /**
   * Get Success Rate quick stat
   * @private
   * @returns {Object} Stat object
   */
  getSuccessRateStat() {
    let successRate = 0;

    if (this.voiceEngine && this.voiceEngine.stats) {
      const stats = this.voiceEngine.stats;
      const totalRecognitions = stats.totalRecognitions || 0;
      const successfulRecognitions = stats.successfulRecognitions || 0;

      if (totalRecognitions > 0) {
        successRate = Math.round((successfulRecognitions / totalRecognitions) * 100);
      }
    }

    return {
      label: 'Success Rate',
      value: successRate > 0 ? `${successRate}%` : 'N/A'
    };
  }

  /**
   * Get Rare Cards quick stat
   * @private
   * @returns {Object} Stat object
   */
  getRareCardsStat() {
    let rareCards = 0;

    if (this.sessionManager && this.sessionManager.sessionHistory) {
      const history = Array.isArray(this.sessionManager.sessionHistory)
        ? this.sessionManager.sessionHistory
        : [];
      const rareRarities = ['rare', 'super rare', 'ultra rare', 'secret rare', 'ultimate rare',
        'ghost rare', 'starlight rare', 'collector rare', 'prismatic secret rare',
        'quarter century secret rare', 'platinum secret rare'];

      history.forEach(session => {
        if (session && Array.isArray(session.cards)) {
          session.cards.forEach(card => {
            const rarity = (card.rarity || '').toLowerCase();
            if (rareRarities.some(r => rarity.includes(r))) {
              rareCards++;
            }
          });
        }
      });
    }

    return {
      label: 'Rare Cards',
      value: rareCards.toString()
    };
  }

  /**
   * Get Average Response Time quick stat
   * @private
   * @returns {Object} Stat object
   */
  getAvgResponseStat() {
    let avgResponse = 0;

    if (this.voiceEngine) {
      // This would need to be tracked in VoiceEngine
      // Placeholder for now
      avgResponse = 0.08; // 80ms
    }

    return {
      label: 'Avg Response',
      value: avgResponse > 0 ? `${avgResponse.toFixed(2)}s` : 'N/A'
    };
  }

  /**
   * Check if stats cache is still valid
   * @private
   * @returns {boolean} True if cache is valid
   */
  isCacheValid() {
    if (!this.statsCache.lastUpdate) {
      return false;
    }

    const now = Date.now();
    const elapsed = now - this.statsCache.lastUpdate;

    return elapsed < this.cacheTimeout;
  }

  /**
   * Clear all activity history
   */
  clearActivityHistory() {
    this.activityHistory = [];
    this.saveActivityHistory();
  }
}
