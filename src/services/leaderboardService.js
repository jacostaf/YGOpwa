/**
 * leaderboardService.js
 *
 * Supabase-backed leaderboards with local cache + offline fallback.
 * Implements Phase 5 requirements for value, quantity, and rarity leaderboards.
 */

import { supabase, isSupabaseAvailable } from '../lib/supabaseClient.js';
import { isSupabaseConfigured } from '../lib/config.js';

export const LEADERBOARD_TYPES = Object.freeze({
  VALUE: 'value',
  QUANTITY: 'quantity',
  RARITY: 'rarity',
});

const CACHE_NAMESPACE = 'voxrip:leaderboard';
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_LIMIT = 500;

const SUPABASE_CONFIG_ERROR = 'Supabase configuration missing';
let hasLoggedMissingSupabaseConfig = false;
let hasLoggedRpcTypeMismatch = false;
let disableRemoteDueToRpcError = false;

export class LeaderboardAccessError extends Error {
  constructor(message, planKey = null) {
    super(message);
    this.name = 'LeaderboardAccessError';
    this.code = 'PLAN_UPGRADE_REQUIRED';
    this.planKey = planKey;
  }
}

const FALLBACK_ENTRIES = {
  value: [
    {
      leaderboard_type: 'value',
      rank: 1,
      dense_rank: 1,
      user_id: '00000000-0000-0000-0000-00000000f001',
      display_name: 'KaibaCorp Pro',
      avatar_url: null,
      metric_value: 250000,
      total_market_value: 250000,
      total_quantity: 540,
      rare_score: 1825,
      computed_at: new Date().toISOString(),
      tie: false,
    },
    {
      leaderboard_type: 'value',
      rank: 2,
      dense_rank: 2,
      user_id: '00000000-0000-0000-0000-00000000f002',
      display_name: 'Magician Main',
      avatar_url: null,
      metric_value: 149500,
      total_market_value: 149500,
      total_quantity: 610,
      rare_score: 955,
      computed_at: new Date().toISOString(),
      tie: false,
    },
    {
      leaderboard_type: 'value',
      rank: 3,
      dense_rank: 3,
      user_id: '00000000-0000-0000-0000-00000000f003',
      display_name: 'Duel Links Grinder',
      avatar_url: null,
      metric_value: 149500,
      total_market_value: 149500,
      total_quantity: 610,
      rare_score: 955,
      computed_at: new Date().toISOString(),
      tie: true,
    },
  ],
  quantity: [
    {
      leaderboard_type: 'quantity',
      rank: 1,
      dense_rank: 1,
      user_id: '00000000-0000-0000-0000-00000000q001',
      display_name: 'Sleeve Collector',
      avatar_url: null,
      metric_value: 1024,
      total_market_value: 82000,
      total_quantity: 1024,
      rare_score: 325,
      computed_at: new Date().toISOString(),
      tie: false,
    },
    {
      leaderboard_type: 'quantity',
      rank: 2,
      dense_rank: 2,
      user_id: '00000000-0000-0000-0000-00000000q002',
      display_name: 'Bulk Trader',
      avatar_url: null,
      metric_value: 768,
      total_market_value: 65500,
      total_quantity: 768,
      rare_score: 255,
      computed_at: new Date().toISOString(),
      tie: false,
    },
  ],
  rarity: [
    {
      leaderboard_type: 'rarity',
      rank: 1,
      dense_rank: 1,
      user_id: '00000000-0000-0000-0000-00000000r001',
      display_name: 'Secret Rare Hunter',
      avatar_url: null,
      metric_value: 5200,
      total_market_value: 112000,
      total_quantity: 210,
      rare_score: 5200,
      computed_at: new Date().toISOString(),
      tie: false,
    },
    {
      leaderboard_type: 'rarity',
      rank: 2,
      dense_rank: 2,
      user_id: '00000000-0000-0000-0000-00000000r002',
      display_name: 'Ghost Seeker',
      avatar_url: null,
      metric_value: 5100,
      total_market_value: 98000,
      total_quantity: 205,
      rare_score: 5100,
      computed_at: new Date().toISOString(),
      tie: false,
    },
    {
      leaderboard_type: 'rarity',
      rank: 3,
      dense_rank: 3,
      user_id: '00000000-0000-0000-0000-00000000r003',
      display_name: 'Quarter Century',
      avatar_url: null,
      metric_value: 5100,
      total_market_value: 97000,
      total_quantity: 205,
      rare_score: 5100,
      computed_at: new Date().toISOString(),
      tie: true,
    },
  ],
};

function getStorage(storageOverride) {
  if (storageOverride) {
    return storageOverride;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch (error) {
    console.warn('LeaderboardService: sessionStorage not available', error);
    return null;
  }
}

function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function safeBoolean(value) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === 'true') return true;
  if (value === 'false') return false;
  return false;
}

