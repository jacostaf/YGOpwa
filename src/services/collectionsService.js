/**
 * collectionsService.js
 *
 * Phase 4 Supabase integration for collection CRUD and summaries.
 * Provides typed helpers around the new RPCs & view exposed in the Phase 4
 * migration so UI callers can load/update collections without hand-crafting
 * PostgREST queries.
 */

import { supabase, isSupabaseAvailable } from '../lib/supabaseClient.js';

const COLLECTION_ITEMS_VIEW = 'user_collection_items';
const COLLECTION_SUMMARIES_TABLE = 'user_collection_summaries';
const UPSERT_FUNCTION = 'upsert_user_collection';
const BATCH_FUNCTION = 'batch_upsert_user_collections';
const CARD_VARIANTS_TABLE = 'card_variants';

/**
 * @typedef {Object} CollectionPricing
 * @property {number} currentPrice
 * @property {string|null} priceDate
 * @property {string|null} priceSource
 * @property {number} totalValue
 * @property {number|null} priceGain
 * @property {number|null} percentageGain
 * @property {number|null} priceAtPack
 * @property {string|null} packCurrency
 * @property {string|null} packedAt
 * @property {string|null} packEventId
 */

/**
 * @typedef {Object} CollectionRarity
 * @property {string|null} key
 * @property {string|null} name
 * @property {number|null} rank
 * @property {number} weight
 * @property {number} rareScoreContribution
 */

/**
 * @typedef {Object} CollectionSet
 * @property {number|null} id
 * @property {string|null} code
 * @property {string|null} name
 * @property {string|null} releaseDate
 */

/**
 * @typedef {Object} CollectionCard
 * @property {string|null} name
 * @property {string|null} slug
 * @property {string|null} number
 * @property {string|null} edition
 * @property {string|null} artStyle
 * @property {string|null} language
 */

/**
 * @typedef {Object} CollectionPackSnapshot
 * @property {string|null} eventId
 * @property {number|null} priceAtPack
 * @property {string|null} currency
 * @property {string|null} packedAt
 * @property {number|null} priceGain
 * @property {number|null} percentageGain
 */

/**
 * @typedef {Object} CollectionItem
 * @property {number} id
 * @property {string} userId
 * @property {string} cardVariantId
 * @property {number} quantity
 * @property {string|null} notes
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {CollectionCard} card
 * @property {CollectionSet} set
 * @property {CollectionRarity} rarity
 * @property {CollectionPricing} pricing
 * @property {CollectionPackSnapshot} pack
 */

/**
 * @typedef {Object} CollectionSummary
 * @property {number} totalQuantity
 * @property {number} totalMarketValue
 * @property {number} rareScore
 * @property {string|null} lastComputedAt
 */

/**
 * Custom error type for collection service failures.
 */
export class CollectionsServiceError extends Error {
  constructor(message, code = 'COLLECTIONS_ERROR', originalError = null, details = null) {
    super(message);
    this.name = 'CollectionsServiceError';
    this.code = code;
    this.originalError = originalError;
    this.details = details;
  }
}

