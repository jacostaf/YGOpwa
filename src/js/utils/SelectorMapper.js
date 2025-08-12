/**
 * Selector Mapping System for YGOpwa → VoxRip Space UI Migration
 * 
 * This class provides a unified interface for accessing DOM elements during the
 * migration process, allowing seamless switching between legacy YGOpwa selectors
 * and new VoxRip space theme selectors.
 * 
 * Key Features:
 * - Backward compatibility with existing YGOpwa selectors
 * - Feature flag controlled selector switching
 * - Fallback mechanisms for missing elements
 * - Development debugging and validation
 * - Performance optimization through caching
 */

export class SelectorMapper {
  constructor(featureFlags = null) {
    this.featureFlags = featureFlags;
    
    // Cache for resolved selectors to improve performance
    this.selectorCache = new Map();
    
    // Track usage for analytics and debugging
    this.usageStats = new Map();
    
    // Initialize selector mappings
    this.initializeSelectorMappings();
    
    // Set up development debugging if enabled
    if (this.isDevelopmentMode()) {
      this.enableDebugMode();
    }
  }

  /**
   * Initialize all selector mappings between legacy and space themes
   */
  initializeSelectorMappings() {
    // Legacy YGOpwa selectors (current implementation)
    this.legacySelectors = {
      // Header and Navigation
      appHeader: '.app-header',
      headerContent: '.header-content',
      appTitle: '.app-title',
      headerActions: '.header-actions',
      
      // Tab Navigation
      tabNavigation: '.tab-navigation',
      tabButton: '.tab-btn',
      activeTab: '.tab-btn.active',
      tabPanel: '.tab-panel',
      activePanelTab: '.tab-panel.active',
      
      // Main Content Areas
      mainContent: '.main-content',
      panelContent: '.panel-content',
      sectionCard: '.section-card',
      card: '.card',
      
      // Price Checker Form
      priceForm: '#price-checker-panel form',
      cardNumberInput: '#cardNumber',
      raritySelect: '#rarity',
      cardNameInput: '#cardName',
      artVariantCheckbox: '#artVariant',
      conditionSelect: '#condition',
      forceRefreshCheckbox: '#forceRefresh',
      priceCheckButton: '#price-check-btn',
      clearFormButton: '#clear-form-btn',
      priceResults: '#price-results',
      priceResultItem: '.price-result-item',
      
      // Pack Ripper Interface
      packRipperPanel: '#pack-ripper-panel',
      setSearch: '#set-search',
      setSelect: '#set-select',
      setInfo: '.set-info',
      refreshSetsButton: '#refresh-sets-btn',
      loadAllSetsButton: '#load-all-sets-btn',
      
      // Session Management
      sessionStats: '.session-stats',
      sessionCards: '.session-cards-container',
      sessionCard: '.session-card',
      cardQuantityInput: '.card-quantity',
      removeCardButton: '.remove-card-btn',
      clearSessionButton: '#clear-session-btn',
      exportSessionButton: '#export-session-btn',
      importSessionButton: '#import-session-btn',
      
      // Session Statistics (Legacy Theme)
      spaceTotalCards: '#cards-count',
      spaceCurrentSet: '#current-set',
      spaceTcgLowTotal: '#tcg-low-total',
      spaceTcgMarketTotal: '#tcg-market-total',
      spaceSessionStatus: '#session-status',
      
      // Voice Recognition
      voiceControls: '.voice-controls',
      voiceStatus: '.voice-status',
      statusIndicator: '.status-indicator',
      statusText: '.status-text',
      startVoiceButton: '#start-voice-btn',
      stopVoiceButton: '#stop-voice-btn',
      testVoiceButton: '#test-voice-btn',
      voiceHelp: '.voice-help',
      voiceTranscript: '#voice-transcript',
      
      // Training Patterns
      trainingPatterns: '#training-patterns-panel',
      patternSearch: '#pattern-search',
      patternList: '.pattern-list',
      patternItem: '.pattern-item',
      removePatternButton: '.remove-pattern-btn',
      clearPatternsButton: '#clear-patterns-btn',
      
      // UI Elements
      statusBar: '.status-bar',
      statusItem: '.status-item',
      loadingSpinner: '.loading-spinner',
      loadingScreen: '.loading-screen',
      
      // Form Elements
      formGroup: '.form-group',
      formGrid: '.form-grid',
      formActions: '.form-actions',
      btn: '.btn',
      btnPrimary: '.btn-primary',
      btnSecondary: '.btn-secondary',
      btnDanger: '.btn-danger',
      btnVoice: '.btn-voice',
      btnVoiceStop: '.btn-voice-stop',
      
      // Modal and Toast Elements
      modal: '.modal',
      modalOverlay: '.modal-overlay',
      modalContent: '.modal-content',
      modalHeader: '.modal-header',
      modalBody: '.modal-body',
      modalFooter: '.modal-footer',
      toast: '.toast',
      toastContainer: '.toast-container'
    };

    // New VoxRip Space theme selectors
    this.spaceSelectors = {
      // Header and Navigation
      appHeader: '.header',
      headerContent: '.logo',
      appTitle: '.logo-text h1',
      headerActions: '.header-actions', // Will be added in space theme
      
      // Left Navigation Panel
      tabNavigation: '.left-panel',
      tabButton: '.nav-item',
      activeTab: '.nav-item.active',
      tabPanel: '.center-panel',
      activePanelTab: '.center-panel.active',
      
      // Navigation Sub-sections
      navSection: '.nav-section',
      navSubsection: '.nav-subsection',
      navSectionTitle: '.nav-section-title',
      
      // Main Content Areas (Center Panel)
      mainContent: '.center-panel',
      panelContent: '.center-panel',
      sectionCard: '.function-interface',
      card: '.stat-section',
      
      // Workspace Header
      workspaceHeader: '.workspace-header',
      workspaceTitle: '.workspace-title',
      workspaceSubtitle: '.workspace-subtitle',
      
      // Price Checker Form (Space Theme)
      priceForm: '.function-interface .form-grid',
      cardNumberInput: '#card-number-space',
      raritySelect: '#rarity-space',
      cardNameInput: '#card-name-space',
      artVariantCheckbox: '#art-variant-space',
      conditionSelect: '#condition-space',
      forceRefreshCheckbox: '#force-refresh-space',
      priceCheckButton: '#space-check-price-btn',
      clearFormButton: '#space-clear-form-btn',
      priceResults: '.results-area',
      priceResultItem: '.result-item',
      
      // Pack Ripper Interface (Space Theme)
      packRipperPanel: '.function-interface',
      setSearch: '#set-search-space',
      setSelect: '#set-select-space',
      setInfo: '.set-info',
      refreshSetsButton: '#refresh-sets-space-btn',
      loadAllSetsButton: '#load-all-sets-space-btn',
      startSessionButton: '#start-session-space-btn',
      swapSetButton: '#swap-set-space-btn',
      setsCountDisplay: '#sets-count-space',
      totalSetsCountDisplay: '#total-sets-count-space',
      
      // Session Management (Right Panel)
      sessionStats: '.stat-section',
      sessionCards: '.cards-list',
      sessionCard: '.card-item',
      cardQuantityInput: '.card-quantity-space',
      removeCardButton: '.remove-card-space',
      clearSessionButton: '#clear-session-space',
      exportSessionButton: '#export-session-space',
      importSessionButton: '#import-session-space',
      
      // Session Statistics (Space Theme - Right Panel)
      spaceTotalCards: '#space-total-cards',
      spaceCurrentSet: '#space-current-set',
      spaceTcgLowTotal: '#space-tcg-low-total',
      spaceTcgMarketTotal: '#space-tcg-market-total',
      spaceSessionStatus: '#space-session-status',
      
      // Right Panel Elements
      rightPanel: '.right-panel',
      panelTitle: '.panel-title',
      statSection: '.stat-section',
      statItem: '.stat-item',
      statLabel: '.stat-label',
      statValue: '.stat-value',
      cardsList: '.cards-list',
      cardItem: '.card-item',
      
      // Voice Recognition (Left Panel Sub-section)
      voiceControls: '.nav-item[data-vertical-tab="voice-recognition"]',
      voiceStatus: '.voice-status-space',
      statusIndicator: '.status-indicator-space',
      statusText: '.status-text-space',
      startVoiceButton: '#start-voice-space',
      stopVoiceButton: '#stop-voice-space',
      testVoiceButton: '#test-voice-space',
      voiceHelp: '.voice-help-space',
      voiceTranscript: '#voice-transcript-space',
      
      // Training Patterns (Left Panel Sub-section)
      trainingPatterns: '.nav-item[data-vertical-tab="training-patterns"]',
      patternSearch: '#space-patterns-search-input',
      patternList: '#space-patterns-list',
      patternItem: '.pattern-item-space',
      removePatternButton: '.remove-pattern-space',
      clearPatternsButton: '#clear-patterns-space',
      refreshPatternsButton: '#space-refresh-patterns-btn',
      resetAllPatternsButton: '#space-reset-all-patterns-btn',
      patternsCount: '#space-patterns-count',
      patternsSuccessRate: '#space-patterns-success-rate',
      emptyPatterns: '#space-empty-patterns',
      
      // UI Elements (Space Theme)
      statusBar: '.status-bar', // Might be integrated into right panel
      statusItem: '.status-item',
      loadingSpinner: '.loading-spinner', // Same as legacy
      loadingScreen: '.loading-screen', // Same as legacy
      
      // Form Elements (Space Theme)
      formGroup: '.form-group',
      formGrid: '.form-grid',
      formActions: '.form-actions',
      btn: '.btn',
      btnPrimary: '.btn-primary',
      btnSecondary: '.btn-secondary',
      btnDanger: '.btn-danger',
      btnVoice: '.btn-voice',
      btnVoiceStop: '.btn-voice-stop',
      
      // Modal and Toast Elements (Enhanced for Space Theme)
      modal: '.modal',
      modalOverlay: '.modal-overlay',
      modalContent: '.modal-content',
      modalHeader: '.modal-header',
      modalBody: '.modal-body',
      modalFooter: '.modal-footer',
      toast: '.toast',
      toastContainer: '.toast-container',
      
      // Theme-specific Elements
      themeSettings: '.theme-settings-section',
      themeHeader: '.theme-header',
      themeSettingsContent: '.theme-settings-content',
      themePresetButtons: '.theme-preset-buttons',
      themePreset: '.theme-preset',
      colorPickerGroup: '.color-picker-group',
      panelOpacityGroup: '.panel-opacity-group'
    };

    // Fallback selectors for elements that might not exist in either theme
    this.fallbackSelectors = {
      // Generic fallbacks
      container: '.container, .app, body',
      content: '.content, .main-content, .center-panel',
      button: '.btn, button',
      input: '.form-group input, input',
      select: '.form-group select, select',
      
      // Navigation fallbacks
      navigation: '.tab-navigation, .left-panel, nav',
      navigationItem: '.tab-btn, .nav-item, .tab-button',
      
      // Content fallbacks
      panel: '.tab-panel, .center-panel, .panel, .section',
      card: '.card, .section-card, .stat-section, .function-interface'
    };
  }

