/**
 * DashboardPage.js
 *
 * Dashboard page showing stats, activity feed, and quick stats
 * Features:
 * - 3 main stat cards (Recognition Accuracy, Packs Opened, Collection Value)
 * - Recent activity feed (last 5 activities)
 * - Quick stats grid (4 metrics in 2x2 grid)
 * - Real-time data from SessionManager and VoiceEngine
 * - Glassmorphism styling matching VoxRip mockup
 * - Responsive layout
 */

import StatsCard from '../components/StatsCard.js';
import DashboardService from '../services/DashboardService.js';
import LeaderboardService, { LEADERBOARD_TYPES } from '../services/leaderboardService.js';

let lastDashboardMountHash = null;

export default class DashboardPage {
  constructor(router) {
    this.router = router;
    this.container = null;
    this.dashboardService = null;
    this.leaderboardService = null;
    this.statsCards = [];
    this.refreshInterval = null;
    this.mountHash = null;
    this.leaderboardError = null;
    this.boundHandlers = {
      handleViewAllLeaderboards: this.handleViewAllLeaderboards.bind(this),
      handleHighlightNavigate: this.handleHighlightNavigate.bind(this),
    };
  }

  /**
   * Initialize the dashboard service
   * @private
   */
  initializeDashboardService() {
    // Get global app instances (set by app.js)
    const sessionManager = window.app?.sessionManager || null;
    const voiceEngine = window.app?.voiceEngine || null;
    const storage = window.app?.storage || null;

    // Create dashboard service
    this.dashboardService = new DashboardService({
      sessionManager,
      voiceEngine,
      storage
    });

    console.log('Dashboard service initialized');
  }

  initializeLeaderboardService() {
    if (!this.leaderboardService) {
      this.leaderboardService = new LeaderboardService({ ttlMs: 120000 });
      console.log('Leaderboard service initialized');
    }
  }

