/**
 * Enhanced Error Handler with Recovery Strategies
 */
export class ErrorHandler {
    constructor(logger) {
        this.logger = logger;
        this.retryConfig = {
            maxRetries: 3,
            baseDelay: 1000,
            backoffMultiplier: 2
        };
        this.errorHistory = new Map();
    }

    /**
     * Handle errors with automatic recovery strategies
     */
    async handleWithRecovery(operation, context = {}) {
        const operationId = context.operationId || 'unknown';
        let lastError;

        for (let attempt = 1; attempt <= this.retryConfig.maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                this.logError(error, { ...context, attempt });

                // Don't retry on certain error types
                if (this.isNonRetryableError(error)) {
                    break;
                }

                // Wait before retrying
                if (attempt < this.retryConfig.maxRetries) {
                    const delay = this.calculateDelay(attempt);
                    await this.delay(delay);
                }
            }
        }

        // All retries failed - handle gracefully
        return this.handleFailure(lastError, context);
    }

    /**
     * Determine if error should not be retried
     */
    isNonRetryableError(error) {
        const nonRetryablePatterns = [
            /authentication/i,
            /authorization/i,
            /invalid.*request/i,
            /card.*not.*found/i
        ];

        return nonRetryablePatterns.some(pattern => 
            pattern.test(error.message)
        );
    }

    /**
     * Calculate exponential backoff delay
     */
    calculateDelay(attempt) {
        return this.retryConfig.baseDelay * 
               Math.pow(this.retryConfig.backoffMultiplier, attempt - 1) +
               Math.random() * 1000; // Add jitter
    }

    /**
     * Handle operation failure after all retries
     */
    handleFailure(error, context) {
        const fallbackMessage = this.getFallbackMessage(error, context);
        
        // Track error frequency
        this.trackError(error, context);
        
        // Return graceful degradation response
        return {
            success: false,
            error: error.message,
            fallbackMessage,
            degradedMode: true
        };
    }

    /**
     * Get user-friendly fallback message
     */
    getFallbackMessage(error, context) {
        if (context.operationType === 'priceCheck') {
            return 'Price data temporarily unavailable. Showing cached data or estimates.';
        } else if (context.operationType === 'voiceRecognition') {
            return 'Voice recognition temporarily unavailable. Please use manual input.';
        } else if (context.operationType === 'imageLoad') {
            return 'Card image temporarily unavailable. Functionality continues normally.';
        }
        
        return 'Service temporarily unavailable. Some features may be limited.';
    }

    /**
     * Track error patterns for monitoring
     */
    trackError(error, context) {
        const key = `${context.operationType || 'unknown'}-${error.name}`;
        const current = this.errorHistory.get(key) || { count: 0, lastSeen: null };
        
        this.errorHistory.set(key, {
            count: current.count + 1,
            lastSeen: new Date().toISOString(),
            message: error.message
        });
    }

    /**
     * Get error statistics for monitoring
     */
    getErrorStats() {
        return Object.fromEntries(this.errorHistory);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    logError(error, context) {
        this.logger.error(`Operation failed (attempt ${context.attempt}):`, {
            error: error.message,
            context,
            stack: error.stack
        });
    }
}