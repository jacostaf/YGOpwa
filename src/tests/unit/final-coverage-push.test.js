import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UIManager } from '../../js/ui/UIManager.js';
import { Storage } from '../../js/utils/Storage.js';
import { SessionManager } from '../../js/session/SessionManager.js';
import YGORipperApp from '../../js/app.js';

describe('Final Coverage Push Tests', () => {
    
    describe('UIManager - Uncovered Paths', () => {
        let uiManager;
        let mockLogger;

        beforeEach(() => {
            document.body.innerHTML = `
                <div id="loading-screen" class="loading-screen"></div>
                <div id="app" class="hidden"></div>
                <div id="session-info"></div>
                <div id="voice-status"></div>
                <div id="error-container"></div>
                <div id="session-cards"></div>
                <div id="price-results"></div>
                <div id="modal-container"></div>
                <div id="toast-container"></div>
                <button class="start-session">Start</button>
                <button class="stop-session">Stop</button>
                <button id="voice-toggle">Voice</button>
                <form id="price-form">
                    <input name="cardName" />
                    <button type="submit">Check</button>
                </form>
                <div class="card-item" data-card-id="123">
                    <button class="remove-card">Remove</button>
                </div>
                <div class="settings-icon">⚙️</div>
            `;

            mockLogger = {
                info: vi.fn(),
                warn: vi.fn(),
                error: vi.fn(),
                debug: vi.fn()
            };

            uiManager = new UIManager();
            uiManager.logger = mockLogger;
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
                packName: 'Test Pack'
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
            const results = {
                success: true,
                cardName: 'Blue-Eyes White Dragon',
                prices: { tcgplayer: { market: 50 } }
            };

            uiManager.displayPriceResults(results);

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

            const result = await storage.set('key', { circular: true });
            
            expect(result).toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith('Failed to set key:', expect.any(Error));

            JSON.stringify = originalStringify;
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
            sessionManager.isActive = true;

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
            expect(result2).toBe(true);
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

            // JSON format
            const json = sessionManager.exportSession('json');
            expect(JSON.parse(json)).toHaveProperty('sessionId', 'test-123');

            // CSV format  
            const csv = sessionManager.exportSession('csv');
            expect(csv).toContain('name,price');
            expect(csv).toContain('Card 1,10');
            expect(csv).toContain('Card 2,20');
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
            expect(defaults).toHaveProperty('soundEnabled', true);
        });
    });
});