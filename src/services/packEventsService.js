/**
 * packEventsService.js
 *
 * Helpers for querying pack event history, per-card ROI, and summaries from Supabase.
 */

import { supabase, isSupabaseAvailable } from '../lib/supabaseClient.js';

const PACK_SUMMARIES_VIEW = 'user_pack_event_summaries';
const PACK_CARDS_VIEW = 'user_pack_event_cards';

/**
 * @typedef {Object} PackEventSummary
 * @property {string} id
 * @property {string} userId
 * @property {Object} set
 * @property {string|null} set.code
 * @property {string|null} set.name
 * @property {string|null} setId
 * @property {string} source
 * @property {number|null} packCost
 * @property {string|null} packedAt
 * @property {string|null} recordedAt
 * @property {number} cardsTracked
 * @property {number} totalQuantity
 * @property {number} totalPackValue
 * @property {number} totalCurrentValue
 * @property {number} totalGain
 * @property {number|null} roiPercentage
 * @property {number|null} netGainVsPackCost
 * @property {number|null} roiVsPackCost
 * @property {any} cardsOpened
 */

/**
 * @typedef {Object} PackEventCard
 * @property {number} snapshotId
 * @property {string} packEventId
 * @property {string} userId
 * @property {string|null} cardVariantId
 * @property {string|null} cardSlug
 * @property {string|null} cardName
 * @property {string|null} cardNumber
 * @property {string|null} edition
 * @property {string|null} artStyle
 * @property {string|null} language
 * @property {string|null} rarityKey
 * @property {string|null} rarityName
 * @property {number|null} rarityRank
 * @property {number|null} rarityWeight
 * @property {number} quantity
 * @property {number|null} currentPrice
 * @property {string|null} currentPriceDate
 * @property {string|null} priceSource
 * @property {number|null} priceAtPack
 * @property {string|null} currency
 * @property {number|null} priceGain
 * @property {number|null} percentageGain
 */

export class PackEventsServiceError extends Error {
  constructor(message, code = 'PACK_EVENTS_ERROR', originalError = null) {
    super(message);
    this.name = 'PackEventsServiceError';
    this.code = code;
    this.originalError = originalError;
  }
}

function resolveClient(overrideClient) {
  if (overrideClient) {
    return overrideClient;
  }

  if (!isSupabaseAvailable()) {
    throw new PackEventsServiceError(
      'Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
      'SUPABASE_NOT_CONFIGURED'
    );
  }

  return supabase;
}

function normalizeNumber(value, fallback = 0) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return fallback;
  }
  return Number(value);
}

function normalizeNullableNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return null;
  }
  return Number(value);
}

function normalizeString(value) {
  if (value === null || value === undefined) {
    return null;
  }
  return String(value);
}

function parseJson(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn('packEventsService: Failed to parse json payload', error);
    return null;
  }
}

function mapSummaryRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: normalizeString(row.pack_event_id),
    userId: normalizeString(row.user_id),
    setId: row.set_id === null || row.set_id === undefined ? null : String(row.set_id),
    set: {
      code: normalizeString(row.set_code),
      name: normalizeString(row.set_name),
    },
    source: normalizeString(row.pack_source) || 'pack',
    packCost: normalizeNullableNumber(row.pack_price_at_purchase),
    packedAt: normalizeString(row.packed_at),
    recordedAt: normalizeString(row.recorded_at),
    cardsTracked: normalizeNumber(row.cards_tracked),
    totalQuantity: normalizeNumber(row.total_quantity),
    totalPackValue: normalizeNumber(row.total_pack_value),
    totalCurrentValue: normalizeNumber(row.total_current_value),
    totalGain: normalizeNumber(row.total_gain),
    roiPercentage: normalizeNullableNumber(row.roi_percentage),
    netGainVsPackCost: normalizeNullableNumber(row.net_gain_vs_pack_cost),
    roiVsPackCost: normalizeNullableNumber(row.roi_vs_pack_cost),
    cardsOpened: parseJson(row.cards_opened),
  };
}

function mapCardRow(row) {
  if (!row) {
    return null;
  }

  return {
    snapshotId: normalizeNumber(row.snapshot_id),
    packEventId: normalizeString(row.pack_event_id),
    userId: normalizeString(row.user_id),
    setCode: normalizeString(row.set_code),
    setName: normalizeString(row.set_name),
    packSource: normalizeString(row.pack_source) || 'pack',
    packCost: normalizeNullableNumber(row.pack_price_at_purchase),
    packedAt: normalizeString(row.packed_at),
    recordedAt: normalizeString(row.recorded_at),
    cardVariantId: normalizeString(row.card_variant_id),
    cardSlug: normalizeString(row.card_slug),
    cardName: normalizeString(row.card_name),
    cardNumber: normalizeString(row.card_number),
    edition: normalizeString(row.edition),
    artStyle: normalizeString(row.art_style),
    language: normalizeString(row.language),
    rarityKey: normalizeString(row.rarity_key),
    rarityName: normalizeString(row.rarity_name),
    rarityRank: normalizeNullableNumber(row.rarity_rank),
    rarityWeight: normalizeNullableNumber(row.rarity_weight),
    quantity: normalizeNumber(row.quantity, 1),
    currentPrice: normalizeNullableNumber(row.current_price),
    currentPriceDate: normalizeString(row.current_price_date),
    priceSource: normalizeString(row.price_source),
    priceAtPack: normalizeNullableNumber(row.price_at_pack),
    currency: normalizeString(row.currency),
    priceGain: normalizeNullableNumber(row.price_gain),
    percentageGain: normalizeNullableNumber(row.percentage_gain),
  };
}

