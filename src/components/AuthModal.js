/**
 * AuthModal.js
 *
 * Authentication modal component with sign in/sign up forms
 * Features:
 * - Email/password authentication
 * - Magic link (passwordless) option
 * - OAuth provider buttons (configurable)
 * - Form validation
 * - Error handling
 * - Glassmorphism styling
 * - Feature flag support
 */

import { features } from '../lib/config.js';
import * as authService from '../services/authService.js';

export default class AuthModal {
  /**
   * Create an AuthModal instance
   * @param {Object} options - Configuration options
   * @param {Function} options.onSuccess - Callback on successful auth
   * @param {Function} options.onClose - Callback on modal close
   * @param {string} options.mode - Initial mode: 'signin' or 'signup'
   */
  constructor(options = {}) {
    this.onSuccess = options.onSuccess || (() => { });
    this.onClose = options.onClose || (() => { });
    this.mode = options.mode || 'signin'; // 'signin' or 'signup'
    this.element = null;
    this.loading = false;
    this.error = null;
  }

  /**
   * Check if auth is enabled via feature flag
   * @returns {boolean}
   */
  isAuthEnabled() {
    return features.authEnabled;
  }

  /**
   * Set loading state
   * @param {boolean} loading
   */
  setLoading(loading) {
    this.loading = loading;
    if (!this.element) {
      return;
    }

    const submitBtn = this.element.querySelector('[data-auth-submit]');
    if (submitBtn) {
      const actionLabel = this.mode === 'signin' ? 'Sign In' : 'Create Account';
      submitBtn.disabled = loading;
      submitBtn.setAttribute('aria-busy', loading ? 'true' : 'false');
      submitBtn.textContent = loading ? 'Please wait...' : actionLabel;
    }

    const magicLinkBtn = this.element.querySelector('[data-auth-magic-link]');
    if (magicLinkBtn) {
      magicLinkBtn.disabled = loading;
    }
  }

  /**
   * Set error message
   * @param {string|null} error
   */
  setError(error) {
    this.error = error;
    if (!this.element) {
      return;
    }

    const errorEl = this.element.querySelector('[data-auth-error]');
    if (errorEl) {
      errorEl.textContent = error || '';
      errorEl.classList.toggle('is-visible', Boolean(error));
    }
  }

  /**
   * Update the active auth mode
   * @param {'signin'|'signup'} mode
   */
  setMode(mode) {
    if (mode !== 'signin' && mode !== 'signup') {
      return;
    }

    if (this.mode === mode) {
      return;
    }

    this.mode = mode;
    this.error = null;
    this.render();
  }

  /**
   * Toggle between signin and signup modes
   */
  toggleMode() {
    this.setMode(this.mode === 'signin' ? 'signup' : 'signin');
  }

