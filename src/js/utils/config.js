// Configuration for YGO Ripper UI
// This works across all platforms (Mac, Windows, iOS, Android, etc.)
export const config = {
    // API URL - change this to switch between local and production
    //API_URL: 'https://ygopyguy.onrender.com',
    
    // You can also set it to local for development:
    API_URL: 'http://127.0.0.1:8081',
    
    // Other configuration options
    APP_VERSION: '2.1.0',
    APP_NAME: 'YGO Ripper UI v2',
    
    // Timeouts and limits
    API_TIMEOUT: 30000,
    CACHE_TTL: 3600000, // 1 hour
    MAX_CACHE_SIZE: 1000
};

// Legacy export for compatibility
export const API_URL = config.API_URL;