function handleSupabaseError(error, fallbackMessage, code = 'SUPABASE_ERROR') {
  if (!error) {
    return new PackEventsServiceError(fallbackMessage, code);
  }

  const message = error.message || fallbackMessage;
  return new PackEventsServiceError(message, error.code || code, error);
}

/**
 * Fetch pack event summaries with optional filtering.
 *
 * @param {Object} [options]
 * @param {string} [options.source]
 * @param {string} [options.setCode]
 * @param {string} [options.from]
 * @param {string} [options.to]
 * @param {boolean} [options.profitableOnly]
 * @param {number} [options.limit=50]
 * @param {number} [options.offset=0]
 * @param {import('@supabase/supabase-js').SupabaseClient} [options.client]
 * @returns {Promise<{ events: PackEventSummary[], error: PackEventsServiceError|null }>}
 */
export async function fetchPackEventSummaries(options = {}) {
  const {
    source,
    setCode,
    from,
    to,
    profitableOnly = false,
    limit = 50,
    offset = 0,
    client: overrideClient,
  } = options;

  const client = resolveClient(overrideClient);

  try {
    let query = client.from(PACK_SUMMARIES_VIEW).select('*');

    if (source) {
      query = query.eq('pack_source', source);
    }

    if (setCode) {
      query = query.eq('set_code', setCode);
    }

    if (from) {
      query = query.gte('packed_at', from);
    }

    if (to) {
      query = query.lte('packed_at', to);
    }

    if (profitableOnly) {
      query = query.gt('total_gain', 0);
    }

    query = query.order('packed_at', { ascending: false });

    if (Number.isFinite(limit) && limit > 0) {
      const start = Number.isFinite(offset) && offset > 0 ? offset : 0;
      query = query.range(start, start + limit - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw handleSupabaseError(error, 'Failed to fetch pack history', 'FETCH_PACK_EVENTS_FAILED');
    }

    return {
      events: (data || []).map(mapSummaryRow).filter(Boolean),
      error: null,
    };
  } catch (error) {
    if (error instanceof PackEventsServiceError) {
      return { events: [], error };
    }

    return {
      events: [],
      error: new PackEventsServiceError('Failed to fetch pack history', 'FETCH_PACK_EVENTS_ERROR', error),
    };
  }
}

/**
 * Fetch cards opened in a specific pack event.
 *
 * @param {string} packEventId
 * @param {Object} [options]
 * @param {boolean} [options.profitableOnly]
 * @param {number} [options.limit]
 * @param {number} [options.offset]
 * @param {import('@supabase/supabase-js').SupabaseClient} [options.client]
 * @returns {Promise<{ cards: PackEventCard[], error: PackEventsServiceError|null }>}
 */
export async function fetchPackEventCards(packEventId, options = {}) {
  const {
    profitableOnly = false,
    limit,
    offset = 0,
    client: overrideClient,
  } = options;

  if (!packEventId) {
    return {
      cards: [],
      error: new PackEventsServiceError('packEventId is required', 'INVALID_ARGUMENT'),
    };
  }

  const client = resolveClient(overrideClient);

  try {
    let query = client
      .from(PACK_CARDS_VIEW)
      .select('*')
      .eq('pack_event_id', packEventId);

    if (profitableOnly) {
      query = query.gt('price_gain', 0);
    }

    query = query.order('current_price', { ascending: false, nullsFirst: false });

    if (Number.isFinite(limit) && limit > 0) {
      const start = Number.isFinite(offset) && offset > 0 ? offset : 0;
      query = query.range(start, start + limit - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw handleSupabaseError(error, 'Failed to fetch pack event cards', 'FETCH_PACK_CARDS_FAILED');
    }

    return {
      cards: (data || []).map(mapCardRow).filter(Boolean),
      error: null,
    };
  } catch (error) {
    if (error instanceof PackEventsServiceError) {
      return { cards: [], error };
    }

    return {
      cards: [],
      error: new PackEventsServiceError('Failed to fetch pack event cards', 'FETCH_PACK_CARDS_ERROR', error),
    };
  }
}

/**
 * Fetch the best single pack pull for the authenticated user.
 *
 * @param {Object} [options]
 * @param {'current_price'|'price_gain'} [options.sortBy='current_price']
 * @param {boolean} [options.profitableOnly=false]
 * @param {import('@supabase/supabase-js').SupabaseClient} [options.client]
 * @returns {Promise<{ card: PackEventCard|null, error: PackEventsServiceError|null }>}
 */
export async function fetchTopPackPull(options = {}) {
  const {
    sortBy = 'current_price',
    profitableOnly = false,
    client: overrideClient,
  } = options;

  const client = resolveClient(overrideClient);

  if (!['current_price', 'price_gain'].includes(sortBy)) {
    return {
      card: null,
      error: new PackEventsServiceError('Invalid sortBy value', 'INVALID_ARGUMENT'),
    };
  }

  try {
    let query = client
      .from(PACK_CARDS_VIEW)
      .select('*');

    if (profitableOnly) {
      query = query.gt('price_gain', 0);
    }

    query = query.order(sortBy, { ascending: false, nullsFirst: false }).limit(1);

    const { data, error } = await query;

    if (error) {
      throw handleSupabaseError(error, 'Failed to fetch top pack pull', 'FETCH_TOP_PULL_FAILED');
    }

    return {
      card: data && data.length > 0 ? mapCardRow(data[0]) : null,
      error: null,
    };
  } catch (error) {
    if (error instanceof PackEventsServiceError) {
      return { card: null, error };
    }

    return {
      card: null,
      error: new PackEventsServiceError('Failed to fetch top pack pull', 'FETCH_TOP_PULL_ERROR', error),
    };
  }
}

export default {
  fetchPackEventSummaries,
  fetchPackEventCards,
  fetchTopPackPull,
};
