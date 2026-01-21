/**
 * PackOpeningPage.js - COMPACT VERSION
 *
 * Pack opening page with voice recognition and session management
 * Features:
 * - Compact collapsible controls for maximum card display space
 * - Set selection with search and filtering (992+ sets)
 * - Voice recognition controls with animation
 * - Session management (add/remove cards, export/import)
 * - Card grid display with responsive layout
 * - Real-time stats tracking
 * - Glassmorphism styling
 */

import CardGrid from '../components/CardGrid.js';
import IconLoader from '../utils/IconLoader.js';
import CollectionManager from '../services/CollectionManager.js';
import { authService } from '../services/authService.js';

export default class PackOpeningPage {
  constructor(router) {
    this.router = router;
    this.container = null;

    // Service references (will be set from global app)
    this.sessionManager = null;
    this.voiceEngine = null;
    this.collectionManager = null;

    // Component instances
    this.cardGrid = null;

    // State
    this.cardSets = [];
    this.filteredSets = [];
    this.currentSession = null;
    this.isSessionActive = false;
    this.isStartingSession = false;
    this.isVoiceListening = false;
    this.consolidatedView = false;
    this.cardSize = 120;
    this.selectedSetId = null;  // Legacy - kept for single-set compatibility
    this.selectedSetIds = [];   // Multi-set: array of selected set IDs
    this.selectedSets = [];     // Multi-set: array of selected set objects

    // Event listeners
    this.boundHandlers = {
      handleVoiceResult: this.handleVoiceResult.bind(this),
      handleVoiceStatus: this.handleVoiceStatus.bind(this),
      handleVoiceError: this.handleVoiceError.bind(this),
      handleSessionUpdate: this.handleSessionUpdate.bind(this),
      handleAddToCollection: this.handleAddToCollection.bind(this)
    };
  }

  /**
   * Initialize services and load data
   * @private
   */
  async initialize() {
    try {
      // Get global app instances
      this.sessionManager = window.app?.sessionManager || null;
      this.voiceEngine = window.app?.voiceEngine || null;
      this.collectionManager = new CollectionManager(this.sessionManager);

      if (!this.sessionManager) {
        console.warn('SessionManager not available');
      }

      if (!this.voiceEngine) {
        console.warn('VoiceEngine not available');
      }

      // Load card sets
      await this.loadCardSets();

      console.log('PackOpeningPage initialized');
    } catch (error) {
      console.error('Error initializing PackOpeningPage:', error);
    }
  }

  /**
   * Load card sets from API
   * @private
   */
  async loadCardSets() {
    try {
      if (!this.sessionManager) {
        console.warn('Cannot load card sets: SessionManager not available');
        return;
      }

      // Reuse cached sets when available to avoid repeat heavy work during navigation
      if (!Array.isArray(this.sessionManager.cardSets) || this.sessionManager.cardSets.length === 0) {
        await this.sessionManager.loadCardSets();
      }

      const rawSets = Array.isArray(this.sessionManager.cardSets) ? this.sessionManager.cardSets : [];
      this.cardSets = this.sortCardSets(rawSets);
      this.filteredSets = [...this.cardSets];

      this.clearSelectedSet({ updateInput: true });
      this.populateHiddenSelect();

      // Update UI
      this.renderSetSuggestions();
      this.updateSetCounts();
      this.updateButtons();
      this.hideSuggestions();

      console.log(`Loaded ${this.cardSets.length} card sets`);
    } catch (error) {
      console.error('Error loading card sets:', error);
      const fallbackMessage = 'Failed to load card sets. Please refresh and try again.';
      this.showError(error?.message || fallbackMessage);
    }
  }

  /**
   * Render the page - Two-column layout with sidebar
   * @returns {string} HTML string
   */
  render() {
    return `
      <div class="page-content pack-opening-page pack-layout">

        <!-- Left: Controls Panel -->
        <aside class="pack-sidebar">
          <!-- Set Search (Multi-Select) -->
          <div class="sidebar-section">
            <div class="set-multi-select">
              <!-- Selected Sets as Chips -->
              <div id="selected-sets-chips" class="set-chips-container"></div>

              <!-- Search Input -->
              <div class="set-autocomplete">
                <div class="set-input">
                  <i data-lucide="Search" class="field-icon"></i>
                  <input
                    type="text"
                    id="set-search"
                    class="set-input-field"
                    placeholder="Add sets..."
                    autocomplete="off"
                    aria-label="Search and add card sets"
                  >
                  <button type="button" class="set-input-clear" id="clear-set-search" aria-label="Clear search">
                    <i data-lucide="X"></i>
                  </button>
                </div>
                <div id="set-suggestions" class="set-suggestions" role="listbox"></div>
                <select id="set-select" class="visually-hidden" aria-hidden="true" tabindex="-1"></select>
              </div>
            </div>
            <div class="set-meta-inline">
              <span class="text-xs text-neutral-500"><span id="sets-count">0</span>/<span id="total-sets-count">0</span></span>
              <button id="refresh-sets-btn" class="icon-btn-xs" type="button" title="Refresh">
                <i data-lucide="refresh-cw"></i>
              </button>
            </div>
          </div>

          <!-- Session Actions -->
          <div class="sidebar-section">
            <div class="session-buttons">
              <button id="start-session-btn" class="btn btn-primary btn-pulse-ready w-full" type="button" disabled>
                <i data-lucide="package-open"></i>
                <span>Rip Pack</span>
              </button>
              <button id="stop-session-btn" class="btn btn-danger w-full hidden" type="button">
                <i data-lucide="square"></i>
                <span>Stop Session</span>
              </button>
              <button id="swap-set-btn" class="btn btn-secondary w-full hidden" type="button">
                <i data-lucide="refresh-ccw"></i>
                <span>Swap Set</span>
              </button>
            </div>
          </div>

          <!-- Voice Control -->
          <div class="sidebar-section voice-section">
            <div class="voice-header">
              <span class="status-dot status-dot-secondary" id="voice-indicator"></span>
              <span class="voice-label" id="voice-status-text">Voice Ready</span>
            </div>
            <div class="voice-buttons">
              <button id="start-voice-btn" class="btn btn-sm flex-1" type="button" disabled>
                <i data-lucide="Mic"></i> Listen
              </button>
              <button id="stop-voice-btn" class="btn btn-danger btn-sm flex-1 hidden" type="button">
                <i data-lucide="Square"></i> Stop
              </button>
              <button id="test-voice-btn" class="icon-btn-sm" type="button" title="Test">
                <i data-lucide="test-tube"></i>
              </button>
            </div>
          </div>

          <!-- Session Stats -->
          <div class="sidebar-section stats-section">
            <div class="stat-row">
              <span class="stat-key">Set</span>
              <span class="stat-val truncate" id="current-set" title="None">None</span>
            </div>
            <div class="stat-row">
              <span class="stat-key">Cards</span>
              <span class="stat-val" id="cards-count">0</span>
            </div>
            <div class="stat-row">
              <span class="stat-key">Market</span>
              <span class="stat-val text-green-400" id="tcg-market-total">$0.00</span>
            </div>
            <div class="stat-row">
              <span class="stat-key">Low</span>
              <span class="stat-val" id="tcg-low-total">$0.00</span>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="sidebar-section sidebar-actions">
            <button id="add-to-collection-btn" class="btn btn-primary btn-sm w-full" type="button" disabled>
              <i data-lucide="plus-circle"></i> Add to Collection
            </button>
            <div class="action-row">
              <button id="export-session-btn" class="icon-btn-sm" type="button" disabled title="Export">
                <i data-lucide="Download"></i>
              </button>
              <button id="import-session-btn" class="icon-btn-sm" type="button" title="Import">
                <i data-lucide="Upload"></i>
              </button>
              <button id="clear-session-btn" class="icon-btn-sm" type="button" disabled title="Clear">
                <i data-lucide="Trash2"></i>
              </button>
              <button id="refresh-pricing-btn" class="icon-btn-sm" type="button" disabled title="Refresh Prices">
                <i data-lucide="refresh-cw"></i>
              </button>
              <button id="pack-settings-btn" class="icon-btn-sm" type="button" title="Settings">
                <i data-lucide="Settings"></i>
              </button>
            </div>
          </div>
        </aside>

        <!-- Right: Cards Area -->
        <main class="pack-main">
          <div class="pack-toolbar">
            <label class="toggle-compact">
              <input type="checkbox" id="consolidated-view-toggle">
              <span>Consolidated</span>
            </label>
            <div class="size-slider">
              <i data-lucide="Minimize2" class="slider-icon"></i>
              <input type="range" id="card-size-slider" min="80" max="200" value="120" step="10">
              <i data-lucide="Maximize2" class="slider-icon"></i>
              <span id="card-size-value" class="size-val">120</span>
            </div>
          </div>

          <div class="cards-area">
            <div id="session-cards" class="card-grid-container">
              <div class="empty-state">
                <i data-lucide="package-open"></i>
                <p>Select a set and start ripping</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    `;
  }

