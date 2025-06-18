/**
 * YGO Ripper UI v2 - Main Application Controller
 * 
 * This is the main entry point for the application, providing:
 * - Cross-platform compatibility (Mac, Windows, iOS)
 * - Robust voice recognition with proper permission handling
 * - Full feature parity with ygo_ripper.py
 * - AI agent testability
 * 
 * @version 2.1.0
 * @author YGORipperUI Team
 */

// Import core modules
import { VoiceEngine } from './voice/VoiceEngine.js';
import { PermissionManager } from './voice/PermissionManager.js';
import { SessionManager } from './session/SessionManager.js';
import { PriceChecker } from './price/PriceChecker.js';
import { UIManager } from './ui/UIManager.js';
import { Logger } from './utils/Logger.js';
import { Storage } from './utils/Storage.js';

/**
 * Main Application Class
 * Coordinates all components and manages application state
 */
class YGORipperApp {
    constructor() {
        // Application metadata
        this.version = '2.1.0';
        this.name = 'YGO Ripper UI v2';
        
        // Component instances
        this.logger = new Logger('YGORipperApp');
        this.storage = new Storage();
        this.permissionManager = new PermissionManager();
        this.voiceEngine = null; // Initialized after permissions
        this.sessionManager = new SessionManager();
        this.priceChecker = new PriceChecker();
        this.uiManager = new UIManager();
        
        // Application state
        this.isInitialized = false;
        this.currentTab = 'price-checker';
        this.settings = {};
        
        // Initialization promise
        this.initPromise = null;
        
        // Start initialization
        this.initialize();
    }

    /**
     * Initialize the application
     */
    async initialize() {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = this._performInitialization();
        return this.initPromise;
    }

    /**
     * Perform the actual initialization steps
     * @private
     */
    async _performInitialization() {
        try {
            this.logger.info('Initializing YGO Ripper UI v2...');
            
            // Update loading progress
            this.updateLoadingProgress(10, 'Loading settings...');
            
            // Load settings and configuration
            await this.loadSettings();
            
            this.updateLoadingProgress(20, 'Initializing storage...');
            
            // Initialize storage
            await this.storage.initialize();
            
            this.updateLoadingProgress(30, 'Setting up UI...');
            
            // Initialize UI Manager
            await this.uiManager.initialize(this);
            
            this.updateLoadingProgress(40, 'Checking permissions...');
            
            // Initialize permission manager
            await this.permissionManager.initialize();
            
            this.updateLoadingProgress(50, 'Initializing voice engine...');
            
            // Initialize voice engine with permission manager
            this.voiceEngine = new VoiceEngine(this.permissionManager, this.logger);
            await this.voiceEngine.initialize();
            
            this.updateLoadingProgress(70, 'Loading session data...');
            
            // Initialize session manager
            await this.sessionManager.initialize(this.storage);
            
            this.updateLoadingProgress(80, 'Setting up price checker...');
            
            // Initialize price checker
            await this.priceChecker.initialize();
            
            this.updateLoadingProgress(90, 'Setting up event handlers...');
            
            // Set up event handlers
            this.setupEventHandlers();
            
            this.updateLoadingProgress(95, 'Loading initial data...');
            
            // Load initial data
            await this.loadInitialData();
            
            this.updateLoadingProgress(100, 'Ready!');
            
            // Mark as initialized
            this.isInitialized = true;
            
            // Hide loading screen and show app
            this.showApp();
            
            this.logger.info('Application initialized successfully');
            this.uiManager.showToast('YGO Ripper UI v2 is ready!', 'success');
            
        } catch (error) {
            this.logger.error('Failed to initialize application:', error);
            this.showInitializationError(error);
            throw error;
        }
    }

