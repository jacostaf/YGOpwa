/**
 * ToggleSwitch.js - Reusable Toggle Switch Component
 *
 * Features:
 * - On/off state management
 * - Customizable labels and descriptions
 * - Disabled state support
 * - Event callbacks
 * - Glassmorphism styling
 * - Accessibility (ARIA labels, keyboard support)
 */

export default class ToggleSwitch {
  constructor(options = {}) {
    // Configuration
    this.id = options.id || `toggle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.name = options.name || this.id;
    this.checked = options.checked || false;
    this.disabled = options.disabled || false;
    this.label = options.label || '';
    this.description = options.description || '';
    this.onChange = options.onChange || null;

    // State
    this.element = null;
    this.checkboxElement = null;
  }

  /**
   * Render the toggle switch HTML
   * @returns {string} HTML string
   */
  render() {
    const checkedAttr = this.checked ? 'checked' : '';
    const disabledAttr = this.disabled ? 'disabled' : '';
    const disabledClass = this.disabled ? 'toggle-disabled' : '';

    return `
      <div class="toggle-switch-container ${disabledClass}" data-toggle-id="${this.id}">
        <div class="toggle-switch-content">
          ${this.label ? `<label for="${this.id}" class="toggle-label">${this.escapeHtml(this.label)}</label>` : ''}
          ${this.description ? `<p class="toggle-description">${this.escapeHtml(this.description)}</p>` : ''}
        </div>
        <div class="toggle-switch-wrapper">
          <input
            type="checkbox"
            id="${this.id}"
            name="${this.name}"
            class="toggle-checkbox"
            ${checkedAttr}
            ${disabledAttr}
            role="switch"
            aria-checked="${this.checked}"
            aria-label="${this.escapeHtml(this.label || 'Toggle switch')}"
          >
          <label for="${this.id}" class="toggle-slider">
            <span class="toggle-slider-circle"></span>
          </label>
        </div>
      </div>
    `;
  }

  /**
   * Mount the toggle switch to a container
   * @param {HTMLElement} container - Parent container
   */
  mount(container) {
    if (!container) {
      console.error('ToggleSwitch: No container provided for mounting');
      return;
    }

    // Insert HTML
    container.innerHTML = this.render();

    // Store references
    this.element = container.querySelector(`[data-toggle-id="${this.id}"]`);
    this.checkboxElement = container.querySelector(`#${this.id}`);

    if (this.checkboxElement) {
      // Attach event listener
      this.checkboxElement.addEventListener('change', this.handleChange.bind(this));

      // Add keyboard support
      this.checkboxElement.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (!this.disabled) {
            this.checkboxElement.click();
          }
        }
      });
    }
  }

  /**
   * Handle change event
   * @param {Event} e - Change event
   * @private
   */
  handleChange(e) {
    this.checked = e.target.checked;

    // Update ARIA
    if (this.checkboxElement) {
      this.checkboxElement.setAttribute('aria-checked', this.checked);
    }

    // Call onChange callback
    if (typeof this.onChange === 'function') {
      this.onChange(this.checked, this.id, this.name);
    }
  }

  /**
   * Get current checked state
   * @returns {boolean} Current checked state
   */
  isChecked() {
    return this.checked;
  }

  /**
   * Set checked state
   * @param {boolean} checked - New checked state
   */
  setChecked(checked) {
    this.checked = !!checked;

    if (this.checkboxElement) {
      this.checkboxElement.checked = this.checked;
      this.checkboxElement.setAttribute('aria-checked', this.checked);
    }
  }

  /**
   * Set disabled state
   * @param {boolean} disabled - New disabled state
   */
  setDisabled(disabled) {
    this.disabled = !!disabled;

    if (this.checkboxElement) {
      this.checkboxElement.disabled = this.disabled;
    }

    if (this.element) {
      if (this.disabled) {
        this.element.classList.add('toggle-disabled');
      } else {
        this.element.classList.remove('toggle-disabled');
      }
    }
  }

  /**
   * Update label text
   * @param {string} label - New label text
   */
  setLabel(label) {
    this.label = label;

    if (this.element) {
      const labelElement = this.element.querySelector('.toggle-label');
      if (labelElement) {
        labelElement.textContent = label;
      }
    }
  }

  /**
   * Update description text
   * @param {string} description - New description text
   */
  setDescription(description) {
    this.description = description;

    if (this.element) {
      const descElement = this.element.querySelector('.toggle-description');
      if (descElement) {
        descElement.textContent = description;
      }
    }
  }

  /**
   * Destroy the toggle switch
   */
  destroy() {
    if (this.checkboxElement) {
      this.checkboxElement.removeEventListener('change', this.handleChange.bind(this));
    }

    if (this.element && this.element.parentNode) {
      this.element.parentNode.innerHTML = '';
    }

    this.element = null;
    this.checkboxElement = null;
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   * @private
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Create a standalone toggle switch and return the HTML element
   * @param {object} options - Toggle switch options
   * @returns {HTMLElement} Toggle switch element
   * @static
   */
  static create(options) {
    const container = document.createElement('div');
    const toggle = new ToggleSwitch(options);
    toggle.mount(container);
    return container.firstElementChild;
  }

  /**
   * Get CSS styles for toggle switches (inject once)
   * @returns {string} CSS string
   * @static
   */
  static getStyles() {
    return `
      .toggle-switch-container {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem;
        gap: 1rem;
        min-height: 60px;
      }

      .toggle-switch-container.toggle-disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .toggle-switch-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .toggle-label {
        font-weight: 500;
        font-size: 0.95rem;
        color: var(--text-primary, #ffffff);
        cursor: pointer;
        user-select: none;
      }

      .toggle-description {
        font-size: 0.85rem;
        color: var(--text-secondary, #999);
        margin: 0;
        line-height: 1.4;
      }

      .toggle-switch-wrapper {
        display: flex;
        align-items: center;
        flex-shrink: 0;
      }

      .toggle-checkbox {
        position: absolute;
        opacity: 0;
        width: 0;
        height: 0;
      }

      .toggle-slider {
        position: relative;
        display: block;
        width: 52px;
        height: 28px;
        background: var(--toggle-bg-off, rgba(100, 100, 100, 0.3));
        border-radius: 14px;
        cursor: pointer;
        transition: background-color 0.3s ease;
        border: 1px solid var(--toggle-border, rgba(255, 255, 255, 0.1));
      }

      .toggle-checkbox:checked + .toggle-slider {
        background: var(--toggle-bg-on, #10b981);
      }

      .toggle-checkbox:disabled + .toggle-slider {
        cursor: not-allowed;
        opacity: 0.5;
      }

      .toggle-slider-circle {
        position: absolute;
        top: 2px;
        left: 2px;
        width: 22px;
        height: 22px;
        background: var(--text-primary, #f5f5f4);
        border-radius: 50%;
        transition: transform 0.3s ease;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }

      .toggle-checkbox:checked + .toggle-slider .toggle-slider-circle {
        transform: translateX(24px);
      }

      .toggle-checkbox:focus + .toggle-slider {
        outline: 2px solid var(--accent-color, #60a5fa);
        outline-offset: 2px;
      }

      /* Hover effects */
      .toggle-slider:hover {
        background: var(--toggle-bg-off-hover, rgba(100, 100, 100, 0.4));
      }

      .toggle-checkbox:checked + .toggle-slider:hover {
        background: var(--toggle-bg-on-hover, #059669);
      }

      /* Mobile responsive */
      @media (max-width: 768px) {
        .toggle-switch-container {
          padding: 0.75rem;
          min-height: 50px;
        }

        .toggle-label {
          font-size: 0.9rem;
        }

        .toggle-description {
          font-size: 0.8rem;
        }

        .toggle-slider {
          width: 48px;
          height: 26px;
        }

        .toggle-slider-circle {
          width: 20px;
          height: 20px;
        }

        .toggle-checkbox:checked + .toggle-slider .toggle-slider-circle {
          transform: translateX(22px);
        }
      }
    `;
  }

  /**
   * Inject styles into the document (call once on app load)
   * @static
   */
  static injectStyles() {
    if (document.getElementById('toggle-switch-styles')) {
      return; // Already injected
    }

    const styleElement = document.createElement('style');
    styleElement.id = 'toggle-switch-styles';
    styleElement.textContent = ToggleSwitch.getStyles();
    document.head.appendChild(styleElement);
  }
}
