/**
 * Plan feature flag catalogue used by the subscription service and UI.
 * The values represent the default capabilities for each pricing tier; they
 * are merged with the plan-specific JSON stored in Supabase so remote
 * overrides always win.
 */

export const FEATURE_KEYS = Object.freeze({
  PACK_TRACKING: 'pack_tracking',
  COLLECTION_SYNC: 'collection_sync',
  LEADERBOARD_VIEW: 'leaderboard_view',
  PRICE_ALERTS: 'price_alerts',
  EXPORT_COLLECTION: 'export_collection',
  ADVANCED_STATS: 'advanced_stats',
  BULK_IMPORT: 'bulk_import',
  API_ACCESS: 'api_access',
});

export const FEATURE_DEFINITIONS = Object.freeze({
  [FEATURE_KEYS.PACK_TRACKING]: {
    label: 'Pack Tracking',
    description: 'Log pack openings and track ROI over time.',
  },
  [FEATURE_KEYS.COLLECTION_SYNC]: {
    label: 'Collection Sync',
    description: 'Synchronize card collections across devices.',
  },
  [FEATURE_KEYS.LEADERBOARD_VIEW]: {
    label: 'Leaderboard Access',
    description: 'View community leaderboards and rankings.',
  },
  [FEATURE_KEYS.PRICE_ALERTS]: {
    label: 'Price Alerts',
    description: 'Receive alerts when card prices change significantly.',
  },
  [FEATURE_KEYS.EXPORT_COLLECTION]: {
    label: 'Collection Export',
    description: 'Export collection data to CSV or spreadsheet formats.',
  },
  [FEATURE_KEYS.ADVANCED_STATS]: {
    label: 'Advanced Analytics',
    description: 'Unlock premium dashboards and trend insights.',
  },
  [FEATURE_KEYS.BULK_IMPORT]: {
    label: 'Bulk Import',
    description: 'Import large card batches from CSV or scanner workflows.',
  },
  [FEATURE_KEYS.API_ACCESS]: {
    label: 'API Access',
    description: 'Use the developer API for custom automations.',
  },
});

export const PLAN_FEATURE_FLAGS = Object.freeze({
  free: {
    [FEATURE_KEYS.PACK_TRACKING]: true,
    [FEATURE_KEYS.COLLECTION_SYNC]: true,
    [FEATURE_KEYS.LEADERBOARD_VIEW]: false,
    [FEATURE_KEYS.PRICE_ALERTS]: false,
    [FEATURE_KEYS.EXPORT_COLLECTION]: false,
    [FEATURE_KEYS.ADVANCED_STATS]: false,
    [FEATURE_KEYS.BULK_IMPORT]: false,
    [FEATURE_KEYS.API_ACCESS]: false,
  },
  basic: {
    [FEATURE_KEYS.PACK_TRACKING]: true,
    [FEATURE_KEYS.COLLECTION_SYNC]: true,
    [FEATURE_KEYS.LEADERBOARD_VIEW]: true,
    [FEATURE_KEYS.PRICE_ALERTS]: true,
    [FEATURE_KEYS.EXPORT_COLLECTION]: true,
    [FEATURE_KEYS.ADVANCED_STATS]: false,
    [FEATURE_KEYS.BULK_IMPORT]: false,
    [FEATURE_KEYS.API_ACCESS]: false,
  },
  pro: {
    [FEATURE_KEYS.PACK_TRACKING]: true,
    [FEATURE_KEYS.COLLECTION_SYNC]: true,
    [FEATURE_KEYS.LEADERBOARD_VIEW]: true,
    [FEATURE_KEYS.PRICE_ALERTS]: true,
    [FEATURE_KEYS.EXPORT_COLLECTION]: true,
    [FEATURE_KEYS.ADVANCED_STATS]: true,
    [FEATURE_KEYS.BULK_IMPORT]: true,
    [FEATURE_KEYS.API_ACCESS]: true,
  },
});

export function resolvePlanFeatureFlags(planKey, featureOverrides = {}) {
  const defaults = PLAN_FEATURE_FLAGS[planKey] || PLAN_FEATURE_FLAGS.free;
  return {
    ...defaults,
    ...(featureOverrides || {}),
  };
}

export function hasFeature(planFeatureMap, featureKey) {
  if (!planFeatureMap) {
    return false;
  }
  return Boolean(planFeatureMap[featureKey]);
}
