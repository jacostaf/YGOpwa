/**
 * Feature Flag System for YGOpwa → VoxRip Space UI Migration
 * 
 * This class manages feature flags for the gradual rollout of the space theme
 * and other new features during the migration process.
 * 
 * Key Features:
 * - Granular control over individual features
 * - Persistent storage of flag states
 * - A/B testing support with user cohorts
 * - Performance monitoring and rollback capabilities
 * - Development override support
 * - Analytics integration for flag usage tracking
 */

export class FeatureFlags {
  constructor(options = {}) {
    this.options = {
      storageKey: 'voxrip_feature_flags',
      analyticsEnabled: true,
      developmentOverrides: true,
      ...options
    };

    // Initialize flag definitions
    this.initializeFlagDefinitions();
    
    // Load persisted flag states
    this.loadPersistedFlags();
    
    // Initialize user cohort assignment
    this.initializeUserCohort();
    
    // Set up analytics tracking
    if (this.options.analyticsEnabled) {
      this.initializeAnalytics();
    }

    // Set up development overrides
    if (this.options.developmentOverrides && this.isDevelopmentMode()) {
      this.setupDevelopmentOverrides();
    }

    // Log initialization in development mode
    if (this.isDevelopmentMode()) {
      console.log('FeatureFlags initialized:', {
        flags: this.flags,
        cohort: this.userCohort,
        overrides: this.overrides
      });
    }
  }

  /**
   * Initialize all feature flag definitions with their default states,
   * rollout percentages, and metadata
   */
  initializeFlagDefinitions() {
    this.flagDefinitions = {
      // === Core Space Theme Features ===
      USE_SPACE_THEME: {
        name: 'Space Theme',
        description: 'Enable the VoxRip space-themed UI',
        defaultValue: true,
        rolloutPercentage: 100, // Full rollout - space theme is now default
        dependencies: [],
        rolloutSchedule: {
          week1: 10,  // 10% of users
          week2: 25,  // 25% of users
          week3: 50,  // 50% of users
          week4: 75,  // 75% of users
          week5: 100  // 100% of users (full rollout)
        },
        criticalFlag: true,
        rollbackThreshold: 0.05 // 5% error rate triggers rollback
      },

      ENABLE_ANIMATIONS: {
        name: 'Space Animations',
        description: 'Enable space theme animations and effects',
        defaultValue: false,
        rolloutPercentage: 0,
        dependencies: ['USE_SPACE_THEME'],
        rolloutSchedule: {
          week2: 25,  // Start after space theme is stable
          week3: 50,
          week4: 75,
          week5: 100
        },
        criticalFlag: false,
        rollbackThreshold: 0.03 // 3% performance impact triggers rollback
      },

      NEW_NAVIGATION: {
        name: 'Space Navigation',
        description: 'Enable new left-panel navigation system',
        defaultValue: false,
        rolloutPercentage: 0,
        dependencies: ['USE_SPACE_THEME'],
        rolloutSchedule: {
          week1: 10,
          week2: 25,
          week3: 50,
          week4: 75,
          week5: 100
        },
        criticalFlag: true,
        rollbackThreshold: 0.07 // 7% navigation errors trigger rollback
      },

      THEME_CUSTOMIZATION: {
        name: 'Theme Customization',
        description: 'Enable theme color customization features',
        defaultValue: false,
        rolloutPercentage: 0,
        dependencies: ['USE_SPACE_THEME', 'NEW_NAVIGATION'],
        rolloutSchedule: {
          week3: 25,  // After core features are stable
          week4: 50,
          week5: 100
        },
        criticalFlag: false,
        rollbackThreshold: 0.02
      },

      // === Performance and Monitoring Features ===
      PERFORMANCE_MONITORING: {
        name: 'Performance Monitoring',
        description: 'Enable enhanced performance monitoring for space theme',
        defaultValue: false,
        rolloutPercentage: 100, // Always enabled for monitoring
        dependencies: [],
        criticalFlag: false
      },

      GRADUAL_ROLLOUT: {
        name: 'Gradual Rollout',
        description: 'Enable gradual rollout system for space theme features',
        defaultValue: true,
        rolloutPercentage: 100,
        dependencies: [],
        criticalFlag: false
      },

      // === Testing and Development Features ===
      ENHANCED_DEBUGGING: {
        name: 'Enhanced Debugging',
        description: 'Enable enhanced debugging tools and console logging',
        defaultValue: false,
        rolloutPercentage: 0,
        dependencies: [],
        developmentOnly: true
      },

      SELECTOR_VALIDATION: {
        name: 'Selector Validation',
        description: 'Enable DOM selector validation and warnings',
        defaultValue: false,
        rolloutPercentage: 0,
        dependencies: [],
        developmentOnly: true
      },

      MIGRATION_ANALYTICS: {
        name: 'Migration Analytics',
        description: 'Enable detailed analytics for migration process',
        defaultValue: false,
        rolloutPercentage: 25, // Sample of users for analytics
        dependencies: [],
        criticalFlag: false
      },

      // === Experimental Features ===
      VOICE_ENHANCEMENTS: {
        name: 'Voice Recognition Enhancements',
        description: 'Experimental improvements to voice recognition',
        defaultValue: false,
        rolloutPercentage: 0,
        dependencies: [],
        experimental: true
      },

      ADVANCED_CACHING: {
        name: 'Advanced Caching',
        description: 'Enhanced caching strategies for better performance',
        defaultValue: false,
        rolloutPercentage: 0,
        dependencies: [],
        experimental: true
      }
    };

    // Initialize flag states
    this.flags = {};
    this.overrides = {};
    this.analytics = {
      flagUsage: {},
      performanceMetrics: {},
      errorRates: {}
    };
  }

