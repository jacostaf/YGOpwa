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

export default class DashboardPage {
  constructor(router) {
    this.router = router;
    this.container = null;
    this.dashboardService = null;
    this.statsCards = [];
    this.refreshInterval = null;
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

  /**
   * Render the dashboard page
   * @returns {string} HTML string
   */
  render() {
    return `
      <div class="page-content dashboard-page">
        <!-- Main Stats Grid -->
        <section class="dashboard-main-stats grid grid-cols-1 md:grid-cols-3 gap-6 mb-8" id="dashboard-main-stats" role="region" aria-label="Main statistics">
          <!-- Stats cards will be inserted here -->
        </section>

        <!-- Secondary Grid (Activity + Quick Stats) -->
        <div class="dashboard-secondary-grid grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Recent Activity Section -->
          <section class="dashboard-activity bg-neutral-900/40 backdrop-blur-sm border border-neutral-800/50 rounded-xl p-6" role="region" aria-label="Recent activity">
            <div class="section-header flex items-center justify-between mb-6">
              <h2 class="text-lg font-semibold text-white">Recent Activity</h2>
              <i data-lucide="Clock" class="w-5 h-5 text-neutral-500" aria-hidden="true"></i>
            </div>
            <div class="activity-list space-y-4" id="activity-list" role="feed" aria-label="Activity feed">
              <!-- Activity items will be inserted here -->
            </div>
          </section>

          <!-- Quick Stats Section -->
          <section class="dashboard-quick-stats bg-neutral-900/40 backdrop-blur-sm border border-neutral-800/50 rounded-xl p-6" role="region" aria-label="Quick statistics">
            <div class="section-header flex items-center justify-between mb-6">
              <h2 class="text-lg font-semibold text-white">Quick Stats</h2>
              <i data-lucide="TrendingUp" class="w-5 h-5 text-neutral-500" aria-hidden="true"></i>
            </div>
            <div class="quick-stats-grid grid grid-cols-2 gap-4" id="quick-stats-grid" role="list" aria-label="Quick statistics list">
              <!-- Quick stats will be inserted here -->
            </div>
          </section>
        </div>
      </div>
    `;
  }

  /**
   * Render main stats cards
   * @private
   */
  renderMainStats() {
    try {
      const container = this.container.querySelector('#dashboard-main-stats');
      if (!container) {
        console.warn('Main stats container not found');
        return;
      }

      // Clear existing cards
      container.innerHTML = '';
      this.statsCards = [];

      // Get stats from dashboard service
      if (!this.dashboardService) {
        this.initializeDashboardService();
      }

      const mainStats = this.dashboardService.getMainStats();

      // Ensure mainStats is an array
      if (!Array.isArray(mainStats)) {
        console.error('mainStats is not an array:', mainStats);
        return;
      }

      // Create stat cards
      mainStats.forEach(stat => {
        const card = new StatsCard({
          icon: stat.icon || 'Activity',
          label: stat.label || 'N/A',
          value: stat.value || '0',
          trend: stat.trend || null,
          trendClass: stat.trendClass || 'text-green-400 bg-green-400/10'
        });

        const cardElement = card.create();
        container.appendChild(cardElement);
        this.statsCards.push(card);
      });

      // Initialize Lucide icons
      if (window.lucide) {
        window.lucide.createIcons();
      }
    } catch (error) {
      console.error('Error rendering main stats:', error);
    }
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
          <article class="activity-item flex items-center justify-between p-3 rounded-lg bg-neutral-800/30 hover:bg-neutral-800/50 transition-colors" role="article" aria-label="${this.escapeHtml(activity.name || 'Unknown')} - ${this.escapeHtml(activity.value || 'N/A')}">
            <div class="activity-info flex items-center gap-3">
              <div class="activity-icon p-2 rounded-lg bg-neutral-700/30" aria-hidden="true">
                <i data-lucide="${activity.icon || 'Activity'}" class="w-4 h-4 text-neutral-400"></i>
              </div>
              <div>
                <div class="text-sm font-medium text-white">${this.escapeHtml(activity.name || 'Unknown')}</div>
                <div class="text-xs text-neutral-500 mt-1">${this.escapeHtml(activity.typeLabel || 'Activity')}</div>
              </div>
            </div>
            <div class="activity-value text-sm font-medium ${
              activity.type === 'price' ? 'text-green-400' :
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
        <div class="quick-stat-item p-4 rounded-lg bg-neutral-800/30" role="listitem" aria-label="${this.escapeHtml(stat.label || 'N/A')}: ${this.escapeHtml(stat.value || '0')}">
          <div class="text-2xl font-bold text-white mb-1" aria-hidden="true">${this.escapeHtml(stat.value || '0')}</div>
          <div class="text-xs text-neutral-400" aria-hidden="true">${this.escapeHtml(stat.label || 'N/A')}</div>
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
      this.renderMainStats();
      this.renderRecentActivity();
      this.renderQuickStats();

      console.log('Dashboard data refreshed');
    }
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
    try {
      this.container = container;

      // Render the page
      this.container.innerHTML = this.render();

      // Initialize dashboard service
      this.initializeDashboardService();

      // Render all sections
      this.renderMainStats();
      this.renderRecentActivity();
      this.renderQuickStats();

      // Initialize Lucide icons
      if (window.lucide) {
        window.lucide.createIcons();
      }

      // Start auto-refresh
      this.startAutoRefresh();

      // Listen for data updates
      this.attachEventListeners();

      console.log('DashboardPage mounted successfully');
    } catch (error) {
      console.error('Error mounting DashboardPage:', error);
      // Display error message to user
      if (this.container) {
        this.container.innerHTML = `
          <div class="page-content">
            <div class="card section-card glass-card error-card">
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
  }

  /**
   * Unmount the page
   */
  async unmount() {
    // Stop auto-refresh
    this.stopAutoRefresh();

    // Destroy stat cards
    this.statsCards.forEach(card => card.destroy());
    this.statsCards = [];

    // Clear container
    if (this.container) {
      this.container.innerHTML = '';
    }

    console.log('DashboardPage unmounted');
  }
}
