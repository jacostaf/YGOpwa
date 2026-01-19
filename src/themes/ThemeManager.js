/**
 * ThemeManager - Manages theme switching and persistence
 *
 * Features:
 * - Apply themes by updating CSS custom properties
 * - Persist theme selection to localStorage
 * - Event system for theme change notifications
 * - Automatic theme restoration on page load
 */

import { THEMES, DEFAULT_THEME, getTheme, themeExists } from './theme-config.js';

const STORAGE_KEY = 'voxrip-theme';

export class ThemeManager {
  constructor() {
    this.currentTheme = DEFAULT_THEME;
    this.listeners = new Set(); // Changed from array to Set for O(1) operations
    this.initialized = false;
  }

  /**
   * Initialize the theme manager
   * Restores saved theme or applies default
   */
  initialize() {
    if (this.initialized) {
      console.warn('ThemeManager already initialized');
      return;
    }

    // Try to restore saved theme
    const savedTheme = this.getSavedTheme();

    if (savedTheme && themeExists(savedTheme)) {
      this.applyTheme(savedTheme, false); // Don't save again
    } else {
      this.applyTheme(DEFAULT_THEME, true); // Save default
    }

    this.initialized = true;
    console.log(`ThemeManager initialized with theme: ${this.currentTheme}`);
  }

  /**
   * Apply a theme by name
   * @param {string} themeName - Name of the theme to apply
   * @param {boolean} persist - Whether to save to localStorage (default: true)
   * @returns {boolean} Success status
   */
  applyTheme(themeName, persist = true) {
    // Validate theme exists
    if (!themeExists(themeName)) {
      console.error(`Theme "${themeName}" does not exist`);
      return false;
    }

    const theme = getTheme(themeName);
    const root = document.documentElement;

    // Apply all CSS custom properties
    Object.entries(theme.colors).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });

    // Update current theme
    const previousTheme = this.currentTheme;
    this.currentTheme = themeName;

    // Update body data attribute for CSS targeting
    document.body.setAttribute('data-theme', themeName);

    // Persist to localStorage if requested
    if (persist) {
      this.saveTheme(themeName);
    }

    // Notify listeners
    this.notifyListeners(themeName, previousTheme);

    console.log(`Applied theme: ${themeName}`);
    return true;
  }

  /**
   * Get the currently active theme name
   * @returns {string} Current theme name
   */
  getCurrentTheme() {
    return this.currentTheme;
  }

  /**
   * Get the currently active theme configuration
   * @returns {object} Current theme object
   */
  getCurrentThemeConfig() {
    return getTheme(this.currentTheme);
  }

  /**
   * Get all available themes
   * @returns {object} All theme configurations
   */
  getAllThemes() {
    return THEMES;
  }

  /**
   * Get all theme names
   * @returns {string[]} Array of theme names
   */
  getThemeNames() {
    return Object.keys(THEMES);
  }

  /**
   * Switch to the next theme in the list (for cycling)
   * @returns {string} New theme name
   */
  nextTheme() {
    const themes = this.getThemeNames();
    const currentIndex = themes.indexOf(this.currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    const nextTheme = themes[nextIndex];

    this.applyTheme(nextTheme);
    return nextTheme;
  }

  /**
   * Switch to the previous theme in the list (for cycling)
   * @returns {string} New theme name
   */
  previousTheme() {
    const themes = this.getThemeNames();
    const currentIndex = themes.indexOf(this.currentTheme);
    const previousIndex = (currentIndex - 1 + themes.length) % themes.length;
    const previousTheme = themes[previousIndex];

    this.applyTheme(previousTheme);
    return previousTheme;
  }

  /**
   * Save theme to localStorage
   * @param {string} themeName - Theme name to save
   * @private
   */
  saveTheme(themeName) {
    try {
      localStorage.setItem(STORAGE_KEY, themeName);
    } catch (error) {
      console.error('Failed to save theme to localStorage:', error);
    }
  }

  /**
   * Get saved theme from localStorage
   * @returns {string|null} Saved theme name or null
   * @private
   */
  getSavedTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to read theme from localStorage:', error);
      return null;
    }
  }

  /**
   * Clear saved theme from localStorage
   */
  clearSavedTheme() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('Saved theme cleared');
    } catch (error) {
      console.error('Failed to clear saved theme:', error);
    }
  }

  /**
   * Reset to default theme
   * @returns {boolean} Success status
   */
  resetToDefault() {
    return this.applyTheme(DEFAULT_THEME);
  }

  /**
   * Add a listener for theme changes
   * @param {function} callback - Callback function(newTheme, oldTheme)
   * @returns {function} Unsubscribe function - call this to remove the listener
   */
  addListener(callback) {
    if (typeof callback === 'function') {
      this.listeners.add(callback);
      // Return unsubscribe function for easy cleanup
      return () => this.removeListener(callback);
    }
    return () => {}; // No-op if callback wasn't valid
  }

  /**
   * Alias for addListener - matches DOM API naming convention
   * @param {function} callback - Callback function(newTheme, oldTheme)
   * @returns {function} Unsubscribe function
   */
  addEventListener(callback) {
    return this.addListener(callback);
  }

  /**
   * Remove a listener
   * @param {function} callback - Callback function to remove
   * @returns {boolean} Whether the listener was found and removed
   */
  removeListener(callback) {
    return this.listeners.delete(callback);
  }

  /**
   * Alias for removeListener - matches DOM API naming convention
   * @param {function} callback - Callback function to remove
   * @returns {boolean} Whether removed
   */
  removeEventListener(callback) {
    return this.removeListener(callback);
  }

  /**
   * Remove all listeners - useful for cleanup
   */
  removeAllListeners() {
    this.listeners.clear();
  }

  /**
   * Notify all listeners of theme change
   * @param {string} newTheme - New theme name
   * @param {string} oldTheme - Previous theme name
   * @private
   */
  notifyListeners(newTheme, oldTheme) {
    // Iterate over a copy to allow listeners to remove themselves safely
    for (const callback of [...this.listeners]) {
      try {
        callback(newTheme, oldTheme);
      } catch (error) {
        console.error('Error in theme change listener:', error);
      }
    }
  }

  /**
   * Get a CSS custom property value for the current theme
   * @param {string} propertyName - CSS custom property name (with or without --)
   * @returns {string} Property value
   */
  getThemeProperty(propertyName) {
    const prop = propertyName.startsWith('--') ? propertyName : `--${propertyName}`;
    return getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
  }

  /**
   * Check if dark mode is active
   * Considers 'light' as the only non-dark theme
   * @returns {boolean} True if current theme is dark
   */
  isDarkMode() {
    return this.currentTheme !== 'light';
  }

  /**
   * Export current theme settings
   * @returns {object} Theme export data
   */
  exportSettings() {
    return {
      currentTheme: this.currentTheme,
      availableThemes: this.getThemeNames(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Import theme settings
   * @param {object} settings - Settings object with currentTheme property
   * @returns {boolean} Success status
   */
  importSettings(settings) {
    if (!settings || !settings.currentTheme) {
      console.error('Invalid settings object');
      return false;
    }

    return this.applyTheme(settings.currentTheme);
  }
}

// Create and export singleton instance
export const themeManager = new ThemeManager();

// Auto-initialize on module load (optional - can be called manually instead)
// themeManager.initialize();

export default themeManager;
