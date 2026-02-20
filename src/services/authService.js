/**
 * Authentication Service
 * Handles all interactions with Supabase Auth
 */

import { supabase } from '../lib/supabaseClient.js';
import { supabaseConfig } from '../lib/config.js';

console.log('AuthService module loaded (TIMESTAMP: ' + Date.now() + ')');

class AuthService {
  constructor() {
    this.user = null;
    this.session = null;
    this.profile = null;
    this._profileReady = null;
    this._authStateListeners = [];
    this._projectRef = null;  // lazy — computed on first access

    // Initialize with a global timeout to prevent initPromise from hanging forever
    let timeoutId;
    const globalTimeout = new Promise((resolve) => {
      timeoutId = setTimeout(() => {
        console.warn('AuthService: Initialization global timeout reached');
        resolve();
      }, 15000); // Increased to 15s
    });

    const initPromise = this.initialize().finally(() => {
      if (timeoutId) clearTimeout(timeoutId);
    });

    this.initPromise = Promise.race([initPromise, globalTimeout]);
  }

  get projectRef() {
    if (!this._projectRef) {
      this._projectRef = this._extractProjectRef();
    }
    return this._projectRef;
  }

  /**
   * Initialize auth state
   */
  async initialize() {
    if (!supabase) return;

    // Get initial session with timeout
    console.log('AuthService: Fetching initial session...');
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise((resolve) =>
      setTimeout(() => resolve({ data: { session: null }, error: new Error('Session fetch timeout') }), 10000) // Increased to 10s
    );

    const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]);

    if (error) {
      console.warn('AuthService: Initial session fetch failed or timed out:', error.message);

      // FALLBACK: If getSession timed out, try to recover from localStorage manually
      // This prevents the app from logging out the user just because the network was slow
      if (typeof window !== 'undefined' && window.localStorage) {
        const key = `sb-${this.projectRef}-auth-token`;
        const storedSession = window.localStorage.getItem(key);
        if (storedSession) {
          try {
            const parsed = JSON.parse(storedSession);
            if (parsed && parsed.user) {
              console.log('AuthService: Recovered session from localStorage after timeout');
              this.session = parsed;
              this.user = parsed.user;
              // Set the session on the client so RLS works
              await supabase.auth.setSession(parsed);
            }
          } catch (e) {
            console.warn('AuthService: Failed to parse recovered session:', e);
          }
        }
      }
    } else {
      console.log('AuthService: Initial session fetched successfully');
      this.session = session;
      this.user = session?.user || null;
    }

    if (this.user) {
      // Fetch profile in background, don't await it to unblock initialization
      this._profileReady = this.fetchProfile().catch(err => {
        console.warn('AuthService: Background profile fetch failed:', err);
      });
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`Auth state changed: ${event}`, session?.user?.id);

      const previousUser = this.user;
      this.session = session;
      this.user = session?.user || null;

      if (event === 'SIGNED_IN' || (this.user && !previousUser)) {
        this._profileReady = this.fetchProfile();
        await this._profileReady;
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
   * Resend confirmation email for signup
   * @param {string} email
   */
  async resendConfirmationEmail(email) {
    if (!supabase) throw new Error('Supabase not configured');

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });

    return { error };
  }

  /**
   * Sign in with OAuth provider
   * @param {string} provider 
   */
  async signInWithOAuth(provider) {
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin
      }
    });

    if (error) throw error;
    return data;
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
    try {
      // 1. FAST PATH: Check localStorage manually for a session
      // This bypasses everything else to unblock the UI immediately.
      if (typeof window !== 'undefined' && window.localStorage) {
        const key = `sb-${this.projectRef}-auth-token`;
        const storedSession = window.localStorage.getItem(key);

        if (storedSession) {
          try {
            const session = JSON.parse(storedSession);
            if (session?.user) {
              // Ensure the supabase client has the session set if we're returning optimistically
              // This is crucial for RLS to work in subsequent queries
              if (session.access_token && !this.session) {
                try {
                  await supabase.auth.setSession(session);
                  this.session = session;
                  this.user = session.user;
                } catch (err) {
                  console.warn('Failed to set session optimistically:', err);
                }
              }
              return { user: session.user, error: null };
            }
          } catch (e) {
            console.warn('Failed to parse local session:', e);
          }
        }
      }

      // 2. FAST EXIT: If no local token, we can assume logged out for UI purposes
      // UNLESS there is an auth-related hash in the URL (OAuth redirect)
      if (typeof window !== 'undefined' && window.localStorage) {
        const key = `sb-${this.projectRef}-auth-token`;
        const hasAuthHash = window.location.hash && (
          window.location.hash.includes('access_token=') ||
          window.location.hash.includes('error=')
        );

        if (!window.localStorage.getItem(key) && !hasAuthHash) {
          console.log('AuthService: No local session or auth hash found, returning null immediately');
          return { user: null, error: null };
        }
      }

      // 3. WAIT FOR INIT: If we have a token but haven't initialized yet, wait for full initialization
      await this.initPromise;

      if (!supabase) return { user: null, error: 'Supabase not configured' };

      // 3. SLOW PATH: Standard check
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
      console.log('AuthService: Fetching profile for user:', this.user.id);
      // Add a timeout to profile fetch to prevent blocking initialization
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('user_id', this.user.id)
        .maybeSingle(); // Use maybeSingle to avoid error if no profile exists

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Profile fetch timeout')), 10000) // Increased to 10s
      );

      const { data, error } = await Promise.race([profilePromise, timeoutPromise]);

      if (error) {
        console.warn('Error fetching profile:', error);
        // Fallback to metadata if profile fetch fails
        this.profile = {
          user_id: this.user.id,
          display_name: this.user.user_metadata?.username || this.user.email?.split('@')[0],
          avatar_url: this.user.user_metadata?.avatar_url,
          is_admin: false
        };
      } else if (!data) {
        console.log('AuthService: No profile found, creating one...');
        this.profile = await this.createProfile();
      } else {
        console.log('AuthService: Profile fetched. is_admin:', data?.is_admin, '| keys:', Object.keys(data || {}).join(', '));
        this.profile = data;
      }



      // Notify listeners that profile has been updated
      this.notifyListeners('PROFILE_UPDATED', this.session);

      return this.profile;
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      if (!this.profile) {
        this.profile = {
          user_id: this.user?.id,
          display_name: this.user?.user_metadata?.username || this.user?.email?.split('@')[0] || 'User',
          avatar_url: this.user?.user_metadata?.avatar_url,
          is_admin: false
        };
      }
      this.notifyListeners('PROFILE_UPDATED', this.session);
      return this.profile;
    }
  }

  /**
   * Create a new user profile
   */
  async createProfile() {
    if (!this.user || !supabase) return null;

    const newProfile = {
      user_id: this.user.id,
      display_name: this.user.user_metadata?.username || this.user.email?.split('@')[0],
      avatar_url: this.user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${this.user.id}`,
      updated_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert([newProfile])
        .select()
        .single();

      if (error) {
        console.error('Error creating profile:', error);
        return newProfile; // Return the object anyway as fallback
      }

      console.log('AuthService: Profile created successfully');
      return data;
    } catch (err) {
      console.error('Failed to create profile:', err);
      return newProfile;
    }
  }

  /**
   * Update user profile
   * @param {Object} updates - Fields to update
   */
  async updateProfile(updates) {
    if (!this.user || !supabase) return { error: new Error('Not authenticated') };

    try {
      console.log('AuthService: Updating profile:', updates);

      // Add updated_at timestamp
      const updatesWithTimestamp = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('profiles')
        .update(updatesWithTimestamp)
        .eq('user_id', this.user.id)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      this.profile = data;

      // Notify listeners
      this.notifyListeners('PROFILE_UPDATED', this.session);

      return { data, error: null };
    } catch (error) {
      console.error('AuthService: Failed to update profile:', error);
      return { data: null, error };
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

  /**
   * Extract project ref from Supabase URL
   * @private
   */
  _extractProjectRef() {
    try {
      const url = supabaseConfig?.url || '';
      if (url) {
        const hostname = new URL(url).hostname;
        return hostname.split('.')[0];
      }
    } catch (e) {
      console.warn('AuthService: Failed to extract projectRef from URL');
    }
    return '';
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;

// Export bound methods for convenience
export const signIn = authService.signIn.bind(authService);
export const signUp = authService.signUp.bind(authService);
export const signInWithMagicLink = authService.signInWithMagicLink.bind(authService);
export const signInWithOAuth = authService.signInWithOAuth.bind(authService);
export const signOut = authService.signOut.bind(authService);
export const getSession = authService.getSession.bind(authService);
export const getUser = authService.getUser.bind(authService);
export const getCurrentUser = authService.getCurrentUser.bind(authService);
export const onAuthStateChange = authService.onAuthStateChange.bind(authService);
export const updateProfile = authService.updateProfile.bind(authService);
export const resendConfirmationEmail = authService.resendConfirmationEmail.bind(authService);
