/**
 * Sidebar.js
 *
 * Main navigation sidebar component for VoxRip
 * Features:
 * - 9 navigation items with Lucide icons
 * - Active state highlighting
 * - Mobile drawer functionality
 * - VoxRip branding header
 * - Version info footer
 */

import IconLoader from '../utils/IconLoader.js';

export default class Sidebar {
  constructor(options = {}) {
    this.options = options;
    this.container = options.container || document.querySelector('.sidebar');
    this.activeItem = options.defaultActive || 'dashboard';
    this.isMobile = window.innerWidth < 768;
    this.isOpen = !this.isMobile; // Open on desktop, closed on mobile by default

    // Navigation items configuration
    this.navItems = [
      { id: 'dashboard', label: 'Dashboard', icon: 'home' },
      { id: 'leaderboards', label: 'Leaderboards', icon: 'trophy' },
      { id: 'pack-opening', label: 'Pack Opening', icon: 'package' },
      { id: 'price-checker', label: 'Price Checker', icon: 'dollar-sign' },
      { id: 'collection', label: 'Collection', icon: 'folder-open' },
      { id: 'training', label: 'Voice Training', icon: 'headphones' },
      { id: 'achievements', label: 'Achievements', icon: 'award' },
      { id: 'settings', label: 'Settings', icon: 'settings' },
      { id: 'theme', label: 'Theme Settings', icon: 'palette' }
    ];

    // Callbacks
    this.onNavigate = options.onNavigate || ((id) => console.log('Navigate to:', id));

    this.init();
  }

  init() {
    if (!this.container) {
      console.error('Sidebar container not found');
      return;
    }

    this.render();
    this.attachEvents();
    this.updateMobileState();
  }

  render() {
    this.container.innerHTML = `
      ${this.renderHeader()}
      ${this.renderNavigation()}
      ${this.renderFooter()}
    `;

    // Initialize Lucide icons after rendering
    setTimeout(() => {
      IconLoader.refreshIcons();
      // Dispatch render event so other components (like auth) can re-initialize
      this.dispatchEvent('sidebar:render');
    }, 0);
  }

  renderHeader() {
    if (this.context === 'collection') {
      return `
        <div class="sidebar-header collection-header">
            <div class="sidebar-logo">
                <i data-lucide="sparkles" class="sidebar-logo-icon"></i>
                <span class="logo-text">VoxRip</span>
            </div>
        </div>
      `;
    }

    return `
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <i data-lucide="sparkles" class="sidebar-logo-icon"></i>
          <div class="sidebar-branding">
            <span class="sidebar-logo-text">VoxRip</span>
            <span class="sidebar-subtitle">Voice-Powered Collection Toolkit</span>
          </div>
        </div>
        <button class="sidebar-close" aria-label="Close sidebar">
          <i data-lucide="x"></i>
        </button>
      </div>
    `;
  }

  renderNavigation() {
    if (this.context === 'collection') {
      return this.renderCollectionNavigation();
    }

    const navItemsHtml = this.navItems.map(item => `
      <button
        class="sidebar-nav-item ${item.id === this.activeItem ? 'active' : ''}"
        data-nav-id="${item.id}"
        role="menuitem"
        aria-label="Navigate to ${item.label}"
        aria-current="${item.id === this.activeItem ? 'page' : 'false'}"
      >
        <i data-lucide="${item.icon}" class="sidebar-nav-icon" aria-hidden="true"></i>
        <span class="sidebar-nav-label">${item.label}</span>
        ${item.id === this.activeItem ? '<span class="sidebar-nav-indicator" aria-hidden="true"></span>' : ''}
      </button>
    `).join('');

    return `
      <nav class="sidebar-nav" role="menu" aria-label="Main navigation">
        ${navItemsHtml}
      </nav>
    `;
  }

  renderCollectionNavigation() {
    const collections = this.contextData?.collections || [];
    const activeCollection = this.contextData?.activeCollection || 'all';

    const collectionsHtml = collections.map(col => `
      <div class="nav-item ${activeCollection === col.id ? 'active' : ''}" 
           data-collection-id="${col.id}">
          <i data-lucide="folder"></i>
          <span class="label">${col.name}</span>
          <span class="count">${col.count || 0}</span>
      </div>
    `).join('');

    return `
      <nav class="sidebar-nav" role="menu" aria-label="Collection navigation">
        <div class="nav-group">
            <button class="btn-secondary back-btn" id="backToDashboardBtn">
                <i data-lucide="arrow-left"></i>
                Back to Dashboard
            </button>

            <div class="nav-label">Library</div>
            <div class="nav-item ${activeCollection === 'all' ? 'active' : ''}" 
                 data-collection-id="all">
                <i data-lucide="layers"></i>
                <span>All Cards</span>
                <span class="count">${this.contextData?.totalCards || 0}</span>
            </div>
            <div class="nav-item ${activeCollection === 'favorites' ? 'active' : ''}" 
                 data-collection-id="favorites">
                <i data-lucide="heart"></i>
                <span>Favorites</span>
                <span class="count">${this.contextData?.favoritesCount || 0}</span>
            </div>
        </div>

        <div class="nav-group">
            <div class="nav-label">Collections</div>
            ${collectionsHtml}
        </div>

        <div class="sidebar-actions">
            <button class="btn-secondary new-collection-btn" id="sidebarCreateCollectionBtn">
                <i data-lucide="plus-circle"></i>
                New Collection
            </button>
        </div>
      </nav>
    `;
  }

