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

export default class PackOpeningPage {
  constructor(router) {
    this.router = router;
    this.container = null;

    // Service references (will be set from global app)
    this.sessionManager = null;
    this.voiceEngine = null;

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
    this.selectedSetId = null;
    this.isStartingSession = false;

    // Event listeners
    this.boundHandlers = {
      handleVoiceResult: this.handleVoiceResult.bind(this),
      handleVoiceStatus: this.handleVoiceStatus.bind(this),
      handleVoiceError: this.handleVoiceError.bind(this),
      handleSessionUpdate: this.handleSessionUpdate.bind(this)
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
   * Render the page (COMPACT VERSION)
   * @returns {string} HTML string
   */
  render() {
    return `
      <div class="page-content pack-opening-page">
        <div class="pack-opening-controls">
          <section class="control-card set-panel">
            <header class="control-card__header">
              <div class="control-card__title">
                <i data-lucide="Package" class="control-card__icon"></i>
                <div>
                  <h2 class="control-card__heading">Pack Setup</h2>
                  <p class="control-card__subheading">Choose a card set to start ripping packs</p>
                </div>
              </div>
            </header>

            <div class="set-autocomplete">
              <div class="set-input">
                <i data-lucide="Search" class="field-icon"></i>
                <input
                  type="text"
                  id="set-search"
                  class="set-input-field"
                  placeholder="Search by set name or code"
                  autocomplete="off"
                  aria-label="Search card sets"
                >
                <button type="button" class="set-input-clear" id="clear-set-search" aria-label="Clear search">
                  <i data-lucide="X"></i>
                </button>
              </div>
              <div id="set-suggestions" class="set-suggestions" role="listbox" aria-label="Card set suggestions"></div>
              <select id="set-select" class="visually-hidden" aria-hidden="true" tabindex="-1"></select>
            </div>

            <div class="set-meta">
              <span class="set-count text-xs text-neutral-500">
                <span id="sets-count">0</span> of <span id="total-sets-count">0</span> sets
              </span>
              <div class="set-actions">
                <button id="refresh-sets-btn" class="icon-button" type="button" title="Refresh sets">
                  <i data-lucide="refresh-cw"></i>
                </button>
                <button
                  id="start-session-btn"
                  class="btn btn-primary btn-sm"
                  type="button"
                  data-router-controlled="pack-opening"
                  disabled
                >
                  <i data-lucide="Play"></i>
                  <span>Start</span>
                </button>
                <button id="swap-set-btn" class="btn btn-secondary btn-sm hidden" type="button">
                  <i data-lucide="refresh-ccw"></i>
                  <span>Swap</span>
                </button>
              </div>
            </div>
          </section>

          <section class="control-card voice-panel">
            <header class="control-card__header">
              <div class="control-card__title">
                <i data-lucide="Mic" class="control-card__icon"></i>
                <div>
                  <h2 class="control-card__heading">Voice Control</h2>
                  <p class="control-card__subheading">Hands-free pack logging</p>
                </div>
              </div>
            </header>

            <div class="voice-status-row">
              <span class="status-dot status-dot-secondary" id="voice-indicator"></span>
              <span class="voice-status-text" id="voice-status-text">Initializing...</span>
            </div>

            <div class="voice-actions">
              <button id="start-voice-btn" class="btn btn-primary btn-sm" type="button" disabled>
                <i data-lucide="Mic"></i>
                <span>Listen</span>
              </button>
              <button id="stop-voice-btn" class="btn btn-danger btn-sm hidden" type="button">
                <i data-lucide="Square"></i>
                <span>Stop</span>
              </button>
              <button id="test-voice-btn" class="btn btn-secondary btn-sm" type="button">
                <i data-lucide="test-tube"></i>
                <span>Test</span>
              </button>
            </div>
          </section>

          <section class="control-card session-panel">
            <header class="control-card__header">
              <div class="control-card__title">
                <i data-lucide="folder-open" class="control-card__icon"></i>
                <div>
                  <h2 class="control-card__heading">Current Session</h2>
                  <p class="control-card__subheading">Track progress at a glance</p>
                </div>
              </div>
              <span class="badge-sm" id="cards-count-badge">0</span>
            </header>

            <div class="session-summary">
              <div class="summary-item">
                <span class="summary-label">Set</span>
                <span class="summary-value" id="current-set">None</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Cards</span>
                <span class="summary-value" id="cards-count">0</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">TCG Low</span>
                <span class="summary-value text-success" id="tcg-low-total">$0.00</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">TCG Market</span>
                <span class="summary-value" id="tcg-market-total">$0.00</span>
              </div>
              <div class="summary-item summary-status">
                <span class="summary-label">Status</span>
                <span class="summary-value" id="session-status">
                  <span class="status-pill">Not Started</span>
                </span>
              </div>
            </div>

            <div class="session-actions">
              <button id="export-session-btn" class="btn btn-secondary btn-sm" type="button" disabled>
                <i data-lucide="Download"></i>
                <span>Export</span>
              </button>
              <button id="import-session-btn" class="btn btn-secondary btn-sm" type="button">
                <i data-lucide="Upload"></i>
                <span>Import</span>
              </button>
              <button id="clear-session-btn" class="btn btn-danger btn-sm" type="button" disabled>
                <i data-lucide="Trash2"></i>
                <span>Clear</span>
              </button>
              <button id="refresh-pricing-btn" class="btn btn-secondary btn-sm" type="button" disabled>
                <i data-lucide="refresh-cw"></i>
                <span>Pricing</span>
              </button>
            </div>
          </section>
        </div>

        <div class="view-controls view-strip">
          <label class="view-toggle">
            <input type="checkbox" id="consolidated-view-toggle" class="form-checkbox rounded">
            <span>Consolidated view</span>
          </label>
          <div class="size-control">
            <label for="card-size-slider">Card size</label>
            <input type="range" id="card-size-slider" min="80" max="200" value="120" step="10">
            <span id="card-size-value" class="size-value">120px</span>
          </div>
        </div>

        <div class="cards-surface bg-neutral-900/40 backdrop-blur-sm border border-neutral-800/50 rounded-xl">
          <div id="session-cards" class="card-grid-container">
            <div class="empty-state">
              <i data-lucide="package-open"></i>
              <p>Start a session and use voice recognition to add cards</p>
            </div>
          </div>
        </div>
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
        const name = (set.name || '').toLowerCase();
        const code = (set.code || set.id || '').toLowerCase();
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

      const selectedSetId = this.selectedSetId;

      if (!selectedSetId) {
        this.showError('Please select a card set');
        return;
      }

      if (!this.sessionManager) {
        this.showError('Session Manager not available');
        return;
      }

      // Find selected set
      const selectedSet = this.cardSets.find(set => set.id === selectedSetId);
      if (!selectedSet) {
        this.showError('Selected set not found');
        return;
      }

      this.isStartingSession = true;
      this.updateButtons();

      const sessionSetId = selectedSet.id || selectedSet.code || selectedSet.set_code;
      const sessionSetName = selectedSet.set_name || selectedSet.name || sessionSetId;

      console.info('[PackOpeningPage] Starting session', {
        setId: sessionSetId,
        setName: sessionSetName,
        setCode: selectedSet.code || selectedSet.set_code,
      });

      if (this.sessionManager?.apiUrl) {
        const expectedUrl = `${this.sessionManager.apiUrl}/card-sets/${encodeURIComponent(sessionSetName)}/cards`;
        console.info('[PackOpeningPage] loadSetCards() will request:', expectedUrl);
      }

      // Start session with a hard timeout to avoid UI lockups
      const START_TIMEOUT_MS = 15000;
      const startPromise = this.sessionManager.startSession(sessionSetId);
      await Promise.race([
        startPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Session start timed out')), START_TIMEOUT_MS))
      ]);

      this.isSessionActive = true;
      this.currentSession = this.sessionManager.currentSession;

      // Update UI
      this.updateSessionUI();
      this.updateButtons();
      this.setSelectedSet(selectedSet.id, { updateInput: true, hideSuggestions: true });

      console.info('[PackOpeningPage] Session ready with live data', {
        sessionId: this.currentSession?.id,
        setId: sessionSetId,
        cardsLoaded: this.sessionManager?.setCards?.get?.(sessionSetId)?.length,
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
      currentSetEl.textContent = this.currentSession?.setName || 'None';
    }

    // Update card count
    const cardsCountEl = this.container?.querySelector('#cards-count');
    if (cardsCountEl) {
      cardsCountEl.textContent = cardCount;
    }

    // Update card count badge (new in compact layout)
    const cardsCountBadge = this.container?.querySelector('#cards-count-badge');
    if (cardsCountBadge) {
      cardsCountBadge.textContent = cardCount;
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

    // Update status (if element exists - optional in compact layout)
    const statusEl = this.container?.querySelector('#session-status');
    if (statusEl) {
      const status = this.isSessionActive ? 'Active' : 'Not Started';
      const statusClass = this.isSessionActive ? 'bg-green-600/20 text-green-400' : 'bg-neutral-700/50 text-neutral-400';
      statusEl.innerHTML = `<span class="inline-flex items-center px-2 py-1 rounded ${statusClass}">${status}</span>`;
    }

    if (this.isSessionActive && this.currentSession?.setId && this.selectedSetId !== this.currentSession.setId) {
      this.setSelectedSet(this.currentSession.setId, { updateInput: true, hideSuggestions: true });
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
    const swapSetBtn = this.container?.querySelector('#swap-set-btn');

    if (startSessionBtn) {
      startSessionBtn.disabled = !this.selectedSetId || this.isSessionActive || this.isStartingSession;
    }

    if (swapSetBtn) {
      if (this.isSessionActive) {
        const currentSetId = this.currentSession?.setId || null;
        const canSwap = Boolean(this.selectedSetId && this.selectedSetId !== currentSetId);
        swapSetBtn.classList.remove('hidden');
        swapSetBtn.disabled = !canSwap;
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
      showRemoveButton: true
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
            this.setSelectedSet(firstSuggestion.id);
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
        this.clearSelectedSet({ updateInput: false });
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
        this.setSelectedSet(target.dataset.setId);
      };
      setSuggestions.addEventListener('mousedown', this.boundHandlers.suggestionClick);
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
      this.voiceEngine.onResult(this.boundHandlers.handleVoiceResult);
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

    // Remove voice engine listeners
    if (this.voiceEngine) {
      if (this.boundHandlers.handleVoiceResult) {
        this.voiceEngine.removeListener('result', this.boundHandlers.handleVoiceResult);
      }
      if (this.boundHandlers.handleVoiceStatus) {
        this.voiceEngine.removeListener('statusChange', this.boundHandlers.handleVoiceStatus);
      }
      if (this.boundHandlers.handleVoiceError) {
        this.voiceEngine.removeListener('error', this.boundHandlers.handleVoiceError);
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
}
