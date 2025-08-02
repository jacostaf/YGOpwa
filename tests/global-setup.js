/**
 * Global setup for ImageManager browser testing
 * Sets up test environment and fixtures
 */

import { chromium } from '@playwright/test';
import { createTestImageFixtures } from './fixtures/test-image-generator.js';

async function globalSetup() {
  console.log('Setting up ImageManager test environment...');
  
  // Create test image fixtures
  await createTestImageFixtures();
  
  // Warm up browser for faster test execution
  const browser = await chromium.launch();
  await browser.close();
  
  console.log('ImageManager test environment ready');
}

export default globalSetup;