/**
 * Authentication Initialization Module
 * Initializes and manages auth UI in the application
 */

import { features, isSupabaseConfigured } from '../lib/config.js';
import { getCurrentUser, onAuthStateChange, signOut } from '../services/authService.js';
import AuthModal from '../components/AuthModal.js';
import UserProfile from '../components/UserProfile.js';

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
    console.error('Auth container not found in HTML. Add <div id="auth-container"></div> to your header.');
    return;
  }

  console.log('Initializing auth UI...');

  // Check current auth state
  try {
    const { user } = await getCurrentUser();

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
      <span class="auth-trigger-label">Sign In</span>
    </button>
  `;

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
 * Render user profile component
 */
function renderUserProfile(user, container) {
  const userProfile = new UserProfile({
    user,
    onSignOut: async () => {
      console.log('User signed out');
      try {
        await signOut();
        // Reload page to reset state
        window.location.reload();
      } catch (error) {
        console.error('Sign out error:', error);
      }
    },
    onProfileClick: (action) => {
      console.log('Profile action:', action);
      handleProfileAction(action);
    }
  });

  userProfile.render(container);
}

/**
 * Handle profile menu actions
 */
function handleProfileAction(action) {
  switch (action) {
    case 'settings':
      console.log('Navigate to settings');
      // TODO: Navigate to settings page
      alert('Settings page - Coming in Phase 4!');
      break;
    case 'collection':
      console.log('Navigate to collection');
      // TODO: Navigate to collection page
      alert('Collection page - Coming in Phase 4!');
      break;
    case 'packs':
      console.log('Navigate to pack history');
      // TODO: Navigate to pack history page
      alert('Pack history - Coming in Phase 6!');
      break;
    default:
      console.log('Unknown action:', action);
  }
}

export default { initAuth };
