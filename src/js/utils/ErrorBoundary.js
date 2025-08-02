/**
 * Error Boundaries and Recovery System
 * 
 * Provides comprehensive error handling, graceful degradation, and user-friendly
 * error messages for the YGO Ripper UI application.
 */

import { Logger } from '../utils/Logger.js';

/**
 * Application Error Boundary
 * Handles global application errors and provides recovery mechanisms
 */
export class AppErrorBoundary {
    constructor() {
        this.logger = new Logger('ErrorBoundary');
        this.errorHandlers = new Map();
        this.retryQueue = new Map();
        this.offlineMode = false;
        
        // Error types and their configurations
        this.errorTypes = {
            VOICE_RECOGNITION_ERROR: {
                retryable: true,
                maxRetries: 3,
                backoffMs: 1000,
                fallbackAvailable: true
            },
            API_ERROR: {
                retryable: true,
                maxRetries: 2,
                backoffMs: 2000,
                fallbackAvailable: true
            },
            STORAGE_ERROR: {
                retryable: true,
                maxRetries: 1,
                backoffMs: 500,
                fallbackAvailable: true
            },
            NETWORK_ERROR: {
                retryable: true,
                maxRetries: 3,
                backoffMs: 1000,
                fallbackAvailable: true
            },
            PERMISSION_ERROR: {
                retryable: false,
                maxRetries: 0,
                backoffMs: 0,
                fallbackAvailable: false
            },
            VALIDATION_ERROR: {
                retryable: false,
                maxRetries: 0,
                backoffMs: 0,
                fallbackAvailable: false
            }
        };
        
        this.setupGlobalErrorHandlers();
    }