  formatCurrency(value) {
    if (!Number.isFinite(value)) {
      return '$0.00';
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  }

  formatNumber(value) {
    if (!Number.isFinite(value)) {
      return '0';
    }
    return new Intl.NumberFormat('en-US').format(value);
  }

  formatLeaderboardMetric(type, entry) {
    if (!entry) {
      return '--';
    }

    switch (type) {
      case LEADERBOARD_TYPES.VALUE:
        return this.formatCurrency(entry.metric_value);
      case LEADERBOARD_TYPES.QUANTITY:
        return `${this.formatNumber(entry.total_quantity)} cards`;
      case LEADERBOARD_TYPES.RARITY:
      default:
        return `${this.formatNumber(Math.round(entry.metric_value || 0))} pts`;
    }
  }

  getLeaderboardLabel(type) {
    switch (type) {
      case LEADERBOARD_TYPES.VALUE:
        return 'Value';
      case LEADERBOARD_TYPES.QUANTITY:
        return 'Quantity';
      case LEADERBOARD_TYPES.RARITY:
      default:
        return 'Rarity';
    }
  }

  buildHighlightCard(type, winner, source) {
    const label = this.getLeaderboardLabel(type);
    const metric = this.formatLeaderboardMetric(type, winner);
    const userName = winner?.display_name || 'No leader yet';
    const secondary = type === LEADERBOARD_TYPES.VALUE
      ? `${this.formatCurrency(winner?.total_market_value || 0)} total value`
      : type === LEADERBOARD_TYPES.QUANTITY
        ? `${this.formatNumber(winner?.total_quantity || 0)} cards logged`
        : `${this.formatNumber(Math.round(winner?.rare_score || 0))} rarity pts`;

    const meta = source === 'fallback' ? '<span class="leaderboard-highlight-badge">Sample Data</span>' : '';

    return `
      <article class="leaderboard-highlight-card" data-type="${type}" data-testid="leaderboard-highlight">
        <header class="leaderboard-highlight-header">
          <span class="leaderboard-highlight-title">${label} Leaderboard ${meta}</span>
          <span class="leaderboard-highlight-metric">${metric}</span>
        </header>
        <div class="leaderboard-highlight-body">
          <h3>${userName}</h3>
          <p>${secondary}</p>
        </div>
        <footer class="leaderboard-highlight-footer">
          <button class="leaderboard-highlight-btn" data-action="view-leaderboard" data-leaderboard-type="${type}">
            View leaderboard
            <i data-lucide="arrow-right"></i>
          </button>
        </footer>
      </article>
    `;
  }

  buildHighlightSkeleton() {
    return `
      <article class="leaderboard-highlight-card skeleton">
        <div class="leaderboard-highlight-header">
          <span class="leaderboard-highlight-title">Loading…</span>
          <span class="leaderboard-highlight-metric">--</span>
        </div>
        <div class="leaderboard-highlight-body">
          <h3>Fetching leaders</h3>
          <p>Please wait</p>
        </div>
      </article>
    `;
  }

  buildLeaderboardErrorCard(message) {
    const friendlyMessage = this.escapeHtml(message || 'Leaderboards are unavailable right now.');
    return `
      <article class="leaderboard-highlight-card error" data-testid="leaderboard-highlight-error">
        <div class="leaderboard-highlight-body">
          <h3>Leaderboards unavailable</h3>
          <p>${friendlyMessage}</p>
          <p class="text-neutral-500 text-xs mt-2">We'll show highlights once Supabase responds.</p>
        </div>
      </article>
    `;
  }

  async renderLeaderboardHighlights() {
    if (!this.container) {
      return;
    }

    const grid = this.container.querySelector('#dashboard-leaderboard-highlights');
    if (!grid) {
      return;
    }

    if (!this.leaderboardService) {
      this.initializeLeaderboardService();
    }

    grid.innerHTML = [0, 1, 2].map(() => this.buildHighlightSkeleton()).join('');

    try {
      const types = [LEADERBOARD_TYPES.VALUE, LEADERBOARD_TYPES.QUANTITY, LEADERBOARD_TYPES.RARITY];
      const results = await Promise.all(types.map((type) => this.leaderboardService.fetchLeaderboard(type, { limit: 1 })));

      const erroredResult = results.find((result) => result && result.error);
      if (erroredResult) {
        this.leaderboardError = erroredResult.error;
        grid.innerHTML = this.buildLeaderboardErrorCard(erroredResult.error);
        return;
      }

      this.leaderboardError = null;

      const cards = results.map(({ data, source }, index) => {
        const leader = Array.isArray(data) && data.length > 0 ? data[0] : null;
        return this.buildHighlightCard(types[index], leader, source);
      });

      grid.innerHTML = cards.join('');

      grid.querySelectorAll('[data-action="view-leaderboard"]').forEach((button) => {
        button.addEventListener('click', this.boundHandlers.handleHighlightNavigate);
      });

      if (window.lucide) {
        window.lucide.createIcons();
      }
    } catch (error) {
      console.warn('Failed to render leaderboard highlights', error);
      this.leaderboardError = error?.message || 'Unable to load highlights right now.';
      grid.innerHTML = this.buildLeaderboardErrorCard(this.leaderboardError);
    }
  }

  handleViewAllLeaderboards() {
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.setItem('voxrip:leaderboard:lastType', LEADERBOARD_TYPES.VALUE);
      } catch (error) {
        console.warn('DashboardPage: failed to persist leaderboard preference', error);
      }
    }

