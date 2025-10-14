/**
 * AchievementManager - Tracks and manages user achievements
 *
 * Features:
 * - 15 achievements across 4 categories (Voice, Pack, Collection, General)
 * - Progress tracking with localStorage persistence
 * - Unlock notifications
 * - Event-based tracking integration
 *
 * @class AchievementManager
 */

export class AchievementManager {
  constructor(app) {
    this.app = app;
    this.achievements = new Map();
    this.listeners = new Set();
    this.storageKey = 'voxrip_achievements';
    this.statsKey = 'voxrip_achievement_stats';

    this.init();
  }

  /**
   * Initialize achievement system
   */
  init() {
    // Define all achievements
    this.defineAchievements();

    // Load saved progress from localStorage
    this.loadProgress();

    // Set up event listeners for tracking
    this.setupTracking();
  }

  /**
   * Define all achievements with metadata
   */
  defineAchievements() {
    const achievementDefinitions = [
      // VOICE RECOGNITION CATEGORY
      {
        id: 'first_recognition',
        category: 'voice',
        name: 'First Recognition',
        description: 'Recognize your first card using voice',
        icon: 'Mic',
        requirement: 1,
        checkProgress: (stats) => stats.cardsRecognized || 0,
        rarity: 'common'
      },
      {
        id: 'voice_master',
        category: 'voice',
        name: 'Voice Master',
        description: 'Recognize 100 cards using voice',
        icon: 'Volume2',
        requirement: 100,
        checkProgress: (stats) => stats.cardsRecognized || 0,
        rarity: 'rare'
      },
      {
        id: 'perfect_recognition',
        category: 'voice',
        name: 'Perfect Recognition',
        description: 'Recognize 10 cards at 100% confidence',
        icon: 'Target',
        requirement: 10,
        checkProgress: (stats) => stats.perfectRecognitions || 0,
        rarity: 'epic'
      },
      {
        id: 'training_dedication',
        category: 'voice',
        name: 'Training Dedication',
        description: 'Train 10 voice patterns',
        icon: 'Headphones',
        requirement: 10,
        checkProgress: (stats) => stats.patternsTrained || 0,
        rarity: 'uncommon'
      },

      // PACK OPENING CATEGORY
      {
        id: 'first_pack',
        category: 'pack',
        name: 'First Pack',
        description: 'Open your first pack',
        icon: 'Package',
        requirement: 1,
        checkProgress: (stats) => stats.packsOpened || 0,
        rarity: 'common'
      },
      {
        id: 'pack_addict',
        category: 'pack',
        name: 'Pack Addict',
        description: 'Open 100 packs',
        icon: 'PackageOpen',
        requirement: 100,
        checkProgress: (stats) => stats.packsOpened || 0,
        rarity: 'rare'
      },
      {
        id: 'rare_find',
        category: 'pack',
        name: 'Rare Find',
        description: 'Pull an Ultra Rare card',
        icon: 'Sparkles',
        requirement: 1,
        checkProgress: (stats) => stats.ultraRaresPulled || 0,
        rarity: 'epic'
      },
      {
        id: 'jackpot',
        category: 'pack',
        name: 'Jackpot',
        description: 'Open a pack worth $100+',
        icon: 'DollarSign',
        requirement: 1,
        checkProgress: (stats) => stats.highValuePacks || 0,
        rarity: 'legendary'
      },

      // COLLECTION CATEGORY
      {
        id: 'collector',
        category: 'collection',
        name: 'Collector',
        description: 'Own 100 cards in your collection',
        icon: 'FolderOpen',
        requirement: 100,
        checkProgress: (stats) => stats.totalCards || 0,
        rarity: 'uncommon'
      },
      {
        id: 'completionist',
        category: 'collection',
        name: 'Completionist',
        description: 'Own all cards from one set',
        icon: 'CheckCircle',
        requirement: 1,
        checkProgress: (stats) => stats.completedSets || 0,
        rarity: 'legendary'
      },
      {
        id: 'value_hunter',
        category: 'collection',
        name: 'Value Hunter',
        description: 'Collection worth $1000+',
        icon: 'TrendingUp',
        requirement: 1000,
        checkProgress: (stats) => stats.collectionValue || 0,
        rarity: 'epic'
      },
      {
        id: 'diverse_collection',
        category: 'collection',
        name: 'Diverse Collection',
        description: 'Own cards from 10+ different sets',
        icon: 'Grid',
        requirement: 10,
        checkProgress: (stats) => stats.uniqueSets || 0,
        rarity: 'rare'
      },

      // GENERAL CATEGORY
      {
        id: 'early_adopter',
        category: 'general',
        name: 'Early Adopter',
        description: 'Use the app for 7 days',
        icon: 'Calendar',
        requirement: 7,
        checkProgress: (stats) => stats.daysActive || 0,
        rarity: 'uncommon'
      },
      {
        id: 'theme_explorer',
        category: 'general',
        name: 'Theme Explorer',
        description: 'Try all 7 themes',
        icon: 'Palette',
        requirement: 7,
        checkProgress: (stats) => stats.themesUsed || 0,
        rarity: 'uncommon'
      },
      {
        id: 'price_pro',
        category: 'general',
        name: 'Price Pro',
        description: 'Check prices for 50 cards',
        icon: 'Search',
        requirement: 50,
        checkProgress: (stats) => stats.pricesChecked || 0,
        rarity: 'rare'
      }
    ];

    // Initialize achievement map
    achievementDefinitions.forEach(def => {
      this.achievements.set(def.id, {
        ...def,
        unlocked: false,
        progress: 0,
        unlockedAt: null
      });
    });
  }