  /**
   * Load persisted flag states from localStorage
   */
  loadPersistedFlags() {
    try {
      const stored = localStorage.getItem(this.options.storageKey);
      const persistedData = stored ? JSON.parse(stored) : {};
      
      // Load flag overrides (user preferences)
      this.overrides = persistedData.overrides || {};
      
      // Load analytics data
      if (persistedData.analytics) {
        this.analytics = { ...this.analytics, ...persistedData.analytics };
      }

      // Initialize flag states based on definitions and overrides
      Object.keys(this.flagDefinitions).forEach(flagKey => {
        this.flags[flagKey] = this.calculateFlagValue(flagKey);
      });

    } catch (error) {
      console.warn('FeatureFlags: Error loading persisted flags:', error);
      // Initialize with defaults if loading fails
      Object.keys(this.flagDefinitions).forEach(flagKey => {
        this.flags[flagKey] = this.flagDefinitions[flagKey].defaultValue;
      });
    }
  }

  /**
   * Save current flag states and analytics to localStorage
   */
  persistFlags() {
    try {
      const dataToStore = {
        overrides: this.overrides,
        analytics: this.analytics,
        lastUpdated: Date.now(),
        version: '1.0'
      };
      
      localStorage.setItem(this.options.storageKey, JSON.stringify(dataToStore));
    } catch (error) {
      console.warn('FeatureFlags: Error persisting flags:', error);
    }
  }

  /**
   * Initialize user cohort assignment for A/B testing
   */
  initializeUserCohort() {
    // Get or create persistent user ID
    let userId = localStorage.getItem('voxrip_user_id');
    if (!userId) {
      userId = this.generateUserId();
      localStorage.setItem('voxrip_user_id', userId);
    }

    // Calculate user cohort based on hash of user ID
    const userHash = this.hashString(userId);
    this.userCohort = {
      id: userId,
      hash: userHash,
      percentile: userHash % 100,
      group: this.assignCohortGroup(userHash % 100)
    };
  }

  /**
   * Calculate the actual value for a feature flag
   * @param {string} flagKey - The flag key
   * @returns {boolean} The calculated flag value
   */
  calculateFlagValue(flagKey) {
    const definition = this.flagDefinitions[flagKey];
    if (!definition) {
      console.warn(`FeatureFlags: Unknown flag "${flagKey}"`);
      return false;
    }

    // Check for explicit override first
    if (this.overrides.hasOwnProperty(flagKey)) {
      this.trackFlagUsage(flagKey, 'override');
      return this.overrides[flagKey];
    }

    // Check development-only flags
    if (definition.developmentOnly && !this.isDevelopmentMode()) {
      return false;
    }

    // Check dependencies
    if (definition.dependencies && definition.dependencies.length > 0) {
      const dependenciesMet = definition.dependencies.every(dep => this.isEnabled(dep));
      if (!dependenciesMet) {
        this.trackFlagUsage(flagKey, 'dependencies_not_met');
        return false;
      }
    }

    // Check rollout percentage
    const rolloutPercentage = this.getCurrentRolloutPercentage(flagKey);
    const userPercentile = this.userCohort.percentile;
    
    const enabled = userPercentile < rolloutPercentage;
    this.trackFlagUsage(flagKey, enabled ? 'rollout_enabled' : 'rollout_disabled');
    
    return enabled;
  }

