import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';
import { criticalCSSPlugin, themeOptimizationPlugin } from './vite-plugins/critical-css-plugin.js';

export default defineConfig({
  // Base public path
  base: './',
  
  // Build configuration
  build: {
    // Output directory
    outDir: 'dist',
    
    // Generate sourcemaps for debugging
    sourcemap: process.env.NODE_ENV === 'development',
    
    // Minification settings
    minify: 'terser',
    terserOptions: {
      compress: {
        // Remove console logs in production
        drop_console: true,
        drop_debugger: true,
        // Additional compression options
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
        // Remove unused code
        dead_code: true,
        // Optimize loops
        loops: true,
        // Remove unreachable code
        conditionals: true,
        // Evaluate constant expressions
        evaluate: true,
        // Join consecutive var declarations
        join_vars: true,
        // Optimize boolean expressions
        booleans: true,
        // Optimize sequence expressions
        sequences: true,
        // Additional size optimizations
        properties: true,
        unused: true,
        toplevel: true,
        if_return: true,
        inline: true,
        side_effects: false
      },
      mangle: {
        // Mangle variable names for size reduction
        toplevel: true,
        safari10: true
      },
      format: {
        // Remove comments
        comments: false
      }
    },
    
    // CSS minification
    cssMinify: true,
    
    // Rollup options for advanced bundling
    rollupOptions: {
      input: {
        main: './index.html'
      },
      output: {
        // Manual chunk splitting for optimal loading
        manualChunks: {
          // Core application chunk
          'app-core': [
            './src/js/app.js',
            './src/js/ui/UIManager.js',
            './src/js/utils/Logger.js',
            './src/js/utils/Storage.js'
          ],
          // Voice recognition chunk
          'voice-engine': [
            './src/js/voice/VoiceEngine.js',
            './src/js/voice/PermissionManager.js',
            './src/js/voice/AdaptiveConfidenceManager.js',
            './src/js/voice/PhoneticMapper.js',
            './src/js/voice/ProgressiveLearningEngine.js'
          ],
          // UI components chunk
          'ui-components': [
            './src/js/ui/TrainingUI.js',
            './src/js/ui/PatternManagerUI.js'
          ],
          // Utilities chunk
          'utilities': [
            './src/js/utils/ThemeManager.js',
            './src/js/utils/ImageManager.js',
            './src/js/utils/AnimationManager.js',
            './src/js/utils/AccessibilityManager.js',
            './src/js/utils/RealPerformanceMonitor.js'
          ],
          // Business logic chunk
          'business-logic': [
            './src/js/session/SessionManager.js',
            './src/js/price/PriceChecker.js'
          ]
        },
        // Asset naming for caching
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    
    // Target modern browsers (removed due to legacy plugin override)
    // target: ['es2020', 'chrome90', 'firefox88', 'safari14'],
    
    // Chunk size warning limit
    chunkSizeWarningLimit: 1000,
    
    // Report compressed size
    reportCompressedSize: true
  },
  
  // Development server configuration
  server: {
    port: 3333,
    host: '127.0.0.1',
    open: false,
    // Enable HMR for faster development
    hmr: true,
    // Proxy configuration for API calls if needed
    proxy: {
      '/api': {
        target: 'https://db.ygoprodeck.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      }
    }
  },
  
  // Preview server (for production testing)
  preview: {
    port: 8080,
    host: '127.0.0.1'
  },
  
  // CSS configuration
  css: {
    // CSS modules configuration
    modules: false,
    // PostCSS configuration
    postcss: {
      plugins: []
    },
    // Preprocess options
    preprocessorOptions: {
      css: {
        // Additional CSS processing options
      }
    },
    // CSS code splitting for better loading performance
    codeSplit: true
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: [
      // Pre-bundle common dependencies
    ],
    exclude: [
      // Exclude from pre-bundling if needed
    ]
  },
  
  // Plugin configuration
  plugins: [
    // Critical CSS optimization for fastest render
    criticalCSSPlugin({
      criticalCSSPath: 'src/css/critical.css',
      nonCriticalFiles: [
        'src/css/main.css',
        'src/css/components.css',
        'src/css/responsive.css',
        'src/css/space-theme-bridge.css'
      ],
      minify: true
    }),
    
    // Theme-specific CSS optimization
    themeOptimizationPlugin(),
    
    // Legacy browser support
    legacy({
      targets: ['Chrome >= 90', 'Firefox >= 88', 'Safari >= 14', 'defaults', 'not IE 11'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
      renderLegacyChunks: true,
      polyfills: [
        'es.symbol',
        'es.array.filter',
        'es.promise',
        'es.promise.finally',
        'es/map',
        'es/set',
        'es.array.for-each',
        'es.object.define-properties',
        'es.object.define-property',
        'es.object.get-own-property-descriptor',
        'es.object.get-own-property-descriptors',
        'es.object.keys',
        'es.object.to-string',
        'web.dom-collections.for-each',
        'esnext.global-this',
        'esnext.string.match-all'
      ]
    }),
    
    // PWA plugin for service worker and manifest
    VitePWA({
      registerType: 'prompt',
      workbox: {
        // Globbing patterns for caching
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2}'],
        // Runtime caching strategies
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/db\.ygoprodeck\.com\/api\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 86400 // 24 hours
              }
            }
          },
          {
            urlPattern: /^https:\/\/images\.ygoprodeck\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 604800 // 7 days
              }
            }
          }
        ]
      },
      // Manifest configuration
      manifest: {
        name: 'VoxRip - Voice-Powered Card Collection & Pricing Toolkit',
        short_name: 'VoxRip',
        description: 'Advanced voice-powered Yu-Gi-Oh card collection and pricing toolkit with intelligent recognition',
        theme_color: '#ffd700',
        background_color: '#1a1a2e',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: './',
        start_url: './',
        icons: [
          {
            src: './src/assets/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: './src/assets/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    }),
    
    // Bundle analyzer (only in analysis mode)
    process.env.ANALYZE && visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true
    })
  ],
  
  // Define global constants
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '2.1.0'),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
    __DEV__: process.env.NODE_ENV === 'development'
  },
  
  // Asset handling
  assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.svg', '**/*.ico'],
  
  // Module resolution
  resolve: {
    alias: {
      '@': '/src',
      '@css': '/src/css',
      '@js': '/src/js',
      '@assets': '/src/assets'
    }
  }
});