    /**
     * Load application settings
     */
    async loadSettings() {
        try {
            const savedSettings = await this.storage.get('settings');
            this.settings = {
                // Default settings
                theme: 'dark',
                voiceTimeout: 5000,
                voiceLanguage: 'en-US',
                autoPriceRefresh: false,
                sessionAutoSave: true,
                debugMode: false,
                // Override with saved settings
                ...savedSettings
            };
            
            this.logger.debug('Settings loaded:', this.settings);
        } catch (error) {
            this.logger.warn('Failed to load settings, using defaults:', error);
            this.settings = {
                theme: 'dark',
                voiceTimeout: 5000,
                voiceLanguage: 'en-US',
                autoPriceRefresh: false,
                sessionAutoSave: true,
                debugMode: false
            };
        }
    }

    /**
     * Save application settings
     */
    async saveSettings() {
        try {
            await this.storage.set('settings', this.settings);
            this.logger.debug('Settings saved successfully');
        } catch (error) {
            this.logger.error('Failed to save settings:', error);
        }
    }

    /**
     * Load initial data
     */
    async loadInitialData() {
        try {
            // Load card sets for pack ripper
            await this.sessionManager.loadCardSets();
            
            // Restore last session if auto-save is enabled
            if (this.settings.sessionAutoSave) {
                await this.sessionManager.loadLastSession();
            }
            
            // Update UI with loaded data (will be handled by the event listeners)
            // The setsLoaded event will trigger handleSetsLoaded which updates the UI
            this.uiManager.updateSessionInfo(this.sessionManager.getCurrentSessionInfo());
            
        } catch (error) {
            this.logger.warn('Failed to load some initial data:', error);
            // Don't throw - application can still function
        }
    }

    /**
     * Set up event handlers
     */
    setupEventHandlers() {
        // Tab navigation
        this.uiManager.onTabChange((tabId) => {
            this.currentTab = tabId;
            this.logger.debug(`Switched to tab: ${tabId}`);
            
            // Handle tab-specific initialization
            if (tabId === 'pack-ripper') {
                this.handlePackRipperTabActivated();
            }
        });

        // Price checker events
        this.uiManager.onPriceCheck(async (formData) => {
            await this.handlePriceCheck(formData);
        });

        // Session management events
        this.uiManager.onSessionStart(async (setId) => {
            await this.handleSessionStart(setId);
        });

        this.uiManager.onSessionStop(() => {
            this.handleSessionStop();
        });

        this.uiManager.onSessionClear(() => {
            this.handleSessionClear();
        });

        this.uiManager.onSessionExport(() => {
            this.handleSessionExport();
        });

        this.uiManager.onSessionImport(() => {
            this.handleSessionImport();
        });

        // Voice recognition events
        this.uiManager.onVoiceStart(() => {
            this.handleVoiceStart();
        });

        this.uiManager.onVoiceStop(() => {
            this.handleVoiceStop();
        });

        this.uiManager.onVoiceTest(() => {
            this.handleVoiceTest();
        });

        // SessionManager events
        this.sessionManager.addEventListener('setsLoaded', (data) => {
            this.handleSetsLoaded(data);
        });

        this.sessionManager.addEventListener('setsFiltered', (data) => {
            this.handleSetsFiltered(data);
        });

        // Voice engine events
        if (this.voiceEngine) {
            this.voiceEngine.onResult((result) => {
                this.handleVoiceResult(result);
            });

            this.voiceEngine.onStatusChange((status) => {
                this.uiManager.updateVoiceStatus(status);
            });

            this.voiceEngine.onError((error) => {
                this.handleVoiceError(error);
            });
        }

        // Window events
        window.addEventListener('beforeunload', () => {
            this.handleAppClose();
        });

        // Online/offline events
        window.addEventListener('online', () => {
            this.uiManager.updateConnectionStatus(true);
        });

        window.addEventListener('offline', () => {
            this.uiManager.updateConnectionStatus(false);
        });
    }