  /**
   * Get the appropriate selector based on current theme
   * @param {string} key - The selector key
   * @returns {string} The CSS selector to use
   */
  getSelector(key) {
    // Check cache first for performance
    const cacheKey = `${key}_${this.isSpaceThemeActive()}`;
    if (this.selectorCache.has(cacheKey)) {
      this.trackUsage(key, 'cache_hit');
      return this.selectorCache.get(cacheKey);
    }

    let selector;
    
    if (this.isSpaceThemeActive()) {
      selector = this.spaceSelectors[key] || this.legacySelectors[key] || this.fallbackSelectors[key];
      this.trackUsage(key, 'space_theme');
    } else {
      selector = this.legacySelectors[key] || this.fallbackSelectors[key];
      this.trackUsage(key, 'legacy_theme');
    }

    // Cache the result
    if (selector) {
      this.selectorCache.set(cacheKey, selector);
    } else {
      console.warn(`SelectorMapper: No selector found for key "${key}"`);
      this.trackUsage(key, 'not_found');
    }

    return selector;
  }

  /**
   * Get DOM element(s) using the mapped selector
   * @param {string} key - The selector key
   * @param {boolean} multiple - Whether to return multiple elements (default: false)
   * @returns {Element|NodeList|null} The DOM element(s) or null if not found
   */
  getElement(key, multiple = false) {
    const selector = this.getSelector(key);
    if (!selector) {
      return null;
    }

    try {
      if (multiple) {
        const elements = document.querySelectorAll(selector);
        this.trackUsage(key, `found_${elements.length}_elements`);
        return elements;
      } else {
        const element = document.querySelector(selector);
        this.trackUsage(key, element ? 'found_element' : 'element_not_found');
        return element;
      }
    } catch (error) {
      console.error(`SelectorMapper: Error querying selector "${selector}" for key "${key}":`, error);
      this.trackUsage(key, 'query_error');
      return null;
    }
  }

