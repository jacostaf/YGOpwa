/**
 * Router.js
 *
 * Hash-based routing system for VoxRip
 * Features:
 * - Hash-based navigation (#/dashboard, #/pack-opening, etc.)
 * - Page registration and lifecycle management
 * - Browser back/forward button support
 * - Default route and 404 handling
 * - Event system for route changes
 * - Deep linking support
 * - Smooth page transitions with AnimationHelper
 */

import AnimationHelper from './AnimationHelper.js';

export default class Router {
  constructor(options = {}) {
    this.routes = new Map(); // Map of route -> page component
    this.currentRoute = null;
    this.currentPage = null;
    this.defaultRoute = options.defaultRoute || 'dashboard';
    this.notFoundRoute = options.notFoundRoute || this.defaultRoute;

    // DOM containers
    this.pageContainer = null;
    this.pageTitle = null;

    // Event listeners
    this.listeners = [];

    // Animation helper
    this.animationHelper = AnimationHelper;

    // Navigation metadata for page titles
    this.routeTitles = {
      'dashboard': 'Dashboard',
      'voice-recognition': 'Voice Recognition',
      'price-checker': 'Price Checker',
      'pack-opening': 'Pack Opening',
      'collection': 'Collection',
      'training': 'Voice Training',
      'achievements': 'Achievements',
      'leaderboards': 'Leaderboards',
      'settings': 'Settings',
      'theme': 'Theme Settings'
    };

    // Bind methods
    this.handleHashChange = this.handleHashChange.bind(this);
    this.handlePopState = this.handlePopState.bind(this);
  }

  /**
   * Initialize the router
   * @param {HTMLElement} container - Container element for page content
   * @param {HTMLElement} titleElement - Element for page title
   */
  initialize(container, titleElement = null) {
    if (!container) {
      throw new Error('Router requires a container element');
    }

    this.pageContainer = container;
    this.pageTitle = titleElement;

    // Listen for hash changes
    window.addEventListener('hashchange', this.handleHashChange, false);
    window.addEventListener('popstate', this.handlePopState, false);

    console.log('Router initialized');

    // Load initial route
    this.loadInitialRoute();
  }

  /**
   * Register a route with its page component
   * @param {string} route - Route name (e.g., 'dashboard', 'pack-opening')
   * @param {Object|Function} pageComponent - Page component class or factory
   * @param {string} title - Optional custom title for the page
   */
  register(route, pageComponent, title = null) {
    if (!route || !pageComponent) {
      throw new Error('Route and page component are required');
    }

    this.routes.set(route, pageComponent);

    if (title) {
      this.routeTitles[route] = title;
    }

    console.log(`Route registered: ${route}`);
  }