    /**
     * Handle price check request
     */
    async handlePriceCheck(formData) {
        try {
            this.logger.info('Starting price check:', formData);
            this.uiManager.setLoading(true);
            
            const results = await this.priceChecker.checkPrice(formData);
            
            this.uiManager.displayPriceResults(results);
            this.logger.info('Price check completed successfully');
            
        } catch (error) {
            this.logger.error('Price check failed:', error);
            this.uiManager.showToast('Failed to check price: ' + error.message, 'error');
        } finally {
            this.uiManager.setLoading(false);
        }
    }

    /**
     * Handle session start
     */
    async handleSessionStart(setId) {
        try {
            this.logger.info('Starting session for set:', setId);
            
            await this.sessionManager.startSession(setId);
            this.uiManager.updateSessionInfo(this.sessionManager.getCurrentSessionInfo());
            this.uiManager.showToast('Session started successfully', 'success');
            
            // Auto-start voice recognition if available
            if (this.voiceEngine && this.voiceEngine.isAvailable()) {
                setTimeout(() => {
                    this.handleVoiceStart();
                }, 1000);
            }
            
        } catch (error) {
            this.logger.error('Failed to start session:', error);
            this.uiManager.showToast('Failed to start session: ' + error.message, 'error');
        }
    }

    /**
     * Handle session stop
     */
    handleSessionStop() {
        try {
            this.logger.info('Stopping session');
            
            // Stop voice recognition first
            if (this.voiceEngine && this.voiceEngine.isListening()) {
                this.voiceEngine.stopListening();
            }
            
            this.sessionManager.stopSession();
            this.uiManager.updateSessionInfo(this.sessionManager.getCurrentSessionInfo());
            this.uiManager.showToast('Session stopped', 'info');
            
        } catch (error) {
            this.logger.error('Failed to stop session:', error);
            this.uiManager.showToast('Error stopping session: ' + error.message, 'error');
        }
    }

    /**
     * Handle session clear
     */
    handleSessionClear() {
        if (confirm('Are you sure you want to clear the current session? This cannot be undone.')) {
            try {
                this.sessionManager.clearSession();
                this.uiManager.updateSessionInfo(this.sessionManager.getCurrentSessionInfo());
                this.uiManager.clearSessionDisplay();
                this.uiManager.showToast('Session cleared', 'info');
                
            } catch (error) {
                this.logger.error('Failed to clear session:', error);
                this.uiManager.showToast('Error clearing session: ' + error.message, 'error');
            }
        }
    }

