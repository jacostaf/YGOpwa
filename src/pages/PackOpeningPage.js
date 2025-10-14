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
    this.isVoiceListening = false;
    this.consolidatedView = false;
    this.cardSize = 120;

    // Event listeners
    this.boundHandlers = {};
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

      // Get card sets from session manager
      await this.sessionManager.loadCardSets();
      this.cardSets = this.sessionManager.cardSets || [];
      this.filteredSets = [...this.cardSets];

      // Update UI
      this.updateSetSelect();
      this.updateSetCounts();

      console.log(`Loaded ${this.cardSets.length} card sets`);
    } catch (error) {
      console.error('Error loading card sets:', error);
      this.showError('Failed to load card sets. Please refresh and try again.');
    }
  }

  /**
   * Render the page (COMPACT VERSION)
   * @returns {string} HTML string
   */
  render() {
    return `
      <div class="page-content pack-opening-page-compact">
        <!-- Compact Controls Bar -->
        <div class="glass-card compact-controls" style="margin-bottom: 1rem; padding: 1rem;">
          <div class="controls-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; align-items: start;">

            <!-- Set Selection (Compact) -->
            <details class="control-section" open>
              <summary class="control-header">
                <i data-lucide="package" style="width: 16px; height: 16px;"></i>
                <span>Set Selection</span>
                <i data-lucide="chevron-down" class="chevron" style="width: 14px; height: 14px; margin-left: auto;"></i>
              </summary>
              <div class="control-body" style="margin-top: 0.75rem;">
                <input type="text"
                       id="set-search"
                       class="input-compact"
                       placeholder="Search sets..."
                       style="width: 100%; margin-bottom: 0.5rem;"
                       aria-label="Search card sets">
                <select id="set-select"
                        size="4"
                        class="input-compact"
                        style="width: 100%; margin-bottom: 0.5rem;"
                        aria-label="Select a card set">
                  <option value="">Loading...</option>
                </select>
                <p class="text-xs text-secondary" style="margin-bottom: 0.5rem;">
                  <span id="sets-count">0</span> of <span id="total-sets-count">0</span> sets
                </p>
                <div class="btn-group-compact">
                  <button id="start-session-btn" class="btn btn-primary btn-sm" disabled>
                    <i data-lucide="play" style="width: 14px; height: 14px;"></i>
                    <span>Start</span>
                  </button>
                  <button id="refresh-sets-btn" class="btn btn-secondary btn-sm">
                    <i data-lucide="refresh-cw" style="width: 14px; height: 14px;"></i>
                  </button>
                  <button id="swap-set-btn" class="btn btn-secondary btn-sm hidden">
                    <i data-lucide="repeat" style="width: 14px; height: 14px;"></i>
                  </button>
                </div>
              </div>
            </details>

            <!-- Voice Controls (Compact) -->
            <details class="control-section" open>
              <summary class="control-header">
                <i data-lucide="mic" style="width: 16px; height: 16px;"></i>
                <span>Voice</span>
                <div class="status-dot" id="voice-indicator" style="margin-left: auto; margin-right: 0.5rem;"></div>
                <i data-lucide="chevron-down" class="chevron" style="width: 14px; height: 14px;"></i>
              </summary>
              <div class="control-body" style="margin-top: 0.75rem;">
                <div class="btn-group-compact" style="margin-bottom: 0.5rem;">
                  <button id="start-voice-btn" class="btn btn-primary btn-sm" disabled>
                    <i data-lucide="mic" style="width: 14px; height: 14px;"></i>
                    <span>Listen</span>
                  </button>
                  <button id="stop-voice-btn" class="btn btn-danger btn-sm" style="display: none;">
                    <i data-lucide="square" style="width: 14px; height: 14px;"></i>
                    <span>Stop</span>
                  </button>
                  <button id="test-voice-btn" class="btn btn-secondary btn-sm">
                    <i data-lucide="volume-2" style="width: 14px; height: 14px;"></i>
                  </button>
                </div>
                <p class="text-xs text-secondary" id="voice-status-text">Ready</p>
              </div>
            </details>

            <!-- Session Stats (Compact) -->
            <details class="control-section" open>
              <summary class="control-header">
                <i data-lucide="folder-open" style="width: 16px; height: 16px;"></i>
                <span>Session</span>
                <span class="badge-sm" id="cards-count-badge" style="margin-left: auto; margin-right: 0.5rem;">0</span>
                <i data-lucide="chevron-down" class="chevron" style="width: 14px; height: 14px;"></i>
              </summary>
              <div class="control-body" style="margin-top: 0.75rem;">
                <div class="stats-mini" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 0.5rem; font-size: 0.75rem;">
                  <div>
                    <span class="text-secondary">Cards:</span>
                    <span class="text-primary" id="cards-count">0</span>
                  </div>
                  <div>
                    <span class="text-secondary">TCG Low:</span>
                    <span class="text-success" id="tcg-low-total">$0</span>
                  </div>
                  <div>
                    <span class="text-secondary">Market:</span>
                    <span id="tcg-market-total">$0</span>
                  </div>
                  <div>
                    <span class="text-secondary">Set:</span>
                    <span id="current-set">None</span>
                  </div>
                </div>
                <div class="btn-group-compact">
                  <button id="export-session-btn" class="btn btn-secondary btn-sm" disabled title="Export session">
                    <i data-lucide="download" style="width: 14px; height: 14px;"></i>
                  </button>
                  <button id="import-session-btn" class="btn btn-secondary btn-sm" title="Import session">
                    <i data-lucide="upload" style="width: 14px; height: 14px;"></i>
                  </button>
                  <button id="clear-session-btn" class="btn btn-danger btn-sm" disabled title="Clear session">
                    <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                  </button>
                  <button id="refresh-pricing-btn" class="btn btn-secondary btn-sm" disabled title="Refresh pricing">
                    <i data-lucide="refresh-cw" style="width: 14px; height: 14px;"></i>
                  </button>
                </div>
              </div>
            </details>

            <!-- View Controls (Compact, starts closed) -->
            <details class="control-section">
              <summary class="control-header">
                <i data-lucide="layout-grid" style="width: 16px; height: 16px;"></i>
                <span>View</span>
                <i data-lucide="chevron-down" class="chevron" style="width: 14px; height: 14px; margin-left: auto;"></i>
              </summary>
              <div class="control-body" style="margin-top: 0.75rem;">
                <label class="checkbox-compact" style="margin-bottom: 0.5rem;">
                  <input type="checkbox" id="consolidated-toggle">
                  <span>Consolidated</span>
                </label>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <span class="text-xs text-secondary">Size:</span>
                  <input type="range" id="card-size-slider" min="100" max="200" value="120" class="slider-compact" style="flex: 1;">
                  <span class="text-xs" id="card-size-value">120px</span>
                </div>
              </div>
            </details>

          </div>
        </div>

        <!-- Cards Display Area (MAXIMUM SPACE) -->
        <div class="glass-card" style="padding: 1rem; flex: 1; min-height: 400px;">
          <div id="card-grid-container" style="min-height: 300px;">
            <div class="empty-state" style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 300px; color: var(--text-secondary);">
              <i data-lucide="package-open" style="width: 48px; height: 48px; margin-bottom: 1rem; opacity: 0.5;"></i>
              <p>Start a session and use voice recognition to add cards</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render set selection section
   * @returns {string} HTML string
   */
  renderSetSelection() {
    return `
      <div class="card section-card bg-neutral-900/40 backdrop-blur-sm border border-neutral-800/50 rounded-xl p-6 mb-6">
        <h2 class="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <i data-lucide="Package" class="w-6 h-6"></i>
          Pack Ripper Setup
        </h2>

        <div class="set-selection-grid grid grid-cols-1 gap-4 mb-4">
          <!-- Search Input -->
          <div class="form-group">
            <label for="set-search" class="block text-sm font-medium text-neutral-300 mb-2">
              Search Card Sets
            </label>
            <div class="relative">
              <i data-lucide="Search" class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-500"></i>
              <input type="text"
                     id="set-search"
                     class="w-full pl-10 pr-4 py-2 bg-neutral-800/50 border border-neutral-700/50 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
                     placeholder="Type set name or code to filter..."
                     aria-label="Search card sets">
            </div>
            <p class="text-xs text-neutral-500 mt-1">
              Filter through <span id="total-sets-count">0</span> card sets by name or code
            </p>
          </div>

          <!-- Set Select Dropdown -->
          <div class="form-group">
            <label for="set-select" class="block text-sm font-medium text-neutral-300 mb-2">
              Card Set
            </label>
            <select id="set-select"
                    size="8"
                    class="w-full px-4 py-2 bg-neutral-800/50 border border-neutral-700/50 rounded-lg text-white focus:outline-none focus:border-neutral-600"
                    aria-label="Select a card set">
              <option value="">Loading card sets...</option>
            </select>
            <p class="text-xs text-neutral-500 mt-1">
              Showing <span id="sets-count">0</span> sets
            </p>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-wrap gap-3">
          <button id="refresh-sets-btn" class="btn btn-secondary flex items-center gap-2">
            <i data-lucide="RefreshCw" class="w-4 h-4"></i>
            Refresh Sets
          </button>
          <button id="start-session-btn" class="btn btn-primary flex items-center gap-2" disabled>
            <i data-lucide="Play" class="w-4 h-4"></i>
            Start Session
          </button>
          <button id="swap-set-btn" class="btn btn-secondary flex items-center gap-2 hidden">
            <i data-lucide="RefreshCw" class="w-4 h-4"></i>
            Swap Set & Continue
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Render voice recognition section
   * @returns {string} HTML string
   */
  renderVoiceRecognition() {
    return `
      <div class="card section-card bg-neutral-900/40 backdrop-blur-sm border border-neutral-800/50 rounded-xl p-6 mb-6">
        <h2 class="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <i data-lucide="Mic" class="w-6 h-6"></i>
          Voice Recognition
        </h2>

        <!-- Voice Status -->
        <div class="voice-status mb-4 flex items-center gap-3 p-4 bg-neutral-800/30 rounded-lg">
          <div class="status-indicator w-3 h-3 rounded-full bg-neutral-600" id="voice-indicator"></div>
          <span class="status-text text-sm text-neutral-300" id="voice-status-text">Initializing...</span>
        </div>

        <!-- Voice Actions -->
        <div class="voice-actions flex flex-wrap gap-3 mb-4">
          <button id="start-voice-btn" class="btn btn-voice bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2" disabled>
            <i data-lucide="Mic" class="w-4 h-4"></i>
            Start Listening
          </button>
          <button id="stop-voice-btn" class="btn btn-voice-stop bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 hidden">
            <i data-lucide="Square" class="w-4 h-4"></i>
            Stop Listening
          </button>
          <button id="test-voice-btn" class="btn btn-secondary flex items-center gap-2">
            <i data-lucide="TestTube" class="w-4 h-4"></i>
            Test Voice
          </button>
        </div>

        <!-- Voice Help -->
        <details class="voice-help text-sm">
          <summary class="cursor-pointer text-neutral-400 hover:text-neutral-300 py-2">
            Voice Recognition Help
          </summary>
          <div class="help-content mt-3 p-4 bg-neutral-800/30 rounded-lg text-neutral-400 space-y-2">
            <p class="font-medium text-neutral-300">Tips for better voice recognition:</p>
            <ul class="list-disc list-inside space-y-1 ml-2">
              <li>Speak clearly and at a normal pace</li>
              <li>Ensure microphone permissions are granted</li>
              <li>Use a quiet environment</li>
              <li>Say the full card name including any subtitles</li>
              <li>If a card isn't recognized, try the training patterns feature</li>
            </ul>
          </div>
        </details>
      </div>
    `;
  }

  /**
   * Render session tracker section
   * @returns {string} HTML string
   */
  renderSessionTracker() {
    return `
      <div class="card section-card bg-neutral-900/40 backdrop-blur-sm border border-neutral-800/50 rounded-xl p-6">
        <!-- Section Header -->
        <div class="section-header flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h2 class="text-xl font-semibold text-white flex items-center gap-2">
            <i data-lucide="FolderOpen" class="w-6 h-6"></i>
            Current Session
          </h2>
          <div class="header-actions flex flex-wrap gap-2">
            <button id="refresh-pricing-btn" class="btn btn-secondary btn-sm flex items-center gap-2" disabled title="Refresh pricing data">
              <i data-lucide="RefreshCw" class="w-3 h-3"></i>
              <span class="hidden sm:inline">Refresh Pricing</span>
            </button>
            <button id="export-session-btn" class="btn btn-secondary btn-sm flex items-center gap-2" disabled>
              <i data-lucide="Download" class="w-3 h-3"></i>
              <span class="hidden sm:inline">Export</span>
            </button>
            <button id="import-session-btn" class="btn btn-secondary btn-sm flex items-center gap-2">
              <i data-lucide="Upload" class="w-3 h-3"></i>
              <span class="hidden sm:inline">Import</span>
            </button>
            <button id="clear-session-btn" class="btn btn-danger btn-sm flex items-center gap-2" disabled>
              <i data-lucide="Trash2" class="w-3 h-3"></i>
              <span class="hidden sm:inline">Clear</span>
            </button>
          </div>
        </div>

        <!-- Session Stats -->
        <div class="session-stats grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <div class="stat-item p-3 bg-neutral-800/30 rounded-lg">
            <span class="stat-label text-xs text-neutral-500 block mb-1">Set:</span>
            <span class="stat-value text-sm font-medium text-white" id="current-set">None</span>
          </div>
          <div class="stat-item p-3 bg-neutral-800/30 rounded-lg">
            <span class="stat-label text-xs text-neutral-500 block mb-1">Cards:</span>
            <span class="stat-value text-sm font-medium text-white" id="cards-count">0</span>
          </div>
          <div class="stat-item p-3 bg-neutral-800/30 rounded-lg">
            <span class="stat-label text-xs text-neutral-500 block mb-1">TCG Low:</span>
            <span class="stat-value text-sm font-medium text-green-400" id="tcg-low-total">$0.00</span>
          </div>
          <div class="stat-item p-3 bg-neutral-800/30 rounded-lg">
            <span class="stat-label text-xs text-neutral-500 block mb-1">TCG Market:</span>
            <span class="stat-value text-sm font-medium text-neutral-300" id="tcg-market-total">$0.00</span>
          </div>
          <div class="stat-item p-3 bg-neutral-800/30 rounded-lg sm:col-span-3 lg:col-span-1">
            <span class="stat-label text-xs text-neutral-500 block mb-1">Status:</span>
            <span class="stat-value text-sm font-medium" id="session-status">
              <span class="inline-flex items-center px-2 py-1 rounded bg-neutral-700/50 text-neutral-400">
                Not Started
              </span>
            </span>
          </div>
        </div>

        <!-- View Controls -->
        <div class="view-controls flex flex-wrap items-center gap-4 mb-6 p-4 bg-neutral-800/30 rounded-lg">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" id="consolidated-view-toggle" class="form-checkbox rounded">
            <span class="text-sm text-neutral-300">Consolidated View</span>
          </label>
          <div class="flex items-center gap-3 ml-auto">
            <label for="card-size-slider" class="text-sm text-neutral-300">Card Size:</label>
            <input type="range" id="card-size-slider" min="80" max="200" value="120" step="10" class="w-32">
            <span class="text-sm text-neutral-400 font-mono" id="card-size-value">120px</span>
          </div>
        </div>

        <!-- Session Cards Container -->
        <div class="session-cards" id="session-cards">
          <!-- Cards will be rendered here by CardGrid component -->
        </div>
      </div>
    `;
  }

  /**
   * Update set select dropdown
   * @private
   */
  updateSetSelect() {
    const setSelect = this.container?.querySelector('#set-select');
    if (!setSelect) return;

    if (this.filteredSets.length === 0) {
      setSelect.innerHTML = '<option value="">No sets found</option>';
      return;
    }

    setSelect.innerHTML = this.filteredSets
      .map(set => `<option value="${set.id}">${this.escapeHtml(set.name)} (${this.escapeHtml(set.code || set.id)})</option>`)
      .join('');
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
    const term = searchTerm.toLowerCase().trim();

    if (!term) {
      this.filteredSets = [...this.cardSets];
    } else {
      this.filteredSets = this.cardSets.filter(set => {
        const name = (set.name || '').toLowerCase();
        const code = (set.code || set.id || '').toLowerCase();
        return name.includes(term) || code.includes(term);
      });
    }

    this.updateSetSelect();
    this.updateSetCounts();
  }

  /**
   * Start a new session
   * @private
   */
  async startSession() {
    try {
      const setSelect = this.container?.querySelector('#set-select');
      const selectedSetId = setSelect?.value;

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

      // Start session
      await this.sessionManager.startSession(selectedSet);
      this.isSessionActive = true;
      this.currentSession = this.sessionManager.currentSession;

      // Update UI
      this.updateSessionUI();
      this.updateButtons();

      console.log('Session started:', selectedSet.name);
    } catch (error) {
      console.error('Error starting session:', error);
      this.showError('Failed to start session. Please try again.');
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
      startSessionBtn.disabled = this.isSessionActive;
    }

    if (swapSetBtn) {
      if (this.isSessionActive) {
        swapSetBtn.classList.remove('hidden');
      } else {
        swapSetBtn.classList.add('hidden');
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

    // Destroy existing card grid
    if (this.cardGrid) {
      this.cardGrid.destroy();
      this.cardGrid = null;
    }

    // Get cards from current session
    const cards = this.currentSession?.cards || [];

    // Create new card grid
    this.cardGrid = new CardGrid({
      cards,
      onRemoveCard: (card, index) => this.removeCard(index),
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
  async removeCard(index) {
    try {
      if (!this.sessionManager) return;

      await this.sessionManager.removeCard(index);

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
    // Set search
    const setSearch = this.container?.querySelector('#set-search');
    if (setSearch) {
      this.boundHandlers.setSearch = (e) => this.filterCardSets(e.target.value);
      setSearch.addEventListener('input', this.boundHandlers.setSearch);
    }

    // Set select
    const setSelect = this.container?.querySelector('#set-select');
    if (setSelect) {
      this.boundHandlers.setSelect = () => {
        const startBtn = this.container?.querySelector('#start-session-btn');
        if (startBtn) {
          startBtn.disabled = !setSelect.value || this.isSessionActive;
        }
      };
      setSelect.addEventListener('change', this.boundHandlers.setSelect);
    }

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
      this.boundHandlers.voiceResult = (result) => this.handleVoiceResult(result);
      this.boundHandlers.voiceStatus = () => this.updateVoiceUI();

      this.voiceEngine.onResult(this.boundHandlers.voiceResult);
      this.voiceEngine.onStatusChange(this.boundHandlers.voiceStatus);
    }

    // Session manager events (if available)
    if (this.sessionManager && this.sessionManager.addEventListener) {
      this.boundHandlers.sessionUpdate = () => {
        this.updateSessionUI();
        this.renderCards();
      };
      this.sessionManager.addEventListener('sessionUpdate', this.boundHandlers.sessionUpdate);
      this.sessionManager.addEventListener('cardAdded', this.boundHandlers.sessionUpdate);
      this.sessionManager.addEventListener('cardRemoved', this.boundHandlers.sessionUpdate);
    }
  }

  /**
   * Remove event listeners
   * @private
   */
  removeEventListeners() {
    // Remove DOM event listeners
    Object.keys(this.boundHandlers).forEach(key => {
      // DOM handlers are already removed when elements are cleared
    });

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
            <div class="card section-card glass-card bg-neutral-900/40 backdrop-blur-sm border border-neutral-800/50 rounded-xl p-6">
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
