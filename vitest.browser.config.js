import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Browser-only configuration for ImageManager tests
    globals: true,
    setupFiles: ['./tests/production-legacy/browser-setup.js'], // Browser-specific setup
    include: ['tests/production-legacy/unit/imageManager.browser.test.js'], // Use browser-compatible test
    
    // Browser configuration with required provider
    browser: {
      enabled: true,
      provider: 'playwright', // Required for coverage
      instances: [
        {
          browser: 'chromium'
        }
      ],
      headless: true,
      screenshotOnFailure: true
    },
    
    coverage: {
      provider: 'istanbul', // Istanbul works better with browser mode
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage-browser',
      
      include: [
        'src/js/utils/ImageManager.js' // Only ImageManager
      ],
      
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.js',
        '**/*.test.js'
      ],
      
      thresholds: {
        lines: 50, // Lower threshold for initial browser testing
        functions: 50,
        branches: 50,
        statements: 50
      },
      
      all: true,
      clean: true,
      reportOnFailure: true
    },
    
    testTimeout: 20000
  }
});