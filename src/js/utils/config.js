import { getEnv } from '../../lib/config.js';

const DEFAULT_CARD_API = 'http://127.0.0.1:8081/api/v1';
const resolvedApiUrl = (getEnv('VITE_CARD_API_BASE_URL', DEFAULT_CARD_API) || DEFAULT_CARD_API).replace(/\/$/, '');

// Configuration for YGO Ripper UI
// This works across all platforms (Mac, Windows, iOS, Android, etc.)
export const config = {
    // Aggregation API base URL (tcg_ygoripper Phase 3)
    API_URL: resolvedApiUrl,

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
