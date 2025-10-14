/**
 * CollectionPage.js
 * Page for viewing and managing the complete card collection
 * Includes filtering, sorting, statistics, and multiple view modes
 */

import { CollectionManager } from '../services/CollectionManager.js';
import CardGrid from '../components/CardGrid.js';

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
      cardSize: 150
    };

    // Bound handlers
    this.boundHandlers = {
      handleFilterChange: this.handleFilterChange.bind(this),
      handleSortChange: this.handleSortChange.bind(this),
      handleViewToggle: this.handleViewToggle.bind(this),
      handleRefresh: this.handleRefresh.bind(this),
      handleExport: this.handleExport.bind(this),
      handleCardRemove: this.handleCardRemove.bind(this),
      handleSearchInput: this.handleSearchInput.bind(this),
      handleCardSizeChange: this.handleCardSizeChange.bind(this)
    };
  }

  /**
   * Render the page HTML
   * @returns {String} HTML string
   */
  render() {
    return `
      <div class="collection-page">
        <!-- Page Header -->
        <div class="page-header">
          <div class="page-title-section">
            <i class="lucide-icon" data-lucide="folder-open"></i>
            <div>
              <h1>Collection</h1>
              <p class="page-subtitle">View and manage your complete card collection</p>
            </div>
          </div>
          <div class="page-actions">
            <button class="btn-secondary" id="refreshCollectionBtn">
              <i class="lucide-icon" data-lucide="refresh-cw"></i>
              Refresh
            </button>
            <button class="btn-primary" id="exportCollectionBtn">
              <i class="lucide-icon" data-lucide="download"></i>
              Export
            </button>
          </div>
        </div>

        <!-- Stats Overview -->
        <div class="collection-stats-grid" id="collectionStatsGrid">
          <div class="glass-card stat-card">
            <div class="stat-icon" style="background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);">
              <i class="lucide-icon" data-lucide="package"></i>
            </div>
            <div class="stat-content">
              <div class="stat-label">Total Cards</div>
              <div class="stat-value" id="statTotalCards">0</div>
              <div class="stat-change">Across all sessions</div>
            </div>
          </div>

          <div class="glass-card stat-card">
            <div class="stat-icon" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
              <i class="lucide-icon" data-lucide="layers"></i>
            </div>
            <div class="stat-content">
              <div class="stat-label">Unique Cards</div>
              <div class="stat-value" id="statUniqueCards">0</div>
              <div class="stat-change">Different cards</div>
            </div>
          </div>

          <div class="glass-card stat-card">
            <div class="stat-icon" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
              <i class="lucide-icon" data-lucide="dollar-sign"></i>
            </div>
            <div class="stat-content">
              <div class="stat-label">Total Value</div>
              <div class="stat-value" id="statTotalValue">$0.00</div>
              <div class="stat-change">TCG Low prices</div>
            </div>
          </div>

          <div class="glass-card stat-card">
            <div class="stat-icon" style="background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);">
              <i class="lucide-icon" data-lucide="star"></i>
            </div>
            <div class="stat-content">
              <div class="stat-label">Rarest Card</div>
              <div class="stat-value" id="statRarestCard">-</div>
              <div class="stat-change" id="statRarestRarity">-</div>
            </div>
          </div>
        </div>

        <!-- Filters and Controls -->
        <div class="glass-card collection-controls">
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
            <div class="glass-card">
              <div class="table-container">
                <table class="collection-table">
                  <thead>
                    <tr>
                      <th>Image</th>
                      <th>Name</th>
                      <th>Number</th>
                      <th>Set</th>
                      <th>Rarity</th>
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
            <div class="glass-card">
              <i class="lucide-icon" data-lucide="package-x"></i>
              <h3>No Cards Found</h3>
              <p>Your collection is empty or no cards match your filters.</p>
              <p>Start adding cards from Pack Opening sessions!</p>
            </div>
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
      this.container = container;
      this.container.innerHTML = this.render();

      // Initialize CollectionManager
      if (this.app.sessionManager) {
        this.collectionManager = new CollectionManager(this.app.sessionManager);
      } else {
        console.error('CollectionPage: SessionManager not available');
        this.showError('Unable to load collection data');
        return;
      }

      // Load initial data
      await this.loadData();

      // Initialize CardGrid component
      this.initializeCardGrid();

      // Populate filters
      this.populateFilters();

      // Attach event listeners
      this.attachEvents();

      // Initialize Lucide icons
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }

      // Update display
      this.updateDisplay();

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
  async loadData() {
    try {
      // Get all cards from collection manager
      this.state.cards = this.collectionManager.getAllCards();

      // Apply filters and sorting
      this.applyFiltersAndSort();

      // Get statistics
      this.state.stats = this.collectionManager.getCollectionStats(this.state.cards);

    } catch (error) {
      console.error('CollectionPage: Error loading data', error);
      this.state.cards = [];
      this.state.filteredCards = [];
      this.state.sortedCards = [];
      this.state.stats = null;
    }
  }

  /**
   * Initialize CardGrid component
   */
  initializeCardGrid() {
    try {
      const gridContainer = document.getElementById('collectionGridView');
      if (!gridContainer) return;

      this.cardGrid = new CardGrid({
        container: gridContainer,
        cards: this.state.sortedCards,
        cardSize: this.state.cardSize,
        onRemove: this.boundHandlers.handleCardRemove,
        showRemoveButton: false, // Don't show remove in collection view
        emptyMessage: 'No cards to display'
      });

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
        sets.forEach(set => {
          const option = document.createElement('option');
          option.value = set;
          option.textContent = set;
          setFilter.appendChild(option);
        });
      }

      // Populate rarity filter
      const rarityFilter = document.getElementById('rarityFilter');
      if (rarityFilter && this.collectionManager) {
        const rarities = this.collectionManager.getUniqueRarities();
        rarities.forEach(rarity => {
          const option = document.createElement('option');
          option.value = rarity.toLowerCase();
          option.textContent = rarity;
          rarityFilter.appendChild(option);
        });
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
      if (refreshBtn) {
        refreshBtn.addEventListener('click', this.boundHandlers.handleRefresh);
      }
      if (exportBtn) {
        exportBtn.addEventListener('click', this.boundHandlers.handleExport);
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
      if (this.cardGrid && this.cardGrid.setCardSize) {
        this.cardGrid.setCardSize(size);
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
      // Show loading state
      const refreshBtn = document.getElementById('refreshCollectionBtn');
      if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = '<i class="lucide-icon" data-lucide="loader"></i> Refreshing...';
      }

      // Clear cache and reload
      if (this.collectionManager) {
        this.collectionManager.clearCache();
      }
      await this.loadData();
      this.populateFilters();
      this.updateDisplay();

      // Show success message
      if (this.app.showToast) {
        this.app.showToast('Collection refreshed', 'success');
      }

      // Restore button
      if (refreshBtn) {
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = '<i class="lucide-icon" data-lucide="refresh-cw"></i> Refresh';
        if (typeof lucide !== 'undefined') {
          lucide.createIcons();
        }
      }

    } catch (error) {
      console.error('CollectionPage: Error refreshing', error);
      if (this.app.showToast) {
        this.app.showToast('Failed to refresh collection', 'error');
      }
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
    console.log('Card remove not supported in collection view', card);
  }

  /**
   * Apply filters and sorting
   */
  applyFiltersAndSort() {
    try {
      // Apply filters
      this.state.filteredCards = this.collectionManager.filterCards(
        this.state.cards,
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

      // Update card count
      const cardCount = document.getElementById('cardCount');
      if (cardCount) {
        cardCount.textContent = this.state.sortedCards.length;
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
      if (!this.state.stats) return;

      // Total Cards
      const totalCards = document.getElementById('statTotalCards');
      if (totalCards) {
        totalCards.textContent = this.state.stats.totalCards.toLocaleString();
      }

      // Unique Cards
      const uniqueCards = document.getElementById('statUniqueCards');
      if (uniqueCards) {
        uniqueCards.textContent = this.state.stats.uniqueCards.toLocaleString();
      }

      // Total Value
      const totalValue = document.getElementById('statTotalValue');
      if (totalValue) {
        totalValue.textContent = `$${this.state.stats.totalValue.toFixed(2)}`;
      }

      // Rarest Card
      const rarestCard = document.getElementById('statRarestCard');
      const rarestRarity = document.getElementById('statRarestRarity');
      if (rarestCard && rarestRarity) {
        if (this.state.stats.rarestCard) {
          rarestCard.textContent = this.truncate(this.state.stats.rarestCard.cardName || 'Unknown', 20);
          rarestRarity.textContent = this.state.stats.rarestCard.rarity || 'Unknown';
        } else {
          rarestCard.textContent = '-';
          rarestRarity.textContent = '-';
        }
      }

    } catch (error) {
      console.error('CollectionPage: Error updating stats', error);
    }
  }

  /**
   * Update grid view
   */
  updateGridView() {
    try {
      if (this.cardGrid && this.cardGrid.updateCards) {
        this.cardGrid.updateCards(this.state.sortedCards);
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
        <div class="error-state glass-card">
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
