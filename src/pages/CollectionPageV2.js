/**
 * CollectionPage.js
 * Page for viewing and managing the complete card collection
 * Includes filtering, sorting, statistics, and multiple view modes
 */

console.log('CollectionPageV2 module loaded (TIMESTAMP: ' + Date.now() + ')');

import { CollectionManager } from '../services/CollectionManager.js';
import { authService } from '../services/authService.js';
import CardGrid from '../components/CardGrid.js';
import {
  fetchCollectionItems,
  fetchCollectionSummary,
  upsertCollectionItem,
  removeCollectionQuantity,
  resolveCardVariantId,
} from '../services/collectionsService.js';
import {
  fetchPackEventSummaries,
  fetchTopPackPull,
} from '../services/packEventsService.js';
import {
  fetchActivePlan,
  evaluateCollectionQuota,
} from '../services/subscriptionService.js';
import { filterByCardType } from '../config/FilterSettings.js';

export class CollectionPage {
  constructor(app) {
    this.app = app;
    this.container = null;
    this.collectionManager = null;
    this.cardGrid = null;

    // State
    this.state = {
      cards: [],
      filteredCards: [],
      sortedCards: [],
      stats: null,
      summary: null,
      error: null,
      isLoading: false,
      isMutating: false,
      filters: {
        set: 'all',
        rarity: 'all',
        cardType: 'all', // Monster/Spell/Trap filter
        search: '',
        dateFrom: null,
        dateTo: null
      },
      sort: {
        by: 'date',
        order: 'desc'
      },
      viewMode: 'grid', // 'grid' or 'list'
      cardSize: 150,
      pack: {
        eventsAll: [],
        events: [],
        stats: null,
        bestPull: null,
        error: null,
        isLoading: true,
        filters: {
          profitableOnly: false,
          source: 'all'
        }
      },
      subscription: {
        plan: null,
        error: null,
        isLoading: true,
        quota: null
      }
    };

    this.currencyFormatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    this.numberFormatter = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });

    this.dateFormatter = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    // Bound handlers
    this.boundHandlers = {
      handleFilterChange: this.handleFilterChange.bind(this),
      handleSortChange: this.handleSortChange.bind(this),
      handleViewToggle: this.handleViewToggle.bind(this),
      handleRefresh: this.handleRefresh.bind(this),
      handleExport: this.handleExport.bind(this),
      handleCardRemove: this.handleCardRemove.bind(this),
      handleSearchInput: this.handleSearchInput.bind(this),
      handleCardSizeChange: this.handleCardSizeChange.bind(this),
      handleAddCard: this.handleAddCard.bind(this),
      handlePackProfitToggle: this.handlePackProfitToggle.bind(this),
      handlePackSourceChange: this.handlePackSourceChange.bind(this),
      handlePackRefresh: this.handlePackRefresh.bind(this),
      handleCreateCollection: this.handleCreateCollection.bind(this),
      handleCondensedToggle: this.handleCondensedToggle.bind(this),
      handleToggleFavorite: this.handleToggleFavorite.bind(this),
      handleCardClick: this.handleCardClick.bind(this)
    };

    this.optimisticRollbacks = [];

    // Subscription moved to mount() where collectionManager is initialized
  }

  /**
   * Handle price updates from CollectionManager
   */
  async handlePriceUpdate(data) {
    console.log('[CollectionPage] Received price update:', data);
    // Reload data silently to update prices
    await this.loadData({ silent: true });
  }

  /**
   * Handle condensed view toggle
   */
  handleCondensedToggle(e) {
    this.state.consolidated = e.target.checked;
    this.updateGridView();
  }

  /**
   * Handle favorite toggle
   * @param {Object} card - Card object
   * @param {number} index - Card index
   */
  handleToggleFavorite(card, index) {
    try {
      const newFavoriteState = !card.isFavorite;

      // Update card state
      card.isFavorite = newFavoriteState;

      // Update the card in state arrays
      const cardId = card.id || card.cardVariantId;
      this.state.cards.forEach(c => {
        if ((c.id || c.cardVariantId) === cardId) {
          c.isFavorite = newFavoriteState;
        }
      });

      // Persist to localStorage
      const favoritesKey = 'voxrip_favorites';
      const favorites = JSON.parse(localStorage.getItem(favoritesKey) || '{}');
      if (newFavoriteState) {
        favorites[cardId] = true;
      } else {
        delete favorites[cardId];
      }
      localStorage.setItem(favoritesKey, JSON.stringify(favorites));

      // Update CardGrid
      if (this.cardGrid) {
        this.cardGrid.update(this.state.sortedCards);
      }

      // Update sidebar favorites count
      const favoritesCount = this.state.cards.filter(c => c.isFavorite).length;
      const sidebar = this.app?.sidebar || window.sidebar;
      if (sidebar) {
        sidebar.setContext('collection', {
          ...sidebar.contextData,
          favoritesCount
        });
      }

      // Show toast
      if (this.app?.showToast) {
        this.app.showToast(
          newFavoriteState ? 'Added to favorites' : 'Removed from favorites',
          'success'
        );
      }

    } catch (error) {
      console.error('[CollectionPage] Error toggling favorite:', error);
    }
  }

  /**
   * Handle card click (open detail modal)
   * @param {Object} card - Card object
   * @param {number} index - Card index
   */
  handleCardClick(card, index) {
    try {
      // Access UIManager from window.app (Router passes itself as 'app', not the actual app)
      const uiManager = window.app?.uiManager;
      if (uiManager && typeof uiManager.showCardDetailModal === 'function') {
        uiManager.showCardDetailModal(card, {
          onToggleFavorite: () => this.handleToggleFavorite(card, index)
        });
      } else {
        console.warn('[CollectionPage] UIManager.showCardDetailModal not available. window.app:', !!window.app, 'uiManager:', !!window.app?.uiManager);
      }
    } catch (error) {
      console.error('[CollectionPage] Error opening card detail:', error);
    }
  }

  /**
   * Load user collections and update sidebar
   */
  async loadUserCollections() {
    try {
      // Force cache invalidation to ensure fresh data
      if (this.collectionManager) {
        this.collectionManager.invalidateCache();
      }

      const collections = await this.collectionManager.getUserCollections();
      console.log('[CollectionPage] Loaded collections:', collections.length, collections.map(c => c.name));

      // Enrich collections with card counts from current state
      const enrichedCollections = collections.map(col => {
        const collectionCards = this.state.cards.filter(c =>
          String(c.collectionId) === String(col.id)
        );
        const cardCount = collectionCards.reduce((sum, card) => sum + (Number(card.quantity) || 1), 0);
        return { ...col, count: cardCount };
      });

      // Update sidebar with collections data - try multiple references
      const sidebar = this._sidebarRef || this.app?.sidebar || window.sidebar;
      console.log('[CollectionPage] Sidebar reference:', {
        _sidebarRef: !!this._sidebarRef,
        appSidebar: !!this.app?.sidebar,
        windowSidebar: !!window.sidebar,
        resolved: !!sidebar
      });

      if (sidebar) {
        console.log('[CollectionPage] Updating sidebar with', enrichedCollections.length, 'collections');
        sidebar.setContext('collection', {
          collections: enrichedCollections,
          activeCollection: this.state.filters.collectionId || 'all',
          totalCards: this.state.cards.length,
          favoritesCount: this.state.cards.filter(c => c.isFavorite).length
        });
      } else {
        console.error('[CollectionPage] No sidebar reference found! Cannot update sidebar.');
      }

      return collections;
    } catch (error) {
      console.error('Error loading collections:', error);
      return [];
    }
  }

  /**
   * Handle create collection
   */
  async handleCreateCollection() {
    try {
      console.log('[CollectionPage] handleCreateCollection START');
      const name = prompt('Enter collection name:');
      if (!name?.trim()) {
        console.log('[CollectionPage] handleCreateCollection cancelled - no name');
        return;
      }

      const description = prompt('Enter description (optional):');

      this.toggleLoadingIndicator(true);
      console.log('[CollectionPage] Creating collection:', name);
      const newCollection = await this.collectionManager.createCollection(name.trim(), description?.trim() || '');
      console.log('[CollectionPage] createCollection result:', newCollection);

      if (newCollection) {
        this.app?.showToast?.(`Collection "${name}" created!`, 'success');
        // Update sidebar with new collection (don't need full loadData for empty collection)
        console.log('[CollectionPage] Calling loadUserCollections...');
        await this.loadUserCollections();
        console.log('[CollectionPage] loadUserCollections completed, sidebar should be updated');
      }
    } catch (error) {
      console.error('[CollectionPage] Error creating collection:', error);
      this.app?.showToast?.('Failed to create collection', 'error');
    } finally {
      this.toggleLoadingIndicator(false);
      console.log('[CollectionPage] handleCreateCollection END');
    }
  }

  /**
   * Handle delete collection
   * @param {string} collectionId - Collection ID to delete
   * @param {string} name - Collection name for display
   * @param {boolean} skipConfirm - Skip confirmation dialog (already confirmed by caller)
   */
  async handleDeleteCollection(collectionId, name, skipConfirm = false) {
    try {
      console.log('[CollectionPage] handleDeleteCollection START:', collectionId, name);
      // Skip confirmation if caller already confirmed (e.g., sidebar)
      if (!skipConfirm && !confirm(`Are you sure you want to delete the collection "${name}"? This will also remove all cards inside it.`)) {
        console.log('[CollectionPage] handleDeleteCollection cancelled by user');
        return;
      }

      this.toggleLoadingIndicator(true);
      console.log('[CollectionPage] Calling collectionManager.deleteCollection...');
      await this.collectionManager.deleteCollection(collectionId);
      console.log('[CollectionPage] deleteCollection completed successfully');

      this.app?.showToast?.(`Collection "${name}" deleted`, 'success');

      // If we were viewing this collection, switch back to all cards
      if (this.state.filters.collectionId === collectionId) {
        this.state.filters.collectionId = null;
      }

      // Reload cards (to remove deleted collection's cards) and update sidebar
      console.log('[CollectionPage] Calling loadData({ silent: true })...');
      await this.loadData({ silent: true });
      console.log('[CollectionPage] loadData completed, sidebar should be updated');

    } catch (error) {
      console.error('[CollectionPage] Error deleting collection:', error);
      this.app?.showToast?.('Failed to delete collection', 'error');
    } finally {
      this.toggleLoadingIndicator(false);
      console.log('[CollectionPage] handleDeleteCollection END');
    }
  }

  /**
   * Render the page HTML
   * @returns {String} HTML string
   */
  render() {
    return `
      <div class="collection-page">
        <!-- Header -->
        <div class="top-header">
            <div class="header-title">
                <h1 id="collectionTitle">Collection</h1>
            </div>
            <div class="header-actions">
                <button class="btn-secondary" id="exportCollectionBtn">
                    <i data-lucide="download" style="width: 16px;"></i>
                    Export
                </button>
                <button class="btn-primary" id="addCardBtn">
                    <i data-lucide="plus" style="width: 18px;"></i>
                    Add Card
                </button>
            </div>
        </div>

        <!-- Stats Ribbon -->
        <div class="stats-ribbon">
            <div class="stat-item">
                <div class="stat-label">Total Value</div>
                <div class="stat-value" id="statTotalValue">$0.00</div>
                <div class="stat-trend" id="statValueTrend">
                    <i data-lucide="trending-up" style="width: 12px;"></i>
                    <span>+0.0%</span>
                </div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Total Cards</div>
                <div class="stat-value" id="statTotalCards">0</div>
                <div class="stat-trend" id="statCardsTrend">
                    +0 this week
                </div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Unique Cards</div>
                <div class="stat-value" id="statUniqueCards">0</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">Top Rarity</div>
                <div class="stat-value" id="statTopRarity">-</div>
            </div>
        </div>

        <!-- Toolbar -->
            <div class="toolbar">
                <div class="search-wrapper">
                    <i data-lucide="search"></i>
                    <input type="text" id="searchInput" class="search-input" placeholder="Search by name, set, or description...">
                </div>
                
                <div class="filter-chips">
                    <div class="chip active" data-filter="all">All</div>
                    <div class="chip" data-filter="monster">Monsters</div>
                    <div class="chip" data-filter="spell">Spells</div>
                    <div class="chip" data-filter="trap">Traps</div>
                </div>

                <div style="margin-left: auto; display: flex; gap: 8px;">
                    <button class="btn-secondary" id="filterBtn" style="padding: 8px;">
                        <i data-lucide="filter" style="width: 16px;"></i>
                    </button>
                    <button class="btn-secondary view-btn active" data-view="grid" style="padding: 8px;">
                        <i data-lucide="layout-grid" style="width: 16px;"></i>
                    </button>
                    <button class="btn-secondary view-btn" data-view="list" style="padding: 8px;">
                        <i data-lucide="list" style="width: 16px;"></i>
                    </button>
                </div>
            </div>

            <!-- Collection Display -->
            <div class="collection-display">
              <div id="cardGrid"></div>
              <div id="emptyState" class="empty-state hidden">
                <i data-lucide="search-x"></i>
                <h3>No cards found</h3>
                <p>Try adjusting your search or filters</p>
              </div>
              <div id="loadingState" class="loading-state hidden">
                <div class="loading-spinner"></div>
              </div>
            </div>
      </div>
    `;
  }

  /**
   * Mount the page
   * @param {HTMLElement} container - Container element
   */
  async mount(container) {
    try {
      this.isMounted = true;
      this.container = container;
      this.container.innerHTML = this.render();

      // Initialize CollectionManager (Supabase-backed, session fallback)
      this.collectionManager = new CollectionManager(this.app?.sessionManager || null);

      // Subscribe to price updates
      this.collectionManager.subscribe('priceUpdate', this.handlePriceUpdate.bind(this));

      // Mount header actions
      this.mountHeaderActions();

      // Set Full Width Layout
      document.body.classList.add('full-width-layout');

      // Update Sidebar Context
      const sidebar = this.app?.sidebar || window.sidebar;
      if (sidebar) {
        console.log('CollectionPage: Setting sidebar context to collection');
        sidebar.setContext('collection', {
          collections: [],
          activeCollection: this.state.filters.collectionId || 'all'
        });

        // Listen for sidebar events on sidebar.container (not this.container - they're siblings in DOM)
        this.boundHandlers.handleSidebarSelect = (e) => {
          const { collectionId } = e.detail;
          console.log('[CollectionPage] Sidebar collection selected:', collectionId);
          const newFilterValue = (collectionId === 'all' || !collectionId) ? null : collectionId;
          console.log('[CollectionPage] Setting filter collectionId to:', newFilterValue);
          this.state.filters.collectionId = newFilterValue;
          this.applyFiltersAndSort();
          console.log('[CollectionPage] After applyFiltersAndSort, sortedCards:', this.state.sortedCards.length);
          this.updateDisplay();
          console.log('[CollectionPage] updateDisplay complete');

          // Update page title based on selection
          const titleEl = this.container.querySelector('#collectionTitle');
          if (titleEl) {
            if (collectionId === 'all' || !collectionId) {
              titleEl.textContent = 'All Cards';
            } else if (collectionId === 'favorites') {
              titleEl.textContent = 'Favorites';
            } else {
              // Find collection name from sidebar context (use stored ref)
              const sidebarRef = this._sidebarRef || this.app?.sidebar;
              const collection = sidebarRef?.contextData?.collections?.find(c => String(c.id) === String(collectionId));
              titleEl.textContent = collection?.name || 'Collection';
            }
          }
        };

        this.boundHandlers.handleSidebarCreate = () => {
          console.log('[CollectionPage] Sidebar create collection clicked');
          this.handleCreateCollection();
        };

        this.boundHandlers.handleSidebarDelete = async (e) => {
          const { collectionId, collectionName } = e.detail;
          console.log('[CollectionPage] Sidebar delete collection:', collectionId, collectionName);
          // Skip confirmation since sidebar already confirmed
          await this.handleDeleteCollection(collectionId, collectionName, true);
        };

        sidebar.container.addEventListener('collection:select', this.boundHandlers.handleSidebarSelect);
        sidebar.container.addEventListener('collection:create', this.boundHandlers.handleSidebarCreate);
        sidebar.container.addEventListener('collection:delete', this.boundHandlers.handleSidebarDelete);

        // Store sidebar reference for cleanup
        this._sidebarRef = sidebar;
      } else {
        console.warn('CollectionPage: Sidebar not found');
      }

      // Listen for auth changes to reload data
      this.boundHandlers.handleAuthChange = async (e) => {
        const { user } = e.detail;
        console.log('[CollectionPage] Auth changed, reloading data...', user?.email || 'Guest');
        await this.loadData({ silent: true });
      };
      window.addEventListener('auth:changed', this.boundHandlers.handleAuthChange);

      // Attach event listeners immediately
      this.attachEvents();

      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }

      // Load initial data from Supabase - NON-BLOCKING
      this.loadData({ initial: true }).catch(err => {
        console.error('CollectionPage: Initial data load failed', err);
      });

      // Load pack insights in background (don't block navigation)
      this.loadPackInsights({ initial: true }).catch(err => {
        console.warn('CollectionPage: Background pack insights load failed', err);
      });

    } catch (error) {
      console.error('CollectionPage: Error mounting', error);
      this.showError('Failed to load collection page');
    }
  }

  /**
   * Mount header actions (No longer used as buttons are in top-header)
   */
  mountHeaderActions() {
    // Buttons are now part of the render() template for better layout control
    // We just need to ensure icons are initialized
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  /**
   * Unmount header actions
   */
  unmountHeaderActions() {
    // No-op
  }

  /**
   * Unmount the page
   */
  unmount() {
    try {
      this.isMounted = false;
      // Cleanup auth listener
      if (this.boundHandlers.handleAuthChange) {
        window.removeEventListener('auth:changed', this.boundHandlers.handleAuthChange);
      }

      // Cleanup CardGrid
      if (this.cardGrid) {
        this.cardGrid.destroy?.();
        this.cardGrid = null;
      }

      // Remove event listeners
      this.removeEvents();

      // Unmount header actions
      this.unmountHeaderActions();

      // Clean up sidebar event listeners and reset context
      const sidebar = this._sidebarRef || this.app?.sidebar || window.sidebar;
      if (sidebar && sidebar.container) {
        // Remove event listeners
        if (this.boundHandlers.handleSidebarSelect) {
          sidebar.container.removeEventListener('collection:select', this.boundHandlers.handleSidebarSelect);
        }
        if (this.boundHandlers.handleSidebarCreate) {
          sidebar.container.removeEventListener('collection:create', this.boundHandlers.handleSidebarCreate);
        }
        if (this.boundHandlers.handleSidebarDelete) {
          sidebar.container.removeEventListener('collection:delete', this.boundHandlers.handleSidebarDelete);
        }

        sidebar.setContext('default');
        // Reset forced styles
        sidebar.container.style.backgroundColor = '';
        sidebar.container.style.borderRightColor = '';
      }
      this._sidebarRef = null;

      // Reset Full Width Layout
      document.body.classList.remove('full-width-layout');

      // Clear container
      if (this.container) {
        this.container.innerHTML = '';
      }
    } catch (error) {
      console.error('CollectionPage: Error unmounting', error);
    }
  }

  /**
   * Load collection data
   */
  async loadData(options = {}) {
    const { initial = false, silent = false } = options;

    try {
      console.log('CollectionPage: loadData started');
      if (!this.isMounted) return;

      this.state.isLoading = true;
      if (!silent) {
        this.toggleLoadingIndicator(true);
      }

      const { user } = await authService.getCurrentUser();

      if (!user) {
        console.log('CollectionPage: Guest mode');
        // Guest mode: use local session cards only
        this.state.cards = this.collectionManager.getAllCards();

        // Load favorites from localStorage
        const favoritesKey = 'voxrip_favorites';
        const favorites = JSON.parse(localStorage.getItem(favoritesKey) || '{}');
        this.state.cards = this.state.cards.map(card => ({
          ...card,
          isFavorite: favorites[card.id || card.cardVariantId] || false
        }));

        console.log('CollectionPage: Got cards', this.state.cards?.length);
        this.recalculateDerivedState();
        console.log('CollectionPage: Recalculated state');
        this.populateFilters(true);

        if (this.cardGrid) {
          this.cardGrid.update(this.state.sortedCards);
        } else {
          this.initializeCardGrid();
        }

        this.updateDisplay();

        // Update Sidebar with counts (guest mode)
        const sidebar = this.app?.sidebar || window.sidebar;
        if (sidebar) {
          const favoritesCount = this.state.cards.filter(c => c.isFavorite).length;
          sidebar.setContext('collection', {
            collections: [],
            activeCollection: 'all',
            totalCards: this.state.cards.length,
            favoritesCount: favoritesCount
          });
        }

        this.state.isLoading = false;
        if (!silent) this.toggleLoadingIndicator(false);
        return;
      }

      // Authenticated mode
      console.log('CollectionPage: loadData (v2 fix) - Authenticated user:', user.email, 'ID:', user.id);
      // Use CollectionManager to fetch cards (compatible with current schema)
      const cards = await this.collectionManager.getAllUserCards();
      console.log('CollectionPage: Fetched cards from manager:', cards?.length || 0);

      // Mock summary and plan for now as views might be missing
      const summaryResult = { summary: null, error: null };
      const planResult = { plan: null, error: null };

      // Transform not needed as getAllUserCards returns compatible format
      // But we might need to filter boolean
      const validCards = cards.filter(Boolean);

      // Load favorites from localStorage
      const favoritesKey = 'voxrip_favorites';
      const favorites = JSON.parse(localStorage.getItem(favoritesKey) || '{}');
      this.state.cards = validCards.map(card => ({
        ...card,
        isFavorite: favorites[card.id || card.cardVariantId] || false
      }));

      this.collectionManager.setExternalCards(this.state.cards, { ttl: Number.MAX_SAFE_INTEGER });

      if (!summaryResult.error) {
        this.state.summary = summaryResult.summary;
      } else {
        console.warn('CollectionPage: Summary fetch error', summaryResult.error);
        this.state.summary = null;
      }

      if (!planResult.error) {
        const uniqueVariantCount = new Set(cards.map((card) => card.cardVariantId)).size;
        const quota = evaluateCollectionQuota(planResult.plan, uniqueVariantCount);
        this.state.subscription = {
          plan: planResult.plan,
          error: null,
          isLoading: false,
          quota
        };
      } else {
        console.warn('CollectionPage: Plan fetch error', planResult.error);
        this.state.subscription = {
          plan: null,
          error: planResult.error,
          isLoading: false,
          quota: null
        };
        if (this.app?.showToast) {
          this.app.showToast('Unable to load subscription details', 'warning');
        }
      }

      this.recalculateDerivedState();
      this.populateFilters(true);

      if (this.cardGrid) {
        this.cardGrid.update(this.state.sortedCards);
      } else {
        this.initializeCardGrid();
      }

      if (!this.isMounted) return;

      this.updateDisplay();
      this.updatePlanControls();

      // Update Sidebar with collections and counts
      await this.loadUserCollections();

      this.state.error = null;

    } catch (error) {
      console.error('CollectionPage: Error loading data', error);
      this.state.cards = [];
      this.state.filteredCards = [];
      this.state.sortedCards = [];
      this.state.stats = null;
      this.state.summary = null;
      this.state.error = error;
      this.state.subscription = {
        plan: null,
        error,
        isLoading: false,
        quota: null
      };

      if (initial) {
        this.showError('Unable to load collection data. Please verify your Supabase connection.');
      } else if (this.app?.showToast) {
        this.app.showToast('Failed to refresh collection', 'error');
      }
      this.updatePlanControls();

      // Still try to update sidebar even on error
      try {
        await this.loadUserCollections();
      } catch (sidebarError) {
        console.error('CollectionPage: Failed to update sidebar after error:', sidebarError);
      }
    } finally {
      this.state.isLoading = false;
      if (!silent) {
        this.toggleLoadingIndicator(false);
      }
    }
  }

  transformCollectionItem(item) {
    if (!item) {
      return null;
    }

    const unitPrice = item?.pricing?.currentPrice !== undefined
      ? Number(item.pricing.currentPrice) || 0
      : 0;
    const totalValue = item?.pricing?.totalValue !== undefined
      ? Number(item.pricing.totalValue) || unitPrice * (item.quantity || 0)
      : unitPrice * (item.quantity || 0);

    return {
      id: item.id,
      collectionId: item.id,
      cardVariantId: item.cardVariantId,
      cardName: item.card?.name || 'Unknown Card',
      name: item.card?.name || 'Unknown Card',
      cardNumber: item.card?.number || null,
      setName: item.set?.name || null,
      setCode: item.set?.code || null,
      set: item.set?.code || null,
      rarity: item.rarity?.name || null,
      rarityKey: item.rarity?.key || null,
      rarityWeight: item.rarity?.weight ?? null,
      rareScoreContribution: item.rarity?.rareScoreContribution ?? null,
      quantity: Number(item.quantity) || 0,
      tcgLow: unitPrice,
      tcgMarket: unitPrice,
      priceSource: item.pricing?.priceSource || null,
      totalValue,
      imageUrl: item.card?.imageUrl || null,
      language: item.card?.language || null,
      addedAt: item.createdAt,
      updatedAt: item.updatedAt,
      sessionDate: item.createdAt,
      sessionName: 'Supabase',
      notes: item.notes || null,
      priceGain: Number.isFinite(Number(item.pricing?.priceGain))
        ? Number(item.pricing.priceGain)
        : null,
      percentageGain: Number.isFinite(Number(item.pricing?.percentageGain))
        ? Number(item.pricing.percentageGain)
        : null,
      packPrice: Number.isFinite(Number(item.pricing?.priceAtPack))
        ? Number(item.pricing.priceAtPack)
        : null,
      packCurrency: item.pricing?.packCurrency || item.pack?.currency || null,
      packedAt: item.pricing?.packedAt || item.pack?.packedAt || null,
      packEventId: item.pricing?.packEventId || item.pack?.eventId || null,
      pack: item.pack || null,
    };
  }

  recalculateDerivedState() {
    this.collectionManager.setExternalCards(this.state.cards, { ttl: Number.MAX_SAFE_INTEGER });

    this.applyFiltersAndSort();

    const stats = this.collectionManager.getCollectionStats(this.state.cards);

    if (this.state.summary) {
      stats.totalCards = this.state.summary.totalQuantity ?? stats.totalCards;
      stats.totalValue = this.state.summary.totalMarketValue ?? stats.totalValue;
      if (this.state.summary.rareScore !== undefined) {
        stats.rareScore = this.state.summary.rareScore;
      }
    }

    this.state.stats = stats;
  }

  getVisibleQuantity(cards = []) {
    return cards.reduce((sum, card) => sum + (Number(card.quantity) || 0), 0);
  }

  getUniqueCardCount() {
    try {
      const unique = this.collectionManager?.getUniqueCards?.();
      return Array.isArray(unique) ? unique.length : 0;
    } catch (error) {
      console.error('CollectionPage: Error calculating unique card count', error);
      return 0;
    }
  }

  toggleLoadingIndicator(isLoading) {
    const refreshBtn = document.getElementById('refreshCollectionBtn');
    if (!refreshBtn) return;

    if (isLoading) {
      if (!refreshBtn.dataset.originalLabel) {
        refreshBtn.dataset.originalLabel = refreshBtn.innerHTML;
      }
      refreshBtn.disabled = true;
      refreshBtn.innerHTML = '<i class="lucide-icon" data-lucide="loader"></i> Loading…';
    } else {
      refreshBtn.disabled = false;
      if (refreshBtn.dataset.originalLabel) {
        refreshBtn.innerHTML = refreshBtn.dataset.originalLabel;
      }
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
    }
  }

  togglePackLoading(isLoading) {
    const tableBody = document.getElementById('packHistoryTableBody');
    if (!tableBody) {
      return;
    }

    if (isLoading) {
      tableBody.innerHTML = `
        <tr class="loading-row">
          <td colspan="8">Loading pack history...</td>
        </tr>
      `;
    }
  }

  showPackError(message) {
    const errorEl = document.getElementById('packHistoryError');
    if (!errorEl) {
      return;
    }

    if (message) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    } else {
      errorEl.textContent = '';
      errorEl.style.display = 'none';
    }
  }

  formatCurrency(value, options = {}) {
    const { fallback = '$0.00', showSign = false, absolute = false } = options;

    if (!Number.isFinite(Number(value))) {
      return fallback;
    }

    const numeric = absolute ? Math.abs(Number(value)) : Number(value);
    const formatted = this.currencyFormatter.format(numeric);

    if (!showSign) {
      return formatted;
    }

    if (Number(value) > 0) {
      return `+${this.currencyFormatter.format(Math.abs(Number(value)))}`;
    }

    if (Number(value) < 0) {
      return `-${this.currencyFormatter.format(Math.abs(Number(value)))}`;
    }

    return this.currencyFormatter.format(0);
  }

  formatPercent(value, options = {}) {
    const { fallback = '—', showSign = false } = options;

    if (!Number.isFinite(Number(value))) {
      return fallback;
    }

    const numeric = Number(value);
    const formatted = this.numberFormatter.format(Math.abs(numeric));

    if (showSign) {
      if (numeric > 0) {
        return `+${formatted}%`;
      }
      if (numeric < 0) {
        return `-${formatted}%`;
      }
    }

    const prefix = numeric < 0 ? '-' : '';
    return `${prefix}${formatted}%`;
  }

  formatDate(value) {
    if (!value) {
      return '—';
    }

    try {
      return this.dateFormatter.format(new Date(value));
    } catch (error) {
      console.warn('CollectionPage: Failed to format date', value, error);
      return '—';
    }
  }

  formatPackSource(source) {
    const map = {
      pack: 'Booster Pack',
      purchase: 'Single Purchase',
      trade: 'Trade',
      gift: 'Gift',
      reward: 'Reward',
      other: 'Other',
    };

    if (!source) {
      return map.pack;
    }

    return map[source] || 'Other';
  }

  filterPackEvents(events = []) {
    const filters = this.state.pack?.filters || {};
    const profitableOnly = !!filters.profitableOnly;
    const source = filters.source || 'all';

    return (events || []).filter((event) => {
      if (!event) {
        return false;
      }

      const gain = Number(event.totalGain) || 0;
      if (profitableOnly && gain <= 0) {
        return false;
      }

      if (source && source !== 'all' && event.source !== source) {
        return false;
      }

      return true;
    });
  }

  computePackStats(events = []) {
    const safeEvents = Array.isArray(events) ? events : [];
    let totalGain = 0;
    let totalPackValue = 0;
    let totalCurrentValue = 0;
    let totalSpend = 0;
    let netGain = 0;
    let profitableCount = 0;
    let losingCount = 0;
    const roiValues = [];

    let bestPack = null;

    safeEvents.forEach((event) => {
      if (!event) {
        return;
      }

      const gain = Number(event.totalGain) || 0;
      const packValue = Number(event.totalPackValue) || 0;
      const currentValue = Number(event.totalCurrentValue) || 0;
      const spend = Number(event.packCost) || 0;
      const net = Number.isFinite(Number(event.netGainVsPackCost))
        ? Number(event.netGainVsPackCost)
        : currentValue - spend;

      totalGain += gain;
      totalPackValue += packValue;
      totalCurrentValue += currentValue;
      totalSpend += spend;
      netGain += net;

      if (gain > 0) {
        profitableCount += 1;
      } else if (gain < 0) {
        losingCount += 1;
      }

      if (Number.isFinite(Number(event.roiPercentage))) {
        roiValues.push(Number(event.roiPercentage));
      }

      if (!bestPack || gain > (Number(bestPack.totalGain) || Number.NEGATIVE_INFINITY)) {
        bestPack = event;
      }
    });

    const averageRoi = roiValues.length
      ? roiValues.reduce((sum, value) => sum + value, 0) / roiValues.length
      : null;

    return {
      totalGain,
      netGain,
      averageRoi,
      totalPackValue,
      totalCurrentValue,
      totalSpend,
      profitablePacks: profitableCount,
      losingPacks: losingCount,
      totalPacks: safeEvents.length,
      bestPack,
    };
  }

  updatePackInsightsUI() {
    const stats = this.state.pack?.stats || {
      totalGain: 0,
      netGain: 0,
      averageRoi: null,
      totalSpend: 0,
      totalPacks: 0,
      profitablePacks: 0,
      losingPacks: 0,
    };

    const totalGainEl = document.getElementById('packTotalGain');
    if (totalGainEl) {
      totalGainEl.textContent = this.formatCurrency(stats.totalGain || 0);
    }

    const profitableCountEl = document.getElementById('packProfitableCount');
    if (profitableCountEl) {
      const profitable = stats.profitablePacks || 0;
      profitableCountEl.textContent = `${profitable} profitable pack${profitable === 1 ? '' : 's'}`;
    }

    const netGainEl = document.getElementById('packNetGain');
    if (netGainEl) {
      netGainEl.textContent = this.formatCurrency(stats.netGain || 0);
    }

    const totalSpendEl = document.getElementById('packTotalSpend');
    if (totalSpendEl) {
      totalSpendEl.textContent = `Total spend ${this.formatCurrency(stats.totalSpend || 0)}`;
    }

    const averageRoiEl = document.getElementById('packAverageRoi');
    if (averageRoiEl) {
      averageRoiEl.textContent = this.formatPercent(stats.averageRoi, { fallback: '—', showSign: true });
    }

    const visiblePacksEl = document.getElementById('packVisiblePacks');
    if (visiblePacksEl) {
      const total = stats.totalPacks || 0;
      const losses = stats.losingPacks || 0;
      visiblePacksEl.textContent = `Showing ${total} pack${total === 1 ? '' : 's'} · ${losses} at a loss`;
    }

    const bestPull = this.state.pack?.bestPull || null;
    const bestPullValueEl = document.getElementById('packBestPullValue');
    const bestPullNameEl = document.getElementById('packBestPullName');

    if (bestPullValueEl && bestPullNameEl) {
      if (bestPull && (Number.isFinite(bestPull.currentPrice) || Number.isFinite(bestPull.priceAtPack))) {
        const value = Number.isFinite(bestPull.currentPrice)
          ? bestPull.currentPrice
          : bestPull.priceAtPack;
        bestPullValueEl.textContent = this.formatCurrency(value || 0);

        const parts = [];
        if (bestPull.cardName) {
          parts.push(bestPull.cardName);
        } else if (bestPull.cardSlug) {
          parts.push(bestPull.cardSlug);
        }
        if (bestPull.setName) {
          parts.push(bestPull.setName);
        }
        if (bestPull.packEventId) {
          parts.push(`pack ${this.formatDate(bestPull.packedAt || bestPull.recordedAt)}`);
        }
        bestPullNameEl.textContent = parts.length > 0
          ? `${parts.join(' · ')}`
          : 'Tracked from pack history';
      } else {
        bestPullValueEl.textContent = '—';
        bestPullNameEl.textContent = 'Log more pack events to surface highlights';
      }
    }
  }

  updatePackHistoryTable() {
    const tableBody = document.getElementById('packHistoryTableBody');
    const emptyState = document.getElementById('packHistoryEmpty');

    if (!tableBody) {
      return;
    }

    const events = Array.isArray(this.state.pack?.events) ? this.state.pack.events : [];

    if (events.length === 0) {
      if (!this.state.pack?.isLoading) {
        tableBody.innerHTML = '';
        if (emptyState) {
          emptyState.style.display = 'block';
        }
      }
      return;
    }

    if (emptyState) {
      emptyState.style.display = 'none';
    }

    const rows = events.map((event) => {
      const setName = event?.set?.name || 'Unknown Set';
      const setCode = event?.set?.code ? ` (${event.set.code})` : '';
      const cardsTracked = Number(event?.cardsTracked) || 0;
      const totalQuantity = Number(event?.totalQuantity) || 0;
      const packValue = Number(event?.totalPackValue) || 0;
      const currentValue = Number(event?.totalCurrentValue) || 0;
      const gain = Number(event?.totalGain) || 0;
      const roi = Number(event?.roiPercentage);
      const net = Number.isFinite(Number(event?.netGainVsPackCost))
        ? Number(event.netGainVsPackCost)
        : (currentValue - (Number(event?.packCost) || 0));

      const gainClass = gain > 0
        ? 'text-success'
        : gain < 0
          ? 'text-danger'
          : 'text-neutral-300';

      const roiClass = Number.isFinite(roi)
        ? (roi > 0 ? 'text-success' : roi < 0 ? 'text-danger' : 'text-neutral-300')
        : 'text-neutral-400';

      return `
        <tr data-pack-event-id="${event.id}">
          <td>${this.formatDate(event.packedAt || event.recordedAt)}</td>
          <td>
            <div class="table-cell-title">${setName}${setCode}</div>
            <div class="table-cell-subtitle">${this.formatPackSource(event.source)}</div>
          </td>
          <td>
            <div class="table-cell-title">${cardsTracked.toLocaleString()}</div>
            <div class="table-cell-subtitle">${totalQuantity.toLocaleString()} total</div>
          </td>
          <td>${this.formatCurrency(packValue)}</td>
          <td>${this.formatCurrency(currentValue)}</td>
          <td class="${gainClass}">${this.formatCurrency(gain, { showSign: true })}</td>
          <td class="${roiClass}">${this.formatPercent(roi, { showSign: true })}</td>
          <td class="${gainClass}">${this.formatCurrency(net, { showSign: true })}</td>
        </tr>
      `;
    }).join('');

    tableBody.innerHTML = rows;
  }

  applyPackFiltersAndStats() {
    const eventsAll = Array.isArray(this.state.pack?.eventsAll) ? this.state.pack.eventsAll : [];
    const filtered = this.filterPackEvents(eventsAll);
    this.state.pack.events = filtered;
    this.state.pack.stats = this.computePackStats(filtered);
    this.updatePackInsightsUI();
    this.updatePackHistoryTable();
  }

  async loadPackInsights(options = {}) {
    const { force = true } = options;

    // Skip for guests
    const user = authService.getUser();
    if (!user) {
      this.state.pack.isLoading = false;
      this.state.pack.events = [];
      this.state.pack.stats = null;
      this.updatePackInsightsUI();
      return;
    }

    if (!force && Array.isArray(this.state.pack?.eventsAll) && this.state.pack.eventsAll.length > 0) {
      this.applyPackFiltersAndStats();
      return;
    }

    const refreshButton = document.getElementById('refreshPackHistoryBtn');
    if (refreshButton) {
      refreshButton.disabled = true;
    }

    try {
      this.state.pack.isLoading = true;
      this.togglePackLoading(true);
      this.showPackError(null);

      const [summaryResult, topPullResult] = await Promise.all([
        fetchPackEventSummaries({ limit: 200 }),
        fetchTopPackPull({ sortBy: 'current_price' }),
      ]);

      if (summaryResult.error) {
        throw summaryResult.error;
      }

      if (topPullResult?.error) {
        console.warn('CollectionPage: fetchTopPackPull warning', topPullResult.error);
      }

      this.state.pack.eventsAll = Array.isArray(summaryResult.events) ? summaryResult.events : [];
      this.state.pack.bestPull = topPullResult?.card || null;
      this.state.pack.error = null;

      this.applyPackFiltersAndStats();
    } catch (error) {
      console.error('CollectionPage: Error loading pack history', error);
      const message = error?.message || 'Unable to load pack history. Check your Supabase connection.';
      this.state.pack.error = message;
      this.state.pack.eventsAll = [];
      this.state.pack.events = [];
      this.state.pack.stats = this.computePackStats([]);
      this.state.pack.bestPull = null;
      this.updatePackInsightsUI();
      this.updatePackHistoryTable();
      this.showPackError(message);
    } finally {
      this.state.pack.isLoading = false;
      this.togglePackLoading(false);
      if (refreshButton) {
        refreshButton.disabled = false;
      }
    }
  }

  handlePackProfitToggle(event) {
    const isChecked = !!event?.target?.checked;
    if (this.state.pack?.filters) {
      this.state.pack.filters.profitableOnly = isChecked;
    }
    this.applyPackFiltersAndStats();
  }

  handlePackSourceChange(event) {
    const value = event?.target?.value || 'all';
    if (this.state.pack?.filters) {
      this.state.pack.filters.source = value;
    }
    this.applyPackFiltersAndStats();
  }

  handlePackRefresh() {
    this.loadPackInsights({ force: true });
  }

  setMutating(isMutating) {
    this.state.isMutating = isMutating;
    const buttons = [
      document.getElementById('addCardBtn'),
      document.getElementById('exportCollectionBtn')
    ];

    buttons.forEach((btn) => {
      if (btn) {
        btn.disabled = isMutating;
      }
    });
  }

  applyOptimisticMutation({ cardVariantId, quantityDelta, provisionalCard = null, pricePerUnit = null }) {
    const previousState = {
      cards: this.state.cards.map(card => ({ ...card })),
      summary: this.state.summary ? { ...this.state.summary } : null,
      stats: this.state.stats ? { ...this.state.stats } : null,
    };

    const cards = this.state.cards.map(card => ({ ...card }));
    let targetIndex = cards.findIndex(card => card.cardVariantId === cardVariantId);
    let targetCard = targetIndex >= 0 ? cards[targetIndex] : null;

    if (targetIndex === -1 && provisionalCard) {
      targetCard = { ...provisionalCard, quantity: Number(provisionalCard.quantity) || 0 };
      cards.push(targetCard);
      targetIndex = cards.length - 1;
    }

    if (targetIndex === -1) {
      return () => { };
    }

    const unit = pricePerUnit !== null && pricePerUnit !== undefined
      ? Number(pricePerUnit) || 0
      : Number(targetCard.tcgLow) || 0;

    targetCard.quantity = Math.max(0, (Number(targetCard.quantity) || 0) + quantityDelta);
    targetCard.totalValue = unit * targetCard.quantity;

    const updatedCards = cards.filter(card => (Number(card.quantity) || 0) > 0);
    this.state.cards = updatedCards;

    if (this.state.summary) {
      const totalQuantity = (this.state.summary.totalQuantity || 0) + quantityDelta;
      const totalValue = (this.state.summary.totalMarketValue || 0) + (unit * quantityDelta);
      this.state.summary = {
        ...this.state.summary,
        totalQuantity,
        totalMarketValue: totalValue < 0 ? 0 : totalValue,
      };
    }

    this.recalculateDerivedState();
    this.populateFilters();
    this.updateDisplay();

    return () => {
      this.state.cards = previousState.cards;
      this.state.summary = previousState.summary;
      this.state.stats = previousState.stats;
      this.recalculateDerivedState();
      this.populateFilters();
      this.updateDisplay();
    };
  }

  mergeCollectionItem(item) {
    if (!item) {
      return;
    }

    const card = this.transformCollectionItem(item);
    if (!card) {
      return;
    }

    const existingIndex = this.state.cards.findIndex(c => c.cardVariantId === card.cardVariantId);

    if (existingIndex >= 0) {
      this.state.cards[existingIndex] = card;
    } else {
      this.state.cards.push(card);
    }

    this.recalculateDerivedState();
    this.populateFilters();
    if (this.cardGrid) {
      this.cardGrid.update(this.state.sortedCards);
    }
    this.updateDisplay();
  }

  async refreshSummary() {
    const [summaryResult, planResult] = await Promise.all([
      fetchCollectionSummary(),
      fetchActivePlan()
    ]);

    if (!summaryResult.error) {
      this.state.summary = summaryResult.summary;
      this.recalculateDerivedState();
    }

    if (!planResult.error) {
      const uniqueVariantCount = this.getUniqueCardCount();
      const quota = evaluateCollectionQuota(planResult.plan, uniqueVariantCount);
      this.state.subscription = {
        plan: planResult.plan,
        error: null,
        isLoading: false,
        quota
      };
    } else {
      this.state.subscription = {
        plan: this.state.subscription?.plan ?? null,
        error: planResult.error,
        isLoading: false,
        quota: this.state.subscription?.quota ?? null
      };
    }

    this.updateDisplay();
    this.updatePlanControls();
  }

  /**
   * Initialize CardGrid component
   */
  initializeCardGrid() {
    try {
      const gridContainer = document.getElementById('cardGrid');
      if (!gridContainer) return;

      // Clear container
      gridContainer.innerHTML = '';

      this.cardGrid = new CardGrid({
        cards: this.state.sortedCards,
        cardSize: this.state.cardSize,
        onRemoveCard: this.boundHandlers.handleCardRemove,
        onToggleFavorite: this.boundHandlers.handleToggleFavorite,
        onCardClick: this.boundHandlers.handleCardClick,
        showRemoveButton: true,
        viewMode: 'grid'
      });

      const gridElement = this.cardGrid.create();
      gridContainer.appendChild(gridElement);

      console.log('[CollectionPage] CardGrid initialized and appended to DOM');

    } catch (error) {
      console.error('CollectionPage: Error initializing CardGrid', error);
    }
  }

  /**
   * Populate filter dropdowns
   */
  async populateFilters(initial = false) {
    try {
      // Populate Collection Filter
      const collectionFilter = document.getElementById('collectionFilter');
      if (collectionFilter && this.collectionManager) {
        // Only fetch if initial load or empty (to avoid resetting selection during updates)
        if (initial || collectionFilter.options.length <= 1) {
          const collections = await this.collectionManager.getUserCollections();
          const previousValue = collectionFilter.value;

          collectionFilter.innerHTML = '<option value="all">All Cards</option>';

          collections.forEach(col => {
            const option = document.createElement('option');
            option.value = col.id;
            option.textContent = col.name;
            collectionFilter.appendChild(option);
          });

          // Restore selection if valid
          if (previousValue && previousValue !== 'all') {
            const exists = Array.from(collectionFilter.options).some(opt => opt.value === previousValue);
            if (exists) collectionFilter.value = previousValue;
          }
        }
      }

      // Populate set filter
      const setFilter = document.getElementById('setFilter');
      if (setFilter && this.collectionManager) {
        const sets = this.collectionManager.getUniqueSets();
        const previousValue = setFilter.value;
        setFilter.innerHTML = '<option value="all">All Sets</option>';
        sets.forEach(set => {
          const option = document.createElement('option');
          option.value = set;
          option.textContent = set;
          setFilter.appendChild(option);
        });
        if (sets.includes(previousValue)) {
          setFilter.value = previousValue;
        }
      }

      // Populate rarity filter
      const rarityFilter = document.getElementById('rarityFilter');
      if (rarityFilter && this.collectionManager) {
        const rarities = this.collectionManager.getUniqueRarities();
        const previousValue = rarityFilter.value;
        rarityFilter.innerHTML = '<option value="all">All Rarities</option>';
        rarities.forEach(rarity => {
          const option = document.createElement('option');
          const rarityName = typeof rarity === 'string' ? rarity : (rarity?.name || String(rarity));
          option.value = rarityName.toLowerCase();
          option.textContent = rarityName;
          rarityFilter.appendChild(option);
        });
        if (rarities.some(r => {
          const rName = typeof r === 'string' ? r : (r?.name || String(r));
          return rName.toLowerCase() === previousValue;
        })) {
          rarityFilter.value = previousValue;
        }
      }

    } catch (error) {
      console.error('CollectionPage: Error populating filters', error);
    }
  }

  /**
   * Attach event listeners
   */
  attachEvents() {
    try {
      // Search and Filter
      const searchInput = document.getElementById('searchInput');
      const setFilter = document.getElementById('setFilter');
      const rarityFilter = document.getElementById('rarityFilter');
      const sortBy = document.getElementById('sortBy');
      const sortOrder = document.getElementById('sortOrder');

      if (searchInput) searchInput.addEventListener('input', (e) => this.handleSearchInput(e));
      if (setFilter) setFilter.addEventListener('change', (e) => this.handleFilterChange(e));
      if (rarityFilter) rarityFilter.addEventListener('change', (e) => this.handleFilterChange(e));
      if (sortBy) sortBy.addEventListener('change', (e) => this.handleSortChange(e));
      // sortOrder might not be in the new HTML if I removed it, but let's keep it safe
      if (sortOrder) sortOrder.addEventListener('change', (e) => this.handleSortChange(e));

      // View Toggle
      const viewBtns = this.container.querySelectorAll('.view-btn');
      viewBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const view = e.target.closest('.view-btn').dataset.view;
          this.handleViewToggle(view);
        });
      });

      // New Buttons
      const createCollectionBtn = document.getElementById('createCollectionBtn');
      const addCardBtn = document.getElementById('addCardBtn');

      if (createCollectionBtn) {
        createCollectionBtn.addEventListener('click', () => this.handleCreateCollection());
      }

      if (addCardBtn) {
        addCardBtn.addEventListener('click', () => this.handleAddCard());
      }

      // Export
      const exportBtn = document.getElementById('exportCollectionBtn');
      if (exportBtn) {
        exportBtn.addEventListener('click', () => this.handleExport());
      }

      // Filter Chips (Monster/Spell/Trap)
      const chips = this.container.querySelectorAll('.chip');
      chips.forEach(chip => {
        chip.addEventListener('click', (e) => {
          const cardType = e.currentTarget.dataset.filter; // Use currentTarget for reliability

          // Update UI
          this.container.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
          e.currentTarget.classList.add('active');

          // Update state and refresh display
          this.state.filters.cardType = cardType;
          this.applyFiltersAndSort();
          this.updateDisplay();

          console.log('[CollectionPage] Card type filter:', cardType);
        });
      });

    } catch (error) {
      console.error('Error attaching events:', error);
    }
  }


  handleViewToggle(viewMode) {
    this.state.viewMode = viewMode;

    // Update buttons
    this.container.querySelectorAll('.view-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewMode);
    });

    // Update Grid
    const cardGrid = document.getElementById('cardGrid');
    if (cardGrid) {
      if (viewMode === 'list') {
        cardGrid.classList.add('list-view');
      } else {
        cardGrid.classList.remove('list-view');
      }
    }

    // Re-render grid to ensure correct item layout if needed (CardGrid might need to know view mode)
    // Assuming CardGrid handles CSS-only toggle for now, but if we need different HTML structure:
    // this.renderCardGrid(); 
  }

  /**
   * Remove event listeners
   */
  removeEvents() {
    try {
      const searchInput = document.getElementById('searchInput');
      const setFilter = document.getElementById('setFilter');
      const rarityFilter = document.getElementById('rarityFilter');
      const sortBy = document.getElementById('sortBy');
      const sortOrder = document.getElementById('sortOrder');
      const viewGridBtn = document.getElementById('viewGridBtn');
      const viewListBtn = document.getElementById('viewListBtn');
      const cardSizeSlider = document.getElementById('cardSizeSlider');
      const refreshBtn = document.getElementById('refreshCollectionBtn');
      const exportBtn = document.getElementById('exportCollectionBtn');
      const addBtn = document.getElementById('addCardBtn');
      const packProfitableToggle = document.getElementById('packProfitableToggle');
      const packSourceFilter = document.getElementById('packSourceFilter');
      const refreshPackHistoryBtn = document.getElementById('refreshPackHistoryBtn');

      if (searchInput) searchInput.removeEventListener('input', this.boundHandlers.handleSearchInput);
      if (setFilter) setFilter.removeEventListener('change', this.boundHandlers.handleFilterChange);
      if (rarityFilter) rarityFilter.removeEventListener('change', this.boundHandlers.handleFilterChange);
      if (sortBy) sortBy.removeEventListener('change', this.boundHandlers.handleSortChange);
      if (sortOrder) sortOrder.removeEventListener('change', this.boundHandlers.handleSortChange);
      if (viewGridBtn) viewGridBtn.removeEventListener('click', this.boundHandlers.handleViewToggle);
      if (viewListBtn) viewListBtn.removeEventListener('click', this.boundHandlers.handleViewToggle);
      if (cardSizeSlider) cardSizeSlider.removeEventListener('input', this.boundHandlers.handleCardSizeChange);
      if (refreshBtn) refreshBtn.removeEventListener('click', this.boundHandlers.handleRefresh);
      if (exportBtn) exportBtn.removeEventListener('click', this.boundHandlers.handleExport);
      if (addBtn) addBtn.removeEventListener('click', this.boundHandlers.handleAddCard);
      if (packProfitableToggle) packProfitableToggle.removeEventListener('change', this.boundHandlers.handlePackProfitToggle);
      if (packSourceFilter) packSourceFilter.removeEventListener('change', this.boundHandlers.handlePackSourceChange);
      if (refreshPackHistoryBtn) refreshPackHistoryBtn.removeEventListener('click', this.boundHandlers.handlePackRefresh);

    } catch (error) {
      console.error('CollectionPage: Error removing events', error);
    }
  }

  /**
   * Handle filter change
   */
  handleFilterChange() {
    try {
      // Get current filter values
      const setFilter = document.getElementById('setFilter');
      const rarityFilter = document.getElementById('rarityFilter');
      const collectionFilter = document.getElementById('collectionFilter');
      const searchInput = document.getElementById('searchInput');

      this.state.filters = {
        set: setFilter?.value || 'all',
        rarity: rarityFilter?.value || 'all',
        cardType: this.state.filters.cardType || 'all', // Preserve chip filter
        collectionId: collectionFilter?.value && collectionFilter.value !== 'all' ? collectionFilter.value : null,
        search: searchInput?.value || ''
      };

      // Apply filters and update display
      this.applyFiltersAndSort();
      this.updateDisplay();

    } catch (error) {
      console.error('CollectionPage: Error handling filter change', error);
    }
  }

  /**
   * Handle search input with debouncing
   */
  handleSearchInput() {
    try {
      // Clear existing timeout
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
      }

      // Set new timeout
      this.searchTimeout = setTimeout(() => {
        this.handleFilterChange();
      }, 300);

    } catch (error) {
      console.error('CollectionPage: Error handling search input', error);
    }
  }

  /**
   * Handle sort change
   */
  handleSortChange() {
    try {
      const sortBy = document.getElementById('sortBy');
      const sortOrder = document.getElementById('sortOrder');

      this.state.sort = {
        by: sortBy?.value || 'date',
        order: sortOrder?.value || 'desc'
      };

      // Apply sorting and update display
      this.applyFiltersAndSort();
      this.updateDisplay();

    } catch (error) {
      console.error('CollectionPage: Error handling sort change', error);
    }
  }

  /**
   * Handle view toggle
   */
  handleViewToggle(view) {
    try {
      this.state.viewMode = view;

      // Update button states
      const gridBtn = document.getElementById('viewGridBtn');
      const listBtn = document.getElementById('viewListBtn');

      if (gridBtn && listBtn) {
        if (view === 'grid') {
          gridBtn.classList.add('active');
          listBtn.classList.remove('active');
        } else {
          gridBtn.classList.remove('active');
          listBtn.classList.add('active');
        }
      }

      // Update display
      this.updateDisplay();

    } catch (error) {
      console.error('CollectionPage: Error handling view toggle', error);
    }
  }

  /**
   * Handle card size change
   */
  handleCardSizeChange(e) {
    try {
      const size = parseInt(e.target.value);
      this.state.cardSize = size;

      // Update size display
      const sizeValue = document.getElementById('cardSizeValue');
      if (sizeValue) {
        sizeValue.textContent = `${size}px`;
      }

      // Update CardGrid size
      if (this.cardGrid) {
        if (typeof this.cardGrid.updateConfig === 'function') {
          this.cardGrid.updateConfig({ cardSize: size });
        } else if (typeof this.cardGrid.setCardSize === 'function') {
          this.cardGrid.setCardSize(size);
        }
      }

    } catch (error) {
      console.error('CollectionPage: Error handling card size change', error);
    }
  }

  /**
   * Handle refresh
   */
  async handleRefresh() {
    try {
      this.toggleLoadingIndicator(true);
      if (this.collectionManager) {
        this.collectionManager.clearCache();
      }

      await this.loadData({ silent: true });
      await this.refreshSummary();

      if (this.app?.showToast) {
        this.app.showToast('Collection refreshed', 'success');
      }

    } catch (error) {
      console.error('CollectionPage: Error refreshing', error);
      if (this.app.showToast) {
        this.app.showToast('Failed to refresh collection', 'error');
      }
    } finally {
      this.toggleLoadingIndicator(false);
    }
  }

  /**
   * Handle export
   */
  handleExport() {
    try {
      if (!this.collectionManager) {
        throw new Error('Collection manager not initialized');
      }

      // Export collection data
      const data = this.collectionManager.exportCollection();
      if (!data) {
        throw new Error('Failed to export collection data');
      }

      if (this.state.summary) {
        data.summary = this.state.summary;
      }

      // Create JSON blob
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `voxrip-collection-${new Date().toISOString().split('T')[0]}.json`;
      a.click();

      // Cleanup
      URL.revokeObjectURL(url);

      // Show success message
      if (this.app.showToast) {
        this.app.showToast('Collection exported successfully', 'success');
      }

    } catch (error) {
      console.error('CollectionPage: Error exporting', error);
      if (this.app.showToast) {
        this.app.showToast('Failed to export collection', 'error');
      }
    }
  }

  /**
   * Handle card remove (not implemented in collection view)
   */
  async handleCardRemove(card) {
    try {
      if (!card || !card.id) {
        console.error('[CollectionPage] Cannot remove card: missing ID', card);
        return;
      }

      const confirmRemoval = window.confirm(
        `Remove ${card.cardName || 'this card'} from your collection?`
      );

      if (!confirmRemoval) return;

      this.toggleLoadingIndicator(true);
      await this.collectionManager.removeCardFromCollection(card.id);

      this.app.showToast('Card removed from collection', 'success');
      await this.loadData({ silent: true });

    } catch (error) {
      console.error('[CollectionPage] Error removing card:', error);
      this.app.showToast('Failed to remove card', 'error');
    } finally {
      this.toggleLoadingIndicator(false);
    }
  }

  async handleAddCard() {
    try {
      const { user } = await authService.getCurrentUser();
      if (!user) {
        this.app.showToast('Please log in to add cards to your collection', 'warning');
        return;
      }

      // Get collections to choose from
      const collections = await this.collectionManager.getUserCollections();
      if (collections.length === 0) {
        if (confirm('You need a collection first. Create one now?')) {
          await this.handleCreateCollection();
        }
        return;
      }

      const slugInput = prompt('Enter card name or slug (e.g., blue-eyes-white-dragon):');
      if (!slugInput) return;

      const quantityInput = prompt('Quantity:', '1');
      const quantity = parseInt(quantityInput) || 1;

      // Select collection
      let collectionId = this.state.filters.collectionId;
      if (!collectionId || collectionId === 'all') {
        const options = collections.map((c, i) => `${i + 1}. ${c.name}`).join('\n');
        const choice = prompt(`Select a collection:\n${options}`, '1');
        const index = parseInt(choice) - 1;
        if (collections[index]) {
          collectionId = collections[index].id;
        } else {
          return;
        }
      }

      this.toggleLoadingIndicator(true);

      // Mock card data for the insert
      // In a full implementation, we'd fetch the actual card details from an API first
      const cardData = {
        name: slugInput,
        set_code: 'MANUAL',
        rarity: 'Common',
        quantity: quantity
      };

      await this.collectionManager.addCardToCollection(collectionId, cardData);

      this.app.showToast(`Added ${quantity}x ${slugInput} to collection`, 'success');
      await this.loadData({ silent: true });

    } catch (error) {
      console.error('[CollectionPage] Error adding card:', error);
      this.app.showToast('Failed to add card', 'error');
    } finally {
      this.toggleLoadingIndicator(false);
    }
  }

  /**
   * Apply filters and sorting
   */
  applyFiltersAndSort() {
    try {
      let filtered = [...this.state.cards];

      // Filter by Collection ID or special collections (favorites)
      if (this.state.filters.collectionId) {
        console.log('[CollectionPage] Filtering by collectionId:', this.state.filters.collectionId);
        console.log('[CollectionPage] Cards before filter:', filtered.length, 'Sample collectionIds:', filtered.slice(0, 3).map(c => c.collectionId));

        if (this.state.filters.collectionId === 'favorites') {
          // Special case: filter by favorites
          filtered = filtered.filter(card => card.isFavorite === true);
          console.log('[CollectionPage] After favorites filter:', filtered.length);
        } else {
          // Regular collection filter - use String comparison for UUID matching
          filtered = filtered.filter(card => String(card.collectionId) === String(this.state.filters.collectionId));
          console.log('[CollectionPage] After collectionId filter:', filtered.length);
        }
      }

      // Filter by Set
      if (this.state.filters.set !== 'all') {
        filtered = filtered.filter(card => (card.set?.code === this.state.filters.set) || (card.set?.name === this.state.filters.set));
      }

      // Filter by Rarity
      if (this.state.filters.rarity !== 'all') {
        filtered = filtered.filter(card => {
          // Safely handle rarity comparison
          const cardRarity = card.rarity?.key || card.rarity?.name || card.rarity || '';
          return cardRarity.toLowerCase() === this.state.filters.rarity.toLowerCase();
        });
      }

      // Filter by Card Type (Monster/Spell/Trap)
      if (this.state.filters.cardType && this.state.filters.cardType !== 'all') {
        filtered = filterByCardType(filtered, this.state.filters.cardType);
        console.log('[CollectionPage] After cardType filter:', filtered.length);
      }

      // Apply filters
      this.state.filteredCards = this.collectionManager.filterCards(
        filtered, // Pass the already filtered cards to the manager for other filters
        this.state.filters
      );

      // Apply sorting
      this.state.sortedCards = this.collectionManager.sortCards(
        this.state.filteredCards,
        this.state.sort.by,
        this.state.sort.order
      );

    } catch (error) {
      console.error('CollectionPage: Error applying filters and sort', error);
      this.state.filteredCards = this.state.cards;
      this.state.sortedCards = this.state.cards;
    }
  }

  /**
   * Update display
   */
  updateDisplay() {
    try {
      // Update statistics
      this.updateStats();
      this.updatePackInsightsUI();
      this.updatePackHistoryTable();

      // Update card count
      const cardCount = document.getElementById('cardCount');
      if (cardCount) {
        const visibleQuantity = this.getVisibleQuantity(this.state.sortedCards);
        cardCount.textContent = visibleQuantity.toLocaleString();
      }

      // Show/hide empty state
      const isEmpty = this.state.sortedCards.length === 0;
      console.log('[CollectionPage] updateDisplay - isEmpty:', isEmpty, 'sortedCards.length:', this.state.sortedCards.length);
      const emptyState = document.getElementById('emptyState');
      const gridView = document.getElementById('cardGrid');
      const listView = document.getElementById('collectionListView');

      if (emptyState) {
        emptyState.style.display = isEmpty ? 'block' : 'none';
      }

      if (!isEmpty) {
        // Show appropriate view
        if (this.state.viewMode === 'grid') {
          if (gridView) gridView.style.display = 'block';
          if (listView) listView.style.display = 'none';
          this.updateGridView();
        } else {
          if (gridView) gridView.style.display = 'none';
          if (listView) listView.style.display = 'block';
          this.updateListView();
        }
      } else {
        if (gridView) gridView.style.display = 'none';
        if (listView) listView.style.display = 'none';
      }

      // Update icons
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }

    } catch (error) {
      console.error('CollectionPage: Error updating display', error);
    }
  }

  /**
   * Update statistics display based on currently filtered/sorted cards
   */
  updateStats() {
    try {
      // Calculate stats from the currently filtered cards (not global stats)
      const cards = this.state.sortedCards || [];

      // Total cards (sum of quantities)
      const totalCardsValue = cards.reduce((sum, card) => sum + (Number(card.quantity) || 1), 0);

      // Total value (sum of each card's total value, using market price as primary)
      const totalValueDollars = cards.reduce((sum, card) => {
        const price = card.pricing?.currentPrice || card.tcgMarket || card.pricing?.marketPrice || 0;
        const quantity = Number(card.quantity) || 1;
        return sum + (price * quantity);
      }, 0);

      // Unique cards (count of distinct cards)
      const uniqueCardsValue = cards.length;

      // Find top rarity card
      const rarityWeights = {
        'quarter century secret rare': 100,
        'starlight rare': 95,
        'ghost rare': 90,
        'collector\'s rare': 85,
        'secret rare': 80,
        'ultra rare': 70,
        'super rare': 60,
        'rare': 50,
        'common': 10
      };

      let topRarityCard = null;
      let topRarityWeight = -1;
      cards.forEach(card => {
        const rarityName = (card.rarity?.name || card.rarity?.key || card.rarity || '').toLowerCase();
        const weight = rarityWeights[rarityName] || 0;
        if (weight > topRarityWeight) {
          topRarityWeight = weight;
          topRarityCard = card;
        }
      });

      const totalCards = document.getElementById('statTotalCards');
      if (totalCards) {
        totalCards.textContent = totalCardsValue.toLocaleString();
      }

      const uniqueCards = document.getElementById('statUniqueCards');
      if (uniqueCards) {
        uniqueCards.textContent = uniqueCardsValue.toLocaleString();
      }

      const totalValue = document.getElementById('statTotalValue');
      if (totalValue) {
        totalValue.textContent = `$${totalValueDollars.toFixed(2)}`;
      }

      const valueTrend = document.getElementById('statValueTrend');
      if (valueTrend) {
        // For now, show 0% trend (would need historical data per collection)
        const trend = 0;
        const trendIcon = trend >= 0 ? 'trending-up' : 'trending-down';
        valueTrend.innerHTML = `
        <i data-lucide="${trendIcon}" style="width: 12px;"></i>
        <span>${trend >= 0 ? '+' : ''}${trend.toFixed(1)}%</span>
      `;
        valueTrend.style.color = trend >= 0 ? '#10b981' : '#ef4444';
      }

      const cardsTrend = document.getElementById('statCardsTrend');
      if (cardsTrend) {
        // Count cards added this week
        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const weeklyCount = cards.filter(card => {
          const addedAt = new Date(card.addedAt || card.createdAt || 0).getTime();
          return addedAt >= oneWeekAgo;
        }).reduce((sum, card) => sum + (Number(card.quantity) || 1), 0);
        cardsTrend.textContent = `+${weeklyCount} this week`;
      }

      const topRarity = document.getElementById('statTopRarity');
      if (topRarity) {
        if (topRarityCard) {
          const rarityVal = topRarityCard.rarity;
          const rarityName = typeof rarityVal === 'object' ? (rarityVal.name || rarityVal.key || 'Unknown') : rarityVal;
          topRarity.textContent = rarityName || '-';
        } else {
          topRarity.textContent = '-';
        }
      }
      const planNameEl = document.getElementById('statPlanName');
      const planLimitEl = document.getElementById('statPlanLimit');
      const planHintEl = document.getElementById('statPlanHint');

      if (planNameEl || planLimitEl || planHintEl) {
        const subscription = this.state.subscription || {};
        const plan = subscription.plan;
        const quota = subscription.quota;
        const planDisplayName = plan?.planName || (plan?.planKey ? plan.planKey.toUpperCase() : 'Unknown');

        if (planNameEl) {
          planNameEl.textContent = planDisplayName;
        }

        if (planLimitEl) {
          if (quota?.isUnlimited) {
            planLimitEl.textContent = 'Unlimited';
          } else if (Number.isFinite(quota?.limit)) {
            planLimitEl.textContent = `${quota.limit.toLocaleString()} slots`;
          } else {
            planLimitEl.textContent = '—';
          }
        }

        if (planHintEl) {
          if (quota?.isUnlimited) {
            planHintEl.textContent = 'No collection limit';
          } else if (Number.isFinite(quota?.remaining)) {
            planHintEl.textContent = `${Math.max(quota.remaining, 0).toLocaleString()} variants remaining`;
          } else if (subscription.error) {
            planHintEl.textContent = 'Plan unavailable';
          } else {
            planHintEl.textContent = 'Checking quota…';
          }
        }
      }

    } catch (error) {
      console.error('CollectionPage: Error updating stats', error);
    }
  }

  updatePlanControls() {
    try {
      const addBtn = document.getElementById('addCardBtn');
      const exportBtn = document.getElementById('exportCollectionBtn');
      const subscription = this.state.subscription || {};
      const plan = subscription.plan;
      const quota = subscription.quota;

      if (addBtn) {
        const atCapacity = Boolean(quota?.willExceed);
        addBtn.disabled = atCapacity;
        addBtn.title = atCapacity
          ? `Your ${plan?.planName || plan?.planKey || 'current'} plan has reached its collection limit.`
          : '';
      }

      if (exportBtn) {
        const canExport = Boolean(plan?.features?.export_collection);
        exportBtn.disabled = !canExport;
        exportBtn.title = canExport ? '' : 'Upgrade required to export collections.';
      }
    } catch (error) {
      console.error('CollectionPage: Error updating plan controls', error);
    }
  }

  /**
   * Update grid view
   */
  updateGridView() {
    try {
      if (this.cardGrid) {
        this.cardGrid.update(this.state.sortedCards);
        this.cardGrid.updateConfig({
          cardSize: this.state.cardSize,
          consolidated: this.state.consolidated
        });
      }
    } catch (error) {
      console.error('CollectionPage: Error updating grid view', error);
    }
  }

  /**
   * Update list view
   */
  updateListView() {
    try {
      const tbody = document.getElementById('collectionTableBody');
      if (!tbody) return;

      // Clear existing rows
      tbody.innerHTML = '';

      // Add rows for each card
      this.state.sortedCards.forEach(card => {
        const row = this.createTableRow(card);
        tbody.appendChild(row);
      });

    } catch (error) {
      console.error('CollectionPage: Error updating list view', error);
    }
  }

  /**
   * Create table row for a card
   */
  createTableRow(card) {
    const row = document.createElement('tr');

    // Image
    const imgCell = document.createElement('td');
    const img = document.createElement('img');
    img.src = card.imageUrl || card.cardImageUrl || 'https://via.placeholder.com/50x70?text=No+Image';
    img.alt = card.cardName || 'Card';
    img.style.width = '50px';
    img.style.height = '70px';
    img.style.objectFit = 'cover';
    img.style.borderRadius = '4px';
    imgCell.appendChild(img);
    row.appendChild(imgCell);

    // Name
    const nameCell = document.createElement('td');
    nameCell.textContent = card.cardName || 'Unknown';
    row.appendChild(nameCell);

    // Number
    const numberCell = document.createElement('td');
    numberCell.textContent = card.cardNumber || 'N/A';
    row.appendChild(numberCell);

    // Set
    const setCell = document.createElement('td');
    setCell.textContent = card.setName || 'Unknown';
    row.appendChild(setCell);

    // Rarity
    const rarityCell = document.createElement('td');
    rarityCell.textContent = card.rarity || 'Common';
    row.appendChild(rarityCell);

    // Quantity
    const quantityCell = document.createElement('td');
    quantityCell.textContent = Number(card.quantity || 0).toLocaleString();
    row.appendChild(quantityCell);

    // Value
    const valueCell = document.createElement('td');
    valueCell.textContent = card.tcgLow ? `$${parseFloat(card.tcgLow).toFixed(2)}` : 'N/A';
    row.appendChild(valueCell);

    // Date Added
    const dateCell = document.createElement('td');
    const date = new Date(card.addedAt || card.sessionDate || Date.now());
    dateCell.textContent = date.toLocaleDateString();
    row.appendChild(dateCell);

    // Session
    const sessionCell = document.createElement('td');
    sessionCell.textContent = card.sessionName || 'Unknown';
    row.appendChild(sessionCell);

    return row;
  }

  /**
   * Show error message
   */
  showError(message) {
    if (this.container) {
      this.container.innerHTML = `
        <div class="error-state bg-neutral-900/40 backdrop-blur-sm border border-red-800/50 rounded-xl p-6">
          <i class="lucide-icon" data-lucide="alert-circle"></i>
          <h3>Error</h3>
          <p>${this.escapeHtml(message)}</p>
        </div>
      `;
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Truncate text
   */
  truncate(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
}

export default CollectionPage;
