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

const SW_DEBUG = false;
function swLog(...args) { if (SW_DEBUG) console.log('[SW]', ...args); }

const CACHE_NAME = 'voxrip-v2.3.2';
const RUNTIME_CACHE = 'voxrip-runtime';

// Resources to cache for offline use
const CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  // CSS files
  '/src/css/main.css',
  '/src/css/responsive.css',
  '/src/css/themes.css',
  '/src/css/layouts.css',
  '/src/css/sidebar.css',
  '/src/css/animations.css',
  '/src/css/accessibility.css',
  '/src/css/settings.css',
  '/src/css/theme-settings.css',
  '/src/css/collection.css',
  '/src/css/pack-opening-compact.css',
  '/src/css/rarity-admin.css',
  '/src/css/utilities.css',
  // Core app
  '/src/js/app.js',
  // Components
  '/src/components/Sidebar.js',
  '/src/components/StatsCard.js',
  '/src/components/CardGrid.js',
  '/src/components/PatternList.js',
  '/src/components/AchievementBadge.js',
  '/src/components/ToggleSwitch.js',
  '/src/components/UserProfile.js',
  '/src/components/RarityAdmin.js',
  '/src/components/AuthModal.js',
  // Pages
  '/src/pages/DashboardPage.js',
  '/src/pages/PackOpeningPage.js',
  '/src/pages/PriceCheckerPage.js',
  '/src/pages/VoiceTrainingPage.js',
  '/src/pages/SettingsPage.js',
  '/src/pages/ThemeSettingsPage.js',
  '/src/pages/CollectionPageV2.js',
  '/src/pages/AchievementsPage.js',
  '/src/pages/LeaderboardPage.js',
  '/src/pages/AdminPage.js',
  '/src/pages/RarityAdminPage.js',
  // Services
  '/src/services/DashboardService.js',
  '/src/services/CollectionManager.js',
  '/src/services/AchievementManager.js',
  '/src/services/leaderboardService.js',
  '/src/services/ActivityService.js',
  '/src/services/authService.js',
  '/src/services/collectionsService.js',
  '/src/services/pricingService.js',
  '/src/services/subscriptionService.js',
  '/src/services/rarityService.js',
  '/src/services/CacheCoordinator.js',
  '/src/services/packEventsService.js',
  '/src/services/cardMetadataService.js',
  // Themes
  '/src/themes/theme-config.js',
  '/src/themes/ThemeManager.js',
  // Utils
  '/src/utils/Router.js',
  '/src/utils/IconLoader.js',
  '/src/utils/AnimationHelper.js',
  '/src/utils/EventEmitter.js',
  // JS Utils
  '/src/js/utils/Logger.js',
  '/src/js/utils/Storage.js',
  '/src/js/utils/ImageManager.js',
  '/src/js/utils/ErrorBoundary.js',
  '/src/js/utils/config.js',
  // Voice
  '/src/js/voice/VoiceEngine.js',
  '/src/js/voice/PermissionManager.js',
  // Session
  '/src/js/session/SessionManager.js',
  // Price
  '/src/js/price/PriceChecker.js',
  // UI
  '/src/js/ui/UIManager.js'
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
  }
];

// Install event - cache core resources
self.addEventListener('install', (event) => {
  swLog('Installing service worker...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        swLog('Caching app shell resources');
        return cache.addAll(CACHE_URLS);
      })
      .then(() => {
        swLog('App shell cached successfully');
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
  swLog('Activating service worker...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              swLog('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        swLog('Service worker activated');
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

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests (unless specifically configured)
  if (url.origin !== location.origin) {
    return;
  }

  // Find matching route configuration
  const routeConfig = findRouteConfig(request.url);

  if (routeConfig) {
    event.respondWith(
      handleRequest(request, routeConfig)
    );
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
    swLog('Serving from cache:', request.url);
    return cached;
  }

  swLog('Cache miss, fetching:', request.url);
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
    swLog('Trying network first:', request.url);
    const response = await fetch(request);

    if (response.status === 200) {
      const responseClone = response.clone();
      cache.put(request, responseClone);
    }

    return response;
  } catch (error) {
    swLog('Network failed, trying cache:', request.url);
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
    swLog('Serving stale content, revalidating:', request.url);
    return cached;
  }

  swLog('No cache, waiting for network:', request.url);
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
      <title>VoxRip - Offline</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #0a0a0a 0%, #171717 100%);
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
          background: rgba(23, 23, 23, 0.4);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(64, 64, 64, 0.5);
          border-radius: 16px;
          padding: 2rem;
        }
        .offline-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }
        h1 {
          color: #ffffff;
          margin-bottom: 1rem;
          font-size: 1.75rem;
        }
        p {
          line-height: 1.6;
          margin-bottom: 1rem;
          color: #a3a3a3;
        }
        .retry-btn {
          background: rgba(115, 115, 115, 0.2);
          color: #ffffff;
          border: 1px solid rgba(115, 115, 115, 0.5);
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          backdrop-filter: blur(8px);
        }
        .retry-btn:hover {
          background: rgba(115, 115, 115, 0.3);
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }
      </style>
    </head>
    <body>
      <div class="offline-content">
        <div class="offline-icon">⚡</div>
        <h1>You're Offline</h1>
        <p>
          VoxRip is currently offline. Some features may not be available
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
  swLog('Background sync event:', event.tag);

  if (event.tag === 'session-sync') {
    event.waitUntil(syncSessionData());
  }
});

/**
 * Sync session data when online
 */
async function syncSessionData() {
  try {
    swLog('Syncing session data...');

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
      swLog('Session data synced successfully');
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

    swLog('Session synced:', session.id);
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
      swLog('Unknown message type:', type);
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
    swLog('Session cached for offline sync');
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
          swLog('Deleted old cache entry:', request.url);
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

swLog('Service worker loaded successfully');