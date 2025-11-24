/**
 * pricingService.js
 * Client for tcg_ygoripper pricing endpoints with ROI helpers.
 */

import { getEnv } from '../lib/config.js';
import { supabase, isSupabaseAvailable } from '../lib/supabaseClient.js';
import { calculatePriceDelta } from './ingestion/priceAnalysis.js';

const DEFAULT_BASE_URL = 'http://localhost:8081/api/v1';

function getBaseUrl() {
  const configured = getEnv('VITE_CARD_API_BASE_URL', DEFAULT_BASE_URL).trim();
  return configured || DEFAULT_BASE_URL;
}

function buildUrl(path = '') {
  const base = getBaseUrl().replace(/\/$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix}`;
}

async function request(path, options = {}) {
  const { method = 'GET', signal, headers = {}, body } = options;
  const response = await fetch(buildUrl(path), {
    method,
    signal,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let errorDetails;
    try {
      errorDetails = await response.json();
    } catch (error) {
      errorDetails = { error: { message: response.statusText } };
    }
    const message = errorDetails?.error?.message || 'Pricing request failed';
    const error = new Error(message);
    error.status = response.status;
    error.payload = errorDetails;
    throw error;
  }

  return response.json();
}

export function computeRoi(currentPrice, packPrice) {
  const current = Number.isFinite(currentPrice) ? Number(currentPrice) : null;
  const packed = Number.isFinite(packPrice) ? Number(packPrice) : null;

  if (current === null || packed === null) {
    return {
      absolute: null,
      percent: null,
    };
  }

  const delta = calculatePriceDelta(packed, current);
  return {
    absolute: delta.absolute,
    percent: delta.percent,
  };
}

function resolveDisplayPrice(quote, packSnapshot) {
  if (Number.isFinite(quote?.price)) {
    return Number(quote.price);
  }

  if (packSnapshot && Number.isFinite(packSnapshot.price_at_pack)) {
    return Number(packSnapshot.price_at_pack);
  }

  return null;
}

export function buildPackSnapshotMap(records = []) {
  const map = {};
  records.forEach((record) => {
    if (record && record.card_slug) {
      map[record.card_slug] = {
        card_slug: record.card_slug,
        price_at_pack: Number.isFinite(record.price_at_pack)
          ? Number(record.price_at_pack)
          : null,
        packed_at: record.packed_at ?? null,
        currency: record.currency ?? 'USD',
      };
    }
  });
  return map;
}

export async function loadPackSnapshotsFromSupabase(slugs = [], client = supabase) {
  if (!Array.isArray(slugs) || slugs.length === 0) {
    return {};
  }

  const activeClient = client ?? (isSupabaseAvailable() ? supabase : null);
  if (!activeClient) {
    return {};
  }

  try {
    const { data, error } = await activeClient
      .from('pack_price_snapshots')
      .select('card_slug, price_at_pack, packed_at, currency')
      .in('card_slug', slugs);

    if (error) {
      console.warn('pricingService.loadPackSnapshotsFromSupabase failed', error);
      return {};
    }

    return buildPackSnapshotMap(data || []);
  } catch (error) {
    console.warn('pricingService.loadPackSnapshotsFromSupabase unexpected failure', error);
    return {};
  }
}

export async function fetchPriceQuotes(slugs = [], options = {}) {
  const {
    signal,
    packSnapshots,
    includeRoi = true,
    loadPackSnapshots = true,
    supabaseClient,
  } = options;
  const uniqueSlugs = Array.from(new Set(slugs.filter(Boolean)));

  if (uniqueSlugs.length === 0) {
    return { quotes: [], meta: null, error: null };
  }

  try {
    const payload = await request('/prices/quotes', {
      method: 'POST',
      signal,
      body: { slugs: uniqueSlugs },
    });

    const quotes = Array.isArray(payload.data) ? payload.data : [];
    let snapshotsMap = packSnapshots;
    if (snapshotsMap === undefined && loadPackSnapshots) {
      snapshotsMap = await loadPackSnapshotsFromSupabase(uniqueSlugs, supabaseClient);
    }
    snapshotsMap = snapshotsMap || {};
    const enriched = quotes.map((quote) => {
      const slug = quote?.card_slug;
      const snapshot = slug ? snapshotsMap[slug] : undefined;
      const resolvedPrice = resolveDisplayPrice(quote, snapshot);
      const roi = includeRoi ? computeRoi(quote?.price, snapshot?.price_at_pack) : { absolute: null, percent: null };

      return {
        ...quote,
        resolvedPrice,
        packSnapshot: snapshot ?? null,
        roi,
        priceUnavailableReason: quote?.price === null ? quote?.availability?.reason ?? null : null,
      };
    });

    return {
      quotes: enriched,
      meta: {
        requestId: payload.meta?.request_id ?? null,
        generatedAt: payload.meta?.generated_at ?? null,
        total: payload.meta?.results ?? enriched.length,
      },
      error: null,
    };
  } catch (error) {
    console.warn('pricingService.fetchPriceQuotes failed', error);
    return { quotes: [], meta: null, error: error?.message || 'Failed to fetch prices' };
  }
}

export async function fetchSinglePrice(slug, options = {}) {
  if (!slug || typeof slug !== 'string') {
    return { quote: null, error: 'Card slug is required' };
  }

  try {
    const payload = await request(`/prices/${encodeURIComponent(slug)}`, { signal: options.signal });
    let snapshot = options.packSnapshot;
    if (snapshot === undefined && options.loadPackSnapshot !== false) {
      const map = await loadPackSnapshotsFromSupabase([slug], options.supabaseClient);
      snapshot = map[slug];
    }
    const resolvedPrice = resolveDisplayPrice(payload.data, snapshot);
    const roi = options.includeRoi === false
      ? { absolute: null, percent: null }
      : computeRoi(payload.data?.price, snapshot?.price_at_pack);

    return {
      quote: {
        ...payload.data,
        resolvedPrice,
        packSnapshot: snapshot ?? null,
        roi,
        priceUnavailableReason: payload.data?.price === null ? payload.data?.availability?.reason ?? null : null,
      },
      meta: {
        requestId: payload.meta?.request_id ?? null,
        generatedAt: payload.meta?.generated_at ?? null,
      },
      error: null,
    };
  } catch (error) {
    console.warn('pricingService.fetchSinglePrice failed', error);
    return { quote: null, error: error?.message || 'Failed to fetch price' };
  }
}

export default {
  fetchPriceQuotes,
  fetchSinglePrice,
  computeRoi,
  buildPackSnapshotMap,
  loadPackSnapshotsFromSupabase,
};
