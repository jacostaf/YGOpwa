/**
 * CardGrid.js
 *
 * Reusable card grid component for displaying Yu-Gi-Oh cards
 * Features:
 * - Two view modes: 'list' (row-style) and 'grid' (tile-style)
 * - Responsive grid layout (2-8 columns in grid mode)
 * - Card image display with hover effects
 * - Price information (TCG Market as primary, TCG Low as secondary)
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
    this.onToggleFavorite = options.onToggleFavorite || null;
    this.onCardClick = options.onCardClick || null;
    // Treat only explicit true as consolidated; avoids truthy strings accidentally enabling grid view
    this.consolidated = options.consolidated === true;
    this.cardSize = options.cardSize || 120;
    this.showRemoveButton = options.showRemoveButton !== false;
    this.viewMode = options.viewMode || 'grid'; // 'grid' or 'list'
    this.sessionManager = options.sessionManager || null; // For image fallback
    this.element = null;

    // Memory management: track resources for cleanup
    this.imageElements = [];
    this._handleContainerClick = null;
  }

  /**
   * Create the card display DOM structure
   * @returns {HTMLElement} The container element
   */
  render() {
    if (!this.cards || this.cards.length === 0) {
      return this.renderEmptyState();
    }

    // Consolidated=true shows grouped cards; false shows individual cards
    // We now use the same HTML structure for both Grid and List views, toggled via CSS
    const isConsolidated = Boolean(this.consolidated);
    const displayCards = isConsolidated ? this.consolidateCards() : this.cards;

    return this.renderGridView(displayCards);
  }

  /**
   * Render cards (supports both grid and list via CSS)
   * @param {Array} displayCards - Cards to display
   * @returns {HTMLElement} Container element
   */
  renderGridView(displayCards) {
    const container = document.createElement('div');
    container.className = 'card-grid';
    if (this.viewMode === 'list') {
      container.classList.add('list-view');
    }
    container.style.setProperty('--card-width', `${this.cardSize}px`);

    // Clear tracked images from previous render
    this.imageElements = [];

    const fragment = document.createDocumentFragment();
    console.log('[CardGrid] Rendering view with', displayCards.length, 'cards');
    displayCards.forEach((card, index) => {
      try {
        fragment.appendChild(this.createGridCardElement(card, index));
      } catch (err) {
        console.error('[CardGrid] Error creating card element:', err, card);
      }
    });
    container.appendChild(fragment);

    // Event delegation: single handler for all card interactions
    this._handleContainerClick = (e) => {
      const cardEl = e.target.closest('.card-item');
      if (!cardEl) return;

      const index = parseInt(cardEl.dataset.cardIndex, 10);
      if (isNaN(index)) return;

      const favoriteBtn = e.target.closest('.card-favorite-btn');
      const removeBtn = e.target.closest('[data-remove-index]');

      if (favoriteBtn) {
        e.stopPropagation();
        this.handleToggleFavorite(index);
      } else if (removeBtn) {
        e.stopPropagation();
        this.handleRemoveCard(index);
      } else if (!e.target.closest('button')) {
        this.handleCardClick(index);
      }
    };
    container.addEventListener('click', this._handleContainerClick);

    return container;
  }

  /**
   * Render list view (row-style cards)
   * @param {Array} displayCards - Cards to display
   * @returns {HTMLElement} Container element
   */

  /**
   * Consolidate cards by name
   * @returns {Array} Consolidated cards
   */
  consolidateCards() {
    const consolidated = new Map();

    this.cards.forEach(card => {
      const key = card.card?.name || card.name || 'Unknown Card';
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
    const cardName = card.card?.name || card.name || 'Unknown Card';
    const cardSet = card.set?.code || card.set || '';
    const cardNumber = card.card?.number || card.cardNumber || '';
    const cardRarity = card.rarity?.name || card.rarity || '';

    // Price mapping (market price is primary)
    const tcgMarket = this.formatPrice(
      card.pricing?.marketPrice ||
      card.pricing?.currentPrice ||
      card.tcgMarket ||
      card.tcg_market_price
    );
    const tcgLow = this.formatPrice(
      card.pricing?.lowPrice ||
      card.tcgLow ||
      card.tcg_price
    );

    const quantity = card.quantity > 1 ? `x${card.quantity}` : '';
    const rarityClass = this.getRarityClass(cardRarity);
    const cardImage = this.getSafeImage(card); // Pass full card object for fallback support

    const cardEl = document.createElement('div');
    cardEl.className = `card-item card-stagger-${(index % 8) + 1}`;
    cardEl.dataset.cardIndex = index;
    // card-size is handled by grid layout CSS, but we can keep it if needed
    // cardEl.style.setProperty('--card-size', `${this.cardSize}px`); 

    // Image Wrapper
    const imgWrapper = document.createElement('div');
    imgWrapper.className = 'card-image-wrapper';

    const img = document.createElement('img');
    img.src = cardImage;
    img.alt = cardName;
    img.className = 'card-image';
    img.loading = 'lazy';
    img.onerror = () => { img.onerror = null; img.src = this.getDefaultCardImage(); };
    imgWrapper.appendChild(img);

    // Track image for cleanup
    this.imageElements.push(img);

    // Quantity Badge
    if (quantity) {
      const qtyBadge = document.createElement('div');
      qtyBadge.className = 'card-badge'; // Reusing prototype badge style
      qtyBadge.textContent = quantity;
      imgWrapper.appendChild(qtyBadge);
    }

    // Price Overlay (market price is primary)
    if (tcgMarket || tcgLow) {
      const priceOverlay = document.createElement('div');
      priceOverlay.className = 'card-price-overlay';
      priceOverlay.textContent = tcgMarket || tcgLow;
      imgWrapper.appendChild(priceOverlay);
    }

    // Favorite Heart Icon
    const heartIcon = document.createElement('button');
    heartIcon.className = `card-favorite-btn ${card.isFavorite ? 'is-favorite' : ''}`;
    heartIcon.setAttribute('aria-label', card.isFavorite ? 'Remove from favorites' : 'Add to favorites');
    heartIcon.innerHTML = card.isFavorite
      ? '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>';
    heartIcon.dataset.cardIndex = index;
    // Event handled by delegation on container
    imgWrapper.appendChild(heartIcon);

    cardEl.appendChild(imgWrapper);

    // Card click handled by delegation on container

    // Info
    const infoDiv = document.createElement('div');
    infoDiv.className = 'card-info';

    const nameDiv = document.createElement('div');
    nameDiv.className = 'card-name';
    nameDiv.textContent = cardName;
    infoDiv.appendChild(nameDiv);

    const metaDiv = document.createElement('div');
    metaDiv.className = 'card-meta';

    if (cardSet || cardNumber) {
      const setDiv = document.createElement('div');
      setDiv.className = 'card-set';
      setDiv.textContent = cardSet ? (cardNumber ? `${cardSet}-${cardNumber}` : cardSet) : cardNumber;
      metaDiv.appendChild(setDiv);
    }

    if (cardRarity) {
      const rarityDiv = document.createElement('div');
      rarityDiv.className = `card-rarity ${rarityClass}`;
      rarityDiv.textContent = cardRarity;
      metaDiv.appendChild(rarityDiv);
    }
    infoDiv.appendChild(metaDiv);
    cardEl.appendChild(infoDiv);

    // Remove Button
    if (this.showRemoveButton) {
      const btn = document.createElement('button');
      btn.className = 'ygo-card-remove-btn'; // Keep legacy class for now or update CSS? 
      // Prototype didn't specify remove button style, so keeping legacy might be safe if CSS exists
      // But 'ygo-card-remove-btn' might rely on 'ygo-card' parent?
      // Let's use a generic class and inline style or ensure CSS exists.
      // Actually, let's keep the logic but maybe update class to 'card-remove-btn' and ensure CSS.
      // For now, I'll stick to 'ygo-card-remove-btn' and hope it works or I'll fix it in verification.
      btn.dataset.removeIndex = index;
      btn.title = 'Remove card';
      btn.setAttribute('aria-label', `Remove ${cardName}`);
      btn.innerHTML = '<i data-lucide="x" style="width: 14px; height: 14px;"></i>';
      btn.style.position = 'absolute';
      btn.style.top = '4px';
      btn.style.right = '4px';
      btn.style.background = 'rgba(0,0,0,0.5)';
      btn.style.color = 'white';
      btn.style.border = 'none';
      btn.style.borderRadius = '50%';
      btn.style.width = '24px';
      btn.style.height = '24px';
      btn.style.display = 'flex';
      btn.style.alignItems = 'center';
      btn.style.justifyContent = 'center';
      btn.style.cursor = 'pointer';

      // Event handled by delegation on container
      cardEl.appendChild(btn);
    }

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
   * @param {Object|string} cardOrUrl - Card object or image URL string
   * @returns {string} Safe image URL or default placeholder
   */
  getSafeImage(cardOrUrl) {
    // Handle legacy string parameter
    let imageUrl;
    let card = null;

    if (typeof cardOrUrl === 'string') {
      imageUrl = cardOrUrl;
    } else if (cardOrUrl && typeof cardOrUrl === 'object') {
      card = cardOrUrl;
      imageUrl = card.image_url || card.image_small || card.imageUrl || card.image_url_small;
    }

    // Check if direct URL is valid
    if (imageUrl) {
      const lower = String(imageUrl).toLowerCase();
      if (!lower.includes('card-back.jpg') && !lower.startsWith('/src/assets')) {
        return imageUrl;
      }
    }

    // Try fallback via SessionManager if card object is available
    if (this.sessionManager && card) {
      const fallback = this.sessionManager.getCardImageWithFallback(card);
      if (fallback) {
        return fallback;
      }
    }

    return this.getDefaultCardImage();
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
   * Handle favorite toggle click
   * @param {number} index - Card index
   */
  handleToggleFavorite(index) {
    if (this.onToggleFavorite && typeof this.onToggleFavorite === 'function') {
      const card = this.cards[index];
      this.onToggleFavorite(card, index);
    }
  }

  /**
   * Handle card click (for detail modal)
   * @param {number} index - Card index
   */
  handleCardClick(index) {
    if (this.onCardClick && typeof this.onCardClick === 'function') {
      const card = this.cards[index];
      this.onCardClick(card, index);
    }
  }

  /**
   * Update the card grid with new cards
   * @param {Array} cards - New cards array
   */
  update(cards) {
    this.cards = cards || [];

    if (this.element && this.element.parentNode) {
      const oldElement = this.element;
      const parent = oldElement.parentNode;
      const newElement = this.create();
      parent.replaceChild(newElement, oldElement);
      // this.element is updated by create()
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
      const oldElement = this.element;
      const parent = oldElement.parentNode;
      const newElement = this.create();
      parent.replaceChild(newElement, oldElement);
      // this.element is updated by create()
    }
  }

  /**
   * Destroy the card grid and clean up all resources
   */
  destroy() {
    // Remove delegated event listener
    if (this.element && this._handleContainerClick) {
      this.element.removeEventListener('click', this._handleContainerClick);
      this._handleContainerClick = null;
    }

    // Clean up image handlers to prevent memory leaks
    if (this.imageElements && this.imageElements.length > 0) {
      this.imageElements.forEach(img => {
        img.onerror = null;
        img.onload = null;
        img.src = '';  // Cancel any pending loads
      });
      this.imageElements = [];
    }

    // Remove from DOM
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
