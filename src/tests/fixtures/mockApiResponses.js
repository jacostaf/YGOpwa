/**
 * Mock fixtures for backend API responses
 * Used for consistent testing of frontend components
 */

export const mockApiResponses = {
  // Card sets data
  cardSets: {
    success: {
      success: true,
      data: [
        {
          id: "LOB",
          name: "Legend of Blue Eyes White Dragon",
          code: "LOB",
          releaseDate: "2002-03-08",
          totalCards: 126,
          type: "Booster Pack"
        },
        {
          id: "MRD",
          name: "Metal Raiders",
          code: "MRD",
          releaseDate: "2002-06-26",
          totalCards: 82,
          type: "Booster Pack"
        },
        {
          id: "SRL",
          name: "Spell Ruler",
          code: "SRL",
          releaseDate: "2002-09-16",
          totalCards: 105,
          type: "Booster Pack"
        }
      ]
    },
    error: {
      success: false,
      error: "Backend service unavailable"
    }
  },

  // Price check responses
  priceCheck: {
    success: {
      success: true,
      data: {
        cardName: "Blue-Eyes White Dragon",
        setCode: "LOB",
        rarity: "Ultra Rare",
        prices: {
          tcgLow: 45.99,
          tcgMid: 52.50,
          tcgHigh: 89.99,
          tcgMarket: 48.75
        },
        imageUrl: "https://images.ygoprodeck.com/images/cards/89631139.jpg",
        timestamp: "2025-07-17T10:00:00Z"
      }
    },
    notFound: {
      success: false,
      error: "Card not found in database"
    },
    networkError: {
      success: false,
      error: "Network connection failed"
    }
  },

  // Card search responses
  cardSearch: {
    success: {
      success: true,
      data: [
        {
          id: "89631139",
          name: "Blue-Eyes White Dragon",
          type: "Normal Monster",
          race: "Dragon",
          archetype: "Blue-Eyes",
          atk: 3000,
          def: 2500,
          level: 8,
          attribute: "LIGHT",
          rarity: "Ultra Rare",
          setCode: "LOB",
          cardNumber: "LOB-001",
          confidence: 0.95
        },
        {
          id: "38033121",
          name: "Blue-Eyes Shining Dragon",
          type: "Effect Monster",
          race: "Dragon",
          archetype: "Blue-Eyes",
          atk: 3000,
          def: 2500,
          level: 10,
          attribute: "LIGHT",
          rarity: "Ultra Rare",
          setCode: "MOV",
          cardNumber: "MOV-001",
          confidence: 0.75
        }
      ]
    },
    noResults: {
      success: true,
      data: []
    }
  },

  // Session management responses
  session: {
    save: {
      success: true,
      message: "Session saved successfully",
      sessionId: "sess_12345"
    },
    load: {
      success: true,
      data: {
        id: "sess_12345",
        setId: "LOB",
        setName: "Legend of Blue Eyes White Dragon",
        cards: [
          {
            id: "card_1",
            name: "Blue-Eyes White Dragon",
            rarity: "Ultra Rare",
            quantity: 1,
            timestamp: "2025-07-17T10:00:00Z"
          }
        ],
        totals: {
          totalCards: 1,
          estimatedValue: 48.75
        }
      }
    }
  }
};

// Mock voice recognition results
export const mockVoiceResults = {
  success: {
    transcript: "Blue-Eyes White Dragon",
    confidence: 0.95,
    isFinal: true,
    alternatives: [
      { transcript: "Blue-Eyes White Dragon", confidence: 0.95 },
      { transcript: "Blue Eyes White Dragon", confidence: 0.85 }
    ]
  },
  lowConfidence: {
    transcript: "blue dragon",
    confidence: 0.45,
    isFinal: true,
    alternatives: [
      { transcript: "blue dragon", confidence: 0.45 },
      { transcript: "blue-eyes dragon", confidence: 0.35 }
    ]
  },
  noSpeech: {
    transcript: "",
    confidence: 0,
    isFinal: false,
    alternatives: []
  }
};

// Mock IndexedDB data
export const mockIndexedDBData = {
  settings: {
    theme: "dark",
    voiceTimeout: 5000,
    voiceLanguage: "en-US",
    autoConfirm: false,
    autoConfirmThreshold: 85
  },
  sessions: [
    {
      id: "sess_12345",
      setId: "LOB",
      setName: "Legend of Blue Eyes White Dragon",
      created: "2025-07-17T10:00:00Z",
      modified: "2025-07-17T10:30:00Z",
      cards: []
    }
  ],
  cardSets: [
    {
      id: "LOB",
      name: "Legend of Blue Eyes White Dragon",
      code: "LOB",
      cached: "2025-07-17T09:00:00Z"
    }
  ]
};

// Mock Service Worker responses
export const mockServiceWorkerResponses = {
  cacheMatch: {
    url: "https://api.example.com/cards/search",
    response: new Response(JSON.stringify(mockApiResponses.cardSearch.success), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  },
  cacheAdd: {
    success: true,
    message: "Resource cached successfully"
  },
  offline: {
    error: "Network unavailable",
    fallback: mockApiResponses.cardSearch.success
  }
};