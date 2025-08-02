/**
 * UIManager Integration Tests - Real Component Testing
 * 
 * Tests actual UIManager functionality with real DOM manipulation,
 * not mocked behaviors. Targets the 2,540 uncovered lines.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { UIManager } from '../../js/ui/UIManager.js';
import { Logger } from '../../js/utils/Logger.js';

// Setup real DOM environment
let dom;
let document;
let window;

beforeEach(() => {
  // Create real DOM environment
  dom = new JSDOM(`
    <!DOCTYPE html>
    <html>
      <head><title>Test</title></head>
      <body>
        <div id="app" class="hidden">
          <div id="loading-screen">
            <div class="progress-bar"></div>
            <div class="loading-text">Loading...</div>
          </div>
          
          <!-- Tab Navigation -->
          <nav>
            <button class="tab-btn" data-tab="price-checker">Price Checker</button>
            <button class="tab-btn" data-tab="pack-ripper">Pack Ripper</button>
          </nav>
          
          <div class="tab-panel" id="price-checker" data-tab="price-checker">
            <form id="price-form">
              <input id="card-number" type="text" required />
              <input id="card-name" type="text" />
              <select id="card-rarity" required>
                <option value="">Select rarity</option>
                <option value="common">Common</option>
                <option value="rare">Rare</option>
                <option value="ultra">Ultra Rare</option>
              </select>
              <input id="art-variant" type="text" />
              <select id="condition">
                <option value="near-mint">Near Mint</option>
                <option value="lightly-played">Lightly Played</option>
              </select>
              <input id="force-refresh" type="checkbox" />
              <button id="check-price-btn" type="submit">Check Price</button>
              <button id="clear-form-btn" type="button">Clear</button>
            </form>
            <div id="price-results" class="hidden">
              <div id="price-content"></div>
            </div>
          </div>
          
          <div class="tab-panel hidden" id="pack-ripper" data-tab="pack-ripper">
            <input id="set-search" type="text" placeholder="Search sets..." />
            <select id="set-select">
              <option value="">Select a set</option>
              <option value="LOB">Legend of Blue Eyes</option>
              <option value="MRD">Metal Raiders</option>
            </select>
            <button id="refresh-sets-btn">Refresh Sets</button>
            <button id="load-all-sets-btn">Load All Sets</button>
            <button id="start-session-btn" disabled>Start Session</button>
            <button id="swap-set-btn" class="hidden">Swap Set</button>
            <button id="stop-session-btn" class="hidden">Stop Session</button>
            
            <div id="session-info">
              <span id="current-set">No set selected</span>
              <span id="cards-count">0</span>
              <span id="tcg-low-total">$0.00</span>
              <span id="tcg-market-total">$0.00</span>
              <span id="session-status" class="status-badge inactive">Inactive</span>
              <span id="sets-count">0</span>
              <span id="total-sets-count">0</span>
            </div>
            
            <div id="session-cards"></div>
            
            <div class="session-controls">
              <button id="export-session-btn" disabled>Export Session</button>
              <button id="import-session-btn">Import Session</button>
              <button id="clear-session-btn" disabled>Clear Session</button>
              <button id="refresh-pricing-btn" disabled>Refresh Pricing</button>
            </div>
            
            <div class="view-controls">
              <label>
                <input id="consolidated-view-toggle" type="checkbox" />
                Consolidated View
              </label>
              <div id="card-size-section" class="hidden">
                <label>Card Size: <span id="card-size-value">120px</span></label>
                <input id="card-size-slider" type="range" min="80" max="200" value="120" />
              </div>
            </div>
          </div>
          
          <!-- Voice Controls -->
          <div class="voice-controls">
            <button id="start-voice-btn">Start Listening</button>
            <button id="stop-voice-btn" class="hidden">Stop Listening</button>
            <button id="test-voice-btn">Test Voice</button>
            <div id="voice-status">Ready</div>
            <div id="voice-transcript"></div>
          </div>
          
          <!-- Status Elements -->
          <div id="app-status">Ready</div>
          <div id="connection-status" class="online">Online</div>
          
          <!-- Modal and Toast Containers -->
          <div id="modal-overlay" class="hidden"></div>
          <div id="toast-container"></div>
          
          <!-- Settings and Help -->
          <button id="settings-btn">Settings</button>
          <button id="help-btn">Help</button>
          
          <div id="app-version">v2.1.0</div>
        </div>
      </body>
    </html>
  `, {
    url: 'http://localhost:8080',
    pretendToBeVisual: true,
    resources: 'usable'
  });

  // Setup globals
  global.window = dom.window;
  global.document = dom.window.document;
  global.navigator = {
    onLine: true,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    platform: 'MacIntel',
    language: 'en-US'
  };
  
  // Use safe property setting for location - avoid redefinition errors
  global.testUtils.safeOverride(dom.window, 'location', {
    hostname: 'localhost',
    protocol: 'http:',
    search: '',
    href: 'http://localhost:8080'
  });
  
  document = global.document;
  window = global.window;
});

afterEach(() => {
  if (dom) {
    dom.window.close();
  }
  vi.clearAllMocks();
});

describe('UIManager Integration Tests', () => {
  
  test('should initialize with real DOM elements', async () => {
    const logger = new Logger('UIManagerTest');
    const uiManager = new UIManager(logger);
    
    // Mock app for initialization
    const mockApp = {
      logger: logger,
      sessionManager: {
        getCurrentSessionInfo: () => ({
          isActive: false,
          cardCount: 0,
          currentSet: null,
          tcgLowTotal: 0,
          tcgMarketTotal: 0
        })
      }
    };
    
    // Test actual initialization with real DOM
    await uiManager.initialize(mockApp);
    
    expect(uiManager.app).toBe(mockApp);
    expect(uiManager.elements.app).toBeTruthy();
    expect(uiManager.elements.priceForm).toBeTruthy();
    expect(uiManager.elements.setSelect).toBeTruthy();
  });

  test('should handle real tab switching with DOM manipulation', async () => {
    const uiManager = new UIManager();
    const mockApp = { logger: new Logger('Test') };
    await uiManager.initialize(mockApp);
    
    // Test real tab switching
    uiManager.switchTab('pack-ripper');
    
    // Verify actual DOM changes
    const priceCheckerTab = document.getElementById('price-checker');
    const packRipperTab = document.getElementById('pack-ripper');
    
    expect(priceCheckerTab.classList.contains('hidden')).toBe(true);
    expect(packRipperTab.classList.contains('hidden')).toBe(false);
    expect(uiManager.currentTab).toBe('pack-ripper');
    
    // Test switching back
    uiManager.switchTab('price-checker');
    expect(priceCheckerTab.classList.contains('hidden')).toBe(false);
    expect(packRipperTab.classList.contains('hidden')).toBe(true);
  });

  test('should collect and validate real form data', async () => {
    const uiManager = new UIManager();
    const mockApp = { logger: new Logger('Test') };
    await uiManager.initialize(mockApp);
    
    // Fill form with actual values
    document.getElementById('card-number').value = 'LOB-001';
    document.getElementById('card-name').value = 'Blue-Eyes White Dragon';
    document.getElementById('card-rarity').value = 'ultra';
    document.getElementById('art-variant').value = '1st Edition';
    document.getElementById('condition').value = 'near-mint';
    document.getElementById('force-refresh').checked = true;
    
    // Test real form data collection
    const formData = uiManager.collectPriceFormData();
    
    expect(formData.cardNumber).toBe('LOB-001');
    expect(formData.cardName).toBe('Blue-Eyes White Dragon');
    expect(formData.rarity).toBe('ultra');
    expect(formData.artVariant).toBe('1st Edition');
    expect(formData.condition).toBe('near-mint');
    expect(formData.forceRefresh).toBe(true);
  });

  test('should perform real form validation with error highlighting', async () => {
    const uiManager = new UIManager();
    const mockApp = { logger: new Logger('Test') };
    await uiManager.initialize(mockApp);
    
    // Test validation with missing required fields
    const invalidFormData = {
      cardNumber: '',
      rarity: '',
      cardName: 'Test Card'
    };
    
    const isValid = uiManager.validatePriceForm(invalidFormData);
    
    expect(isValid).toBe(false);
    
    // Verify actual DOM error highlighting
    const cardNumberInput = document.getElementById('card-number');
    const raritySelect = document.getElementById('card-rarity');
    
    expect(cardNumberInput.classList.contains('error')).toBe(true);
    expect(raritySelect.classList.contains('error')).toBe(true);
    expect(cardNumberInput.getAttribute('aria-invalid')).toBe('true');
  });

  test('should display real toast notifications with DOM manipulation', async () => {
    const uiManager = new UIManager();
    const mockApp = { logger: new Logger('Test') };
    await uiManager.initialize(mockApp);
    
    // Test actual toast creation
    uiManager.showToast('Test message', 'success');
    
    const toastContainer = document.getElementById('toast-container');
    const toasts = toastContainer.querySelectorAll('.toast');
    
    expect(toasts.length).toBe(1);
    expect(toasts[0].textContent).toContain('Test message');
    expect(toasts[0].classList.contains('toast-success')).toBe(true);
    
    // Test multiple toasts
    uiManager.showToast('Error message', 'error');
    uiManager.showToast('Warning message', 'warning');
    
    const allToasts = toastContainer.querySelectorAll('.toast');
    expect(allToasts.length).toBe(3);
  });

  test('should handle real session info updates with DOM changes', async () => {
    const uiManager = new UIManager();
    const mockApp = { 
      logger: new Logger('Test'),
      sessionManager: {
        getCurrentSessionInfo: () => ({
          isActive: true,
          cardCount: 5,
          currentSet: 'Legend of Blue Eyes',
          tcgLowTotal: 25.50,
          tcgMarketTotal: 45.75
        }),
        getImportedCardsInfo: () => ({
          hasImportedCards: true,
          importedCards: 3
        })
      }
    };
    await uiManager.initialize(mockApp);
    
    // Test real session info update
    const sessionInfo = {
      isActive: true,
      cardCount: 5,
      currentSet: 'Legend of Blue Eyes',
      tcgLowTotal: 25.50,
      tcgMarketTotal: 45.75
    };
    
    uiManager.updateSessionInfo(sessionInfo);
    
    // Verify actual DOM updates
    expect(document.getElementById('current-set').textContent).toBe('Legend of Blue Eyes');
    expect(document.getElementById('cards-count').textContent).toBe('5');
    expect(document.getElementById('tcg-low-total').textContent).toBe('$25.50');
    expect(document.getElementById('tcg-market-total').textContent).toBe('$45.75');
    
    const sessionStatus = document.getElementById('session-status');
    expect(sessionStatus.classList.contains('active')).toBe(true);
    expect(sessionStatus.classList.contains('inactive')).toBe(false);
  });

  test('should handle real price results display with HTML generation', async () => {
    const uiManager = new UIManager();
    const mockApp = { logger: new Logger('Test') };
    await uiManager.initialize(mockApp);
    
    // Test real price results display
    const mockResults = {
      success: true,
      data: {
        card_name: 'Blue-Eyes White Dragon',
        card_number: 'LOB-001',
        card_rarity: 'Ultra Rare',
        tcg_price: '25.50',
        tcg_market_price: '45.75',
        image_url: 'https://example.com/card.jpg'
      },
      aggregated: {
        averagePrice: 35.63,
        lowestPrice: 20.00,
        highestPrice: 50.00,
        confidence: 0.85
      }
    };
    
    uiManager.displayPriceResults(mockResults);
    
    // Verify actual DOM content generation
    const priceResults = document.getElementById('price-results');
    const priceContent = document.getElementById('price-content');
    
    expect(priceResults.classList.contains('hidden')).toBe(false);
    expect(priceContent.innerHTML).toContain('Blue-Eyes White Dragon');
    expect(priceContent.innerHTML).toContain('LOB-001');
    expect(priceContent.innerHTML).toContain('$25.50');
    expect(priceContent.innerHTML).toContain('$45.75');
  });

  test('should handle real event listeners and callbacks', async () => {
    const uiManager = new UIManager();
    const mockApp = { logger: new Logger('Test') };
    await uiManager.initialize(mockApp);
    
    let priceCheckCalled = false;
    let sessionStartCalled = false;
    let voiceStartCalled = false;
    
    // Register real event listeners
    uiManager.onPriceCheck(() => { priceCheckCalled = true; });
    uiManager.onSessionStart(() => { sessionStartCalled = true; });
    uiManager.onVoiceStart(() => { voiceStartCalled = true; });
    
    // Test real event emission
    uiManager.emitPriceCheck({ cardNumber: 'LOB-001', rarity: 'ultra' });
    uiManager.emitSessionStart('LOB');
    uiManager.emitVoiceStart();
    
    expect(priceCheckCalled).toBe(true);
    expect(sessionStartCalled).toBe(true);
    expect(voiceStartCalled).toBe(true);
  });

  test('should handle real consolidated view toggle with DOM changes', async () => {
    const uiManager = new UIManager();
    const mockApp = { logger: new Logger('Test') };
    await uiManager.initialize(mockApp);
    
    // Test consolidated view toggle
    uiManager.handleViewToggle(true);
    
    expect(uiManager.isConsolidatedView).toBe(true);
    
    const cardSizeSection = document.getElementById('card-size-section');
    expect(cardSizeSection.classList.contains('hidden')).toBe(false);
    
    // Toggle back off
    uiManager.handleViewToggle(false);
    expect(uiManager.isConsolidatedView).toBe(false);
    expect(cardSizeSection.classList.contains('hidden')).toBe(true);
  });

  test('should handle real card size adjustments', async () => {
    const uiManager = new UIManager();
    const mockApp = { logger: new Logger('Test') };
    await uiManager.initialize(mockApp);
    
    // Test card size change
    uiManager.handleCardSizeChange(150);
    
    expect(uiManager.cardSize).toBe(150);
    
    const cardSizeValue = document.getElementById('card-size-value');
    expect(cardSizeValue.textContent).toBe('150px');
  });

  test('should handle real loading states with DOM updates', async () => {
    const uiManager = new UIManager();
    const mockApp = { logger: new Logger('Test') };
    await uiManager.initialize(mockApp);
    
    // Test loading state
    uiManager.setLoading(true);
    
    expect(uiManager.isLoading).toBe(true);
    
    // Check submit buttons are disabled
    const submitBtns = document.querySelectorAll('button[type="submit"], .btn-primary');
    submitBtns.forEach(btn => {
      expect(btn.disabled).toBe(true);
      expect(btn.classList.contains('loading')).toBe(true);
    });
    
    // Test loading off
    uiManager.setLoading(false);
    expect(uiManager.isLoading).toBe(false);
  });

  test('should handle real error boundaries and recovery', async () => {
    const uiManager = new UIManager();
    const mockApp = { logger: new Logger('Test') };
    await uiManager.initialize(mockApp);
    
    // Test error highlighting
    const cardNumberInput = document.getElementById('card-number');
    uiManager.highlightError(cardNumberInput);
    
    expect(cardNumberInput.classList.contains('error')).toBe(true);
    expect(cardNumberInput.getAttribute('aria-invalid')).toBe('true');
    
    // Test error clearing
    uiManager.clearErrorHighlights();
    expect(cardNumberInput.classList.contains('error')).toBe(false);
    expect(cardNumberInput.hasAttribute('aria-invalid')).toBe(false);
  });

  test('should handle real responsive design updates', async () => {
    const uiManager = new UIManager();
    const mockApp = { logger: new Logger('Test') };
    await uiManager.initialize(mockApp);
    
    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', { value: 480 });
    Object.defineProperty(window, 'innerHeight', { value: 800 });
    
    // Test responsive class updates
    uiManager.updateResponsiveClasses();
    
    const app = document.getElementById('app');
    expect(app.classList.contains('mobile')).toBe(true);
  });

});