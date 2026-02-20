import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchCollectionItems,
  fetchCollectionSummary,
  upsertCollectionItem,
  removeCollectionQuantity,
  resolveCardVariantId,
} from '../../services/collectionsService.js';

function createQueryMock(result) {
  const finalResult = result ?? { data: [], error: null };
  return {
    _result: finalResult,
    or: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(finalResult),
    then(onFulfilled, onRejected) {
      return Promise.resolve(finalResult).then(onFulfilled, onRejected);
    },
  };
}

function createMockClient({ fromMap = {}, rpcImpl } = {}) {
  const rpcMock = rpcImpl || vi.fn();

  return {
    from: vi.fn((table) => {
      const factory = fromMap[table];
      if (!factory) {
        throw new Error(`Unexpected from(${table}) call`);
      }
      return typeof factory === 'function' ? factory() : factory;
    }),
    rpc: rpcMock,
  };
}

const sampleRow = {
  id: 10,
  user_id: 'user-1',
  card_variant_id: 'variant-1',
  quantity: 2,
  notes: 'Mint',
  created_at: '2025-02-01T00:00:00Z',
  updated_at: '2025-02-01T00:00:00Z',
  card_name: 'Blue-Eyes White Dragon',
  card_slug: 'blue-eyes-white-dragon',
  card_number: 'LOB-001',
  edition: '1st',
  art_style: 'classic',
  language: 'en',
  set_id: 99,
  set_code: 'LOB',
  set_name: 'Legend of Blue Eyes',
  rarity_key: 'ultra-rare',
  rarity_name: 'Ultra Rare',
  rarity_rank: 4,
  rarity_weight: 4,
  current_price: 15.5,
  price_source: 'tcgplayer',
  price_date: '2025-02-10',
  total_value: 31,
  rare_score_contribution: 8,
  pack_event_id: 'pack-1',
  last_pack_price: 12.5,
  last_packed_at: '2025-02-09T00:00:00Z',
  pack_price_currency: 'USD',
  price_gain: 3.0,
  percentage_gain: 19.35,
};

const sampleSummary = {
  total_quantity: 5,
  total_market_value: 100.5,
  rare_score: 12,
  last_computed_at: '2025-02-10T01:00:00Z',
};

describe('collectionsService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetchCollectionItems returns normalized items', async () => {
    const client = createMockClient({
      fromMap: {
        user_collection_items: () => createQueryMock({ data: [sampleRow], error: null }),
      },
    });

    const { items, hasMore, error } = await fetchCollectionItems({ client });

    expect(error).toBeNull();
    expect(items).toHaveLength(1);
    expect(hasMore).toBe(false);

    const item = items[0];
    expect(item.cardVariantId).toBe('variant-1');
    expect(item.quantity).toBe(2);
    expect(item.card.name).toBe('Blue-Eyes White Dragon');
    expect(item.set.name).toBe('Legend of Blue Eyes');
    expect(item.rarity.name).toBe('Ultra Rare');
    expect(item.pricing.currentPrice).toBe(15.5);
    expect(item.pricing.totalValue).toBe(31);
    expect(item.pricing.priceGain).toBe(3);
    expect(item.pricing.priceAtPack).toBe(12.5);
    expect(item.pricing.packCurrency).toBe('USD');
    expect(item.pricing.packEventId).toBe('pack-1');
    expect(item.pricing.packedAt).toBe('2025-02-09T00:00:00Z');
    expect(item.pricing.percentageGain).toBeCloseTo(19.35);
    expect(item.pack).toMatchObject({
      eventId: 'pack-1',
      priceAtPack: 12.5,
      currency: 'USD',
    });
    expect(item.pack.priceGain).toBe(3);
    expect(item.pack.percentageGain).toBeCloseTo(19.35);
    expect(item.pack.packedAt).toBe('2025-02-09T00:00:00Z');
  });

  it('fetchCollectionItems surfaces Supabase errors', async () => {
    const client = createMockClient({
      fromMap: {
        user_collection_items: () => createQueryMock({ data: null, error: { message: 'boom' } }),
      },
    });

    const { items, hasMore, error } = await fetchCollectionItems({ client });

    expect(items).toHaveLength(0);
    expect(hasMore).toBe(false);
    expect(error).toBeTruthy();
    expect(error.message).toContain('boom');
  });

  it('fetchCollectionSummary returns defaults when no row', async () => {
    const client = createMockClient({
      fromMap: {
        user_collection_summaries: () => createQueryMock({ data: null, error: null }),
      },
    });

    const { summary, error } = await fetchCollectionSummary({ client });

    expect(error).toBeNull();
    expect(summary).toMatchObject({
      totalQuantity: 0,
      totalMarketValue: 0,
      rareScore: 0,
    });
  });

  it('fetchCollectionSummary maps values correctly', async () => {
    const client = createMockClient({
      fromMap: {
        user_collection_summaries: () => createQueryMock({ data: sampleSummary, error: null }),
      },
    });

    const { summary } = await fetchCollectionSummary({ client });
    expect(summary).toEqual({
      totalQuantity: 5,
      totalMarketValue: 100.5,
      rareScore: 12,
      lastComputedAt: '2025-02-10T01:00:00Z',
    });
  });

  it('upsertCollectionItem returns fresh item data', async () => {
    const rpcResponse = [{ id: 10 }];

    const client = createMockClient({
      rpcImpl: vi.fn().mockResolvedValue({ data: rpcResponse, error: null }),
      fromMap: {
        user_collection_items: () => createQueryMock({ data: [sampleRow], error: null }),
      },
    });

    const { item, error } = await upsertCollectionItem({
      cardVariantId: 'variant-1',
      quantityDelta: 1,
      client,
    });

    expect(error).toBeNull();
    expect(item).toMatchObject({
      cardVariantId: 'variant-1',
      quantity: 2,
    });

    expect(client.rpc).toHaveBeenCalledWith('upsert_user_collection', expect.objectContaining({
      p_card_variant_id: 'variant-1',
      p_quantity_delta: 1,
    }));
  });

  it('upsertCollectionItem returns error when RPC fails', async () => {
    const client = createMockClient({
      rpcImpl: vi.fn().mockResolvedValue({ data: null, error: { message: 'rpc failed' } }),
      fromMap: {
        user_collection_items: () => createQueryMock({ data: [], error: null }),
      },
    });

    const { error } = await upsertCollectionItem({
      cardVariantId: 'variant-1',
      quantityDelta: 1,
      client,
    });

    expect(error).toBeTruthy();
    expect(error.message).toContain('rpc failed');
  });

  it('removeCollectionQuantity validates positive numbers', async () => {
    const { error } = await removeCollectionQuantity({
      cardVariantId: 'variant-1',
      quantityDelta: 0,
    });

    expect(error).toBeTruthy();
    expect(error.code).toBe('INVALID_ARGUMENT');
  });

  it('resolveCardVariantId returns null when slug missing', async () => {
    const { cardVariantId, error } = await resolveCardVariantId('', { client: createMockClient() });
    expect(cardVariantId).toBeNull();
    expect(error).toBeTruthy();
  });
});