function resolveClient(overrideClient) {
  if (overrideClient) {
    return overrideClient;
  }

  if (!isSupabaseAvailable()) {
    throw new CollectionsServiceError(
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

function mapRowToItem(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    cardVariantId: row.card_variant_id,
    quantity: normalizeNumber(row.quantity),
    notes: normalizeString(row.notes),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    card: {
      name: normalizeString(row.card_name),
      slug: normalizeString(row.card_slug),
      number: normalizeString(row.card_number),
      edition: normalizeString(row.edition),
      artStyle: normalizeString(row.art_style),
      language: normalizeString(row.language),
      productId: normalizeNumber(row.tcgcsv_product_id),  // TCGcsv product ID for direct price lookups
    },
    set: {
      id: row.set_id,
      code: normalizeString(row.set_code),
      name: normalizeString(row.set_name),
      releaseDate: normalizeString(row.set_release_date),
    },
    rarity: {
      key: normalizeString(row.rarity_key),
      name: normalizeString(row.rarity_name),
      rank: row.rarity_rank === null || row.rarity_rank === undefined ? null : Number(row.rarity_rank),
      weight: normalizeNumber(row.rarity_weight),
      rareScoreContribution: normalizeNumber(row.rare_score_contribution),
    },
    pricing: {
      currentPrice: normalizeNumber(row.current_price),
      priceDate: normalizeString(row.current_price_date),
      priceSource: normalizeString(row.price_source),
      totalValue: normalizeNumber(row.total_value),
      priceGain: normalizeNullableNumber(row.price_gain),
      percentageGain: normalizeNullableNumber(row.percentage_gain),
      priceAtPack: normalizeNullableNumber(row.last_pack_price),
      packCurrency: normalizeString(row.pack_price_currency),
      packedAt: normalizeString(row.last_packed_at),
      packEventId: normalizeString(row.pack_event_id),
    },
    pack: {
      eventId: normalizeString(row.pack_event_id),
      priceAtPack: normalizeNullableNumber(row.last_pack_price),
      currency: normalizeString(row.pack_price_currency),
      packedAt: normalizeString(row.last_packed_at),
      priceGain: normalizeNullableNumber(row.price_gain),
      percentageGain: normalizeNullableNumber(row.percentage_gain),
    },
  };
}

function mapSummaryRow(row) {
  if (!row) {
    return {
      totalQuantity: 0,
      totalMarketValue: 0,
      rareScore: 0,
      lastComputedAt: null,
    };
  }

  return {
    totalQuantity: normalizeNumber(row.total_quantity),
    totalMarketValue: normalizeNumber(row.total_market_value),
    rareScore: normalizeNumber(row.rare_score),
    lastComputedAt: normalizeString(row.last_computed_at),
  };
}

function handleSupabaseError(error, fallbackMessage, code = 'SUPABASE_ERROR') {
  if (!error) {
    return new CollectionsServiceError(fallbackMessage, code);
  }

  const message = error.message || fallbackMessage;
  const normalizedMessage = message.toLowerCase();
  const errorCode = error.code || code;

  if (errorCode === '22003' && normalizedMessage.includes('collection limit')) {
    const planKey = extractPlanKey(message);
    return new CollectionsServiceError(
      message,
      'PLAN_LIMIT_REACHED',
      error,
      { planKey }
    );
  }

  if (errorCode === '42501' && normalizedMessage.includes('plan')) {
    const planKey = extractPlanKey(message);
    return new CollectionsServiceError(
      message,
      'PLAN_ACCESS_DENIED',
      error,
      { planKey }
    );
  }

  return new CollectionsServiceError(message, errorCode, error);
}

async function fetchItemsByIds(client, ids = []) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return [];
  }

  const { data, error } = await client
    .from(COLLECTION_ITEMS_VIEW)
    .select('*')
    .in('id', ids)
    .order('updated_at', { ascending: false });

  if (error) {
    throw handleSupabaseError(error, 'Failed to load collection items after mutation', 'FETCH_AFTER_MUTATION_FAILED');
  }

  return (data || []).map(mapRowToItem);
}

/**
 * Fetch all collection items for the authenticated user.
 *
 * @param {Object} [options]
 * @param {string} [options.search] - case-insensitive search term applied to name, slug, or number.
 * @param {string} [options.setCode]
 * @param {string} [options.rarityKey]
 * @param {string} [options.language]
 * @param {string} [options.sortBy]
 * @param {'asc'|'desc'} [options.sortOrder]
 * @param {import('@supabase/supabase-js').SupabaseClient} [options.client]
 * @returns {Promise<{ items: CollectionItem[], error: CollectionsServiceError|null }>}
 */
export async function fetchCollectionItems(options = {}) {
  const {
    search,
    setCode,
    rarityKey,
    language,
    sortBy = 'card_name',
    sortOrder = 'asc',
    client: overrideClient,
  } = options;

  const client = resolveClient(overrideClient);

  try {
    let query = client
      .from(COLLECTION_ITEMS_VIEW)
      .select('*');

    if (search) {
      const term = `%${search.trim()}%`;
      query = query.or(
        `card_name.ilike.${term},card_slug.ilike.${term},card_number.ilike.${term}`
      );
    }

    if (setCode) {
      query = query.eq('set_code', setCode);
    }

    if (rarityKey) {
      query = query.eq('rarity_key', rarityKey);
    }

    if (language) {
      query = query.eq('language', language);
    }

    query = query.order(sortBy, { ascending: sortOrder !== 'desc' });

    const { data, error } = await query;

    if (error) {
      throw handleSupabaseError(error, 'Failed to fetch collection items', 'FETCH_COLLECTION_FAILED');
    }

    return {
      items: (data || []).map(mapRowToItem),
      error: null,
    };
  } catch (error) {
    if (error instanceof CollectionsServiceError) {
      return { items: [], error };
    }

    return {
      items: [],
      error: new CollectionsServiceError('Failed to fetch collection items', 'FETCH_COLLECTION_ERROR', error),
    };
  }
}

