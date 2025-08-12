/**
 * Migration Functionality Preservation Tests
 * 
 * This test suite validates that all existing functionality is preserved
 * during the migration from legacy YGOpwa theme to VoxRip space theme.
 * 
 * Critical Requirements:
 * - Zero functionality regression
 * - All features work in both themes
 * - Data integrity maintained
 * - Performance parity preserved
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { FeatureFlags } from '../../js/utils/FeatureFlags.js';
import { SelectorMapper } from '../../js/utils/SelectorMapper.js';
import { MigrationManager } from '../../js/utils/MigrationManager.js';

// Mock DOM environment
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="src/css/space-theme-bridge.css">
  <link rel="stylesheet" href="src/css/space-layout.css" disabled id="space-layout-css">
</head>
<body>
  <!-- Legacy Layout -->
  <div id="app" class="app">
    <header class="app-header">
      <h1 class="app-title">YGO Ripper UI v2</h1>
    </header>
    <nav class="tab-navigation">
      <button class="tab-btn" data-tab="price-checker">Price Checker</button>
      <button class="tab-btn" data-tab="pack-ripper">Pack Ripper</button>
    </nav>
    <main class="main-content">
      <div id="price-checker-panel" class="tab-panel">
        <form id="price-form">
          <input type="text" id="cardNumber">
          <select id="rarity"></select>
          <button type="submit" class="btn btn-primary">Check Price</button>
        </form>
      </div>
    </main>
  </div>

  <!-- Space Layout -->
  <div id="space-app" class="space-layout hidden">
    <div class="deep-space-bg"></div>
    <div class="star-layers"></div>
    <div class="cosmic-elements"></div>
    <div class="container">
      <header class="header">
        <div class="logo">
          <div class="logo-icon">🃏</div>
          <div class="logo-text">
            <h1>YGO Ripper</h1>
            <p>Deep Space Interface</p>
          </div>
        </div>
      </header>
      <nav class="left-panel">
        <div class="nav-item active" data-tab="price-checker">Price Scanner</div>
        <div class="nav-item" data-tab="pack-ripper">Pack Ripper</div>
      </nav>
      <main class="center-panel">
        <div class="function-interface">
          <div class="form-grid">
            <input type="text" id="card-number-space">
            <select id="rarity-space"></select>
            <button class="btn btn-primary">Check Price</button>
          </div>
        </div>
      </main>
      <aside class="right-panel">
        <div class="stat-section">
          <div class="stat-item">
            <span class="stat-label">Total Cards</span>
            <span class="stat-value" id="space-total-cards">0</span>
          </div>
        </div>
      </aside>
    </div>
  </div>

  <div id="toast-container"></div>
  <div id="modal-overlay" class="hidden"></div>
</body>
</html>
`, {
  url: 'http://localhost:3000',
  pretendToBeVisual: true,
  resources: 'usable'
});

// Set up global DOM
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.localStorage = {
  data: {},
  getItem(key) { return this.data[key] || null; },
  setItem(key, value) { this.data[key] = value; },
  removeItem(key) { delete this.data[key]; },
  clear() { this.data = {}; }
};

describe('Migration Functionality Preservation', () => {
  let featureFlags;
  let selectorMapper;
  let migrationManager;
  
  beforeEach(async () => {
    // Clear localStorage
    global.localStorage.clear();
    
    // Initialize systems
    featureFlags = new FeatureFlags({
      developmentOverrides: true,
      analyticsEnabled: false
    });
    
    selectorMapper = new SelectorMapper(featureFlags);
    
    migrationManager = new MigrationManager({
      debugMode: true,
      enableAnalytics: false,
      performanceMonitoring: true
    });
  });

  afterEach(async () => {
    if (migrationManager) {
      migrationManager.destroy();
    }
    if (selectorMapper) {
      selectorMapper.destroy();
    }
    if (featureFlags) {
      featureFlags.destroy();
    }
  });

  describe('FeatureFlags System', () => {
    test('should initialize with correct default states', () => {
      expect(featureFlags.isEnabled('USE_SPACE_THEME')).toBe(false);
      expect(featureFlags.isEnabled('ENABLE_ANIMATIONS')).toBe(false);
      expect(featureFlags.isEnabled('PERFORMANCE_MONITORING')).toBe(true);
    });

    test('should persist flag states across sessions', () => {
      featureFlags.setFlag('USE_SPACE_THEME', true);
      expect(featureFlags.isEnabled('USE_SPACE_THEME')).toBe(true);
      
      // Create new instance to simulate page reload
      const newFeatureFlags = new FeatureFlags();
      expect(newFeatureFlags.isEnabled('USE_SPACE_THEME')).toBe(true);
    });

    test('should handle flag dependencies correctly', () => {
      // ENABLE_ANIMATIONS depends on USE_SPACE_THEME
      featureFlags.setFlag('ENABLE_ANIMATIONS', true);
      expect(featureFlags.isEnabled('ENABLE_ANIMATIONS')).toBe(false); // Should be false due to dependency
      
      featureFlags.setFlag('USE_SPACE_THEME', true);
      expect(featureFlags.isEnabled('ENABLE_ANIMATIONS')).toBe(true); // Now should be true
    });

    test('should track flag usage analytics', () => {
      featureFlags.isEnabled('USE_SPACE_THEME');
      featureFlags.isEnabled('USE_SPACE_THEME');
      featureFlags.setFlag('USE_SPACE_THEME', true);
      
      const stats = featureFlags.analytics.flagUsage;
      expect(stats.USE_SPACE_THEME.checked).toBe(2);
      expect(stats.USE_SPACE_THEME.manually_set).toBe(1);
    });
  });

  describe('SelectorMapper System', () => {
    test('should return legacy selectors by default', () => {
      expect(selectorMapper.getSelector('appHeader')).toBe('.app-header');
      expect(selectorMapper.getSelector('tabButton')).toBe('.tab-btn');
      expect(selectorMapper.getSelector('mainContent')).toBe('.main-content');
    });

    test('should switch to space selectors when space theme is active', () => {
      selectorMapper.switchTheme('space');
      
      expect(selectorMapper.getSelector('appHeader')).toBe('.header');
      expect(selectorMapper.getSelector('tabButton')).toBe('.nav-item');
      expect(selectorMapper.getSelector('mainContent')).toBe('.center-panel');
    });

    test('should find DOM elements correctly in both themes', () => {
      // Legacy theme
      expect(selectorMapper.exists('appHeader')).toBe(true);
      expect(selectorMapper.exists('tabButton')).toBe(true);
      
      // Space theme
      selectorMapper.switchTheme('space');
      expect(selectorMapper.exists('appHeader')).toBe(true);
      expect(selectorMapper.exists('tabButton')).toBe(true);
    });

    test('should cache selectors for performance', () => {
      const selector1 = selectorMapper.getSelector('appHeader');
      const selector2 = selectorMapper.getSelector('appHeader');
      
      expect(selector1).toBe(selector2);
      
      const stats = selectorMapper.getUsageStats();
      expect(stats.appHeader.cache_hit).toBe(1);
    });

    test('should validate critical selectors exist', () => {
      const validation = selectorMapper.validateSelectors();
      
      expect(validation.valid).toBe(true);
      expect(validation.found).toContain('appHeader');
      expect(validation.found).toContain('mainContent');
      expect(validation.missing).toHaveLength(0);
    });

    test('should wait for elements to appear', async () => {
      // Create element after delay
      setTimeout(() => {
        const element = document.createElement('div');
        element.className = 'delayed-element';
        document.body.appendChild(element);
      }, 100);
      
      selectorMapper.legacySelectors.delayed = '.delayed-element';
      
      const element = await selectorMapper.waitForElement('delayed', 1000);
      expect(element).toBeTruthy();
      expect(element.className).toBe('delayed-element');
    });
  });

  describe('MigrationManager System', () => {
    test('should initialize with legacy theme by default', async () => {
      expect(migrationManager.currentTheme).toBe('legacy');
      expect(document.getElementById('app').classList.contains('hidden')).toBe(false);
      expect(document.getElementById('space-app').classList.contains('hidden')).toBe(true);
    });

    test('should switch themes correctly', async () => {
      await migrationManager.switchTheme('space');
      
      expect(migrationManager.currentTheme).toBe('space');
      expect(document.body.classList.contains('space-theme')).toBe(true);
      expect(document.getElementById('app').classList.contains('hidden')).toBe(true);
      expect(document.getElementById('space-app').classList.contains('hidden')).toBe(false);
    });

    test('should preserve theme state across switches', async () => {
      await migrationManager.switchTheme('space');
      await migrationManager.switchTheme('legacy');
      await migrationManager.switchTheme('space');
      
      expect(migrationManager.currentTheme).toBe('space');
      expect(document.body.classList.contains('space-theme')).toBe(true);
    });

    test('should handle theme switch failures gracefully', async () => {
      // Mock a failure condition
      const originalInitialize = migrationManager.initializeSpaceTheme;
      migrationManager.initializeSpaceTheme = vi.fn().mockRejectedValue(new Error('Mock failure'));
      
      await expect(migrationManager.switchTheme('space')).rejects.toThrow('Mock failure');
      expect(migrationManager.currentTheme).toBe('legacy');
      
      // Restore original method
      migrationManager.initializeSpaceTheme = originalInitialize;
    });

    test('should generate star field correctly', () => {
      migrationManager.generateStarField();
      
      const starLayers = document.querySelector('.star-layers');
      expect(starLayers.children.length).toBe(3);
      
      // Check each layer has stars
      for (let i = 1; i <= 3; i++) {
        const layer = document.querySelector(`.star-layer-${i}`);
        expect(layer).toBeTruthy();
        expect(layer.children.length).toBeGreaterThan(0);
      }
    });

    test('should track migration history', async () => {
      await migrationManager.switchTheme('space');
      await migrationManager.switchTheme('legacy');
      
      const history = migrationManager.migrationHistory;
      expect(history).toHaveLength(2);
      expect(history[0]).toEqual(expect.objectContaining({
        from: 'legacy',
        to: 'space',
        trigger: 'manual'
      }));
      expect(history[1]).toEqual(expect.objectContaining({
        from: 'space',
        to: 'legacy',
        trigger: 'manual'
      }));
    });

    test('should record performance metrics', async () => {
      await migrationManager.switchTheme('space');
      
      const metrics = migrationManager.getPerformanceMetrics();
      expect(metrics.themeSwitch).toHaveLength(1);
      expect(metrics.themeSwitch[0].value).toBeGreaterThan(0);
    });
  });

  describe('Theme Switching Integration', () => {
    test('should maintain selector mapping consistency during theme switch', async () => {
      // Initially should use legacy selectors
      expect(selectorMapper.getSelector('appHeader')).toBe('.app-header');
      
      // Switch to space theme
      await migrationManager.switchTheme('space');
      
      // Should now use space selectors
      expect(selectorMapper.getSelector('appHeader')).toBe('.header');
      
      // Switch back to legacy
      await migrationManager.switchTheme('legacy');
      
      // Should use legacy selectors again
      expect(selectorMapper.getSelector('appHeader')).toBe('.app-header');
    });

    test('should preserve feature flag states during theme switches', async () => {
      featureFlags.setFlag('PERFORMANCE_MONITORING', true);
      featureFlags.setFlag('ENHANCED_DEBUGGING', true);
      
      await migrationManager.switchTheme('space');
      
      expect(featureFlags.isEnabled('PERFORMANCE_MONITORING')).toBe(true);
      expect(featureFlags.isEnabled('ENHANCED_DEBUGGING')).toBe(true);
      expect(featureFlags.isEnabled('USE_SPACE_THEME')).toBe(true);
      
      await migrationManager.switchTheme('legacy');
      
      expect(featureFlags.isEnabled('PERFORMANCE_MONITORING')).toBe(true);
      expect(featureFlags.isEnabled('ENHANCED_DEBUGGING')).toBe(true);
      expect(featureFlags.isEnabled('USE_SPACE_THEME')).toBe(false);
    });

    test('should dispatch theme change events', async () => {
      let eventFired = false;
      let eventDetail = null;
      
      window.addEventListener('themeChanged', (event) => {
        eventFired = true;
        eventDetail = event.detail;
      });
      
      await migrationManager.switchTheme('space');
      
      expect(eventFired).toBe(true);
      expect(eventDetail).toEqual(expect.objectContaining({
        from: 'legacy',
        to: 'space'
      }));
    });
  });

  describe('DOM Element Access Preservation', () => {
    test('should access form elements consistently across themes', () => {
      // Legacy theme
      const legacyCardInput = selectorMapper.getElement('cardNumberInput');
      const legacyRaritySelect = selectorMapper.getElement('raritySelect');
      
      expect(legacyCardInput).toBeTruthy();
      expect(legacyRaritySelect).toBeTruthy();
      
      // Space theme
      selectorMapper.switchTheme('space');
      const spaceCardInput = selectorMapper.getElement('cardNumberInput');
      const spaceRaritySelect = selectorMapper.getElement('raritySelect');
      
      expect(spaceCardInput).toBeTruthy();
      expect(spaceRaritySelect).toBeTruthy();
      
      // Different elements but both accessible
      expect(legacyCardInput.id).toBe('cardNumber');
      expect(spaceCardInput.id).toBe('card-number-space');
    });

    test('should handle missing elements gracefully', () => {
      const nonExistentElement = selectorMapper.getElement('nonExistentElement');
      expect(nonExistentElement).toBeNull();
      
      const validation = selectorMapper.validateSelectors();
      expect(validation.missing).not.toContain('nonExistentElement');
    });

    test('should support multiple element selection', () => {
      // Add multiple buttons to test
      const button1 = document.createElement('button');
      button1.className = 'btn btn-primary';
      const button2 = document.createElement('button');
      button2.className = 'btn btn-primary';
      document.body.appendChild(button1);
      document.body.appendChild(button2);
      
      const buttons = selectorMapper.getElements('btnPrimary');
      expect(buttons.length).toBeGreaterThan(1);
    });
  });

  describe('Data Integrity Preservation', () => {
    test('should preserve localStorage data across theme switches', async () => {
      // Set test data
      global.localStorage.setItem('test-session', JSON.stringify({
        id: 'test-123',
        cards: [{ name: 'Blue-Eyes White Dragon', quantity: 3 }]
      }));
      
      global.localStorage.setItem('user-settings', JSON.stringify({
        autoSave: true,
        theme: 'legacy'
      }));
      
      await migrationManager.switchTheme('space');
      
      // Data should still exist
      const sessionData = JSON.parse(global.localStorage.getItem('test-session'));
      const settingsData = JSON.parse(global.localStorage.getItem('user-settings'));
      
      expect(sessionData.id).toBe('test-123');
      expect(sessionData.cards).toHaveLength(1);
      expect(settingsData.autoSave).toBe(true);
    });

    test('should handle localStorage quota exceeded gracefully', () => {
      // Mock localStorage to throw quota exceeded error
      const originalSetItem = global.localStorage.setItem;
      global.localStorage.setItem = vi.fn().mockImplementation(() => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });
      
      expect(() => {
        featureFlags.setFlag('TEST_FLAG', true);
      }).not.toThrow();
      
      // Restore original method
      global.localStorage.setItem = originalSetItem;
    });

    test('should validate data integrity after migration', async () => {
      // Set up test data
      const testData = {
        sessions: [{ id: '1', cards: [] }],
        settings: { theme: 'legacy' },
        patterns: [{ input: 'test', output: 'Test Card' }]
      };
      
      Object.entries(testData).forEach(([key, value]) => {
        global.localStorage.setItem(key, JSON.stringify(value));
      });
      
      await migrationManager.switchTheme('space');
      
      // Verify all data is still intact
      Object.entries(testData).forEach(([key, originalValue]) => {
        const storedValue = JSON.parse(global.localStorage.getItem(key));
        expect(storedValue).toEqual(originalValue);
      });
    });
  });

  describe('Performance Preservation', () => {
    test('should maintain acceptable theme switch performance', async () => {
      const startTime = performance.now();
      await migrationManager.switchTheme('space');
      const duration = performance.now() - startTime;
      
      // Theme switch should complete within 1 second
      expect(duration).toBeLessThan(1000);
    });

    test('should not cause memory leaks during theme switches', async () => {
      const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
      
      // Perform multiple theme switches
      for (let i = 0; i < 5; i++) {
        await migrationManager.switchTheme('space');
        await migrationManager.switchTheme('legacy');
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
      
      // Memory should not increase significantly (allow 10MB increase)
      if (performance.memory) {
        expect(finalMemory - initialMemory).toBeLessThan(10 * 1024 * 1024);
      }
    });

    test('should track performance metrics correctly', async () => {
      await migrationManager.switchTheme('space');
      await migrationManager.switchTheme('legacy');
      
      const metrics = migrationManager.getPerformanceMetrics();
      
      expect(metrics.themeSwitch.length).toBe(2);
      metrics.themeSwitch.forEach(metric => {
        expect(metric.value).toBeGreaterThan(0);
        expect(metric.timestamp).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle initialization failures gracefully', async () => {
      // Mock space theme initialization to fail
      const originalInit = migrationManager.initializeSpaceTheme;
      migrationManager.initializeSpaceTheme = vi.fn().mockRejectedValue(new Error('Init failed'));
      
      await expect(migrationManager.switchTheme('space')).rejects.toThrow('Init failed');
      
      // Should remain in legacy theme
      expect(migrationManager.currentTheme).toBe('legacy');
      expect(document.getElementById('app').classList.contains('hidden')).toBe(false);
      
      // Restore original method
      migrationManager.initializeSpaceTheme = originalInit;
    });

    test('should prevent concurrent theme switches', async () => {
      // Start two theme switches simultaneously
      const promise1 = migrationManager.switchTheme('space');
      const promise2 = migrationManager.switchTheme('legacy');
      
      await promise1;
      await promise2;
      
      // Only one should have succeeded
      expect(migrationManager.currentTheme).toBe('space');
    });

    test('should clean up resources properly', () => {
      const status = migrationManager.getStatus();
      expect(status.currentTheme).toBe('legacy');
      expect(status.enabledFlags).toBeDefined();
      
      migrationManager.destroy();
      
      // Should not throw errors after cleanup
      expect(() => migrationManager.getStatus()).not.toThrow();
    });
  });

  describe('Accessibility Preservation', () => {
    test('should preserve ARIA attributes across themes', async () => {
      // Check legacy theme ARIA
      const legacyTab = document.querySelector('.tab-btn');
      if (legacyTab) {
        legacyTab.setAttribute('role', 'tab');
        legacyTab.setAttribute('aria-selected', 'false');
      }
      
      await migrationManager.switchTheme('space');
      
      // Check space theme ARIA
      const spaceTab = selectorMapper.getElement('tabButton');
      if (spaceTab) {
        expect(spaceTab.getAttribute('role')).toBeTruthy();
      }
    });

    test('should maintain keyboard navigation', async () => {
      const focusableElements = document.querySelectorAll('[tabindex], button, input, select');
      const initialCount = focusableElements.length;
      
      await migrationManager.switchTheme('space');
      
      const spaceFocusableElements = document.querySelectorAll('[tabindex], button, input, select');
      
      // Should have similar number of focusable elements
      expect(spaceFocusableElements.length).toBeGreaterThanOrEqual(initialCount * 0.8);
    });
  });
});

describe('Integration with Existing Systems', () => {
  test('should not interfere with existing JavaScript modules', () => {
    // Verify global objects are not polluted
    const globalKeys = Object.keys(global);
    const unexpectedGlobals = globalKeys.filter(key => 
      key.startsWith('ygo') || key.startsWith('space') || key.startsWith('migration')
    );
    
    expect(unexpectedGlobals).toHaveLength(0);
  });

  test('should work with existing event system', async () => {
    let customEventFired = false;
    
    document.addEventListener('custom-test-event', () => {
      customEventFired = true;
    });
    
    await migrationManager.switchTheme('space');
    
    // Dispatch custom event
    document.dispatchEvent(new CustomEvent('custom-test-event'));
    
    expect(customEventFired).toBe(true);
  });

  test('should preserve existing CSS class functionality', async () => {
    const testElement = document.createElement('div');
    testElement.classList.add('existing-class');
    document.body.appendChild(testElement);
    
    await migrationManager.switchTheme('space');
    
    expect(testElement.classList.contains('existing-class')).toBe(true);
  });
});