function normalizeEntry(raw, defaultType) {
  if (!raw) {
    return null;
  }

  const computedAt = raw.computed_at || raw.computedAt || new Date().toISOString();

  return {
    leaderboard_type: raw.leaderboard_type || defaultType,
    rank: safeNumber(raw.rank, 0),
    dense_rank: safeNumber(raw.dense_rank, safeNumber(raw.rank, 0)),
    user_id: raw.user_id || null,
    display_name: raw.display_name || raw.username || 'Duelist',
    avatar_url: raw.avatar_url || null,
    metric_value: safeNumber(raw.metric_value),
    total_market_value: safeNumber(raw.total_market_value),
    total_quantity: Math.round(safeNumber(raw.total_quantity)),
    rare_score: safeNumber(raw.rare_score),
    computed_at: computedAt,
    tie: safeBoolean(raw.tie || (safeNumber(raw.rank, 0) !== safeNumber(raw.dense_rank, 0))),
  };
}

export class LeaderboardService {
  constructor(options = {}) {
    this.ttlMs = Number.isFinite(options.ttlMs) && options.ttlMs > 0 ? options.ttlMs : DEFAULT_CACHE_TTL_MS;
    this.client = options.client || (isSupabaseAvailable() ? supabase : null);
    this.storage = getStorage(options.storage);
    this.cache = new Map();
  }

  isRemoteEnabled() {
    return Boolean(this.client);
  }

  normalizeType(type) {
    const normalized = String(type || '').toLowerCase();
    if (normalized === LEADERBOARD_TYPES.VALUE || normalized === LEADERBOARD_TYPES.QUANTITY || normalized === LEADERBOARD_TYPES.RARITY) {
      return normalized;
    }
    return LEADERBOARD_TYPES.VALUE;
  }

  getCacheKey(type, limit, offset) {
    return `${CACHE_NAMESPACE}:${type}:${limit}:${offset}`;
  }

  readCache(key) {
    if (this.cache.has(key)) {
      const cached = this.cache.get(key);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.payload;
      }
      this.cache.delete(key);
    }

    if (!this.storage) {
      return null;
    }

    try {
      const raw = this.storage.getItem(key);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.expiresAt || parsed.expiresAt <= Date.now()) {
        this.storage.removeItem(key);
        return null;
      }

