/**
 * Unit tests for UIManager.js
 * Comprehensive testing to improve line coverage from 45% to 75%+
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UIManager } from '../../js/ui/UIManager.js';
import { Logger } from '../../js/utils/Logger.js';

// Mock DOM environment
const createMockDOM = () => {
  // Helper to create a fully functional mock element
  const createMockElement = (type = 'div', additionalProps = {}) => {
    const element = {
      tagName: type.toUpperCase(),
      type: type === 'input' ? 'text' : undefined,
      id: '',
      className: '',
      value: '',
      textContent: '',
      innerHTML: '',
      checked: false,
      disabled: false,
      hidden: false,
      style: {
        display: '',
        visibility: '',
        opacity: '',
        setProperty: vi.fn(),
        removeProperty: vi.fn(),
        getPropertyValue: vi.fn().mockReturnValue('')
      },
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
        toggle: vi.fn((className, force) => {
          if (force !== undefined) return force;
          return !element.className.includes(className);
        }),
        contains: vi.fn((className) => element.className.includes(className))
      },
      dataset: {},
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      setAttribute: vi.fn((name, value) => {
        if (name === 'class') element.className = value;
        element[name] = value;
      }),
      getAttribute: vi.fn((name) => {
        if (name === 'class') return element.className;
        return element[name] || null;
      }),
      removeAttribute: vi.fn((name) => {
        if (name === 'class') element.className = '';
        delete element[name];
      }),
      hasAttribute: vi.fn((name) => {
        if (name === 'class') return Boolean(element.className);
        return element[name] !== undefined;
      }),
      toggleAttribute: vi.fn(),
      appendChild: vi.fn(),
      removeChild: vi.fn(),
      querySelector: vi.fn(),
      querySelectorAll: vi.fn().mockReturnValue([]),
      getBoundingClientRect: vi.fn(() => ({
        top: 0, left: 0, right: 100, bottom: 100, width: 100, height: 100
      })),
      scrollIntoView: vi.fn(),
      focus: vi.fn(),
      blur: vi.fn(),
      click: vi.fn(),
      remove: vi.fn(),
      reset: vi.fn(), // For forms
      ...additionalProps
    };
    return element;
  };

  // Create mock elements that UIManager expects
  const mockElements = {
    app: createMockElement('div'),
    loadingScreen: createMockElement('div'),
    priceForm: createMockElement('form'),
    cardNumber: createMockElement('input', { value: 'LOB-001' }),
    cardName: createMockElement('input', { value: 'Blue-Eyes White Dragon' }),
    cardRarity: createMockElement('select', { value: 'Ultra Rare' }),
    artVariant: createMockElement('input'),
    condition: createMockElement('select', { value: 'near-mint' }),
    forceRefresh: createMockElement('input', { type: 'checkbox', checked: false }),
    checkPriceBtn: createMockElement('button'),
    clearFormBtn: createMockElement('button'),
    priceResults: createMockElement('div'),
    priceContent: createMockElement('div'),
    setSearch: createMockElement('input'),
    setSelect: createMockElement('select', { 
      children: [], 
      appendChild: vi.fn(),
      value: ''
    }),
    refreshSetsBtn: createMockElement('button'),
    loadAllSetsBtn: createMockElement('button'),
    startSessionBtn: createMockElement('button'),
    currentSet: createMockElement('span'),
    cardsCount: createMockElement('span'),
    tcgLowTotal: createMockElement('span'),
    tcgMarketTotal: createMockElement('span'),
    sessionStatus: createMockElement('span'),
    setsCount: createMockElement('span'),
    totalSetsCount: createMockElement('span'),
    voiceStatus: createMockElement('div'),
    voiceIndicator: createMockElement('div'),
    voiceStatusText: createMockElement('span'),
    startVoiceBtn: createMockElement('button'),
    stopVoiceBtn: createMockElement('button'),
    testVoiceBtn: createMockElement('button'),
    floatingVoiceSubmenu: createMockElement('div'),
    floatingStopVoiceBtn: createMockElement('button'),
    floatingSettingsBtn: createMockElement('button'),
    sessionCards: createMockElement('div'),
    emptySession: createMockElement('div'),
    refreshPricingBtn: createMockElement('button'),
    exportSessionBtn: createMockElement('button'),
    importSessionBtn: createMockElement('button'),
    clearSessionBtn: createMockElement('button'),
    swapSetBtn: createMockElement('button'),
    stopSessionBtn: createMockElement('button'),
    consolidatedViewToggle: createMockElement('input', { type: 'checkbox', checked: false }),
    cardSizeSlider: createMockElement('input', { type: 'range', value: '120' }),
    cardSizeValue: createMockElement('span', { textContent: '120px' }),
    cardSizeSection: createMockElement('div'),
    appStatus: createMockElement('span', { textContent: 'Ready' }),
    connectionStatus: createMockElement('span', { textContent: 'Online' }),
    appVersion: createMockElement('span'),
    modalOverlay: createMockElement('div'),
    toastContainer: createMockElement('div'),
    settingsBtn: createMockElement('button'),
    helpBtn: createMockElement('button')
  };

  // Create tab elements with proper dataset and methods
  const tabBtns = [];
  const tabPanels = [];
  for (let i = 0; i < 2; i++) {
    const tabId = i === 0 ? 'price-checker' : 'pack-ripper';
    const btn = createMockElement('button', {
      dataset: { tab: tabId }
    });
    btn.dataset.tab = tabId; // Ensure dataset.tab is accessible
    tabBtns.push(btn);

    const panel = createMockElement('div', {
      id: `${tabId}-panel`,
      dataset: { tab: tabId }
    });
    panel.dataset.tab = tabId;
    tabPanels.push(panel);
  }

  mockElements.tabBtns = tabBtns;
  mockElements.tabPanels = tabPanels;

  return mockElements;
};

describe('UIManager', () => {
  let uiManager;
  let mockLogger;
  let mockElements;

  beforeEach(() => {
    // Create mock DOM elements
    mockElements = createMockDOM();
    
    // Mock getElementById and querySelectorAll
    vi.spyOn(document, 'getElementById').mockImplementation((id) => {
      const camelCase = id.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
      return mockElements[camelCase] || null;
    });

    vi.spyOn(document, 'querySelectorAll').mockImplementation((selector) => {
      if (selector === '.tab-btn') return mockElements.tabBtns;
      if (selector === '.tab-panel') return mockElements.tabPanels;
      if (selector === 'button[type="submit"], .btn-primary') return [mockElements.checkPriceBtn];
      if (selector === '.error') return [];
      if (selector === 'input, select, textarea') return [mockElements.cardNumber, mockElements.cardName];
      if (selector === 'button, input, select, textarea, a') return [mockElements.checkPriceBtn];
      if (selector === '[title]') return [];
      return [];
    });

    vi.spyOn(document, 'querySelector').mockImplementation((selector) => {
      if (selector === 'meta[name="viewport"]') return null;
      return null;
    });

    // Mock Logger with proper methods
    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };
    
    uiManager = new UIManager(mockLogger);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with correct default values', () => {
      expect(uiManager.currentTab).toBe('price-checker');
      expect(uiManager.isLoading).toBe(false);
      expect(uiManager.isConsolidatedView).toBe(false);
      expect(uiManager.cardSize).toBe(120);
      expect(uiManager.config.toastDuration).toBe(5000);
    });

    it('should initialize UI components successfully', async () => {
      const mockApp = { sessionManager: { loadCardSets: vi.fn() } };
      
      const result = await uiManager.initialize(mockApp);
      
      expect(result).toBe(true);
      expect(uiManager.app).toBe(mockApp);
    });

    it('should handle initialization errors', async () => {
      vi.spyOn(uiManager, 'getDOMElements').mockImplementation(() => {
        throw new Error('DOM error');
      });

      await expect(uiManager.initialize({})).rejects.toThrow('DOM error');
    });
  });

  describe('Form Management', () => {
    beforeEach(() => {
      uiManager.getDOMElements();
    });

    it('should collect price form data correctly', () => {
      const formData = uiManager.collectPriceFormData();
      
      expect(formData.cardNumber).toBe('LOB-001');
      expect(formData.cardName).toBe('Blue-Eyes White Dragon');
      expect(formData.rarity).toBe('Ultra Rare');
      expect(formData.condition).toBe('near-mint');
    });

    it('should validate form data successfully', () => {
      const validData = {
        cardNumber: 'LOB-001',
        rarity: 'Ultra Rare'
      };
      
      const result = uiManager.validatePriceForm(validData);
      
      expect(result).toBe(true);
    });

    it('should validate form data and catch errors', () => {
      const invalidData = {
        cardNumber: '',
        rarity: ''
      };
      
      const result = uiManager.validatePriceForm(invalidData);
      
      expect(result).toBe(false);
    });

    it('should clear price form', () => {
      const resetSpy = vi.spyOn(mockElements.priceForm, 'reset');
      
      uiManager.clearPriceForm();
      
      expect(resetSpy).toHaveBeenCalled();
    });
  });

  describe('Tab Navigation', () => {
    it('should switch tabs correctly', () => {
      uiManager.getDOMElements();
      
      uiManager.switchTab('pack-ripper');
      
      expect(uiManager.currentTab).toBe('pack-ripper');
    });

    it('should emit tab change events', () => {
      const callback = vi.fn();
      uiManager.onTabChange(callback);
      uiManager.getDOMElements();
      
      uiManager.switchTab('pack-ripper');
      
      expect(callback).toHaveBeenCalledWith('pack-ripper');
    });
  });

  describe('Price Results Display', () => {
    beforeEach(() => {
      uiManager.getDOMElements();
    });

    it('should display successful price results', () => {
      const mockResults = {
        success: true,
        data: {
          card_name: 'Blue-Eyes White Dragon',
          card_number: 'LOB-001',
          card_rarity: 'Ultra Rare',
          booster_set_name: 'Legend of Blue Eyes',
          tcg_price: '25.50',
          tcg_market_price: '30.00',
          image_url: 'https://example.com/image.jpg',
          scrape_success: true
        },
        metadata: {
          hasEnhancedInfo: true,
          queryTime: '100ms'
        }
      };

      uiManager.displayPriceResults(mockResults);

      expect(mockElements.priceResults.classList.remove).toHaveBeenCalledWith('hidden');
    });

    it('should generate pricing section correctly', () => {
      const cardData = {
        tcg_price: '25.50',
        tcg_market_price: '30.00'
      };
      const aggregated = {
        averagePrice: 27.75,
        lowestPrice: 25.00,
        highestPrice: 32.00,
        medianPrice: 28.00,
        confidence: 0.85
      };

      const result = uiManager.generatePricingSection(cardData, aggregated);

      expect(result).toContain('TCGPlayer Low: $25.50');
      expect(result).toContain('TCGPlayer Market: $30.00');
      expect(result).toContain('Average Price: $27.75');
      expect(result).toContain('85%');
    });
  });

  describe('Session Management', () => {
    beforeEach(() => {
      uiManager.getDOMElements();
    });

    it('should handle set selection', () => {
      mockElements.setSelect.value = 'LOB';
      
      uiManager.handleSetSelection();
      
      expect(mockElements.startSessionBtn.removeAttribute).toHaveBeenCalledWith('disabled');
    });

    it('should handle empty set selection', () => {
      mockElements.setSelect.value = '';
      
      uiManager.handleSetSelection();
      
      expect(mockElements.startSessionBtn.setAttribute).toHaveBeenCalledWith('disabled', '');
    });

    it('should handle session start', () => {
      const callback = vi.fn();
      uiManager.onSessionStart(callback);
      mockElements.setSelect.value = 'LOB';
      
      uiManager.handleSessionStart();
      
      expect(callback).toHaveBeenCalledWith('LOB');
    });
  });

  describe('Voice Recognition', () => {
    beforeEach(() => {
      uiManager.getDOMElements();
    });

    it('should update voice status to ready', () => {
      uiManager.updateVoiceStatus('ready');

      expect(mockElements.voiceStatusText.textContent).toBe('Voice recognition ready');
      expect(mockElements.voiceIndicator.className).toContain('ready');
    });

    it('should update voice buttons when listening', () => {
      uiManager.updateVoiceButtons(true);

      expect(mockElements.startVoiceBtn.classList.toggle).toHaveBeenCalledWith('hidden', true);
      expect(mockElements.stopVoiceBtn.classList.toggle).toHaveBeenCalledWith('hidden', false);
    });
  });

  describe('Toast Notifications', () => {
    beforeEach(() => {
      uiManager.getDOMElements();
    });

    it('should create toast element correctly', () => {
      const toast = uiManager.createToast('Test message', 'error');

      expect(toast.className).toContain('toast-error');
      expect(toast.innerHTML).toContain('Test message');
      expect(toast.innerHTML).toContain('❌');
    });

    it('should get correct toast icons', () => {
      expect(uiManager.getToastIcon('success')).toBe('✅');
      expect(uiManager.getToastIcon('error')).toBe('❌');
      expect(uiManager.getToastIcon('warning')).toBe('⚠️');
      expect(uiManager.getToastIcon('info')).toBe('ℹ️');
      expect(uiManager.getToastIcon('unknown')).toBe('ℹ️');
    });
  });

  describe('Utility Functions', () => {
    it('should debounce function calls', async () => {
      let callCount = 0;
      const debouncedFn = uiManager.debounce(() => {
        callCount++;
      }, 50);

      // Call multiple times quickly
      debouncedFn();
      debouncedFn();
      debouncedFn();

      // Should only execute once after delay
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(callCount).toBe(1);
    });

    it('should generate source data HTML for tcgplayer', () => {
      const data = {
        marketPrice: 25.50,
        lowPrice: 20.00,
        highPrice: 30.00,
        listings: 15
      };

      const result = uiManager.generateSourceDataHTML('tcgplayer', data);

      expect(result).toContain('Market: $25.50');
      expect(result).toContain('Low: $20.00');
      expect(result).toContain('Listings: 15');
    });
  });

  describe('Event Emitters', () => {
    it('should register and emit events correctly', () => {
      const callback = vi.fn();
      
      uiManager.onPriceCheck(callback);
      uiManager.emitPriceCheck({ test: 'data' });
      expect(callback).toHaveBeenCalledWith({ test: 'data' });

      uiManager.onVoiceStart(callback);
      uiManager.emitVoiceStart();
      expect(callback).toHaveBeenCalled();
    });

    it('should handle callback errors gracefully', () => {
      const errorCallback = vi.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });
      
      uiManager.onPriceCheck(errorCallback);
      
      expect(() => {
        uiManager.emitPriceCheck({ test: 'data' });
      }).not.toThrow();
    });
  });
});