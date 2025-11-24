import { describe, it, expect, vi } from 'vitest';
import {
  fetchActivePlan,
  canAccessLeaderboards,
  evaluateCollectionQuota,
  listEnabledFeatures,
  FEATURE_KEYS,
} from '../../services/subscriptionService.js';

function createMockClient(returnValue) {
  return {
    rpc: vi.fn().mockResolvedValue(returnValue),
  };
}

describe('subscriptionService', () => {
  it('hydrates plan payload from Supabase response', async () => {
    const mockRow = {
      user_id: '00000000-0000-0000-0000-000000000101',
      plan_id: 2,
      plan_key: 'basic',
      plan_name: 'Basic Plan',
      plan_source: 'subscription',
      status: 'active',
      features: { leaderboard_view: true, price_alerts: true },
      card_limit: 1000,
      leaderboard_access: true,
      monthly_price: 4.99,
      annual_price: 49.99,
      currency: 'USD',
      period_start: '2025-01-01T00:00:00Z',
      period_end: '2025-02-01T00:00:00Z',
      is_default: false,
      plan_metadata: { support: 'email' },
    };

    const client = createMockClient({ data: [mockRow], error: null });
    const { plan, error } = await fetchActivePlan({ client });

    expect(error).toBeNull();
    expect(plan.planKey).toBe('basic');
    expect(plan.planSource).toBe('subscription');
    expect(plan.features[FEATURE_KEYS.LEADERBOARD_VIEW]).toBe(true);
    expect(plan.features[FEATURE_KEYS.ADVANCED_STATS]).toBe(false);
    expect(plan.cardLimit).toBe(1000);
    expect(plan.periodStart).toBe('2025-01-01T00:00:00.000Z');
    expect(plan.periodEnd).toBe('2025-02-01T00:00:00.000Z');
    expect(canAccessLeaderboards(plan)).toBe(true);
  });

  it('falls back to default plan when Supabase returns null', async () => {
    const client = createMockClient({ data: [], error: null });
    const { plan, error } = await fetchActivePlan({ client });

    expect(error).toBeNull();
    expect(plan.planKey).toBe('free');
    expect(plan.isDefault).toBe(true);
    expect(canAccessLeaderboards(plan)).toBe(false);
  });

  it('propagates Supabase errors', async () => {
    const client = createMockClient({ data: null, error: { message: 'boom' } });
    const { plan, error } = await fetchActivePlan({ client });

    expect(plan).toBeNull();
    expect(error).toBe('boom');
  });

  it('evaluates collection quota boundaries', () => {
    const plan = {
      cardLimit: 5,
      features: { [FEATURE_KEYS.COLLECTION_SYNC]: true },
    };

    const withinQuota = evaluateCollectionQuota(plan, 3);
    expect(withinQuota.limit).toBe(5);
    expect(withinQuota.remaining).toBe(2);
    expect(withinQuota.willExceed).toBe(false);

    const atLimit = evaluateCollectionQuota(plan, 5);
    expect(atLimit.remaining).toBe(0);
    expect(atLimit.willExceed).toBe(true);

    const unlimited = evaluateCollectionQuota({ cardLimit: -1 }, 1000);
    expect(unlimited.isUnlimited).toBe(true);
    expect(unlimited.willExceed).toBe(false);
  });

  it('lists enabled features for UI display', () => {
    const plan = {
      features: {
        [FEATURE_KEYS.PACK_TRACKING]: true,
        [FEATURE_KEYS.ADVANCED_STATS]: false,
        [FEATURE_KEYS.API_ACCESS]: true,
      },
    };

    const enabled = listEnabledFeatures(plan);
    expect(enabled.map((item) => item.key)).toEqual([
      FEATURE_KEYS.PACK_TRACKING,
      FEATURE_KEYS.API_ACCESS,
    ]);
  });
});