  setContext(context, data = {}) {
    this.context = context;
    this.contextData = data;

    // Toggle context class
    if (this.context === 'collection') {
      this.container.classList.add('collection-context');
    } else {
      this.container.classList.remove('collection-context');
    }

    this.render();
    this.attachEvents(); // Re-attach events for new elements
  }

  renderFooter() {
    return `
      <div class="sidebar-footer">
        <!-- Auth UI Container -->
        <div id="auth-container"></div>
        
        <div class="sidebar-version">
          <i data-lucide="code" class="sidebar-version-icon"></i>
          <span class="sidebar-version-text">v2.0.0</span>
        </div>
        <div class="sidebar-credits">
          VoxRip PWA
        </div>
      </div>
    `;
  }

  attachEvents() {
    // Navigation item clicks (Standard)
    this.container.querySelectorAll('.sidebar-nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const navId = e.currentTarget.getAttribute('data-nav-id');
        this.setActive(navId);
        this.onNavigate(navId);

        // Close sidebar on mobile after navigation
        if (this.isMobile) {
          this.close();
        }
      });
    });

    // Collection Navigation Clicks (Context)
    if (this.context === 'collection') {
      this.container.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
          const collectionId = e.currentTarget.getAttribute('data-collection-id');

          // Update active state visually
          this.container.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
          e.currentTarget.classList.add('active');

          // Dispatch event for CollectionPage to handle
          this.dispatchEvent('collection:select', { collectionId });

          if (this.isMobile) this.close();
        });
      });

      const backBtn = this.container.querySelector('#backToDashboardBtn');
      if (backBtn) {
        backBtn.addEventListener('click', () => {
          this.setContext('default'); // Reset context
          this.onNavigate('dashboard'); // Navigate back
          if (this.isMobile) this.close();
        });
      }

      const createBtn = this.container.querySelector('#sidebarCreateCollectionBtn');
      if (createBtn) {
        createBtn.addEventListener('click', () => {
          this.dispatchEvent('collection:create');
        });
      }
    }

    // Close button (mobile)
    const closeBtn = this.container.querySelector('.sidebar-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.close();
      });
    }

    // Handle window resize
    window.addEventListener('resize', () => {
      this.handleResize();
    });
  }

  setActive(navId) {
    // Skip if already active - prevents unnecessary DOM updates and potential loops
    if (this.activeItem === navId) {
      return;
    }

    // Remove active class from all items
    this.container.querySelectorAll('.sidebar-nav-item').forEach(item => {
      item.classList.remove('active');
      item.setAttribute('aria-current', 'false');

      // Remove indicator immediately (no setTimeout to avoid race condition)
      const indicator = item.querySelector('.sidebar-nav-indicator');
      if (indicator) {
        indicator.remove();
      }
    });

    // Add active class to selected item
    const activeItem = this.container.querySelector(`[data-nav-id="${navId}"]`);
    if (activeItem) {
      activeItem.classList.add('active');
      activeItem.setAttribute('aria-current', 'page');

      // Add indicator with fade in animation
      const indicator = document.createElement('span');
      indicator.className = 'sidebar-nav-indicator';
      indicator.style.opacity = '0';
      activeItem.appendChild(indicator);

      // Trigger animation
      requestAnimationFrame(() => {
        indicator.style.transition = 'opacity 200ms ease-out';
        indicator.style.opacity = '1';
      });
    }

    this.activeItem = navId;
  }

  open() {
    this.isOpen = true;
    this.container.classList.add('open');
    document.body.classList.add('sidebar-open');

    // Dispatch event
    this.dispatchEvent('sidebar:open');
  }

  close() {
    this.isOpen = false;
    this.container.classList.remove('open');
    document.body.classList.remove('sidebar-open');

    // Dispatch event
    this.dispatchEvent('sidebar:close');
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  handleResize() {
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth < 768;

    // If switching from mobile to desktop
    if (wasMobile && !this.isMobile) {
      this.open();
    }

    // If switching from desktop to mobile
    if (!wasMobile && this.isMobile) {
      this.close();
    }

    this.updateMobileState();
  }

  updateMobileState() {
    if (this.isMobile) {
      this.container.classList.add('mobile');
      if (!this.isOpen) {
        this.container.classList.remove('open');
      }
    } else {
      this.container.classList.remove('mobile');
      this.container.classList.add('open');
    }
  }

  dispatchEvent(eventName, detail = {}) {
    const event = new CustomEvent(eventName, {
      detail: { ...detail, sidebar: this },
      bubbles: true
    });
    this.container.dispatchEvent(event);
  }

  getActiveItem() {
    return this.activeItem;
  }

  destroy() {
    // Remove event listeners
    this.container.querySelectorAll('.sidebar-nav-item').forEach(item => {
      item.replaceWith(item.cloneNode(true));
    });

    window.removeEventListener('resize', this.handleResize);

    this.container.innerHTML = '';
  }
}