  /**
   * Get current rollout percentage for a flag based on schedule
   * @param {string} flagKey - The flag key
   * @returns {number} Current rollout percentage
   */
  getCurrentRolloutPercentage(flagKey) {
    const definition = this.flagDefinitions[flagKey];
    
    // Check if gradual rollout is disabled
    if (!this.isEnabled('GRADUAL_ROLLOUT')) {
      return definition.rolloutPercentage;
    }

    // Check for scheduled rollout
    if (definition.rolloutSchedule) {
      const deploymentWeek = this.getDeploymentWeek();
      const weekKey = `week${deploymentWeek}`;
      
      if (definition.rolloutSchedule[weekKey] !== undefined) {
        return definition.rolloutSchedule[weekKey];
      }
    }

    return definition.rolloutPercentage;
  }

  /**
   * Check if a feature flag is enabled
   * @param {string} flagKey - The flag key
   * @returns {boolean} True if flag is enabled
   */
  isEnabled(flagKey) {
    // Return cached value if available
    if (this.flags.hasOwnProperty(flagKey)) {
      this.trackFlagUsage(flagKey, 'checked');
      return this.flags[flagKey];
    }

    // Calculate and cache value
    const value = this.calculateFlagValue(flagKey);
    this.flags[flagKey] = value;
    
    return value;
  }

