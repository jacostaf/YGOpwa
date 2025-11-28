/**
 * CollectionManager.js
 * Service for managing card collection data across all sessions
 * Provides aggregation, filtering, sorting, and statistics
 */

import { supabase } from '../lib/supabaseClient.js';
import { authService } from './authService.js';

export class CollectionManager {
  constructor(sessionManager) {
    this.sessionManager = sessionManager;
    this.cache = {
      allCards: null,
      stats: null,
      lastUpdate: null,
      ttl: 5000, // 5 second cache
      userCollections: null,
      collectionsLastUpdate: null
    };
  }

  /**
   * Get user collections from Supabase
   * @returns {Promise<Array>} User collections
   */
  async getUserCollections() {
    const user = authService.getUser();
    if (!user || !supabase) return [];

    // Check cache
    if (this.cache.userCollections &&
      this.cache.collectionsLastUpdate &&
      (Date.now() - this.cache.collectionsLastUpdate < this.cache.ttl)) {
      return this.cache.userCollections;
    }

    try {
      const { data, error } = await supabase
        .from('user_collections')
        .select(`
          *,
          cards:collection_cards(*)
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      this.cache.userCollections = data;
      this.cache.collectionsLastUpdate = Date.now();
      return data;
    } catch (error) {
      console.error('Error fetching user collections:', error);
      return [];
    }
  }

  /**
   * Create a new collection
   * @param {string} name 
   * @param {string} description 
   */
  async createCollection(name, description = '') {
    const user = authService.getUser();
    if (!user || !supabase) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('user_collections')
      .insert({
        user_id: user.id,
        name,
        description
      })
      .select()
      .single();

    if (error) throw error;
    this.invalidateCache();
    return data;
  }

  /**
   * Delete a collection
   * @param {string} id 
   */
  async deleteCollection(id) {
    const user = authService.getUser();
    if (!user || !supabase) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('user_collections')
      .delete()
      .eq('id', id);

    if (error) throw error;
    this.invalidateCache();
  }

  /**
   * Add a card to a collection
   * @param {string} collectionId 
   * @param {Object} card 
   */
  async addCardToCollection(collectionId, card) {
    const user = authService.getUser();
    if (!user || !supabase) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('collection_cards')
      .insert({
        collection_id: collectionId,
        card_id: card.id || card.cardId, // Handle different ID formats
        name: card.name || card.cardName,
        set_code: card.setCode || card.set_code,
        rarity: card.rarity,
        quantity: card.quantity || 1
      })
      .select()
      .single();

    if (error) throw error;
    this.invalidateCache();
    return data;
  }

  /**
   * Remove a card from a collection
   * @param {string} cardId (The ID in collection_cards table)
   */
  async removeCardFromCollection(cardId) {
    const user = authService.getUser();
    if (!user || !supabase) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('collection_cards')
      .delete()
      .eq('id', cardId);

    if (error) throw error;
    this.invalidateCache();
  }

  /**
   * Get all cards from all user collections (flattened)
   * @returns {Promise<Array>} All user cards
   */
  async getAllUserCards() {
    const user = authService.getUser();
    if (!user || !supabase) return [];

    try {
      // Fetch all collections for user
      const { data: collections, error: colError } = await supabase
        .from('user_collections')
        .select('id, name')
        .eq('user_id', user.id);

      if (colError) throw colError;
      if (!collections || collections.length === 0) return [];

      const collectionIds = collections.map(c => c.id);

      // Fetch cards for these collections
      const { data: cards, error: cardError } = await supabase
        .from('collection_cards')
        .select('*')
        .in('collection_id', collectionIds);

      if (cardError) throw cardError;

      // Map to standardized format matching CollectionPage expectations
      return cards.map(card => {
        const collection = collections.find(c => c.id === card.collection_id);
        return {
          id: card.id,
          quantity: card.quantity || 1,
          createdAt: card.added_at || new Date().toISOString(),
          card: {
            name: card.name,
            number: card.set_code, // Fallback
          },
          set: {
            code: card.set_code,
            name: card.set_code // Fallback
          },
          rarity: {
            name: card.rarity,
            key: card.rarity
          },
          pricing: {
            currentPrice: 0,
            totalValue: 0
          },
          collectionName: collection?.name
        };
      });

    } catch (error) {
      console.error('Error fetching all user cards:', error);
      return [];
    }
  }

  /**
   * Invalidate collection cache
   */
  invalidateCache() {
    this.cache.userCollections = null;
    this.cache.collectionsLastUpdate = null;
  }

  /**
   * Inject externally sourced cards (e.g., Supabase) into the cache.
   * @param {Array} cards
   * @param {Object} [options]
   * @param {number} [options.ttl] - Cache TTL in ms (default: effectively infinite)
   */
  setExternalCards(cards = [], options = {}) {
    try {
      const ttl = Number.isFinite(options.ttl) ? options.ttl : Number.MAX_SAFE_INTEGER;
      const normalizedCards = Array.isArray(cards)
        ? cards.map(card => ({ ...card }))
        : [];

      this.cache.allCards = normalizedCards;
      this.cache.lastUpdate = Date.now();
      this.cache.ttl = ttl;

      // Invalidate derived stats cache since dataset changed
      this.cache.stats = null;

      return normalizedCards;
    } catch (error) {
      console.error('CollectionManager: Error setting external cards', error);
      return [];
    }
  }

  /**
   * Clear cached cards forcing a reload from the backing store.
   */
  clearCache() {
    this.cache.allCards = null;
    this.cache.stats = null;
    this.cache.lastUpdate = null;
    this.cache.ttl = 5000;
  }

  /**
   * Get all cards from all sessions
   * @returns {Array} Array of all cards with session metadata
   */
  getAllCards() {
    try {
      // Check cache
      if (this.cache.allCards && this.cache.lastUpdate &&
        (Date.now() - this.cache.lastUpdate < this.cache.ttl)) {
        return this.cache.allCards;
      }

      const allCards = [];

      // Get all sessions from SessionManager
      const sessions = this.sessionManager?.getAllSessions?.() || [];

      if (!Array.isArray(sessions)) {
        console.warn('CollectionManager: Sessions is not an array');
        return [];
      }

      // Aggregate cards from all sessions
      sessions.forEach(session => {
        if (!session || !Array.isArray(session.cards)) {
          return;
        }

        session.cards.forEach(card => {
          if (!card) return;

          // Add session metadata to each card
          allCards.push({
            ...card,
            sessionId: session.id,
            sessionName: session.name,
            sessionDate: session.createdAt || session.timestamp || Date.now(),
            addedAt: card.addedAt || session.createdAt || Date.now()
          });
        });
      });

      // Update cache
      this.cache.allCards = allCards;
      this.cache.lastUpdate = Date.now();

      return allCards;
    } catch (error) {
      console.error('CollectionManager: Error getting all cards', error);
      return [];
    }
  }

  /**
   * Get unique cards (grouped by card name and number)
   * @returns {Array} Array of unique cards with count
   */
  getUniqueCards() {
    try {
      const allCards = this.getAllCards();
      const uniqueMap = new Map();

      allCards.forEach(card => {
        const key = `${card.cardName || 'Unknown'}-${card.cardNumber || 'N/A'}`;
        const cardQuantity = Number(card.quantity) && Number(card.quantity) > 0
          ? Number(card.quantity)
          : 1;
        const unitValue = parseFloat(card.tcgLow) || 0;

        if (uniqueMap.has(key)) {
          const existing = uniqueMap.get(key);
          existing.count += cardQuantity;
          existing.totalValue = (existing.totalValue || 0) + (unitValue * cardQuantity);
        } else {
          uniqueMap.set(key, {
            ...card,
            count: cardQuantity,
            totalValue: unitValue * cardQuantity
          });
        }
      });

      return Array.from(uniqueMap.values());
    } catch (error) {
      console.error('CollectionManager: Error getting unique cards', error);
      return [];
    }
  }

  /**
   * Filter cards by criteria
   * @param {Array} cards - Cards to filter
   * @param {Object} filters - Filter criteria
   * @returns {Array} Filtered cards
   */
  filterCards(cards, filters = {}) {
    try {
      if (!Array.isArray(cards)) {
        return [];
      }

      let filtered = [...cards];

      // Filter by set
      if (filters.set && filters.set !== 'all') {
        filtered = filtered.filter(card =>
          card.setName === filters.set || card.setCode === filters.set
        );
      }

      // Filter by rarity
      if (filters.rarity && filters.rarity !== 'all') {
        filtered = filtered.filter(card =>
          card.rarity?.toLowerCase() === filters.rarity.toLowerCase()
        );
      }

      // Filter by date range
      if (filters.dateFrom) {
        const dateFrom = new Date(filters.dateFrom).getTime();
        filtered = filtered.filter(card => {
          const cardDate = card.addedAt || card.sessionDate || 0;
          return cardDate >= dateFrom;
        });
      }

      if (filters.dateTo) {
        const dateTo = new Date(filters.dateTo).getTime();
        filtered = filtered.filter(card => {
          const cardDate = card.addedAt || card.sessionDate || 0;
          return cardDate <= dateTo;
        });
      }

      // Filter by search query (card name or number)
      if (filters.search) {
        const query = filters.search.toLowerCase();
        filtered = filtered.filter(card =>
          (card.cardName || '').toLowerCase().includes(query) ||
          (card.cardNumber || '').toLowerCase().includes(query)
        );
      }

      return filtered;
    } catch (error) {
      console.error('CollectionManager: Error filtering cards', error);
      return cards;
    }
  }

  /**
   * Sort cards by criteria
   * @param {Array} cards - Cards to sort
   * @param {String} sortBy - Sort field (name, value, date, rarity)
   * @param {String} sortOrder - Sort order (asc, desc)
   * @returns {Array} Sorted cards
   */
  sortCards(cards, sortBy = 'date', sortOrder = 'desc') {
    try {
      if (!Array.isArray(cards)) {
        return [];
      }

      const sorted = [...cards];

      sorted.sort((a, b) => {
        let compareA, compareB;

        switch (sortBy) {
          case 'name':
            compareA = (a.cardName || '').toLowerCase();
            compareB = (b.cardName || '').toLowerCase();
            break;

          case 'value':
            compareA = parseFloat(a.tcgLow) || 0;
            compareB = parseFloat(b.tcgLow) || 0;
            break;

          case 'date':
            compareA = a.addedAt || a.sessionDate || 0;
            compareB = b.addedAt || b.sessionDate || 0;
            break;

          case 'rarity':
            const rarityOrder = {
              'common': 1,
              'rare': 2,
              'super rare': 3,
              'ultra rare': 4,
              'secret rare': 5,
              'ultimate rare': 6,
              'ghost rare': 7,
              'starlight rare': 8
            };
            compareA = rarityOrder[(a.rarity || 'common').toLowerCase()] || 0;
            compareB = rarityOrder[(b.rarity || 'common').toLowerCase()] || 0;
            break;

          case 'number':
            compareA = a.cardNumber || '';
            compareB = b.cardNumber || '';
            break;

          default:
            compareA = a.addedAt || 0;
            compareB = b.addedAt || 0;
        }

        // Compare values
        if (compareA < compareB) {
          return sortOrder === 'asc' ? -1 : 1;
        }
        if (compareA > compareB) {
          return sortOrder === 'asc' ? 1 : -1;
        }
        return 0;
      });

      return sorted;
    } catch (error) {
      console.error('CollectionManager: Error sorting cards', error);
      return cards;
    }
  }

  /**
   * Get collection statistics
   * @param {Array} cards - Optional cards array, defaults to all cards
   * @returns {Object} Collection statistics
   */
  getCollectionStats(cards = null) {
    try {
      // Use provided cards or get all cards
      const allCards = cards || this.getAllCards();

      if (!Array.isArray(allCards) || allCards.length === 0) {
        return {
          totalCards: 0,
          uniqueCards: 0,
          totalValue: 0,
          rareScore: 0,
          rarestCard: null,
          commonestRarity: null,
          sets: 0,
          avgValue: 0,
          rarityDistribution: {}
        };
      }

      let totalCards = 0;
      let totalValue = 0;
      let rarestCard = null;
      let highestRarityScore = -1;
      let totalRareScore = 0;

      const rarityDistribution = {};
      const rarityOrder = {
        'starlight rare': 8,
        'ghost rare': 7,
        'ultimate rare': 6,
        'secret rare': 5,
        'ultra rare': 4,
        'super rare': 3,
        'rare': 2,
        'common': 1
      };

      allCards.forEach(card => {
        const quantity = Number(card.quantity) && Number(card.quantity) > 0 ? Number(card.quantity) : 1;
        const unitValue = parseFloat(card.tcgLow) || 0;
        const rarityKey = (card.rarity || 'Common');
        const rarityScore = card.rareScoreContribution !== undefined
          ? parseFloat(card.rareScoreContribution) || 0
          : (rarityOrder[rarityKey.toLowerCase()] || 0) * quantity;

        totalCards += quantity;
        totalValue += unitValue * quantity;
        totalRareScore += rarityScore;

        rarityDistribution[rarityKey] = (rarityDistribution[rarityKey] || 0) + quantity;

        const rarityValue = (card.rarityWeight !== undefined
          ? parseFloat(card.rarityWeight) || 0
          : rarityOrder[rarityKey.toLowerCase()] || 0);

        if (rarityValue > highestRarityScore) {
          highestRarityScore = rarityValue;
          rarestCard = card;
        }
      });

      // Unique cards
      const uniqueCards = this.getUniqueCards().length;

      // Average value
      const avgValue = totalCards > 0 ? totalValue / totalCards : 0;

      // Commonest rarity
      let commonestRarity = null;
      let maxCount = 0;
      Object.entries(rarityDistribution).forEach(([rarity, count]) => {
        if (count > maxCount) {
          maxCount = count;
          commonestRarity = rarity;
        }
      });

      // Unique sets
      const uniqueSets = new Set(allCards.map(card => card.setName || card.setCode).filter(Boolean));
      const sets = uniqueSets.size;

      return {
        totalCards,
        uniqueCards,
        totalValue,
        rareScore: totalRareScore,
        rarestCard,
        commonestRarity,
        sets,
        avgValue,
        rarityDistribution
      };
    } catch (error) {
      console.error('CollectionManager: Error calculating stats', error);
      return {
        totalCards: 0,
        uniqueCards: 0,
        totalValue: 0,
        rareScore: 0,
        rarestCard: null,
        commonestRarity: null,
        sets: 0,
        avgValue: 0,
        rarityDistribution: {}
      };
    }
  }

  /**
   * Get all unique sets from collection
   * @returns {Array} Array of unique set names
   */
  getUniqueSets() {
    try {
      const allCards = this.getAllCards();
      const sets = new Set();

      allCards.forEach(card => {
        if (card.setName) {
          sets.add(card.setName);
        }
      });

      return Array.from(sets).sort();
    } catch (error) {
      console.error('CollectionManager: Error getting unique sets', error);
      return [];
    }
  }

  /**
   * Get all unique rarities from collection
   * @returns {Array} Array of unique rarities
   */
  getUniqueRarities() {
    try {
      const allCards = this.getAllCards();
      const rarities = new Set();

      allCards.forEach(card => {
        if (card.rarity) {
          rarities.add(card.rarity);
        }
      });

      return Array.from(rarities).sort();
    } catch (error) {
      console.error('CollectionManager: Error getting unique rarities', error);
      return [];
    }
  }

  /**
   * Export collection data to JSON
   * @returns {Object} Collection data
   */
  exportCollection() {
    try {
      const allCards = this.getAllCards();
      const stats = this.getCollectionStats(allCards);
      const uniqueSets = this.getUniqueSets();
      const uniqueRarities = this.getUniqueRarities();

      return {
        exportDate: new Date().toISOString(),
        cards: allCards,
        statistics: stats,
        sets: uniqueSets,
        rarities: uniqueRarities,
        version: '1.0'
      };
    } catch (error) {
      console.error('CollectionManager: Error exporting collection', error);
      return null;
    }
  }
}

export default CollectionManager;
