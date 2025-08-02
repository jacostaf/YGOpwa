import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E testing and ImageManager browser testing
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'test-results/html-report' }],
    ['json', { outputFile: 'test-results/test-results.json' }]
  ],
  
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:8080',
    
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Take screenshots on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
    
    /* Timeout for each test */
    actionTimeout: 15000, // Increased for image loading
    
    /* Browser context options */
    contextOptions: {
      // Enable service workers for PWA testing
      serviceWorkers: 'allow'
    }
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Remove microphone permission for ImageManager tests
        permissions: [],
        // Additional Chrome-specific settings for Canvas and image testing
        launchOptions: {
          args: [
            '--use-fake-ui-for-media-stream',
            '--use-fake-device-for-media-stream',
            '--disable-web-security', // For Canvas toDataURL operations
            '--allow-running-insecure-content'
          ]
        }
      },
    },

    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        // Firefox doesn't support microphone permission in this context
        permissions: [],
      },
    },

    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        permissions: [],
      },
    },

    /* Test against mobile viewports for responsive ImageManager behavior */
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        permissions: [],
      },
    },
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12'],
        permissions: [],
      },
    },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Configure test timeouts for browser-based image operations */
  timeout: 60000, // 60 seconds for full test timeout
  
  /* Global setup for ImageManager testing */
  globalSetup: './tests/global-setup.js',

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run start',
    port: 8080,
    reuseExistingServer: !process.env.CI,
    timeout: 30000
  },
});