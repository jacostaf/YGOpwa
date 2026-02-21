/**
 * VoiceTrainingPage.js - Voice Recognition Training Management
 *
 * Complete implementation for Phase 9: Voice Training Page
 * Provides interface for managing voice training patterns, viewing analytics,
 * and controlling the voice learning system.
 */

import PatternList from '../components/PatternList.js';
import { refreshIcons } from '../utils/IconLoader.js';

export default class VoiceTrainingPage {
  constructor(router) {
    this.router = router;
    this.container = null;
    this.app = null;
    this.learningEngine = null;
    this.patternList = null;

    // State
    this.patterns = [];
    this.filteredPatterns = [];
    this.searchQuery = '';
    this.filterBy = 'all'; // all, high, medium, low
    this.stats = {
      totalPatterns: 0,
      activePatterns: 0,
      avgSuccessRate: 0,
      totalReinforcements: 0
    };

    // Bound handlers
    this.boundHandlers = {
      handleSearch: this.handleSearch.bind(this),
      handleFilter: this.handleFilter.bind(this),
      handleExport: this.handleExport.bind(this),
      handleImport: this.handleImport.bind(this),
      handleReset: this.handleReset.bind(this),
      handleRefresh: this.handleRefresh.bind(this),
      handlePatternEdit: this.handlePatternEdit.bind(this),
      handlePatternDelete: this.handlePatternDelete.bind(this)
    };
  }

  /**
   * Render the page
   */
  render() {
    return `
      <div class="page-content voice-training-page">
        <!-- Page Actions -->
        <div class="page-actions" style="display: flex; justify-content: flex-end; margin-bottom: 24px;">
          <button class="btn btn-secondary btn-refresh" title="Refresh patterns">
            <i data-lucide="refresh-cw"></i>
            Refresh
          </button>
        </div>

        <!-- Training Stats Grid -->
        <div class="training-stats-grid">
          ${this.renderStatsCard('Total Patterns', this.stats.totalPatterns, 'database', 'primary')}
          ${this.renderStatsCard('Active Patterns', this.stats.activePatterns, 'check-circle', 'success')}
          ${this.renderStatsCard('Avg Success Rate', `${Math.round(this.stats.avgSuccessRate * 100)}%`, 'target', 'info')}
          ${this.renderStatsCard('Total Uses', this.stats.totalReinforcements, 'repeat', 'warning')}
        </div>

        <!-- Search and Filter Section -->
        <div class="search-filter-section bg-neutral-900/40 backdrop-blur-sm border border-neutral-800/50 rounded-xl">
          <div class="search-box">
            <i data-lucide="search"></i>
            <input
              type="text"
              class="search-input"
              placeholder="Search patterns by voice input or card name..."
              value="${this.escapeHtml(this.searchQuery)}"
            >
          </div>

          <div class="filter-controls">
            <label>Filter:</label>
            <select class="filter-select" data-filter="${this.filterBy}">
              <option value="all" ${this.filterBy === 'all' ? 'selected' : ''}>All Patterns</option>
              <option value="high" ${this.filterBy === 'high' ? 'selected' : ''}>High Success (≥80%)</option>
              <option value="medium" ${this.filterBy === 'medium' ? 'selected' : ''}>Medium Success (50-79%)</option>
              <option value="low" ${this.filterBy === 'low' ? 'selected' : ''}>Low Success (&lt;50%)</option>
            </select>
          </div>

          <div class="action-controls">
            <button class="btn btn-primary btn-export" title="Export patterns to JSON">
              <i data-lucide="download"></i>
              Export
            </button>
            <button class="btn btn-secondary btn-import" title="Import patterns from JSON">
              <i data-lucide="upload"></i>
              Import
            </button>
            <button class="btn btn-danger btn-reset" title="Reset all patterns">
              <i data-lucide="trash-2"></i>
              Reset All
            </button>
          </div>
        </div>

        <!-- Pattern List Container -->
        <div id="pattern-list-container"></div>

        <!-- Training Analytics Section -->
        ${this.renderAnalytics()}

        <!-- Help Section -->
        ${this.renderHelpSection()}
      </div>
    `;
  }

  /**
   * Render stats card
   */
  renderStatsCard(title, value, icon, colorClass) {
    return `
      <div class="stat-card bg-neutral-900/40 backdrop-blur-sm border border-neutral-800/50 rounded-xl stat-${colorClass}">
        <div class="stat-icon">
          <i data-lucide="${icon}"></i>
        </div>
        <div class="stat-content">
          <div class="stat-value">${value}</div>
          <div class="stat-label">${title}</div>
        </div>
      </div>
    `;
  }

