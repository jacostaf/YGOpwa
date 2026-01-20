/**
 * CollectionManager.js
 * Service for managing card collection data across all sessions
 * Provides aggregation, filtering, sorting, and statistics
 */

import { supabase } from '../lib/supabaseClient.js';
import { authService } from './authService.js';
import { PriceChecker } from '../js/price/PriceChecker.js';
import { Storage } from '../js/utils/Storage.js';
import { getRarityRankSync, getRarityWeightSync, getAllRarities } from './rarityService.js';
import { cacheCoordinator } from './CacheCoordinator.js';
import { getCardCategory } from '../config/FilterSettings.js';

export class CollectionManager {
  constructor(sessionManager) {
    this.sessionManager = sessionManager;
    // Initialize PriceChecker with storage for persistent caching
    this.storage = new Storage();
    this.priceChecker = new PriceChecker(this.storage);

    // Store initialization promise - allows awaiting before price operations
    this._priceCheckerReady = this._initializePriceChecker();

    this.cache = {
      allCards: null,
      stats: null,
      lastUpdate: null,
      ttl: 5000, // 5 second cache
      userCollections: null,
      collectionsLastUpdate: null
    };

    // Event system
    this.listeners = {
      priceUpdate: []
    };

    // Register with CacheCoordinator for cross-service cache invalidation
    this._registerWithCacheCoordinator();
  }

  /**
   * Register this service's cache with the CacheCoordinator
   * @private
   */
  _registerWithCacheCoordinator() {
    cacheCoordinator.registerCache('collection', {
      invalidate: () => this.invalidateCache(),
      clear: () => {
        this.invalidateCache();
        this.cache.allCards = null;
        this.cache.stats = null;
        this.cache.lastUpdate = null;
      }
    });
  }

  /**
   * Initialize PriceChecker with proper error handling
   * @returns {Promise<boolean>} Whether initialization succeeded
   * @private
   */
  async _initializePriceChecker() {
    try {
      await this.priceChecker.initialize();
      console.log('[CollectionManager] PriceChecker initialized successfully');
      return true;
    } catch (err) {
      console.warn('[CollectionManager] PriceChecker init failed:', err.message);
      return false;
    }
  }

  /**
   * Ensure PriceChecker is ready before performing price operations
   * @param {Object} options
   * @param {number} options.timeout - Max wait time in ms (default: 10000)
   * @returns {Promise<boolean>} Whether PriceChecker is ready
   */
  async ensurePriceCheckerReady({ timeout = 10000 } = {}) {
    // Race between init promise and timeout with proper cleanup
    let timeoutId;
    const timeoutPromise = new Promise((resolve) => {
      timeoutId = setTimeout(() => resolve(false), timeout);
    });

    try {
      const ready = await Promise.race([this._priceCheckerReady, timeoutPromise]);
      return ready;
    } catch (err) {
      console.warn('[CollectionManager] ensurePriceCheckerReady error:', err.message);
      return false;
    } finally {
      // Clean up timeout to prevent memory leaks
      clearTimeout(timeoutId);
    }
  }

  /**
   * Force re-initialization of PriceChecker (useful after network recovery)
   * @returns {Promise<boolean>} Whether re-initialization succeeded
   */
  async reinitializePriceChecker() {
    this._priceCheckerReady = this._initializePriceChecker();
    return this.ensurePriceCheckerReady();
  }

