/**
 * Rarity Service
 *
 * Provides dynamic rarity data fetched from Supabase with caching.
 * Falls back to hardcoded defaults if Supabase is unavailable.
 */

import { supabase, isSupabaseAvailable } from '../lib/supabaseClient.js';

const CACHE_KEY = 'voxrip_rarities';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Fallback rarities if Supabase is unavailable
const DEFAULT_RARITIES = [
  { id: 1, rarity_key: 'common', rarity_name: 'Common', rarity_rank: 1, weight: 1.0, leaderboard_weight: 1.0 },
  { id: 2, rarity_key: 'rare', rarity_name: 'Rare', rarity_rank: 2, weight: 2.0, leaderboard_weight: 2.0 },
  { id: 3, rarity_key: 'super_rare', rarity_name: 'Super Rare', rarity_rank: 3, weight: 5.0, leaderboard_weight: 5.0 },
  { id: 4, rarity_key: 'ultra_rare', rarity_name: 'Ultra Rare', rarity_rank: 4, weight: 10.0, leaderboard_weight: 10.0 },
  { id: 5, rarity_key: 'secret_rare', rarity_name: 'Secret Rare', rarity_rank: 5, weight: 25.0, leaderboard_weight: 25.0 },
  { id: 6, rarity_key: 'ultimate_rare', rarity_name: 'Ultimate Rare', rarity_rank: 6, weight: 30.0, leaderboard_weight: 30.0 },
  { id: 7, rarity_key: 'ghost_rare', rarity_name: 'Ghost Rare', rarity_rank: 7, weight: 50.0, leaderboard_weight: 50.0 },
  { id: 8, rarity_key: 'starlight_rare', rarity_name: 'Starlight Rare', rarity_rank: 8, weight: 100.0, leaderboard_weight: 100.0 },
  { id: 9, rarity_key: 'quarter_century_secret_rare', rarity_name: 'Quarter Century Secret Rare', rarity_rank: 9, weight: 150.0, leaderboard_weight: 150.0 },
];

// In-memory cache for faster access
let raritiesCache = null;
let cacheTimestamp = 0;

/**
 * Normalizes a rarity key for lookup
 * @param {string} name - Rarity name or key
 * @returns {string} Normalized key
 */
function normalizeKey(name) {
  if (!name) return '';
  return name.toLowerCase().trim().replace(/\s+/g, '_').replace(/-/g, '_');
}

/**
 * Fetches all rarities from Supabase
 * @returns {Promise<Array>} Array of rarity objects
 */
async function fetchRaritiesFromSupabase() {
  if (!isSupabaseAvailable()) {
    console.log('[RarityService] Supabase unavailable, using defaults');
    return DEFAULT_RARITIES;
  }

  try {
    const { data, error } = await supabase.rpc('get_all_rarities');

    if (error) {
      console.error('[RarityService] Error fetching rarities:', error);
      return null;
    }

    console.log(`[RarityService] Fetched ${data?.length || 0} rarities from Supabase`);
    return data || [];
  } catch (err) {
    console.error('[RarityService] Exception fetching rarities:', err);
    return null;
  }
}

/**
 * Gets cached rarities from sessionStorage
 * @returns {Object|null} Cached data with timestamp, or null
 */
function getCachedRarities() {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    const age = Date.now() - timestamp;

    if (age > CACHE_TTL_MS) {
      console.log('[RarityService] Cache expired');
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }

    return { data, timestamp };
  } catch (err) {
    console.warn('[RarityService] Error reading cache:', err);
    return null;
  }
}

/**
 * Saves rarities to sessionStorage cache
 * @param {Array} data - Rarity data to cache
 */
function setCachedRarities(data) {
  try {
    const cacheEntry = {
      data,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cacheEntry));
  } catch (err) {
    console.warn('[RarityService] Error saving cache:', err);
  }
}

/**
 * Gets all rarities with caching
 * @param {boolean} forceRefresh - Skip cache and fetch fresh data
 * @returns {Promise<Array>} Array of rarity objects
 */
export async function getAllRarities(forceRefresh = false) {
  // Check in-memory cache first
  if (!forceRefresh && raritiesCache && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return raritiesCache;
  }

  // Check sessionStorage cache
  if (!forceRefresh) {
    const cached = getCachedRarities();
    if (cached) {
      raritiesCache = cached.data;
      cacheTimestamp = cached.timestamp;
      return cached.data;
    }
  }

  // Fetch from Supabase
  const data = await fetchRaritiesFromSupabase();

  if (data && data.length > 0) {
    raritiesCache = data;
    cacheTimestamp = Date.now();
    setCachedRarities(data);
    return data;
  }

  // Fallback to defaults
  console.log('[RarityService] Using fallback defaults');
  raritiesCache = DEFAULT_RARITIES;
  cacheTimestamp = Date.now();
  return DEFAULT_RARITIES;
}

