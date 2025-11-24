/**
 * UserProfile.js
 *
 * User profile component for displaying authenticated user info
 * Features:
 * - User avatar and display name
 * - Dropdown menu for account actions
 * - Sign out functionality
 * - Profile settings link
 * - Feature flag support
 */

import { features } from '../lib/config.js';
import * as authService from '../services/authService.js';

export default class UserProfile {
  /**
   * Create a UserProfile instance
   * @param {Object} options - Configuration options
   * @param {Object} options.user - User object from Supabase
   * @param {Function} options.onSignOut - Callback on sign out
   * @param {Function} options.onProfileClick - Callback on profile click
   */
  constructor(options = {}) {
    this.user = options.user || null;
    this.onSignOut = options.onSignOut || (() => {});
    this.onProfileClick = options.onProfileClick || (() => {});
    this.element = null;
    this.dropdownOpen = false;
    this.outsideClickHandler = null;
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string}
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Get user display name
   * @returns {string}
   */
  getDisplayName() {
    if (!this.user) return 'Guest';
    return this.user.user_metadata?.display_name || this.user.email?.split('@')[0] || 'User';
  }

  /**
   * Get user avatar initials
   * @returns {string}
   */
  getAvatarInitials() {
    const name = this.getDisplayName();
    return name.charAt(0).toUpperCase();
  }

  /**
   * Set dropdown open state
   * @param {boolean} open
   */
  setDropdownState(open) {
    this.dropdownOpen = open;

    if (!this.element) {
      return;
    }

    this.element.classList.toggle('is-open', open);

    const dropdown = this.element.querySelector('[data-profile-dropdown]');
    if (dropdown) {
      dropdown.classList.toggle('is-visible', open);
    }

    const trigger = this.element.querySelector('[data-profile-button]');
    if (trigger) {
      trigger.setAttribute('aria-expanded', String(open));
    }
  }

  /**
   * Toggle dropdown state
   * @param {boolean} [forceState]
   */
  toggleDropdown(forceState) {
    const nextState = typeof forceState === 'boolean' ? forceState : !this.dropdownOpen;
    this.setDropdownState(nextState);
  }

  /**
   * Handle sign out
   */
  async handleSignOut() {
    try {
      this.toggleDropdown(false);
      await authService.signOut();
      this.onSignOut();
    } catch (error) {
      console.error('Sign out failed:', error);
      alert('Failed to sign out: ' + error.message);
    }
  }

  /**
   * Render the user profile component
   * @returns {string} HTML string
   */
  getHtml() {
    if (!this.user || !features.authEnabled) {
      return '';
    }

    const displayName = this.escapeHtml(this.getDisplayName());
    const email = this.escapeHtml(this.user.email || '');
    const initials = this.escapeHtml(this.getAvatarInitials());

    return `
      <div class="auth-profile ${this.dropdownOpen ? 'is-open' : ''}" data-profile-root>
        <button
          type="button"
          data-profile-button
          class="auth-profile-trigger"
          aria-label="Open user menu"
          aria-haspopup="true"
          aria-expanded="${this.dropdownOpen}"
        >
          <span class="auth-profile-avatar">${initials}</span>
          <span class="auth-profile-meta">
            <span class="auth-profile-name">${displayName}</span>
            <span class="auth-profile-email">${email}</span>
          </span>
          <svg class="auth-profile-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>

        <div
          class="auth-profile-dropdown ${this.dropdownOpen ? 'is-visible' : ''}"
          data-profile-dropdown
          role="menu"
        >
          <div class="auth-profile-user">
            <span class="auth-profile-name">${displayName}</span>
            <span class="auth-profile-email">${email}</span>
          </div>

          <div class="auth-profile-section">
            <span class="auth-profile-section-title">Account</span>
            <button type="button" class="auth-profile-item" data-profile-action="settings" role="menuitem">
              <svg class="auth-profile-item-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
              <span>Profile &amp; Settings</span>
            </button>
          </div>

          <div class="auth-profile-section">
            <span class="auth-profile-section-title">Quick links</span>
            <button type="button" class="auth-profile-item" data-profile-action="collection" role="menuitem">
              <svg class="auth-profile-item-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
              </svg>
              <span>My Collection</span>
            </button>
            <button type="button" class="auth-profile-item" data-profile-action="packs" role="menuitem">
              <svg class="auth-profile-item-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
              </svg>
              <span>Pack History</span>
            </button>
          </div>

          <div class="auth-profile-divider" role="separator"></div>

          <div class="auth-profile-section">
            <button type="button" class="auth-profile-signout" data-profile-signout role="menuitem">
              <svg class="auth-profile-item-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
              </svg>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render and mount the component
   * @param {HTMLElement} container - Container element
   * @returns {HTMLElement}
   */
  render(container) {
    if (!container) {
      console.error('UserProfile: Container element is required');
      return null;
    }

    const wrapper = document.createElement('div');
    wrapper.innerHTML = this.getHtml();
    this.element = wrapper.firstElementChild;

    if (!this.element) {
      container.innerHTML = '';
      return null;
    }

    container.innerHTML = '';
    container.appendChild(this.element);

    this.attachEventListeners();
    this.setDropdownState(this.dropdownOpen);

    if (window && window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }

    return this.element;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    if (!this.element) return;

    const profileBtn = this.element.querySelector('[data-profile-button]');
    if (profileBtn) {
      profileBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        this.toggleDropdown();
      });
    }

    const actionButtons = this.element.querySelectorAll('[data-profile-action]');
    actionButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.getAttribute('data-profile-action');
        this.toggleDropdown(false);
        this.onProfileClick(action);
      });
    });

    const signOutBtn = this.element.querySelector('[data-profile-signout]');
    if (signOutBtn) {
      signOutBtn.addEventListener('click', () => this.handleSignOut());
    }

    if (this.outsideClickHandler) {
      document.removeEventListener('click', this.outsideClickHandler);
    }

    this.outsideClickHandler = (event) => {
      if (this.element && !this.element.contains(event.target)) {
        this.toggleDropdown(false);
      }
    };

    document.addEventListener('click', this.outsideClickHandler);
  }

  /**
   * Update user data
   * @param {Object} user - New user object
   */
  updateUser(user) {
    this.user = user;
    if (this.element && this.element.parentElement) {
      this.render(this.element.parentElement);
    }
  }

  /**
   * Destroy the component
   */
  destroy() {
    if (this.outsideClickHandler) {
      document.removeEventListener('click', this.outsideClickHandler);
      this.outsideClickHandler = null;
    }

    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }
}
