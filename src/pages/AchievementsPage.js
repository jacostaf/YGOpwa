/**
 * AchievementsPage - Displays achievements grid and statistics
 *
 * Features:
 * - Achievement grid with all 15 achievements
 * - Category filtering (All, Voice, Pack, Collection, General)
 * - Statistics overview (total, unlocked, percentage)
 * - Category breakdown stats
 * - Achievement progress tracking
 * - Glassmorphism styling
 * - Responsive grid layout
 *
 * @class AchievementsPage
 */

import { AchievementBadge } from '../components/AchievementBadge.js';

export class AchievementsPage {
  constructor(router) {
    this.router = router;
    this.app = null;
    this.achievementManager = null;
    this.currentFilter = 'all';
    this.boundHandlers = {};
  }

  /**
   * Initialize page dependencies
   * @private
   */
  initializeDependencies() {
    // Get global app instance (set by app.js)
    this.app = window.app || null;
    this.achievementManager = this.app?.achievementManager || null;

    if (!this.achievementManager) {
      console.warn('AchievementManager not available');
    }
  }

  /**
   * Render the achievements page
   * @returns {string} HTML string
   */
  render() {
    const stats = this.achievementManager.getStats();

    return `
      <div class="achievements-page">
        <!-- Page Header -->
        <div class="page-header" style="margin-bottom: 32px;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
            <i data-lucide="Award" style="width: 32px; height: 32px; color: var(--accent);"></i>
            <h1 style="font-size: 28px; font-weight: 700; color: white; margin: 0;">Achievements</h1>
          </div>
          <p style="font-size: 14px; color: rgba(255, 255, 255, 0.6); margin: 0;">
            Track your progress and unlock rewards
          </p>
        </div>

        <!-- Stats Overview -->
        ${this.renderStatsOverview(stats)}

        <!-- Category Filters -->
        ${this.renderCategoryFilters()}

        <!-- Achievements Grid -->
        <div id="achievements-grid" class="achievements-grid">
          ${this.renderAchievementsGrid()}
        </div>

        <!-- Empty State (if no achievements match filter) -->
        <div id="achievements-empty" class="achievements-empty" style="display: none;">
          <div class="glass-card" style="padding: 48px; text-align: center;">
            <i data-lucide="Award" style="width: 64px; height: 64px; color: rgba(255, 255, 255, 0.3); margin: 0 auto 16px;"></i>
            <h3 style="font-size: 18px; font-weight: 600; color: white; margin: 0 0 8px 0;">
              No Achievements Found
            </h3>
            <p style="font-size: 14px; color: rgba(255, 255, 255, 0.6); margin: 0;">
              Try selecting a different category filter.
            </p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render statistics overview
   * @param {Object} stats - Achievement statistics
   * @returns {string} HTML string
   */
  renderStatsOverview(stats) {
    return `
      <div class="stats-overview" style="
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        margin-bottom: 32px;
      ">
        <!-- Total Achievements -->
        <div class="glass-card" style="padding: 24px;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
            <i data-lucide="Trophy" style="width: 24px; height: 24px; color: var(--accent);"></i>
            <span style="font-size: 13px; color: rgba(255, 255, 255, 0.6); font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">
              Total Achievements
            </span>
          </div>
          <div style="font-size: 32px; font-weight: 700; color: white;">
            ${stats.total}
          </div>
        </div>

        <!-- Unlocked Achievements -->
        <div class="glass-card" style="padding: 24px;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
            <i data-lucide="CheckCircle" style="width: 24px; height: 24px; color: #22C55E;"></i>
            <span style="font-size: 13px; color: rgba(255, 255, 255, 0.6); font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">
              Unlocked
            </span>
          </div>
          <div style="font-size: 32px; font-weight: 700; color: #22C55E;">
            ${stats.unlocked}
          </div>
        </div>

        <!-- Locked Achievements -->
        <div class="glass-card" style="padding: 24px;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
            <i data-lucide="Lock" style="width: 24px; height: 24px; color: rgba(255, 255, 255, 0.4);"></i>
            <span style="font-size: 13px; color: rgba(255, 255, 255, 0.6); font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">
              Locked
            </span>
          </div>
          <div style="font-size: 32px; font-weight: 700; color: rgba(255, 255, 255, 0.7);">
            ${stats.locked}
          </div>
        </div>

        <!-- Completion Percentage -->
        <div class="glass-card" style="padding: 24px;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
            <i data-lucide="Target" style="width: 24px; height: 24px; color: #3B82F6;"></i>
            <span style="font-size: 13px; color: rgba(255, 255, 255, 0.6); font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">
              Completion
            </span>
          </div>
          <div style="font-size: 32px; font-weight: 700; color: white;">
            ${stats.percentage}%
          </div>
          <div style="
            width: 100%;
            height: 6px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 3px;
            overflow: hidden;
            margin-top: 12px;
          ">
            <div style="
              width: ${stats.percentage}%;
              height: 100%;
              background: linear-gradient(90deg, #3B82F6, #8B5CF6);
              border-radius: 3px;
              transition: width 0.3s ease;
            "></div>
          </div>
        </div>
      </div>

      <!-- Category Stats -->
      <div class="category-stats glass-card" style="padding: 24px; margin-bottom: 32px;">
        <h3 style="font-size: 16px; font-weight: 600; color: white; margin: 0 0 20px 0;">
          Progress by Category
        </h3>
        <div style="
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
        ">
          ${this.renderCategoryStat('Voice Recognition', 'Mic', stats.byCategory.voice, '#3B82F6')}
          ${this.renderCategoryStat('Pack Opening', 'Package', stats.byCategory.pack, '#A855F7')}
          ${this.renderCategoryStat('Collection', 'FolderOpen', stats.byCategory.collection, '#22C55E')}
          ${this.renderCategoryStat('General', 'Star', stats.byCategory.general, '#EAB308')}
        </div>
      </div>
    `;
  }

  /**
   * Render individual category stat
   * @param {string} name - Category name
   * @param {string} icon - Lucide icon name
   * @param {Object} stats - Category stats
   * @param {string} color - Category color
   * @returns {string} HTML string
   */
  renderCategoryStat(name, icon, stats, color) {
    const percentage = stats.total > 0 ? Math.round((stats.unlocked / stats.total) * 100) : 0;

    return `
      <div class="category-stat">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <i data-lucide="${icon}" style="width: 18px; height: 18px; color: ${color};"></i>
          <span style="font-size: 13px; color: rgba(255, 255, 255, 0.7); font-weight: 500;">
            ${name}
          </span>
        </div>
        <div style="font-size: 20px; font-weight: 600; color: white; margin-bottom: 4px;">
          ${stats.unlocked} / ${stats.total}
        </div>
        <div style="
          width: 100%;
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
        ">
          <div style="
            width: ${percentage}%;
            height: 100%;
            background: ${color};
            border-radius: 2px;
            transition: width 0.3s ease;
          "></div>
        </div>
      </div>
    `;
  }

  /**
   * Render category filters
   * @returns {string} HTML string
   */
  renderCategoryFilters() {
    const filters = [
      { id: 'all', label: 'All Achievements', icon: 'Grid' },
      { id: 'voice', label: 'Voice Recognition', icon: 'Mic' },
      { id: 'pack', label: 'Pack Opening', icon: 'Package' },
      { id: 'collection', label: 'Collection', icon: 'FolderOpen' },
      { id: 'general', label: 'General', icon: 'Star' }
    ];

    return `
      <div class="category-filters" style="margin-bottom: 32px;">
        <div style="
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        ">
          ${filters.map(filter => `
            <button class="category-filter-btn ${this.currentFilter === filter.id ? 'active' : ''}"
                    data-filter="${filter.id}"
                    style="
                      display: flex;
                      align-items: center;
                      gap: 8px;
                      padding: 10px 18px;
                      background: ${this.currentFilter === filter.id ? 'var(--accent)' : 'rgba(255, 255, 255, 0.05)'};
                      border: 2px solid ${this.currentFilter === filter.id ? 'var(--accent)' : 'rgba(255, 255, 255, 0.1)'};
                      border-radius: 12px;
                      color: white;
                      font-size: 14px;
                      font-weight: 500;
                      cursor: pointer;
                      transition: all 0.2s ease;
                      backdrop-filter: blur(10px);
                    ">
              <i data-lucide="${filter.icon}" style="width: 16px; height: 16px;"></i>
              <span>${filter.label}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Render achievements grid
   * @returns {string} HTML string
   */
  renderAchievementsGrid() {
    let achievements = this.achievementManager.getAllAchievements();

    // Filter by category
    if (this.currentFilter !== 'all') {
      achievements = achievements.filter(a => a.category === this.currentFilter);
    }

    // Sort: unlocked first, then by rarity, then alphabetically
    achievements.sort((a, b) => {
      if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;

      const rarityOrder = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };
      const rarityDiff = rarityOrder[a.rarity] - rarityOrder[b.rarity];
      if (rarityDiff !== 0) return rarityDiff;

      return a.name.localeCompare(b.name);
    });

    if (achievements.length === 0) {
      return '';
    }

    return `
      <div style="
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 20px;
      ">
        ${achievements.map(achievement => {
          const badge = new AchievementBadge(achievement, {
            showProgress: true,
            showRarity: true,
            size: 'medium'
          });
          return badge.render();
        }).join('')}
      </div>
    `;
  }

  /**
   * Mount the page
   * @param {HTMLElement} container - Container element
   */
  mount(container) {
    this.container = container;

    // Initialize dependencies
    this.initializeDependencies();

    // Check if achievement manager is available
    if (!this.achievementManager) {
      this.container.innerHTML = `
        <div class="page-content">
          <div class="card section-card glass-card error-card">
            <h2>⚠️ Achievements Not Available</h2>
            <p>The achievement system could not be loaded.</p>
            <p class="text-sm text-neutral-400 mt-2">Please refresh the page or try again later.</p>
          </div>
        </div>
      `;
      return;
    }

    this.container.innerHTML = this.render();

    // Inject AchievementBadge styles
    AchievementBadge.injectStyles();

    // Initialize Lucide icons
    if (window.lucide) {
      window.lucide.createIcons();
    }

    // Attach event listeners
    this.attachEvents();

    // Listen for achievement updates
    this.setupAchievementListener();
  }

  /**
   * Unmount the page
   */
  unmount() {
    this.removeEvents();
    if (this.achievementListener) {
      this.achievementManager.removeEventListener(this.achievementListener);
    }
  }

  /**
   * Attach event listeners
   */
  attachEvents() {
    // Category filter buttons
    this.boundHandlers.filterClick = this.handleFilterClick.bind(this);
    const filterButtons = this.container.querySelectorAll('.category-filter-btn');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', this.boundHandlers.filterClick);
    });

    // Add hover effect to filter buttons
    filterButtons.forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        if (!btn.classList.contains('active')) {
          btn.style.background = 'rgba(255, 255, 255, 0.1)';
          btn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        }
      });
      btn.addEventListener('mouseleave', () => {
        if (!btn.classList.contains('active')) {
          btn.style.background = 'rgba(255, 255, 255, 0.05)';
          btn.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        }
      });
    });
  }

  /**
   * Remove event listeners
   */
  removeEvents() {
    const filterButtons = this.container?.querySelectorAll('.category-filter-btn');
    filterButtons?.forEach(btn => {
      btn.removeEventListener('click', this.boundHandlers.filterClick);
    });
  }

  /**
   * Handle category filter click
   * @param {Event} e - Click event
   */
  handleFilterClick(e) {
    const button = e.currentTarget;
    const filter = button.dataset.filter;

    if (filter === this.currentFilter) return;

    this.currentFilter = filter;
    this.refreshGrid();
  }

  /**
   * Refresh achievements grid
   */
  refreshGrid() {
    const gridContainer = this.container.querySelector('#achievements-grid');
    const emptyState = this.container.querySelector('#achievements-empty');

    if (!gridContainer || !emptyState) return;

    const gridHTML = this.renderAchievementsGrid();

    if (gridHTML) {
      gridContainer.innerHTML = gridHTML;
      gridContainer.style.display = 'block';
      emptyState.style.display = 'none';
    } else {
      gridContainer.style.display = 'none';
      emptyState.style.display = 'block';
    }

    // Re-initialize Lucide icons
    if (window.lucide) {
      window.lucide.createIcons();
    }

    // Update filter buttons
    const filterButtons = this.container.querySelectorAll('.category-filter-btn');
    filterButtons.forEach(btn => {
      const isActive = btn.dataset.filter === this.currentFilter;
      btn.classList.toggle('active', isActive);
      btn.style.background = isActive ? 'var(--accent)' : 'rgba(255, 255, 255, 0.05)';
      btn.style.borderColor = isActive ? 'var(--accent)' : 'rgba(255, 255, 255, 0.1)';
    });
  }

  /**
   * Setup achievement event listener
   */
  setupAchievementListener() {
    this.achievementListener = (event, achievement) => {
      if (event === 'unlock' || event === 'reset') {
        // Refresh the entire page to show updated stats and badges
        this.mount(this.container);
      }
    };

    this.achievementManager.addEventListener(this.achievementListener);
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

export default AchievementsPage;