  /**
   * Get multiple DOM elements using the mapped selector
   * @param {string} key - The selector key
   * @returns {NodeList} The DOM elements (may be empty)
   */
  getElements(key) {
    return this.getElement(key, true) || document.querySelectorAll(':not(*)'); // Empty NodeList
  }

  /**
   * Check if an element exists using the mapped selector
   * @param {string} key - The selector key
   * @returns {boolean} True if element exists
   */
  exists(key) {
    return this.getElement(key) !== null;
  }

  /**
   * Wait for an element to appear in the DOM
   * @param {string} key - The selector key
   * @param {number} timeout - Timeout in milliseconds (default: 5000)
   * @returns {Promise<Element>} Promise that resolves with the element
   */
  waitForElement(key, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const selector = this.getSelector(key);
      if (!selector) {
        reject(new Error(`No selector found for key "${key}"`));
        return;
      }

      // Check if element already exists
      const existingElement = document.querySelector(selector);
      if (existingElement) {
        resolve(existingElement);
        return;
      }

      // Set up MutationObserver to wait for element
      const observer = new MutationObserver((mutations) => {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          clearTimeout(timeoutId);
          resolve(element);
        }
      });

      // Start observing
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      // Set up timeout
      const timeoutId = setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element with selector "${selector}" not found within ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * Check if space theme is currently active
   * @returns {boolean} True if space theme is active
   */
  isSpaceThemeActive() {
    if (this.featureFlags && this.featureFlags.isEnabled) {
      return this.featureFlags.isEnabled('USE_SPACE_THEME');
    }
    
    // Fallback checks
    return (
      document.body.classList.contains('space-theme') ||
      localStorage.getItem('ff_space_theme') === 'true' ||
      document.querySelector('.space-theme') !== null
    );
  }

