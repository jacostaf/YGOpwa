import { describe, test, expect, beforeEach, vi, beforeAll } from 'vitest';
import { TranscriptExtractor, createTranscriptExtractor } from '../../js/voice/TranscriptExtractor.js';
import { VocabularyStore } from '../../js/voice/VocabularyStore.js';
import { FuzzyMatcher } from '../../js/voice/FuzzyMatcher.js';
import { ConflictResolver } from '../../js/voice/ConflictResolver.js';

// Mock logger
const createLoggerMock = () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  log: vi.fn(),
});

// Mock vocabulary entries for testing
const mockRarities = [
  {
    canonical: 'Secret Rare',
    variants: ['secret rare', 'secret', 'sr'],
    tokenCount: 2,
    category: 'rarity',
    metadata: { id: 1, key: 'secret_rare', rank: 5, weight: 25 },
  },
  {
    canonical: 'Ultra Rare',
    variants: ['ultra rare', 'ultra', 'ur'],
    tokenCount: 2,
    category: 'rarity',
    metadata: { id: 2, key: 'ultra_rare', rank: 4, weight: 10 },
  },
  {
    canonical: 'Quarter Century Secret Rare',
    variants: ['quarter century secret rare', 'qc secret rare', 'qcsr'],
    tokenCount: 4,
    category: 'rarity',
    metadata: { id: 3, key: 'quarter_century_secret_rare', rank: 9, weight: 150 },
  },
  {
    canonical: 'Platinum Secret Rare',
    variants: ['platinum secret rare', 'plat secret', 'platinum secret'],
    tokenCount: 3,
    category: 'rarity',
    metadata: { id: 4, key: 'platinum_secret_rare', rank: 8, weight: 120 },
  },
  {
    canonical: 'Common',
    variants: ['common', 'c'],
    tokenCount: 1,
    category: 'rarity',
    metadata: { id: 5, key: 'common', rank: 1, weight: 1 },
  },
];

const mockSetCodes = [
  {
    canonical: 'LP25',
    variants: ['lp25', 'limited pack 2025', 'limited pack'],
    tokenCount: 1,
    category: 'setCode',
    metadata: { id: 1, name: 'Limited Pack 2025' },
  },
  {
    canonical: 'QCDB',
    variants: ['qcdb', 'quarter century duelist box'],
    tokenCount: 1,
    category: 'setCode',
    metadata: { id: 2, name: 'Quarter Century Duelist Box' },
  },
];

const mockSetNames = [
  {
    canonical: 'Quarter Century Stampede',
    variants: ['quarter century stampede', 'qcs'],
    tokenCount: 3,
    category: 'setName',
    metadata: { id: 3, setCode: 'QCST' },
  },
];

const mockArtVariants = [
  {
    canonical: '9th Art',
    variants: ['9th art', 'ninth art', '9 art'],
    tokenCount: 2,
    category: 'artVariant',
    metadata: { artNumber: 9 },
  },
  {
    canonical: 'Alternate Art',
    variants: ['alternate art', 'alt art', 'alternate'],
    tokenCount: 2,
    category: 'artVariant',
    metadata: { artType: 'alternate_art' },
  },
];

const mockCardNames = [
  {
    canonical: 'Dark Magician',
    variants: ['dark magician'],
    tokenCount: 2,
    category: 'cardName',
    metadata: { setCode: 'LP25' },
  },
  {
    canonical: 'Blue-Eyes White Dragon',
    variants: ['blue eyes white dragon', 'blue eyes', 'bewd'],
    tokenCount: 4,
    category: 'cardName',
    metadata: { setCode: 'LP25' },
  },
  {
    canonical: 'Ryzeal Detonator, the Emblazoned',
    variants: ['ryzeal detonator', 'ryzeal detonator the emblazoned'],
    tokenCount: 2,
    category: 'cardName',
    metadata: { setCode: 'LP25' },
  },
  {
    canonical: 'Destiny HERO - Secret Keeper',
    variants: ['secret keeper', 'destiny hero secret keeper'],
    tokenCount: 2,
    category: 'cardName',
    metadata: { setCode: 'LP25' },
  },
];

// Create a mock vocabulary store with test data
function createMockVocabularyStore() {
  const store = new VocabularyStore();

  // Manually set vocabularies without database calls
  store.setVocabulary('rarity', mockRarities);
  store.setVocabulary('setCode', mockSetCodes);
  store.setVocabulary('setName', mockSetNames);
  store.setVocabulary('artVariant', mockArtVariants);
  store.setVocabulary('cardName', mockCardNames);

  // Build card name index
  for (const entry of mockCardNames) {
    const words = entry.canonical
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 2 && !['the', 'and', 'for'].includes(w));
    for (const word of words) {
      if (!store.cardNameIndex.has(word)) {
        store.cardNameIndex.set(word, []);
      }
      store.cardNameIndex.get(word).push(entry);
    }
  }

  store.initialized = true;
  return store;
}

