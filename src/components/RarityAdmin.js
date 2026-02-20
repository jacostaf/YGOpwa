/**
 * RarityAdmin.js
 *
 * Admin dashboard for managing Yu-Gi-Oh card rarities.
 * Features:
 * - Stats overview (total, auto-discovered, pending review, avg confidence)
 * - Rarity table with inline editing
 * - Review workflow (approve/dismiss)
 * - Holographic/prismatic visual accents
 */

import { supabase, isSupabaseAvailable } from '../lib/supabaseClient.js';
import { refreshIcons } from '../utils/IconLoader.js';

export default class RarityAdmin {
  constructor(options = {}) {
    this.container = options.container || null;
    this.element = null;
    this.rarities = [];
    this.stats = null;
    this.pendingReview = [];
    this.editingId = null;
    this.editValues = {};
    this.filter = 'all'; // 'all', 'review', 'auto'
    this.sortField = 'rarity_rank';
    this.sortDir = 'asc';
  }

  /**
   * Initialize and render the admin panel
   */
  async init() {
    if (!isSupabaseAvailable()) {
      this.renderError('Supabase connection unavailable');
      return;
    }

    this.renderLoading();
    await this.fetchData();
    this.render();
  }

  /**
   * Fetch all rarity data from Supabase
   */
  async fetchData() {
    try {
      const [statsRes, raritiesRes, reviewRes] = await Promise.all([
        supabase.rpc('get_rarity_stats'),
        supabase.rpc('get_all_rarities'),
        supabase.rpc('get_rarities_needing_review')
      ]);

      if (statsRes.error) throw statsRes.error;
      if (raritiesRes.error) throw raritiesRes.error;
      if (reviewRes.error) throw reviewRes.error;

      this.stats = statsRes.data;
      this.rarities = raritiesRes.data || [];
      this.pendingReview = reviewRes.data || [];

      console.log('[RarityAdmin] Loaded', this.rarities.length, 'rarities');
    } catch (err) {
      console.error('[RarityAdmin] Fetch error:', err);
      this.stats = { total_rarities: 0, auto_discovered: 0, pending_review: 0, avg_confidence: 0 };
      this.rarities = [];
      this.pendingReview = [];
    }
  }

  /**
   * Render loading state
   */
  renderLoading() {
    const target = this.container || document.body;
    target.innerHTML = `
      <div class="rarity-admin-loading">
        <div class="loading-spinner"></div>
        <span>Loading rarity data...</span>
      </div>
    `;
  }

  /**
   * Render error state
   */
  renderError(message) {
    const target = this.container || document.body;
    target.innerHTML = `
      <div class="rarity-admin-error">
        <i data-lucide="alert-triangle" class="w-12 h-12"></i>
        <p>${this.escapeHtml(message)}</p>
      </div>
    `;
    refreshIcons();
  }

  /**
   * Main render
   */
  render() {
    const target = this.container || document.body;

    const html = `
      <div class="rarity-admin">
        <header class="rarity-admin-header">
          <div class="header-title">
            <div class="title-icon">
              <i data-lucide="gem" class="w-6 h-6"></i>
            </div>
            <div>
              <h1>Rarity Vault</h1>
              <p class="subtitle">Manage card rarity weights & rankings</p>
            </div>
          </div>
          <button class="btn-refresh" id="rarity-refresh-btn">
            <i data-lucide="refresh-cw" class="w-4 h-4"></i>
            Refresh
          </button>
        </header>

        ${this.renderStats()}
        ${this.renderFilters()}
        ${this.renderTable()}
      </div>
    `;

    target.innerHTML = html;
    this.element = target.querySelector('.rarity-admin');
    this.bindEvents();

    refreshIcons();
  }

