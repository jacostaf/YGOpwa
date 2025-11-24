/**
 * CardGrid.js
 *
 * Reusable card grid component for displaying Yu-Gi-Oh cards in a responsive grid
 * Features:
 * - Responsive grid layout (2-8 columns)
 * - Card image display with hover effects
 * - Price information (TCG Low, TCG Market)
 * - Rarity badges
 * - Remove card functionality
 * - Empty state when no cards
 * - Consolidated/expanded views
 * - Custom card size support
 */

export default class CardGrid {
  /**
   * Create a CardGrid instance
   * @param {Object} options - Configuration options
   * @param {Array} options.cards - Array of card objects
   * @param {Function} options.onRemoveCard - Callback when card is removed
   * @param {boolean} options.consolidated - Show consolidated view (default: false)
   * @param {number} options.cardSize - Card size in pixels (default: 120)
   * @param {boolean} options.showRemoveButton - Show remove button (default: true)
   */
  constructor(options = {}) {
    this.cards = options.cards || [];
    this.onRemoveCard = options.onRemoveCard || null;
    this.consolidated = options.consolidated || false;
    this.cardSize = options.cardSize || 120;
    this.showRemoveButton = options.showRemoveButton !== false;
    this.element = null;
  }

  /**
   * Render the card grid HTML
   * @returns {string} HTML string
   */
  render() {
    if (!this.cards || this.cards.length === 0) {
      return this.renderEmptyState();
    }

    // If consolidated view, group cards by name
    const displayCards = this.consolidated ? this.consolidateCards() : this.cards;

    return `
      <div class="card-grid" style="--card-width: ${this.cardSize}px">
        ${displayCards.map((card, index) => this.renderCard(card, index)).join('')}
      </div>
    `;
  }

  /**
   * Consolidate cards by name
   * @returns {Array} Consolidated cards
   */
  consolidateCards() {
    const consolidated = new Map();

    this.cards.forEach(card => {
      const key = card.name || 'Unknown Card';
      if (consolidated.has(key)) {
        const existing = consolidated.get(key);
        existing.quantity = (existing.quantity || 1) + 1;
        // Sum up prices
        if (card.tcgLow) {
          existing.tcgLow = (existing.tcgLow || 0) + parseFloat(card.tcgLow);
        }
        if (card.tcgMarket) {
          existing.tcgMarket = (existing.tcgMarket || 0) + parseFloat(card.tcgMarket);
        }
      } else {
        consolidated.set(key, {
          ...card,
          quantity: 1,
          tcgLow: card.tcgLow ? parseFloat(card.tcgLow) : 0,
          tcgMarket: card.tcgMarket ? parseFloat(card.tcgMarket) : 0
        });
      }
    });

    return Array.from(consolidated.values());
  }

  /**
   * Render a single card
   * @param {Object} card - Card object
   * @param {number} index - Card index
   * @returns {string} Card HTML
   */
  renderCard(card, index) {
    const cardName = this.escapeHtml(card.name || 'Unknown Card');
    const cardSet = this.escapeHtml(card.set || '');
    const cardNumber = this.escapeHtml(card.cardNumber || '');
    const cardRarity = this.escapeHtml(card.rarity || '');
    const tcgLow = this.formatPrice(card.tcgLow || card.tcg_price);
    const tcgMarket = this.formatPrice(card.tcgMarket || card.tcg_market_price);
    const quantity = card.quantity > 1 ? `x${card.quantity}` : '';
    const rarityClass = this.getRarityClass(cardRarity);
    const cardImage = this.getSafeImage(card.imageUrl || card.image_url || card.image_url_small);

    return `
      <div class="ygo-card" data-card-index="${index}" style="--card-size: ${this.cardSize}px;">
        ${this.showRemoveButton ? `
          <button class="ygo-card-remove-btn" data-remove-index="${index}" title="Remove card">
            <i data-lucide="X" class="icon-sm"></i>
          </button>
        ` : ''}

        ${quantity ? `
          <span class="ygo-card-quantity">${quantity}</span>
        ` : ''}

        <div class="ygo-card-image-container">
          <img src="${cardImage}"
               alt="${cardName}"
               class="ygo-card-image"
               loading="lazy"
               onerror="this.onerror=null;this.src='${this.getDefaultCardImage()}';">
        </div>

        <div class="ygo-card-content">
          <div class="ygo-card-header">
            <div class="ygo-card-name" title="${cardName}">${cardName}</div>
            ${cardNumber ? `<div class="ygo-card-number">${cardSet ? `${cardSet}-` : ''}${cardNumber}</div>` : ''}
          </div>

          ${cardRarity ? `
            <div class="ygo-card-rarity">
              <span class="ygo-rarity-badge ${rarityClass}">${cardRarity}</span>
            </div>
          ` : ''}

          <div class="ygo-card-prices">
            ${tcgLow ? `
              <div class="ygo-price-row">
                <span class="ygo-price-label">Low:</span>
                <span class="ygo-price-value value-low">${tcgLow}</span>
              </div>
            ` : ''}
            ${tcgMarket ? `
              <div class="ygo-price-row">
                <span class="ygo-price-label">Mkt:</span>
                <span class="ygo-price-value value-market">${tcgMarket}</span>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render empty state
   * @returns {string} Empty state HTML
   */
  renderEmptyState() {
    return `
      <div class="empty-state text-center py-16">
        <div class="empty-icon mb-4">
          <i data-lucide="Package" class="w-16 h-16 text-neutral-600 mx-auto"></i>
        </div>
        <h3 class="text-lg font-medium text-neutral-400 mb-2">No cards in session</h3>
        <p class="text-sm text-neutral-500">Start a pack ripper session and use voice recognition to add cards.</p>
      </div>
    `;
  }

  /**
   * Get rarity class for styling
   * @param {string} rarity - Card rarity
   * @returns {string} CSS class
   */
  getRarityClass(rarity) {
    const rarityLower = (rarity || '').toLowerCase();

    if (rarityLower.includes('secret') || rarityLower.includes('starlight') || rarityLower.includes('ghost')) {
      return 'rarity-secret';
    } else if (rarityLower.includes('ultra') || rarityLower.includes('ultimate')) {
      return 'rarity-ultra';
    } else if (rarityLower.includes('super')) {
      return 'rarity-super';
    } else if (rarityLower.includes('rare')) {
      return 'rarity-rare';
    } else if (rarityLower.includes('common')) {
      return 'rarity-common';
    } else {
      return 'rarity-unknown';
    }
  }

  /**
   * Format price for display
   * @param {number|string} price - Price value
   * @returns {string} Formatted price
   */
  formatPrice(price) {
    if (!price || price === 0) return null;
    const priceNum = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(priceNum)) return null;
    return `$${priceNum.toFixed(2)}`;
  }

