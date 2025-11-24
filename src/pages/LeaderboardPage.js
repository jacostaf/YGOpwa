/**
 * LeaderboardPage.js
 *
 * Phase 5 leaderboard hub for value, quantity, and rarity rankings.
 */

import LeaderboardService, { LEADERBOARD_TYPES } from '../services/leaderboardService.js';

const DEFAULT_LIMIT = 25;
const PREFERRED_TYPE_KEY = 'voxrip:leaderboard:lastType';

function formatNumber(value) {
  if (!Number.isFinite(value)) {
    return '0';
  }
  return new Intl.NumberFormat('en-US').format(value);
}

function formatCurrency(value) {
  if (!Number.isFinite(value)) {
    return '$0.00';
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function formatRarityScore(value) {
  if (!Number.isFinite(value)) {
    return '0 pts';
  }
  return `${formatNumber(Math.round(value))} pts`;
}

function formatMetric(type, entry) {
  switch (type) {
    case LEADERBOARD_TYPES.VALUE:
      return formatCurrency(entry.metric_value);
    case LEADERBOARD_TYPES.QUANTITY:
      return `${formatNumber(entry.total_quantity)} cards`;
    case LEADERBOARD_TYPES.RARITY:
    default:
      return formatRarityScore(entry.metric_value);
  }
}

function getMetricLabel(type) {
  switch (type) {
    case LEADERBOARD_TYPES.VALUE:
      return 'Total Market Value';
    case LEADERBOARD_TYPES.QUANTITY:
      return 'Total Quantity';
    case LEADERBOARD_TYPES.RARITY:
    default:
      return 'Rarity Score';
  }
}

function getHelperText(type) {
  switch (type) {
    case LEADERBOARD_TYPES.VALUE:
      return 'Ranks duelists by live market value from latest price sync.';
    case LEADERBOARD_TYPES.QUANTITY:
      return 'Ranks duelists by total cards owned across all sets.';
    case LEADERBOARD_TYPES.RARITY:
    default:
      return 'Ranks duelists by configurable rarity weighting (Phase 5 weights).';
  }
}

export default class LeaderboardPage {
  constructor(router) {
    this.router = router;
    this.container = null;
    this.service = null;
    const preferredType = this.restorePreferredType();

    this.state = {
      type: preferredType,
      entries: [],
      isLoading: false,
      error: null,
      meta: null,
    };

    this.bound = {
      handleTabClick: this.handleTabClick.bind(this),
      handleRefresh: this.handleRefresh.bind(this),
      handleRetry: this.handleRetry.bind(this),
    };
  }

  restorePreferredType() {
    if (typeof window === 'undefined') {
      return LEADERBOARD_TYPES.VALUE;
    }

    try {
      const stored = window.sessionStorage.getItem(PREFERRED_TYPE_KEY);
      if (!stored) {
        return LEADERBOARD_TYPES.VALUE;
      }
      const normalized = stored.toLowerCase();
      return [LEADERBOARD_TYPES.VALUE, LEADERBOARD_TYPES.QUANTITY, LEADERBOARD_TYPES.RARITY].includes(normalized)
        ? normalized
        : LEADERBOARD_TYPES.VALUE;
    } catch (error) {
      console.warn('LeaderboardPage: failed to read preferred type', error);
      return LEADERBOARD_TYPES.VALUE;
    }
  }

  persistPreferredType(type) {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.sessionStorage.setItem(PREFERRED_TYPE_KEY, type);
    } catch (error) {
      console.warn('LeaderboardPage: failed to persist preferred type', error);
    }
  }

  render() {
    return `
      <div class="page-content leaderboard-page" data-testid="leaderboard-page">
        <div class="page-header">
          <div class="page-title-section">
            <i class="lucide-icon" data-lucide="trophy"></i>
            <div>
              <h1>Leaderboards</h1>
              <p class="page-subtitle">See how your collection stacks up across key metrics</p>
            </div>
          </div>
          <div class="page-actions">
            <button class="btn-secondary" id="leaderboardRefreshBtn" data-testid="leaderboard-refresh-btn">
              <i class="lucide-icon" data-lucide="refresh-cw"></i>
              Refresh
            </button>
          </div>
        </div>

        <div class="leaderboard-tabs" role="tablist">
          ${this.renderTabButton(LEADERBOARD_TYPES.VALUE, 'Value', 'banknote')}
          ${this.renderTabButton(LEADERBOARD_TYPES.QUANTITY, 'Quantity', 'package')}
          ${this.renderTabButton(LEADERBOARD_TYPES.RARITY, 'Rarity', 'sparkles')}
        </div>

        <section class="leaderboard-card bg-neutral-900/40 backdrop-blur-sm border border-neutral-800/50 rounded-xl" aria-live="polite">
          <header class="leaderboard-card__header">
            <div>
              <h2 id="leaderboardMetricLabel">${getMetricLabel(this.state.type)}</h2>
              <p class="leaderboard-helper" id="leaderboardHelperText">${getHelperText(this.state.type)}</p>
            </div>
            <div class="leaderboard-meta" id="leaderboardMeta"></div>
          </header>

          <div class="leaderboard-table-wrapper">
            <table class="leaderboard-table" aria-describedby="leaderboardMetricLabel">
              <thead>
                <tr>
                  <th scope="col">Rank</th>
                  <th scope="col">Duelist</th>
                  <th scope="col" id="leaderboardMetricColumn">${getMetricLabel(this.state.type)}</th>
                  <th scope="col" class="leaderboard-secondary">Total Value</th>
                  <th scope="col" class="leaderboard-secondary">Cards</th>
                </tr>
              </thead>
              <tbody id="leaderboardTableBody">
                <tr class="leaderboard-loading" data-testid="leaderboard-loading">
                  <td colspan="5">
                    <div class="loading-state">
                      <span class="loading-spinner"></span>
                      <span>Loading leaderboard…</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="leaderboard-empty hidden" id="leaderboardEmptyState" data-testid="leaderboard-empty">
            <i class="lucide-icon" data-lucide="users"></i>
            <p>No results yet. Add cards to your collection to appear here.</p>
          </div>

          <div class="leaderboard-error hidden" id="leaderboardErrorState" role="alert" data-testid="leaderboard-error">
            <i class="lucide-icon" data-lucide="alert-triangle"></i>
            <div>
              <p id="leaderboardErrorMessage">Unable to load leaderboard.</p>
              <button class="btn-secondary" id="leaderboardRetryBtn">Try again</button>
            </div>
          </div>
        </section>
      </div>
    `;
  }

  renderTabButton(type, label, icon) {
    const isActive = this.state.type === type;
    return `
      <button
        class="leaderboard-tab ${isActive ? 'active' : ''}"
        role="tab"
        aria-selected="${isActive}"
        data-type="${type}"
        data-testid="leaderboard-tab-${type}"
      >
        <i class="lucide-icon" data-lucide="${icon}"></i>
        <span>${label}</span>
      </button>
    `;
  }

  mount(container) {
    this.container = container;
    this.service = new LeaderboardService();

    if (this.container) {
      this.container.innerHTML = this.render();
    }

    this.attachEvents();
    this.persistPreferredType(this.state.type);
    this.loadLeaderboard(this.state.type);

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  unmount() {
    this.detachEvents();
    this.container = null;
  }

  attachEvents() {
    if (!this.container) return;

    this.container.querySelectorAll('.leaderboard-tab').forEach((button) => {
      button.addEventListener('click', this.bound.handleTabClick);
    });

    const refreshBtn = this.container.querySelector('#leaderboardRefreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', this.bound.handleRefresh);
    }

    const retryBtn = this.container.querySelector('#leaderboardRetryBtn');
    if (retryBtn) {
      retryBtn.addEventListener('click', this.bound.handleRetry);
    }
  }

  detachEvents() {
    if (!this.container) return;

    this.container.querySelectorAll('.leaderboard-tab').forEach((button) => {
      button.removeEventListener('click', this.bound.handleTabClick);
    });

    const refreshBtn = this.container.querySelector('#leaderboardRefreshBtn');
    if (refreshBtn) {
      refreshBtn.removeEventListener('click', this.bound.handleRefresh);
    }

    const retryBtn = this.container.querySelector('#leaderboardRetryBtn');
    if (retryBtn) {
      retryBtn.removeEventListener('click', this.bound.handleRetry);
    }
  }

  async handleTabClick(event) {
    const type = event.currentTarget?.dataset?.type;
    if (!type || type === this.state.type) {
      return;
    }

    this.state.type = this.service ? this.service.normalizeType(type) : this.state.type;
    this.persistPreferredType(this.state.type);
    this.updateTabs();
    this.updateHeader();
    await this.loadLeaderboard(this.state.type, { bypassCache: false });
  }

  async handleRefresh() {
    await this.loadLeaderboard(this.state.type, { forceRefresh: true });
  }

  async handleRetry() {
    await this.loadLeaderboard(this.state.type, { forceRefresh: true });
  }

  updateTabs() {
    if (!this.container) return;

    this.container.querySelectorAll('.leaderboard-tab').forEach((button) => {
      const isActive = button.dataset.type === this.state.type;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
  }

  updateHeader() {
    if (!this.container) return;
    const metricLabel = this.container.querySelector('#leaderboardMetricLabel');
    const helperText = this.container.querySelector('#leaderboardHelperText');
    const metricColumn = this.container.querySelector('#leaderboardMetricColumn');

    if (metricLabel) {
      metricLabel.textContent = getMetricLabel(this.state.type);
    }

    if (helperText) {
      helperText.textContent = getHelperText(this.state.type);
    }

    if (metricColumn) {
      metricColumn.textContent = getMetricLabel(this.state.type);
    }
  }

  setLoading(isLoading) {
    this.state.isLoading = isLoading;
    if (!this.container) return;

    const loadingRow = this.container.querySelector('[data-testid="leaderboard-loading"]');
    if (loadingRow) {
      loadingRow.classList.toggle('hidden', !isLoading);
    }
  }

  showError(message) {
    if (!this.container) return;
    const errorState = this.container.querySelector('#leaderboardErrorState');
    const messageEl = this.container.querySelector('#leaderboardErrorMessage');
    const tableBody = this.container.querySelector('#leaderboardTableBody');
    const emptyState = this.container.querySelector('#leaderboardEmptyState');
    const retryBtn = this.container.querySelector('#leaderboardRetryBtn');

    if (messageEl) {
      messageEl.textContent = message || 'Unable to load leaderboard.';
    }

    if (errorState) {
      errorState.dataset.restricted = 'false';
      errorState.classList.remove('hidden');
    }

    if (retryBtn) {
      retryBtn.textContent = 'Try again';
      retryBtn.disabled = false;
    }

    if (tableBody) {
      tableBody.classList.add('hidden');
    }

    if (emptyState) {
      emptyState.classList.add('hidden');
    }
  }

  hideError() {
    if (!this.container) return;
    const errorState = this.container.querySelector('#leaderboardErrorState');
    const tableBody = this.container.querySelector('#leaderboardTableBody');
    const retryBtn = this.container.querySelector('#leaderboardRetryBtn');

    if (errorState) {
      errorState.classList.add('hidden');
      delete errorState.dataset.restricted;
    }

    if (tableBody) {
      tableBody.classList.remove('hidden');
    }

    if (retryBtn) {
      retryBtn.textContent = 'Try again';
      retryBtn.disabled = false;
    }
  }

  showRestricted(meta = {}) {
    if (!this.container) return;
    const errorState = this.container.querySelector('#leaderboardErrorState');
    const messageEl = this.container.querySelector('#leaderboardErrorMessage');
    const retryBtn = this.container.querySelector('#leaderboardRetryBtn');
    const tableBody = this.container.querySelector('#leaderboardTableBody');
    const planKey = meta.planKey || 'current';

    if (messageEl) {
      messageEl.textContent = `Leaderboard access is not available on your ${planKey} plan. Upgrade to unlock community rankings.`;
    }

    if (errorState) {
      errorState.dataset.restricted = 'true';
      errorState.classList.remove('hidden');
    }

    if (retryBtn) {
      retryBtn.textContent = 'Refresh after upgrade';
      retryBtn.disabled = false;
    }

    if (tableBody) {
      tableBody.classList.add('hidden');
    }
  }

  showEmpty() {
    if (!this.container) return;
    const emptyState = this.container.querySelector('#leaderboardEmptyState');
    const tableBody = this.container.querySelector('#leaderboardTableBody');

    if (emptyState) {
      emptyState.classList.remove('hidden');
    }

    if (tableBody) {
      tableBody.classList.add('hidden');
    }
  }

  hideEmpty() {
    if (!this.container) return;
    const emptyState = this.container.querySelector('#leaderboardEmptyState');
    const tableBody = this.container.querySelector('#leaderboardTableBody');

    if (emptyState) {
      emptyState.classList.add('hidden');
    }

    if (tableBody) {
      tableBody.classList.remove('hidden');
    }
  }

  updateMeta(meta) {
    if (!this.container) return;
    const metaEl = this.container.querySelector('#leaderboardMeta');
    if (!metaEl) return;

    if (!meta) {
      metaEl.textContent = '';
      return;
    }

    const computed = meta.computedAt ? new Date(meta.computedAt) : null;
    const fetched = meta.fetchedAt ? new Date(meta.fetchedAt) : null;
    const parts = [];

    if (computed) {
      parts.push(`Computed ${computed.toLocaleString()}`);
    }

    if (meta.source === 'fallback') {
      parts.push('Using fallback data');
    }

    if (fetched && meta.source === 'remote') {
      const deltaMinutes = Math.round((Date.now() - fetched.getTime()) / 60000);
      if (deltaMinutes <= 1) {
        parts.push('Just now');
      } else {
        parts.push(`${deltaMinutes} min ago`);
      }
    }

    metaEl.textContent = parts.join(' · ');
  }

  renderRows(entries) {
    if (!this.container) return;
    const tableBody = this.container.querySelector('#leaderboardTableBody');
    if (!tableBody) return;

    if (!entries || entries.length === 0) {
      this.showEmpty();
      tableBody.innerHTML = '';
      return;
    }

    this.hideEmpty();
    this.hideError();

    tableBody.innerHTML = entries.map((entry) => this.renderRow(entry)).join('');

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  renderRow(entry) {
    const tieBadge = entry.tie ? '<span class="leaderboard-tie" title="Tie detected">TIE</span>' : '';
    const avatarFallback = (entry.display_name || '?').slice(0, 2).toUpperCase();

    return `
      <tr class="leaderboard-row" data-testid="leaderboard-row" data-rank="${entry.rank}">
        <td class="leaderboard-rank">
          <span>${entry.rank}</span>
          ${tieBadge}
        </td>
        <td class="leaderboard-player">
          <div class="leaderboard-avatar" aria-hidden="true">
            ${avatarFallback}
          </div>
          <div class="leaderboard-player-meta">
            <span class="leaderboard-name">${entry.display_name}</span>
            <span class="leaderboard-id">${entry.user_id ? entry.user_id.slice(0, 8) : 'unknown'}</span>
          </div>
        </td>
        <td class="leaderboard-metric" data-testid="leaderboard-metric">${formatMetric(this.state.type, entry)}</td>
        <td class="leaderboard-secondary">
          ${formatCurrency(entry.total_market_value)}
        </td>
        <td class="leaderboard-secondary">
          ${formatNumber(entry.total_quantity)}
        </td>
      </tr>
    `;
  }

  async loadLeaderboard(type, options = {}) {
    if (!this.container) return;

    this.hideError();
    this.hideEmpty();
    this.setLoading(true);

    try {
      const { data, meta, error, source } = await this.service.fetchLeaderboard(type, {
        limit: DEFAULT_LIMIT,
        offset: 0,
        forceRefresh: options.forceRefresh,
        bypassCache: options.bypassCache,
      });

      if (source === 'restricted' || meta?.requiresUpgrade) {
        this.state.entries = [];
        this.state.meta = meta ? { ...meta, source: source || meta.source } : { source: source || 'restricted' };
        this.showRestricted(this.state.meta);
        this.setLoading(false);
        return;
      }

      if (error && (!data || data.length === 0)) {
        this.showError(error);
        this.setLoading(false);
        return;
      }

      this.state.entries = data;
      this.state.meta = meta ? { ...meta, source: source || meta.source } : null;
      this.renderRows(this.state.entries);
      this.updateMeta(this.state.meta);
    } catch (error) {
      console.error('LeaderboardPage.loadLeaderboard failed', error);
      this.showError(error?.message || 'Failed to load leaderboard');
    } finally {
      this.setLoading(false);
    }
  }
}