  /**
   * Update set select dropdown
   * @private
   */
  renderSetSuggestions() {
    const suggestionsEl = this.container?.querySelector('#set-suggestions');
    if (!suggestionsEl) return;

    const suggestions = this.filteredSets;

    if (!suggestions.length) {
      suggestionsEl.innerHTML = '<div class="set-suggestion empty">No sets found</div>';
      suggestionsEl.dataset.items = '0';
      return;
    }

    suggestionsEl.innerHTML = suggestions.map(set => `
      <button type="button" class="set-suggestion" data-set-id="${set.id}" role="option">
        <span class="set-name">${this.escapeHtml(set.name || set.id)}</span>
        <span class="set-code">${this.escapeHtml(set.code || set.id)}</span>
      </button>
    `).join('');

    suggestionsEl.dataset.items = String(suggestions.length);
  }

  populateHiddenSelect() {
    const hiddenSelect = this.container?.querySelector('#set-select');
    if (!hiddenSelect) return;

    hiddenSelect.innerHTML = '';

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select a card set...';
    hiddenSelect.appendChild(defaultOption);

    this.cardSets.forEach(set => {
      const option = document.createElement('option');
      option.value = set.id;
      option.textContent = `${set.code || set.id} - ${set.name}`;
      hiddenSelect.appendChild(option);
    });

    if (this.selectedSetId) {
      hiddenSelect.value = this.selectedSetId;
    }
  }

  sortCardSets(sets = []) {
    return [...sets].sort((a, b) => {
      const codeA = (a.code || a.set_code || '').toUpperCase();
      const codeB = (b.code || b.set_code || '').toUpperCase();
      if (codeA && codeB) {
        return codeA.localeCompare(codeB);
      }
      if (codeA) return -1;
      if (codeB) return 1;
      const nameA = (a.name || '').toUpperCase();
      const nameB = (b.name || '').toUpperCase();
      return nameA.localeCompare(nameB);
    });
  }

  showSuggestions() {
    const suggestionsEl = this.container?.querySelector('#set-suggestions');
    if (!suggestionsEl) return;
    suggestionsEl.classList.add('is-visible');
  }

  hideSuggestions() {
    const suggestionsEl = this.container?.querySelector('#set-suggestions');
    if (!suggestionsEl) return;
    suggestionsEl.classList.remove('is-visible');
  }

  getSetDisplayName(set) {
    if (!set) return '';
    const code = set.code || set.id;
    return code ? `${set.name} (${code})` : (set.name || code || '');
  }

  setSelectedSet(setId, { updateInput = true, hideSuggestions = true } = {}) {
    const targetSet = this.cardSets.find(set => set.id === setId);
    const setSearch = this.container?.querySelector('#set-search');
    const hiddenSelect = this.container?.querySelector('#set-select');

    if (!targetSet || !setSearch) {
      this.clearSelectedSet();
      return;
    }

    this.selectedSetId = targetSet.id;

    const displayName = this.getSetDisplayName(targetSet);
    if (updateInput) {
      setSearch.value = displayName;
    }

    setSearch.dataset.selectedId = targetSet.id;
    setSearch.dataset.selectedDisplay = displayName;

    if (hideSuggestions) {
      this.hideSuggestions();
    }

    if (hiddenSelect) {
      hiddenSelect.value = targetSet.id;
    }

    const clearSetSearch = this.container?.querySelector('#clear-set-search');
    if (clearSetSearch) {
      clearSetSearch.classList.toggle('is-visible', Boolean(setSearch.value.trim()));
    }

    this.updateButtons();
  }

  clearSelectedSet({ updateInput = false } = {}) {
    const setSearch = this.container?.querySelector('#set-search');
    const hiddenSelect = this.container?.querySelector('#set-select');

    this.selectedSetId = null;

    if (setSearch) {
      if (updateInput) {
        setSearch.value = '';
      }
      delete setSearch.dataset.selectedId;
      delete setSearch.dataset.selectedDisplay;
    }

    if (hiddenSelect) {
      hiddenSelect.value = '';
    }

    const clearSetSearch = this.container?.querySelector('#clear-set-search');
    if (clearSetSearch) {
      clearSetSearch.classList.remove('is-visible');
    }

    this.updateButtons();
    this.hideSuggestions();
  }

  // ========================================
  // Multi-Set Selection Methods
  // ========================================