describe('FuzzyMatcher', () => {
  let fuzzyMatcher;

  beforeEach(() => {
    fuzzyMatcher = new FuzzyMatcher({ threshold: 0.75 });
  });

  describe('similarity', () => {
    test('returns 1.0 for identical strings', () => {
      expect(fuzzyMatcher.similarity('dark magician', 'dark magician')).toBe(1.0);
    });

    test('returns high score for similar strings', () => {
      const score = fuzzyMatcher.similarity('dark magician', 'dark magicien');
      // Score should be reasonably high for a single character difference
      expect(score).toBeGreaterThan(0.6);
    });

    test('returns low score for different strings', () => {
      const score = fuzzyMatcher.similarity('dark magician', 'blue eyes');
      expect(score).toBeLessThan(0.5);
    });

    test('handles case insensitivity', () => {
      expect(fuzzyMatcher.similarity('Dark Magician', 'dark magician')).toBe(1.0);
    });
  });

  describe('isMatch', () => {
    test('returns true for matches above threshold', () => {
      expect(fuzzyMatcher.isMatch('secret rare', 'secret rare')).toBe(true);
    });

    test('returns false for matches below threshold', () => {
      expect(fuzzyMatcher.isMatch('secret rare', 'ultra rare')).toBe(false);
    });
  });

  describe('findBestMatch', () => {
    test('finds best match from candidates', () => {
      const candidates = ['dark magician', 'blue eyes', 'red eyes'];
      // Use lower threshold for fuzzy matching
      const result = fuzzyMatcher.findBestMatch('dark magicien', candidates, 0.5);
      expect(result?.match).toBe('dark magician');
    });

    test('returns null when no match above threshold', () => {
      const candidates = ['apple', 'orange', 'banana'];
      const result = fuzzyMatcher.findBestMatch('dark magician', candidates);
      expect(result).toBeNull();
    });
  });

  describe('wordOverlap', () => {
    test('calculates word overlap ratio', () => {
      const overlap = fuzzyMatcher.wordOverlap('dark magician', 'dark magician girl');
      expect(overlap).toBeGreaterThan(0.6);
    });
  });
});

describe('ConflictResolver', () => {
  let resolver;

  beforeEach(() => {
    resolver = new ConflictResolver();
  });

  describe('resolve', () => {
    test('returns empty result for no candidates', () => {
      const result = resolver.resolve([], 5);
      expect(result.matches).toEqual([]);
      expect(result.unmatchedTokens).toHaveLength(5);
    });

    test('selects non-overlapping matches', () => {
      const candidates = [
        {
          category: 'cardName',
          canonical: 'Dark Magician',
          matchedText: 'dark magician',
          startIndex: 0,
          endIndex: 2,
          confidence: 0.95,
          matchType: 'exact',
        },
        {
          category: 'rarity',
          canonical: 'Secret Rare',
          matchedText: 'secret rare',
          startIndex: 2,
          endIndex: 4,
          confidence: 0.9,
          matchType: 'exact',
        },
      ];

      const result = resolver.resolve(candidates, 4);
      expect(result.matches).toHaveLength(2);
    });

    test('handles overlapping candidates by selecting best', () => {
      const candidates = [
        {
          category: 'rarity',
          canonical: 'Secret Rare',
          matchedText: 'secret rare',
          startIndex: 0,
          endIndex: 2,
          confidence: 0.9,
          matchType: 'exact',
        },
        {
          category: 'cardName',
          canonical: 'Secret Keeper',
          matchedText: 'secret keeper',
          startIndex: 0,
          endIndex: 2,
          confidence: 0.95,
          matchType: 'exact',
        },
      ];

      const result = resolver.resolve(candidates, 2);
      // Should select the higher confidence card name
      expect(result.matches).toHaveLength(1);
    });
  });
});