/**
 * Fetch a single collection item by its identifier.
 * @param {number} id
 * @param {Object} [options]
 * @param {import('@supabase/supabase-js').SupabaseClient} [options.client]
 * @returns {Promise<{ item: CollectionItem|null, error: CollectionsServiceError|null }>}
 */
export async function fetchCollectionItemById(id, options = {}) {
  const { client: overrideClient } = options;
  const client = resolveClient(overrideClient);

  if (id === undefined || id === null) {
    return {
      item: null,
      error: new CollectionsServiceError('Collection item id is required', 'INVALID_ARGUMENT'),
    };
  }

  try {
    const { data, error } = await client
      .from(COLLECTION_ITEMS_VIEW)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw handleSupabaseError(error, 'Failed to fetch collection item', 'FETCH_COLLECTION_ITEM_FAILED');
    }

    return {
      item: mapRowToItem(data),
      error: null,
    };
  } catch (error) {
    if (error instanceof CollectionsServiceError) {
      return { item: null, error };
    }

    return {
      item: null,
      error: new CollectionsServiceError('Failed to fetch collection item', 'FETCH_COLLECTION_ITEM_ERROR', error),
    };
  }
}

/**
 * Retrieve the summary aggregate for the current user.
 * @param {Object} [options]
 * @param {import('@supabase/supabase-js').SupabaseClient} [options.client]
 * @returns {Promise<{ summary: CollectionSummary, error: CollectionsServiceError|null }>}
 */
export async function fetchCollectionSummary(options = {}) {
  const { client: overrideClient } = options;
  const client = resolveClient(overrideClient);

  try {
    const { data, error } = await client
      .from(COLLECTION_SUMMARIES_TABLE)
      .select('*')
      .maybeSingle();

    if (error) {
      throw handleSupabaseError(error, 'Failed to fetch collection summary', 'FETCH_SUMMARY_FAILED');
    }

    return {
      summary: mapSummaryRow(data),
      error: null,
    };
  } catch (error) {
    if (error instanceof CollectionsServiceError) {
      return { summary: mapSummaryRow(null), error };
    }

    return {
      summary: mapSummaryRow(null),
      error: new CollectionsServiceError('Failed to fetch collection summary', 'FETCH_SUMMARY_ERROR', error),
    };
  }
}

/**
 * Resolve a card variant id from a slug.
 * @param {string} cardSlug
 * @param {Object} [options]
 * @param {import('@supabase/supabase-js').SupabaseClient} [options.client]
 * @returns {Promise<{ cardVariantId: string|null, error: CollectionsServiceError|null }>}
 */
export async function resolveCardVariantId(cardSlug, options = {}) {
  const { client: overrideClient } = options;
  const client = resolveClient(overrideClient);

  if (!cardSlug) {
    return {
      cardVariantId: null,
      error: new CollectionsServiceError('cardSlug is required to resolve card variant id', 'INVALID_ARGUMENT'),
    };
  }

  try {
    const { data, error } = await client
      .from(CARD_VARIANTS_TABLE)
      .select('id')
      .eq('card_slug', cardSlug)
      .maybeSingle();

    if (error) {
      throw handleSupabaseError(error, 'Failed to resolve card variant', 'RESOLVE_VARIANT_FAILED');
    }

    return {
      cardVariantId: data?.id ?? null,
      error: null,
    };
  } catch (error) {
    if (error instanceof CollectionsServiceError) {
      return { cardVariantId: null, error };
    }

    return {
      cardVariantId: null,
      error: new CollectionsServiceError('Failed to resolve card variant', 'RESOLVE_VARIANT_ERROR', error),
    };
  }
}

/**
 * Upsert a single collection entry using the Phase 4 RPC.
 *
 * @param {Object} input
 * @param {string} input.cardVariantId
 * @param {number} input.quantityDelta
 * @param {string} [input.changeType='add']
 * @param {string} [input.source='manual']
 * @param {string|null} [input.packEventId]
 * @param {Object} [input.metadata]
 * @param {string|null} [input.notes]
 * @param {import('@supabase/supabase-js').SupabaseClient} [input.client]
 * @returns {Promise<{ item: CollectionItem|null, error: CollectionsServiceError|null }>}
 */