  /**
   * Navigate to a route
   * @param {string} route - Route name to navigate to
   * @param {boolean} replace - Replace history instead of push (default: false)
   */
  navigate(route, replace = false) {
    // Normalize route (remove leading slash if present)
    const normalizedRoute = route.replace(/^\//, '');

    // Check if route exists
    if (!this.routes.has(normalizedRoute)) {
      console.warn(`Route not found: ${normalizedRoute}, redirecting to ${this.notFoundRoute}`);
      route = this.notFoundRoute;
    }

    // Update URL hash
    const newHash = `#/${normalizedRoute}`;

    if (replace) {
      window.location.replace(newHash);
    } else {
      window.location.hash = newHash;
    }

    // The hashchange event will trigger the route loading
  }

  /**
   * Handle hash change events
   * @private
   */
  handleHashChange(event) {
    console.log('Hash changed:', window.location.hash);
    this.loadRoute();
  }

  /**
   * Handle popstate events (browser back/forward)
   * @private
   */
  handlePopState(event) {
    console.log('Popstate event:', window.location.hash);
    this.loadRoute();
  }

  /**
   * Load the initial route on page load
   * @private
   */
  loadInitialRoute() {
    const hash = window.location.hash;

    if (!hash || hash === '#' || hash === '#/') {
      // No hash, redirect to default
      this.navigate(this.defaultRoute, true);
    } else {
      // Load the current hash
      this.loadRoute();
    }
  }

  /**
   * Load the current route based on URL hash
   * @private
   */
  async loadRoute() {
    // Get route from hash
    let route = this.getRouteFromHash();

    // Check if route exists
    if (!this.routes.has(route)) {
      console.warn(`Route not found: ${route}, loading ${this.notFoundRoute}`);
      route = this.notFoundRoute;

      // Update URL to 404 route without triggering another navigation
      window.location.replace(`#/${route}`);
    }

    // Don't reload if already on this route
    if (route === this.currentRoute) {
      console.log(`Already on route: ${route}`);
      return;
    }

    console.log(`Loading route: ${route}`);

    // Update page title IMMEDIATELY (no latency)
    this.updatePageTitle(route);

    // Store old page element for smooth transition
    const oldPageElement = this.pageContainer.firstElementChild;

    // Fade out old page quickly if it exists
    if (oldPageElement) {
      oldPageElement.style.transition = 'opacity 200ms ease-out';
      oldPageElement.style.opacity = '0';
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Unmount current page if exists
    if (this.currentPage && typeof this.currentPage.unmount === 'function') {
      try {
        await this.currentPage.unmount();
      } catch (error) {
        console.error('Error unmounting page:', error);
      }
    }

    // Clear container
    this.pageContainer.innerHTML = '';

    // Get page component
    const PageComponent = this.routes.get(route);

    try {
      // Create page instance
      const pageInstance = typeof PageComponent === 'function'
        ? new PageComponent(this)
        : PageComponent;

      // Mount the new page (stays in correct layout position)
      if (typeof pageInstance.mount === 'function') {
        await pageInstance.mount(this.pageContainer);
      } else if (typeof pageInstance.render === 'function') {
        // Fallback: if no mount method, use render
        const content = pageInstance.render();

        if (typeof content === 'string') {
          this.pageContainer.innerHTML = content;
        } else if (content instanceof HTMLElement) {
          this.pageContainer.appendChild(content);
        }

        // Call attachEvents if available
        if (typeof pageInstance.attachEvents === 'function') {
          pageInstance.attachEvents();
        }
      } else {
        throw new Error('Page component must have a mount() or render() method');
      }

      // Fade in new page smoothly
      const newPageElement = this.pageContainer.firstElementChild;
      if (newPageElement) {
        newPageElement.style.opacity = '0';
        newPageElement.style.transition = 'opacity 250ms ease-in';

        await new Promise(resolve => requestAnimationFrame(() => {
          newPageElement.style.opacity = '1';
          setTimeout(resolve, 250);
        }));

        // Clean up inline styles
        newPageElement.style.transition = '';
      }

      // Update state
      const previousRoute = this.currentRoute;
      this.currentRoute = route;
      this.currentPage = pageInstance;

      // Notify listeners
      this.notifyListeners('route:change', {
        route,
        previousRoute,
        page: pageInstance
      });

      console.log(`Route loaded: ${route}`);

    } catch (error) {
      console.error('Error loading route:', error);
      this.showError('Failed to load page', error);
    }
  }

  /**
   * Get route name from current hash
   * @private
   * @returns {string} Route name
   */
  getRouteFromHash() {
    const hash = window.location.hash;

    // Remove # and leading slash
    return hash.replace(/^#\/?/, '') || this.defaultRoute;
  }

  /**
   * Update the page title element
   * @private
   */
  updatePageTitle(route) {
    const title = this.routeTitles[route] || route.charAt(0).toUpperCase() + route.slice(1);

    if (this.pageTitle) {
      this.pageTitle.textContent = title;
    }

    // Also update document title
    document.title = `${title} - VoxRip`;
  }

  /**
   * Show error message in page container
   * @private
   */
  showError(message, error) {
    if (this.pageContainer) {
      this.pageContainer.innerHTML = `
        <div class="page-content">
          <div class="card section-card glass-card error-card">
            <h2>⚠️ ${message}</h2>
            <p>${error ? error.message : 'Unknown error'}</p>
            <button class="btn btn-primary" onclick="window.location.hash = '#/${this.defaultRoute}'">
              Go to Dashboard
            </button>
          </div>
        </div>
      `;
    }
  }

  /**
   * Get the current route name
   * @returns {string} Current route
   */
  getCurrentRoute() {
    return this.currentRoute;
  }

  /**
   * Get the current page instance
   * @returns {Object} Current page
   */
  getCurrentPage() {
    return this.currentPage;
  }

  /**
   * Check if a route exists
   * @param {string} route - Route name to check
   * @returns {boolean}
   */
  hasRoute(route) {
    return this.routes.has(route);
  }

  /**
   * Get all registered routes
   * @returns {string[]} Array of route names
   */
  getRoutes() {
    return Array.from(this.routes.keys());
  }

  /**
   * Add event listener for router events
   * @param {string} event - Event name (e.g., 'route:change')
   * @param {function} callback - Callback function
   */
  addEventListener(event, callback) {
    if (typeof callback === 'function') {
      this.listeners.push({ event, callback });
    }
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {function} callback - Callback function to remove
   */
  removeEventListener(event, callback) {
    this.listeners = this.listeners.filter(
      listener => !(listener.event === event && listener.callback === callback)
    );
  }

  /**
   * Notify listeners of an event
   * @private
   */
  notifyListeners(event, data = {}) {
    this.listeners
      .filter(listener => listener.event === event)
      .forEach(listener => {
        try {
          listener.callback(data);
        } catch (error) {
          console.error('Error in router event listener:', error);
        }
      });
  }

  /**
   * Reload the current route
   */
  reload() {
    const currentRoute = this.currentRoute;
    this.currentRoute = null; // Force reload
    this.navigate(currentRoute, true);
  }

  /**
   * Go back in history
   */
  back() {
    window.history.back();
  }

  /**
   * Go forward in history
   */
  forward() {
    window.history.forward();
  }

  /**
   * Destroy the router and clean up
   */
  destroy() {
    // Remove event listeners
    window.removeEventListener('hashchange', this.handleHashChange);
    window.removeEventListener('popstate', this.handlePopState);

    // Unmount current page
    if (this.currentPage && typeof this.currentPage.unmount === 'function') {
      this.currentPage.unmount();
    }

    // Clear state
    this.routes.clear();
    this.listeners = [];
    this.currentRoute = null;
    this.currentPage = null;

    console.log('Router destroyed');
  }
}