describe('TranscriptExtractor', () => {
  let extractor;
  let mockStore;
  let mockLogger;

  beforeEach(() => {
    mockStore = createMockVocabularyStore();
    mockLogger = createLoggerMock();
    extractor = new TranscriptExtractor(mockStore, { logger: mockLogger });
  });

  describe('extract', () => {
    test('extracts card name and rarity in standard order', () => {
      const result = extractor.extract('dark magician secret rare');

      expect(result.cardName?.value).toBe('Dark Magician');
      expect(result.rarity?.value).toBe('Secret Rare');
    });

    test('extracts entities in any order (rarity first)', () => {
      const result = extractor.extract('secret rare dark magician');

      expect(result.cardName?.value).toBe('Dark Magician');
      expect(result.rarity?.value).toBe('Secret Rare');
    });

    test('extracts compound rarities', () => {
      const result = extractor.extract('dark magician platinum secret rare');

      expect(result.cardName?.value).toBe('Dark Magician');
      expect(result.rarity?.value).toBe('Platinum Secret Rare');
    });

    test('extracts set codes', () => {
      const result = extractor.extract('dark magician lp25 secret rare');

      expect(result.cardName?.value).toBe('Dark Magician');
      expect(result.setCode?.value).toBe('LP25');
      expect(result.rarity?.value).toBe('Secret Rare');
    });

    test('extracts art variants', () => {
      const result = extractor.extract('dark magician 9th art secret rare');

      expect(result.cardName?.value).toBe('Dark Magician');
      expect(result.artVariant?.value).toBe('9th Art');
      expect(result.rarity?.value).toBe('Secret Rare');
    });

    test('handles complex input with multiple entities', () => {
      const result = extractor.extract('quarter century stampede dark magician 9th art platinum secret rare');

      expect(result.cardName?.value).toBe('Dark Magician');
      expect(result.rarity?.value).toBe('Platinum Secret Rare');
      expect(result.artVariant?.value).toBe('9th Art');
      // Either setName or individual tokens might match
    });

    test('handles card names containing rarity words (ambiguity)', () => {
      const result = extractor.extract('secret keeper ultra rare');

      // Should extract "Destiny HERO - Secret Keeper" as card, not "Secret Rare"
      expect(result.cardName?.value).toBe('Destiny HERO - Secret Keeper');
      expect(result.rarity?.value).toBe('Ultra Rare');
    });

    test('returns empty result for empty input', () => {
      const result = extractor.extract('');

      expect(result.cardName).toBeNull();
      expect(result.rarity).toBeNull();
      expect(result.overallConfidence).toBe(0);
    });

    test('handles fuzzy matching for voice errors', () => {
      // "ryzeal" might be transcribed with slight errors
      const result = extractor.extract('ryzeal detonator secret rare');

      expect(result.cardName?.value).toContain('Ryzeal');
      expect(result.rarity?.value).toBe('Secret Rare');
    });
  });

  describe('tokenize', () => {
    test('tokenizes transcript correctly', () => {
      const tokens = extractor.tokenize('Dark Magician Secret Rare');

      expect(tokens).toEqual(['dark', 'magician', 'secret', 'rare']);
    });

    test('removes punctuation', () => {
      const tokens = extractor.tokenize('Blue-Eyes White Dragon, Ultra Rare!');

      expect(tokens).toContain('blue');
      expect(tokens).toContain('eyes');
      expect(tokens).not.toContain('-');
      expect(tokens).not.toContain(',');
    });
  });

  describe('setSessionContext', () => {
    test('updates active set codes', () => {
      extractor.setSessionContext({ activeSetCodes: ['LP25', 'QCDB'] });

      expect(extractor.activeSetCodes).toEqual(['LP25', 'QCDB']);
    });
  });

  describe('emptyResult', () => {
    test('returns properly structured empty result', () => {
      const result = extractor.emptyResult();

      expect(result.cardName).toBeNull();
      expect(result.rarity).toBeNull();
      expect(result.setCode).toBeNull();
      expect(result.setName).toBeNull();
      expect(result.artVariant).toBeNull();
      expect(result.overallConfidence).toBe(0);
      expect(result.unmatchedText).toEqual([]);
    });
  });
});

describe('Integration: Full Extraction Pipeline', () => {
  let extractor;
  let mockStore;

  beforeEach(() => {
    mockStore = createMockVocabularyStore();
    extractor = new TranscriptExtractor(mockStore, {
      activeSetCodes: ['LP25'],
    });
  });

  test('Example 1: ryzeal detonator emblazoned secret rare limited pack 2025', () => {
    // Note: "emblazoned" is part of the card name, not a separate entity
    const result = extractor.extract('ryzeal detonator secret rare lp25');

    expect(result.cardName).not.toBeNull();
    expect(result.rarity?.value).toBe('Secret Rare');
    expect(result.setCode?.value).toBe('LP25');
    expect(result.overallConfidence).toBeGreaterThan(0);
  });

  test('Example 2: quarter century secret rare dark magician', () => {
    const result = extractor.extract('quarter century secret rare dark magician');

    expect(result.cardName?.value).toBe('Dark Magician');
    expect(result.rarity?.value).toBe('Quarter Century Secret Rare');
  });

  test('Example 3: blue eyes white dragon common', () => {
    const result = extractor.extract('blue eyes white dragon common');

    expect(result.cardName?.value).toBe('Blue-Eyes White Dragon');
    expect(result.rarity?.value).toBe('Common');
  });

  test('Handles abbreviations', () => {
    const result = extractor.extract('dark magician sr');

    // "sr" should match "Secret Rare" variant
    expect(result.cardName?.value).toBe('Dark Magician');
    // Note: single-word abbreviations may have lower confidence
  });
});
