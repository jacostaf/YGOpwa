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
      handlePackProfitToggle: this.handlePackProfitToggle.bind(this),
      handlePackSourceChange: this.handlePackSourceChange.bind(this),
      handlePackRefresh: this.handlePackRefresh.bind(this),
      handleTabChange: this.handleTabChange.bind(this),
      handleCreateCollection: this.handleCreateCollection.bind(this),
      handleCondensedToggle: this.handleCondensedToggle.bind(this)
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
   * Handle tab switching
   */
  async handleTabChange(e) {
    const target = e.target;
    const tabId = target.dataset.tab;

    // Update active state
    this.container.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    target.classList.add('active');

    // Show/Hide views
    if (tabId === 'all-cards') {
      this.container.querySelector('#all-cards-view').style.display = 'block';
      this.container.querySelector('#my-collections-view').style.display = 'none';

      // Clear collection filter
      this.state.filters.collectionId = null;
      this.applyFiltersAndSort();
      this.updateDisplay();
    } else {
      this.container.querySelector('#all-cards-view').style.display = 'none';
      this.container.querySelector('#my-collections-view').style.display = 'block';
      await this.loadUserCollections();
    }
  }

  /**
   * Handle condensed view toggle
   */
  handleCondensedToggle(e) {
    this.state.consolidated = e.target.checked;
    this.updateGridView();
  }

  /**
   * Load and render user collections
   */
  async loadUserCollections() {
    const listContainer = this.container.querySelector('#userCollectionsList');
    listContainer.innerHTML = '<div class="loading-state">Loading collections...</div>';

    try {
      const collections = await this.collectionManager.getUserCollections();

      if (collections.length === 0) {
        listContainer.innerHTML = `
                <div class="empty-collections">
                    <i class="lucide-icon" data-lucide="folder-plus"></i>
                    <p>You haven't created any collections yet.</p>
                    <button class="btn-secondary" onclick="document.getElementById('createCollectionBtn').click()">Create One</button>
                </div>
            `;
      } else {
        listContainer.innerHTML = collections.map(col => {
          // Get cards for this collection
          // We need to match by collectionId. 
          // Note: this.state.cards contains all user cards flattened
          const collectionCards = this.state.cards.filter(c => c.collectionId === col.id);

          // Sort by price (highest first) for preview
          const sortedPreviewCards = [...collectionCards].sort((a, b) => {
            const priceA = a.pricing?.currentPrice || 0;
            const priceB = b.pricing?.currentPrice || 0;
            return priceB - priceA;
          });

          // Get top 3 cards for preview
          const previewCards = sortedPreviewCards.slice(0, 3);

          // Calculate total value
          const totalValue = collectionCards.reduce((sum, card) => sum + (card.pricing?.totalValue || 0), 0);

          // Calculate card count (sum of quantities)
          const cardCount = collectionCards.reduce((sum, card) => sum + (Number(card.quantity) || 1), 0);

          console.log('[CollectionPage] Collection:', col.name, 'Cards:', collectionCards.length, 'Value:', totalValue);

          const previewStackHtml = `
                <div class="collection-preview-stack">
                    ${previewCards.length > 0 ? previewCards.map((card, i) => {
            // Resolve image URL
            const imageUrl = card.image_url || card.image_small || card.card_images?.[0]?.image_url_small || 'https://images.ygoprodeck.com/images/cards_small/back.jpg';
            console.log('[CollectionPage] Image URL for card:', card.card?.name, imageUrl);
            return `<div class="preview-card" style="background-image: url('${imageUrl}')"></div>`;
          }).join('') : `
                        <div class="empty-preview">
                            <i class="lucide-icon" data-lucide="image"></i>
                        </div>
                    `}
                </div>
            `;

          return `
                <div class="collection-card glass-card">
                    ${previewStackHtml}
                    <div class="collection-card-header">
                        <h3>${col.name}</h3>
                        <span class="card-count">${cardCount} cards</span>
                    </div>
                    <p class="collection-desc">${col.description || 'No description'}</p>
                    <div class="collection-stats-row">
                        <span class="collection-value">${this.formatCurrency(totalValue)}</span>
                    </div>
                    <div class="collection-actions">
                        <button class="btn-sm btn-secondary view-collection-btn" data-id="${col.id}">View</button>
                        <button class="btn-sm btn-danger delete-collection-btn" data-id="${col.id}">Delete</button>
                    </div>
                </div>
            `;
        }).join('');

        // Re-initialize icons
        if (typeof lucide !== 'undefined') lucide.createIcons();

        // Add event delegation for buttons
        listContainer.onclick = (e) => {
          const viewBtn = e.target.closest('.view-collection-btn');
          const deleteBtn = e.target.closest('.delete-collection-btn');

          if (viewBtn) {
            const id = viewBtn.dataset.id;
            console.log('View collection:', id);

            // Update filter state
            this.state.filters.collectionId = id;

            // Manually switch to All Cards tab UI without triggering click event
            // This prevents handleTabChange from clearing our filter
            const allCardsTab = this.container.querySelector('[data-tab="all-cards"]');
            const myCollectionsTab = this.container.querySelector('[data-tab="my-collections"]');

            if (allCardsTab && myCollectionsTab) {
              allCardsTab.classList.add('active');
              myCollectionsTab.classList.remove('active');
            }

            this.container.querySelector('#all-cards-view').style.display = 'block';
            this.container.querySelector('#my-collections-view').style.display = 'none';

            // Apply filters immediately
            this.applyFiltersAndSort();
            this.updateDisplay();

            this.app.showToast(`Viewing collection`, 'info');
          } else if (deleteBtn) {
            // ... delete logic
            const id = deleteBtn.dataset.id;
            if (confirm('Are you sure you want to delete this collection?')) {
              this.collectionManager.deleteCollection(id).then(() => {
                this.loadUserCollections();
              });
            }
          }
        };
      }
    } catch (error) {
      console.error('Error loading collections:', error);
      listContainer.innerHTML = '<div class="error-state">Failed to load collections</div>';
    }
  }

  /**
   * Handle create collection
   */
  async handleCreateCollection() {
    const name = prompt('Enter collection name:');
    if (!name) return;

    const description = prompt('Enter description (optional):');

    try {
      await this.collectionManager.createCollection(name, description);
      await this.loadUserCollections();
      this.app.showToast('Collection created!', 'success');
    } catch (error) {
      console.error('Error creating collection:', error);
      this.app.showToast('Failed to create collection', 'error');
    }
  }

  /**
   * Render the page HTML
   * @returns {String} HTML string
   */
  render() {
    return `
      <div class="collection-page">
        <!-- Tabs (Segmented Control) -->
        <div class="collection-tabs">
            <button class="tab-btn active" data-tab="all-cards">All Cards</button>
            <button class="tab-btn" data-tab="my-collections">My Collections</button>
        </div>

        <!-- All Cards View -->
        <div id="all-cards-view">

        <!-- Stats Overview (Compact) -->
        <div class="collection-stats-grid" id="collectionStatsGrid">
          <div class="stat-card">
            <div class="stat-header">
                <div class="stat-icon" style="background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);">
                    <i class="lucide-icon" data-lucide="package"></i>
                </div>
                <div class="stat-label">Total Cards</div>
            </div>
            <div class="stat-value" id="statTotalCards">0</div>
          </div>

          <div class="stat-card">
            <div class="stat-header">
                <div class="stat-icon" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                    <i class="lucide-icon" data-lucide="layers"></i>
                </div>
                <div class="stat-label">Unique</div>
            </div>
            <div class="stat-value" id="statUniqueCards">0</div>
          </div>

          <div class="stat-card">
            <div class="stat-header">
                <div class="stat-icon" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
                    <i class="lucide-icon" data-lucide="dollar-sign"></i>
                </div>
                <div class="stat-label">Value</div>
            </div>
            <div class="stat-value" id="statTotalValue">$0.00</div>
          </div>

          <div class="stat-card">
            <div class="stat-header">
                <div class="stat-icon" style="background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);">
                    <i class="lucide-icon" data-lucide="star"></i>
                </div>
                <div class="stat-label">Best Pull</div>
            </div>
            <div class="stat-value" id="statRarestCard">-</div>
            <div class="stat-change" id="statRarestRarity" style="font-size: 0.7rem; opacity: 0.8;">-</div>
          </div>

          <div class="stat-card" id="planQuotaCard">
            <div class="stat-header">
                <div class="stat-icon" style="background: linear-gradient(135deg, #14b8a6 0%, #0f766e 100%);">
                    <i class="lucide-icon" data-lucide="shield-check"></i>
                </div>
                <div class="stat-label" id="statPlanName">Plan</div>
            </div>
            <div class="stat-value" id="statPlanLimit" style="font-size: 1.2rem;">Loading…</div>
          </div>
        </div>

        <!-- Filters and Controls -->
        <div class="bg-neutral-900/40 backdrop-blur-sm border border-neutral-800/50 rounded-xl collection-controls">
          <div class="controls-section">
            <h3>
              <i class="lucide-icon" data-lucide="filter"></i>
              Filters & Sort
            </h3>

            <div class="controls-grid">
              <!-- Search -->
              <div class="form-group">
                <label for="searchInput">
                  <i class="lucide-icon" data-lucide="search"></i>
                  Search
                </label>
                <input
                  type="text"
                  id="searchInput"
                  placeholder="Card name or number..."
                  class="form-input"
                />
              </div>

              <!-- Set Filter -->
              <div class="form-group">
                <label for="setFilter">
                  <i class="lucide-icon" data-lucide="book"></i>
                  Card Set
                </label>
                <select id="setFilter" class="form-select">
                  <option value="all">All Sets</option>
                </select>
              </div>

              <!-- Rarity Filter -->
              <div class="form-group">
                <label for="rarityFilter">
                  <i class="lucide-icon" data-lucide="gem"></i>
                  Rarity
                </label>
                <select id="rarityFilter" class="form-select">
                  <option value="all">All Rarities</option>
                </select>
              </div>

              <!-- Sort By -->
              <div class="form-group">
                <label for="sortBy">
                  <i class="lucide-icon" data-lucide="arrow-up-down"></i>
                  Sort By
                </label>
                <select id="sortBy" class="form-select">
                  <option value="date">Date Added</option>
                  <option value="name">Card Name</option>
                  <option value="value">Card Value</option>
                  <option value="rarity">Rarity</option>
                  <option value="number">Card Number</option>
                </select>
              </div>

              <!-- Sort Order -->
              <div class="form-group">
                <label for="sortOrder">
                  <i class="lucide-icon" data-lucide="sort-asc"></i>
                  Order
                </label>
                <select id="sortOrder" class="form-select">
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>

              <!-- View Mode -->
              <div class="form-group">
                <label>
                  <i class="lucide-icon" data-lucide="layout-grid"></i>
                  View
                </label>
                <div class="view-toggles">
                  <button class="view-btn active" data-view="grid" title="Grid View">
                    <i class="lucide-icon" data-lucide="grid"></i>
                  </button>
                  <button class="view-btn" data-view="list" title="List View">
                    <i class="lucide-icon" data-lucide="list"></i>
                  </button>
                </div>
              </div>

              <!-- Condensed Toggle -->
              <div class="form-group">
                <label for="condensedToggle">
                  <i class="lucide-icon" data-lucide="layers"></i>
                  Condensed
                </label>
                <label class="inline-toggle">
                  <input type="checkbox" id="condensedToggle" class="form-checkbox rounded">
                  <span>Group Cards</span>
                </label>
              </div>
                  <i class="lucide-icon" data-lucide="layout-grid"></i>
                  View Mode
                </label>
                <div class="view-toggle-group">
                  <button class="view-toggle-btn active" data-view="grid" id="viewGridBtn">
                    <i class="lucide-icon" data-lucide="grid-3x3"></i>
                    Grid
                  </button>
                  <button class="view-toggle-btn" data-view="list" id="viewListBtn">
                    <i class="lucide-icon" data-lucide="list"></i>
                    List
                  </button>
                </div>
              </div>
            </div>

            <!-- Card Size Slider (Grid View Only) -->
            <div class="form-group" id="cardSizeSliderGroup">
              <label for="cardSizeSlider">
                <i class="lucide-icon" data-lucide="maximize"></i>
                Card Size: <span id="cardSizeValue">150px</span>
              </label>
              <input
                type="range"
                id="cardSizeSlider"
                min="100"
                max="250"
                value="150"
                class="slider"
              />
            </div>
          </div>
        </div>

        <!-- Collection Display -->
        <div class="collection-display">
          <div class="collection-header">
            <h3>
              <i class="lucide-icon" data-lucide="package"></i>
              Cards (<span id="cardCount">0</span>)
            </h3>
          </div>

          <!-- Grid View -->
          <div id="collectionGridView" class="collection-grid-view">
            <!-- CardGrid component will be mounted here -->
          </div>

          <!-- List View -->
          <div id="collectionListView" class="collection-list-view" style="display: none;">
            <div class="bg-neutral-900/40 backdrop-blur-sm border border-neutral-800/50 rounded-xl">
              <div class="table-container">
                <table class="collection-table">
                  <thead>
                    <tr>
                      <th>Image</th>
                      <th>Name</th>
                      <th>Number</th>
                      <th>Set</th>
                      <th>Rarity</th>
                      <th>Quantity</th>
                      <th>Value</th>
                      <th>Date Added</th>
                      <th>Session</th>
                    </tr>
                  </thead>
                  <tbody id="collectionTableBody">
                    <!-- Table rows will be inserted here -->
                  </tbody>
                </table>
              </div>
          </div>
        </div>

        <!-- Empty State -->
        <div id="emptyState" class="empty-state" style="display: none;">
            <div class="bg-neutral-900/40 backdrop-blur-sm border border-neutral-800/50 rounded-xl">
              <i class="lucide-icon" data-lucide="package-x"></i>
              <h3>No Cards Found</h3>
              <p>Your collection is empty or no cards match your filters.</p>
              <p>Start adding cards from Pack Opening sessions!</p>
            </div>
          </div>
        </div>

        <!-- Pack Performance -->
        <div class="pack-performance-section">
          <div class="section-header">
            <div class="section-title">
              <i class="lucide-icon" data-lucide="trending-up"></i>
              <div>
                <h3>Pack Performance</h3>
                <p class="section-subtitle">ROI metrics based on your recorded pack events</p>
              </div>
            </div>
            <div class="section-actions">
              <button class="btn-secondary btn-sm" id="refreshPackHistoryBtn">
                <i class="lucide-icon" data-lucide="refresh-cw"></i>
                Refresh
              </button>
            </div>
          </div>

          <div class="pack-insights-grid" id="packInsightsGrid">
            <div class="pack-insight-card bg-neutral-900/40 backdrop-blur-sm border border-neutral-800/50 rounded-xl">
              <div class="insight-header">
                <i class="lucide-icon" data-lucide="line-chart"></i>
                <span>Lifetime Gain</span>
              </div>
              <div class="insight-value" id="packTotalGain">$0.00</div>
              <div class="insight-subtitle" id="packProfitableCount">0 profitable packs</div>
            </div>

            <div class="pack-insight-card bg-neutral-900/40 backdrop-blur-sm border border-neutral-800/50 rounded-xl">
              <div class="insight-header">
                <i class="lucide-icon" data-lucide="wallet"></i>
                <span>Net vs Pack Cost</span>
              </div>
              <div class="insight-value" id="packNetGain">$0.00</div>
              <div class="insight-subtitle" id="packTotalSpend">Total spend $0.00</div>
            </div>

            <div class="pack-insight-card bg-neutral-900/40 backdrop-blur-sm border border-neutral-800/50 rounded-xl">
              <div class="insight-header">
                <i class="lucide-icon" data-lucide="percent"></i>
                <span>Average ROI</span>
              </div>
              <div class="insight-value" id="packAverageRoi">—</div>
              <div class="insight-subtitle" id="packVisiblePacks">Based on visible history</div>
            </div>

            <div class="pack-insight-card bg-neutral-900/40 backdrop-blur-sm border border-neutral-800/50 rounded-xl">
              <div class="insight-header">
                <i class="lucide-icon" data-lucide="star"></i>
                <span>Most Valuable Pull</span>
              </div>
              <div class="insight-value" id="packBestPullValue">—</div>
              <div class="insight-subtitle" id="packBestPullName">Log more pack events to surface highlights</div>
            </div>
          </div>

          <div class="pack-history-panel bg-neutral-900/40 backdrop-blur-sm border border-neutral-800/50 rounded-xl">
            <div class="pack-history-header">
              <div>
                <h4>Pack History</h4>
                <p class="section-subtitle">Compare pack-time prices with current valuations</p>
              </div>
              <div class="pack-history-filters">
                <label class="inline-toggle">
                  <input type="checkbox" id="packProfitableToggle" class="form-checkbox rounded">
                  <span>Profitable only</span>
                </label>
                <select id="packSourceFilter" class="form-select form-select-sm">
                  <option value="all">All Sources</option>
                  <option value="pack">Booster Pack</option>
                  <option value="purchase">Single Purchase</option>
                  <option value="trade">Trade</option>
                  <option value="gift">Gift</option>
                  <option value="reward">Reward</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div id="packHistoryError" class="pack-history-error" style="display: none;"></div>

            <div class="table-container pack-history-table-container">
              <table class="pack-history-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Set</th>
                    <th>Cards</th>
                    <th>Pack Value</th>
                    <th>Current Value</th>
                    <th>Gain</th>
                    <th>ROI</th>
                    <th>Net vs Cost</th>
                  </tr>
                </thead>
                <tbody id="packHistoryTableBody">
                  <tr class="loading-row">
                    <td colspan="8">Loading pack history...</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div id="packHistoryEmpty" class="pack-history-empty" style="display: none;">
              <i class="lucide-icon" data-lucide="archive-restore"></i>
              <p>No pack events recorded yet.</p>
              <p>Open packs and sync them to Supabase to unlock ROI insights.</p>
            </div>
          </div>
        </div>
      </div> <!-- End All Cards View -->

      <!-- My Collections View -->
      <div id="my-collections-view" style="display: none;">
        <div class="collections-header">
            <h2>My Collections</h2>
            <button class="btn-primary" id="createCollectionBtn">
                <i class="lucide-icon" data-lucide="plus-circle"></i>
                New Collection
            </button>
        </div>
        <div id="userCollectionsList" class="user-collections-grid">
            <!-- Collections will be loaded here -->
            <div class="loading-state">Loading collections...</div>
        </div>
      </div>

      </div>
    `;
  }

  /**
   * Mount header actions to the global page header
   */
  mountHeaderActions() {
    const headerActions = document.getElementById('page-header-actions');
    if (!headerActions) return;

    // Create container for collection actions
    const actionContainer = document.createElement('div');
    actionContainer.id = 'collection-header-actions';
    actionContainer.className = 'flex items-center gap-2';

    actionContainer.innerHTML = `
      <button class="btn-secondary" id="refreshCollectionBtn">
        <i class="lucide-icon" data-lucide="refresh-cw"></i>
        <span class="hidden sm:inline">Refresh</span>
      </button>
      <button class="btn-primary" id="addCardBtn">
        <i class="lucide-icon" data-lucide="plus"></i>
        <span class="hidden sm:inline">Add Card</span>
      </button>
      <button class="btn-primary" id="exportCollectionBtn">
        <i class="lucide-icon" data-lucide="download"></i>
        <span class="hidden sm:inline">Export</span>
      </button>
    `;

    // Insert before auth container if it exists, otherwise append
    const authContainer = document.getElementById('auth-container');
    if (authContainer) {
      headerActions.insertBefore(actionContainer, authContainer);
    } else {
      headerActions.appendChild(actionContainer);
    }
  }

  /**
   * Unmount header actions
   */
  unmountHeaderActions() {
    const actionContainer = document.getElementById('collection-header-actions');
    if (actionContainer) {
      actionContainer.remove();
    }
  }

  /**
   * Mount the page
   * @param {HTMLElement} container - Container element
   */
  async mount(container) {
    try {
      this.container = container;
      this.container.innerHTML = this.render();

      // Initialize CollectionManager (Supabase-backed, session fallback)
      this.collectionManager = new CollectionManager(this.app?.sessionManager || null);

      // Subscribe to price updates
      this.collectionManager.subscribe('priceUpdate', this.handlePriceUpdate.bind(this));

      // Mount header actions
      this.mountHeaderActions();

      // Attach event listeners immediately
      this.attachEvents();

      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }

      // Load initial data from Supabase
      await this.loadData({ initial: true });
      await this.loadPackInsights({ initial: true });

    } catch (error) {
      console.error('CollectionPage: Error mounting', error);
      this.showError('Failed to load collection page');
    }
  }

  /**
   * Unmount the page
   */
  unmount() {
    try {
      // Cleanup CardGrid
      if (this.cardGrid) {
        this.cardGrid.destroy?.();
        this.cardGrid = null;
      }

      // Remove event listeners
      this.removeEvents();

      // Unmount header actions
      this.unmountHeaderActions();

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
      this.state.isLoading = true;
      if (!silent) {
        this.toggleLoadingIndicator(true);
      }

      const user = authService.getUser();
      console.log('CollectionPage: user check', user);

      if (!user) {
        console.log('CollectionPage: Guest mode');
        // Guest mode: use local session cards only
        this.state.cards = this.collectionManager.getAllCards();
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
        this.state.isLoading = false;
        if (!silent) this.toggleLoadingIndicator(false);
        return;
      }

      // Authenticated mode
      console.log('CollectionPage: loadData (v2 fix) - Authenticated');
      // Use CollectionManager to fetch cards (compatible with current schema)
      const cards = await this.collectionManager.getAllUserCards();

      // Mock summary and plan for now as views might be missing
      const summaryResult = { summary: null, error: null };
      const planResult = { plan: null, error: null };

      // Transform not needed as getAllUserCards returns compatible format
      // But we might need to filter boolean
      const validCards = cards.filter(Boolean);

      this.state.cards = validCards;
      this.collectionManager.setExternalCards(validCards, { ttl: Number.MAX_SAFE_INTEGER });

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

      this.updateDisplay();
      this.updatePlanControls();
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
      const gridContainer = document.getElementById('collectionGridView');
      if (!gridContainer) return;

      // Clear container
      gridContainer.innerHTML = '';

      this.cardGrid = new CardGrid({
        cards: this.state.sortedCards,
        cardSize: this.state.cardSize,
        onRemoveCard: this.boundHandlers.handleCardRemove,
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
  populateFilters() {
    try {
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
      // Filter changes
      const searchInput = document.getElementById('searchInput');
      const setFilter = document.getElementById('setFilter');
      const rarityFilter = document.getElementById('rarityFilter');
      const sortBy = document.getElementById('sortBy');
      const sortOrder = document.getElementById('sortOrder');

      if (searchInput) {
        searchInput.addEventListener('input', this.boundHandlers.handleSearchInput);
      }

      const condensedToggle = document.getElementById('condensedToggle');
      if (condensedToggle) {
        condensedToggle.addEventListener('change', this.boundHandlers.handleCondensedToggle);
      }
      if (setFilter) {
        setFilter.addEventListener('change', this.boundHandlers.handleFilterChange);
      }
      if (rarityFilter) {
        rarityFilter.addEventListener('change', this.boundHandlers.handleFilterChange);
      }
      if (sortBy) {
        sortBy.addEventListener('change', this.boundHandlers.handleSortChange);
      }
      if (sortOrder) {
        sortOrder.addEventListener('change', this.boundHandlers.handleSortChange);
      }

      // View toggle
      const viewGridBtn = document.getElementById('viewGridBtn');
      const viewListBtn = document.getElementById('viewListBtn');
      if (viewGridBtn) {
        viewGridBtn.addEventListener('click', () => this.boundHandlers.handleViewToggle('grid'));
      }
      if (viewListBtn) {
        viewListBtn.addEventListener('click', () => this.boundHandlers.handleViewToggle('list'));
      }

      // Card size slider
      const cardSizeSlider = document.getElementById('cardSizeSlider');
      if (cardSizeSlider) {
        cardSizeSlider.addEventListener('input', this.boundHandlers.handleCardSizeChange);
      }

      // Action buttons
      const refreshBtn = document.getElementById('refreshCollectionBtn');
      const exportBtn = document.getElementById('exportCollectionBtn');
      const addBtn = document.getElementById('addCardBtn');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', this.boundHandlers.handleRefresh);
      }
      if (exportBtn) {
        exportBtn.addEventListener('click', this.boundHandlers.handleExport);
      }
      if (addBtn) {
        addBtn.addEventListener('click', this.boundHandlers.handleAddCard);
      }

      const packProfitableToggle = document.getElementById('packProfitableToggle');
      const packSourceFilter = document.getElementById('packSourceFilter');
      const refreshPackHistoryBtn = document.getElementById('refreshPackHistoryBtn');

      if (packProfitableToggle) {
        packProfitableToggle.addEventListener('change', this.boundHandlers.handlePackProfitToggle);
      }
      if (packSourceFilter) {
        packSourceFilter.addEventListener('change', this.boundHandlers.handlePackSourceChange);
      }
      if (refreshPackHistoryBtn) {
        refreshPackHistoryBtn.addEventListener('click', this.boundHandlers.handlePackRefresh);
      }

      // Tab switching
      const tabBtns = this.container.querySelectorAll('.tab-btn');
      tabBtns.forEach(btn => {
        btn.addEventListener('click', this.boundHandlers.handleTabChange);
      });

      // Create collection button
      const createCollectionBtn = document.getElementById('createCollectionBtn');
      if (createCollectionBtn) {
        createCollectionBtn.addEventListener('click', this.boundHandlers.handleCreateCollection);
      }

    } catch (error) {
      console.error('CollectionPage: Error attaching events', error);
    }
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
      const searchInput = document.getElementById('searchInput');

      this.state.filters = {
        set: setFilter?.value || 'all',
        rarity: rarityFilter?.value || 'all',
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
  handleCardRemove(card) {
    this.handleRemoveCardAsync(card);
  }

  async handleRemoveCardAsync(card) {
    if (!card || !card.cardVariantId) {
      return;
    }

    const quantity = Number(card.quantity) || 0;
    if (quantity === 0) {
      return;
    }

    const confirmRemoval = window.confirm(
      `Remove all ${quantity} copie${quantity === 1 ? '' : 's'} of ${card.cardName || 'this card'}?`
    );

    if (!confirmRemoval) {
      return;
    }

    this.setMutating(true);
    const rollback = this.applyOptimisticMutation({
      cardVariantId: card.cardVariantId,
      quantityDelta: -quantity,
      pricePerUnit: Number(card.tcgLow) || 0,
    });

    try {
      const { error } = await removeCollectionQuantity({
        cardVariantId: card.cardVariantId,
        quantityDelta: quantity,
      });

      if (error) {
        rollback();
        if (this.app?.showToast) {
          this.app.showToast(error.message || 'Failed to remove card', 'error');
        }
        return;
      }

      await this.refreshSummary();

      if (this.app?.showToast) {
        this.app.showToast('Card removed from collection', 'success');
      }
    } catch (error) {
      console.error('CollectionPage: Error removing card', error);
      rollback();
      if (this.app?.showToast) {
        this.app.showToast('Failed to remove card', 'error');
      }
    } finally {
      this.setMutating(false);
    }
  }

  async handleAddCard() {
    const quota = this.state.subscription?.quota;
    const planName = this.state.subscription?.plan?.planName || this.state.subscription?.plan?.planKey || 'current';

    if (quota && quota.willExceed) {
      if (this.app?.showToast) {
        this.app.showToast(`Your ${planName} plan has reached its collection limit. Upgrade to add more variants.`, 'warning');
      }
      return;
    }

    const slugInput = prompt('Enter card slug (e.g., blue-eyes-white-dragon-lob-001-1st)');
    if (!slugInput) {
      return;
    }

    const quantityInput = prompt('How many copies are you adding?', '1');
    const quantity = Number(quantityInput);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      if (this.app?.showToast) {
        this.app.showToast('Quantity must be a positive number', 'warning');
      }
      return;
    }

    this.setMutating(true);

    let rollback = () => { };

    try {
      const { cardVariantId, error: resolveError } = await resolveCardVariantId(slugInput.trim());
      if (resolveError || !cardVariantId) {
        if (this.app?.showToast) {
          this.app.showToast(resolveError?.message || 'Unable to resolve card slug', 'error');
        }
        return;
      }

      const provisionalCard = {
        cardVariantId,
        cardName: slugInput.trim(),
        name: slugInput.trim(),
        cardNumber: null,
        setName: null,
        setCode: null,
        rarity: null,
        rarityKey: null,
        quantity,
        tcgLow: 0,
        tcgMarket: 0,
        totalValue: 0,
        addedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sessionDate: new Date().toISOString(),
        sessionName: 'Pending',
        notes: null,
      };

      rollback = this.applyOptimisticMutation({
        cardVariantId,
        quantityDelta: quantity,
        provisionalCard,
      });

      const { item, error } = await upsertCollectionItem({
        cardVariantId,
        quantityDelta: quantity,
        changeType: 'add',
        source: 'manual',
      });

      if (error) {
        rollback();
        if (this.app?.showToast) {
          if (error.code === 'PLAN_LIMIT_REACHED') {
            const exceededPlan = error.details?.planKey || planName;
            this.app.showToast(
              `Collection limit reached for the ${exceededPlan} plan. Upgrade to add more cards.`,
              'warning'
            );
          } else {
            this.app.showToast(error.message || 'Failed to add card', 'error');
          }
        }
        this.updatePlanControls();
        return;
      }

      if (item) {
        this.mergeCollectionItem(item);
      } else {
        await this.loadData({ silent: true });
      }

      await this.refreshSummary();

      if (this.app?.showToast) {
        this.app.showToast('Card added to collection', 'success');
      }

      this.updatePlanControls();

    } catch (error) {
      console.error('CollectionPage: Error adding card', error);
      rollback();
      if (this.app?.showToast) {
        this.app.showToast('Failed to add card', 'error');
      }
    } finally {
      this.setMutating(false);
    }
  }

  /**
   * Apply filters and sorting
   */
  applyFiltersAndSort() {
    try {
      let filtered = [...this.state.cards];

      // Filter by Collection ID (if set)
      // Filter by Collection ID (if set)
      if (this.state.filters.collectionId) {
        console.log('[CollectionPage] Filtering by collectionId:', this.state.filters.collectionId);

        // Debug first card to see structure
        if (filtered.length > 0) {
          console.log('[CollectionPage] First card structure:', filtered[0]);
          console.log('[CollectionPage] First card collectionId:', filtered[0].collectionId, typeof filtered[0].collectionId);
        }

        // We need to check if the card belongs to the collection
        // Since we flattened the cards in getAllUserCards, we might not have the collection ID directly on the card object
        // Let's check how we mapped it in CollectionManager.js
        // Use loose equality to handle string/number mismatches
        filtered = filtered.filter(card => String(card.collectionId) === String(this.state.filters.collectionId));
        console.log('[CollectionPage] After collectionId filter:', filtered.length);
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
      const emptyState = document.getElementById('emptyState');
      const gridView = document.getElementById('collectionGridView');
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
   * Update statistics display
   */
  updateStats() {
    try {
      const stats = this.state.stats || {};
      const summary = this.state.summary || {};

      const totalCardsSource = summary.totalQuantity ?? stats.totalCards ?? 0;
      const totalValueSource = summary.totalMarketValue ?? stats.totalValue ?? 0;
      const uniqueCardsSource = stats.uniqueCards ?? this.getUniqueCardCount();

      const totalCardsValue = Number.isFinite(Number(totalCardsSource)) ? Number(totalCardsSource) : 0;
      const totalValueDollars = Number.isFinite(Number(totalValueSource)) ? Number(totalValueSource) : 0;
      const uniqueCardsValue = Number.isFinite(Number(uniqueCardsSource)) ? Number(uniqueCardsSource) : 0;

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

      const rarestCardNode = document.getElementById('statRarestCard');
      const rarestRarity = document.getElementById('statRarestRarity');
      if (rarestCardNode && rarestRarity) {
        if (stats.rarestCard) {
          rarestCardNode.textContent = this.truncate(stats.rarestCard.cardName || 'Unknown', 20);
          rarestRarity.textContent = stats.rarestCard.rarity || 'Unknown';
        } else {
          rarestCardNode.textContent = '-';
          rarestRarity.textContent = '-';
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
