import { supabase, isSupabaseAvailable } from '../lib/supabaseClient.js';
import {
  FEATURE_KEYS,
  FEATURE_DEFINITIONS,
  resolvePlanFeatureFlags,
} from '../config/featureFlags.js';

const DEFAULT_PLAN_KEY = 'free';

function normalizeTimestamp(value) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function hydratePlan(row = {}) {
  const planKey = row.plan_key || DEFAULT_PLAN_KEY;
  const featureOverrides = row.features && typeof row.features === 'object' ? row.features : {};
  const featureFlags = resolvePlanFeatureFlags(planKey, featureOverrides);

  return {
    userId: row.user_id || null,
    planId: row.plan_id || null,
    planKey,
    planName: row.plan_name || row.plan_key || planKey,
    planSource: row.plan_source || 'default',
    status: row.status || 'canceled',
    cardLimit: Number.isFinite(row.card_limit) ? Number(row.card_limit) : null,
    leaderboardAccess: Boolean(row.leaderboard_access),
    monthlyPrice: Number.isFinite(row.monthly_price) ? Number(row.monthly_price) : null,
    annualPrice: Number.isFinite(row.annual_price) ? Number(row.annual_price) : null,
    currency: row.currency || 'USD',
    periodStart: normalizeTimestamp(row.period_start),
    periodEnd: normalizeTimestamp(row.period_end),
    isDefault: Boolean(row.is_default),
    rawFeatures: featureOverrides,
    planMetadata: row.plan_metadata && typeof row.plan_metadata === 'object'
      ? row.plan_metadata
      : {},
    features: featureFlags,
  };
}

export async function fetchActivePlan(options = {}) {
  const client = options.client || (isSupabaseAvailable() ? supabase : null);

  if (!client) {
    return {
      plan: null,
      error: 'Supabase is not configured',
    };
  }

  try {
    const params = {};
    if (options.userId) {
      params.p_user_id = options.userId;
    }

    const { data, error } = await client.rpc('get_user_plan_features', params);

    if (error) {
      throw error;
    }

    const row = Array.isArray(data) && data.length > 0 ? data[0] : null;

    if (!row) {
      return {
        plan: hydratePlan({
          plan_key: DEFAULT_PLAN_KEY,
          features: resolvePlanFeatureFlags(DEFAULT_PLAN_KEY),
          is_default: true,
        }),
        error: null,
      };
    }

    return {
      plan: hydratePlan(row),
      error: null,
    };
  } catch (error) {
    console.warn('subscriptionService.fetchActivePlan failed', error);
    const message = error?.message || 'Failed to load subscription';
    return { plan: null, error: message };
  }
}

export function canAccessLeaderboards(plan) {
  if (!plan) {
    return false;
  }
  return Boolean(plan.leaderboardAccess) && Boolean(plan.features?.[FEATURE_KEYS.LEADERBOARD_VIEW]);
}

export function resolveCardLimit(plan) {
  if (!plan || plan.cardLimit === null || plan.cardLimit === undefined) {
    return null;
  }
  return Number(plan.cardLimit);
}

export function isPlanUnlimited(plan) {
  const limit = resolveCardLimit(plan);
  return limit === null || limit < 0;
}

export function evaluateCollectionQuota(plan, currentVariantCount) {
  const limit = resolveCardLimit(plan);

  if (limit === null || limit < 0) {
    return {
      limit,
      remaining: Infinity,
      isUnlimited: true,
      willExceed: false,
    };
  }

  const remaining = Math.max(limit - Number(currentVariantCount || 0), 0);

  return {
    limit,
    remaining,
    isUnlimited: false,
    willExceed: remaining <= 0,
  };
}

export function listEnabledFeatures(plan) {
  if (!plan || !plan.features) {
    return [];
  }

  return Object.entries(plan.features)
    .filter(([, enabled]) => Boolean(enabled))
    .map(([key]) => ({
      key,
      ...FEATURE_DEFINITIONS[key],
    }));
}

export { FEATURE_KEYS, FEATURE_DEFINITIONS };