  /**
   * Load achievement progress from localStorage
   */
  loadProgress() {
    try {
      const savedAchievements = localStorage.getItem(this.storageKey);
      if (savedAchievements) {
        const parsed = JSON.parse(savedAchievements);

        // Merge saved data with definitions
        parsed.forEach(saved => {
          if (this.achievements.has(saved.id)) {
            const achievement = this.achievements.get(saved.id);
            achievement.unlocked = saved.unlocked || false;
            achievement.progress = saved.progress || 0;
            achievement.unlockedAt = saved.unlockedAt || null;
          }
        });
      }
    } catch (error) {
      console.error('Failed to load achievements:', error);
    }
  }

  /**
   * Save achievement progress to localStorage
   */
  saveProgress() {
    try {
      const achievementsArray = Array.from(this.achievements.values()).map(achievement => ({
        id: achievement.id,
        unlocked: achievement.unlocked,
        progress: achievement.progress,
        unlockedAt: achievement.unlockedAt
      }));

      localStorage.setItem(this.storageKey, JSON.stringify(achievementsArray));
    } catch (error) {
      console.error('Failed to save achievements:', error);
    }
  }

  /**
   * Set up event listeners for automatic tracking
   */
  setupTracking() {
    // Track theme usage
    if (this.app.themeManager) {
      this.app.themeManager.addEventListener((theme) => {
        this.trackThemeUsage(theme);
      });
    }

    // Track daily usage (check once per session)
    this.trackDailyUsage();
  }

  /**
   * Get all achievements
   * @returns {Array} Array of all achievements
   */
  getAllAchievements() {
    return Array.from(this.achievements.values());
  }

  /**
   * Get achievements by category
   * @param {string} category - Category to filter by
   * @returns {Array} Filtered achievements
   */
  getAchievementsByCategory(category) {
    return this.getAllAchievements().filter(a => a.category === category);
  }

  /**
   * Get unlocked achievements
   * @returns {Array} Unlocked achievements
   */
  getUnlockedAchievements() {
    return this.getAllAchievements().filter(a => a.unlocked);
  }

  /**
   * Get achievement statistics
   * @returns {Object} Achievement stats
   */
  getStats() {
    const all = this.getAllAchievements();
    const unlocked = this.getUnlockedAchievements();

    return {
      total: all.length,
      unlocked: unlocked.length,
      locked: all.length - unlocked.length,
      percentage: all.length > 0 ? Math.round((unlocked.length / all.length) * 100) : 0,
      byCategory: {
        voice: this.getCategoryStats('voice'),
        pack: this.getCategoryStats('pack'),
        collection: this.getCategoryStats('collection'),
        general: this.getCategoryStats('general')
      }
    };
  }

  /**
   * Get category statistics
   * @param {string} category - Category name
   * @returns {Object} Category stats
   */
  getCategoryStats(category) {
    const categoryAchievements = this.getAchievementsByCategory(category);
    const unlocked = categoryAchievements.filter(a => a.unlocked).length;

    return {
      total: categoryAchievements.length,
      unlocked,
      locked: categoryAchievements.length - unlocked
    };
  }

  /**
   * Update achievement progress
   * @param {string} achievementId - Achievement ID
   * @param {number} progress - New progress value
   */
  updateProgress(achievementId, progress) {
    const achievement = this.achievements.get(achievementId);
    if (!achievement || achievement.unlocked) {
      return; // Already unlocked or doesn't exist
    }

    achievement.progress = progress;

    // Check if achievement should be unlocked
    if (progress >= achievement.requirement) {
      this.unlockAchievement(achievementId);
    } else {
      this.saveProgress();
    }
  }

  /**
   * Increment achievement progress
   * @param {string} achievementId - Achievement ID
   * @param {number} amount - Amount to increment (default 1)
   */
  incrementProgress(achievementId, amount = 1) {
    const achievement = this.achievements.get(achievementId);
    if (!achievement || achievement.unlocked) {
      return;
    }

    this.updateProgress(achievementId, achievement.progress + amount);
  }

  /**
   * Unlock an achievement
   * @param {string} achievementId - Achievement ID
   */
  unlockAchievement(achievementId) {
    const achievement = this.achievements.get(achievementId);
    if (!achievement || achievement.unlocked) {
      return;
    }

    achievement.unlocked = true;
    achievement.progress = achievement.requirement;
    achievement.unlockedAt = new Date().toISOString();

    this.saveProgress();
    this.notifyUnlock(achievement);
    this.notifyListeners('unlock', achievement);
  }