export async function upsertCollectionItem(input = {}) {
  const {
    cardVariantId,
    quantityDelta,
    changeType = 'add',
    source = 'manual',
    packEventId = null,
    metadata = {},
    notes = null,
    client: overrideClient,
  } = input;

  const client = resolveClient(overrideClient);

  if (!cardVariantId) {
    return {
      item: null,
      error: new CollectionsServiceError('cardVariantId is required', 'INVALID_ARGUMENT'),
    };
  }

  const normalizedDelta = Number(quantityDelta);

  if (!Number.isFinite(normalizedDelta) || normalizedDelta === 0) {
    return {
      item: null,
      error: new CollectionsServiceError('quantityDelta must be a non-zero number', 'INVALID_ARGUMENT'),
    };
  }

  const normalizedMetadata = metadata && typeof metadata === 'object' ? metadata : {};
  const normalizedNotes = notes === undefined ? null : notes;

  try {
    const { data, error } = await client.rpc(UPSERT_FUNCTION, {
      p_card_variant_id: cardVariantId,
      p_quantity_delta: normalizedDelta,
      p_change_type: changeType,
      p_source: source,
      p_source_event_id: packEventId,
      p_metadata: normalizedMetadata,
      p_notes: normalizedNotes,
    });

    if (error) {
      throw handleSupabaseError(error, 'Failed to upsert collection item', 'UPSERT_FAILED');
    }

    const rows = Array.isArray(data) ? data : [];
    const ids = rows.map((row) => row.id).filter(Boolean);
    const items = await fetchItemsByIds(client, ids);

    return {
      item: items[0] ?? null,
      error: null,
    };
  } catch (error) {
    if (error instanceof CollectionsServiceError) {
      return { item: null, error };
    }

    return {
      item: null,
      error: new CollectionsServiceError('Failed to upsert collection item', 'UPSERT_ERROR', error),
    };
  }
}

/**
 * Convenience helper to remove quantity from a collection item.
 * @param {Object} input
 * @param {string} input.cardVariantId
 * @param {number} input.quantityDelta - positive number representing removal count.
 * @param {string|null} [input.notes]
 * @param {import('@supabase/supabase-js').SupabaseClient} [input.client]
 * @returns {Promise<{ item: CollectionItem|null, error: CollectionsServiceError|null }>}
 */
export async function removeCollectionQuantity(input = {}) {
  const { cardVariantId, quantityDelta, notes = null, client: overrideClient } = input;

  if (!Number.isFinite(quantityDelta) || quantityDelta <= 0) {
    return {
      item: null,
      error: new CollectionsServiceError('quantityDelta must be a positive number for removal', 'INVALID_ARGUMENT'),
    };
  }

  return upsertCollectionItem({
    cardVariantId,
    quantityDelta: -Math.abs(quantityDelta),
    changeType: 'remove',
    source: 'manual',
    metadata: {},
    notes,
    client: overrideClient,
  });
}

/**
 * Batch upsert helper for CSV or scanner imports.
 *
 * @param {Object} input
 * @param {Array<Object>} input.items - array of { cardVariantId, quantityDelta, changeType?, source?, packEventId?, metadata?, notes? }
 * @param {import('@supabase/supabase-js').SupabaseClient} [input.client]
 * @returns {Promise<{ items: CollectionItem[], error: CollectionsServiceError|null }>}
 */
export async function batchUpsertCollectionItems(input = {}) {
  const { items: payload = [], client: overrideClient } = input;
  const client = resolveClient(overrideClient);

  const sanitized = Array.isArray(payload)
    ? payload
        .filter((item) => item && item.cardVariantId && Number(item.quantityDelta))
        .map((item) => ({
          card_variant_id: item.cardVariantId,
          quantity_delta: Number(item.quantityDelta),
          change_type: item.changeType || 'import',
          source: item.source || 'import',
          source_event_id: item.packEventId || null,
          metadata: item.metadata || {},
          notes: item.notes ?? null,
        }))
    : [];

  if (sanitized.length === 0) {
    return {
      items: [],
      error: new CollectionsServiceError('At least one valid item is required for batch upsert', 'INVALID_ARGUMENT'),
    };
  }

  try {
    const { data, error } = await client.rpc(BATCH_FUNCTION, {
      p_payload: sanitized,
    });

    if (error) {
      throw handleSupabaseError(error, 'Failed to batch upsert collection items', 'BATCH_UPSERT_FAILED');
    }

    const rows = Array.isArray(data) ? data : [];
    const ids = rows.map((row) => row.id).filter(Boolean);
    const items = await fetchItemsByIds(client, ids);

    return { items, error: null };
  } catch (error) {
    if (error instanceof CollectionsServiceError) {
      return { items: [], error };
    }

    return {
      items: [],
      error: new CollectionsServiceError('Failed to batch upsert collection items', 'BATCH_UPSERT_ERROR', error),
    };
  }
}