  /**
   * Render analytics section
   */
  renderAnalytics() {
    if (!this.patterns || this.patterns.length === 0) {
      return '';
    }

    // Calculate top patterns
    const topPatterns = [...this.patterns]
      .sort((a, b) => (b.reinforcements || 0) - (a.reinforcements || 0))
      .slice(0, 5);

    return `
      <div class="training-analytics bg-neutral-900/40 backdrop-blur-sm border border-neutral-800/50 rounded-xl">
        <h2><i data-lucide="bar-chart-2"></i> Training Analytics</h2>

        <div class="analytics-grid">
          <!-- Top Patterns -->
          <div class="analytics-section">
            <h3>Most Trained Patterns</h3>
            <div class="top-patterns-list">
              ${topPatterns.length > 0 ? topPatterns.map((pattern, index) => `
                <div class="top-pattern-item">
                  <span class="pattern-rank">#${index + 1}</span>
                  <div class="pattern-info">
                    <div class="pattern-mapping-compact">
                      <span class="voice-text">"${this.escapeHtml(pattern.voiceInput)}"</span>
                      <i data-lucide="arrow-right"></i>
                      <span class="card-text">"${this.escapeHtml(pattern.targetCard)}"</span>
                    </div>
                    <div class="pattern-meta">
                      ${pattern.reinforcements || 1} uses • ${Math.round(pattern.successRate * 100)}% success
                    </div>
                  </div>
                </div>
              `).join('') : '<p class="no-data">No pattern data yet</p>'}
            </div>
          </div>

          <!-- Success Rate Distribution -->
          <div class="analytics-section">
            <h3>Success Rate Distribution</h3>
            ${this.renderSuccessRateDistribution()}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render success rate distribution chart
   */
  renderSuccessRateDistribution() {
    const distribution = {
      high: this.patterns.filter(p => p.successRate >= 0.8).length,
      medium: this.patterns.filter(p => p.successRate >= 0.5 && p.successRate < 0.8).length,
      low: this.patterns.filter(p => p.successRate < 0.5).length
    };

    const total = distribution.high + distribution.medium + distribution.low;

    if (total === 0) {
      return '<p class="no-data">No patterns to analyze</p>';
    }

    const highPercent = (distribution.high / total) * 100;
    const mediumPercent = (distribution.medium / total) * 100;
    const lowPercent = (distribution.low / total) * 100;

    return `
      <div class="distribution-chart">
        <div class="distribution-bar">
          ${highPercent > 0 ? `<div class="bar-segment bar-high" style="width: ${highPercent}%"></div>` : ''}
          ${mediumPercent > 0 ? `<div class="bar-segment bar-medium" style="width: ${mediumPercent}%"></div>` : ''}
          ${lowPercent > 0 ? `<div class="bar-segment bar-low" style="width: ${lowPercent}%"></div>` : ''}
        </div>
        <div class="distribution-legend">
          <div class="legend-item">
            <span class="legend-color legend-high"></span>
            <span>High (≥80%): ${distribution.high}</span>
          </div>
          <div class="legend-item">
            <span class="legend-color legend-medium"></span>
            <span>Medium (50-79%): ${distribution.medium}</span>
          </div>
          <div class="legend-item">
            <span class="legend-color legend-low"></span>
            <span>Low (<50%): ${distribution.low}</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render help section
   */
  renderHelpSection() {
    return `
      <div class="training-help bg-neutral-900/40 backdrop-blur-sm border border-neutral-800/50 rounded-xl">
        <h3><i data-lucide="help-circle"></i> How Voice Training Works</h3>
        <div class="help-content">
          <div class="help-item">
            <i data-lucide="mic"></i>
            <div>
              <strong>Automatic Learning</strong>
              <p>The system learns from your voice interactions automatically. When you use voice recognition, it remembers successful recognitions.</p>
            </div>
          </div>
          <div class="help-item">
            <i data-lucide="target"></i>
            <div>
              <strong>Training Patterns</strong>
              <p>Each pattern represents a learned association between what you said and which card was recognized. Higher success rates indicate more reliable patterns.</p>
            </div>
          </div>
          <div class="help-item">
            <i data-lucide="zap"></i>
            <div>
              <strong>Pattern Management</strong>
              <p>Edit patterns to refine recognition, delete incorrect patterns, or reset all patterns to start fresh. Export/import allows backup and sharing.</p>
            </div>
          </div>
          <div class="help-item">
            <i data-lucide="trending-up"></i>
            <div>
              <strong>Continuous Improvement</strong>
              <p>The more you use voice recognition, the better it becomes at understanding your pronunciation and preferences.</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Mount page to container
   */
  async mount(container) {
    this.container = container;

    // Get app instance from router
    this.app = this.router.app;

    // Initialize learning engine connection
    await this.initializeLearningEngine();

    // Load patterns and stats
    await this.loadPatterns();

    // Render page
    this.container.innerHTML = this.render();

    // Attach event listeners
    this.attachEventListeners();

    // Mount pattern list
    this.mountPatternList();

    refreshIcons();

    console.log('VoiceTrainingPage mounted');
  }

  /**
   * Initialize learning engine connection
   */
  async initializeLearningEngine() {
    try {
      if (this.app && this.app.voiceEngine && this.app.voiceEngine.learningEngine) {
        this.learningEngine = this.app.voiceEngine.learningEngine;
        console.log('Connected to learning engine:', this.learningEngine);
      } else {
        console.warn('Learning engine not available');
      }
    } catch (error) {
      console.error('Error initializing learning engine:', error);
    }
  }

  /**
   * Load patterns from learning engine
   */
  async loadPatterns() {
    try {
      if (!this.learningEngine) {
        console.warn('Learning engine not available, cannot load patterns');
        this.patterns = [];
        this.filteredPatterns = [];
        this.updateStats();
        return;
      }

      // Get patterns from userPatterns Map
      const patternsMap = this.learningEngine.userPatterns;

      if (patternsMap && patternsMap.size > 0) {
        this.patterns = Array.from(patternsMap.entries()).map(([key, pattern]) => ({
          id: key,
          voiceInput: pattern.voiceInput || '',
          targetCard: pattern.targetCard || '',
          successRate: pattern.successRate || 0,
          reinforcements: pattern.reinforcements || 1,
          confidence: pattern.confidence || 0,
          lastSeen: pattern.lastSeen || pattern.timestamp || Date.now()
        }));

        console.log(`Loaded ${this.patterns.length} patterns from learning engine`);
      } else {
        console.log('No patterns found in learning engine');
        this.patterns = [];
      }

      // Apply current filter
      this.applySearchAndFilter();

      // Update stats
      this.updateStats();
    } catch (error) {
      console.error('Error loading patterns:', error);
      this.patterns = [];
      this.filteredPatterns = [];
      this.updateStats();
    }
  }

  /**
   * Update statistics
   */
  updateStats() {
    if (!this.patterns || this.patterns.length === 0) {
      this.stats = {
        totalPatterns: 0,
        activePatterns: 0,
        avgSuccessRate: 0,
        totalReinforcements: 0
      };
      return;
    }

    this.stats.totalPatterns = this.patterns.length;
    this.stats.activePatterns = this.patterns.filter(p => p.successRate >= 0.7).length;

    const totalSuccessRate = this.patterns.reduce((sum, p) => sum + (p.successRate || 0), 0);
    this.stats.avgSuccessRate = totalSuccessRate / this.patterns.length;

    this.stats.totalReinforcements = this.patterns.reduce((sum, p) => sum + (p.reinforcements || 1), 0);
  }

  /**
   * Apply search and filter
   */
  applySearchAndFilter() {
    let filtered = [...this.patterns];

    // Apply search
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(p =>
        p.voiceInput.toLowerCase().includes(query) ||
        p.targetCard.toLowerCase().includes(query)
      );
    }

    // Apply filter
    if (this.filterBy !== 'all') {
      switch (this.filterBy) {
        case 'high':
          filtered = filtered.filter(p => p.successRate >= 0.8);
          break;
        case 'medium':
          filtered = filtered.filter(p => p.successRate >= 0.5 && p.successRate < 0.8);
          break;
        case 'low':
          filtered = filtered.filter(p => p.successRate < 0.5);
          break;
      }
    }

    this.filteredPatterns = filtered;
  }

  /**
   * Mount pattern list component
   */
  mountPatternList() {
    const patternListContainer = this.container.querySelector('#pattern-list-container');

    if (patternListContainer) {
      this.patternList = new PatternList({
        patterns: this.filteredPatterns,
        onEdit: this.boundHandlers.handlePatternEdit,
        onDelete: this.boundHandlers.handlePatternDelete
      });

      this.patternList.mount(patternListContainer);
    }
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    if (!this.container) return;

    // Search input
    const searchInput = this.container.querySelector('.search-input');
    if (searchInput) {
      let searchTimeout;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.boundHandlers.handleSearch(e);
        }, 300);
      });
    }

    // Filter select
    const filterSelect = this.container.querySelector('.filter-select');
    if (filterSelect) {
      filterSelect.addEventListener('change', this.boundHandlers.handleFilter);
    }

    // Export button
    const exportBtn = this.container.querySelector('.btn-export');
    if (exportBtn) {
      exportBtn.addEventListener('click', this.boundHandlers.handleExport);
    }

    // Import button
    const importBtn = this.container.querySelector('.btn-import');
    if (importBtn) {
      importBtn.addEventListener('click', this.boundHandlers.handleImport);
    }

    // Reset button
    const resetBtn = this.container.querySelector('.btn-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', this.boundHandlers.handleReset);
    }

    // Refresh button
    const refreshBtn = this.container.querySelector('.btn-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', this.boundHandlers.handleRefresh);
    }
  }

  /**
   * Handle search input
   */
  handleSearch(e) {
    this.searchQuery = e.target.value;
    this.applySearchAndFilter();

    // Update pattern list
    if (this.patternList) {
      this.patternList.update(this.filteredPatterns);
    }
  }

  /**
   * Handle filter change
   */
  handleFilter(e) {
    this.filterBy = e.target.value;
    this.applySearchAndFilter();

    // Update pattern list
    if (this.patternList) {
      this.patternList.update(this.filteredPatterns);
    }
  }

  /**
   * Handle pattern edit
   */
  async handlePatternEdit(pattern) {
    if (!this.learningEngine) {
      this.showToast('Learning engine not available', 'error');
      return;
    }

    // Show edit modal
    const modal = this.createEditModal(pattern);
    document.body.appendChild(modal);

    refreshIcons();
  }

  /**
   * Create edit pattern modal
   */
  createEditModal(pattern) {
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';

    modalOverlay.innerHTML = `
      <div class="modal bg-neutral-900/40 backdrop-blur-sm border border-neutral-800/50 rounded-xl">
        <div class="modal-header">
          <h3><i data-lucide="edit-2"></i> Edit Pattern</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Voice Input</label>
            <input type="text" class="form-input edit-voice-input" value="${this.escapeHtml(pattern.voiceInput)}">
          </div>
          <div class="form-group">
            <label>Target Card</label>
            <input type="text" class="form-input edit-target-card" value="${this.escapeHtml(pattern.targetCard)}">
          </div>
          <div class="form-info">
            <p><strong>Success Rate:</strong> ${Math.round(pattern.successRate * 100)}%</p>
            <p><strong>Uses:</strong> ${pattern.reinforcements || 1}</p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary modal-cancel">Cancel</button>
          <button class="btn btn-primary modal-save">Save Changes</button>
        </div>
      </div>
    `;

    // Close handler
    const closeModal = () => modalOverlay.remove();

    modalOverlay.querySelector('.modal-close').addEventListener('click', closeModal);
    modalOverlay.querySelector('.modal-cancel').addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });

    // Save handler
    modalOverlay.querySelector('.modal-save').addEventListener('click', async () => {
      const newVoiceInput = modalOverlay.querySelector('.edit-voice-input').value.trim();
      const newTargetCard = modalOverlay.querySelector('.edit-target-card').value.trim();

      if (!newVoiceInput || !newTargetCard) {
        this.showToast('Voice input and target card are required', 'error');
        return;
      }

      await this.updatePattern(pattern.id, newVoiceInput, newTargetCard);
      closeModal();
    });

    return modalOverlay;
  }

  /**
   * Update pattern
   */
  async updatePattern(patternId, newVoiceInput, newTargetCard) {
    try {
      if (!this.learningEngine) {
        throw new Error('Learning engine not available');
      }

      // Delete old pattern
      this.learningEngine.userPatterns.delete(patternId);

      // Create new pattern with updated values
      const newKey = `${newVoiceInput.toLowerCase().trim()}|${newTargetCard.toLowerCase().trim()}`;
      const existingPattern = this.patterns.find(p => p.id === patternId);

      this.learningEngine.userPatterns.set(newKey, {
        voiceInput: newVoiceInput.toLowerCase().trim(),
        targetCard: newTargetCard.toLowerCase().trim(),
        successRate: existingPattern?.successRate || 1.0,
        reinforcements: existingPattern?.reinforcements || 1,
        confidence: existingPattern?.confidence || 1.0,
        lastSeen: Date.now(),
        timestamp: Date.now()
      });

      // Save to storage
      await this.learningEngine.savePatterns();

      this.showToast('Pattern updated successfully', 'success');

      // Reload patterns
      await this.loadPatterns();
      this.refreshPage();
    } catch (error) {
      console.error('Error updating pattern:', error);
      this.showToast('Failed to update pattern', 'error');
    }
  }

  /**
   * Handle pattern delete
   */
  async handlePatternDelete(pattern) {
    // Pattern can be a single pattern or array of patterns
    const patterns = Array.isArray(pattern) ? pattern : [pattern];

    const confirmed = confirm(
      `Are you sure you want to delete ${patterns.length} pattern${patterns.length !== 1 ? 's' : ''}?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      if (!this.learningEngine) {
        throw new Error('Learning engine not available');
      }

      // Delete patterns
      patterns.forEach(p => {
        this.learningEngine.userPatterns.delete(p.id);
      });

      // Save to storage
      await this.learningEngine.savePatterns();

      this.showToast(`${patterns.length} pattern${patterns.length !== 1 ? 's' : ''} deleted successfully`, 'success');

      // Clear selection if using pattern list
      if (this.patternList) {
        this.patternList.clearSelection();
      }

      // Reload patterns
      await this.loadPatterns();
      this.refreshPage();
    } catch (error) {
      console.error('Error deleting pattern:', error);
      this.showToast('Failed to delete pattern', 'error');
    }
  }

