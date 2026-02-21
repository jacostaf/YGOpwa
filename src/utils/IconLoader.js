/**
 * IconLoader.js
 *
 * Lucide Icons Integration for Vanilla JavaScript
 * Provides helper functions to load and create Lucide icons
 *
 * Usage:
 * 1. Include Lucide CDN in index.html:
 *    <script src="https://unpkg.com/lucide@latest"></script>
 *
 * 2. Use IconLoader to create icons:
 *    import IconLoader from './utils/IconLoader.js';
 *    const icon = IconLoader.createIcon('home', { size: 24, color: '#fff' });
 *    element.appendChild(icon);
 */

let _pending = null;
export function refreshIcons() {
  if (!_pending) {
    _pending = requestAnimationFrame(() => {
      if (typeof lucide !== 'undefined') lucide.createIcons();
      _pending = null;
    });
  }
}

export default class IconLoader {
  /**
   * Check if Lucide library is loaded
   * @returns {boolean}
   */
  static isLoaded() {
    return typeof window.lucide !== 'undefined';
  }

  /**
   * Create a Lucide icon element
   * @param {string} iconName - Name of the icon (e.g., 'home', 'settings', 'user')
   * @param {Object} options - Icon options
   * @param {number} options.size - Icon size in pixels (default: 24)
   * @param {string} options.color - Icon color (default: 'currentColor')
   * @param {number} options.strokeWidth - Stroke width (default: 2)
   * @param {string} options.class - Additional CSS classes
   * @returns {HTMLElement} Icon element
   */
  static createIcon(iconName, options = {}) {
    if (!this.isLoaded()) {
      console.error('Lucide library not loaded. Include CDN in index.html');
      return this.createFallbackIcon(iconName);
    }

    const {
      size = 24,
      color = 'currentColor',
      strokeWidth = 2,
      class: className = ''
    } = options;

    // Create icon element using data-lucide attribute
    const iconElement = document.createElement('i');
    iconElement.setAttribute('data-lucide', iconName);

    // Add styles
    if (size) iconElement.style.width = `${size}px`;
    if (size) iconElement.style.height = `${size}px`;
    if (color) iconElement.style.color = color;
    if (strokeWidth) iconElement.setAttribute('stroke-width', strokeWidth);
    if (className) iconElement.className = className;

    // Initialize the icon
    if (window.lucide && window.lucide.createIcons) {
      // Create icons for this specific element
      window.lucide.createIcons({ icons: { [iconName]: window.lucide[iconName] } });

      // Process this specific element
      setTimeout(() => {
        window.lucide.createIcons();
      }, 0);
    }

    return iconElement;
  }

  /**
   * Create multiple icons at once
   * @param {Object} config - Icon configuration object
   * @returns {Object} Object with icon elements keyed by name
   *
   * Example:
   * const icons = IconLoader.createIcons({
   *   home: { size: 24 },
   *   settings: { size: 20, color: '#888' }
   * });
   */
  static createIcons(config) {
    const icons = {};

    for (const [name, options] of Object.entries(config)) {
      icons[name] = this.createIcon(name, options);
    }

    return icons;
  }

  /**
   * Initialize all icons on the page (debounced via rAF).
   * Call this after dynamically adding icon elements.
   */
  static refreshIcons() {
    refreshIcons();
  }

  /**
   * Create a fallback icon when Lucide is not loaded
   * @param {string} iconName
   * @returns {HTMLElement}
   */
  static createFallbackIcon(iconName) {
    const span = document.createElement('span');
    span.textContent = '◻️'; // Generic fallback
    span.setAttribute('data-icon-fallback', iconName);
    span.style.display = 'inline-block';
    return span;
  }

  /**
   * Get list of commonly used icons in VoxRip
   * @returns {Array<string>}
   */
  static getCommonIcons() {
    return [
      'home',           // Dashboard
      'mic',            // Voice Recognition
      'dollar-sign',    // Price Checker
      'package',        // Pack Opening
      'folder',         // Collection
      'headphones',     // Voice Training
      'trophy',         // Achievements
      'settings',       // Settings
      'palette',        // Theme Settings
      'bar-chart',      // Stats
      'activity',       // Activity
      'credit-card',    // Cards
      'search',         // Search
      'x',              // Close
      'menu',           // Menu (mobile)
      'chevron-right',  // Navigation
      'chevron-left',   // Navigation
      'check',          // Success
      'alert-circle',   // Warning
      'info'            // Info
    ];
  }

  /**
   * Preload common icons (optional optimization)
   */
  static preloadCommonIcons() {
    if (!this.isLoaded()) {
      console.warn('Cannot preload icons: Lucide not loaded');
      return;
    }

    // Icons are already available via CDN, no preloading needed
    console.log('✓ Lucide icons ready');
  }
}
