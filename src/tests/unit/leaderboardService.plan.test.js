import { describe, it, expect, vi } from 'vitest';
import LeaderboardService from '../../services/leaderboardService.js';

describe('LeaderboardService plan gating', () => {
  it('returns restricted payload when plan requires upgrade', async () => {
    const mockError = {
      code: '42501',
      message: 'Current plan (free) does not include leaderboard access',
    };

    const mockClient = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: mockError }),
    };

    const service = new LeaderboardService({ client: mockClient, ttlMs: 10 });
    const result = await service.fetchLeaderboard('value', { bypassCache: true });

    expect(mockClient.rpc).toHaveBeenCalledWith('get_leaderboard_entries', {
      p_leaderboard: 'value',
      p_limit: 20,
      p_offset: 0,
    });
    expect(result.source).toBe('restricted');
    expect(result.meta.requiresUpgrade).toBe(true);
    expect(result.meta.planKey).toBe('free');
    expect(result.error).toMatch(/plan/i);
  });
});
