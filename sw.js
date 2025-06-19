/**
 * Service Worker - PWA Offline Functionality
 * 
 * Provides offline capabilities and performance improvements:
 * - Cache management for app shell and resources
 * - Offline page functionality
 * - Background sync capabilities
 * - Push notification support (future)
 * - Performance optimizations
 */

const CACHE_NAME = 'ygo-ripper-v2.1.0';
const RUNTIME_CACHE = 'ygo-ripper-runtime';

// Resources to cache for offline use
const CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/css/main.css',
  '/src/css/components.css',
  '/src/css/responsive.css',
  '/src/js/app.js',
  '/src/js/voice/VoiceEngine.js',
  '/src/js/voice/PermissionManager.js',
  '/src/js/session/SessionManager.js',
  '/src/js/price/PriceChecker.js',
  '/src/js/ui/UIManager.js',
  '/src/js/utils/Logger.js',
  '/src/js/utils/Storage.js'
];

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only'
};

// Route configuration
const ROUTE_CONFIG = [
  {
    pattern: /\.(js|css|html)$/,
    strategy: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
    cache: CACHE_NAME
  },
  {
    pattern: /\/api\//,
    strategy: CACHE_STRATEGIES.NETWORK_FIRST,
    cache: RUNTIME_CACHE
  },
  {
    pattern: /\.(png|jpg|jpeg|gif|svg|ico)$/,
    strategy: CACHE_STRATEGIES.CACHE_FIRST,
    cache: RUNTIME_CACHE
  },
  {
    pattern: /\/ygo-image-proxy\//,
    strategy: 'ygo-image-proxy',
    cache: RUNTIME_CACHE
  }
];

// Install event - cache core resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell resources');
        return cache.addAll(CACHE_URLS);
      })
      .then(() => {
        console.log('[SW] App shell cached successfully');
        // Force activation of new service worker
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache app shell:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        // Claim all clients
        return self.clients.claim();
      })
      .catch((error) => {
        console.error('[SW] Activation failed:', error);
      })
  );
});

// Fetch event - handle network requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Debug logging for YGO image proxy requests
  if (url.pathname.includes('/ygo-image-proxy/')) {
    console.log('[SW] YGO image proxy request detected:', request.url);
  }
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip cross-origin requests (unless it's a YGO image proxy request)
  if (url.origin !== location.origin && !url.pathname.includes('/ygo-image-proxy/')) {
    return;
  }
  
  // Find matching route configuration
  const routeConfig = findRouteConfig(request.url);
  
  if (routeConfig) {
    console.log('[SW] Handling request with strategy:', routeConfig.strategy, 'for', request.url);
    event.respondWith(
      handleRequest(request, routeConfig)
    );
  } else {
    console.log('[SW] No route config found for:', request.url);
  }
});

/**
 * Find route configuration for a URL
 */
function findRouteConfig(url) {
  return ROUTE_CONFIG.find(config => config.pattern.test(url));
}

/**
 * Handle request based on strategy
 */
async function handleRequest(request, config) {
  const { strategy, cache: cacheName } = config;
  
  try {
    switch (strategy) {
      case CACHE_STRATEGIES.CACHE_FIRST:
        return await cacheFirst(request, cacheName);
      
      case CACHE_STRATEGIES.NETWORK_FIRST:
        return await networkFirst(request, cacheName);
      
      case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
        return await staleWhileRevalidate(request, cacheName);
      
      case CACHE_STRATEGIES.NETWORK_ONLY:
        return await fetch(request);
      
      case CACHE_STRATEGIES.CACHE_ONLY:
        return await cacheOnly(request, cacheName);
      
      case 'ygo-image-proxy':
        return await handleYgoImageProxy(request, cacheName);
      
      default:
        return await networkFirst(request, cacheName);
    }
  } catch (error) {
    console.error('[SW] Request failed:', error);
    return await getOfflinePage();
  }
}

/**
 * Cache First Strategy
 */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    console.log('[SW] Serving from cache:', request.url);
    return cached;
  }
  
  console.log('[SW] Cache miss, fetching:', request.url);
  const response = await fetch(request);
  
  if (response.status === 200) {
    const responseClone = response.clone();
    cache.put(request, responseClone);
  }
  
  return response;
}

