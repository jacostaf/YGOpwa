import { describe, it, expect } from 'vitest';
import {
  calculatePriceDelta,
  isDeltaWithinBounds,
  guardPriceDrift,
  buildPriceMetadata
} from '../../services/ingestion/priceAnalysis.js';

describe('priceAnalysis helpers', () => {
  it('calculates absolute and percentage deltas', () => {
    const delta = calculatePriceDelta(10, 15);
    expect(delta.absolute).toBe(5);
    expect(delta.percent).toBe(50);
  });

  it('treats missing baseline as 100% delta when price increases from 0', () => {
    const delta = calculatePriceDelta(null, 20);
    expect(delta.absolute).toBe(20);
    expect(delta.percent).toBe(100);
  });

  it('validates bounds correctly', () => {
    const delta = { absolute: 12, percent: 30 };
    expect(isDeltaWithinBounds(delta, { maxAbsolute: 20, maxPercent: 40 })).toBe(true);
    expect(isDeltaWithinBounds(delta, { maxAbsolute: 10, maxPercent: 40 })).toBe(false);
  });

  it('throws when guard exceeds bounds', () => {
    expect(() => guardPriceDrift(5, 500, { maxPercent: 100 })).toThrow();
  });

  it('returns delta when guard passes', () => {
    const delta = guardPriceDrift(100, 120, { maxPercent: 50, maxAbsolute: 30 });
    expect(delta.absolute).toBe(20);
  });

  it('builds metadata payloads with rounding', () => {
    const metadata = buildPriceMetadata({ latencyMs: 123.45, confidence: 92.678, raw: { foo: 'bar' } });
    expect(metadata.source_latency_ms).toBe(123);
    expect(metadata.confidence_score).toBeCloseTo(92.68, 2);
    expect(metadata.metadata.raw).toEqual({ foo: 'bar' });
  });
});
