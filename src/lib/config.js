/**
 * Configuration Helper
 * Centralized configuration management for environment variables, feature flags,
 * and runtime Supabase settings. Works with Vite-style envs, Node environments,
 * and plain static deployments by reading from window runtime config objects.
 */

const RUNTIME_ENV_CANDIDATES = ['__ENV__', '__SUPABASE_CONFIG__', '__APP_ENV__', '__APP_CONFIG__'];

/**
 * Collect runtime environment sources from the global scope
 * @returns {Array<Record<string, unknown>>}
 */
function getRuntimeSources() {
  if (typeof globalThis === 'undefined') {
    return [];
  }

  const sources = [];

  for (const key of RUNTIME_ENV_CANDIDATES) {
    const value = globalThis[key];
    if (value && typeof value === 'object') {
      sources.push(value);
    }
  }

  return sources;
}

/**
 * Expand key variants to support Vite-style prefixes and bare keys
 * @param {string} key
 * @returns {string[]}
 */
function expandKeyVariants(key) {
  if (!key || typeof key !== 'string') {
    return [];
  }

  const variants = new Set([key]);

  if (key.startsWith('VITE_')) {
    variants.add(key.replace(/^VITE_/, ''));
  } else {
    variants.add(`VITE_${key}`);
  }

  return Array.from(variants);
}

/**
 * Try to resolve environment value from runtime sources
 * @param {string[]} variants
 * @returns {string|undefined}
 */
function resolveFromRuntime(variants) {
  const runtimeSources = getRuntimeSources();

  for (const source of runtimeSources) {
    for (const variant of variants) {
      if (Object.prototype.hasOwnProperty.call(source, variant)) {
        const value = source[variant];
        if (value !== undefined && value !== null) {
          return String(value);
        }
      }
    }
  }

  return undefined;
}

/**
 * Try to resolve environment value from import.meta.env (Vite/ESM)
 * @param {string[]} variants
 * @returns {string|undefined}
 */
function resolveFromImportMeta(variants) {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    for (const variant of variants) {
      if (variant in import.meta.env) {
        const value = import.meta.env[variant];
        if (value !== undefined && value !== null) {
          return String(value);
        }
      }
    }
  }

  return undefined;
}

/**
 * Try to resolve environment value from process.env (Node/testing)
 * @param {string[]} variants
 * @returns {string|undefined}
 */
function resolveFromProcessEnv(variants) {
  if (typeof process !== 'undefined' && process.env) {
    for (const variant of variants) {
      if (variant in process.env) {
        const value = process.env[variant];
        if (value !== undefined && value !== null) {
          return String(value);
        }
      }
    }
  }

  return undefined;
}

/**
 * Try to resolve environment value from meta tags (optional)
 * @param {string[]} variants
 * @returns {string|undefined}
 */
function resolveFromDocumentMeta(variants) {
  if (typeof document === 'undefined') {
    return undefined;
  }

  const selectorsFor = (variant) => [
    `meta[name="${variant}"]`,
    `meta[name="${variant.toLowerCase()}"]`,
    `meta[data-env-key="${variant}"]`,
    `meta[data-env-key="${variant.toLowerCase()}"]`,
  ];

  for (const variant of variants) {
    for (const selector of selectorsFor(variant)) {
      const meta = document.querySelector(selector);
      if (meta) {
        const value = meta.getAttribute('content');
        if (value !== undefined && value !== null) {
          return value;
        }
      }
    }
  }

  return undefined;
}

/**
 * Get environment variable with fallbacks
 * @param {string} key
 * @param {string} defaultValue
 * @returns {string}
 */
function getEnv(key, defaultValue = '') {
  const variants = expandKeyVariants(key);

  const runtimeValue = resolveFromRuntime(variants);
  if (runtimeValue !== undefined) {
    return runtimeValue;
  }

  const importMetaValue = resolveFromImportMeta(variants);
  if (importMetaValue !== undefined) {
    return importMetaValue;
  }

  const processValue = resolveFromProcessEnv(variants);
  if (processValue !== undefined) {
    return processValue;
  }

  const metaValue = resolveFromDocumentMeta(variants);
  if (metaValue !== undefined) {
    return metaValue;
  }

  return defaultValue;
}

/**
 * Parse boolean environment variable
 * @param {string} key
 * @param {boolean} defaultValue
 * @returns {boolean}
 */
function getEnvBoolean(key, defaultValue = false) {
  const fallback = defaultValue ? 'true' : 'false';
  const value = getEnv(key, fallback).toLowerCase().trim();

  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;

  return defaultValue;
}

// Supabase Configuration (mutable object for runtime refresh)
export const supabaseConfig = {
  url: '',
  anonKey: '',
  serviceRoleKey: '',
};

/**
 * Refresh Supabase config values from current environment
 * @returns {{url: string, anonKey: string, serviceRoleKey: string}}
 */
export function refreshSupabaseConfig() {
  supabaseConfig.url = getEnv('VITE_SUPABASE_URL', '').trim();
  supabaseConfig.anonKey = getEnv('VITE_SUPABASE_ANON_KEY', '').trim();
  supabaseConfig.serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY', '').trim();
  return supabaseConfig;
}

// Initialize config on first load
refreshSupabaseConfig();

// Feature Flags (dynamic getters ensure they react to runtime updates)
export const features = {
  get authEnabled() {
    return getEnvBoolean('VITE_FEATURE_AUTH_ENABLED', false);
  },
  get collectionsEnabled() {
    return getEnvBoolean('VITE_FEATURE_COLLECTIONS_ENABLED', false);
  },
  get leaderboardsEnabled() {
    return getEnvBoolean('VITE_FEATURE_LEADERBOARDS_ENABLED', false);
  },
  get packTrackingEnabled() {
    return getEnvBoolean('VITE_FEATURE_PACK_TRACKING_ENABLED', false);
  },
};

// Environment
export const environment = getEnv('VITE_ENVIRONMENT', 'development') || 'development';

let hasWarnedConfig = false;

// Validation
export function validateConfig() {
  const config = refreshSupabaseConfig();
  const errors = [];

  if (!config.url) {
    errors.push('VITE_SUPABASE_URL is not configured');
  }

  if (!config.anonKey) {
    errors.push('VITE_SUPABASE_ANON_KEY is not configured');
  }

  if (errors.length > 0) {
    if (!hasWarnedConfig) {
      console.warn('Supabase configuration issues detected:', errors.join('; '));
      hasWarnedConfig = true;
    }
    return false;
  }

  hasWarnedConfig = false;
  return true;
}

// Export utility to check if Supabase is configured
export function isSupabaseConfigured() {
  const config = refreshSupabaseConfig();
  return Boolean(config.url && config.anonKey);
}

export default {
  supabaseConfig,
  features,
  environment,
  validateConfig,
  isSupabaseConfigured,
  refreshSupabaseConfig,
};

export { getEnv, getEnvBoolean };