    /**
     * Set up global error handlers for unhandled errors
     */
    setupGlobalErrorHandlers() {
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.logger.error('Unhandled promise rejection:', event.reason);
            this.handleError(event.reason, 'PROMISE_REJECTION');
            event.preventDefault();
        });

        // Handle global JavaScript errors
        window.addEventListener('error', (event) => {
            this.logger.error('Global JavaScript error:', event.error);
            this.handleError(event.error, 'JAVASCRIPT_ERROR');
        });

        // Handle network status changes
        window.addEventListener('online', () => {
            this.handleNetworkReconnect();
        });

        window.addEventListener('offline', () => {
            this.handleNetworkDisconnect();
        });
    }

    /**
     * Register an error handler for a specific error type
     */
    registerErrorHandler(errorType, handler) {
        if (!this.errorHandlers.has(errorType)) {
            this.errorHandlers.set(errorType, []);
        }
        this.errorHandlers.get(errorType).push(handler);
    }

    /**
     * Main error handling method
     */
    async handleError(error, errorType, context = {}) {
        const errorId = this.generateErrorId();
        
        this.logger.error(`Error [${errorId}] - Type: ${errorType}`, error, context);
        
        const errorConfig = this.errorTypes[errorType] || this.errorTypes.VALIDATION_ERROR;
        
        // Check if error is retryable and hasn't exceeded max retries
        if (errorConfig.retryable && this.shouldRetry(errorId, errorConfig)) {
            return this.scheduleRetry(errorId, error, errorType, context, errorConfig);
        }
        
        // Try fallback mechanisms
        if (errorConfig.fallbackAvailable) {
            const fallbackResult = await this.tryFallback(error, errorType, context);
            if (fallbackResult.success) {
                return fallbackResult;
            }
        }
        
        // Execute registered error handlers
        await this.executeErrorHandlers(errorType, error, context);
        
        // Show user-friendly error message
        this.showUserFriendlyError(error, errorType, context);
        
        return {
            success: false,
            error: error,
            errorType: errorType,
            errorId: errorId,
            userMessage: this.getUserFriendlyMessage(error, errorType)
        };
    }

    /**
     * Generate unique error ID for tracking
     */
    generateErrorId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Check if error should be retried
     */
    shouldRetry(errorId, errorConfig) {
        const retryInfo = this.retryQueue.get(errorId) || { count: 0, lastAttempt: 0 };
        return retryInfo.count < errorConfig.maxRetries;
    }

    /**
     * Schedule retry for retryable errors
     */
    async scheduleRetry(errorId, error, errorType, context, errorConfig) {
        const retryInfo = this.retryQueue.get(errorId) || { count: 0, lastAttempt: 0 };
        retryInfo.count++;
        retryInfo.lastAttempt = Date.now();
        
        this.retryQueue.set(errorId, retryInfo);
        
        const backoffTime = errorConfig.backoffMs * Math.pow(2, retryInfo.count - 1);
        
        this.logger.info(`Scheduling retry ${retryInfo.count}/${errorConfig.maxRetries} for error ${errorId} in ${backoffTime}ms`);
        
        return new Promise((resolve) => {
            setTimeout(async () => {
                try {
                    // Attempt to retry the original operation
                    if (context.retryFunction) {
                        const result = await context.retryFunction();
                        this.retryQueue.delete(errorId);
                        resolve({ success: true, result });
                    } else {
                        resolve({ success: false, error: 'No retry function provided' });
                    }
                } catch (retryError) {
                    // If retry fails, handle the error again
                    const result = await this.handleError(retryError, errorType, context);
                    resolve(result);
                }
            }, backoffTime);
        });
    }

    /**
     * Try fallback mechanisms for different error types
     */
    async tryFallback(error, errorType, context) {
        this.logger.info(`Attempting fallback for error type: ${errorType}`);
        
        switch (errorType) {
            case 'VOICE_RECOGNITION_ERROR':
                return this.voiceRecognitionFallback(error, context);
            
            case 'API_ERROR':
                return this.apiErrorFallback(error, context);
            
            case 'STORAGE_ERROR':
                return this.storageErrorFallback(error, context);
            
            case 'NETWORK_ERROR':
                return this.networkErrorFallback(error, context);
            
            default:
                return { success: false, reason: 'No fallback available' };
        }
    }

    /**
     * Voice recognition fallback - switch to manual input
     */
    async voiceRecognitionFallback(error, context) {
        this.logger.info('Attempting voice recognition fallback');
        
        try {
            // Show manual input dialog
            const result = await this.showManualInputDialog(context);
            
            if (result.success) {
                return {
                    success: true,
                    result: result.data,
                    fallbackUsed: 'manual_input'
                };
            }
            
            return { success: false, reason: 'User cancelled manual input' };
        } catch (fallbackError) {
            this.logger.error('Voice recognition fallback failed:', fallbackError);
            return { success: false, reason: 'Fallback failed' };
        }
    }

    /**
     * API error fallback - use cached data or offline mode
     */
    async apiErrorFallback(error, context) {
        this.logger.info('Attempting API error fallback');
        
        try {
            // Try to use cached data
            if (context.useCache && context.cacheKey) {
                const cachedData = await this.getCachedData(context.cacheKey);
                if (cachedData) {
                    return {
                        success: true,
                        result: cachedData,
                        fallbackUsed: 'cache'
                    };
                }
            }
            
            // Enable offline mode
            this.offlineMode = true;
            
            return {
                success: true,
                result: { offline: true },
                fallbackUsed: 'offline_mode'
            };
        } catch (fallbackError) {
            this.logger.error('API error fallback failed:', fallbackError);
            return { success: false, reason: 'Fallback failed' };
        }
    }

    /**
     * Storage error fallback - use memory storage
     */
    async storageErrorFallback(error, context) {
        this.logger.info('Attempting storage error fallback');
        
        try {
            // Use in-memory storage as fallback
            if (!window.memoryStorage) {
                window.memoryStorage = new Map();
            }
            
            return {
                success: true,
                result: { storage: window.memoryStorage },
                fallbackUsed: 'memory_storage'
            };
        } catch (fallbackError) {
            this.logger.error('Storage error fallback failed:', fallbackError);
            return { success: false, reason: 'Fallback failed' };
        }
    }

    /**
     * Network error fallback - use offline functionality
     */
    async networkErrorFallback(error, context) {
        this.logger.info('Attempting network error fallback');
        
        try {
            this.offlineMode = true;
            
            // Notify user about offline mode
            this.showOfflineNotification();
            
            return {
                success: true,
                result: { offline: true },
                fallbackUsed: 'offline_mode'
            };
        } catch (fallbackError) {
            this.logger.error('Network error fallback failed:', fallbackError);
            return { success: false, reason: 'Fallback failed' };
        }
    }

    /**
     * Execute registered error handlers
     */
    async executeErrorHandlers(errorType, error, context) {
        const handlers = this.errorHandlers.get(errorType) || [];
        
        for (const handler of handlers) {
            try {
                await handler(error, context);
            } catch (handlerError) {
                this.logger.error('Error in error handler:', handlerError);
            }
        }
    }

    /**
     * Show user-friendly error message
     */
    showUserFriendlyError(error, errorType, context) {
        const userMessage = this.getUserFriendlyMessage(error, errorType);
        const errorLevel = this.getErrorLevel(errorType);
        
        // Use UI manager to show toast if available
        if (window.ygoApp && window.ygoApp.uiManager) {
            window.ygoApp.uiManager.showToast(userMessage, errorLevel);
        } else {
            // Fallback to console
            console.error(userMessage);
        }
    }

    /**
     * Get user-friendly error message
     */
    getUserFriendlyMessage(error, errorType) {
        switch (errorType) {
            case 'VOICE_RECOGNITION_ERROR':
                return this.getVoiceErrorMessage(error);
            
            case 'API_ERROR':
                return this.getApiErrorMessage(error);
            
            case 'STORAGE_ERROR':
                return 'There was an issue saving your data. Your session will be stored temporarily in memory.';
            
            case 'NETWORK_ERROR':
                return 'You appear to be offline. Some features may not be available until you reconnect.';
            
            case 'PERMISSION_ERROR':
                return 'Permission denied. Please check your browser settings and try again.';
            
            case 'VALIDATION_ERROR':
                return 'The information provided is not valid. Please check your input and try again.';
            
            default:
                return 'An unexpected error occurred. Please try again or contact support if the issue persists.';
        }
    }

    /**
     * Get voice recognition specific error message
     */
    getVoiceErrorMessage(error) {
        if (error.message && error.message.includes('not-allowed')) {
            return 'Microphone access is required for voice recognition. Please enable microphone permissions in your browser settings.';
        }
        
        if (error.message && error.message.includes('no-speech')) {
            return 'No speech detected. Please speak clearly and try again.';
        }
        
        if (error.message && error.message.includes('audio-capture')) {
            return 'Unable to access microphone. Please check your microphone connection and try again.';
        }
        
        if (error.message && error.message.includes('network')) {
            return 'Network connection is required for voice recognition. Please check your internet connection.';
        }
        
        return 'Voice recognition is temporarily unavailable. You can still add cards manually.';
    }

    /**
     * Get API specific error message
     */
    getApiErrorMessage(error) {
        if (error.message && error.message.includes('timeout')) {
            return 'The request timed out. Please try again in a moment.';
        }
        
        if (error.message && error.message.includes('404')) {
            return 'The requested information could not be found. Please check your input and try again.';
        }
        
        if (error.message && error.message.includes('500')) {
            return 'The server is temporarily unavailable. Please try again later.';
        }
        
        if (error.message && error.message.includes('rate limit')) {
            return 'Too many requests. Please wait a moment before trying again.';
        }
        
        return 'Unable to connect to the server. Please check your internet connection and try again.';
    }

    /**
     * Get error level for UI display
     */
    getErrorLevel(errorType) {
        switch (errorType) {
            case 'VOICE_RECOGNITION_ERROR':
            case 'STORAGE_ERROR':
                return 'warning';
            
            case 'API_ERROR':
            case 'NETWORK_ERROR':
                return 'error';
            
            case 'PERMISSION_ERROR':
            case 'VALIDATION_ERROR':
                return 'error';
            
            default:
                return 'error';
        }
    }

    /**
     * Show manual input dialog for voice recognition fallback
     */
    async showManualInputDialog(context) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal-dialog error-fallback-modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Voice Recognition Unavailable</h3>
                        <button class="modal-close" type="button">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>Voice recognition is temporarily unavailable. You can manually enter the card name instead.</p>
                        <div class="form-group">
                            <label for="manual-card-input">Card Name:</label>
                            <input type="text" id="manual-card-input" class="form-control" placeholder="Enter card name..." autofocus>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" id="cancel-manual-input">Cancel</button>
                        <button class="btn btn-primary" id="confirm-manual-input">Add Card</button>
                    </div>
                </div>
            `;
            
            // Show modal
            const modalOverlay = document.getElementById('modal-overlay') || document.body;
            modalOverlay.appendChild(modal);
            modalOverlay.classList.remove('hidden');
            
            // Handle input
            const input = modal.querySelector('#manual-card-input');
            const confirmBtn = modal.querySelector('#confirm-manual-input');
            const cancelBtn = modal.querySelector('#cancel-manual-input');
            const closeBtn = modal.querySelector('.modal-close');
            
            const cleanup = () => {
                modalOverlay.removeChild(modal);
                modalOverlay.classList.add('hidden');
            };
            
            confirmBtn.addEventListener('click', () => {
                const cardName = input.value.trim();
                if (cardName) {
                    cleanup();
                    resolve({ success: true, data: { transcript: cardName, manual: true } });
                } else {
                    input.focus();
                }
            });
            
            [cancelBtn, closeBtn].forEach(btn => {
                btn.addEventListener('click', () => {
                    cleanup();
                    resolve({ success: false });
                });
            });
            
            // Handle Enter key
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    confirmBtn.click();
                }
            });
        });
    }

    /**
     * Get cached data for API fallback
     */
    async getCachedData(cacheKey) {
        try {
            const cache = await caches.open('ygo-ripper-cache');
            const response = await cache.match(cacheKey);
            
            if (response) {
                return await response.json();
            }
            
            return null;
        } catch (error) {
            this.logger.error('Failed to get cached data:', error);
            return null;
        }
    }

    /**
     * Show offline notification
     */
    showOfflineNotification() {
        const notification = document.createElement('div');
        notification.className = 'offline-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">📡</span>
                <span class="notification-text">You're offline. Some features may not be available.</span>
                <button class="notification-close">&times;</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
        
        // Manual close
        notification.querySelector('.notification-close').addEventListener('click', () => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });
    }

    /**
     * Handle network reconnection
     */
    handleNetworkReconnect() {
        this.logger.info('Network reconnected');
        this.offlineMode = false;
        
        // Retry queued operations
        this.retryQueuedOperations();
        
        // Show reconnection notification
        if (window.ygoApp && window.ygoApp.uiManager) {
            window.ygoApp.uiManager.showToast('Back online! Syncing data...', 'success');
        }
    }

    /**
     * Handle network disconnection
     */
    handleNetworkDisconnect() {
        this.logger.info('Network disconnected');
        this.offlineMode = true;
        
        // Show offline notification
        this.showOfflineNotification();
    }

    /**
     * Retry queued operations when network is restored
     */
    async retryQueuedOperations() {
        const queuedOperations = Array.from(this.retryQueue.entries());
        
        for (const [errorId, retryInfo] of queuedOperations) {
            if (retryInfo.networkDependent) {
                this.logger.info(`Retrying network-dependent operation: ${errorId}`);
                // Implementation would retry the specific operation
            }
        }
    }

    /**
     * Create safe wrapper for async operations
     */
    safeAsync(operation, errorType, context = {}) {
        return async (...args) => {
            try {
                return await operation(...args);
            } catch (error) {
                const result = await this.handleError(error, errorType, {
                    ...context,
                    retryFunction: () => operation(...args)
                });
                
                if (result.success) {
                    return result.result;
                } else {
                    throw new Error(result.userMessage);
                }
            }
        };
    }

    /**
     * Check if app is in offline mode
     */
    isOffline() {
        return this.offlineMode || !navigator.onLine;
    }

    /**
     * Get error statistics
     */
    getErrorStats() {
        return {
            totalErrors: this.retryQueue.size,
            offlineMode: this.offlineMode,
            retryQueue: Array.from(this.retryQueue.entries())
        };
    }

    /**
     * Clear error history
     */
    clearErrorHistory() {
        this.retryQueue.clear();
        this.logger.info('Error history cleared');
    }
}

// Create global error boundary instance
const errorBoundary = new AppErrorBoundary();

// Export for use in other modules
export { errorBoundary };
export default AppErrorBoundary;