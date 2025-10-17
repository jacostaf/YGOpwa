/**
 * PriceCheckerPage.js - Price Checker Page Component
 *
 * Provides card price lookup functionality with:
 * - Form for card details (number, rarity, name, variant, condition)
 * - Integration with PriceChecker service
 * - Results display with card information and pricing
 * - Cache management and force refresh
 * - Glassmorphism UI styling
 */

import { PriceChecker } from '../js/price/PriceChecker.js';
import { Logger } from '../js/utils/Logger.js';

export default class PriceCheckerPage {
  constructor(router) {
    this.router = router;
    this.container = null;
    this.priceChecker = null;
    this.logger = new Logger('PriceCheckerPage');
    this.isLoading = false;
  }

  /**
   * Initialize the price checker service
   */
  async initializeServices() {
    try {
      if (!this.priceChecker) {
        this.priceChecker = new PriceChecker();
        await this.priceChecker.initialize();
        this.logger.info('PriceChecker service initialized');
      }
    } catch (error) {
      this.logger.error('Failed to initialize PriceChecker service:', error);
      this.showToast('Failed to initialize price checker service', 'error');
    }
  }

  /**
   * Render the page HTML
   */
  render() {
    return `
      <div class="page-content">
        <!-- Price Checker Form Card -->
        <div class="bg-neutral-900/40 backdrop-blur-sm border border-neutral-800/50 rounded-xl p-6 mb-6">
          <h2>
            <i data-lucide="dollar-sign" style="width: 24px; height: 24px; vertical-align: middle;"></i>
            Card Price Checker
          </h2>
          <p class="text-secondary">Look up Yu-Gi-Oh! card prices from TCGPlayer</p>

          <form id="price-form" class="price-form">
            <div class="form-grid">
              <!-- Card Number (Required) -->
              <div class="form-group">
                <label for="card-number">
                  Card Number <span class="text-danger">*</span>
                </label>
                <input
                  type="text"
                  id="card-number"
                  name="cardNumber"
                  required
                  placeholder="e.g., LOB-001"
                  aria-describedby="card-number-help"
                  autocomplete="off"
                >
                <small id="card-number-help" class="form-help">
                  Enter the card set code and number
                </small>
              </div>

              <!-- Card Rarity (Required) -->
              <div class="form-group">
                <label for="card-rarity">
                  Rarity <span class="text-danger">*</span>
                </label>
                <select id="card-rarity" name="rarity" required>
                  <option value="">Select rarity...</option>
                  <option value="common">Common</option>
                  <option value="rare">Rare</option>
                  <option value="super rare">Super Rare</option>
                  <option value="ultra rare">Ultra Rare</option>
                  <option value="ultimate rare">Ultimate Rare</option>
                  <option value="secret rare">Secret Rare</option>
                  <option value="prismatic secret rare">Prismatic Secret Rare</option>
                  <option value="platinum secret rare">Platinum Secret Rare</option>
                  <option value="quarter century secret rare">Quarter Century Secret Rare</option>
                  <option value="ghost rare">Ghost Rare</option>
                  <option value="starlight rare">Starlight Rare</option>
                  <option value="collector rare">Collector Rare</option>
                  <option value="parallel rare">Parallel Rare</option>
                  <option value="gold rare">Gold Rare</option>
                  <option value="mosaic rare">Mosaic Rare</option>
                  <option value="short print">Short Print</option>
                </select>
              </div>

              <!-- Card Name (Optional) -->
              <div class="form-group form-group-wide">
                <label for="card-name">Card Name (Optional)</label>
                <input
                  type="text"
                  id="card-name"
                  name="cardName"
                  placeholder="e.g., Blue-Eyes White Dragon"
                  autocomplete="off"
                >
              </div>

              <!-- Art Variant (Optional) -->
              <div class="form-group">
                <label for="art-variant">Art Variant</label>
                <input
                  type="text"
                  id="art-variant"
                  name="artVariant"
                  placeholder="e.g., 1st Edition, Unlimited"
                  autocomplete="off"
                >
              </div>

              <!-- Condition -->
              <div class="form-group">
                <label for="condition">Condition</label>
                <select id="condition" name="condition">
                  <option value="near-mint">Near Mint</option>
                  <option value="lightly-played">Lightly Played</option>
                  <option value="moderately-played">Moderately Played</option>
                  <option value="heavily-played">Heavily Played</option>
                  <option value="damaged">Damaged</option>
                </select>
              </div>
            </div>

            <!-- Form Actions -->
            <div class="form-actions">
              <button type="submit" class="btn btn-primary" id="check-price-btn">
                <i data-lucide="search" style="width: 18px; height: 18px;"></i>
                <span>Check Price</span>
              </button>
              <button type="button" class="btn btn-secondary" id="clear-form-btn">
                <i data-lucide="x-circle" style="width: 18px; height: 18px;"></i>
                <span>Clear</span>
              </button>
              <label class="checkbox-label">
                <input type="checkbox" id="force-refresh" name="forceRefresh">
                <span class="checkmark"></span>
                <span>Force Refresh</span>
              </label>
            </div>
          </form>
        </div>

        <!-- Price Results Card (initially hidden) -->
        <div id="price-results" class="price-results hidden">
          <div class="bg-neutral-900/40 backdrop-blur-sm border border-neutral-800/50 rounded-xl p-6">
            <div class="section-header">
              <h3>
                <i data-lucide="trending-up" style="width: 22px; height: 22px; vertical-align: middle;"></i>
                Price Results
              </h3>
              <button class="btn btn-secondary btn-sm" id="close-results-btn">
                <i data-lucide="x" style="width: 16px; height: 16px;"></i>
              </button>
            </div>
            <div id="price-content" class="price-content">
              <!-- Results will be populated dynamically -->
            </div>
          </div>
        </div>

        <!-- Loading Overlay -->
        <div id="loading-overlay" class="loading-overlay hidden">
          <div class="loading-spinner-container">
            <div class="loading-spinner"></div>
            <p>Fetching price data...</p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Mount the page
   */
  async mount(container) {
    this.container = container;
    this.container.innerHTML = this.render();

    // Initialize Lucide icons
    if (window.lucide) {
      window.lucide.createIcons();
    }

    // Initialize services
    await this.initializeServices();

    // Attach event listeners
    this.attachEvents();

    this.logger.info('PriceCheckerPage mounted');
  }

  /**
   * Attach event listeners
   */
  attachEvents() {
    // Form submit
    const form = this.container.querySelector('#price-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleFormSubmit(e));
    }

    // Clear button
    const clearBtn = this.container.querySelector('#clear-form-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.handleClearForm());
    }

    // Close results button
    const closeResultsBtn = this.container.querySelector('#close-results-btn');
    if (closeResultsBtn) {
      closeResultsBtn.addEventListener('click', () => this.hideResults());
    }
  }

  /**
   * Handle form submission
   */
  async handleFormSubmit(event) {
    event.preventDefault();

    if (this.isLoading) {
      this.logger.warn('Price check already in progress');
      return;
    }

    try {
      // Get form data
      const formData = this.getFormData();

      // Validate form data
      if (!this.validateFormData(formData)) {
        return;
      }

      // Show loading state
      this.setLoadingState(true);

      // Check price using PriceChecker service
      const result = await this.priceChecker.checkPrice(formData);

      // Display results
      this.displayResults(result);

      // Show success toast
      this.showToast('Price check completed successfully', 'success');

    } catch (error) {
      this.logger.error('Price check failed:', error);
      this.showToast(error.message || 'Failed to check price', 'error');
      this.displayError(error.message);
    } finally {
      this.setLoadingState(false);
    }
  }

  /**
   * Get form data
   */
  getFormData() {
    const form = this.container.querySelector('#price-form');

    return {
      cardNumber: form.querySelector('#card-number').value.trim(),
      rarity: form.querySelector('#card-rarity').value,
      cardName: form.querySelector('#card-name').value.trim() || null,
      artVariant: form.querySelector('#art-variant').value.trim() || null,
      condition: form.querySelector('#condition').value,
      forceRefresh: form.querySelector('#force-refresh').checked
    };
  }

  /**
   * Validate form data
   */
  validateFormData(formData) {
    if (!formData.cardNumber) {
      this.showToast('Card number is required', 'error');
      this.container.querySelector('#card-number').focus();
      return false;
    }

    if (!formData.rarity) {
      this.showToast('Card rarity is required', 'error');
      this.container.querySelector('#card-rarity').focus();
      return false;
    }

    return true;
  }

  /**
   * Display price results
   */
  displayResults(result) {
    const resultsContainer = this.container.querySelector('#price-results');
    const contentContainer = this.container.querySelector('#price-content');

    if (!result || !result.success) {
      this.displayError('No price data available');
      return;
    }

    const cardData = result.data;
    const aggregated = result.aggregated;
    const metadata = result.metadata;

    // Build results HTML
    const html = `
      <div class="price-results-grid">
        <!-- Card Information -->
        <div class="card-info-section">
          <h4>Card Information</h4>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Card Name:</span>
              <span class="info-value">${this.escapeHtml(cardData.card_name)}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Card Number:</span>
              <span class="info-value">${this.escapeHtml(cardData.card_number)}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Rarity:</span>
              <span class="info-value">${this.escapeHtml(cardData.card_rarity)}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Set:</span>
              <span class="info-value">${this.escapeHtml(cardData.booster_set_name)}</span>
            </div>
            ${cardData.card_art_variant && cardData.card_art_variant !== 'N/A' ? `
            <div class="info-item">
              <span class="info-label">Art Variant:</span>
              <span class="info-value">${this.escapeHtml(cardData.card_art_variant)}</span>
            </div>
            ` : ''}
            ${cardData.set_code && cardData.set_code !== 'N/A' ? `
            <div class="info-item">
              <span class="info-label">Set Code:</span>
              <span class="info-value">${this.escapeHtml(cardData.set_code)}</span>
            </div>
            ` : ''}
          </div>
        </div>

        <!-- Pricing Information -->
        <div class="pricing-section">
          <h4>Pricing Information</h4>
          <div class="price-cards">
            ${cardData.tcg_price ? `
            <div class="price-card">
              <div class="price-label">TCG Low Price</div>
              <div class="price-value">${this.formatPrice(cardData.tcg_price)}</div>
            </div>
            ` : ''}
            ${cardData.tcg_market_price ? `
            <div class="price-card">
              <div class="price-label">TCG Market Price</div>
              <div class="price-value">${this.formatPrice(cardData.tcg_market_price)}</div>
            </div>
            ` : ''}
            ${aggregated && aggregated.averagePrice ? `
            <div class="price-card">
              <div class="price-label">Average Price</div>
              <div class="price-value">${this.formatPrice(aggregated.averagePrice)}</div>
            </div>
            ` : ''}
            ${!cardData.tcg_price && !cardData.tcg_market_price ? `
            <div class="no-price-data">
              <i data-lucide="alert-circle" style="width: 24px; height: 24px;"></i>
              <p>No pricing data available for this card</p>
            </div>
            ` : ''}
          </div>
        </div>

        <!-- Card Image (if available) -->
        ${cardData.image_url ? `
        <div class="card-image-section">
          <h4>Card Image</h4>
          <div class="card-image-container">
            <img
              src="${this.escapeHtml(cardData.image_url)}"
              alt="${this.escapeHtml(cardData.card_name)}"
              class="card-image"
              onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
            >
            <div class="image-error" style="display: none;">
              <i data-lucide="image-off" style="width: 48px; height: 48px;"></i>
              <p>Image not available</p>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- Metadata -->
        <div class="metadata-section">
          <h4>Query Information</h4>
          <div class="metadata-grid">
            <div class="metadata-item">
              <span class="metadata-label">
                <i data-lucide="clock" style="width: 16px; height: 16px;"></i>
                Last Updated:
              </span>
              <span class="metadata-value">${this.formatDate(cardData.last_price_updt)}</span>
            </div>
            ${metadata.fromCache ? `
            <div class="metadata-item">
              <span class="metadata-label">
                <i data-lucide="database" style="width: 16px; height: 16px;"></i>
                Source:
              </span>
              <span class="metadata-value">Cached (${this.formatCacheAge(metadata.cacheAge)})</span>
            </div>
            ` : `
            <div class="metadata-item">
              <span class="metadata-label">
                <i data-lucide="cloud" style="width: 16px; height: 16px;"></i>
                Source:
              </span>
              <span class="metadata-value">Live API</span>
            </div>
            `}
            ${cardData.source_url ? `
            <div class="metadata-item metadata-item-wide">
              <span class="metadata-label">
                <i data-lucide="external-link" style="width: 16px; height: 16px;"></i>
                Source URL:
              </span>
              <a href="${this.escapeHtml(cardData.source_url)}" target="_blank" rel="noopener noreferrer" class="metadata-link">
                View on TCGPlayer
              </a>
            </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    contentContainer.innerHTML = html;
    resultsContainer.classList.remove('hidden');

    // Reinitialize Lucide icons for the new content
    if (window.lucide) {
      window.lucide.createIcons();
    }

    // Scroll to results
    resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /**
   * Display error message
   */
  displayError(message) {
    const resultsContainer = this.container.querySelector('#price-results');
    const contentContainer = this.container.querySelector('#price-content');

    const html = `
      <div class="error-state">
        <i data-lucide="alert-triangle" style="width: 48px; height: 48px; color: var(--color-danger);"></i>
        <h4>Price Check Failed</h4>
        <p>${this.escapeHtml(message)}</p>
        <button class="btn btn-secondary" onclick="this.closest('.price-results').classList.add('hidden')">
          <i data-lucide="x" style="width: 16px; height: 16px;"></i>
          <span>Close</span>
        </button>
      </div>
    `;

    contentContainer.innerHTML = html;
    resultsContainer.classList.remove('hidden');

    // Reinitialize Lucide icons
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  /**
   * Hide results
   */
  hideResults() {
    const resultsContainer = this.container.querySelector('#price-results');
    if (resultsContainer) {
      resultsContainer.classList.add('hidden');
    }
  }

  /**
   * Handle clear form
   */
  handleClearForm() {
    const form = this.container.querySelector('#price-form');
    if (form) {
      form.reset();
      this.hideResults();
      this.logger.info('Form cleared');
    }
  }

  /**
   * Set loading state
   */
  setLoadingState(loading) {
    this.isLoading = loading;

    const loadingOverlay = this.container.querySelector('#loading-overlay');
    const submitBtn = this.container.querySelector('#check-price-btn');

    if (loading) {
      loadingOverlay?.classList.remove('hidden');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i data-lucide="loader" style="width: 18px; height: 18px; animation: spin 1s linear infinite;"></i><span>Checking...</span>';
      }
    } else {
      loadingOverlay?.classList.add('hidden');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i data-lucide="search" style="width: 18px; height: 18px;"></i><span>Check Price</span>';
      }
    }

    // Reinitialize icons
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  /**
   * Format price as currency
   */
  formatPrice(price) {
    if (price === null || price === undefined) return 'N/A';
    const numPrice = parseFloat(price);
    if (isNaN(numPrice)) return 'N/A';
    return `$${numPrice.toFixed(2)}`;
  }

  /**
   * Format date
   */
  formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  }

  /**
   * Format cache age
   */
  formatCacheAge(milliseconds) {
    if (!milliseconds) return 'just now';

    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
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
   * Show toast notification
   */
  showToast(message, type = 'info') {
    // Check if toast container exists
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info';

    toast.innerHTML = `
      <i data-lucide="${icon}" style="width: 20px; height: 20px;"></i>
      <span>${this.escapeHtml(message)}</span>
    `;

    toastContainer.appendChild(toast);

    // Initialize Lucide icons
    if (window.lucide) {
      window.lucide.createIcons();
    }

    // Auto remove after 3 seconds
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * Unmount the page
   */
  async unmount() {
    if (this.container) {
      // Remove event listeners (handled by innerHTML clearing)
      this.container.innerHTML = '';
    }
    this.logger.info('PriceCheckerPage unmounted');
  }
}
