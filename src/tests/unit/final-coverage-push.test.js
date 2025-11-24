import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UIManager } from '../../js/ui/UIManager.js';
import { Storage } from '../../js/utils/Storage.js';
import { SessionManager } from '../../js/session/SessionManager.js';
import YGORipperApp from '../../js/app.js';

const mountBasicUI = () => {
    document.body.innerHTML = `
        <div id="app" class="hidden">
            <div id="loading-screen"></div>
            <div id="session-info"></div>
            <div id="voice-status"></div>
            <div id="error-container"></div>
            <div id="session-cards"></div>
            <div id="price-results" class="hidden">
                <div id="price-content"></div>
            </div>
            <div id="modal-container"></div>
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
                <input id="card-number" name="cardNumber" />
                <input id="card-name" name="cardName" />
                <button id="check-price-btn" type="submit">Check</button>
                <button id="clear-form-btn" type="button">Clear</button>
            </form>
            <div class="session-controls">
                <input id="set-search" />
                <select id="set-select">
                    <option value="">Select</option>
                </select>
                <button id="refresh-sets-btn">Refresh</button>
                <button id="load-all-sets-btn">Load All</button>
                <button id="start-session-btn">Start</button>
                <button id="swap-set-btn" class="hidden">Swap</button>
                <button id="stop-session-btn" class="hidden">Stop</button>
                <button id="refresh-pricing-btn" disabled>Refresh Pricing</button>
                <button id="export-session-btn" disabled>Export</button>
                <button id="import-session-btn">Import</button>
                <button id="clear-session-btn" disabled>Clear</button>
            </div>
            <div id="current-set"></div>
            <div id="cards-count"></div>
            <div id="tcg-low-total"></div>
            <div id="tcg-market-total"></div>
            <div id="session-status" class="status-badge"></div>
            <div id="sets-count"></div>
            <div id="total-sets-count"></div>
            <button id="settings-btn">Settings</button>
            <button id="help-btn">Help</button>
            <div id="app-status">Ready</div>
        </div>
    `;
};

const bootstrapSession = (manager) => {
    const session = manager.createEmptySession('Test Pack');
    session.setId = 'test-pack';
    manager.currentSession = session;
    manager.cards = session.cards;
    manager.sessionActive = true;
};