  /**
   * Show unlock notification
   * @param {Object} achievement - Achievement that was unlocked
   */
  notifyUnlock(achievement) {
    if (this.app && this.app.showToast) {
      const rarityEmoji = {
        common: '⚪',
        uncommon: '🟢',
        rare: '🔵',
        epic: '🟣',
        legendary: '🟡'
      };

      this.app.showToast(
        `${rarityEmoji[achievement.rarity] || '🏆'} Achievement Unlocked: ${achievement.name}!`,
        'success',
        5000
      );
    }
  }

  /**
   * Check all achievements against current stats
   * @param {Object} stats - Current user statistics
   */
  checkAchievements(stats) {
    this.getAllAchievements().forEach(achievement => {
      if (!achievement.unlocked && achievement.checkProgress) {
        const progress = achievement.checkProgress(stats);
        this.updateProgress(achievement.id, progress);
      }
    });
  }

  /**
   * Manual achievement tracking methods
   */

  // Voice Recognition
  trackCardRecognition(confidence = 0) {
    this.incrementProgress('first_recognition');
    this.incrementProgress('voice_master');

    if (confidence >= 1.0 || confidence >= 100) {
      this.incrementProgress('perfect_recognition');
    }
  }

  trackPatternTraining() {
    this.incrementProgress('training_dedication');
  }

  // Pack Opening
  trackPackOpening(cards = [], totalValue = 0) {
    this.incrementProgress('first_pack');
    this.incrementProgress('pack_addict');

    // Check for ultra rares
    const ultraRares = cards.filter(card =>
      card.rarity && (card.rarity.includes('Ultra') || card.rarity.includes('Secret'))
    );
    if (ultraRares.length > 0) {
      this.incrementProgress('rare_find', ultraRares.length);
    }

    // Check for high value pack
    if (totalValue >= 100) {
      this.incrementProgress('jackpot');
    }
  }

  // Collection
  trackCollection(stats) {
    if (stats.totalCards) {
      this.updateProgress('collector', stats.totalCards);
    }
    if (stats.completedSets) {
      this.updateProgress('completionist', stats.completedSets);
    }
    if (stats.collectionValue) {
      this.updateProgress('value_hunter', stats.collectionValue);
    }
    if (stats.uniqueSets) {
      this.updateProgress('diverse_collection', stats.uniqueSets);
    }
  }

  // General
  trackPriceCheck() {
    this.incrementProgress('price_pro');
  }

  trackThemeUsage(theme) {
    try {
      const usedThemes = new Set(JSON.parse(localStorage.getItem('voxrip_themes_used') || '[]'));
      usedThemes.add(theme);
      localStorage.setItem('voxrip_themes_used', JSON.stringify([...usedThemes]));

      this.updateProgress('theme_explorer', usedThemes.size);
    } catch (error) {
      console.error('Failed to track theme usage:', error);
    }
  }

  trackDailyUsage() {
    try {
      const today = new Date().toDateString();
      const activeDays = new Set(JSON.parse(localStorage.getItem('voxrip_active_days') || '[]'));

      if (!activeDays.has(today)) {
        activeDays.add(today);
        localStorage.setItem('voxrip_active_days', JSON.stringify([...activeDays]));

        this.updateProgress('early_adopter', activeDays.size);
      }
    } catch (error) {
      console.error('Failed to track daily usage:', error);
    }
  }

  /**
   * Reset all achievements (for testing/debugging)
   */
  resetAchievements() {
    this.achievements.forEach(achievement => {
      achievement.unlocked = false;
      achievement.progress = 0;
      achievement.unlockedAt = null;
    });

    this.saveProgress();
    localStorage.removeItem('voxrip_themes_used');
    localStorage.removeItem('voxrip_active_days');

    this.notifyListeners('reset', null);
  }

  /**
   * Add event listener for achievement events
   * @param {Function} callback - Callback function (event, achievement)
   */
  addEventListener(callback) {
    if (typeof callback === 'function') {
      this.listeners.add(callback);
    }
  }

  /**
   * Remove event listener
   * @param {Function} callback - Callback to remove
   */
  removeEventListener(callback) {
    this.listeners.delete(callback);
  }

  /**
   * Notify all listeners
   * @param {string} event - Event type
   * @param {Object} achievement - Achievement data
   */
  notifyListeners(event, achievement) {
    this.listeners.forEach(callback => {
      try {
        callback(event, achievement);
      } catch (error) {
        console.error('Achievement listener error:', error);
      }
    });
  }

  /**
   * Export achievements to JSON
   * @returns {string} JSON string of all achievements
   */
  exportAchievements() {
    return JSON.stringify(this.getAllAchievements(), null, 2);
  }

  /**
   * Get achievement progress percentage
   * @param {string} achievementId - Achievement ID
   * @returns {number} Progress percentage (0-100)
   */
  getProgressPercentage(achievementId) {
    const achievement = this.achievements.get(achievementId);
    if (!achievement) return 0;

    return Math.min(100, Math.round((achievement.progress / achievement.requirement) * 100));
  }
}

export default AchievementManager;
