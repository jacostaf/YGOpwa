/**
 * FilterSettings - Centralized filter configuration for the collection system
 *
 * This file consolidates all filter definitions, options, and defaults
 * to ensure consistency across the application.
 */

/**
 * Card type definitions with display labels and filter values
 */
export const CARD_TYPES = {
  ALL: { key: 'all', label: 'All', icon: 'layers' },
  MONSTER: { key: 'monster', label: 'Monsters', icon: 'shield' },
  SPELL: { key: 'spell', label: 'Spells', icon: 'sparkles' },
  TRAP: { key: 'trap', label: 'Traps', icon: 'alert-triangle' }
};

/**
 * Card type detection patterns
 * Used to categorize cards based on their type field
 */
export const CARD_TYPE_PATTERNS = {
  monster: [
    'normal monster',
    'effect monster',
    'ritual monster',
    'fusion monster',
    'synchro monster',
    'xyz monster',
    'pendulum',
    'link monster',
    'token',
    'flip effect monster',
    'gemini monster',
    'spirit monster',
    'toon monster',
    'tuner monster',
    'union effect monster'
  ],
  spell: ['spell card'],  // Only match 'spell card', not loose 'spell' (could match 'Spellcaster')
  trap: ['trap card']     // Only match 'trap card'
};

/**
 * Sort options for collection display
 */
export const SORT_OPTIONS = {
  DATE: { key: 'date', label: 'Date Added' },
  PRICE: { key: 'price', label: 'Price' },
  NAME: { key: 'name', label: 'Name' },
  RARITY: { key: 'rarity', label: 'Rarity' },
  SET: { key: 'set', label: 'Set' },
  QUANTITY: { key: 'quantity', label: 'Quantity' }
};

/**
 * Sort order options
 */
export const SORT_ORDERS = {
  ASC: { key: 'asc', label: 'Ascending' },
  DESC: { key: 'desc', label: 'Descending' }
};

/**
 * View mode options
 */
export const VIEW_MODES = {
  GRID: 'grid',
  LIST: 'list'
};

/**
 * Default filter state
 */
export const DEFAULT_FILTERS = {
  set: 'all',
  rarity: 'all',
  cardType: 'all',
  search: '',
  dateFrom: null,
  dateTo: null,
  collectionId: null
};

/**
 * Default sort state
 */
export const DEFAULT_SORT = {
  by: 'date',
  order: 'desc'
};

/**
 * Rarity tiers with display info
 */
export const RARITY_TIERS = {
  COMMON: { key: 'common', label: 'Common', color: '#9ca3af' },
  RARE: { key: 'rare', label: 'Rare', color: '#3b82f6' },
  SUPER_RARE: { key: 'super rare', label: 'Super Rare', color: '#10b981' },
  ULTRA_RARE: { key: 'ultra rare', label: 'Ultra Rare', color: '#f59e0b' },
  SECRET_RARE: { key: 'secret rare', label: 'Secret Rare', color: '#8b5cf6' },
  STARLIGHT_RARE: { key: 'starlight rare', label: 'Starlight Rare', color: '#ec4899' },
  COLLECTORS_RARE: { key: 'collectors rare', label: "Collector's Rare", color: '#06b6d4' },
  QUARTER_CENTURY: { key: 'quarter century secret rare', label: 'Quarter Century Secret Rare', color: '#fbbf24' },
  GHOST_RARE: { key: 'ghost rare', label: 'Ghost Rare', color: '#d1d5db' },
  PRISMATIC_SECRET: { key: 'prismatic secret rare', label: 'Prismatic Secret Rare', color: '#a855f7' }
};

/**
 * Determines the card category (monster/spell/trap) from card data
 * @param {Object} card - Card object with type information
 * @returns {string} - 'monster', 'spell', 'trap', or 'unknown'
 */
export function getCardCategory(card) {
  // First check if card already has cardType stored (from database)
  if (card.cardType && ['monster', 'spell', 'trap', 'unknown'].includes(card.cardType)) {
    return card.cardType;
  }

  // Check frameType first (simpler values from YGOPRODeck API)
  const frameType = (card.frameType || '').toLowerCase();
  if (frameType === 'spell') return 'spell';
  if (frameType === 'trap') return 'trap';
  if (['normal', 'effect', 'ritual', 'fusion', 'synchro', 'xyz', 'link', 'token'].includes(frameType)) {
    return 'monster';
  }

  // Fall back to type string pattern matching
  const cardType = (
    card.type ||
    card.card?.type ||
    card.card_type ||
    ''
  ).toLowerCase();

  // Check spell first
  for (const pattern of CARD_TYPE_PATTERNS.spell) {
    if (cardType.includes(pattern)) return 'spell';
  }

  // Check trap
  for (const pattern of CARD_TYPE_PATTERNS.trap) {
    if (cardType.includes(pattern)) return 'trap';
  }

  // Check monster patterns
  for (const pattern of CARD_TYPE_PATTERNS.monster) {
    if (cardType.includes(pattern)) return 'monster';
  }

  // Default to unknown if no match
  return 'unknown';
}

/**
 * Filters cards by card type (monster/spell/trap)
 * @param {Array} cards - Array of card objects
 * @param {string} cardType - 'all', 'monster', 'spell', or 'trap'
 * @returns {Array} - Filtered cards
 */
export function filterByCardType(cards, cardType) {
  if (!cardType || cardType === 'all') {
    return cards;
  }

  return cards.filter(card => getCardCategory(card) === cardType);
}

/**
 * Gets unique sets from a collection of cards
 * @param {Array} cards - Array of card objects
 * @returns {Array} - Array of unique set objects
 */
export function getUniqueSets(cards) {
  const setsMap = new Map();

  cards.forEach(card => {
    const setCode = card.set?.code || card.set_code;
    const setName = card.set?.name || card.set_name || 'Unknown Set';

    if (setCode && !setsMap.has(setCode)) {
      setsMap.set(setCode, { code: setCode, name: setName });
    }
  });

  return Array.from(setsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Gets unique rarities from a collection of cards
 * @param {Array} cards - Array of card objects
 * @returns {Array} - Array of unique rarity strings
 */
export function getUniqueRarities(cards) {
  const raritiesSet = new Set();

  cards.forEach(card => {
    const rarity = card.rarity?.name || card.rarity?.key || card.rarity || '';
    if (rarity) {
      raritiesSet.add(rarity);
    }
  });

  return Array.from(raritiesSet).sort();
}

export default {
  CARD_TYPES,
  CARD_TYPE_PATTERNS,
  SORT_OPTIONS,
  SORT_ORDERS,
  VIEW_MODES,
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  RARITY_TIERS,
  getCardCategory,
  filterByCardType,
  getUniqueSets,
  getUniqueRarities
};