  /**
   * Render stats cards
   */
  renderStats() {
    const stats = this.stats || {};
    const confidence = stats.avg_confidence ? (stats.avg_confidence * 100).toFixed(0) : '0';

    return `
      <div class="stats-grid">
        <div class="stat-card stat-total">
          <div class="stat-value">${stats.total_rarities || 0}</div>
          <div class="stat-label">Total Rarities</div>
          <div class="stat-icon"><i data-lucide="layers" class="w-5 h-5"></i></div>
        </div>

        <div class="stat-card stat-discovered">
          <div class="stat-value">${stats.auto_discovered || 0}</div>
          <div class="stat-label">Auto-Discovered</div>
          <div class="stat-icon"><i data-lucide="sparkles" class="w-5 h-5"></i></div>
        </div>

        <div class="stat-card stat-review ${stats.pending_review > 0 ? 'has-pending' : ''}">
          <div class="stat-value">${stats.pending_review || 0}</div>
          <div class="stat-label">Pending Review</div>
          <div class="stat-icon"><i data-lucide="eye" class="w-5 h-5"></i></div>
          ${stats.pending_review > 0 ? '<div class="pulse-ring"></div>' : ''}
        </div>

        <div class="stat-card stat-confidence">
          <div class="stat-value">${confidence}%</div>
          <div class="stat-label">Avg Confidence</div>
          <div class="stat-progress">
            <div class="progress-bar" style="width: ${confidence}%"></div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render filter controls
   */
  renderFilters() {
    return `
      <div class="filter-bar">
        <div class="filter-tabs">
          <button class="filter-tab ${this.filter === 'all' ? 'active' : ''}" data-filter="all">
            All Rarities
          </button>
          <button class="filter-tab ${this.filter === 'review' ? 'active' : ''}" data-filter="review">
            Needs Review
            ${this.pendingReview.length > 0 ? `<span class="badge">${this.pendingReview.length}</span>` : ''}
          </button>
          <button class="filter-tab ${this.filter === 'auto' ? 'active' : ''}" data-filter="auto">
            Auto-Discovered
          </button>
        </div>
        <div class="sort-control">
          <label>Sort by</label>
          <select id="sort-select">
            <option value="rarity_rank" ${this.sortField === 'rarity_rank' ? 'selected' : ''}>Rank</option>
            <option value="weight" ${this.sortField === 'weight' ? 'selected' : ''}>Weight</option>
            <option value="rarity_name" ${this.sortField === 'rarity_name' ? 'selected' : ''}>Name</option>
            <option value="confidence_score" ${this.sortField === 'confidence_score' ? 'selected' : ''}>Confidence</option>
          </select>
        </div>
      </div>
    `;
  }

  /**
   * Get filtered and sorted rarities
   */
  getFilteredRarities() {
    let filtered = [...this.rarities];

    if (this.filter === 'review') {
      const reviewIds = new Set(this.pendingReview.map(r => r.id));
      filtered = filtered.filter(r => reviewIds.has(r.id));
    } else if (this.filter === 'auto') {
      filtered = filtered.filter(r => r.is_auto_discovered);
    }

    filtered.sort((a, b) => {
      let aVal = a[this.sortField];
      let bVal = b[this.sortField];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toLowerCase();
      }

      if (aVal < bVal) return this.sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return this.sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }

  /**
   * Render rarity table
   */
  renderTable() {
    const filtered = this.getFilteredRarities();

    if (filtered.length === 0) {
      return `
        <div class="empty-table">
          <i data-lucide="inbox" class="w-12 h-12"></i>
          <p>No rarities match current filter</p>
        </div>
      `;
    }

    const rows = filtered.map(r => this.renderRow(r)).join('');

    return `
      <div class="rarity-table-container">
        <table class="rarity-table">
          <thead>
            <tr>
              <th class="col-status"></th>
              <th class="col-name">Rarity</th>
              <th class="col-key">Key</th>
              <th class="col-rank">Rank</th>
              <th class="col-weight">Weight</th>
              <th class="col-lb-weight">LB Weight</th>
              <th class="col-confidence">Confidence</th>
              <th class="col-source">Source</th>
              <th class="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Render single table row
   */
  renderRow(rarity) {
    const isEditing = this.editingId === rarity.id;
    const needsReview = this.pendingReview.some(r => r.id === rarity.id);
    const confidence = rarity.confidence_score ? (rarity.confidence_score * 100).toFixed(0) : null;
    const confidenceClass = this.getConfidenceClass(rarity.confidence_score);

    const statusIndicator = needsReview
      ? '<div class="status-gem review" title="Needs Review"><i data-lucide="alert-circle" class="w-4 h-4"></i></div>'
      : rarity.is_auto_discovered
        ? '<div class="status-gem auto" title="Auto-Discovered"><i data-lucide="sparkle" class="w-4 h-4"></i></div>'
        : '<div class="status-gem seeded" title="Seeded"><i data-lucide="check-circle" class="w-4 h-4"></i></div>';

    if (isEditing) {
      return `
        <tr class="editing" data-id="${rarity.id}">
          <td class="col-status">${statusIndicator}</td>
          <td class="col-name">
            <span class="rarity-name">${this.escapeHtml(rarity.rarity_name)}</span>
          </td>
          <td class="col-key"><code>${this.escapeHtml(rarity.rarity_key)}</code></td>
          <td class="col-rank">
            <input type="number" class="edit-input" id="edit-rank"
              value="${this.editValues.rank ?? rarity.rarity_rank}" min="1" max="20">
          </td>
          <td class="col-weight">
            <input type="number" class="edit-input" id="edit-weight"
              value="${this.editValues.weight ?? rarity.weight}" min="0" step="0.5">
          </td>
          <td class="col-lb-weight">
            <input type="number" class="edit-input" id="edit-lb-weight"
              value="${this.editValues.lbWeight ?? rarity.leaderboard_weight ?? rarity.weight}" min="0" step="0.5">
          </td>
          <td class="col-confidence">
            ${confidence !== null ? `<span class="confidence-badge ${confidenceClass}">${confidence}%</span>` : '-'}
          </td>
          <td class="col-source">
            <span class="source-tag ${rarity.source || 'seed'}">${rarity.source || 'seed'}</span>
          </td>
          <td class="col-actions">
            <div class="action-btns">
              <button class="btn-save" data-action="save" data-id="${rarity.id}" title="Save">
                <i data-lucide="check" class="w-4 h-4"></i>
              </button>
              <button class="btn-cancel" data-action="cancel" title="Cancel">
                <i data-lucide="x" class="w-4 h-4"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }

    return `
      <tr data-id="${rarity.id}" class="${needsReview ? 'needs-review' : ''}">
        <td class="col-status">${statusIndicator}</td>
        <td class="col-name">
          <span class="rarity-name">${this.escapeHtml(rarity.rarity_name)}</span>
        </td>
        <td class="col-key"><code>${this.escapeHtml(rarity.rarity_key)}</code></td>
        <td class="col-rank">${rarity.rarity_rank}</td>
        <td class="col-weight">${rarity.weight}</td>
        <td class="col-lb-weight">${rarity.leaderboard_weight ?? rarity.weight}</td>
        <td class="col-confidence">
          ${confidence !== null ? `<span class="confidence-badge ${confidenceClass}">${confidence}%</span>` : '-'}
        </td>
        <td class="col-source">
          <span class="source-tag ${rarity.source || 'seed'}">${rarity.source || 'seed'}</span>
        </td>
        <td class="col-actions">
          <div class="action-btns">
            <button class="btn-edit" data-action="edit" data-id="${rarity.id}" title="Edit">
              <i data-lucide="pencil" class="w-4 h-4"></i>
            </button>
            ${needsReview ? `
              <button class="btn-approve" data-action="approve" data-id="${rarity.id}" title="Approve">
                <i data-lucide="check-circle" class="w-4 h-4"></i>
              </button>
              <button class="btn-dismiss" data-action="dismiss" data-id="${rarity.id}" title="Dismiss Review">
                <i data-lucide="x-circle" class="w-4 h-4"></i>
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }

  /**
   * Get confidence level class
   */
  getConfidenceClass(score) {
    if (!score) return 'low';
    if (score >= 0.9) return 'high';
    if (score >= 0.7) return 'medium';
    return 'low';
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    if (!this.element) return;

    // Refresh button
    const refreshBtn = this.element.querySelector('#rarity-refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.handleRefresh());
    }

    // Filter tabs
    this.element.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.filter = e.target.dataset.filter;
        this.render();
      });
    });

    // Sort select
    const sortSelect = this.element.querySelector('#sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.sortField = e.target.value;
        this.render();
      });
    }

    // Table action buttons (delegation)
    const table = this.element.querySelector('.rarity-table');
    if (table) {
      table.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;

        const action = btn.dataset.action;
        const id = parseInt(btn.dataset.id, 10);

        switch (action) {
          case 'edit':
            this.startEdit(id);
            break;
          case 'save':
            this.saveEdit(id);
            break;
          case 'cancel':
            this.cancelEdit();
            break;
          case 'approve':
            this.approveRarity(id);
            break;
          case 'dismiss':
            this.dismissReview(id);
            break;
        }
      });

      // Track edit input changes
      table.addEventListener('input', (e) => {
        if (e.target.classList.contains('edit-input')) {
          const field = e.target.id.replace('edit-', '');
          if (field === 'rank') this.editValues.rank = parseInt(e.target.value, 10);
          else if (field === 'weight') this.editValues.weight = parseFloat(e.target.value);
          else if (field === 'lb-weight') this.editValues.lbWeight = parseFloat(e.target.value);
        }
      });
    }
  }

  /**
   * Handle refresh
   */
  async handleRefresh() {
    const btn = this.element.querySelector('#rarity-refresh-btn');
    if (btn) {
      btn.classList.add('spinning');
      btn.disabled = true;
    }

    await this.fetchData();
    this.render();
  }

  /**
   * Start editing a rarity
   */
  startEdit(id) {
    this.editingId = id;
    this.editValues = {};
    this.render();
  }

  /**
   * Cancel editing
   */
  cancelEdit() {
    this.editingId = null;
    this.editValues = {};
    this.render();
  }

  /**
   * Save edit
   */
  async saveEdit(id) {
    const rarity = this.rarities.find(r => r.id === id);
    if (!rarity) return;

    const needsReview = this.pendingReview.some(r => r.id === id);
    const newWeight = this.editValues.weight ?? rarity.weight;
    const newRank = this.editValues.rank ?? rarity.rarity_rank;
    const newLbWeight = this.editValues.lbWeight ?? rarity.leaderboard_weight ?? newWeight;

    try {
      const { error } = await supabase.rpc('update_rarity_weight', {
        p_rarity_id: id,
        p_weight: newWeight,
        p_rank: newRank,
        p_leaderboard_weight: newLbWeight,
        p_approve_review: needsReview // Auto-approve if it was under review
      });

      if (error) throw error;

      console.log('[RarityAdmin] Updated rarity', id);
      this.editingId = null;
      this.editValues = {};
      await this.fetchData();
      this.render();
    } catch (err) {
      console.error('[RarityAdmin] Save error:', err);
      alert('Failed to save: ' + err.message);
    }
  }

  /**
   * Approve rarity (save current values and clear review)
   */
  async approveRarity(id) {
    const rarity = this.rarities.find(r => r.id === id);
    if (!rarity) return;

    try {
      const { error } = await supabase.rpc('update_rarity_weight', {
        p_rarity_id: id,
        p_weight: rarity.weight,
        p_rank: rarity.rarity_rank,
        p_leaderboard_weight: rarity.leaderboard_weight ?? rarity.weight,
        p_approve_review: true
      });

      if (error) throw error;

      console.log('[RarityAdmin] Approved rarity', id);
      await this.fetchData();
      this.render();
    } catch (err) {
      console.error('[RarityAdmin] Approve error:', err);
      alert('Failed to approve: ' + err.message);
    }
  }

  /**
   * Dismiss review without changes
   */
  async dismissReview(id) {
    try {
      const { error } = await supabase.rpc('dismiss_rarity_review', {
        p_rarity_id: id
      });

      if (error) throw error;

      console.log('[RarityAdmin] Dismissed review for rarity', id);
      await this.fetchData();
      this.render();
    } catch (err) {
      console.error('[RarityAdmin] Dismiss error:', err);
      alert('Failed to dismiss: ' + err.message);
    }
  }

  /**
   * Escape HTML
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }

  /**
   * Destroy component
   */
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
    this.rarities = [];
    this.pendingReview = [];
  }
}

/**
 * Factory function
 */
export async function createRarityAdmin(container) {
  const admin = new RarityAdmin({ container });
  await admin.init();
  return admin;
}
