/**
 * StatsCard.js
 *
 * Reusable stat card component for displaying statistics with glassmorphism styling
 * Features:
 * - Lucide icon display
 * - Value and label
 * - Optional trend badge
 * - Glassmorphism styling
 * - Hover effects
 * - Responsive design
 */

import { refreshIcons } from '../utils/IconLoader.js';

export default class StatsCard {
  /**
   * Create a StatsCard instance
   * @param {Object} options - Configuration options
   * @param {string} options.icon - Lucide icon name (e.g., 'Activity', 'Package')
   * @param {string} options.label - Card label (e.g., 'Recognition Accuracy')
   * @param {string} options.value - Card value (e.g., '97%', '$2,847')
   * @param {string} options.trend - Optional trend text (e.g., '+2%', '+12 this week')
   * @param {string} options.trendClass - Optional CSS class for trend badge (default: 'text-green-400 bg-green-400/10')
   * @param {string} options.iconBg - Optional icon background class (default: 'bg-neutral-700/30')
   */
  constructor(options = {}) {
    this.icon = options.icon || 'Activity';
    this.label = options.label || 'Stat';
    this.value = options.value || '0';
    this.trend = options.trend || null;
    this.trendClass = options.trendClass || 'text-green-400 bg-green-400/10';
    this.iconBg = options.iconBg || 'bg-neutral-700/30';
    this.element = null;
  }

  /**
   * Render the stat card HTML
   * @returns {string} HTML string
   */
  render() {
    const escapedLabel = this.escapeHtml(this.label);
    const escapedValue = this.escapeHtml(this.value);
    const escapedTrend = this.trend ? this.escapeHtml(this.trend) : '';

    return `
      <div
        class="stats-card bg-neutral-900/40 backdrop-blur-sm border border-neutral-800/50 rounded-xl p-6 hover:border-neutral-700/50 transition-all duration-200 hover:shadow-lg hover:shadow-neutral-900/20"
        role="article"
        aria-label="${escapedLabel}: ${escapedValue}${escapedTrend ? ', ' + escapedTrend : ''}"
      >
        <div class="stats-card-header flex items-start justify-between mb-4">
          <div class="stats-card-icon p-3 rounded-lg ${this.iconBg}" aria-hidden="true">
            <i data-lucide="${this.icon}" class="w-6 h-6 text-neutral-400"></i>
          </div>
          ${this.trend ? `
            <span class="stats-card-trend text-xs px-2 py-1 rounded ${this.trendClass}" aria-label="Trend: ${escapedTrend}">
              ${this.trend}
            </span>
          ` : ''}
        </div>
        <div class="stats-card-value text-3xl font-bold text-white mb-1" aria-hidden="true">${this.value}</div>
        <div class="stats-card-label text-sm text-neutral-400" aria-hidden="true">${this.label}</div>
      </div>
    `;
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
    div.textContent = text.toString();
    return div.innerHTML;
  }

  /**
   * Create and return the stat card element
   * @returns {HTMLElement} The stat card element
   */
  create() {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = this.render();
    this.element = wrapper.firstElementChild;

    // Initialize Lucide icons
    if (window.lucide) {
      refreshIcons();
    }

    return this.element;
  }

  /**
   * Update the stat card value
   * @param {string} value - New value
   */
  updateValue(value) {
    this.value = value;
    if (this.element) {
      const valueElement = this.element.querySelector('.stats-card-value');
      if (valueElement) {
        valueElement.textContent = value;
      }
    }
  }

  /**
   * Update the stat card trend
   * @param {string} trend - New trend text
   * @param {string} trendClass - Optional new trend class
   */
  updateTrend(trend, trendClass = null) {
    this.trend = trend;
    if (trendClass) {
      this.trendClass = trendClass;
    }

    if (this.element) {
      const trendElement = this.element.querySelector('.stats-card-trend');
      if (trendElement && trend) {
        trendElement.textContent = trend;
        if (trendClass) {
          trendElement.className = `stats-card-trend text-xs px-2 py-1 rounded ${trendClass}`;
        }
      } else if (trend && !trendElement) {
        // Create trend badge if it doesn't exist
        const header = this.element.querySelector('.stats-card-header');
        if (header) {
          const trendBadge = document.createElement('span');
          trendBadge.className = `stats-card-trend text-xs px-2 py-1 rounded ${this.trendClass}`;
          trendBadge.textContent = trend;
          header.appendChild(trendBadge);
        }
      }
    }
  }

  /**
   * Update the entire stat card
   * @param {Object} options - New options
   */
  update(options = {}) {
    if (options.value !== undefined) {
      this.updateValue(options.value);
    }
    if (options.trend !== undefined) {
      this.updateTrend(options.trend, options.trendClass);
    }
    if (options.label !== undefined) {
      this.label = options.label;
      if (this.element) {
        const labelElement = this.element.querySelector('.stats-card-label');
        if (labelElement) {
          labelElement.textContent = options.label;
        }
      }
    }
  }

  /**
   * Destroy the stat card and clean up
   */
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
  }
}

/**
 * Helper function to create a stat card from options
 * @param {Object} options - Stat card options
 * @returns {HTMLElement} The stat card element
 */
export function createStatsCard(options) {
  const card = new StatsCard(options);
  return card.create();
}