  /**
   * Explicitly enable or disable a feature flag
   * @param {string} flagKey - The flag key
   * @param {boolean} enabled - Whether to enable the flag
   * @param {boolean} persist - Whether to persist the override (default: true)
   */
  setFlag(flagKey, enabled, persist = true) {
    this.overrides[flagKey] = enabled;
    this.flags[flagKey] = enabled;

    if (persist) {
      this.persistFlags();
    }

    this.trackFlagUsage(flagKey, 'manually_set');
    
    // Dispatch flag change event
    window.dispatchEvent(new CustomEvent('featureFlagChanged', {
      detail: {
        flagKey,
        enabled,
        source: 'manual'
      }
    }));

    // Log in development mode
    if (this.isDevelopmentMode()) {
      console.log(`FeatureFlag "${flagKey}" ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Toggle a feature flag
   * @param {string} flagKey - The flag key
   * @returns {boolean} New flag value
   */
  toggle(flagKey) {
    const newValue = !this.isEnabled(flagKey);
    this.setFlag(flagKey, newValue);
    return newValue;
  }

  /**
   * Remove an override for a feature flag
   * @param {string} flagKey - The flag key
   */
  removeOverride(flagKey) {
    delete this.overrides[flagKey];
    this.flags[flagKey] = this.calculateFlagValue(flagKey);
    this.persistFlags();
    
    this.trackFlagUsage(flagKey, 'override_removed');
  }

  /**
   * Get all enabled flags
   * @returns {Array<string>} Array of enabled flag keys
   */
  getEnabledFlags() {
    return Object.keys(this.flagDefinitions).filter(key => this.isEnabled(key));
  }

  /**
   * Get all flag states and metadata
   * @returns {Object} Complete flag information
   */
  getAllFlags() {
    const result = {};
    
    Object.keys(this.flagDefinitions).forEach(key => {
      const definition = this.flagDefinitions[key];
      result[key] = {
        enabled: this.isEnabled(key),
        definition: { ...definition },
        override: this.overrides.hasOwnProperty(key) ? this.overrides[key] : null,
        rolloutPercentage: this.getCurrentRolloutPercentage(key),
        userInRollout: this.userCohort.percentile < this.getCurrentRolloutPercentage(key)
      };
    });

    return result;
  }

  /**
   * Initialize analytics tracking
   */
  initializeAnalytics() {
    // Track page load with enabled flags
    this.trackEvent('feature_flags_loaded', {
      enabledFlags: this.getEnabledFlags(),
      userCohort: this.userCohort.group,
      timestamp: Date.now()
    });

    // Set up periodic analytics reporting
    setInterval(() => {
      this.reportAnalytics();
    }, 60000); // Report every minute
  }

  /**
   * Track feature flag usage
   * @param {string} flagKey - The flag key
   * @param {string} action - The action performed
   */
  trackFlagUsage(flagKey, action) {
    if (!this.analytics.flagUsage[flagKey]) {
      this.analytics.flagUsage[flagKey] = {};
    }
    
    this.analytics.flagUsage[flagKey][action] = (this.analytics.flagUsage[flagKey][action] || 0) + 1;
    this.analytics.flagUsage[flagKey].lastUsed = Date.now();
  }

  /**
   * Track custom analytics events
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  trackEvent(event, data = {}) {
    if (!this.options.analyticsEnabled) return;

    const eventData = {
      event,
      timestamp: Date.now(),
      userCohort: this.userCohort.group,
      enabledFlags: this.getEnabledFlags(),
      ...data
    };

    // In development, log to console
    if (this.isDevelopmentMode()) {
      console.log('FeatureFlags Analytics:', eventData);
    }

    // Store for batch reporting
    if (!this.analytics.events) {
      this.analytics.events = [];
    }
    this.analytics.events.push(eventData);

    // Keep only last 100 events to prevent memory issues
    if (this.analytics.events.length > 100) {
      this.analytics.events = this.analytics.events.slice(-100);
    }
  }

  /**
   * Report analytics data (would integrate with actual analytics service)
   */
  reportAnalytics() {
    if (!this.options.analyticsEnabled || !this.analytics.events || this.analytics.events.length === 0) {
      return;
    }

    // In a real implementation, this would send to analytics service
    if (this.isDevelopmentMode()) {
      console.log('FeatureFlags: Reporting analytics:', {
        eventCount: this.analytics.events.length,
        flagUsage: this.analytics.flagUsage,
        performanceMetrics: this.analytics.performanceMetrics
      });
    }

    // Clear events after reporting
    this.analytics.events = [];
  }

  /**
   * Set up development mode overrides and debugging
   */
  setupDevelopmentOverrides() {
    // Add development class to body
    document.body.classList.add('development');

    // Make feature flags available in console
    window.featureFlags = this;
    
    // Add helper functions to window
    window.enableFlag = (flag) => this.setFlag(flag, true);
    window.disableFlag = (flag) => this.setFlag(flag, false);
    window.toggleFlag = (flag) => this.toggle(flag);
    window.listFlags = () => {
      console.table(this.getAllFlags());
      return this.getAllFlags();
    };
    window.resetFlags = () => {
      this.overrides = {};
      Object.keys(this.flagDefinitions).forEach(key => {
        this.flags[key] = this.calculateFlagValue(key);
      });
      this.persistFlags();
      console.log('All flag overrides reset');
    };

    // Log available commands
    console.log('FeatureFlags Development Mode:');
    console.log('Available commands:');
    console.log('  enableFlag(flagName) - Enable a flag');
    console.log('  disableFlag(flagName) - Disable a flag');
    console.log('  toggleFlag(flagName) - Toggle a flag');
    console.log('  listFlags() - List all flags and their states');
    console.log('  resetFlags() - Reset all flag overrides');
    console.log('Available flags:', Object.keys(this.flagDefinitions));
  }

  /**
   * Generate a unique user ID for cohort assignment
   * @returns {string} Unique user ID
   */
  generateUserId() {
    return 'user_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  /**
   * Hash a string to a number for consistent cohort assignment
   * @param {string} str - String to hash
   * @returns {number} Hash value
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Assign cohort group based on percentile
   * @param {number} percentile - User percentile (0-99)
   * @returns {string} Cohort group name
   */
  assignCohortGroup(percentile) {
    if (percentile < 10) return 'early_adopters';
    if (percentile < 25) return 'beta_users';
    if (percentile < 75) return 'general_users';
    return 'conservative_users';
  }

  /**
   * Get deployment week for rollout schedule
   * @returns {number} Week number since deployment
   */
  getDeploymentWeek() {
    // This would be configured based on actual deployment date
    const deploymentDate = new Date('2024-08-07'); // Migration start date
    const now = new Date();
    const weeksSinceDeployment = Math.floor((now - deploymentDate) / (7 * 24 * 60 * 60 * 1000));
    return Math.max(1, weeksSinceDeployment + 1);
  }

  /**
   * Check if running in development mode
   * @returns {boolean} True if in development mode
   */
  isDevelopmentMode() {
    return (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.includes('dev') ||
      localStorage.getItem('dev_mode') === 'true'
    );
  }

  /**
   * Clean up resources and event listeners
   */
  destroy() {
    // Clear intervals
    if (this.analyticsInterval) {
      clearInterval(this.analyticsInterval);
    }

    // Remove global references
    if (window.featureFlags === this) {
      delete window.featureFlags;
      delete window.enableFlag;
      delete window.disableFlag;
      delete window.toggleFlag;
      delete window.listFlags;
      delete window.resetFlags;
    }

    // Final analytics report
    this.reportAnalytics();
  }
}