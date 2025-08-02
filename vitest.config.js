import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Default environment for most tests (back to JSDOM)
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.js'],
    include: ['src/tests/**/*.test.js'],
    // Exclude browser-specific tests from main config
    exclude: ['src/tests/unit/imageManager.browser.test.js'],
    
    coverage: {
      // Explicitly specify the coverage provider
      provider: 'v8',
      
      // Define output formats and directory
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      
      // Include source files for coverage analysis
      include: [
        'src/**/*.js',
        'js/**/*.js'  // Include js directory to catch TestRunner.js for exclusion
      ],
      
      exclude: [
        'node_modules/',
        'src/tests/',
        '**/*.config.js',
        '**/*.test.js',
        'src/tests/**/*',
        'coverage/**/*',
        '**/*.spec.js',
        'js/tests/**/*',  // Exclude all test infrastructure files
        '**/TestRunner.js'  // Explicit exclusion pattern for TestRunner.js
      ],
      
      // Lowered thresholds to realistic levels for development
      thresholds: {
        lines: 75,
        functions: 70,
        branches: 65,
        statements: 75
      },
      
      // Ensure coverage reports are always generated
      all: true,
      skipFull: false,
      
      // Clean coverage results before new runs
      clean: true,
      
      // Enable detailed reporting
      reportOnFailure: true
    },
    testTimeout: 15000, // Increased timeout for voice tests
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,
    // Continue running tests even if some fail
    passWithNoTests: true
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});