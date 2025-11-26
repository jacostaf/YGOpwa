/**
 * CardGrid.js
 *
 * Reusable card grid component for displaying Yu-Gi-Oh cards
 * Features:
 * - Two view modes: 'list' (row-style) and 'grid' (tile-style)
 * - Responsive grid layout (2-8 columns in grid mode)
 * - Card image display with hover effects
 * - Price information (TCG Low, TCG Market)
 * - Rarity badges
 * - Remove card functionality
 * - Empty state when no cards
 * - Consolidated/expanded views (groups cards by name)
 * - Custom card size support
 * - Optimized DOM manipulation (no innerHTML)
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
   * @param {string} options.viewMode - View mode: 'grid' or 'list' (default: 'grid')
   */
  constructor(options = {}) {
    this.cards = options.cards || [];
    this.onRemoveCard = options.onRemoveCard || null;
    // Treat only explicit true as consolidated; avoids truthy strings accidentally enabling grid view
    this.consolidated = options.consolidated === true;
    this.cardSize = options.cardSize || 120;
    this.showRemoveButton = options.showRemoveButton !== false;
    this.viewMode = options.viewMode || 'grid'; // 'grid' or 'list'
    this.element = null;
  }

  /**
   * Create the card display DOM structure
   * @returns {HTMLElement} The container element
   */
  render() {
    if (!this.cards || this.cards.length === 0) {
      return this.renderEmptyState();
    }

    // Consolidated=true shows grouped cards in grid; false shows individual cards in list/row layout
    const isConsolidated = Boolean(this.consolidated);
    const displayCards = isConsolidated ? this.consolidateCards() : this.cards;

    return isConsolidated
      ? this.renderGridView(displayCards)
      : this.renderListView(displayCards);
  }

  /**
   * Render grid view (tile-style cards)
   * @param {Array} displayCards - Cards to display
   * @returns {HTMLElement} Container element
   */
  renderGridView(displayCards) {
    const container = document.createElement('div');
    container.className = 'card-grid';
    container.style.setProperty('--card-width', `${this.cardSize}px`);

    const fragment = document.createDocumentFragment();
    displayCards.forEach((card, index) => {
      fragment.appendChild(this.createGridCardElement(card, index));
    });
    container.appendChild(fragment);

    return container;
  }

  /**
   * Render list view (row-style cards)
   * @param {Array} displayCards - Cards to display
   * @returns {HTMLElement} Container element
   */
  renderListView(displayCards) {
    const container = document.createElement('div');
    container.className = 'card-list';

    const fragment = document.createDocumentFragment();
    displayCards.forEach((card, index) => {
      fragment.appendChild(this.createListCardElement(card, index));
    });
    container.appendChild(fragment);

    return container;
  }

  /**
   * Create a single card element in list/row format
   * @param {Object} card - Card object
   * @param {number} index - Card index
   * @returns {HTMLElement} Card element
   */
  createListCardElement(card, index) {
    const cardName = card.card_name || card.name || 'Unknown Card';
    const cardNumber = card.cardNumber || card.card_number || card.ext_number || '';
    const cardRarity = card.rarity || card.displayRarity || card.card_rarity || '';
    const setCode = card.set || card.set_code || card.setInfo?.setCode || '';
    const tcgLow = this.formatPrice(
      card.tcgLow ||
      card.tcg_low ||
      card.tcg_price ||
      card.tcg_low_price ||
      card.low_price
    );
    const tcgMarket = this.formatPrice(
      card.tcgMarket ||
      card.tcg_market ||
      card.tcg_market_price ||
      card.market_price ||
      card.tcgMarketPrice ||
      card.marketPrice
    );
    const estPrice = this.formatPrice(card.price);
    const quantity = card.quantity > 1 ? `x${card.quantity}` : '';
    const rarityClass = this.getRarityClass(cardRarity);
    const cardImage = this.getSafeImage(card.imageUrl || card.image_url || card.image_url_small);

    const cardEl = document.createElement('div');
    cardEl.className = 'session-card';
    cardEl.dataset.cardIndex = index;

    // Image Container
    const imageContainer = document.createElement('div');
    imageContainer.className = 'card-image-container';
    const img = document.createElement('img');
    img.className = 'card-image';
    img.src = cardImage;
    img.alt = cardName;
    img.loading = 'lazy';
    img.onerror = () => { img.onerror = null; img.src = this.getDefaultCardImage(); };
    imageContainer.appendChild(img);
    cardEl.appendChild(imageContainer);

    // Card Info
    const infoDiv = document.createElement('div');
    infoDiv.className = 'card-info';

    const nameDiv = document.createElement('div');
    nameDiv.className = 'card-name';
    nameDiv.textContent = cardName;
    if (quantity) {
      const qtySpan = document.createElement('span');
      qtySpan.className = 'card-quantity-badge';
      qtySpan.textContent = quantity;
      nameDiv.appendChild(document.createTextNode(' '));
      nameDiv.appendChild(qtySpan);
    }
    infoDiv.appendChild(nameDiv);

    const detailsDiv = document.createElement('div');
    detailsDiv.className = 'card-details';

    if (setCode || cardNumber) {
      const numSpan = document.createElement('span');
      numSpan.className = 'card-number';
      numSpan.textContent = setCode ? (cardNumber ? `${setCode}-${cardNumber}` : setCode) : cardNumber;
      detailsDiv.appendChild(numSpan);
    }

    if (cardRarity) {
      const raritySpan = document.createElement('span');
      raritySpan.className = `card-rarity-badge ${rarityClass}`;
      raritySpan.textContent = cardRarity;
      detailsDiv.appendChild(raritySpan);
    }
    infoDiv.appendChild(detailsDiv);
    cardEl.appendChild(infoDiv);

    // Price Info
    const priceDiv = document.createElement('div');
    priceDiv.className = 'card-price';

    if (tcgLow) {
      const row = document.createElement('div');
      row.className = 'price-row';
      row.innerHTML = `<span class="price-label">Low:</span> <span class="price-value">${tcgLow}</span>`;
      priceDiv.appendChild(row);
    }

    if (tcgMarket) {
      const row = document.createElement('div');
      row.className = 'price-row';
      row.innerHTML = `<span class="price-label">Market:</span> <span class="price-value">${tcgMarket}</span>`;
      priceDiv.appendChild(row);
    } else if (estPrice) {
      const row = document.createElement('div');
      row.className = 'price-row';
      row.innerHTML = `<span class="price-label">Est:</span> <span class="price-value">${estPrice}</span>`;
      priceDiv.appendChild(row);
    }
    cardEl.appendChild(priceDiv);

    // Actions
    if (this.showRemoveButton) {
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'card-actions';
      const btn = document.createElement('button');
      btn.className = 'card-remove-btn';
      btn.dataset.removeIndex = index;
      btn.title = 'Remove card';
      btn.setAttribute('aria-label', `Remove ${cardName}`);
      btn.innerHTML = '<i data-lucide="trash-2" class="icon-sm"></i>';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleRemoveCard(index);
      });
      actionsDiv.appendChild(btn);
      cardEl.appendChild(actionsDiv);
    }

    return cardEl;
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
   * Create a single card element in grid/tile format
   * @param {Object} card - Card object
   * @param {number} index - Card index
   * @returns {HTMLElement} Card element
   */
  createGridCardElement(card, index) {
    const cardName = card.name || 'Unknown Card';
    const cardSet = card.set || '';
    const cardNumber = card.cardNumber || '';
    const cardRarity = card.rarity || '';
    const tcgLow = this.formatPrice(card.tcgLow || card.tcg_price);
    const tcgMarket = this.formatPrice(card.tcgMarket || card.tcg_market_price);
    const quantity = card.quantity > 1 ? `x${card.quantity}` : '';
    const rarityClass = this.getRarityClass(cardRarity);
    const cardImage = this.getSafeImage(card.imageUrl || card.image_url || card.image_url_small);

    const cardEl = document.createElement('div');
    cardEl.className = 'ygo-card';
    cardEl.dataset.cardIndex = index;
    cardEl.style.setProperty('--card-size', `${this.cardSize}px`);

    if (this.showRemoveButton) {
      const btn = document.createElement('button');
      btn.className = 'ygo-card-remove-btn';
      btn.dataset.removeIndex = index;
      btn.title = 'Remove card';
      btn.setAttribute('aria-label', `Remove ${cardName}`);
      btn.innerHTML = '<i data-lucide="X" class="icon-sm"></i>';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleRemoveCard(index);
      });
      cardEl.appendChild(btn);
    }

    if (quantity) {
      const qtySpan = document.createElement('span');
      qtySpan.className = 'ygo-card-quantity';
      qtySpan.textContent = quantity;
      cardEl.appendChild(qtySpan);
    }

    const imgContainer = document.createElement('div');
    imgContainer.className = 'ygo-card-image-container';
    const img = document.createElement('img');
    img.src = cardImage;
    img.alt = cardName;
    img.className = 'ygo-card-image';
    img.loading = 'lazy';
    img.onerror = () => { img.onerror = null; img.src = this.getDefaultCardImage(); };
    imgContainer.appendChild(img);
    cardEl.appendChild(imgContainer);

    const contentDiv = document.createElement('div');
    contentDiv.className = 'ygo-card-content';

    const headerDiv = document.createElement('div');
    headerDiv.className = 'ygo-card-header';
    const nameDiv = document.createElement('div');
    nameDiv.className = 'ygo-card-name';
    nameDiv.title = cardName;
    nameDiv.textContent = cardName;
    headerDiv.appendChild(nameDiv);

    if (cardNumber) {
      const numDiv = document.createElement('div');
      numDiv.className = 'ygo-card-number';
      numDiv.textContent = `${cardSet ? `${cardSet}-` : ''}${cardNumber}`;
      headerDiv.appendChild(numDiv);
    }
    contentDiv.appendChild(headerDiv);

    if (cardRarity) {
      const rarityDiv = document.createElement('div');
      rarityDiv.className = 'ygo-card-rarity';
      const raritySpan = document.createElement('span');
      raritySpan.className = `ygo-rarity-badge ${rarityClass}`;
      raritySpan.textContent = cardRarity;
      rarityDiv.appendChild(raritySpan);
      contentDiv.appendChild(rarityDiv);
    }

    const pricesDiv = document.createElement('div');
    pricesDiv.className = 'ygo-card-prices';

    if (tcgLow) {
      const row = document.createElement('div');
      row.className = 'ygo-price-row';
      row.innerHTML = `<span class="ygo-price-label">Low:</span> <span class="ygo-price-value value-low">${tcgLow}</span>`;
      pricesDiv.appendChild(row);
    }

    if (tcgMarket) {
      const row = document.createElement('div');
      row.className = 'ygo-price-row';
      row.innerHTML = `<span class="ygo-price-label">Mkt:</span> <span class="ygo-price-value value-market">${tcgMarket}</span>`;
      pricesDiv.appendChild(row);
    }
    contentDiv.appendChild(pricesDiv);
    cardEl.appendChild(contentDiv);

    return cardEl;
  }

  /**
   * Render empty state
   * @returns {HTMLElement} Empty state element
   */
  renderEmptyState() {
    const container = document.createElement('div');
    container.className = 'empty-state text-center py-16';
    container.innerHTML = `
        <div class="empty-icon mb-4">
          <i data-lucide="Package" class="w-16 h-16 text-neutral-600 mx-auto"></i>
        </div>
        <h3 class="text-lg font-medium text-neutral-400 mb-2">No cards in session</h3>
        <p class="text-sm text-neutral-500">Start a pack ripper session and use voice recognition to add cards.</p>
    `;
    return container;
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
   * Create and return the card grid element
   * @returns {HTMLElement} The card grid element
   */
  create() {
    this.element = this.render();

    // Initialize Lucide icons
    if (window.lucide) {
      window.lucide.createIcons({ root: this.element });
    }

    return this.element;
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
      this.consolidated = options.consolidated === true;
    }
    if (options.cardSize !== undefined) {
      this.cardSize = options.cardSize;
    }
    if (options.showRemoveButton !== undefined) {
      this.showRemoveButton = options.showRemoveButton;
    }
    if (options.viewMode !== undefined) {
      this.viewMode = options.viewMode;
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
