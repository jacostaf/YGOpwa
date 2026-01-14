import { Logger } from '../js/utils/Logger.js';
import { authService } from '../services/authService.js';


export default class AdminPage {
  constructor(router) {
    this.router = router;
    this.logger = new Logger('AdminPage');
    this.container = null;
    this.isAdmin = false;
    this.syncProgressInterval = null;
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

        <!-- Quick Access Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <a href="#/rarity-admin" class="card p-4 hover:bg-neutral-800/50 transition-colors cursor-pointer block no-underline">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-purple-500/20 rounded-lg">
                <i data-lucide="gem" class="text-purple-400" style="width: 20px; height: 20px;"></i>
              </div>
              <div>
                <h4 class="text-sm font-medium text-white">Rarity Vault</h4>
                <p class="text-xs text-secondary">Manage card rarity weights</p>
              </div>
            </div>
          </a>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Catalog Refresh Card -->
          <div class="card p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-bold">Card Catalog</h3>
              <i data-lucide="library" class="text-info"></i>
            </div>
            <p class="text-secondary mb-4">
              Fetch the latest cards and sets from TCGcsv into local cache.
            </p>
            <div id="catalog-status" class="text-xs text-secondary mb-4">Loading...</div>
            <button id="refresh-catalog-btn" class="btn btn-secondary w-full">
              <i data-lucide="download-cloud"></i>
              Refresh Card Catalog
            </button>
            <div id="catalog-refresh-status" class="mt-4 text-sm text-secondary hidden"></div>
          </div>

          <!-- Price Sync Card -->
          <div class="card p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-bold">Database Sync</h3>
              <i data-lucide="database" class="text-primary"></i>
            </div>
            <p class="text-secondary mb-4">
              Upload local card cache to Supabase database.
            </p>
            <div id="db-cache-info" class="text-xs text-secondary mb-4"></div>
            <button id="sync-prices-btn" class="btn btn-primary w-full">
              <i data-lucide="upload-cloud"></i>
              Sync to Database
            </button>
            <div id="sync-status" class="mt-4 text-sm text-secondary hidden"></div>
            <div id="sync-progress-container" class="mt-4 hidden">
              <div class="flex justify-between text-xs text-secondary mb-1">
                <span id="sync-phase">Phase: Idle</span>
                <span id="sync-count">0 / 0</span>
              </div>
              <div class="w-full bg-neutral-800 rounded-full h-2">
                <div id="sync-progress-bar" class="bg-primary h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
              </div>
              <div id="sync-stats" class="text-xs text-secondary mt-2"></div>
            </div>
          </div>

          <!-- Leaderboard Refresh Card -->
          <div class="card p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-bold">Leaderboard Refresh</h3>
              <i data-lucide="trophy" class="text-warning"></i>
            </div>
            <p class="text-secondary mb-4">
              Refresh the materialized views for leaderboards.
            </p>
            <div class="flex gap-2 mb-4">
              <button id="refresh-leaderboards-btn" class="btn btn-secondary flex-1">
                <i data-lucide="rotate-cw"></i>
                Quick Refresh
              </button>
              <button id="force-refresh-btn" class="btn btn-primary flex-1">
                <i data-lucide="zap"></i>
                Force Refresh
              </button>
            </div>
            <p class="text-xs text-secondary mb-2">
              Force Refresh shows before/after timestamps to verify the update worked.
            </p>
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
    const catalogBtn = this.container.querySelector('#refresh-catalog-btn');
    const syncBtn = this.container.querySelector('#sync-prices-btn');
    const refreshBtn = this.container.querySelector('#refresh-leaderboards-btn');
    const forceRefreshBtn = this.container.querySelector('#force-refresh-btn');

    if (catalogBtn) {
      catalogBtn.addEventListener('click', () => this.handleRefreshCatalog());
    }

    if (syncBtn) {
      syncBtn.addEventListener('click', () => this.handleSyncPrices());
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.handleRefreshLeaderboards());
    }

    if (forceRefreshBtn) {
      forceRefreshBtn.addEventListener('click', () => this.handleForceRefresh());
    }