  /**
   * Handle email/password form submission
   * @param {Event} event
   */
  async handleSubmit(event) {
    event.preventDefault();

    if (!this.isAuthEnabled()) {
      this.setError('Authentication is not enabled. Please configure Supabase.');
      return;
    }

    const formData = new FormData(event.target);
    const email = formData.get('email');
    const password = formData.get('password');

    if (!email || !password) {
      this.setError('Email and password are required');
      return;
    }

    this.setLoading(true);
    this.setError(null);

    try {
      let result;
      if (this.mode === 'signin') {
        result = await authService.signIn(email, password);
      } else {
        const displayName = formData.get('displayName');
        result = await authService.signUp(email, password, {
          display_name: displayName || email.split('@')[0],
        });
      }

      if (result.error) {
        this.setError(result.error.message);
      } else {
        this.onSuccess(result);
        this.close();
      }
    } catch (error) {
      this.setError(error.message || 'Authentication failed');
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Handle magic link request
   */
  async handleMagicLink() {
    if (!this.isAuthEnabled()) {
      this.setError('Authentication is not enabled. Please configure Supabase.');
      return;
    }

    const emailInput = this.element.querySelector('[name="email"]');
    const email = emailInput?.value;

    if (!email) {
      this.setError('Email is required for magic link');
      return;
    }

    this.setLoading(true);
    this.setError(null);

    try {
      const { error } = await authService.signInWithMagicLink(email);

      if (error) {
        this.setError(error.message);
      } else {
        this.setError(null);
        alert('Check your email for the magic link!');
      }
    } catch (error) {
      this.setError(error.message || 'Failed to send magic link');
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Close the modal
   */
  close() {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
    this.onClose();
  }

  /**
   * Render the auth modal HTML
   * @returns {string} HTML string
   */
  getHtml() {
    if (!this.isAuthEnabled()) {
      return `
        <div class="auth-modal-overlay" data-auth-overlay>
          <div class="auth-modal-card card auth-modal-card--compact" role="dialog" aria-modal="true">
            <button
              type="button"
              class="auth-modal-close"
              data-auth-close
              aria-label="Close authentication modal"
            >
              <i data-lucide="x"></i>
            </button>

            <header class="auth-modal-header">
              <div class="auth-modal-heading">
                <span class="auth-modal-kicker">Setup required</span>
                <h2 class="auth-modal-title">Authentication disabled</h2>
              </div>
            </header>

            <p class="auth-modal-description">Authentication is not configured for this environment.</p>
            <ul class="auth-modal-reminders">
              <li>Copy <code>.env.local.example</code> to <code>.env.local</code></li>
              <li>Copy <code>runtime-env.example.js</code> to <code>runtime-env.js</code></li>
              <li>Provide <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code></li>
            </ul>

            <button type="button" class="btn btn-secondary auth-modal-close-button" data-auth-close>Back to app</button>
          </div>
        </div>
      `;
    }

    const isSignIn = this.mode === 'signin';
    const title = isSignIn ? 'Sign In' : 'Create Account';
    const kicker = isSignIn ? 'Welcome back' : 'Join VoxRip';
    const description = isSignIn
      ? 'Access your synced collections, pack history, and personalized stats.'
      : 'Create an account to sync your collection, track packs, and compete on leaderboards.';
    const toggleText = isSignIn ? 'Need an account?' : 'Already have an account?';
    const toggleAction = isSignIn ? 'Sign up' : 'Sign in';
    const passwordAutocomplete = isSignIn ? 'current-password' : 'new-password';

    return `
      <div class="auth-modal-overlay" data-auth-overlay>
        <div
          class="auth-modal-card card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
          data-auth-card
          data-auth-mode="${this.mode}"
        >
          <button
            type="button"
            class="auth-modal-close"
            data-auth-close
            aria-label="Close authentication modal"
          >
            <i data-lucide="x"></i>
          </button>

          <header class="auth-modal-header">
            <div class="auth-modal-heading">
              <span class="auth-modal-kicker">${kicker}</span>
              <h2 class="auth-modal-title" id="auth-modal-title">${title}</h2>
            </div>
          </header>

          <div class="auth-modal-tabs" role="tablist">
            <button
              type="button"
              class="auth-modal-tab ${isSignIn ? 'is-active' : ''}"
              data-auth-tab="signin"
              role="tab"
              aria-selected="${isSignIn}"
            >
              Sign In
            </button>
            <button
              type="button"
              class="auth-modal-tab ${!isSignIn ? 'is-active' : ''}"
              data-auth-tab="signup"
              role="tab"
              aria-selected="${!isSignIn}"
            >
              Create Account
            </button>
          </div>

          <p class="auth-modal-description">${description}</p>
          <div class="auth-modal-error" data-auth-error role="alert"></div>

          <form data-auth-form class="auth-modal-form">
            ${!isSignIn ? `
              <div class="form-group">
                <label for="auth-displayName">Display name</label>
                <div class="input-with-icon">
                  <i data-lucide="user"></i>
                  <input
                    type="text"
                    id="auth-displayName"
                    name="displayName"
                    placeholder="How should we call you?"
                    autocomplete="name"
                    data-auth-display-name
                  />
                </div>
              </div>
            ` : ''}

            <div class="form-group">
              <label for="auth-email">Email</label>
              <div class="input-with-icon">
                <i data-lucide="mail"></i>
                <input
                  type="email"
                  id="auth-email"
                  name="email"
                  required
                  placeholder="your@email.com"
                  autocomplete="email"
                />
              </div>
            </div>

            <div class="form-group">
              <label for="auth-password">Password</label>
              <div class="input-with-icon">
                <i data-lucide="lock"></i>
                <input
                  type="password"
                  id="auth-password"
                  name="password"
                  required
                  minlength="6"
                  placeholder="Enter your password"
                  autocomplete="${passwordAutocomplete}"
                />
              </div>
              <small>Minimum 6 characters</small>
            </div>

            <button
              type="submit"
              class="btn btn-primary auth-modal-submit"
              data-auth-submit
            >
              ${isSignIn ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div class="auth-modal-divider"><span>or continue with</span></div>

          <div class="auth-modal-social">
            <button type="button" class="btn btn-secondary social-btn" data-provider="google">
              <i data-lucide="chrome"></i>
              <span>Google</span>
            </button>
            <button type="button" class="btn btn-secondary social-btn" data-provider="discord">
              <i data-lucide="message-square"></i>
              <span>Discord</span>
            </button>
          </div>

          <p class="auth-modal-toggle">
            ${toggleText}
            <button type="button" class="auth-modal-switch" data-auth-toggle>${toggleAction}</button>
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Render and mount the modal
   * @returns {HTMLElement}
   */
  render() {
    // Remove existing element if present
    if (this.element) {
      this.element.remove();
    }

    // Create new element
    const container = document.createElement('div');
    container.innerHTML = this.getHtml();
    this.element = container.firstElementChild;

    // Attach event listeners
    this.attachEventListeners();

    // Mount to body
    document.body.appendChild(this.element);

    if (window && window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }

    // Focus email input
    setTimeout(() => {
      const emailInput = this.element.querySelector('[name="email"]');
      if (emailInput) emailInput.focus();
    }, 100);

    return this.element;
  }

  /**
   * Attach event listeners to modal elements
   */
  attachEventListeners() {
    if (!this.element) return;

    // Close button
    const closeBtn = this.element.querySelector('[data-auth-close]');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // Close on overlay click
    if (this.element.hasAttribute('data-auth-overlay')) {
      this.element.addEventListener('click', (e) => {
        if (e.target === this.element) this.close();
      });
    }

    // Form submission
    const form = this.element.querySelector('[data-auth-form]');
    if (form) {
      form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    // Toggle mode
    const toggleBtn = this.element.querySelector('[data-auth-toggle]');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggleMode());
    }

    // Tabbed mode switcher
    const tabButtons = this.element.querySelectorAll('[data-auth-tab]');
    tabButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const mode = button.getAttribute('data-auth-tab');
        this.setMode(mode);
      });
    });

    // Magic link
    const magicLinkBtn = this.element.querySelector('[data-auth-magic-link]');
    if (magicLinkBtn) {
      magicLinkBtn.addEventListener('click', () => this.handleMagicLink());
    }

    // Social providers
    const socialButtons = this.element.querySelectorAll('.social-btn');
    socialButtons.forEach(btn => {
      btn.addEventListener('click', async () => {
        const provider = btn.getAttribute('data-provider');
        try {
          this.setLoading(true);
          await authService.signInWithOAuth(provider);
        } catch (error) {
          this.setError(error.message);
          this.setLoading(false);
        }
      });
    });

    // ESC key to close
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        this.close();
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);
  }

  /**
   * Show the modal
   */
  show() {
    return this.render();
  }
}
