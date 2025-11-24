/**
 * Authentication Service
 * Handles all authentication operations with Supabase
 *
 * Features:
 * - Email/Password authentication
 * - Magic link authentication
 * - OAuth providers (configurable)
 * - Session management
 * - User profile operations
 */

import { supabase, isSupabaseAvailable } from '../lib/supabaseClient.js';

/**
 * Auth service error class
 */
export class AuthError extends Error {
  constructor(message, code = 'AUTH_ERROR', originalError = null) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.originalError = originalError;
  }
}

/**
 * Check if Supabase auth is available
 * @returns {boolean}
 */
function checkAuthAvailable() {
  if (!isSupabaseAvailable()) {
    throw new AuthError(
      'Supabase is not configured. Please configure environment variables.',
      'SUPABASE_NOT_CONFIGURED'
    );
  }
  return true;
}

/**
 * Sign up with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {object} metadata - Optional user metadata
 * @returns {Promise<{user, session, error}>}
 */
export async function signUp(email, password, metadata = {}) {
  checkAuthAvailable();

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      throw new AuthError(error.message, 'SIGNUP_FAILED', error);
    }

    return { user: data.user, session: data.session, error: null };
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError('Failed to sign up', 'SIGNUP_ERROR', error);
  }
}

/**
 * Sign in with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{user, session, error}>}
 */
export async function signIn(email, password) {
  checkAuthAvailable();

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new AuthError(error.message, 'SIGNIN_FAILED', error);
    }

    return { user: data.user, session: data.session, error: null };
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError('Failed to sign in', 'SIGNIN_ERROR', error);
  }
}

/**
 * Sign in with magic link (passwordless)
 * @param {string} email - User email
 * @returns {Promise<{error}>}
 */
export async function signInWithMagicLink(email) {
  checkAuthAvailable();

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      throw new AuthError(error.message, 'MAGIC_LINK_FAILED', error);
    }

    return { error: null };
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError('Failed to send magic link', 'MAGIC_LINK_ERROR', error);
  }
}

/**
 * Sign in with OAuth provider
 * @param {string} provider - OAuth provider (google, github, discord, etc.)
 * @returns {Promise<{error}>}
 */
export async function signInWithOAuth(provider) {
  checkAuthAvailable();

  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      throw new AuthError(error.message, 'OAUTH_FAILED', error);
    }

    return { error: null };
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError(`Failed to sign in with ${provider}`, 'OAUTH_ERROR', error);
  }
}

/**
 * Sign out current user
 * @returns {Promise<{error}>}
 */
export async function signOut() {
  checkAuthAvailable();

  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new AuthError(error.message, 'SIGNOUT_FAILED', error);
    }

    return { error: null };
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError('Failed to sign out', 'SIGNOUT_ERROR', error);
  }
}

/**
 * Get current user
 * @returns {Promise<{user, error}>}
 */
export async function getCurrentUser() {
  checkAuthAvailable();

  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      throw new AuthError(error.message, 'GET_USER_FAILED', error);
    }

    return { user, error: null };
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError('Failed to get current user', 'GET_USER_ERROR', error);
  }
}

/**
 * Get current session
 * @returns {Promise<{session, error}>}
 */
export async function getSession() {
  checkAuthAvailable();

  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      throw new AuthError(error.message, 'GET_SESSION_FAILED', error);
    }

    return { session, error: null };
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError('Failed to get session', 'GET_SESSION_ERROR', error);
  }
}

/**
 * Update user profile/metadata
 * @param {object} updates - User metadata updates
 * @returns {Promise<{user, error}>}
 */
export async function updateUser(updates) {
  checkAuthAvailable();

  try {
    const { data, error } = await supabase.auth.updateUser({
      data: updates,
    });

    if (error) {
      throw new AuthError(error.message, 'UPDATE_USER_FAILED', error);
    }

    return { user: data.user, error: null };
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError('Failed to update user', 'UPDATE_USER_ERROR', error);
  }
}

/**
 * Reset password (send reset email)
 * @param {string} email - User email
 * @returns {Promise<{error}>}
 */
export async function resetPassword(email) {
  checkAuthAvailable();

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      throw new AuthError(error.message, 'RESET_PASSWORD_FAILED', error);
    }

    return { error: null };
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError('Failed to send password reset email', 'RESET_PASSWORD_ERROR', error);
  }
}

/**
 * Update password (when logged in)
 * @param {string} newPassword - New password
 * @returns {Promise<{user, error}>}
 */
export async function updatePassword(newPassword) {
  checkAuthAvailable();

  try {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw new AuthError(error.message, 'UPDATE_PASSWORD_FAILED', error);
    }

    return { user: data.user, error: null };
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError('Failed to update password', 'UPDATE_PASSWORD_ERROR', error);
  }
}

/**
 * Subscribe to auth state changes
 * @param {function} callback - Callback function (event, session) => {}
 * @returns {object} Subscription object with unsubscribe method
 */
export function onAuthStateChange(callback) {
  checkAuthAvailable();

  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);

  return subscription;
}

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>}
 */
export async function isAuthenticated() {
  try {
    const { session } = await getSession();
    return session !== null;
  } catch (error) {
    console.error('Failed to check authentication status:', error);
    return false;
  }
}

/**
 * Get user profile from profiles table
 * @param {string} userId - User ID
 * @returns {Promise<{profile, error}>}
 */
export async function getUserProfile(userId) {
  checkAuthAvailable();

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new AuthError(error.message, 'GET_PROFILE_FAILED', error);
    }

    return { profile: data, error: null };
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError('Failed to get user profile', 'GET_PROFILE_ERROR', error);
  }
}

/**
 * Create or update user profile in profiles table
 * @param {string} userId - User ID
 * @param {object} profileData - Profile data
 * @returns {Promise<{profile, error}>}
 */
export async function upsertUserProfile(userId, profileData) {
  checkAuthAvailable();

  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        user_id: userId,
        ...profileData,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new AuthError(error.message, 'UPSERT_PROFILE_FAILED', error);
    }

    return { profile: data, error: null };
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError('Failed to update user profile', 'UPSERT_PROFILE_ERROR', error);
  }
}

// Export all functions as default
export default {
  signUp,
  signIn,
  signInWithMagicLink,
  signInWithOAuth,
  signOut,
  getCurrentUser,
  getSession,
  updateUser,
  resetPassword,
  updatePassword,
  onAuthStateChange,
  isAuthenticated,
  getUserProfile,
  upsertUserProfile,
  AuthError,
};
