import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchPackEventSummaries,
  fetchPackEventCards,
  fetchTopPackPull,
} from '../../services/packEventsService.js';

function createQueryMock(result) {
  const finalResult = result ?? { data: [], error: null };
  const chain = {
    _result: finalResult,
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
  };

  chain.then = (onFulfilled, onRejected) => Promise.resolve(finalResult).then(onFulfilled, onRejected);
  chain.catch = (onRejected) => Promise.resolve(finalResult).catch(onRejected);
  chain.finally = (onFinally) => Promise.resolve(finalResult).finally(onFinally);

  return chain;
}

function createMockClient({ fromMap = {} } = {}) {
  return {
    from: vi.fn((table) => {
      const factory = fromMap[table];
      if (!factory) {
        throw new Error(`Unexpected from(${table}) call`);
      }
      return typeof factory === 'function' ? factory() : factory;
    }),
  };
}

const summaryRow = {
  pack_event_id: 'pack-1',
  user_id: 'user-1',
  set_id: 99,
  set_code: 'LOB',
  set_name: 'Legend of Blue Eyes',
  pack_source: 'pack',
  pack_price_at_purchase: 4.0,
  packed_at: '2025-02-10T12:00:00Z',
  recorded_at: '2025-02-10T12:01:00Z',
  cards_opened: '[{"card_slug":"blue-eyes-white-dragon"}]',
  cards_tracked: 3,
  total_quantity: 3,
  total_pack_value: 12.5,
  total_current_value: 18.0,
  total_gain: 5.5,
  roi_percentage: 44.0,
  net_gain_vs_pack_cost: 14.0,
  roi_vs_pack_cost: 350.0,
};

const cardRow = {
  snapshot_id: 1,
  pack_event_id: 'pack-1',
  user_id: 'user-1',
  set_code: 'LOB',
  set_name: 'Legend of Blue Eyes',
  pack_source: 'pack',
  pack_price_at_purchase: 4.0,
  packed_at: '2025-02-10T12:00:00Z',
  recorded_at: '2025-02-10T12:01:00Z',
  card_variant_id: 'variant-1',
  card_slug: 'blue-eyes-white-dragon',
  card_name: 'Blue-Eyes White Dragon',
  card_number: 'LOB-001',
  edition: '1st',
  art_style: 'classic',
  language: 'en',
  rarity_key: 'ultra-rare',
  rarity_name: 'Ultra Rare',
  rarity_rank: 4,
  rarity_weight: 4,
  quantity: 1,
  current_price: 18.0,
  current_price_date: '2025-02-10',
  price_source: 'tcgplayer',
  price_at_pack: 12.5,
  currency: 'USD',
  price_gain: 5.5,
  percentage_gain: 44.0,
};

describe('packEventsService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetchPackEventSummaries normalizes summary rows', async () => {
    const queryMock = createQueryMock({ data: [summaryRow], error: null });
    const client = createMockClient({
      fromMap: {
        user_pack_event_summaries: () => queryMock,
      },
    });

    const { events, error } = await fetchPackEventSummaries({ client });

    expect(error).toBeNull();
    expect(events).toHaveLength(1);

    const event = events[0];
    expect(event.id).toBe('pack-1');
    expect(event.set).toMatchObject({ code: 'LOB', name: 'Legend of Blue Eyes' });
    expect(event.totalGain).toBe(5.5);
    expect(event.roiPercentage).toBe(44);
    expect(event.netGainVsPackCost).toBe(14);
    expect(event.cardsOpened).toEqual([{ card_slug: 'blue-eyes-white-dragon' }]);
    expect(queryMock.order).toHaveBeenCalledWith('packed_at', { ascending: false });
  });

  it('fetchPackEventCards normalizes card rows', async () => {
    const queryMock = createQueryMock({ data: [cardRow], error: null });
    const client = createMockClient({
      fromMap: {
        user_pack_event_cards: () => queryMock,
      },
    });

    const { cards, error } = await fetchPackEventCards('pack-1', { client });

    expect(error).toBeNull();
    expect(cards).toHaveLength(1);

    const card = cards[0];
    expect(card.packEventId).toBe('pack-1');
    expect(card.cardName).toBe('Blue-Eyes White Dragon');
    expect(card.currentPrice).toBe(18);
    expect(card.priceGain).toBe(5.5);
    expect(card.percentageGain).toBe(44);
    expect(queryMock.eq).toHaveBeenCalledWith('pack_event_id', 'pack-1');
  });

  it('fetchTopPackPull orders by desired metric', async () => {
    const queryMock = createQueryMock({ data: [cardRow], error: null });
    const client = createMockClient({
      fromMap: {
        user_pack_event_cards: () => queryMock,
      },
    });

    const { card, error } = await fetchTopPackPull({ sortBy: 'price_gain', client });

    expect(error).toBeNull();
    expect(card.cardSlug).toBe('blue-eyes-white-dragon');
    expect(queryMock.order).toHaveBeenCalledWith('price_gain', { ascending: false, nullsFirst: false });
  });
});
