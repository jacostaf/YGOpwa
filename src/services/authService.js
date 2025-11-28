/**
 * Authentication Service
 * Handles all interactions with Supabase Auth
 */

import { supabase } from '../lib/supabaseClient.js';

class AuthService {
  constructor() {
    this.user = null;
    this.session = null;
    this.profile = null;
    this._authStateListeners = [];

    this.initialize();
  }

  /**
   * Initialize auth state
   */
  async initialize() {
    if (!supabase) return;

    // Get initial session
    const { data: { session } } = await supabase.auth.getSession();
    this.session = session;
    this.user = session?.user || null;

    if (this.user) {
      await this.fetchProfile();
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`Auth state changed: ${event}`, session?.user?.id);

      const previousUser = this.user;
      this.session = session;
      this.user = session?.user || null;

      if (event === 'SIGNED_IN' || (this.user && !previousUser)) {
        await this.fetchProfile();
      } else if (event === 'SIGNED_OUT') {
        this.profile = null;
      }

      this.notifyListeners(event, session);
    });
  }

  /**
   * Sign up a new user
   * @param {string} email 
   * @param {string} password 
   * @param {string} username 
   */
  async signUp(email, password, username) {
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
        }
      }
    });

    if (error) throw error;
    return data;
  }

  /**
   * Sign in an existing user
   * @param {string} email 
   * @param {string} password 
   */
  async signIn(email, password) {
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data;
  }

  /**
   * Sign in with magic link
   * @param {string} email 
   */
  async signInWithMagicLink(email) {
    if (!supabase) throw new Error('Supabase not configured');

    const { error } = await supabase.auth.signInWithOtp({
      email
    });

    return { error };
  }

  /**
   * Sign out the current user
 */
  async signOut() {
    if (!supabase) return;

    try {
      // 1. Manually clear local storage to ensure optimistic auth doesn't pick it up again
      if (typeof window !== 'undefined' && window.localStorage) {
        Object.keys(window.localStorage).forEach(key => {
          if (key.startsWith('sb-')) {
            window.localStorage.removeItem(key);
          }
        });
      }

      // 2. Call Supabase signOut (best effort)
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('Error during sign out:', error);
      // Even if Supabase errors, we've cleared local storage, so the user is effectively signed out locally.
    }
  }

  /**
   * Get the current session
   */
  async getSession() {
    if (!supabase) return null;
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  }

  /**
   * Get the current user
   */
  getUser() {
    return this.user;
  }

  /**
   * Get current user (async wrapper for compatibility)
   */
  async getCurrentUser() {
    if (!supabase) return { user: null, error: 'Supabase not configured' };

    try {
      // 1. FAST PATH: Check localStorage manually for a session
      // This bypasses supabase.auth.getSession() which can hang if it tries to refresh a stale token synchronously.
      // We trust the local token initially to unblock the UI.
      if (typeof window !== 'undefined' && window.localStorage) {
        const projectRef = 'kguazmofmstmethzoeyn'; // Hardcoded for now, or extract from URL
        const key = `sb-${projectRef}-auth-token`;
        const storedSession = window.localStorage.getItem(key);

        if (storedSession) {
          try {
            const session = JSON.parse(storedSession);
            if (session?.user) {
              console.log('Optimistic auth: Found local session, returning user immediately.');
              // We return the user immediately. Supabase will validate in background.
              return { user: session.user, error: null };
            }
          } catch (e) {
            console.warn('Failed to parse local session:', e);
          }
        }
      }

      // 2. SLOW PATH: If no local token found, use standard check
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.warn('Error getting session:', error);
        return { user: null, error };
      }

      return { user: session?.user || null, error: null };
    } catch (error) {
      console.error('Unexpected error in getCurrentUser:', error);
      return { user: null, error };
    }
  }

  /**
   * Fetch user profile from database
   */
  async fetchProfile() {
    if (!this.user || !supabase) return null;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', this.user.id)
        .single();

      if (error) {
        console.warn('Error fetching profile:', error);
        // Fallback to metadata if profile fetch fails
        this.profile = {
          id: this.user.id,
          username: this.user.user_metadata?.username,
          avatar_url: this.user.user_metadata?.avatar_url
        };
      } else {
        this.profile = data;
      }

      return this.profile;
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      return null;
    }
  }

  /**
   * Subscribe to auth state changes
   * @param {Function} callback 
   * @returns {Function} Unsubscribe function
   */
  onAuthStateChange(callback) {
    this._authStateListeners.push(callback);

    // Immediate callback with current state
    if (this.session) {
      callback('INITIAL_SESSION', this.session);
    }

    return () => {
      this._authStateListeners = this._authStateListeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify all listeners of state change
   * @private
   */
  notifyListeners(event, session) {
    this._authStateListeners.forEach(callback => {
      try {
        callback(event, session);
      } catch (err) {
        console.error('Error in auth listener:', err);
      }
    });
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;

// Export bound methods for convenience
export const signUp = authService.signUp.bind(authService);
export const signIn = authService.signIn.bind(authService);
export const signOut = authService.signOut.bind(authService);
export const getSession = authService.getSession.bind(authService);
export const getUser = authService.getUser.bind(authService);
export const getCurrentUser = authService.getCurrentUser.bind(authService);
export const onAuthStateChange = authService.onAuthStateChange.bind(authService);
