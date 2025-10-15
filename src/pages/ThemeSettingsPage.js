/**
 * ThemeSettingsPage.js - Theme Selection Interface
 *
 * Complete implementation for Phase 11: Theme Settings Page
 * Provides a visual theme selector with preview cards for all 7 available themes.
 *
 * Features:
 * - Display all 7 themes as preview cards
 * - Show active theme indicator
 * - One-click theme switching
 * - Color preview for each theme
 * - Theme description
 * - Glassmorphism styling
 * - Instant theme application
 */

import themeManager from '../themes/ThemeManager.js';

export default class ThemeSettingsPage {
  constructor(router) {
    this.router = router;
    this.container = null;
    this.app = null;
    this.currentTheme = 'dark';

    // Bound handlers
    this.boundHandlers = {
      handleThemeClick: this.handleThemeClick.bind(this)
    };
  }

  /**
   * Render the page
   */
  render() {
    // Get all themes
    const allThemes = themeManager.getAllThemes();
    this.currentTheme = themeManager.getCurrentTheme();

    return `
      <div class="page-content theme-settings-page">
        <!-- Page Intro -->
        <div class="theme-intro">
          <p class="intro-subtitle">Choose your preferred color theme for the VoxRip interface</p>
        </div>

        <!-- Theme Grid -->
        <div class="theme-grid">
          ${this.renderThemeCards(allThemes)}
        </div>

        <!-- Theme Info -->
        <div class="theme-info-card glass-card">
          <div class="info-icon">
            <i data-lucide="info"></i>
          </div>
          <div class="info-content">
            <h3>About Themes</h3>
            <ul>
              <li><strong>7 Themes Available:</strong> Choose from Dark, Light, Blue, Violet, Emerald, Rose, and Amber</li>
              <li><strong>Instant Preview:</strong> Click any theme card to apply it immediately</li>
              <li><strong>Persistent:</strong> Your theme preference is saved automatically</li>
              <li><strong>Glassmorphism:</strong> All themes feature modern glassmorphism effects</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render theme cards
   */
  renderThemeCards(themes) {
    const themeOrder = ['dark', 'light', 'blue', 'violet', 'emerald', 'rose', 'amber'];

    return themeOrder.map(themeName => {
      const theme = themes[themeName];
      if (!theme) return '';

      const isActive = this.currentTheme === themeName;
      const activeClass = isActive ? 'active' : '';

      // Get theme accent color
      const accentColor = this.getThemeAccentColor(theme);
      const bgColor = this.getThemeBgColor(theme);
      const textColor = this.getThemeTextColor(theme);

      return `
        <div class="theme-card glass-card ${activeClass}" data-theme="${themeName}">
          <!-- Active Indicator -->
          ${isActive ? `
            <div class="theme-active-badge">
              <i data-lucide="check-circle"></i>
              <span>Active</span>
            </div>
          ` : ''}

          <!-- Theme Preview -->
          <div class="theme-preview" style="background: ${bgColor};">
            <div class="preview-accent" style="background: ${accentColor};"></div>
            <div class="preview-text" style="color: ${textColor};">Aa</div>
          </div>

          <!-- Theme Info -->
          <div class="theme-info">
            <h3 class="theme-name">${this.escapeHtml(theme.displayName)}</h3>
            <p class="theme-description">${this.getThemeDescription(themeName)}</p>

            <!-- Color Swatches -->
            <div class="theme-colors">
              <div class="color-swatch" style="background: ${bgColor};" title="Background"></div>
              <div class="color-swatch" style="background: ${accentColor};" title="Accent"></div>
              <div class="color-swatch" style="background: ${textColor};" title="Text"></div>
            </div>
          </div>

          <!-- Apply Button -->
          <button class="btn-apply-theme" data-theme="${themeName}" ${isActive ? 'disabled' : ''}>
            <i data-lucide="${isActive ? 'check' : 'palette'}"></i>
            ${isActive ? 'Active Theme' : 'Apply Theme'}
          </button>
        </div>
      `;
    }).join('');
  }

  /**
   * Get theme description
   */
  getThemeDescription(themeName) {
    const descriptions = {
      dark: 'Classic dark theme with neutral tones for low-light environments',
      light: 'Clean light theme with high contrast for bright environments',
      blue: 'Professional blue theme with cool, calming tones',
      violet: 'Creative violet theme with rich, vibrant purple hues',
      emerald: 'Refreshing emerald theme with natural green colors',
      rose: 'Elegant rose theme with warm, passionate pink accents',
      amber: 'Warm amber theme with golden, energetic tones'
    };

    return descriptions[themeName] || 'Custom theme';
  }

  /**
   * Get theme accent color
   */
  getThemeAccentColor(theme) {
    return theme.colors['--accent-primary'] || '#737373';
  }

  /**
   * Get theme background color
   */
  getThemeBgColor(theme) {
    return theme.colors['--bg-primary'] || '#0a0a0a';
  }

  /**
   * Get theme text color
   */
  getThemeTextColor(theme) {
    return theme.colors['--text-primary'] || '#ffffff';
  }

  /**
   * Mount page to container
   */
  async mount(container) {
    this.container = container;

    // Get app instance from router
    this.app = this.router.app;

    // Get current theme
    this.currentTheme = themeManager.getCurrentTheme();

    // Render page
    this.container.innerHTML = this.render();

    // Attach event listeners
    this.attachEventListeners();

    // Initialize Lucide icons
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }

    console.log('ThemeSettingsPage mounted with current theme:', this.currentTheme);
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    if (!this.container) return;

    // Theme card click listeners
    const themeCards = this.container.querySelectorAll('.theme-card');
    themeCards.forEach(card => {
      card.addEventListener('click', (e) => {
        // Only trigger if clicking the card itself, not the button
        if (!e.target.closest('.btn-apply-theme')) {
          const themeName = card.dataset.theme;
          if (themeName) {
            this.handleThemeClick(themeName);
          }
        }
      });
    });

    // Apply button listeners
    const applyButtons = this.container.querySelectorAll('.btn-apply-theme');
    applyButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        const themeName = button.dataset.theme;
        if (themeName && !button.disabled) {
          this.handleThemeClick(themeName);
        }
      });
    });
  }

  /**
   * Handle theme click
   */
  handleThemeClick(themeName) {
    console.log(`Theme clicked: ${themeName}`);

    // Don't do anything if already active
    if (themeName === this.currentTheme) {
      return;
    }

    try {
      // Apply theme via ThemeManager (persists automatically)
      const success = themeManager.applyTheme(themeName, true);

      if (success) {
        // Update current theme
        this.currentTheme = themeName;

        // Update app settings if available
        if (this.app && this.app.settings) {
          this.app.settings.theme = themeName;
          if (typeof this.app.saveSettings === 'function') {
            this.app.saveSettings();
          }
        }

        // Show success message
        this.showToast(`${this.getThemeDisplayName(themeName)} theme applied`, 'success');

        // Refresh the page to update active indicators
        this.refreshPage();
      } else {
        this.showToast('Failed to apply theme', 'error');
      }
    } catch (error) {
      console.error('Error applying theme:', error);
      this.showToast('Error applying theme', 'error');
    }
  }

  /**
   * Get theme display name
   */
  getThemeDisplayName(themeName) {
    const theme = themeManager.getAllThemes()[themeName];
    return theme ? theme.displayName : themeName;
  }

  /**
   * Refresh page content
   */
  refreshPage() {
    if (this.container) {
      // Get updated current theme
      this.currentTheme = themeManager.getCurrentTheme();

      // Re-render
      this.container.innerHTML = this.render();

      // Re-attach listeners
      this.attachEventListeners();

      // Re-initialize icons
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    }
  }

  /**
   * Show toast notification
   */
  showToast(message, type = 'info') {
    if (this.app && typeof this.app.showToast === 'function') {
      this.app.showToast(message, type);
    } else {
      console.log(`[Toast ${type}]:`, message);
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Unmount page
   */
  async unmount() {
    // Clear container
    if (this.container) {
      this.container.innerHTML = '';
    }

    console.log('ThemeSettingsPage unmounted');
  }
}