  /**
   * Switch theme and update selector mappings
   * @param {string} theme - 'legacy' or 'space'
   */
  switchTheme(theme) {
    const useSpaceTheme = theme === 'space';
    
    // Update body class
    if (useSpaceTheme) {
      document.body.classList.add('space-theme');
    } else {
      document.body.classList.remove('space-theme');
    }
    
    // Update localStorage
    localStorage.setItem('ff_space_theme', useSpaceTheme.toString());
    
    // Clear selector cache to force re-evaluation
    this.selectorCache.clear();
    
    // Dispatch theme change event
    window.dispatchEvent(new CustomEvent('themeChanged', {
      detail: { 
        theme: theme,
        isSpaceTheme: useSpaceTheme,
        mapper: this
      }
    }));

    this.trackUsage('theme_switch', theme);
  }

  /**
   * Get all available selector keys
   * @returns {Array<string>} Array of selector keys
   */
  getAllKeys() {
    return [...new Set([
      ...Object.keys(this.legacySelectors),
      ...Object.keys(this.spaceSelectors),
      ...Object.keys(this.fallbackSelectors)
    ])];
  }

  /**
   * Validate that all critical selectors exist in current theme
   * @returns {Object} Validation results
   */
  validateSelectors() {
    const criticalSelectors = [
      'appHeader', 'tabNavigation', 'mainContent', 'priceForm',
      'voiceControls', 'sessionStats', 'btnPrimary'
    ];

    const results = {
      valid: true,
      missing: [],
      found: [],
      theme: this.isSpaceThemeActive() ? 'space' : 'legacy'
    };

    criticalSelectors.forEach(key => {
      if (this.exists(key)) {
        results.found.push(key);
      } else {
        results.missing.push(key);
        results.valid = false;
      }
    });

    return results;
  }

  /**
   * Track selector usage for analytics and debugging
   * @param {string} key - The selector key
   * @param {string} action - The action performed
   */
  trackUsage(key, action) {
    if (!this.usageStats.has(key)) {
      this.usageStats.set(key, {});
    }
    
    const keyStats = this.usageStats.get(key);
    keyStats[action] = (keyStats[action] || 0) + 1;
    keyStats.lastUsed = Date.now();
  }

  /**
   * Get usage statistics for debugging
   * @returns {Object} Usage statistics
   */
  getUsageStats() {
    const stats = {};
    this.usageStats.forEach((value, key) => {
      stats[key] = { ...value };
    });
    return stats;
  }

  /**
   * Check if running in development mode
   * @returns {boolean} True if in development mode
   */
  isDevelopmentMode() {
    return (
      document.body.classList.contains('development') ||
      localStorage.getItem('dev_mode') === 'true' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    );
  }

  /**
   * Enable debug mode for development
   */
  enableDebugMode() {
    // Add debug class to body
    document.body.classList.add('development');
    
    // Create debug indicator
    if (!document.querySelector('.theme-debug-indicator')) {
      const indicator = document.createElement('div');
      indicator.className = 'theme-debug-indicator';
      document.body.appendChild(indicator);
    }
    
    // Log selector mapping information
    console.log('SelectorMapper Debug Mode Enabled');
    console.log('Available selector keys:', this.getAllKeys());
    console.log('Current theme:', this.isSpaceThemeActive() ? 'Space' : 'Legacy');
    
    // Set up console debugging commands
    window.selectorMapper = this;
    window.validateSelectors = () => this.validateSelectors();
    window.switchToSpaceTheme = () => this.switchTheme('space');
    window.switchToLegacyTheme = () => this.switchTheme('legacy');
  }

  /**
   * Clean up resources and event listeners
   */
  destroy() {
    this.selectorCache.clear();
    this.usageStats.clear();
    
    // Remove global debug references
    if (window.selectorMapper === this) {
      delete window.selectorMapper;
      delete window.validateSelectors;
      delete window.switchToSpaceTheme;
      delete window.switchToLegacyTheme;
    }
  }
}