/**
 * Network First Strategy
 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    console.log('[SW] Trying network first:', request.url);
    const response = await fetch(request);
    
    if (response.status === 200) {
      const responseClone = response.clone();
      cache.put(request, responseClone);
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cached = await cache.match(request);
    
    if (cached) {
      return cached;
    }
    
    throw error;
  }
}

/**
 * Stale While Revalidate Strategy
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  // Start fetch in background
  const fetchPromise = fetch(request).then((response) => {
    if (response.status === 200) {
      const responseClone = response.clone();
      cache.put(request, responseClone);
    }
    return response;
  }).catch(() => {
    // Ignore fetch errors for this strategy
  });
  
  if (cached) {
    console.log('[SW] Serving stale content, revalidating:', request.url);
    return cached;
  }
  
  console.log('[SW] No cache, waiting for network:', request.url);
  return await fetchPromise;
}

/**
 * Cache Only Strategy
 */
async function cacheOnly(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  throw new Error('Resource not found in cache');
}

/**
 * Handle YGOPRODeck Image Proxy Requests
 * Proxies YGOPRODeck images to avoid CORS issues and implements proper caching
 */
async function handleYgoImageProxy(request, cacheName) {
  const url = new URL(request.url);
  const imageUrl = decodeURIComponent(url.pathname.replace('/ygo-image-proxy/', ''));
  
  console.log('[SW] YGO Image Proxy request for:', imageUrl);
  
  // Validate that this is a YGOPRODeck image URL
  if (!imageUrl.startsWith('https://images.ygoprodeck.com/')) {
    console.error('[SW] Invalid YGO image URL:', imageUrl);
    return new Response('Invalid image URL', { status: 400 });
  }
  
  const cache = await caches.open(cacheName);
  
  // Create a cache key based on the original image URL
  const cacheKey = new Request(request.url);
  
  // Check cache first
  const cached = await cache.match(cacheKey);
  if (cached) {
    console.log('[SW] Serving YGO image from cache:', imageUrl);
    return cached;
  }
  
  try {
    console.log('[SW] Fetching YGO image from network:', imageUrl);
    
    // Fetch the image with appropriate headers to avoid CORS issues
    const response = await fetch(imageUrl, {
      mode: 'cors',
      credentials: 'omit',
      headers: {
        'User-Agent': 'YGO-Ripper-PWA/2.1.0',
        'Accept': 'image/*,*/*;q=0.8',
        'Referer': 'https://db.ygoprodeck.com/'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    // Clone the response for caching
    const responseClone = response.clone();
    
    // Create a response with appropriate headers for caching
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'public, max-age=604800'); // 7 days
    headers.set('Access-Control-Allow-Origin', '*');
    
    const cachedResponse = new Response(await response.arrayBuffer(), {
      status: response.status,
      statusText: response.statusText,
      headers: headers
    });
    
    // Cache the response
    await cache.put(cacheKey, cachedResponse.clone());
    console.log('[SW] Cached YGO image:', imageUrl);
    
    return cachedResponse;
    
  } catch (error) {
    console.error('[SW] Failed to fetch YGO image:', imageUrl, error);
    
    // Return a placeholder image on error
    return await createPlaceholderImageResponse();
  }
}

/**
 * Create a placeholder image response
 */
async function createPlaceholderImageResponse() {
  // Create a simple placeholder SVG
  const placeholderSvg = `
    <svg width="200" height="290" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="290" fill="#4A90E2" stroke="#333" stroke-width="2"/>
      <text x="100" y="145" text-anchor="middle" fill="white" font-family="Arial" font-size="48">🃏</text>
      <text x="100" y="180" text-anchor="middle" fill="white" font-family="Arial" font-size="14">Image unavailable</text>
    </svg>
  `;
  
  return new Response(placeholderSvg, {
    status: 200,
    statusText: 'OK',
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=300', // 5 minutes for placeholder
      'Access-Control-Allow-Origin': '*'
    }
  });
}

/**
 * Get offline page
 */
async function getOfflinePage() {
  const cache = await caches.open(CACHE_NAME);
  const offlinePage = await cache.match('/');
  
  if (offlinePage) {
    return offlinePage;
  }
  
  // Return a basic offline response
  return new Response(
    createOfflineHTML(),
    {
      status: 200,
      statusText: 'OK',
      headers: { 'Content-Type': 'text/html' }
    }
  );
}

/**
 * Create basic offline HTML
 */
function createOfflineHTML() {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>YGO Ripper UI v2 - Offline</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%);
          color: #ffffff;
          margin: 0;
          padding: 2rem;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        .offline-content {
          max-width: 400px;
        }
        .offline-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }
        h1 {
          color: #ffd700;
          margin-bottom: 1rem;
        }
        p {
          line-height: 1.6;
          margin-bottom: 1rem;
          color: #b0b0b0;
        }
        .retry-btn {
          background: linear-gradient(135deg, #ffd700 0%, #ffb000 100%);
          color: #000;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: bold;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .retry-btn:hover {
          transform: translateY(-1px);
        }
      </style>
    </head>
    <body>
      <div class="offline-content">
        <div class="offline-icon">📦</div>
        <h1>You're Offline</h1>
        <p>
          YGO Ripper UI v2 is currently offline. Some features may not be available 
          until you reconnect to the internet.
        </p>
        <p>
          Your session data is safely stored locally and will sync when you're back online.
        </p>
        <button class="retry-btn" onclick="window.location.reload()">
          Try Again
        </button>
      </div>
    </body>
    </html>
  `;
}

// Background sync (for future implementation)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);
  
  if (event.tag === 'session-sync') {
    event.waitUntil(syncSessionData());
  }
});

/**
 * Sync session data when online
 */
async function syncSessionData() {
  try {
    console.log('[SW] Syncing session data...');
    
    // Get stored session data
    const cache = await caches.open(RUNTIME_CACHE);
    const sessionData = await cache.match('/offline-sessions');
    
    if (sessionData) {
      const sessions = await sessionData.json();
      
      // Sync each session (implementation depends on backend)
      for (const session of sessions) {
        await syncSession(session);
      }
      
      // Clear offline sessions after sync
      await cache.delete('/offline-sessions');
      console.log('[SW] Session data synced successfully');
    }
  } catch (error) {
    console.error('[SW] Failed to sync session data:', error);
  }
}

/**
 * Sync individual session
 */
async function syncSession(session) {
  try {
    const response = await fetch('/api/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(session)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    console.log('[SW] Session synced:', session.id);
  } catch (error) {
    console.error('[SW] Failed to sync session:', session.id, error);
    throw error;
  }
}

// Message handling
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_NAME });
      break;
      
    case 'CACHE_SESSION':
      cacheSessionOffline(payload);
      break;
      
    case 'CLEAN_CACHE':
      cleanOldCache();
      break;
      
    default:
      console.log('[SW] Unknown message type:', type);
  }
});

/**
 * Cache session data for offline use
 */
async function cacheSessionOffline(sessionData) {
  try {
    const cache = await caches.open(RUNTIME_CACHE);
    
    // Get existing offline sessions
    let offlineSessions = [];
    const existingData = await cache.match('/offline-sessions');
    
    if (existingData) {
      offlineSessions = await existingData.json();
    }
    
    // Add new session
    offlineSessions.push(sessionData);
    
    // Store updated sessions
    const response = new Response(JSON.stringify(offlineSessions), {
      headers: { 'Content-Type': 'application/json' }
    });
    
    await cache.put('/offline-sessions', response);
    console.log('[SW] Session cached for offline sync');
  } catch (error) {
    console.error('[SW] Failed to cache session offline:', error);
  }
}

/**
 * Clean old cache entries
 */
async function cleanOldCache() {
  try {
    const cache = await caches.open(RUNTIME_CACHE);
    const requests = await cache.keys();
    
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    
    for (const request of requests) {
      const response = await cache.match(request);
      const dateHeader = response.headers.get('date');
      
      if (dateHeader) {
        const responseDate = new Date(dateHeader).getTime();
        
        if (now - responseDate > maxAge) {
          await cache.delete(request);
          console.log('[SW] Deleted old cache entry:', request.url);
        }
      }
    }
  } catch (error) {
    console.error('[SW] Failed to clean old cache:', error);
  }
}

// Error handling
self.addEventListener('error', (event) => {
  console.error('[SW] Service worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled promise rejection:', event.reason);
});

console.log('[SW] Service worker loaded successfully');