  subscribe(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  unsubscribe(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  notify(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }

  /**
   * Get user collections from Supabase
   * @returns {Promise<Array>} User collections
   */
  async getUserCollections() {
    const { user } = await authService.getCurrentUser();
    console.log('[CollectionManager] getUserCollections - User:', user?.id || 'null');
    if (!user || !supabase) return [];

    // Check cache
    if (this.cache.userCollections &&
      this.cache.collectionsLastUpdate &&
      (Date.now() - this.cache.collectionsLastUpdate < this.cache.ttl)) {
      console.log('[CollectionManager] Returning cached collections:', this.cache.userCollections.length);
      return this.cache.userCollections;
    }

    try {
      console.log('[CollectionManager] Fetching collections from Supabase for user:', user.id);
      const { data, error } = await supabase
        .from('user_collections')
        .select(`
          *,
          cards:collection_cards(*)
        `)
        .eq('user_id', user.id) // Ensure we filter by user_id
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('[CollectionManager] Supabase error fetching collections:', error);
        throw error;
      }

      console.log('[CollectionManager] Fetched collections:', data?.length || 0);
      this.cache.userCollections = data;
      this.cache.collectionsLastUpdate = Date.now();
      return data;
    } catch (error) {
      console.error('[CollectionManager] Error fetching user collections:', error);
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
    console.log('[CollectionManager] deleteCollection called for id:', id);
    const user = authService.getUser();
    if (!user || !supabase) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('user_collections')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[CollectionManager] deleteCollection error:', error);
      throw error;
    }

    console.log('[CollectionManager] deleteCollection success, invalidating cache');
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

    console.log('[CollectionManager] Adding card to collection:', collectionId, card);

    // Determine card type (monster/spell/trap) using FilterSettings utility
    const cardType = getCardCategory(card);

    const { data, error } = await supabase
      .from('collection_cards')
      .insert({
        collection_id: collectionId,
        card_id: card.productId || card.card?.productId || card.tcgcsv_product_id || card.product_id || card.id, // TCGcsv product ID
        name: card.name || card.cardName,
        set_code: card.setCode || card.set_code,
        rarity: card.rarity,
        card_type: cardType, // Store card type for filtering
        quantity: card.quantity || 1
      })
      .select()
      .single();

    if (error) {
      console.error('[CollectionManager] Error adding card:', error);
      throw error;
    }

    console.log('[CollectionManager] Card added successfully:', data);
    this.invalidateCache();
    return data;
  }

  /**
   * Create a pack event with price snapshots for cards being added
   * This captures the price at the moment cards are packed for ROI tracking
   * @param {string} userId - User's ID
   * @param {string|number} setId - Set ID from card_sets table (can be null)
   * @param {Array} cards - Array of card objects being added
   * @param {string} setCode - Set code for the pack (e.g., 'SUDA')
   * @returns {Promise<Object>} The created pack event
   */
  async createPackEventWithPrices(userId, setId, cards, setCode = null) {
    console.log('[CollectionManager] createPackEventWithPrices CALLED with:', {
      userId,
      setId,
      setCode,
      cardsCount: cards?.length,
      supabaseAvailable: !!supabase
    });

    if (!userId || !supabase || !cards || cards.length === 0) {
      console.warn('[CollectionManager] createPackEventWithPrices: Missing required params', {
        hasUserId: !!userId,
        hasSupabase: !!supabase,
        hasCards: !!cards,
        cardsLength: cards?.length || 0
      });
      return null;
    }

    try {
      console.log(`[CollectionManager] Creating pack event for ${cards.length} cards`);

      // Resolve set_id: look up from card_sets to ensure it's valid
      // OPTIMIZATION: Use a single query with OR conditions instead of multiple sequential queries
      let resolvedSetId = null;
      const lookupValue = setCode || setId;
      const setName = cards[0]?.setName || cards[0]?.set_name || cards[0]?.setInfo?.setName;

      if (lookupValue || setName) {
        let setData = null;

        // Build a single optimized query that checks multiple conditions
        // Priority: set_code > exact name > numeric id
        const isNumericId = lookupValue && /^\d+$/.test(String(lookupValue));

        if (!isNumericId && lookupValue) {
          // Try set_code first (most common case)
          const { data, error } = await supabase
            .from('card_sets')
            .select('id, set_code, name')
            .eq('set_code', lookupValue)
            .limit(1);
          if (!error && data && data.length > 0) {
            setData = data[0];
            console.log(`[CollectionManager] Found set by code "${lookupValue}": ${setData.name} (id: ${setData.id})`);
          }
        }

        // If not found by code, try name-based lookups in a single query with OR
        if (!setData && setName) {
          // Use a single query with or() for both exact and fuzzy match
          // Exact match is checked first in result processing
          const { data, error } = await supabase
            .from('card_sets')
            .select('id, set_code, name')
            .or(`name.eq.${setName},name.ilike.%${setName}%`)
            .limit(5);

          if (!error && data && data.length > 0) {
            // Prefer exact match
            setData = data.find(s => s.name === setName) || data[0];
            const matchType = setData.name === setName ? 'exact' : 'fuzzy';
            console.log(`[CollectionManager] Found set by ${matchType} name "${setName}": ${setData.set_code} (id: ${setData.id})`);
          } else {
            console.log(`[CollectionManager] Set not found in database: "${setName}" (code: ${lookupValue})`);
          }
        }

        // Last resort: try by numeric id
        if (!setData && isNumericId) {
          const { data, error } = await supabase
            .from('card_sets')
            .select('id, set_code, name')
            .eq('id', parseInt(lookupValue, 10))
            .limit(1);
          if (!error && data && data.length > 0) {
            setData = data[0];
          }
        }

        resolvedSetId = setData?.id || null;
        console.log(`[CollectionManager] Resolved set to id: ${resolvedSetId} (lookup: "${lookupValue}", name: "${setName}")`);
      }

      // Calculate total pack value from card prices
      const packTotalValue = cards.reduce((total, c) => {
        const price = parseFloat(c.price) || parseFloat(c.tcg_price) || parseFloat(c.tcg_market_price) || 0;
        return total + price;
      }, 0);

      console.log(`[CollectionManager] Pack total value: $${packTotalValue.toFixed(2)}`);

      // 1. Create pack_events entry
      const { data: packEvent, error: packError } = await supabase
        .from('pack_events')
        .insert({
          user_id: userId,
          set_id: resolvedSetId,
          pack_source: 'pack',
          pack_price_at_purchase: packTotalValue > 0 ? packTotalValue : null,
          packed_at: new Date().toISOString(),
          cards_opened: cards.map(c => ({
            name: c.name || c.cardName,
            rarity: c.rarity,
            set_code: c.setCode || c.set_code || setCode,
            card_id: c.productId || c.card?.productId || c.tcgcsv_product_id || c.product_id,
            price: parseFloat(c.price) || parseFloat(c.tcg_price) || parseFloat(c.tcg_market_price) || 0
          })),
          metadata: { set_code: setCode }
        })
        .select()
        .single();

      if (packError) {
        console.error('[CollectionManager] Error creating pack_event:', packError);
        throw packError;
      }

      console.log('[CollectionManager] Created pack_event:', packEvent.id);

      // 2. Get card variant IDs and current prices for all cards
      // Use productId (TCGcsv product ID), not the session-generated id
      // Also check tcgcsv_product_id which may come from API response
      const productIds = cards
        .map(c => parseInt(c.productId || c.card?.productId || c.tcgcsv_product_id || c.product_id, 10))
        .filter(id => !isNaN(id));

      console.log('[CollectionManager] Product IDs for variant lookup:', productIds);

      let variants = [];
      const variantMap = new Map(); // Maps either productId or card name to variant data

      // Strategy 1: Lookup by product ID if we have them
      if (productIds.length > 0) {
        const { data: productVariants, error: variantError } = await supabase
          .from('card_variants')
          .select('id, tcgcsv_product_id, card_slug, card_name')
          .in('tcgcsv_product_id', productIds);

        if (!variantError && productVariants && productVariants.length > 0) {
          variants = productVariants;
          productVariants.forEach(v => {
            variantMap.set(String(v.tcgcsv_product_id), {
              id: v.id,
              slug: v.card_slug,
              name: v.card_name
            });
          });
          console.log(`[CollectionManager] Found ${productVariants.length} variants by product ID`);
        }
      }

      // Strategy 2: If no product IDs or no matches, try lookup by card name + set code
      if (variantMap.size === 0) {
        console.log('[CollectionManager] No product IDs available, trying card name + set code lookup');
        console.log('[CollectionManager] First card sample:', cards[0] ? {
          name: cards[0].name || cards[0].cardName,
          setCode: cards[0].setCode || cards[0].set_code || setCode,
          rarity: cards[0].rarity || cards[0].displayRarity,
          setInfo: cards[0].setInfo
        } : 'empty');

        // Build list of card names for lookup
        const cardNames = cards
          .map(c => c.name || c.cardName)
          .filter(Boolean)
          .map(name => name.toLowerCase().trim());

        if (cardNames.length > 0) {
          // Get the set code pattern to filter variants
          const setCodePattern = setCode ? setCode.toLowerCase() : null;

          const { data: nameVariants, error: nameError } = await supabase
            .from('card_variants')
            .select('id, tcgcsv_product_id, card_slug, card_name')
            .ilike('card_slug', setCodePattern ? `%-${setCodePattern}-%` : '%');

          if (!nameError && nameVariants && nameVariants.length > 0) {
            // Match variants to cards by card name
            nameVariants.forEach(v => {
              const variantName = (v.card_name || '').toLowerCase().trim();
              // Store by card name for matching
              if (!variantMap.has(variantName)) {
                variantMap.set(variantName, {
                  id: v.id,
                  slug: v.card_slug,
                  productId: v.tcgcsv_product_id,
                  name: v.card_name
                });
              }
            });
            variants = nameVariants;
            console.log(`[CollectionManager] Found ${nameVariants.length} variants by set code pattern`);
          }
        }
      }

      if (variants.length === 0) {
        console.warn('[CollectionManager] No card variants found for this pack');
        return packEvent;
      }

      // Fetch latest prices for these variants
      const variantIds = variants.map(v => v.id);
      const { data: prices, error: priceError } = await supabase
        .from('card_prices')
        .select('card_variant_id, price, price_market')
        .in('card_variant_id', variantIds)
        .order('price_date', { ascending: false });

      // Create map of variant_id -> latest price (use market price as primary)
      const priceMap = new Map();
      if (!priceError && prices) {
        prices.forEach(p => {
          if (!priceMap.has(p.card_variant_id)) {
            priceMap.set(p.card_variant_id, parseFloat(p.price_market) || parseFloat(p.price) || 0);
          }
        });
      }

      // 3. Create pack_price_snapshots for each card
      const snapshots = [];
      const now = new Date().toISOString();

      for (const card of cards) {
        // Try to find variant data by product ID first
        const productId = String(card.productId || card.card?.productId || card.tcgcsv_product_id || card.product_id || '');
        let variantData = variantMap.get(productId);

        // If not found by product ID, try by card name (lowercase)
        if (!variantData) {
          const cardName = (card.name || card.cardName || '').toLowerCase().trim();
          variantData = variantMap.get(cardName);
        }

        if (variantData) {
          const priceAtPack = priceMap.get(variantData.id) || 0;

          snapshots.push({
            pack_event_id: packEvent.id,
            card_variant_id: variantData.id,
            card_slug: variantData.slug,
            price_at_pack: priceAtPack,
            currency: 'USD',
            packed_at: now
          });
        } else {
          console.log(`[CollectionManager] Could not find variant for card: ${card.name || card.cardName}`);
        }
      }

      if (snapshots.length > 0) {
        const { error: snapshotError } = await supabase
          .from('pack_price_snapshots')
          .insert(snapshots);

        if (snapshotError) {
          console.error('[CollectionManager] Error creating price snapshots:', snapshotError);
        } else {
          console.log(`[CollectionManager] Created ${snapshots.length} price snapshots for ${cards.length} cards`);
        }
      } else {
        console.warn(`[CollectionManager] No price snapshots created - no matching variants found for ${cards.length} cards`);
      }

      console.log(`[CollectionManager] Pack event complete: ${packEvent.id}, snapshots: ${snapshots.length}/${cards.length}`);
      return packEvent;
    } catch (error) {
      console.error('[CollectionManager] Error in createPackEventWithPrices:', error);
      return null;
    }
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
    const { user } = await authService.getCurrentUser();
    if (!user || !supabase) return [];

    try {
      // Fetch all collections for user
      const { data: collections, error: colError } = await supabase
        .from('user_collections')
        .select('id, name')
        .eq('user_id', user.id);

      console.log('[CollectionManager] User collections fetch result:', collections?.length, colError);

      if (colError) throw colError;
      if (!collections || collections.length === 0) {
        console.warn('[CollectionManager] No collections found for user:', user.id);
        return [];
      }

      const collectionIds = collections.map(c => c.id);
      console.log('[CollectionManager] Fetching cards for collection IDs:', collectionIds);

      // Fetch cards for these collections
      const { data: cards, error: cardError } = await supabase
        .from('collection_cards')
        .select('*')
        .in('collection_id', collectionIds);

      console.log('[CollectionManager] Collection cards fetch result:', cards?.length || 0, cardError || 'no error');

      if (cardError) {
        console.error('[CollectionManager] Supabase error fetching cards:', cardError);
        throw cardError;
      }

      // Collect unique product IDs to fetch card_variants for pricing and history
      const productIds = [...new Set(cards.map(c => c.card_id).filter(Boolean))];
      let variantLookup = new Map(); // productId -> variantId
      let priceLookup = new Map();   // variantId -> latest price data
      let packPriceLookup = new Map(); // variantId -> price at pack

      if (productIds.length > 0) {
        try {
          // Bulk fetch card_variants to get variant IDs and ygoprodeck_id for images
          const parsedProductIds = productIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
          const { data: variants, error: variantError } = await supabase
            .from('card_variants')
            .select('id, tcgcsv_product_id, ygoprodeck_id')
            .in('tcgcsv_product_id', parsedProductIds);

          if (!variantError && variants) {
            variants.forEach(v => {
              variantLookup.set(String(v.tcgcsv_product_id), {
                id: v.id,
                ygoprodeckId: v.ygoprodeck_id
              });
            });
            console.log(`[CollectionManager] Mapped ${variantLookup.size} card variants`);

            // Get all variant IDs for price lookups
            const variantIds = variants.map(v => v.id);

            if (variantIds.length > 0) {
              // OPTIMIZATION: Fetch prices and pack prices in parallel instead of sequentially
              // This reduces total wait time from (priceQuery + packQuery) to max(priceQuery, packQuery)
              const [pricesResult, packPricesResult] = await Promise.all([
                // Fetch latest prices from card_prices table
                supabase
                  .from('card_prices')
                  .select('card_variant_id, price, price_market, price_low, price_mid, price_high, price_date')
                  .in('card_variant_id', variantIds)
                  .order('price_date', { ascending: false }),

                // Fetch pack prices from pack_price_snapshots
                supabase
                  .from('pack_price_snapshots')
                  .select('card_variant_id, price_at_pack, packed_at')
                  .in('card_variant_id', variantIds)
                  .order('packed_at', { ascending: false })
              ]);

              // Process prices
              const { data: prices, error: priceError } = pricesResult;
              if (!priceError && prices) {
                // Group by variant_id and take the latest (first) for each
                prices.forEach(p => {
                  if (!priceLookup.has(p.card_variant_id)) {
                    priceLookup.set(p.card_variant_id, {
                      price: parseFloat(p.price) || 0,
                      marketPrice: parseFloat(p.price_market) || 0,
                      lowPrice: parseFloat(p.price_low) || 0,
                      midPrice: parseFloat(p.price_mid) || 0,
                      highPrice: parseFloat(p.price_high) || 0,
                      priceDate: p.price_date
                    });
                  }
                });
                console.log(`[CollectionManager] Fetched prices for ${priceLookup.size} variants`);
              }

              // Process pack prices
              const { data: packPrices, error: packError } = packPricesResult;
              if (packError) {
                console.warn('[CollectionManager] Error fetching pack prices:', packError);
              } else if (packPrices && packPrices.length > 0) {
                // Group by variant_id and take the latest (first) for each
                packPrices.forEach(p => {
                  if (!packPriceLookup.has(p.card_variant_id)) {
                    packPriceLookup.set(p.card_variant_id, {
                      priceAtPack: parseFloat(p.price_at_pack) || 0,
                      packedAt: p.packed_at
                    });
                  }
                });
                console.log(`[CollectionManager] Fetched pack prices for ${packPriceLookup.size} variants from pack_price_snapshots`);
              } else {
                console.log('[CollectionManager] No pack price snapshots found for these cards');
              }
            }
          }
        } catch (err) {
          console.warn('[CollectionManager] Failed to fetch card data:', err);
        }
      }

      // Map to standardized format matching CollectionPage expectations
      const mappedCards = cards.map(card => {
        const collection = collections.find(c => c.id === card.collection_id);
        const variantData = variantLookup.get(String(card.card_id));
        const cardVariantId = variantData?.id || null;
        const priceData = cardVariantId ? priceLookup.get(cardVariantId) : null;
        const packPriceData = cardVariantId ? packPriceLookup.get(cardVariantId) : null;

        // Use marketPrice as currentPrice (TCGPlayer market price is the standard)
        const currentPrice = priceData?.marketPrice || priceData?.price || 0;
        const lowPrice = priceData?.lowPrice || 0;
        const quantity = card.quantity || 1;

        // Construct image URL from TCGPlayer CDN using product ID
        const productId = card.card_id;
        const imageUrl = productId
          ? `https://tcgplayer-cdn.tcgplayer.com/product/${productId}_200w.jpg`
          : null;

        return {
          id: card.id,
          collectionId: card.collection_id,
          cardType: card.card_type || null, // Card type (monster/spell/trap) for filtering
          quantity: quantity,
          createdAt: card.added_at || new Date().toISOString(),
          card: {
            name: card.name,
            number: card.card_number || card.set_code,
            productId: productId,
          },
          // Image URLs from TCGPlayer CDN
          image_url: imageUrl,
          image_small: imageUrl,

          // Flat properties for filtering/sorting compatibility
          cardName: card.name,
          setCode: card.set_code,
          rarity: card.rarity,
          cardNumber: card.card_number || card.set_code,
          addedAt: card.added_at || new Date().toISOString(),

          // IDs for modal functionality
          productId: productId,
          cardVariantId: cardVariantId,

          set: {
            code: card.set_code,
            name: card.set_code
          },
          rarity: {
            name: card.rarity,
            key: card.rarity
          },
          pricing: {
            currentPrice: currentPrice,
            marketPrice: currentPrice, // Same as currentPrice (market is the standard)
            lowPrice: lowPrice,
            midPrice: priceData?.midPrice || 0,
            highPrice: priceData?.highPrice || 0,
            totalValue: currentPrice * quantity,
            priceDate: priceData?.priceDate || null,
            // Pack price data
            priceAtPack: packPriceData?.priceAtPack || null,
            packedAt: packPriceData?.packedAt || null
          },
          // Flat price properties for compatibility
          tcgMarket: currentPrice,
          tcgLow: lowPrice,
          collectionName: collection?.name
        };
      });

      return mappedCards;
    } catch (error) {
      console.error('Error fetching all user cards:', error);
      return [];
    }
  }

  /**
   * Fetch prices for a list of cards and update cache/storage
   * @param {Array} cards 
   */
  async fetchPricesForCards(cards) {
    // Ensure PriceChecker is initialized before attempting price lookups
    const ready = await this.ensurePriceCheckerReady();
    if (!ready) {
      console.warn('[CollectionManager] PriceChecker not ready, skipping price fetch');
      return;
    }

    console.log(`[CollectionManager] Background fetching prices for ${cards.length} unique cards`);

    // Process in chunks to avoid overwhelming the API
    const chunkSize = 5;
    let hasUpdates = false;

    for (let i = 0; i < cards.length; i += chunkSize) {
      const chunk = cards.slice(i, i + chunkSize);
      await Promise.all(chunk.map(async (card) => {
        try {
          // Don't send set code as card number if it looks like a set code (no numbers/hyphens)
          // Typical card number: "LOB-EN001" or "LOB-001"
          // Set code: "LOB" or "SUDA"
          let cardNumber = card.card.number;
          if (cardNumber === card.set.code && !/\d/.test(cardNumber)) {
            cardNumber = null; // It's just a set code, don't use it as card number
          }

          // Clean card name: remove rarity in parentheses if present
          // e.g. "Evil HERO Neos Lord (Quarter Century Secret Rare)" -> "Evil HERO Neos Lord"
          let cleanName = card.card.name;
          if (cleanName.includes('(')) {
            cleanName = cleanName.replace(/\s*\([^)]+\)\s*$/, '').trim();
          }

          const result = await this.priceChecker.checkPrice({
            cardNumber: cardNumber,
            rarity: card.rarity.name,
            cardName: cleanName,
            setCode: card.set.code,
            productId: card.card.productId  // TCGcsv product_id for O(1) lookup
          });

          // Only mark as update if it didn't come from cache
          if (!result.fromCache) {
            hasUpdates = true;
          }
        } catch (err) {
          // Ignore individual errors
        }
      }));

      // Notify listeners incrementally
      if (hasUpdates) {
        this.notify('priceUpdate', { count: chunk.length });
      }
    }
  }