function extractPlanKey(message) {
  if (!message || typeof message !== 'string') {
    return null;
  }

  const match = message.match(/\(([^)]+)\)/);
  if (match && match[1]) {
    return match[1];
  }

  const fallback = message.match(/plan\s([a-z0-9_\-]+)/i);
  return fallback ? fallback[1] : null;
}

/**
 * @typedef {Object} PriceHistoryEntry
 * @property {string} date - The price date (YYYY-MM-DD)
 * @property {number} price - The price value
 * @property {number|null} marketPrice - TCGPlayer market price
 * @property {number|null} lowPrice - TCGPlayer low price
 * @property {string} source - Price source (e.g., 'tcgplayer')
 */

/**
 * Fetch price history for a card variant.
 * Returns historical price data from the card_prices table.
 *
 * @param {Object} options
 * @param {string} options.cardVariantId - The card variant UUID
 * @param {number} [options.limit=30] - Maximum number of history entries to return
 * @param {import('@supabase/supabase-js').SupabaseClient} [options.client]
 * @returns {Promise<{ history: PriceHistoryEntry[], error: CollectionsServiceError|null }>}
 */
export async function fetchCardPriceHistory(options = {}) {
  const { cardVariantId, limit = 30, client: overrideClient } = options;
  const client = resolveClient(overrideClient);

  if (!cardVariantId) {
    return {
      history: [],
      error: new CollectionsServiceError('cardVariantId is required', 'INVALID_ARGUMENT'),
    };
  }

  try {
    const { data, error } = await client
      .from('card_prices')
      .select('price_date, price, price_market, price_low, source')
      .eq('card_variant_id', cardVariantId)
      .order('price_date', { ascending: false })
      .limit(limit);

    if (error) {
      throw handleSupabaseError(error, 'Failed to fetch price history', 'FETCH_PRICE_HISTORY_FAILED');
    }

    const history = (data || []).map(row => ({
      date: row.price_date,
      price: normalizeNumber(row.price),
      marketPrice: normalizeNullableNumber(row.price_market),
      lowPrice: normalizeNullableNumber(row.price_low),
      source: normalizeString(row.source) || 'unknown',
    }));

    // Reverse to chronological order for charts
    return {
      history: history.reverse(),
      error: null,
    };
  } catch (error) {
    if (error instanceof CollectionsServiceError) {
      return { history: [], error };
    }

    return {
      history: [],
      error: new CollectionsServiceError('Failed to fetch price history', 'FETCH_PRICE_HISTORY_ERROR', error),
    };
  }
}

/**
 * Fetch the single most expensive card in the current user's collection.
 * Returns the mapped item or null.
 */
export async function fetchTopCollectionCard(options = {}) {
  const client = resolveClient(options.client);
  try {
    const { data, error } = await client
      .from(COLLECTION_ITEMS_VIEW)
      .select('*')
      .order('current_price', { ascending: false, nullsFirst: false })
      .limit(1);

    if (error) {
      throw handleSupabaseError(error, 'Failed to fetch top collection card', 'FETCH_TOP_CARD_FAILED');
    }

    if (!data || data.length === 0) return { item: null, error: null };
    return { item: mapRowToItem(data[0]), error: null };
  } catch (error) {
    if (error instanceof CollectionsServiceError) {
      return { item: null, error };
    }
    return {
      item: null,
      error: new CollectionsServiceError('Failed to fetch top collection card', 'FETCH_TOP_CARD_ERROR', error),
    };
  }
}

export default {
  fetchCollectionItems,
  fetchCollectionItemById,
  fetchCollectionSummary,
  resolveCardVariantId,
  upsertCollectionItem,
  removeCollectionQuantity,
  batchUpsertCollectionItems,
  fetchCardPriceHistory,
  fetchTopCollectionCard,
};
