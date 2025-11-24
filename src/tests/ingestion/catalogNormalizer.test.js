import { describe, it, expect } from 'vitest';
import {
  normalizeSetCode,
  extractCardNumber,
  inferEdition,
  determineArtStyle,
  mapRarity,
  buildCardSlug,
  normalizeCardRecord,
  chunk
} from '../../services/ingestion/catalogNormalizer.js';

describe('catalogNormalizer helpers', () => {
  it('normalizes set codes to prefix component', () => {
    expect(normalizeSetCode('LOB-EN001')).toBe('LOB');
    expect(normalizeSetCode('SDK-001')).toBe('SDK');
    expect(normalizeSetCode('POTE')).toBe('POTE');
    expect(normalizeSetCode(null)).toBe('UNKNOWN');
  });

  it('extracts card numbers from set codes', () => {
    expect(extractCardNumber('LOB-EN001')).toBe('EN001');
    expect(extractCardNumber('LOB-001')).toBe('001');
    expect(extractCardNumber('POTE')).toBeNull();
  });

  it('infers edition from set metadata', () => {
    expect(inferEdition({ set_name: 'Legendary Pack (1st Edition)' })).toBe('1st');
    expect(inferEdition({ set_rarity: 'Limited Edition' })).toBe('limited');
    expect(inferEdition({ set_name: 'Unlimited Print' })).toBe('unlimited');
    expect(inferEdition({})).toBe('unverified');
  });

  it('determines art style using image metadata', () => {
    expect(determineArtStyle([{ image_url: 'https://example.com/card.jpg' }])).toBe('classic');
    expect(determineArtStyle([{ image_url: '...prismatic...' }])).toBe('prismatic');
    expect(determineArtStyle([
      { image_url: 'a.jpg' },
      { image_url: 'b.jpg' }
    ])).toBe('alternate');
  });

  it('maps rarities including fallback behaviour', () => {
    const ultra = mapRarity('Ultra Rare');
    expect(ultra.key).toBe('ultra_rare');
    expect(ultra.weight).toBeGreaterThan(0);

    const unknown = mapRarity('Galaxy Rare');
    expect(unknown.key).toBe('common');
    expect(unknown.name).toBe('Galaxy Rare');
  });

  it('builds slugs combining card name set code and number', () => {
    const slug = buildCardSlug('Blue-Eyes White Dragon', 'LOB-EN001', 'EN001');
    expect(slug).toBe('blue-eyes-white-dragon-lob-en001');
  });

  it('chunks arrays into batches', () => {
    const result = chunk([1, 2, 3, 4, 5], 2);
    expect(result).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('normalizes full card payload', () => {
    const card = {
      name: 'Blue-Eyes White Dragon',
      card_sets: [
        {
          set_code: 'LOB-EN001',
          set_name: 'Legend of Blue Eyes White Dragon',
          set_rarity: 'Ultra Rare'
        }
      ],
      card_images: [
        { image_url: 'https://cdn.example.com/cards/blue-eyes.jpg' }
      ],
      card_prices: [
        { tcgplayer_price: '45.99' }
      ]
    };

    const normalized = normalizeCardRecord(card);
    expect(normalized.sets).toHaveLength(1);
    expect(normalized.rarities[0].rarity_key).toBe('ultra_rare');
    expect(normalized.variants[0].card_slug).toBe('blue-eyes-white-dragon-lob-en001');
    expect(normalized.prices[0].price).toBe(45.99);
  });
});