  /**
   * Invalidate collection cache
   */
  invalidateCache() {
    console.log('[CollectionManager] invalidateCache called - clearing userCollections cache');
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
            // Use dynamic rarity ranks from rarityService
            compareA = getRarityRankSync(a.rarity || 'common');
            compareB = getRarityRankSync(b.rarity || 'common');
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

      // OPTIMIZATION: Track unique cards and sets in a single pass instead of
      // calling getUniqueCards() which iterates the entire array again
      const uniqueCardKeys = new Set();
      const uniqueSets = new Set();

      allCards.forEach(card => {
        const quantity = Number(card.quantity) && Number(card.quantity) > 0 ? Number(card.quantity) : 1;
        const unitValue = parseFloat(card.tcgLow) || 0;

        // Track unique cards by key (single pass)
        const cardKey = `${card.cardName || 'Unknown'}-${card.cardNumber || 'N/A'}`;
        uniqueCardKeys.add(cardKey);

        // Track unique sets (single pass)
        const setId = card.setName || card.setCode;
        if (setId) uniqueSets.add(setId);

        // Safely handle rarity
        let rarityKey = 'common';
        if (typeof card.rarity === 'string') {
          rarityKey = card.rarity;
        } else if (card.rarity && typeof card.rarity.name === 'string') {
          rarityKey = card.rarity.name;
        } else if (card.rarity && typeof card.rarity.key === 'string') {
          rarityKey = card.rarity.key;
        }

        // Use dynamic rarity weights from rarityService
        const dynamicWeight = getRarityWeightSync(rarityKey);
        const rarityScore = card.rareScoreContribution !== undefined
          ? parseFloat(card.rareScoreContribution) || 0
          : dynamicWeight * quantity;

        totalCards += quantity;
        totalValue += unitValue * quantity;
        totalRareScore += rarityScore;

        rarityDistribution[rarityKey] = (rarityDistribution[rarityKey] || 0) + quantity;

        const rarityValue = (card.rarityWeight !== undefined
          ? parseFloat(card.rarityWeight) || 0
          : dynamicWeight);

        if (rarityValue > highestRarityScore) {
          highestRarityScore = rarityValue;
          rarestCard = card;
        }
      });

      // Use Set sizes directly (O(1) after single pass)
      const uniqueCards = uniqueCardKeys.size;
      const sets = uniqueSets.size;

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
