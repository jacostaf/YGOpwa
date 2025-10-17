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
    }, 0);
  }

  renderHeader() {
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

  renderFooter() {
    return `
      <div class="sidebar-footer">
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
    // Navigation item clicks
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
