/**
 * cardMetadataService.js
 * Phase 3 client for the tcg_ygoripper aggregation layer (card metadata endpoints).
 */

import { getEnv } from '../lib/config.js';

const DEFAULT_BASE_URL = 'http://localhost:8081/api/v1';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const metadataCache = new Map();

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
    const message = errorDetails?.error?.message || 'Metadata request failed';
    const error = new Error(message);
    error.status = response.status;
    error.payload = errorDetails;
    throw error;
  }

  return response.json();
}

function getCached(slug) {
  const entry = metadataCache.get(slug);
  if (!entry) {
    return null;
  }

  if (Date.now() > entry.expiresAt) {
    metadataCache.delete(slug);
    return null;
  }

  return entry.data;
}

function setCache(slug, data) {
  metadataCache.set(slug, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export async function fetchCardBySlug(slug, options = {}) {
  const { forceRefresh = false, signal } = options;

  if (!slug || typeof slug !== 'string') {
    return { card: null, meta: null, error: 'Card slug is required' };
  }

  if (!forceRefresh) {
    const cached = getCached(slug);
    if (cached) {
      return {
        card: cached.card,
        meta: { ...cached.meta, cacheHit: true },
        error: null,
      };
    }
  }

  try {
    const payload = await request(`/cards/${encodeURIComponent(slug)}`, { signal });
    const result = {
      card: payload.data ?? null,
      meta: {
        requestId: payload.meta?.request_id ?? null,
        generatedAt: payload.meta?.generated_at ?? null,
        cacheHit: Boolean(payload.meta?.cache?.hit),
        cacheAgeSeconds: payload.meta?.cache?.age_seconds ?? null,
      },
      error: null,
    };

    setCache(slug, result);
    return result;
  } catch (error) {
    console.warn('cardMetadataService.fetchCardBySlug failed', error);
    return {
      card: null,
      meta: null,
      error: error?.message || 'Failed to fetch card metadata',
    };
  }
}

export async function fetchCardsBatch(slugs = [], options = {}) {
  const { signal } = options;
  const uniqueSlugs = Array.from(new Set(slugs.filter(Boolean)));

  if (uniqueSlugs.length === 0) {
    return { cards: [], errors: [], meta: null };
  }

  const payload = await request('/cards/batch', {
    method: 'POST',
    signal,
    body: { slugs: uniqueSlugs },
  });

  const cards = Array.isArray(payload.data) ? payload.data : [];
  const errors = Array.isArray(payload.meta?.errors) ? payload.meta.errors : [];

  cards.forEach((card) => {
    if (card?.card_slug) {
      setCache(card.card_slug, {
        card,
        meta: {
          requestId: payload.meta?.request_id ?? null,
          generatedAt: payload.meta?.generated_at ?? null,
          cacheHit: Boolean(payload.meta?.cache?.hit),
          cacheAgeSeconds: payload.meta?.cache?.age_seconds ?? null,
        },
      });
    }
  });

  return {
    cards,
    errors,
    meta: {
      requestId: payload.meta?.request_id ?? null,
      generatedAt: payload.meta?.generated_at ?? null,
    },
  };
}

export async function searchCards(query, options = {}) {
  const { limit = 10, signal } = options;
  if (!query || typeof query !== 'string') {
    return { cards: [], meta: null, error: 'Search query is required' };
  }

  try {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    const payload = await request(`/cards/search?${params.toString()}`, { signal });
    return {
      cards: Array.isArray(payload.data) ? payload.data : [],
      meta: {
        requestId: payload.meta?.request_id ?? null,
        generatedAt: payload.meta?.generated_at ?? null,
        total: payload.meta?.results ?? null,
      },
      error: null,
    };
  } catch (error) {
    console.warn('cardMetadataService.searchCards failed', error);
    return { cards: [], meta: null, error: error?.message || 'Failed to search cards' };
  }
}

export function clearMetadataCache() {
  metadataCache.clear();
}

export default {
  fetchCardBySlug,
  fetchCardsBatch,
  searchCards,
  clearMetadataCache,
};
