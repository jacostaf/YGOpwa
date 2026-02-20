/**
 * Authentication Initialization Module
 * Initializes and manages auth UI in the application
 */

import { features, isSupabaseConfigured } from '../lib/config.js';
import { getCurrentUser, onAuthStateChange, signOut } from '../services/authService.js';
import AuthModal from '../components/AuthModal.js';
import { refreshIcons } from '../utils/IconLoader.js';

/**
 * Initialize authentication UI
 */
export async function initAuth() {
  // Check if auth is enabled
  if (!features.authEnabled) {
    console.log('Authentication is disabled via feature flag');
    return;
  }

  // Check if Supabase is configured
  if (!isSupabaseConfigured()) {
    console.warn('Supabase is not configured. Auth UI will not be displayed.');
    console.info('To enable auth, provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY via runtime-env.js or environment variables. See docs/implementation/phase1_setup_complete.md.');
    return;
  }

  const authContainer = document.getElementById('auth-container');
  if (!authContainer) {
    console.warn('Auth container not found, retrying in 500ms...');
    setTimeout(initAuth, 500);
    return;
  }

  console.log('Initializing auth UI...');

  // Check current auth state
  try {
    // Add a timeout to ensure the UI eventually renders even if auth is stuck
    const authPromise = getCurrentUser();
    const timeoutPromise = new Promise((resolve) =>
      setTimeout(() => resolve({ user: null, error: 'Auth check timeout' }), 5000) // Increased to 5s
    );

    const { user } = await Promise.race([authPromise, timeoutPromise]);

    if (user) {
      // User is authenticated - show profile
      console.log('User is authenticated:', user.email);
      renderUserProfile(user, authContainer);
    } else {
      // User is not authenticated - show sign in button
      console.log('User is not authenticated - showing sign in button');
      renderSignInButton(authContainer);
    }
  } catch (error) {
    console.error('Error checking auth state:', error);
    renderSignInButton(authContainer);
  }

  // Listen for auth state changes
  onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event, session?.user?.email || 'no user');

    if (session?.user) {
      renderUserProfile(session.user, authContainer);
    } else {
      renderSignInButton(authContainer);
    }
  });

  // Check for OAuth errors in URL query parameters
  checkUrlForErrors();
}

/**
 * Check URL for authentication errors (e.g., from OAuth redirect)
 */
function checkUrlForErrors() {
  const params = new URLSearchParams(window.location.search);
  const error = params.get('error');
  const errorDescription = params.get('error_description');

  if (error) {
    console.error('Auth error detected in URL:', error, errorDescription);

    // Show the auth modal with the error
    const authModal = new AuthModal({
      mode: 'signin',
      onClose: () => {
        // Clear query params after closing to avoid showing error again on refresh
        const url = new URL(window.location);
        url.search = '';
        window.history.replaceState({}, document.title, url.toString());
      }
    });

    authModal.show();

    // Set the error message in the modal (using a small delay to ensure it's rendered)
    setTimeout(() => {
      authModal.setError(errorDescription || error);
    }, 100);
  }
}

/**
 * Render sign in button
 */
function renderSignInButton(container) {
  container.innerHTML = `
    <button
      id="sign-in-btn"
      class="btn btn-primary auth-trigger-btn"
      aria-label="Sign in to VoxRip"
      type="button"
    >
      <i data-lucide="log-in"></i>
      <span class="auth-trigger-label">Sign In</span>
    </button>
  `;

  refreshIcons();

  const signInBtn = document.getElementById('sign-in-btn');
  if (signInBtn) {
    signInBtn.addEventListener('click', () => {
      console.log('Sign in button clicked');
      const authModal = new AuthModal({
        mode: 'signin',
        onSuccess: (result) => {
          console.log('Sign in successful:', result.user?.email);
          // Manually update UI to ensure immediate feedback
          if (result.user) {
            const authContainer = document.getElementById('auth-container');
            if (authContainer) {
              renderUserProfile(result.user, authContainer);
            }
          }
        },
        onClose: () => {
          console.log('Auth modal closed');
        }
      });
      authModal.show();
    });
  }
}

/**
 * Render user profile with logout button
 */
function renderUserProfile(user, container) {
  const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  container.innerHTML = `
    <div class="auth-logout-row">
      <div class="auth-logout-avatar">${initial}</div>
      <span class="auth-logout-name">${displayName}</span>
      <button id="logout-btn" class="auth-logout-btn" type="button" aria-label="Log out">
        <i data-lucide="log-out"></i>
      </button>
    </div>
  `;

  refreshIcons();

  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    try {
      await signOut();
      window.location.reload();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  });
}

export default { initAuth };