    /**
     * Handle session export
     */
    async handleSessionExport() {
        try {
            const sessionData = this.sessionManager.exportSession();
            
            // Create download link
            const blob = new Blob([JSON.stringify(sessionData, null, 2)], { 
                type: 'application/json' 
            });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `ygo-session-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.uiManager.showToast('Session exported successfully', 'success');
            
        } catch (error) {
            this.logger.error('Failed to export session:', error);
            this.uiManager.showToast('Error exporting session: ' + error.message, 'error');
        }
    }

    /**
     * Handle session import
     */
    async handleSessionImport() {
        try {
            // Create file input
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            
            input.onchange = async (event) => {
                const file = event.target.files[0];
                if (!file) return;
                
                try {
                    const text = await file.text();
                    const sessionData = JSON.parse(text);
                    
                    await this.sessionManager.importSession(sessionData);
                    this.uiManager.updateSessionInfo(this.sessionManager.getCurrentSessionInfo());
                    this.uiManager.showToast('Session imported successfully', 'success');
                    
                } catch (error) {
                    this.logger.error('Failed to import session:', error);
                    this.uiManager.showToast('Error importing session: ' + error.message, 'error');
                }
            };
            
            input.click();
            
        } catch (error) {
            this.logger.error('Failed to initiate session import:', error);
            this.uiManager.showToast('Error importing session: ' + error.message, 'error');
        }
    }

    /**
     * Handle voice recognition start
     */
    async handleVoiceStart() {
        try {
            if (!this.voiceEngine) {
                throw new Error('Voice engine not initialized');
            }
            
            if (!this.voiceEngine.isAvailable()) {
                throw new Error('Voice recognition not available');
            }
            
            await this.voiceEngine.startListening();
            this.logger.info('Voice recognition started');
            
        } catch (error) {
            this.logger.error('Failed to start voice recognition:', error);
            this.uiManager.showToast('Failed to start voice recognition: ' + error.message, 'error');
        }
    }

    /**
     * Handle voice recognition stop
     */
    handleVoiceStop() {
        try {
            if (this.voiceEngine && this.voiceEngine.isListening()) {
                this.voiceEngine.stopListening();
                this.logger.info('Voice recognition stopped');
            }
        } catch (error) {
            this.logger.error('Failed to stop voice recognition:', error);
            this.uiManager.showToast('Error stopping voice recognition: ' + error.message, 'error');
        }
    }

    /**
     * Handle voice recognition test
     */
    async handleVoiceTest() {
        try {
            this.logger.info('Starting voice recognition test');
            
            if (!this.voiceEngine || !this.voiceEngine.isAvailable()) {
                throw new Error('Voice recognition not available');
            }
            
            const result = await this.voiceEngine.testRecognition();
            this.uiManager.showToast(`Voice test result: "${result}"`, 'info');
            
        } catch (error) {
            this.logger.error('Voice test failed:', error);
            this.uiManager.showToast('Voice test failed: ' + error.message, 'error');
        }
    }

    /**
     * Handle voice recognition result
     */
    async handleVoiceResult(result) {
        try {
            this.logger.info('Voice recognition result:', result);
            
            if (!this.sessionManager.isSessionActive()) {
                this.logger.warn('Voice result received but no active session');
                return;
            }
            
            // Process the voice result to identify cards
            const cards = await this.sessionManager.processVoiceInput(result.transcript);
            
            if (cards.length > 0) {
                // Add cards to session
                for (const card of cards) {
                    await this.sessionManager.addCard(card);
                }
                
                // Update UI
                this.uiManager.updateSessionInfo(this.sessionManager.getCurrentSessionInfo());
                this.uiManager.showToast(`Added ${cards.length} card(s) to session`, 'success');
                
                // Auto-save if enabled
                if (this.settings.sessionAutoSave) {
                    await this.sessionManager.saveSession();
                }
            } else {
                this.uiManager.showToast(`No cards recognized for: "${result.transcript}"`, 'warning');
            }
            
        } catch (error) {
            this.logger.error('Failed to process voice result:', error);
            this.uiManager.showToast('Error processing voice input: ' + error.message, 'error');
        }
    }

    /**
     * Handle voice recognition error
     */
    handleVoiceError(error) {
        this.logger.error('Voice recognition error:', error);
        
        let message = 'Voice recognition error';
        let isRetryable = true;
        
        switch (error.type) {
            case 'permission-denied':
                message = 'Microphone access denied. Please enable microphone permissions in your browser settings.';
                isRetryable = false;
                break;
            case 'not-supported':
                message = 'Voice recognition is not supported in this browser or environment.';
                isRetryable = false;
                break;
            case 'network-error':
                message = 'Network error. Please check your internet connection.';
                isRetryable = true;
                break;
            case 'no-speech':
                message = 'No speech detected. Please try speaking louder and clearer.';
                isRetryable = true;
                break;
            default:
                message = `Voice recognition error: ${error.message}`;
                isRetryable = true;
        }
        
        this.uiManager.showToast(message, 'error');
        
        // Show retry button for retryable errors
        if (isRetryable) {
            // Implementation would show retry option in UI
        }
    }

    /**
     * Handle pack ripper tab activation
     */
    handlePackRipperTabActivated() {
        // Ensure voice engine is ready when pack ripper tab is active
        if (this.voiceEngine && !this.voiceEngine.isInitialized()) {
            this.voiceEngine.initialize().catch((error) => {
                this.logger.warn('Failed to initialize voice engine on tab activation:', error);
            });
        }
    }

    /**
     * Handle sets loaded event from SessionManager
     */
    handleSetsLoaded(data) {
        const { sets, searchTerm, error, totalSets, filtered } = data;
        
        if (error) {
            this.logger.error('Error loading sets:', error);
            this.uiManager.showToast(error, 'error');
        } else {
            this.logger.info(`Loaded ${sets.length} card sets${searchTerm ? ` matching "${searchTerm}"` : ''} (total: ${totalSets || sets.length})`);
            
            // Update UI with the loaded sets and comprehensive data
            this.uiManager.updateCardSets(sets, searchTerm, totalSets || sets.length);
            
            // Show appropriate success messages
            if (searchTerm) {
                this.uiManager.showToast(`Found ${sets.length} sets matching "${searchTerm}"`, 'success');
            } else if (sets.length >= 500) {
                this.uiManager.showToast(`Successfully loaded ${sets.length} card sets from backend`, 'success');
            } else if (sets.length > 0) {
                // Show warning for low set count
                this.uiManager.showToast(`Loaded ${sets.length} sets (expected 990+). Backend may not be fully loaded.`, 'warning');
            }
        }
    }

    /**
     * Handle sets filtered event from SessionManager
     */
    handleSetsFiltered(data) {
        const { sets, searchTerm, totalSets, filteredCount } = data;
        
        this.logger.info(`Filtered to ${sets.length} sets${searchTerm ? ` matching "${searchTerm}"` : ''} (from ${totalSets || 'unknown'} total)`);
        
        // Update UI with filtered sets
        this.uiManager.updateCardSets(sets, searchTerm, totalSets);
        
        // Provide user feedback for search results
        if (searchTerm) {
            if (sets.length === 0) {
                this.uiManager.showToast(`No sets found matching "${searchTerm}"`, 'warning');
            } else if (sets.length < 10 && totalSets > 100) {
                // Show info for refined searches
                this.logger.debug(`Search "${searchTerm}" returned ${sets.length} results from ${totalSets} total sets`);
            }
        }
    }

    /**
     * Handle application close
     */
    async handleAppClose() {
        try {
            this.logger.info('Application closing...');
            
            // Auto-save session if enabled
            if (this.settings.sessionAutoSave && this.sessionManager.isSessionActive()) {
                await this.sessionManager.saveSession();
            }
            
            // Save settings
            await this.saveSettings();
            
            // Stop voice recognition
            if (this.voiceEngine && this.voiceEngine.isListening()) {
                this.voiceEngine.stopListening();
            }
            
        } catch (error) {
            this.logger.error('Error during application close:', error);
        }
    }

    /**
     * Update loading progress
     */
    updateLoadingProgress(percent, message) {
        const progressBar = document.getElementById('loading-progress');
        const loadingText = document.querySelector('.loading-text');
        
        if (progressBar) {
            progressBar.style.width = `${percent}%`;
        }
        
        if (loadingText) {
            loadingText.textContent = message;
        }
    }

    /**
     * Show the main application
     */
    showApp() {
        const loadingScreen = document.getElementById('loading-screen');
        const app = document.getElementById('app');
        
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
        
        if (app) {
            app.classList.remove('hidden');
        }
    }

    /**
     * Show initialization error
     */
    showInitializationError(error) {
        const loadingText = document.querySelector('.loading-text');
        
        if (loadingText) {
            loadingText.textContent = `Failed to initialize: ${error.message}`;
            loadingText.style.color = '#ff4444';
        }
    }

    /**
     * Get application instance (for testing and debugging)
     */
    static getInstance() {
        return window.ygoApp;
    }

    /**
     * Get application information
     */
    getInfo() {
        return {
            name: this.name,
            version: this.version,
            isInitialized: this.isInitialized,
            currentTab: this.currentTab,
            components: {
                voiceEngine: !!this.voiceEngine,
                sessionManager: !!this.sessionManager,
                priceChecker: !!this.priceChecker,
                uiManager: !!this.uiManager
            }
        };
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.ygoApp = new YGORipperApp();
});

// Export for module systems and testing
export default YGORipperApp;