  /**
   * Get default card image
   * @returns {string} Default image URL
   */
  getDefaultCardImage() {
    return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420" fill="none"><rect width="300" height="420" rx="16" fill="%231f2937"/><rect x="14" y="14" width="272" height="392" rx="12" fill="url(%23g)" stroke="%23374151" stroke-width="4"/><path d="M150 90 L180 210 L120 210 Z" fill="%238b5cf6" opacity="0.35"/><path d="M150 330 A80 80 0 1 1 149.9 330" stroke="%23a855f7" stroke-width="10" fill="none" opacity="0.4"/><circle cx="150" cy="210" r="42" fill="%2322c55e" opacity="0.4"/><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="420"><stop stop-color="%2321242c"/><stop offset="1" stop-color="%23111"/></linearGradient></defs></svg>';
  }

  /**
   * Ensure we never request a missing local asset; fallback to placeholder for bad URLs
   */
  getSafeImage(imageUrl) {
    if (!imageUrl) {
      return this.getDefaultCardImage();
    }

    const lower = String(imageUrl).toLowerCase();
    if (lower.includes('card-back.jpg') || lower.startsWith('/src/assets')) {
      return this.getDefaultCardImage();
    }

    return imageUrl;
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Create and return the card grid element
   * @returns {HTMLElement} The card grid element
   */
  create() {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = this.render();
    this.element = wrapper.firstElementChild || wrapper;

    // Attach event listeners for remove buttons
    this.attachEventListeners();

    // Initialize Lucide icons
    if (window.lucide) {
      window.lucide.createIcons();
    }

    return this.element;
  }

  /**
   * Attach event listeners
   * @private
   */
  attachEventListeners() {
    if (!this.element || !this.showRemoveButton) return;

    // Remove card buttons
    const removeButtons = this.element.querySelectorAll('.card-remove-btn');
    removeButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(button.dataset.removeIndex, 10);
        this.handleRemoveCard(index);
      });
    });
  }

  /**
   * Handle remove card click
   * @param {number} index - Card index
   */
  handleRemoveCard(index) {
    if (this.onRemoveCard && typeof this.onRemoveCard === 'function') {
      const card = this.cards[index];
      this.onRemoveCard(card, index);
    }
  }

  /**
   * Update the card grid with new cards
   * @param {Array} cards - New cards array
   */
  update(cards) {
    this.cards = cards || [];

    if (this.element && this.element.parentNode) {
      const newElement = this.create();
      this.element.parentNode.replaceChild(newElement, this.element);
      this.element = newElement;
    }
  }

  /**
   * Update configuration
   * @param {Object} options - New options
   */
  updateConfig(options = {}) {
    if (options.consolidated !== undefined) {
      this.consolidated = options.consolidated;
    }
    if (options.cardSize !== undefined) {
      this.cardSize = options.cardSize;
    }
    if (options.showRemoveButton !== undefined) {
      this.showRemoveButton = options.showRemoveButton;
    }

    // Re-render if element exists
    if (this.element && this.element.parentNode) {
      const newElement = this.create();
      this.element.parentNode.replaceChild(newElement, this.element);
      this.element = newElement;
    }
  }

  /**
   * Destroy the card grid and clean up
   */
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
    this.cards = [];
  }
}

/**
 * Helper function to create a card grid from options
 * @param {Object} options - Card grid options
 * @returns {HTMLElement} The card grid element
 */
export function createCardGrid(options) {
  const grid = new CardGrid(options);
  return grid.create();
}