    if (this.router) {
      this.router.navigate('leaderboards');
    }
  }

  handleHighlightNavigate(event) {
    const type = event.currentTarget?.dataset?.leaderboardType;
    if (type && typeof window !== 'undefined') {
      try {
        window.sessionStorage.setItem('voxrip:leaderboard:lastType', type);
      } catch (error) {
        console.warn('DashboardPage: failed to persist leaderboard type', error);
      }
    }

    if (this.router) {
      this.router.navigate('leaderboards');
    }
  }

  /**
   * Render the dashboard page
   * @returns {string} HTML string
   */
  render() {
    return `
      <div class="page-content dashboard-page">

        <!-- Secondary Grid (Activity + Quick Stats) -->
        <div class="dashboard-secondary-grid grid gap-6">
          <!-- Recent Activity Section -->
          <section class="dashboard-activity" role="region" aria-label="Recent activity">
            <div class="section-header flex items-center justify-between mb-4">
              <h2 class="text-xs font-bold text-neutral-500 uppercase tracking-wider">Recent Activity</h2>
            </div>
            <div class="activity-list space-y-4" id="activity-list" role="feed" aria-label="Activity feed">
              <!-- Activity items will be inserted here -->
            </div>
          </section>

          <!-- Quick Stats Section -->
          <section class="dashboard-quick-stats" role="region" aria-label="Quick statistics">
            <div class="section-header flex items-center justify-between mb-4">
              <h2 class="text-xs font-bold text-neutral-500 uppercase tracking-wider">Quick Stats</h2>
            </div>
            <div class="quick-stats-grid grid grid-cols-2 md:grid-cols-4 gap-4" id="quick-stats-grid" role="list" aria-label="Quick statistics list">
              <!-- Quick stats will be inserted here -->
            </div>
          </section>
        </div>



        <!-- Leaderboard Highlights -->
        <section class="dashboard-leaderboards" role="region" aria-label="Leaderboard highlights">
          <div class="section-header flex items-center justify-between mb-4">
            <div>
              <h2 class="text-xs font-bold text-neutral-500 uppercase tracking-wider">Leaderboard Highlights</h2>
            </div>
            <button class="btn-secondary text-xs py-1 px-3" id="dashboardViewLeaderboardsBtn" data-testid="dashboard-view-leaderboards">
              View all
            </button>
          </div>
          <div class="leaderboard-highlight-grid" id="dashboard-leaderboard-highlights">
            <!-- Highlight cards rendered dynamically -->
          </div>
        </section>
      </div>
    `;
  }


  /**
   * Render recent activity feed
   * @private
   */
  renderRecentActivity() {
    try {
      const container = this.container.querySelector('#activity-list');
      if (!container) {
        console.warn('Activity list container not found');
        return;
      }

      const activities = this.dashboardService.getRecentActivity(5);

      // Ensure activities is an array
      if (!Array.isArray(activities)) {
        console.error('activities is not an array:', activities);
        container.innerHTML = `
          <div class="empty-state text-center py-8">
            <i data-lucide="Activity" class="w-12 h-12 text-neutral-600 mx-auto mb-3"></i>
            <p class="text-neutral-500 text-sm">No recent activity</p>
          </div>
        `;
        return;
      }

      if (activities.length === 0) {
        // Show empty state
        container.innerHTML = `
          <div class="empty-state text-center py-8">
            <i data-lucide="Activity" class="w-12 h-12 text-neutral-600 mx-auto mb-3"></i>
            <p class="text-neutral-500 text-sm">No recent activity</p>
            <p class="text-neutral-600 text-xs mt-1">Start using voice recognition or checking prices to see activity here</p>
          </div>
        `;
      } else {
        // Render activity items
        container.innerHTML = activities.map((activity, index) => `
          <article class="activity-item flex items-center justify-between py-3 border-b border-neutral-800 last:border-0" role="article" aria-label="${this.escapeHtml(activity.name || 'Unknown')} - ${this.escapeHtml(activity.value || 'N/A')}">
            <div class="activity-info flex items-center gap-3">
              <div class="activity-icon p-2 rounded-lg bg-neutral-800/50" aria-hidden="true">
                <i data-lucide="${activity.icon || 'Activity'}" class="w-4 h-4 text-neutral-400"></i>
              </div>
              <div>
                <div class="text-sm font-medium text-white">${this.escapeHtml(activity.name || 'Unknown')}</div>
                <div class="text-xs text-neutral-500 mt-0.5">${this.escapeHtml(activity.typeLabel || 'Activity')}</div>
              </div>
            </div>
            <div class="activity-value text-sm font-medium ${activity.type === 'price' ? 'text-green-400' :
            activity.type === 'pack' ? 'text-neutral-300' :
              'text-neutral-400'
          }">
              ${this.escapeHtml(activity.value || 'N/A')}
            </div>
          </article>
        `).join('');
      }

      // Initialize Lucide icons
      if (window.lucide) {
        window.lucide.createIcons();
      }
    } catch (error) {
      console.error('Error rendering recent activity:', error);
    }
  }

  /**
   * Render quick stats grid
   * @private
   */
  renderQuickStats() {
    try {
      const container = this.container.querySelector('#quick-stats-grid');
      if (!container) {
        console.warn('Quick stats container not found');
        return;
      }

      const quickStats = this.dashboardService.getQuickStats();

      // Ensure quickStats is an array
      if (!Array.isArray(quickStats)) {
        console.error('quickStats is not an array:', quickStats);
        return;
      }

      container.innerHTML = quickStats.map(stat => `
        <div class="quick-stat-item p-4 rounded-xl bg-neutral-900/50 border border-neutral-800 hover:border-neutral-700 transition-colors" role="listitem" aria-label="${this.escapeHtml(stat.label || 'N/A')}: ${this.escapeHtml(stat.value || '0')}">
          <div class="text-2xl font-bold text-white mb-1" aria-hidden="true">${this.escapeHtml(stat.value || '0')}</div>
          <div class="text-xs text-neutral-500 font-medium uppercase tracking-wide" aria-hidden="true">${this.escapeHtml(stat.label || 'N/A')}</div>
        </div>
      `).join('');
    } catch (error) {
      console.error('Error rendering quick stats:', error);
    }
  }

  /**
   * Refresh dashboard data
   */
  refreshData() {
    if (this.dashboardService) {
      // Clear cache to get fresh data
      this.dashboardService.clearCache();

      // Re-render all sections
      this.renderRecentActivity();
      this.renderQuickStats();

      console.log('Dashboard data refreshed');
    }

    if (this.leaderboardService) {
      this.leaderboardService.clearAllCaches();
    }

    this.renderLeaderboardHighlights();
  }

  /**
   * Start auto-refresh timer
   * @private
   */
  startAutoRefresh() {
    // Refresh every 30 seconds
    this.refreshInterval = setInterval(() => {
      this.refreshData();
    }, 30000);

    console.log('Dashboard auto-refresh started');
  }

  /**
   * Stop auto-refresh timer
   * @private
   */
  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
      console.log('Dashboard auto-refresh stopped');
    }
  }

  /**
   * Escape HTML to prevent XSS
   * @private
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
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
    const currentHash = typeof window !== 'undefined' ? (window.location.hash || '#/dashboard') : '#/dashboard';
    if (lastDashboardMountHash === currentHash && this.container && this.container.childElementCount > 0) {
      console.info('DashboardPage: duplicate mount skipped for hash', currentHash);
      return;
    }

    lastDashboardMountHash = currentHash;
    this.mountHash = currentHash;

    try {
      this.container = container;

      // Render the page
      this.container.innerHTML = this.render();

      // Initialize dashboard service
      this.initializeDashboardService();

      // Render all sections
      this.renderRecentActivity();
      this.renderQuickStats();
      this.initializeLeaderboardService();
      this.renderLeaderboardHighlights();

      // Initialize Lucide icons
      if (window.lucide) {
        window.lucide.createIcons();
      }

      // Start auto-refresh
      this.startAutoRefresh();

      // Listen for data updates
      this.attachEventListeners();

      // Listen for auth changes to reload data
      this.boundHandlers.handleAuthChange = (e) => {
        const { user } = e.detail;
        console.log('[DashboardPage] Auth changed, refreshing data...', user?.email || 'Guest');
        this.refreshData();
      };
      window.addEventListener('auth:changed', this.boundHandlers.handleAuthChange);

      console.log('DashboardPage mounted successfully');
    } catch (error) {
      console.error('Error mounting DashboardPage:', error);
      // Display error message to user
      if (this.container) {
        this.container.innerHTML = `
          <div class="page-content">
            <div class="error-card bg-neutral-900/40 backdrop-blur-sm border border-red-800/50 rounded-xl p-6">
              <h2>⚠️ Failed to load Dashboard</h2>
              <p>${error.message || 'Unknown error occurred'}</p>
              <p class="text-sm text-neutral-400 mt-2">Please refresh the page or try again later.</p>
            </div>
          </div>
        `;
      }
    }
  }

  /**
   * Attach event listeners
   * @private
   */
  attachEventListeners() {
    // Listen for session updates
    if (window.app?.sessionManager) {
      // When a session is updated, refresh the dashboard
      // Note: SessionManager would need to emit events for this to work
      // For now, we rely on auto-refresh
    }

    // Listen for voice recognition events
    if (window.app?.voiceEngine) {
      // When voice recognition completes, add activity and refresh
      // Note: VoiceEngine would need to emit events for this to work
      // For now, we rely on auto-refresh
    }

    if (this.container) {
      const viewAllBtn = this.container.querySelector('#dashboardViewLeaderboardsBtn');
      if (viewAllBtn) {
        viewAllBtn.addEventListener('click', this.boundHandlers.handleViewAllLeaderboards);
      }
    }
  }

  /**
   * Unmount the page
   */
  async unmount() {
    if (this.mountHash && lastDashboardMountHash === this.mountHash) {
      lastDashboardMountHash = null;
    }

    // Stop auto-refresh
    // Cleanup auth listener
    if (this.boundHandlers?.handleAuthChange) {
      window.removeEventListener('auth:changed', this.boundHandlers.handleAuthChange);
    }

    this.stopAutoRefresh();

    if (this.container) {
      const viewAllBtn = this.container.querySelector('#dashboardViewLeaderboardsBtn');
      if (viewAllBtn) {
        viewAllBtn.removeEventListener('click', this.boundHandlers.handleViewAllLeaderboards);
      }
    }

    // Destroy stat cards
    this.statsCards = [];

    // Clear container
    if (this.container) {
      this.container.innerHTML = '';
    }

    this.mountHash = null;
    this.leaderboardError = null;

    console.log('DashboardPage unmounted');
  }
}
