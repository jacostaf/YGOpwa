/**
 * Supabase Client Instance
 * Singleton pattern for Supabase client initialization
 *
 * Usage:
 *   import { supabase } from './lib/supabaseClient.js';
 *   const { data, error } = await supabase.from('profiles').select('*');
 */

import { createClient } from '@supabase/supabase-js';
import { supabaseConfig, validateConfig, refreshSupabaseConfig } from './config.js';

let supabaseInstance = null;

/**
 * Initialize Supabase client
 * @returns {object|null} Supabase client instance or null if not configured
 */
function initializeSupabase() {
  // Check if already initialized
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const config = refreshSupabaseConfig();

  if (!config.url || !config.anonKey) {
    console.warn(
      'Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in runtime-env.js or environment variables.'
    );
    return null;
  }

  if (!validateConfig()) {
    console.error('Supabase configuration validation failed');
    return null;
  }

  try {
    // Create Supabase client with options
    supabaseInstance = createClient(config.url, config.anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
      global: {
        headers: {
          'X-Client-Info': 'voxrip-ygopwa@2.1.0',
        },
      },
    });

    console.log('Supabase client initialized successfully');
    return supabaseInstance;
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    return null;
  }
}

/**
 * Get Supabase client instance
 * Lazily initializes the client on first access
 * @returns {object|null} Supabase client instance
 */
export function getSupabaseClient() {
  if (!supabaseInstance) {
    return initializeSupabase();
  }
  return supabaseInstance;
}

/**
 * Reset Supabase client instance
 * Useful for testing or reconfiguration
 */
export function resetSupabaseClient() {
  supabaseInstance = null;
}

/**
 * Default export - Supabase client instance
 * Automatically initializes on import if configured
 */
export const supabase = getSupabaseClient();

/**
 * Check if Supabase is available and configured
 * @returns {boolean}
 */
export function isSupabaseAvailable() {
  return supabase !== null;
}

export default supabase;
