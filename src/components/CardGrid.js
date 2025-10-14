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
      <div class="card-grid grid gap-4 ${this.getGridClass()}">
        ${displayCards.map((card, index) => this.renderCard(card, index)).join('')}
      </div>
    `;
  }

  /**
   * Get grid column class based on card size
   * @returns {string} Grid class
   */
  getGridClass() {
    // Responsive grid based on card size
    if (this.cardSize >= 200) {
      return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5';
    } else if (this.cardSize >= 150) {
      return 'grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6';
    } else if (this.cardSize >= 120) {
      return 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8';
    } else {
      return 'grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10';
    }
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
    const tcgLow = this.formatPrice(card.tcgLow);
    const tcgMarket = this.formatPrice(card.tcgMarket);
    const quantity = card.quantity > 1 ? `x${card.quantity}` : '';
    const rarityClass = this.getRarityClass(cardRarity);
    const cardImage = card.imageUrl || this.getDefaultCardImage();

    return `
      <div class="card-item bg-neutral-900/40 backdrop-blur-sm border border-neutral-800/50 rounded-lg p-3 hover:border-neutral-700/50 transition-all duration-200 hover:shadow-lg hover:shadow-neutral-900/20 relative group"
           data-card-index="${index}"
           style="width: ${this.cardSize}px;">

        ${this.showRemoveButton ? `
          <button class="card-remove-btn absolute top-1 right-1 w-6 h-6 bg-red-500/80 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  data-remove-index="${index}"
                  title="Remove card">
            <i data-lucide="X" class="w-4 h-4 text-white"></i>
          </button>
        ` : ''}

        ${quantity ? `
          <span class="card-quantity absolute top-1 left-1 px-2 py-1 bg-neutral-800/90 text-white text-xs font-bold rounded">
            ${quantity}
          </span>
        ` : ''}

        <div class="card-image mb-2 rounded overflow-hidden bg-neutral-800">
          <img src="${cardImage}"
               alt="${cardName}"
               class="w-full h-auto object-cover"
               loading="lazy"
               onerror="this.src='/src/assets/card-back.jpg'">
        </div>

        <div class="card-info text-xs">
          <div class="card-name font-medium text-white mb-1 truncate" title="${cardName}">
            ${cardName}
          </div>

          ${cardNumber ? `
            <div class="card-number text-neutral-400 text-xs mb-1 truncate">
              ${cardSet ? `${cardSet}-` : ''}${cardNumber}
            </div>
          ` : ''}

          ${cardRarity ? `
            <div class="card-rarity mb-2">
              <span class="rarity-badge ${rarityClass} text-xs px-2 py-0.5 rounded">
                ${cardRarity}
              </span>
            </div>
          ` : ''}

          <div class="card-prices space-y-1">
            ${tcgLow ? `
              <div class="price-item flex justify-between text-xs">
                <span class="text-neutral-500">TCG Low:</span>
                <span class="text-green-400 font-medium">${tcgLow}</span>
              </div>
            ` : ''}
            ${tcgMarket ? `
              <div class="price-item flex justify-between text-xs">
                <span class="text-neutral-500">TCG Market:</span>
                <span class="text-neutral-300 font-medium">${tcgMarket}</span>
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
      return 'bg-purple-500/20 text-purple-300 border border-purple-500/30';
    } else if (rarityLower.includes('ultra') || rarityLower.includes('ultimate')) {
      return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30';
    } else if (rarityLower.includes('super')) {
      return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
    } else if (rarityLower.includes('rare')) {
      return 'bg-neutral-500/20 text-neutral-300 border border-neutral-500/30';
    } else if (rarityLower.includes('common')) {
      return 'bg-neutral-600/20 text-neutral-400 border border-neutral-600/30';
    } else {
      return 'bg-neutral-700/20 text-neutral-400 border border-neutral-700/30';
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
    return '/src/assets/card-back.jpg';
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