  /**
   * Render selected set chips
   * @private
   */
  renderSelectedSetChips() {
    const container = this.container?.querySelector('#selected-sets-chips');
    if (!container) return;

    if (this.selectedSets.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = this.selectedSets.map(set => {
      const code = set.code || set.set_code || set.id;
      const name = set.name || set.set_name || code;
      return `
        <div class="set-chip" data-set-id="${set.id}">
          <span class="chip-text" title="${this.escapeHtml(name)}">${this.escapeHtml(code)}</span>
          <button type="button" class="chip-remove" data-set-id="${set.id}" aria-label="Remove ${this.escapeHtml(name)}">
            <i data-lucide="X"></i>
          </button>
        </div>
      `;
    }).join('');

    IconLoader.refreshIcons();
  }

  /**
   * Add a set to the multi-selection
   * @param {string} setId - Set ID to add
   */
  addSetToSelection(setId) {
    // Prevent duplicates
    if (this.selectedSetIds.includes(setId)) {
      console.log(`Set ${setId} already selected`);
      return;
    }

    const set = this.cardSets.find(s => s.id === setId);
    if (!set) {
      console.warn(`Set ${setId} not found in cardSets`);
      return;
    }

    // Add to arrays
    this.selectedSetIds.push(setId);
    this.selectedSets.push(set);

    // Keep legacy selectedSetId in sync (use first selected)
    if (this.selectedSetIds.length === 1) {
      this.selectedSetId = setId;
    }

    // Update UI
    this.renderSelectedSetChips();
    this.updateButtons();

    // Clear search input after selection
    const searchInput = this.container?.querySelector('#set-search');
    if (searchInput) {
      searchInput.value = '';
      this.filterCardSets('');
    }
    this.hideSuggestions();

    console.log(`Added set to selection: ${set.code || set.name}`, { totalSelected: this.selectedSetIds.length });
  }

  /**
   * Remove a set from the multi-selection
   * @param {string} setId - Set ID to remove
   */
  removeSetFromSelection(setId) {
    const index = this.selectedSetIds.indexOf(setId);
    if (index === -1) return;

    // Remove from arrays
    this.selectedSetIds.splice(index, 1);
    this.selectedSets.splice(index, 1);

    // Update legacy selectedSetId
    this.selectedSetId = this.selectedSetIds[0] || null;

    // Update UI
    this.renderSelectedSetChips();
    this.updateButtons();

    console.log(`Removed set from selection: ${setId}`, { remaining: this.selectedSetIds.length });
  }

  /**
   * Clear all selected sets
   */
  clearAllSelectedSets() {
    this.selectedSetIds = [];
    this.selectedSets = [];
    this.selectedSetId = null;

    this.renderSelectedSetChips();
    this.updateButtons();
  }

  /**
   * Update set counts
   * @private
   */
  updateSetCounts() {
    const totalCountEl = this.container?.querySelector('#total-sets-count');
    const setsCountEl = this.container?.querySelector('#sets-count');

    if (totalCountEl) totalCountEl.textContent = this.cardSets.length;
    if (setsCountEl) setsCountEl.textContent = this.filteredSets.length;
  }

  /**
   * Filter card sets based on search
   * @param {string} searchTerm - Search term
   * @private
   */
  filterCardSets(searchTerm) {
    const term = (searchTerm || '').toLowerCase().trim();
    const setSearch = this.container?.querySelector('#set-search');

    if (!term) {
      this.filteredSets = [...this.cardSets];
    } else {
      this.filteredSets = this.cardSets.filter(set => {
        const name = (set.name || set.set_name || '').toLowerCase();
        const code = (set.code || set.set_code || set.id || '').toLowerCase();
        return name.includes(term) || code.includes(term);
      });
    }

    if (setSearch) {
      const selectedDisplay = (setSearch.dataset.selectedDisplay || '').toLowerCase();
      if (!selectedDisplay || selectedDisplay !== term) {
        delete setSearch.dataset.selectedId;
        delete setSearch.dataset.selectedDisplay;
        if (this.selectedSetId) {
          this.selectedSetId = null;
        }
      }
    }

    this.renderSetSuggestions();
    this.updateSetCounts();

    if (term && !this.selectedSetId) {
      const exactMatch = this.cardSets.find(set => this.getSetDisplayName(set).toLowerCase() === term);
      if (exactMatch) {
        this.setSelectedSet(exactMatch.id, { updateInput: false, hideSuggestions: false });
      }
    }

    this.updateButtons();
  }

  /**
  * Start a new session
  * @private
  */
  async startSession() {
    try {
      if (this.isStartingSession) {
        return;
      }

      // Multi-set support: check selectedSetIds array
      if (this.selectedSetIds.length === 0) {
        this.showError('Please select at least one card set');
        return;
      }

      if (!this.sessionManager) {
        this.showError('Session Manager not available');
        return;
      }

      this.isStartingSession = true;
      this.updateButtons();

      const START_TIMEOUT_MS = 15000;

      // Multi-set vs single-set session start
      if (this.selectedSetIds.length === 1) {
        // Single set - use existing flow
        const selectedSetId = this.selectedSetIds[0];
        const selectedSet = this.cardSets.find(set => set.id === selectedSetId);

        if (!selectedSet) {
          this.showError('Selected set not found');
          this.isStartingSession = false;
          this.updateButtons();
          return;
        }

        const sessionSetId = selectedSet.id || selectedSet.code || selectedSet.set_code;
        const sessionSetName = selectedSet.set_name || selectedSet.name || sessionSetId;

        console.info('[PackOpeningPage] Starting single-set session', {
          setId: sessionSetId,
          setName: sessionSetName,
        });

        const startPromise = this.sessionManager.startSession(sessionSetId);
        await Promise.race([
          startPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Session start timed out')), START_TIMEOUT_MS))
        ]);
      } else {
        // Multi-set - use new flow
        console.info('[PackOpeningPage] Starting multi-set session', {
          setIds: this.selectedSetIds,
          setNames: this.selectedSets.map(s => s.code || s.name),
        });

        const startPromise = this.sessionManager.startMultiSetSession(this.selectedSetIds);
        await Promise.race([
          startPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Multi-set session start timed out')), START_TIMEOUT_MS))
        ]);
      }

      this.isSessionActive = true;
      this.currentSession = this.sessionManager.currentSession;

      // Update UI
      this.updateSessionUI();
      this.updateButtons();

      const totalCards = this.currentSession?.isMultiSet
        ? this.sessionManager?.mergedCardPool?.length
        : this.sessionManager?.setCards?.get?.(this.selectedSetIds[0])?.length;

      console.info('[PackOpeningPage] Session ready', {
        sessionId: this.currentSession?.id,
        isMultiSet: this.currentSession?.isMultiSet || false,
        setsCount: this.selectedSetIds.length,
        cardsLoaded: totalCards,
      });
    } catch (error) {
      console.error('Error starting session:', error);
      this.showError('Failed to start session. Please try again.');
      this.isSessionActive = false;
      this.currentSession = null;
    } finally {
      this.isStartingSession = false;
      this.updateButtons();
    }
  }

  /**
   * Stop current session
   * @private
   */
  async stopSession() {
    try {
      if (!this.sessionManager) return;

      await this.sessionManager.stopSession();
      this.isSessionActive = false;
      this.currentSession = null;

      // Update UI
      this.updateSessionUI();
      this.updateButtons();

      console.log('Session stopped');
    } catch (error) {
      console.error('Error stopping session:', error);
    }
  }

  /**
   * Clear current session
   * @private
   */
  async clearSession() {
    try {
      if (!this.sessionManager) return;

      if (!confirm('Are you sure you want to clear all cards from this session?')) {
        return;
      }

      await this.sessionManager.clearSession();

      // Update UI
      this.updateSessionUI();
      this.renderCards();

      console.log('Session cleared');
    } catch (error) {
      console.error('Error clearing session:', error);
      this.showError('Failed to clear session.');
    }
  }

  /**
   * Export session
   * @private
   */
  async exportSession() {
    try {
      if (!this.sessionManager) return;

      await this.sessionManager.exportSession();
      console.log('Session exported');
    } catch (error) {
      console.error('Error exporting session:', error);
      this.showError('Failed to export session.');
    }
  }

  /**
   * Import session
   * @private
   */
  async importSession() {
    try {
      if (!this.sessionManager) return;

      // Create file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';

      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
          const text = await file.text();
          await this.sessionManager.importSession(JSON.parse(text));

          // Update UI
          this.isSessionActive = true;
          this.currentSession = this.sessionManager.currentSession;
          this.updateSessionUI();
          this.renderCards();
          this.updateButtons();

          console.log('Session imported');
        } catch (error) {
          console.error('Error importing session:', error);
          this.showError('Failed to import session. Invalid file format.');
        }
      };

      input.click();
    } catch (error) {
      console.error('Error importing session:', error);
      this.showError('Failed to import session.');
    }
  }

  /**
   * Refresh pricing data
   * @private
   */
  async refreshPricing() {
    try {
      if (!this.sessionManager) return;

      await this.sessionManager.refreshPricing();
      this.updateSessionUI();
      this.renderCards();

      console.log('Pricing refreshed');
    } catch (error) {
      console.error('Error refreshing pricing:', error);
      this.showError('Failed to refresh pricing.');
    }
  }

  /**
   * Start voice listening
   * @private
   */
  async startVoiceListening() {
    try {
      if (!this.voiceEngine) {
        this.showError('Voice Engine not available');
        return;
      }

      if (!this.isSessionActive) {
        this.showError('Please start a session first');
        return;
      }

      await this.voiceEngine.startListening();
      this.isVoiceListening = true;

      // Update UI
      this.updateVoiceUI();
      this.updateButtons();

      console.log('Voice listening started');
    } catch (error) {
      console.error('Error starting voice listening:', error);
      this.showError('Failed to start voice recognition. Please check your microphone permissions.');
    }
  }

  /**
   * Stop voice listening
   * @private
   */
  stopVoiceListening() {
    try {
      if (!this.voiceEngine) return;

      this.voiceEngine.stopListening();
      this.isVoiceListening = false;

      // Update UI
      this.updateVoiceUI();
      this.updateButtons();

      console.log('Voice listening stopped');
    } catch (error) {
      console.error('Error stopping voice listening:', error);
    }
  }

  /**
   * Test voice recognition
   * @private
   */
  async testVoice() {
    try {
      if (!this.voiceEngine) {
        this.showError('Voice Engine not available');
        return;
      }

      await this.voiceEngine.testRecognition();
      console.log('Voice test completed');
    } catch (error) {
      console.error('Error testing voice:', error);
      this.showError('Voice test failed. Please check your microphone.');
    }
  }

  /**
   * Handle voice result
   * @param {Object} result - Voice recognition result
   * @private
   */
  async handleVoiceResult(result) {
    try {
      if (!this.sessionManager || !this.isSessionActive) return;

      console.log('Voice result:', result.transcript);

      // Add card to session
      // Note: SessionManager should handle matching the voice input to a card
      // This is a simplified version - actual implementation may vary
      await this.sessionManager.processVoiceInput(result.transcript);

      // Update UI
      this.updateSessionUI();
      this.renderCards();

      console.log('Card added from voice input');
    } catch (error) {
      console.error('Error handling voice result:', error);
      this.showError('Failed to process voice input.');
    }
  }

  /**
   * Handle voice error
   * @param {Object} error - Error object
   * @private
   */
  handleVoiceError(error) {
    console.error('Voice recognition error:', error);
    this.updateVoiceUI();

    // specific error handling can go here
    if (error.error === 'not-allowed') {
      this.showError('Microphone access denied. Please check permissions.');
    }
  }

  /**
   * Handle voice status change
   * @param {string} status - New status
   * @private
   */
  handleVoiceStatus(status) {
    console.log('Voice status changed:', status);
    this.isVoiceListening = status === 'listening';
    this.updateVoiceUI();
  }

  /**
   * Handle session update
   * @private
   */
  handleSessionUpdate() {
    this.updateSessionUI();
    this.renderCards();
  }

  /**
   * Update session UI
   * @private
   */
  updateSessionUI() {
    if (!this.currentSession && this.sessionManager) {
      this.currentSession = this.sessionManager.currentSession;
    }

    const cardCount = this.currentSession?.cards?.length || 0;

    // Update set name
    const currentSetEl = this.container?.querySelector('#current-set');
    if (currentSetEl) {
      const setName = this.currentSession?.setName || 'None';
      currentSetEl.textContent = setName;
      currentSetEl.title = setName;
    }

    // Update card count
    const cardsCountEl = this.container?.querySelector('#cards-count');
    if (cardsCountEl) {
      cardsCountEl.textContent = cardCount;
    }

    // Update TCG Low total
    const tcgLowEl = this.container?.querySelector('#tcg-low-total');
    if (tcgLowEl) {
      const total = this.currentSession?.totalTcgLow || 0;
      tcgLowEl.textContent = `$${total.toFixed(2)}`;
    }

    // Update TCG Market total
    const tcgMarketEl = this.container?.querySelector('#tcg-market-total');
    if (tcgMarketEl) {
      const total = this.currentSession?.totalTcgMarket || 0;
      tcgMarketEl.textContent = `$${total.toFixed(2)}`;
    }

    // Sync selected sets with current session (for legacy single-set compatibility)
    // Multi-set sessions don't need this sync as the chips already show the selection
    if (this.isSessionActive && !this.currentSession?.isMultiSet && this.currentSession?.setId) {
      if (this.selectedSetId !== this.currentSession.setId) {
        this.setSelectedSet(this.currentSession.setId, { updateInput: true, hideSuggestions: true });
      }
    }
  }

  /**
   * Update voice UI (compact version)
   * @private
   */
  updateVoiceUI() {
    const indicatorEl = this.container?.querySelector('#voice-indicator');
    const statusTextEl = this.container?.querySelector('#voice-status-text');

    if (indicatorEl) {
      // Use new status-dot classes from compact layout
      if (this.isVoiceListening) {
        indicatorEl.className = 'status-dot status-dot-danger status-dot-pulse';
      } else if (this.voiceEngine?.isInitialized) {
        indicatorEl.className = 'status-dot status-dot-success';
      } else {
        indicatorEl.className = 'status-dot status-dot-secondary';
      }
    }

    if (statusTextEl) {
      if (this.isVoiceListening) {
        statusTextEl.textContent = 'Listening...';
      } else if (this.voiceEngine?.isInitialized) {
        statusTextEl.textContent = 'Ready';
      } else {
        statusTextEl.textContent = 'Initializing...';
      }
    }
  }

  /**
   * Update button states
   * @private
   */
  updateButtons() {
    // Set selection buttons
    const startSessionBtn = this.container?.querySelector('#start-session-btn');
    const stopSessionBtn = this.container?.querySelector('#stop-session-btn');
    const swapSetBtn = this.container?.querySelector('#swap-set-btn');

    // Multi-set support: check selectedSetIds.length
    const hasSelectedSets = this.selectedSetIds.length > 0;

    if (startSessionBtn) {
      startSessionBtn.disabled = !hasSelectedSets || this.isSessionActive || this.isStartingSession;
      if (this.isSessionActive) {
        startSessionBtn.classList.add('hidden');
      } else {
        startSessionBtn.classList.remove('hidden');
      }
    }

    if (stopSessionBtn) {
      if (this.isSessionActive) {
        stopSessionBtn.classList.remove('hidden');
      } else {
        stopSessionBtn.classList.add('hidden');
      }
    }

    if (swapSetBtn) {
      if (this.isSessionActive) {
        // For multi-set, swap is more complex - hide for now if multi-set is active
        const isMultiSet = this.currentSession?.isMultiSet;
        if (isMultiSet) {
          // Could implement "modify sets" functionality later
          swapSetBtn.classList.add('hidden');
          swapSetBtn.disabled = true;
        } else {
          const currentSetId = this.currentSession?.setId || null;
          const canSwap = Boolean(this.selectedSetIds.length > 0 && this.selectedSetIds[0] !== currentSetId);
          swapSetBtn.classList.remove('hidden');
          swapSetBtn.disabled = !canSwap;
        }
      } else {
        swapSetBtn.classList.add('hidden');
        swapSetBtn.disabled = true;
      }
    }

    // Voice buttons
    const startVoiceBtn = this.container?.querySelector('#start-voice-btn');
    const stopVoiceBtn = this.container?.querySelector('#stop-voice-btn');

    if (startVoiceBtn) {
      startVoiceBtn.disabled = !this.isSessionActive || this.isVoiceListening;
      if (this.isVoiceListening) {
        startVoiceBtn.classList.add('hidden');
      } else {
        startVoiceBtn.classList.remove('hidden');
      }
    }

    if (stopVoiceBtn) {
      if (this.isVoiceListening) {
        stopVoiceBtn.classList.remove('hidden');
      } else {
        stopVoiceBtn.classList.add('hidden');
      }
    }

    // Session buttons
    const exportBtn = this.container?.querySelector('#export-session-btn');
    const clearBtn = this.container?.querySelector('#clear-session-btn');
    const refreshPricingBtn = this.container?.querySelector('#refresh-pricing-btn');

    if (exportBtn) {
      exportBtn.disabled = !this.isSessionActive || !this.currentSession?.cards?.length;
    }

    if (clearBtn) {
      clearBtn.disabled = !this.isSessionActive || !this.currentSession?.cards?.length;
    }

    if (refreshPricingBtn) {
      refreshPricingBtn.disabled = !this.isSessionActive || !this.currentSession?.cards?.length;
    }
  }

  /**
   * Render cards using CardGrid component
   * @private
   */
  renderCards() {
    const cardsContainer = this.container?.querySelector('#session-cards');
    if (!cardsContainer) return;

    // Sync view state from the checkbox to avoid resets after async updates
    const consolidatedToggle = this.container?.querySelector('#consolidated-view-toggle');
    if (consolidatedToggle) {
      this.consolidatedView = consolidatedToggle.checked;
    }

    // Destroy existing card grid
    if (this.cardGrid) {
      this.cardGrid.destroy();
      this.cardGrid = null;
    }

    // Get cards from current session
    const cards = this.currentSession?.cards || [];

    // Create new card grid (consolidated controls grouping + grid layout)
    this.cardGrid = new CardGrid({
      cards,
      onRemoveCard: (card, index) => this.removeCard(card?.id ?? index),
      consolidated: this.consolidatedView,
      cardSize: this.cardSize,
      showRemoveButton: true,
      sessionManager: this.sessionManager // For image fallback support
    });

    // Clear container and append new grid
    cardsContainer.innerHTML = '';
    const gridElement = this.cardGrid.create();
    cardsContainer.appendChild(gridElement);
  }

  /**
   * Remove card from session
   * @param {number} index - Card index
   * @private
   */
  async removeCard(idOrIndex) {
    try {
      if (!this.sessionManager) return;

      await this.sessionManager.removeCard(idOrIndex);

      // Update UI
      this.updateSessionUI();
      this.renderCards();
      this.updateButtons();

      console.log('Card removed at index:', index);
    } catch (error) {
      console.error('Error removing card:', error);
      this.showError('Failed to remove card.');
    }
  }

  /**
   * Attach event listeners
   * @private
   */
  attachEventListeners() {
    const setSearch = this.container?.querySelector('#set-search');
    const setSuggestions = this.container?.querySelector('#set-suggestions');
    const clearSetSearch = this.container?.querySelector('#clear-set-search');

    if (setSearch) {
      this.boundHandlers.setSearchInput = (e) => {
        this.filterCardSets(e.target.value);
        this.showSuggestions();
        if (clearSetSearch) {
          clearSetSearch.classList.toggle('is-visible', Boolean(e.target.value.trim()));
        }
      };
      setSearch.addEventListener('input', this.boundHandlers.setSearchInput);

      this.boundHandlers.setSearchFocus = () => {
        this.filterCardSets(setSearch.value);
        this.showSuggestions();
        if (clearSetSearch) {
          clearSetSearch.classList.toggle('is-visible', Boolean(setSearch.value.trim()));
        }
      };
      setSearch.addEventListener('focus', this.boundHandlers.setSearchFocus);

      this.boundHandlers.setSearchBlur = () => {
        window.setTimeout(() => this.hideSuggestions(), 120);
      };
      setSearch.addEventListener('blur', this.boundHandlers.setSearchBlur);

      this.boundHandlers.setSearchKeydown = (e) => {
        if (e.key === 'Enter') {
          const firstSuggestion = this.filteredSets[0];
          if (firstSuggestion) {
            e.preventDefault();
            // Multi-set: add to selection instead of replacing
            this.addSetToSelection(firstSuggestion.id);
          }
        } else if (e.key === 'Escape') {
          this.hideSuggestions();
        }
      };
      setSearch.addEventListener('keydown', this.boundHandlers.setSearchKeydown);
    }

    if (clearSetSearch) {
      this.boundHandlers.clearSetSearch = () => {
        if (setSearch) {
          setSearch.value = '';
          setSearch.focus();
        }
        // Only clear search text, not the selected set chips
        this.filterCardSets('');
        this.hideSuggestions();
        clearSetSearch.classList.remove('is-visible');
      };
      clearSetSearch.addEventListener('click', this.boundHandlers.clearSetSearch);
    }

    if (setSuggestions) {
      this.boundHandlers.suggestionClick = (e) => {
        const target = e.target.closest('[data-set-id]');
        if (!target) return;
        e.preventDefault();
        // Multi-set: add to selection instead of replacing
        this.addSetToSelection(target.dataset.setId);
      };
      setSuggestions.addEventListener('mousedown', this.boundHandlers.suggestionClick);
    }

    // Chip remove buttons
    const chipsContainer = this.container?.querySelector('#selected-sets-chips');
    if (chipsContainer) {
      this.boundHandlers.chipRemove = (e) => {
        const removeBtn = e.target.closest('.chip-remove');
        if (!removeBtn) return;
        e.preventDefault();
        e.stopPropagation();
        this.removeSetFromSelection(removeBtn.dataset.setId);
      };
      chipsContainer.addEventListener('click', this.boundHandlers.chipRemove);
    }

    this.boundHandlers.documentClick = (e) => {
      const autocomplete = this.container?.querySelector('.set-autocomplete');
      if (autocomplete && !autocomplete.contains(e.target)) {
        this.hideSuggestions();
      }
    };
    document.addEventListener('click', this.boundHandlers.documentClick);

    // Refresh sets button
    const refreshSetsBtn = this.container?.querySelector('#refresh-sets-btn');
    if (refreshSetsBtn) {
      this.boundHandlers.refreshSets = () => this.loadCardSets();
      refreshSetsBtn.addEventListener('click', this.boundHandlers.refreshSets);
    }

    // Start session button
    const startSessionBtn = this.container?.querySelector('#start-session-btn');
    if (startSessionBtn) {
      this.boundHandlers.startSession = () => this.startSession();
      startSessionBtn.addEventListener('click', this.boundHandlers.startSession);
    }

    // Stop session button
    const stopSessionBtn = this.container?.querySelector('#stop-session-btn');
    if (stopSessionBtn) {
      this.boundHandlers.stopSession = () => this.stopSession();
      stopSessionBtn.addEventListener('click', this.boundHandlers.stopSession);
    }

    // Swap set button
    const swapSetBtn = this.container?.querySelector('#swap-set-btn');
    if (swapSetBtn) {
      this.boundHandlers.swapSet = async () => {
        await this.stopSession();
        await this.startSession();
      };
      swapSetBtn.addEventListener('click', this.boundHandlers.swapSet);
    }

    // Voice buttons
    const startVoiceBtn = this.container?.querySelector('#start-voice-btn');
    if (startVoiceBtn) {
      this.boundHandlers.startVoice = () => this.startVoiceListening();
      startVoiceBtn.addEventListener('click', this.boundHandlers.startVoice);
    }

    const stopVoiceBtn = this.container?.querySelector('#stop-voice-btn');
    if (stopVoiceBtn) {
      this.boundHandlers.stopVoice = () => this.stopVoiceListening();
      stopVoiceBtn.addEventListener('click', this.boundHandlers.stopVoice);
    }

    const testVoiceBtn = this.container?.querySelector('#test-voice-btn');
    if (testVoiceBtn) {
      this.boundHandlers.testVoice = () => this.testVoice();
      testVoiceBtn.addEventListener('click', this.boundHandlers.testVoice);
    }

    // Settings button - navigates to settings page
    const packSettingsBtn = this.container?.querySelector('#pack-settings-btn');
    if (packSettingsBtn) {
      this.boundHandlers.openSettings = () => {
        if (this.router) {
          this.router.navigate('settings');
        }
      };
      packSettingsBtn.addEventListener('click', this.boundHandlers.openSettings);
    }

    // Session buttons
    const exportBtn = this.container?.querySelector('#export-session-btn');
    if (exportBtn) {
      this.boundHandlers.exportSession = () => this.exportSession();
      exportBtn.addEventListener('click', this.boundHandlers.exportSession);
    }

    const importBtn = this.container?.querySelector('#import-session-btn');
    if (importBtn) {
      this.boundHandlers.importSession = () => this.importSession();
      importBtn.addEventListener('click', this.boundHandlers.importSession);
    }

    const clearBtn = this.container?.querySelector('#clear-session-btn');
    if (clearBtn) {
      this.boundHandlers.clearSession = () => this.clearSession();
      clearBtn.addEventListener('click', this.boundHandlers.clearSession);
    }

    const refreshPricingBtn = this.container?.querySelector('#refresh-pricing-btn');
    if (refreshPricingBtn) {
      this.boundHandlers.refreshPricing = () => this.refreshPricing();
      refreshPricingBtn.addEventListener('click', this.boundHandlers.refreshPricing);
    }

    // View controls
    const consolidatedToggle = this.container?.querySelector('#consolidated-view-toggle');
    if (consolidatedToggle) {
      this.boundHandlers.consolidatedToggle = (e) => {
        this.consolidatedView = e.target.checked;
        this.renderCards();
      };
      consolidatedToggle.addEventListener('change', this.boundHandlers.consolidatedToggle);
    }

    const cardSizeSlider = this.container?.querySelector('#card-size-slider');
    const cardSizeValue = this.container?.querySelector('#card-size-value');
    if (cardSizeSlider) {
      this.boundHandlers.cardSizeChange = (e) => {
        this.cardSize = parseInt(e.target.value, 10);
        if (cardSizeValue) {
          cardSizeValue.textContent = `${this.cardSize}px`;
        }
        this.renderCards();
      };
      cardSizeSlider.addEventListener('input', this.boundHandlers.cardSizeChange);
    }

    // Voice engine events
    if (this.voiceEngine) {
      // Use the pre-bound handlers
      // Voice listener is handled globally by app.js
      // this.voiceEngine.onResult(this.boundHandlers.handleVoiceResult);
      this.voiceEngine.onStatusChange(this.boundHandlers.handleVoiceStatus);
      this.voiceEngine.onError(this.boundHandlers.handleVoiceError);
    }

    // Session manager events (if available)
    if (this.sessionManager && this.sessionManager.addEventListener) {
      // Use the pre-bound handler
      // Fix: Use consistent event name 'session-updated' matching removal logic
      this.sessionManager.addEventListener('session-updated', this.boundHandlers.handleSessionUpdate);
      this.sessionManager.addEventListener('cardAdded', this.boundHandlers.handleSessionUpdate);
      this.sessionManager.addEventListener('cardRemoved', this.boundHandlers.handleSessionUpdate);
    }
  }

  /**
   * Remove event listeners
   * @private
   */
  removeEventListeners() {
    if (this.boundHandlers.documentClick) {
      document.removeEventListener('click', this.boundHandlers.documentClick);
    }

    // Remove voice engine listeners (use matching off* methods)
    if (this.voiceEngine) {
      if (this.boundHandlers.handleVoiceResult) {
        this.voiceEngine.offResult(this.boundHandlers.handleVoiceResult);
      }
      if (this.boundHandlers.handleVoiceStatus) {
        this.voiceEngine.offStatusChange(this.boundHandlers.handleVoiceStatus);
      }
      if (this.boundHandlers.handleVoiceError) {
        this.voiceEngine.offError(this.boundHandlers.handleVoiceError);
      }
    }

    // Remove session manager listeners
    if (this.sessionManager && this.sessionManager.removeEventListener) {
      // Explicitly remove session listener from global SessionManager
      if (window.sessionManager) {
        window.sessionManager.removeListener('session-updated', this.boundHandlers.handleSessionUpdate);
      }
      // Fix: Use consistent event name 'session-updated'
      this.sessionManager.removeEventListener('session-updated', this.boundHandlers.handleSessionUpdate);
      this.sessionManager.removeEventListener('cardAdded', this.boundHandlers.handleSessionUpdate);
      this.sessionManager.removeEventListener('cardRemoved', this.boundHandlers.handleSessionUpdate);
    }

    // Clear all bound handlers
    this.boundHandlers = {};
  }

  /**
   * Show error message
   * @param {string} message - Error message
   * @private
   */
  showError(message) {
    // TODO: Implement toast notification system
    alert(message);
    console.error(message);
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   * @private
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Mount the page
   * @param {HTMLElement} container - Container element
   */
  async mount(container) {
    try {
      this.container = container;

      // Render the page
      this.container.innerHTML = this.render();

      // Cleanup: Remove any rogue #session-cards containers that might exist outside our container
      const allSessionCards = document.querySelectorAll('#session-cards');
      allSessionCards.forEach(el => {
        if (el !== this.container.querySelector('#session-cards') && !this.container.contains(el)) {
          console.warn('Removing rogue #session-cards container:', el);
          el.remove();
        }
      });

      // Cleanup any existing observer first (defensive - prevents stacking)
      if (this.duplicateKiller) {
        this.duplicateKiller.disconnect();
        this.duplicateKiller = null;
      }

      // Setup observer to kill any future duplicates
      this.duplicateKiller = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) { // Element
              if (node.id === 'session-cards' && node !== this.container.querySelector('#session-cards')) {
                console.warn('Duplicate #session-cards detected and removed!', node);
                node.remove();
              }
              // Also check descendants
              if (node.querySelectorAll) {
                const duplicates = node.querySelectorAll('#session-cards');
                duplicates.forEach(dup => {
                  if (dup !== this.container.querySelector('#session-cards')) {
                    console.warn('Duplicate #session-cards descendant detected and removed!', dup);
                    dup.remove();
                  }
                });
              }
            }
          });
        });
      });
      // Observe container only (no subtree to avoid performance issues)
      // Only watch direct children of container to detect duplicate elements
      this.duplicateKiller.observe(this.container, { childList: true, subtree: false });

      // Initialize services and load data
      await this.initialize();

      // Attach event listeners
      this.attachEventListeners();

      // Initialize Lucide icons (using IconLoader for consistency)
      IconLoader.refreshIcons();

      // Update initial UI state
      this.updateVoiceUI();
      this.updateSessionUI();
      this.updateButtons();
      this.renderCards();

      console.log('PackOpeningPage mounted successfully');
    } catch (error) {
      console.error('Error mounting PackOpeningPage:', error);

      // Display error message
      if (this.container) {
        this.container.innerHTML = `
          <div class="page-content">
            <div class="error-card bg-neutral-900/40 backdrop-blur-sm border border-red-800/50 rounded-xl p-6">
              <h2 class="text-xl font-semibold text-red-400 mb-2 flex items-center gap-2">
                <i data-lucide="AlertCircle" class="w-6 h-6"></i>
                Failed to Load Pack Opening Page
              </h2>
              <p class="text-neutral-300 mb-2">${error.message || 'Unknown error occurred'}</p>
              <p class="text-sm text-neutral-400">Please refresh the page or try again later.</p>
            </div>
          </div>
        `;

        if (window.lucide) {
          window.lucide.createIcons();
        }
      }
    }
  }

  /**
   * Unmount the page
   */
  async unmount() {
    // Stop voice listening if active
    if (this.isVoiceListening) {
      this.stopVoiceListening();
    }

    // Disconnect duplicate killer
    if (this.duplicateKiller) {
      this.duplicateKiller.disconnect();
      this.duplicateKiller = null;
    }

    // Remove event listeners
    this.removeEventListeners();

    // Destroy card grid
    if (this.cardGrid) {
      this.cardGrid.destroy();
      this.cardGrid = null;
    }

    // Clear container
    if (this.container) {
      this.container.innerHTML = '';
    }

    console.log('PackOpeningPage unmounted');
  }

  /**
   * Handle Add to Collection click
   * @private
   */
  async handleAddToCollection() {
    if (!this.currentSession || !this.currentSession.cards || this.currentSession.cards.length === 0) {
      this.showError('No cards in session to add.');
      return;
    }

    try {
      // Show modal with collection options
      await this.renderCollectionSelectionModal();
    } catch (error) {
      console.error('Error handling add to collection:', error);
      this.showError('Failed to prepare collection options.');
    }
  }

  /**
   * Render Collection Selection Modal
   * @private
   */
  async renderCollectionSelectionModal() {
    // Remove existing modal if any
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) existingModal.remove();

    // Fetch user collections
    const collections = await this.collectionManager.getUserCollections();

    const modalHtml = `
      <div class="modal-overlay is-visible">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">Add to Collection</h3>
            <button class="modal-close" id="modal-close-btn">
              <i data-lucide="x"></i>
            </button>
          </div>
          <div class="modal-body">
            <div id="collection-step-select">
              <p class="mb-4 text-neutral-400">Select a collection to add ${this.currentSession.cards.length} cards to:</p>
              
              <div class="collection-selection-list">
                ${collections.map(col => `
                  <div class="collection-option" data-id="${col.id}">
                    <div class="collection-info">
                      <span class="collection-name">${this.escapeHtml(col.name)}</span>
                      <span class="collection-count">${col.cards?.length || 0} cards</span>
                    </div>
                    <i data-lucide="chevron-right" class="text-neutral-500"></i>
                  </div>
                `).join('')}
                
                <button class="collection-option create-new" id="btn-create-new-collection">
                  <div class="collection-info">
                    <span class="collection-name text-accent-primary">Create New Collection</span>
                    <span class="collection-count">Start fresh</span>
                  </div>
                  <i data-lucide="plus" class="text-accent-primary"></i>
                </button>
              </div>
            </div>

            <div id="collection-step-create" style="display: none;">
              <h4 class="text-lg font-medium mb-4">New Collection</h4>
              <div class="form-group mb-4">
                <label class="block text-sm text-neutral-400 mb-1">Name</label>
                <input type="text" id="new-collection-name" class="form-input w-full bg-neutral-800 border-neutral-700 rounded p-2 text-white" placeholder="e.g., My Holos">
              </div>
              <div class="form-group mb-6">
                <label class="block text-sm text-neutral-400 mb-1">Description (Optional)</label>
                <textarea id="new-collection-desc" class="form-input w-full bg-neutral-800 border-neutral-700 rounded p-2 text-white" rows="3"></textarea>
              </div>
              <div class="flex justify-end gap-2">
                <button class="btn btn-secondary btn-sm" id="btn-cancel-create">Back</button>
                <button class="btn btn-primary btn-sm" id="btn-confirm-create">Create & Add</button>
              </div>
            </div>

            <div id="collection-step-review" style="display: none;">
               <h4 class="text-lg font-medium mb-2">Review Cards</h4>
               <p class="text-sm text-neutral-400 mb-4">Adding to: <span id="target-collection-name" class="text-white font-bold"></span></p>
               
               <div class="card-review-list mb-6">
                 ${this.currentSession.cards.map(card => `
                   <div class="review-item">
                     <img src="${card.imageUrl || card.image_url_small || '/assets/card-back.jpg'}" class="review-item-image" alt="${card.name}">
                     <div class="review-item-details">
                       <span class="review-item-name">${this.escapeHtml(card.name)}</span>
                       <div class="review-item-meta">
                         <span class="text-xs bg-neutral-800 px-1 rounded">${card.rarity || 'Common'}</span>
                         <span class="ml-2">x${card.quantity || 1}</span>
                       </div>
                     </div>
                   </div>
                 `).join('')}
               </div>

               <div class="flex justify-end gap-2">
                 <button class="btn btn-secondary btn-sm" id="btn-cancel-review">Back</button>
                 <button class="btn btn-primary btn-sm" id="btn-confirm-add">Confirm Add</button>
               </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Initialize icons in modal
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Event Listeners for Modal
    const modal = document.querySelector('.modal-overlay');
    const closeBtn = document.getElementById('modal-close-btn');
    const createBtn = document.getElementById('btn-create-new-collection');
    const cancelCreateBtn = document.getElementById('btn-cancel-create');
    const confirmCreateBtn = document.getElementById('btn-confirm-create');
    const cancelReviewBtn = document.getElementById('btn-cancel-review');
    const confirmAddBtn = document.getElementById('btn-confirm-add');

    let selectedCollectionId = null;

    // Close Modal
    const closeModal = () => modal.remove();
    closeBtn.onclick = closeModal;
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };

    // Navigate to Create
    createBtn.onclick = () => {
      document.getElementById('collection-step-select').style.display = 'none';
      document.getElementById('collection-step-create').style.display = 'block';
    };

    // Cancel Create
    cancelCreateBtn.onclick = () => {
      document.getElementById('collection-step-create').style.display = 'none';
      document.getElementById('collection-step-select').style.display = 'block';
    };

    // Confirm Create
    confirmCreateBtn.onclick = async () => {
      const name = document.getElementById('new-collection-name').value;
      const desc = document.getElementById('new-collection-desc').value;
      if (!name) return alert('Please enter a name');

      try {
        const newCol = await this.collectionManager.createCollection(name, desc);
        if (newCol) {
          selectedCollectionId = newCol.id;
          this.showReviewStep(newCol.name, selectedCollectionId);
        }
      } catch (err) {
        console.error(err);
        alert('Failed to create collection');
      }
    };

    // Select Existing
    document.querySelectorAll('.collection-option[data-id]').forEach(el => {
      el.onclick = () => {
        selectedCollectionId = el.dataset.id;
        const name = el.querySelector('.collection-name').textContent;
        this.showReviewStep(name, selectedCollectionId);
      };
    });

    // Cancel Review
    cancelReviewBtn.onclick = () => {
      document.getElementById('collection-step-review').style.display = 'none';
      document.getElementById('collection-step-select').style.display = 'block';
    };

    // Confirm Add
    confirmAddBtn.onclick = async () => {
      if (!selectedCollectionId) return;

      const btn = confirmAddBtn;
      const originalText = btn.textContent;
      btn.textContent = 'Adding...';
      btn.disabled = true;

      try {
        let addedCount = 0;
        for (const card of this.currentSession.cards) {
          await this.collectionManager.addCardToCollection(selectedCollectionId, card);
          addedCount++;
        }

        // Create pack event with price snapshots for ROI tracking
        try {
          const user = authService.getUser();
          console.log('[PackOpeningPage] Creating pack event - user:', user?.id, 'cards:', this.currentSession?.cards?.length);

          if (user && this.currentSession?.cards?.length > 0) {
            const setCode = this.currentSession.setCode || this.currentSession.set?.code;
            const setId = this.currentSession.setId || this.currentSession.set?.id;

            console.log('[PackOpeningPage] Calling createPackEventWithPrices with:', {
              userId: user.id,
              setId,
              setCode,
              cardsCount: this.currentSession.cards.length,
              firstCard: this.currentSession.cards[0] ? {
                name: this.currentSession.cards[0].name,
                keys: Object.keys(this.currentSession.cards[0])
              } : null
            });

            const result = await this.collectionManager.createPackEventWithPrices(
              user.id,
              setId,
              this.currentSession.cards,
              setCode
            );
            console.log('[PackOpeningPage] Pack event result:', result);
          } else {
            console.warn('[PackOpeningPage] Skipping pack event - no user or no cards', {
              hasUser: !!user,
              cardsLength: this.currentSession?.cards?.length
            });
          }
        } catch (packErr) {
          // Don't fail the whole operation if pack event creation fails
          console.error('[PackOpeningPage] Failed to create pack event:', packErr);
        }

        closeModal();

        if (confirm(`Successfully added ${addedCount} cards! Clear session?`)) {
          await this.clearSession();
        }
      } catch (err) {
        console.error(err);
        alert('Failed to add some cards');
        btn.textContent = originalText;
        btn.disabled = false;
      }
    };
  }

  showReviewStep(collectionName, collectionId) {
    document.getElementById('collection-step-select').style.display = 'none';
    document.getElementById('collection-step-create').style.display = 'none';
    const reviewStep = document.getElementById('collection-step-review');
    reviewStep.style.display = 'block';
    document.getElementById('target-collection-name').textContent = collectionName;
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} str 
   * @returns {string}
   */
  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