  /**
   * Handle export
   */
  async handleExport() {
    try {
      if (!this.learningEngine) {
        throw new Error('Learning engine not available');
      }

      const exportData = this.learningEngine.exportPatterns();

      // Create download
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `voice-patterns-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      this.showToast('Patterns exported successfully', 'success');
    } catch (error) {
      console.error('Error exporting patterns:', error);
      this.showToast('Failed to export patterns', 'error');
    }
  }

  /**
   * Handle import
   */
  handleImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';

    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const importData = JSON.parse(text);

        if (!this.learningEngine) {
          throw new Error('Learning engine not available');
        }

        // Import patterns
        this.learningEngine.importPatterns(importData);

        // Save to storage
        await this.learningEngine.savePatterns();

        this.showToast('Patterns imported successfully', 'success');

        // Reload patterns
        await this.loadPatterns();
        this.refreshPage();
      } catch (error) {
        console.error('Error importing patterns:', error);
        this.showToast('Failed to import patterns. Invalid file format.', 'error');
      }
    });

    input.click();
  }

  /**
   * Handle reset all patterns
   */
  async handleReset() {
    const confirmed = confirm(
      'Are you sure you want to reset ALL voice training patterns?\n\nThis will delete all learned patterns and cannot be undone.\n\nConsider exporting your patterns first as a backup.'
    );

    if (!confirmed) return;

    // Second confirmation
    const doubleConfirmed = confirm('This is your last warning. Reset all patterns?');
    if (!doubleConfirmed) return;

    try {
      if (!this.learningEngine) {
        throw new Error('Learning engine not available');
      }

      // Reset patterns
      this.learningEngine.reset();

      this.showToast('All patterns have been reset', 'success');

      // Reload patterns
      await this.loadPatterns();
      this.refreshPage();
    } catch (error) {
      console.error('Error resetting patterns:', error);
      this.showToast('Failed to reset patterns', 'error');
    }
  }

  /**
   * Handle refresh
   */
  async handleRefresh() {
    try {
      await this.loadPatterns();
      this.refreshPage();
      this.showToast('Patterns refreshed', 'success');
    } catch (error) {
      console.error('Error refreshing patterns:', error);
      this.showToast('Failed to refresh patterns', 'error');
    }
  }

  /**
   * Refresh page content
   */
  refreshPage() {
    if (this.container) {
      this.container.innerHTML = this.render();
      this.attachEventListeners();
      this.mountPatternList();

      refreshIcons();
    }
  }

  /**
   * Show toast notification
   */
  showToast(message, type = 'info') {
    if (this.app && typeof this.app.showToast === 'function') {
      this.app.showToast(message, type);
    } else {
      console.log(`[Toast ${type}]:`, message);
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Unmount page
   */
  async unmount() {
    // Unmount pattern list
    if (this.patternList) {
      this.patternList.unmount();
      this.patternList = null;
    }

    // Clear container
    if (this.container) {
      this.container.innerHTML = '';
    }

    console.log('VoiceTrainingPage unmounted');
  }
}
