import { Logger } from '../js/utils/Logger.js';
import { authService } from '../services/authService.js';


export default class AdminPage {
  constructor(router) {
    this.router = router;
    this.logger = new Logger('AdminPage');
    this.container = null;
    this.isAdmin = false;
  }

  async mount(container) {
    this.container = container;
    this.checkAdminStatus();

    if (!this.isAdmin) {
      this.container.innerHTML = `
        <div class="page-content">
          <div class="error-state">
            <i data-lucide="lock" style="width: 48px; height: 48px; color: var(--color-danger);"></i>
            <h2>Access Denied</h2>
            <p>You do not have permission to view this page.</p>
            <button class="btn btn-primary" onclick="window.router.navigate('dashboard')">
              Return to Dashboard
            </button>
          </div>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    this.render();
    this.attachEvents();
  }

  checkAdminStatus() {
    // Simple client-side check as requested
    // In a real app, this should be enforced by RLS/Backend
    const profile = authService?.profile;

    this.isAdmin = profile && profile.is_admin;
  }

  render() {
    this.container.innerHTML = `
      <div class="page-content">
        <div class="section-header">
          <h2>
            <i data-lucide="shield-alert" style="width: 24px; height: 24px;"></i>
            Admin Console
          </h2>
          <p class="text-secondary">System management and synchronization tools</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Price Sync Card -->
          <div class="card p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-bold">Price Synchronization</h3>
              <i data-lucide="refresh-cw" class="text-primary"></i>
            </div>
            <p class="text-secondary mb-6">
              Trigger a manual sync of card prices from TCGcsv to Supabase. 
              This process runs in the background and may take several minutes.
            </p>
            <button id="sync-prices-btn" class="btn btn-primary w-full">
              <i data-lucide="database"></i>
              Sync Prices to DB
            </button>
            <div id="sync-status" class="mt-4 text-sm text-secondary hidden"></div>
          </div>

          <!-- Leaderboard Refresh Card -->
          <div class="card p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-bold">Leaderboard Refresh</h3>
              <i data-lucide="trophy" class="text-warning"></i>
            </div>
            <p class="text-secondary mb-6">
              Manually refresh the materialized views for leaderboards.
              This updates the Value, Quantity, and Rarity rankings.
            </p>
            <button id="refresh-leaderboards-btn" class="btn btn-secondary w-full">
              <i data-lucide="rotate-cw"></i>
              Refresh Leaderboards
            </button>
            <div id="refresh-status" class="mt-4 text-sm text-secondary hidden"></div>
          </div>
        </div>
        
        <!-- Logs Section (Placeholder) -->
        <div class="card p-6 mt-6">
          <h3 class="text-lg font-bold mb-4">System Logs</h3>
          <div class="bg-black/30 rounded p-4 font-mono text-xs text-secondary h-48 overflow-y-auto" id="admin-logs">
            <div class="log-entry">[System] Admin console loaded.</div>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();
  }

  attachEvents() {
    const syncBtn = this.container.querySelector('#sync-prices-btn');
    const refreshBtn = this.container.querySelector('#refresh-leaderboards-btn');

    if (syncBtn) {
      syncBtn.addEventListener('click', () => this.handleSyncPrices());
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.handleRefreshLeaderboards());
    }
  }

  log(message) {
    const logs = this.container.querySelector('#admin-logs');
    if (logs) {
      const entry = document.createElement('div');
      entry.className = 'log-entry mb-1';
      entry.innerText = `[${new Date().toLocaleTimeString()}] ${message}`;
      logs.appendChild(entry);
      logs.scrollTop = logs.scrollHeight;
    }
  }

  async handleSyncPrices() {
    const btn = this.container.querySelector('#sync-prices-btn');
    const status = this.container.querySelector('#sync-status');

    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader" class="animate-spin"></i> Starting Sync...';
    status.classList.remove('hidden');
    status.innerText = 'Requesting sync...';

    try {
      // Call Python backend
      // Assuming backend is at localhost:8080 or configured API URL
      // We need to use the config.API_URL but that might point to Supabase?
      // No, config.js usually points to the Python backend for prices.
      // Let's check config.js to see what API_URL is.
      // If it's not set, we assume localhost:8080 for now.

      const apiUrl = 'http://localhost:8080/api/v1/admin/sync-prices'; // Hardcoded for local dev as per user context

      this.log(`POST ${apiUrl}`);

      const response = await fetch(apiUrl, { method: 'POST' });
      const data = await response.json();

      if (data.success) {
        this.log('Sync started successfully.');
        status.innerText = 'Sync started in background.';
        status.className = 'mt-4 text-sm text-success';
      } else {
        throw new Error(data.error?.message || 'Unknown error');
      }

    } catch (error) {
      this.logger.error('Sync failed', error);
      this.log(`Error: ${error.message}`);
      status.innerText = `Error: ${error.message}`;
      status.className = 'mt-4 text-sm text-danger';
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="database"></i> Sync Prices to DB';
      if (window.lucide) window.lucide.createIcons();
    }
  }

  async handleRefreshLeaderboards() {
    const btn = this.container.querySelector('#refresh-leaderboards-btn');
    const status = this.container.querySelector('#refresh-status');

    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader" class="animate-spin"></i> Refreshing...';
    status.classList.remove('hidden');
    status.innerText = 'Requesting refresh...';

    try {
      const apiUrl = 'http://localhost:8080/api/v1/admin/refresh-leaderboards';

      this.log(`POST ${apiUrl}`);

      const response = await fetch(apiUrl, { method: 'POST' });
      const data = await response.json();

      if (data.success) {
        this.log('Leaderboards refreshed successfully.');
        status.innerText = 'Refresh complete.';
        status.className = 'mt-4 text-sm text-success';
      } else {
        throw new Error(data.error?.message || 'Unknown error');
      }

    } catch (error) {
      this.logger.error('Refresh failed', error);
      this.log(`Error: ${error.message}`);
      status.innerText = `Error: ${error.message}`;
      status.className = 'mt-4 text-sm text-danger';
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="rotate-cw"></i> Refresh Leaderboards';
      if (window.lucide) window.lucide.createIcons();
    }
  }

  async unmount() {
    this.container.innerHTML = '';
  }
}
