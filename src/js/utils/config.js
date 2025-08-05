
// Configuration for YGO Ripper UI
// This works across all platforms (Mac, Windows, iOS, Android, etc.)
export const config = {
    // API URL - TCGcsv Implementation
    // Using TCGcsv as the sole data source (no MongoDB required)
    API_URL: 'http://127.0.0.1:8082',
    
    // Other configuration options
    APP_VERSION: '2.1.0',
    APP_NAME: 'YGO Ripper UI v2',
    
    // Timeouts and limits
    API_TIMEOUT: 120000,
    CACHE_TTL: 3600000, // 1 hour
    MAX_CACHE_SIZE: 1000
};

// Legacy export for compatibility
export const API_URL = config.API_URL;