      this.cache.set(key, { expiresAt: parsed.expiresAt, payload: parsed.payload });
      return parsed.payload;
    } catch (error) {
      console.warn('LeaderboardService: failed to read cache', error);
      return null;
    }
  }

  writeCache(key, payload) {
    const expiresAt = Date.now() + this.ttlMs;
    this.cache.set(key, { expiresAt, payload });

    if (!this.storage) {
      return;
    }

    try {
      this.storage.setItem(key, JSON.stringify({ expiresAt, payload }));
    } catch (error) {
      console.warn('LeaderboardService: failed to persist cache', error);
    }
  }

  clearCache(key) {
    this.cache.delete(key);
    if (this.storage) {
      try {
        this.storage.removeItem(key);
      } catch (error) {
        console.warn('LeaderboardService: failed to clear cache', error);
      }
    }
  }

  clearAllCaches() {
    this.cache.clear();
    if (!this.storage) {
      return;
    }

    try {
      const prefix = `${CACHE_NAMESPACE}:`;
      for (let i = this.storage.length - 1; i >= 0; i -= 1) {
        const key = this.storage.key(i);
        if (key && key.startsWith(prefix)) {
          this.storage.removeItem(key);
        }
      }
    } catch (error) {
      console.warn('LeaderboardService: failed to clear storage cache', error);
    }
  }

  buildMeta(type, entries, source = 'remote') {
    const computedAt = entries.length > 0 ? entries[0].computed_at : new Date().toISOString();
    return {
      type,
      source,
      computedAt,
      fetchedAt: new Date().toISOString(),
      totalEntries: entries.length,
    };
  }

  buildFallback(type, limit, offset, error = null) {
    const base = (FALLBACK_ENTRIES[type] || []).map((entry) => normalizeEntry(entry, type));
    const sliced = base.slice(offset, offset + limit);
    return {
      data: sliced,
      meta: {
        type,
        source: 'fallback',
        computedAt: sliced.length ? sliced[0].computed_at : new Date().toISOString(),
        fetchedAt: new Date().toISOString(),
        totalEntries: sliced.length,
        fallback: true,
        error: error ? error.message || String(error) : null,
      },
    };
  }

  normalizeEntries(entries, type) {
    if (!Array.isArray(entries)) {
      return [];
    }
    return entries
      .map((entry) => normalizeEntry(entry, type))
      .filter(Boolean)
      .sort((a, b) => {
        if (a.rank === b.rank) {
          return a.user_id.localeCompare(b.user_id || '');
        }
        return a.rank - b.rank;
      });
  }

  async fetchLeaderboard(type, options = {}) {
    const leaderboardType = this.normalizeType(type);
    const limit = Math.min(Math.max(Number(options.limit) || 20, 1), MAX_LIMIT);
    const offset = Math.max(Number(options.offset) || 0, 0);
    const forceRefresh = Boolean(options.forceRefresh);
    const bypassCache = Boolean(options.bypassCache);

    if (!isSupabaseConfigured()) {
      if (!hasLoggedMissingSupabaseConfig) {
        console.warn('LeaderboardService: Supabase env vars missing. Skipping remote leaderboard fetches.');
        hasLoggedMissingSupabaseConfig = true;
      }

      const disabledMeta = {
        ...this.buildMeta(leaderboardType, [], 'disabled'),
        disabled: true,
      };

      return {
        data: [],
        meta: disabledMeta,
        source: 'disabled',
        error: SUPABASE_CONFIG_ERROR,
      };
    }

    const cacheKey = this.getCacheKey(leaderboardType, limit, offset);

    if (!bypassCache && !forceRefresh) {
      const cached = this.readCache(cacheKey);
      if (cached) {
        return { ...cached, source: cached.meta?.source || 'cache' };
      }
    } else {
      this.clearCache(cacheKey);
    }

    if (disableRemoteDueToRpcError) {
      const fallback = this.buildFallback(leaderboardType, limit, offset, new Error('Remote disabled after RPC type mismatch'));
      this.writeCache(cacheKey, fallback);
      return { ...fallback, source: 'fallback', error: 'Leaderboards temporarily disabled' };
    }

    if (!this.isRemoteEnabled()) {
      const fallback = this.buildFallback(leaderboardType, limit, offset);
      this.writeCache(cacheKey, fallback);
      return { ...fallback, source: 'fallback' };
    }

    try {
      const { data, error } = await this.client.rpc('get_leaderboard_entries', {
        p_leaderboard: leaderboardType,
        p_limit: limit,
        p_offset: offset,
      });

      if (error) {
        throw this.normalizeRpcError(error);
      }

      const normalized = this.normalizeEntries(data, leaderboardType);
      const payload = {
        data: normalized,
        meta: this.buildMeta(leaderboardType, normalized, 'remote'),
      };

      this.writeCache(cacheKey, payload);
      return { ...payload, source: 'remote' };
    } catch (error) {
      console.warn('LeaderboardService.fetchLeaderboard error', error);

      if (error?.code === '42804') {
        disableRemoteDueToRpcError = true;
        if (!hasLoggedRpcTypeMismatch) {
          console.warn('LeaderboardService: disabling remote leaderboards after type mismatch (42804). Falling back to sample data.');
          hasLoggedRpcTypeMismatch = true;
        }
      }

      if (error instanceof LeaderboardAccessError) {
        const restricted = this.buildRestrictedPayload(leaderboardType, error);
        this.writeCache(cacheKey, restricted);
        return {
          ...restricted,
          source: 'restricted',
          error: error.message,
        };
      }
      const fallback = this.buildFallback(leaderboardType, limit, offset, error);
      this.writeCache(cacheKey, fallback);
      return { ...fallback, source: 'fallback', error: error?.message || 'Failed to fetch leaderboard' };
    }
  }

  async refreshRemote(options = {}) {
    if (!this.isRemoteEnabled()) {
      return { data: null, error: 'Supabase is not configured' };
    }

    const limit = Math.min(Math.max(Number(options.limit) || 100, 1), MAX_LIMIT);
    const includeSnapshots = options.includeSnapshots === undefined ? false : Boolean(options.includeSnapshots);
    const source = options.source || 'client';

    const { data, error } = await this.client.rpc('refresh_leaderboards', {
      p_limit: limit,
      p_source: source,
      p_include_snapshots: includeSnapshots,
    });

    if (error) {
      return { data: null, error: error.message || 'Failed to refresh leaderboards' };
    }

    this.clearAllCaches();
    return { data, error: null };
  }

  normalizeRpcError(error) {
    if (!error) {
      return new Error('Unknown Supabase error');
    }

    const message = error.message || error.details || 'Leaderboard request failed';
    const code = error.code || '';

    if (code === '42501' || /plan/i.test(message)) {
      const planKey = extractPlanKey(message);
      return new LeaderboardAccessError(message, planKey);
    }

    return error;
  }

  buildRestrictedPayload(type, accessError) {
    return {
      data: [],
      meta: {
        type,
        source: 'restricted',
        requiresUpgrade: true,
        planKey: accessError.planKey,
        reason: accessError.message,
        generatedAt: new Date().toISOString(),
      },
    };
  }
}

export default LeaderboardService;

function extractPlanKey(message) {
  if (!message || typeof message !== 'string') {
    return null;
  }

  const bracketMatch = message.match(/\(([^)]+)\)/);
  if (bracketMatch && bracketMatch[1]) {
    return bracketMatch[1];
  }

  const keywordMatch = message.match(/plan\s([a-z0-9_\-]+)/i);
  return keywordMatch ? keywordMatch[1] : null;
}