    // Load catalog status on page load
    this.loadCatalogStatus();
  }

  async loadCatalogStatus() {
    const statusEl = this.container.querySelector('#catalog-status');
    const cacheInfoEl = this.container.querySelector('#db-cache-info');

    try {
      const response = await fetch('http://localhost:8080/api/v1/admin/catalog-status');
      const data = await response.json();

      if (data.success && data.data) {
        const { sets_count, cards_count, last_updated } = data.data;
        const lastUpdatedStr = last_updated
          ? new Date(last_updated).toLocaleString()
          : 'Never';

        if (statusEl) {
          statusEl.innerHTML = `<strong>${sets_count}</strong> sets, <strong>${cards_count.toLocaleString()}</strong> cards<br>Last updated: ${lastUpdatedStr}`;
        }
        if (cacheInfoEl) {
          cacheInfoEl.innerHTML = `Cache: ${sets_count} sets, ${cards_count.toLocaleString()} cards`;
        }
      }
    } catch (error) {
      if (statusEl) statusEl.textContent = 'Failed to load status';
      if (cacheInfoEl) cacheInfoEl.textContent = '';
    }
  }

  async handleRefreshCatalog() {
    const btn = this.container.querySelector('#refresh-catalog-btn');
    const status = this.container.querySelector('#catalog-refresh-status');

    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader" class="animate-spin"></i> Fetching from TCGcsv...';
    status.classList.remove('hidden');
    status.innerText = 'Starting catalog refresh (this may take several minutes)...';
    status.className = 'mt-4 text-sm text-secondary';

    try {
      const apiUrl = 'http://localhost:8080/api/v1/admin/refresh-catalog';
      this.log(`POST ${apiUrl}`);

      const response = await fetch(apiUrl, { method: 'POST' });
      const data = await response.json();

      if (data.success) {
        this.log('Catalog refresh started in background.');
        status.innerHTML = `
          <div class="text-success">Refresh started in background!</div>
          <div class="text-xs mt-1">Current cache: ${data.data?.current_sets || 0} sets, ${(data.data?.current_cards || 0).toLocaleString()} cards</div>
          <div class="text-xs">Check logs for progress. Refresh this page when complete.</div>
        `;
      } else {
        throw new Error(data.error?.message || 'Unknown error');
      }

    } catch (error) {
      this.logger.error('Catalog refresh failed', error);
      this.log(`Error: ${error.message}`);
      status.innerText = `Error: ${error.message}`;
      status.className = 'mt-4 text-sm text-danger';
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="download-cloud"></i> Refresh Card Catalog';
      if (window.lucide) window.lucide.createIcons();
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
    const progressContainer = this.container.querySelector('#sync-progress-container');

    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader" class="animate-spin"></i> Starting Sync...';
    status.classList.remove('hidden');
    status.innerText = 'Requesting sync...';

    try {
      const apiUrl = 'http://localhost:8080/api/v1/admin/sync-prices';

      this.log(`POST ${apiUrl}`);

      const response = await fetch(apiUrl, { method: 'POST' });
      const data = await response.json();

      if (data.success) {
        this.log('Sync started successfully.');
        status.innerText = 'Sync running...';
        status.className = 'mt-4 text-sm text-info';

        // Show progress container and start polling
        progressContainer.classList.remove('hidden');
        this.startProgressPolling();
      } else {
        throw new Error(data.error?.message || 'Unknown error');
      }

    } catch (error) {
      this.logger.error('Sync failed', error);
      this.log(`Error: ${error.message}`);
      status.innerText = `Error: ${error.message}`;
      status.className = 'mt-4 text-sm text-danger';
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="upload-cloud"></i> Sync to Database';
      if (window.lucide) window.lucide.createIcons();
    }
  }

  startProgressPolling() {
    // Clear any existing interval
    if (this.syncProgressInterval) {
      clearInterval(this.syncProgressInterval);
    }

    const pollProgress = async () => {
      try {
        const response = await fetch('http://localhost:8080/api/v1/admin/sync-progress');
        const data = await response.json();

        if (data.success && data.data) {
          this.updateProgressDisplay(data.data);

          // Stop polling if complete or error
          if (data.data.status === 'complete' || data.data.status === 'error') {
            this.stopProgressPolling();
          }
        }
      } catch (error) {
        this.logger.warn('Failed to fetch progress', error);
      }
    };

    // Poll immediately, then every 2 seconds
    pollProgress();
    this.syncProgressInterval = setInterval(pollProgress, 2000);
  }

  stopProgressPolling() {
    if (this.syncProgressInterval) {
      clearInterval(this.syncProgressInterval);
      this.syncProgressInterval = null;
    }

    // Re-enable the button
    const btn = this.container.querySelector('#sync-prices-btn');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="upload-cloud"></i> Sync to Database';
      if (window.lucide) window.lucide.createIcons();
    }
  }

  updateProgressDisplay(progress) {
    const status = this.container.querySelector('#sync-status');
    const phaseEl = this.container.querySelector('#sync-phase');
    const countEl = this.container.querySelector('#sync-count');
    const barEl = this.container.querySelector('#sync-progress-bar');
    const statsEl = this.container.querySelector('#sync-stats');

    // Update phase
    if (phaseEl) {
      phaseEl.textContent = `Phase: ${progress.phase || 'Starting'}`;
    }

    // Update count and progress bar
    const current = progress.current || 0;
    const total = progress.total || 0;
    const percent = total > 0 ? Math.round((current / total) * 100) : 0;

    if (countEl) {
      countEl.textContent = `${current.toLocaleString()} / ${total.toLocaleString()}`;
    }

    if (barEl) {
      barEl.style.width = `${percent}%`;
    }

    // Update stats
    if (statsEl && progress.stats) {
      const s = progress.stats;
      statsEl.innerHTML = `
        <span class="text-success">✓ ${s.inserted || 0} new</span> ·
        <span class="text-info">↻ ${s.updated || 0} updated</span> ·
        <span class="text-warning">⚡ ${s.merged || 0} merged</span>
        ${s.errors > 0 ? ` · <span class="text-danger">✗ ${s.errors} errors</span>` : ''}
      `;
    }

    // Update status message
    if (status) {
      if (progress.status === 'complete') {
        status.innerText = progress.message || 'Sync complete!';
        status.className = 'mt-4 text-sm text-success';
        this.log('Sync completed successfully.');
      } else if (progress.status === 'error') {
        status.innerText = progress.message || 'Sync failed';
        status.className = 'mt-4 text-sm text-danger';
        this.log(`Sync error: ${progress.message}`);
      } else {
        status.innerText = progress.message || 'Syncing...';
        status.className = 'mt-4 text-sm text-info';
      }
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

        // Clear frontend leaderboard cache so users see fresh data
        this.clearLeaderboardCache();
        this.log('Frontend leaderboard cache cleared.');

        status.innerText = 'Refresh complete. Cache cleared.';
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

  async handleForceRefresh() {
    const btn = this.container.querySelector('#force-refresh-btn');
    const status = this.container.querySelector('#refresh-status');

    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader" class="animate-spin"></i> Force Refreshing...';
    status.classList.remove('hidden');
    status.innerText = 'Forcing materialized view refresh...';

    try {
      const apiUrl = 'http://localhost:8080/api/v1/admin/force-refresh-leaderboards';

      this.log(`POST ${apiUrl}`);

      const response = await fetch(apiUrl, { method: 'POST' });
      const data = await response.json();

      if (data.success && data.data) {
        const result = data.data;
        this.log(`Force refresh success: ${JSON.stringify(result)}`);

        // Show before/after timestamps
        const before = result.before || {};
        const after = result.after || {};

        this.log(`BEFORE - Value: ${before.value}, Quantity: ${before.quantity}, Rarity: ${before.rarity}`);
        this.log(`AFTER  - Value: ${after.value}, Quantity: ${after.quantity}, Rarity: ${after.rarity}`);

        // Clear frontend cache
        this.clearLeaderboardCache();
        this.log('Frontend leaderboard cache cleared.');

        status.innerHTML = `
          <div class="text-success mb-2">Refresh complete!</div>
          <div class="text-xs">
            <div><strong>Before:</strong> ${before.value ? new Date(before.value).toLocaleString() : 'N/A'}</div>
            <div><strong>After:</strong> ${after.value ? new Date(after.value).toLocaleString() : 'N/A'}</div>
          </div>
        `;
        status.className = 'mt-4 text-sm';
      } else {
        throw new Error(data.error?.message || data.message || 'Unknown error');
      }

    } catch (error) {
      this.logger.error('Force refresh failed', error);
      this.log(`Error: ${error.message}`);
      status.innerText = `Error: ${error.message}`;
      status.className = 'mt-4 text-sm text-danger';
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="zap"></i> Force Refresh';
      if (window.lucide) window.lucide.createIcons();
    }
  }

  clearLeaderboardCache() {
    // Clear sessionStorage entries for leaderboard data
    const prefix = 'voxrip:leaderboard:';
    try {
      const keysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => sessionStorage.removeItem(key));
      this.log(`Cleared ${keysToRemove.length} cached leaderboard entries.`);
    } catch (error) {
      this.logger.warn('Failed to clear leaderboard cache', error);
    }
  }

  async unmount() {
    // Clean up polling interval
    if (this.syncProgressInterval) {
      clearInterval(this.syncProgressInterval);
      this.syncProgressInterval = null;
    }
    this.container.innerHTML = '';
  }
}