describe('Final Coverage Push Tests', () => {
    
    describe('UIManager - Uncovered Paths', () => {
        let uiManager;
        let mockLogger;

        beforeEach(() => {
            mountBasicUI();

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
            vi.clearAllMocks();
        });

        it('should setup event listeners', () => {
            uiManager.getDOMElements();
            expect(() => uiManager.setupEventListeners()).not.toThrow();
            expect(mockLogger.info).toHaveBeenCalledWith('Setting up event listeners');
        });

        it('should handle price check submission', () => {
            uiManager.getDOMElements();
            expect(() => uiManager.handlePriceCheckSubmit()).not.toThrow();
        });

        it('should update session info display', () => {
            const sessionInfo = {
                cardCount: 2,
                totalValue: 30,
                packName: 'Test Pack',
                statistics: {
                    tcgLowTotal: 15,
                    tcgMarketTotal: 30
                },
                isActive: true
            };

            uiManager.updateSessionInfo(sessionInfo);

            const container = document.getElementById('session-info');
            expect(container.innerHTML).toContain('2');
        });

        it('should initialize components properly', () => {
            expect(() => uiManager.initializeComponents()).not.toThrow();
            expect(mockLogger.info).toHaveBeenCalledWith('UI components initialized');
        });

        it('should handle view toggle for consolidated view', () => {
            uiManager.handleViewToggle(true);
            expect(uiManager.isConsolidatedView).toBe(true);
            expect(mockLogger.info).toHaveBeenCalledWith('View toggled to consolidated:', true);
        });

        it('should handle card size changes', () => {
            const newSize = 150;
            uiManager.handleCardSizeChange(newSize);
            expect(uiManager.cardSize).toBe(newSize);
            expect(mockLogger.info).toHaveBeenCalledWith('Card size changed to:', newSize);
        });

        it('should display price results correctly', () => {
            vi.useFakeTimers();
            const results = {
                success: true,
                cardName: 'Blue-Eyes White Dragon',
                prices: { tcgplayer: { market: 50 } }
            };

            uiManager.displayPriceResults(results);
            vi.runAllTimers();
            vi.useRealTimers();

            const priceResults = document.getElementById('price-results');
            expect(priceResults.innerHTML).toContain('Blue-Eyes White Dragon');
        });
    });

    describe('Storage - Complete Coverage', () => {
        let storage;
        let mockLogger;

        beforeEach(() => {
            mockLogger = {
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn(),
                debug: vi.fn()
            };

            storage = new Storage();
            storage.logger = mockLogger;

            // Clear storage
            localStorage.clear();
            
            // Reset IndexedDB mock
            delete global.indexedDB;
        });

        it('should handle initialization without IndexedDB support', async () => {
            global.indexedDB = undefined;
            
            const result = await storage.initialize();
            
            expect(result).toBe(true);
            expect(storage.backend).toBe('localStorage');
            expect(mockLogger.info).toHaveBeenCalledWith('IndexedDB not supported, using localStorage');
        });

        it('should handle localStorage operations with prefix', async () => {
            storage.backend = 'localStorage';
            storage.initialized = true;

            // Set
            await storage.set('testKey', { data: 'value' });
            expect(localStorage.getItem('ygo_testKey')).toBeTruthy();

            // Get
            const value = await storage.get('testKey');
            expect(value).toEqual({ data: 'value' });

            // Remove
            await storage.remove('testKey');
            expect(localStorage.getItem('ygo_testKey')).toBe(null);

            // Clear (only removes ygo_ prefixed items)
            localStorage.setItem('other_key', 'value');
            await storage.clear();
            expect(localStorage.getItem('other_key')).toBe('value');
            expect(localStorage.length).toBe(1);
        });

        it('should handle storage errors gracefully', async () => {
            storage.backend = 'localStorage';
            storage.initialized = true;

            // Mock JSON.stringify to throw
            const originalStringify = JSON.stringify;
            JSON.stringify = vi.fn().mockImplementation(() => {
                throw new Error('Circular structure');
            });

            let result;
            try {
                result = await storage.set('key', { circular: true }, { throwOnError: false });
            } finally {
                JSON.stringify = originalStringify;
            }
            
            expect(result).toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith('Failed to set key:', expect.any(Error));
        });

        it('should migrate data between storage backends', async () => {
            // Set data in localStorage
            localStorage.setItem('ygo_migrate1', JSON.stringify({ data: 'value1' }));
            localStorage.setItem('ygo_migrate2', JSON.stringify({ data: 'value2' }));

            // Mock IndexedDB for migration
            const mockDB = {
                transaction: vi.fn().mockReturnValue({
                    objectStore: vi.fn().mockReturnValue({
                        put: vi.fn().mockReturnValue({ onsuccess: null, onerror: null })
                    })
                })
            };

            await storage.migrateData('localStorage', 'indexedDB', mockDB);

            expect(mockDB.transaction).toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith('Migrated 2 items from localStorage to indexedDB');
        });

        it('should get all keys from storage', async () => {
            storage.backend = 'localStorage';
            storage.initialized = true;

            localStorage.setItem('ygo_key1', 'value1');
            localStorage.setItem('ygo_key2', 'value2');
            localStorage.setItem('other_key', 'value3');

            const keys = await storage.getAllKeys();
            
            expect(keys).toEqual(['key1', 'key2']);
            expect(keys).not.toContain('other_key');
        });
    });

    describe('SessionManager - Edge Cases', () => {
        let sessionManager;
        let mockLogger;

        beforeEach(() => {
            mockLogger = {
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn(),
                debug: vi.fn()
            };

            sessionManager = new SessionManager();
            sessionManager.logger = mockLogger;
        });

        it('should validate cards before adding', async () => {
            bootstrapSession(sessionManager);

            // Invalid card (missing required fields)
            const invalid = { name: 'Test' };
            const result1 = await sessionManager.addCard(invalid);
            expect(result1).toBe(false);
            expect(mockLogger.warn).toHaveBeenCalledWith('Invalid card data:', invalid);

            // Valid card
            const valid = { 
                name: 'Blue-Eyes', 
                set: 'LOB-001', 
                quantity: 1,
                price: 10 
            };
            const result2 = await sessionManager.addCard(valid);
            expect(result2.name || result2.card_name).toBe('Blue-Eyes');
            expect(sessionManager.currentSession.cards).toHaveLength(1);
        });

        it('should calculate session statistics', () => {
            sessionManager.cards = [
                { price: 10, rarity: 'Ultra Rare' },
                { price: 20, rarity: 'Secret Rare' },
                { price: 5, rarity: 'Common' },
                { price: 15, rarity: 'Ultra Rare' }
            ];

            const stats = sessionManager.getSessionStats();

            expect(stats.totalCards).toBe(4);
            expect(stats.totalValue).toBe(50);
            expect(stats.averageValue).toBe(12.5);
            expect(stats.rarityCounts['Ultra Rare']).toBe(2);
            expect(stats.rarityCounts['Secret Rare']).toBe(1);
            expect(stats.rarityCounts['Common']).toBe(1);
        });

        it('should export session data in different formats', () => {
            sessionManager.sessionId = 'test-123';
            sessionManager.packName = 'Test Pack';
            sessionManager.cards = [
                { name: 'Card 1', price: 10 },
                { name: 'Card 2', price: 20 }
            ];
            sessionManager.currentSession = sessionManager.createEmptySession('Test Pack');
            sessionManager.currentSession.id = 'test-123';
            sessionManager.currentSession.cards = sessionManager.cards.map(card => ({ ...card }));
            sessionManager.cards = sessionManager.currentSession.cards;
            sessionManager.sessionActive = true;

            // JSON format
            const json = sessionManager.exportSession('json');
            expect(JSON.parse(json)).toHaveProperty('sessionId', 'test-123');

            // CSV format  
            const csv = sessionManager.exportSession('csv');
            expect(csv.content.split('\n')[0]).toContain('Card Name');
            expect(csv.content).toContain('Card 1');
            expect(csv.content).toContain('Card 2');
        });
    });

    describe('App - Final Coverage', () => {
        let app;

        beforeEach(() => {
            app = new YGORipperApp({ skipInitialization: true });
        });

        it('should handle getInfo method', () => {
            app.isInitialized = true;
            app.currentTab = 'pack-ripper';

            const info = app.getInfo();

            expect(info.version).toBe('2.1.0');
            expect(info.name).toBe('YGO Ripper UI v2');
            expect(info.initialized).toBe(true);
            expect(info.currentTab).toBe('pack-ripper');
            expect(info.components).toHaveProperty('voiceEngine');
            expect(info.components).toHaveProperty('sessionManager');
        });

        it('should get default settings', () => {
            const defaults = app.getDefaultSettings();

            expect(defaults).toHaveProperty('theme', 'dark');
            expect(defaults).toHaveProperty('voiceTimeout', 5000);
            expect(defaults).toHaveProperty('autoConfirm', false);
            expect(defaults).toHaveProperty('autoConfirmThreshold', 0.8);
            expect(defaults).toHaveProperty('voiceLanguage', 'en-US');
        });
    });
});
