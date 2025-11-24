/**
 * Price ingestion utilities shared between scripts and tests.
 */

/**
 * Calculate absolute and percentage delta between two numeric prices.
 * @param {number|null|undefined} previous
 * @param {number|null|undefined} current
 * @returns {{ absolute: number, percent: number }}
 */
export function calculatePriceDelta(previous, current) {
  const prev = Number.isFinite(previous) ? Number(previous) : 0;
  const curr = Number.isFinite(current) ? Number(current) : 0;
  const absolute = Number(curr - prev);
  const baseline = prev === 0 ? curr : prev;
  const percent = baseline === 0 ? (absolute === 0 ? 0 : 100) : Number((absolute / baseline) * 100);

  return {
    absolute: Number(absolute.toFixed(2)),
    percent: Number(percent.toFixed(2))
  };
}

/**
 * Evaluate whether the delta remains inside configured bounds.
 * @param {{ absolute: number, percent: number }} delta
 * @param {{ maxAbsolute?: number, maxPercent?: number }} bounds
 * @returns {boolean}
 */
export function isDeltaWithinBounds(delta, bounds = {}) {
  const { maxAbsolute, maxPercent } = bounds;

  if (typeof maxAbsolute === 'number' && Math.abs(delta.absolute) > maxAbsolute) {
    return false;
  }

  if (typeof maxPercent === 'number' && Math.abs(delta.percent) > maxPercent) {
    return false;
  }

  return true;
}

/**
 * Throws if delta exceeds configured bounds. Useful for ingestion guard rails.
 * @param {number|null|undefined} previous
 * @param {number|null|undefined} current
 * @param {{ maxAbsolute?: number, maxPercent?: number, context?: object }} options
 */
export function guardPriceDrift(previous, current, options = {}) {
  const { maxAbsolute = 250, maxPercent = 400, context } = options;
  const delta = calculatePriceDelta(previous, current);

  if (!isDeltaWithinBounds(delta, { maxAbsolute, maxPercent })) {
    const error = new Error('Price drift exceeded configured bounds');
    error.delta = delta;
    error.context = context ?? {};
    throw error;
  }

  return delta;
}

/**
 * Assemble metadata payload stored alongside card_prices rows.
 * @param {object} params
 * @param {number} params.latencyMs
 * @param {number} params.confidence
 * @param {object} params.raw
 * @returns {{ source_latency_ms: number|null, confidence_score: number|null, metadata: object }}
 */
export function buildPriceMetadata({ latencyMs, confidence, raw } = {}) {
  const source_latency_ms = Number.isFinite(latencyMs) && latencyMs >= 0 ? Math.round(latencyMs) : null;
  const confidence_score = Number.isFinite(confidence) && confidence >= 0 ? Number(confidence.toFixed(2)) : null;

  const metadata = {
    raw: raw ?? null,
    confidence: confidence_score,
    latency_ms: source_latency_ms
  };

  return {
    source_latency_ms,
    confidence_score,
    metadata
  };
}

export default {
  calculatePriceDelta,
  isDeltaWithinBounds,
  guardPriceDrift,
  buildPriceMetadata
};
