import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { UIManager } from '../../js/ui/UIManager.js';

const mountFullDOM = () => {
  document.body.innerHTML = `
    <div id="app" class="hidden">
      <div id="loading-screen"></div>
      <div id="session-info"></div>
      <div id="session-cards"></div>
      <div id="price-results" class="hidden">
        <div id="price-content"></div>
      </div>
      <div id="toast-container"></div>
      <nav>
        <button class="tab-btn" data-tab="price-checker">Price Checker</button>
        <button class="tab-btn" data-tab="pack-ripper">Pack Ripper</button>
      </nav>
      <section>
        <div class="tab-panel" id="price-checker-panel"></div>
        <div class="tab-panel" id="pack-ripper-panel"></div>
      </section>
      <form id="price-form">
        <input id="card-number" value="LOB-001" />
        <input id="card-name" value="Blue-Eyes White Dragon" />
        <select id="card-rarity">
          <option value="">Select</option>
          <option value="Ultra">Ultra</option>
        </select>
        <button id="check-price-btn" type="submit">Check</button>
        <button id="clear-form-btn" type="button">Clear</button>
      </form>
      <div class="session-controls">
        <button id="start-session-btn">Start</button>
        <button id="swap-set-btn" class="hidden">Swap</button>
        <button id="stop-session-btn" class="hidden">Stop</button>
        <button id="refresh-pricing-btn" disabled>Refresh</button>
        <button id="export-session-btn" disabled>Export</button>
        <button id="clear-session-btn" disabled>Clear</button>
      </div>
      <div id="current-set"></div>
      <div id="cards-count"></div>
      <div id="tcg-low-total"></div>
      <div id="tcg-market-total"></div>
      <div id="session-status" class="status-badge"></div>
    </div>
  `;
};

describe('UIManager Integration Tests', () => {
  let uiManager;
  let mockLogger;

  beforeEach(() => {
    mountFullDOM();
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn()
    };
    uiManager = new UIManager();
    uiManager.logger = mockLogger;
    uiManager.getDOMElements();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('initializes successfully against the real DOM', () => {
    const mockApp = {
      logger: mockLogger,
      sessionManager: {
        getCurrentSessionInfo: () => ({ cardCount: 0, tcgLowTotal: 0, tcgMarketTotal: 0 })
      }
    };

    return expect(uiManager.initialize(mockApp)).resolves.toBe(true);
  });

  it('switches tabs and updates ARIA attributes', () => {
    uiManager.switchTab('pack-ripper');
    const buttons = document.querySelectorAll('.tab-btn');
    expect(buttons[0].classList.contains('active')).toBe(false);
    expect(buttons[1].classList.contains('active')).toBe(true);
    expect(mockLogger.debug).toHaveBeenCalledWith('Switching to tab: pack-ripper');
  });

  it('collects price form data from the DOM', () => {
    const data = uiManager.collectPriceFormData();
    expect(data.cardNumber).toBe('LOB-001');
    expect(data.cardName).toBe('Blue-Eyes White Dragon');
  });

  it('displays price results asynchronously', () => {
    vi.useFakeTimers();
    const resultPayload = {
      success: true,
      data: { card_name: 'Blue-Eyes White Dragon' }
    };

    uiManager.displayPriceResults(resultPayload);
    vi.runAllTimers();

    const priceContent = document.getElementById('price-content');
    expect(priceContent.innerHTML).toContain('Blue-Eyes White Dragon');
  });

  it('updates session info and toggles control state', () => {
    const info = {
      setName: 'Legend of Blue Eyes',
      cardCount: 3,
      isActive: true,
      statistics: { tcgLowTotal: 25, tcgMarketTotal: 75 }
    };

    uiManager.updateSessionInfo(info);

    expect(document.getElementById('cards-count').textContent).toBe('3');
    expect(uiManager.elements.swapSetBtn.classList.contains('hidden')).toBe(false);
    expect(uiManager.elements.refreshPricingBtn.hasAttribute('disabled')).toBe(true);
  });
});