/**
 * Gets a specific rarity by name or key
 * @param {string} name - Rarity name or key to look up
 * @returns {Promise<Object|null>} Rarity object or null
 */
export async function getRarity(name) {
  if (!name) return null;

  const rarities = await getAllRarities();
  const normalized = normalizeKey(name);

  // Try exact key match first
  let match = rarities.find(r => normalizeKey(r.rarity_key) === normalized);
  if (match) return match;

  // Try name match
  match = rarities.find(r => normalizeKey(r.rarity_name) === normalized);
  if (match) return match;

  // Try partial match (for variations like "Ultra Rare" vs "ultra_rare")
  match = rarities.find(r =>
    normalized.includes(normalizeKey(r.rarity_key)) ||
    normalizeKey(r.rarity_key).includes(normalized)
  );

  return match || null;
}

/**
 * Gets rarity weight for a given rarity name
 * @param {string} name - Rarity name or key
 * @param {boolean} useLeaderboardWeight - Use leaderboard weight instead of base weight
 * @returns {Promise<number>} Weight value (defaults to 1.0)
 */
export async function getRarityWeight(name, useLeaderboardWeight = false) {
  const rarity = await getRarity(name);
  if (!rarity) return 1.0;

  return useLeaderboardWeight
    ? (rarity.leaderboard_weight || rarity.weight || 1.0)
    : (rarity.weight || 1.0);
}

/**
 * Gets rarity rank for sorting
 * @param {string} name - Rarity name or key
 * @returns {Promise<number>} Rank value (defaults to 1)
 */
export async function getRarityRank(name) {
  const rarity = await getRarity(name);
  return rarity?.rarity_rank || 1;
}

/**
 * Builds a map of rarity names/keys to their data for efficient lookup
 * @returns {Promise<Map>} Map with normalized keys pointing to rarity objects
 */
export async function buildRarityMap() {
  const rarities = await getAllRarities();
  const map = new Map();

  for (const rarity of rarities) {
    // Add by key
    map.set(normalizeKey(rarity.rarity_key), rarity);
    // Add by name
    map.set(normalizeKey(rarity.rarity_name), rarity);
  }

  return map;
}

/**
 * Maps a rarity label to its canonical key
 * Used by catalogNormalizer for consistent rarity normalization
 * @param {string} label - Raw rarity label from TCGcsv or other sources
 * @returns {Promise<string>} Canonical rarity key
 */
export async function mapRarity(label) {
  if (!label) return 'common';

  const rarity = await getRarity(label);
  return rarity?.rarity_key || normalizeKey(label);
}

/**
 * Gets all rarities synchronously from cache (for use in sync contexts)
 * Must call getAllRarities() first to populate cache
 * @returns {Array} Cached rarities or defaults
 */
export function getAllRaritiesSync() {
  return raritiesCache || DEFAULT_RARITIES;
}

/**
 * Gets rarity weight synchronously from cache
 * @param {string} name - Rarity name or key
 * @param {boolean} useLeaderboardWeight - Use leaderboard weight
 * @returns {number} Weight value
 */
export function getRarityWeightSync(name, useLeaderboardWeight = false) {
  const rarities = getAllRaritiesSync();
  const normalized = normalizeKey(name);

  const rarity = rarities.find(r =>
    normalizeKey(r.rarity_key) === normalized ||
    normalizeKey(r.rarity_name) === normalized
  );

  if (!rarity) return 1.0;

  return useLeaderboardWeight
    ? (rarity.leaderboard_weight || rarity.weight || 1.0)
    : (rarity.weight || 1.0);
}

/**
 * Gets rarity rank synchronously from cache
 * @param {string} name - Rarity name or key
 * @returns {number} Rank value
 */
export function getRarityRankSync(name) {
  const rarities = getAllRaritiesSync();
  const normalized = normalizeKey(name);

  const rarity = rarities.find(r =>
    normalizeKey(r.rarity_key) === normalized ||
    normalizeKey(r.rarity_name) === normalized
  );

  return rarity?.rarity_rank || 1;
}

/**
 * Clears the rarity cache (useful for testing or admin updates)
 */
export function clearRarityCache() {
  raritiesCache = null;
  cacheTimestamp = 0;
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch (err) {
    // Ignore
  }
  console.log('[RarityService] Cache cleared');
}

// Export default rarities for reference
export { DEFAULT_RARITIES };
