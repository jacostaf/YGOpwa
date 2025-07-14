/**
 * Voice Engine - Robust Voice Recognition System
 * 
 * Provides cross-platform voice recognition with multiple fallback strategies
 * and proper permission handling for Mac, Windows, and iOS.
 * 
 * Features:
 * - Multi-strategy recognition (Web Speech API, fallbacks)
 * - Robust permission handling
 * - Platform-specific optimizations
 * - Error recovery and retry mechanisms
 * - Yu-Gi-Oh card name optimization
 */

import { Logger } from '../utils/Logger.js';

export class VoiceEngine {
    constructor(permissionManager, logger = null) {
        this.permissionManager = permissionManager;
        this.logger = logger || new Logger('VoiceEngine');
        
        // Recognition engines
        this.engines = new Map();
        this.currentEngine = null;
        this.fallbackEngines = [];
        
        // State management
        this.isInitialized = false;
        this.isListening = false;
        this.isPaused = false;
        this.shouldKeepListening = false; // Track if user wants continuous listening
        
        // Enhanced error handling state
        this.errorState = {
            lastError: null,
            errorCount: 0,
            consecutiveErrors: 0,
            errorHistory: [],
            recoveryInProgress: false,
            lastRecoveryAttempt: null,
            maxErrorHistory: 10
        };
        
        // Configuration
        this.config = {
            language: 'en-US',
            continuous: false, // Better for macOS/iOS
            interimResults: false,
            maxAlternatives: 3,
            timeout: 10000,
            retryAttempts: 3,
            retryDelay: 1000,
            // Enhanced retry configuration
            maxRetryDelay: 8000,
            retryMultiplier: 2,
            backoffEnabled: true,
            // Error recovery configuration
            maxConsecutiveErrors: 5,
            errorCooldownPeriod: 30000,
            autoRecoveryEnabled: true,
            // Yu-Gi-Oh specific settings
            cardNameOptimization: true,
            confidenceThreshold: 0.7
        };
        
        // Event listeners
        this.listeners = {
            result: [],
            error: [],
            statusChange: [],
            permissionChange: [],
            // Enhanced error event listeners
            errorRecovered: [],
            errorStateChanged: [],
            configChanged: [] // Added config change listener
        };
        
        // Recognition state
        this.lastResult = null;
        this.recognitionAttempts = 0;
        this.isRecovering = false;
        
        // Platform detection
        this.platform = this.detectPlatform();
        
        // Yu-Gi-Oh specific optimizations
        this.cardNamePatterns = new Map();
        this.commonCardTerms = [];
        
        this.logger.info('VoiceEngine initialized for platform:', this.platform);
    }

    /**
     * Initialize the voice engine
     */
    /**
     * Update engine configuration
     * @param {Object} settings - Settings to update
     */
    updateConfig(settings = {}) {
        if (!settings) return;
        
        // Map settings to our internal config
        const configUpdates = {
            confidenceThreshold: settings.voiceConfidenceThreshold,
            maxAlternatives: settings.voiceMaxAlternatives,
            continuous: settings.voiceContinuous,
            interimResults: settings.voiceInterimResults,
            language: settings.voiceLanguage || this.config.language
        };
        
        // Apply updates
        Object.keys(configUpdates).forEach(key => {
            if (configUpdates[key] !== undefined) {
                this.config[key] = configUpdates[key];
            }
        });
        
        this.logger.debug('Voice engine config updated:', this.config);
        
        // Reinitialize if already initialized
        if (this.isInitialized) {
            this.reinitialize();
        }
    }
    
    /**
     * Reinitialize the voice engine with current config
     */
    async reinitialize() {
        this.logger.info('Reinitializing voice engine with updated config...');
        await this.stop();
        await this.initialize();
    }
    
    async initialize() {
        if (this.isInitialized) {
            return true;
        }

        try {
            this.logger.info('Initializing voice engine...');
            this.logger.debug('Voice engine config:', this.config);
            
            // Check environment compatibility
            if (!this.isEnvironmentSupported()) {
                throw new Error('Voice recognition not supported in this environment');
            }
            
            // Initialize permission manager
            await this.permissionManager.initialize();
            
            // Request microphone permissions
            const hasPermission = await this.requestMicrophonePermission();
            if (!hasPermission) {
                throw new Error('Microphone permission denied');
            }
            
            // Initialize recognition engines
            await this.initializeEngines();
            
            // Select best engine
            this.selectBestEngine();
            
            // Load Yu-Gi-Oh optimizations
            await this.loadCardNameOptimizations();
            
            // Apply platform-specific optimizations
            this.applyPlatformOptimizations();
            
            this.isInitialized = true;
            this.emitStatusChange('ready');
            
            this.logger.info('Voice engine initialized successfully');
            return true;
            
        } catch (error) {
            this.logger.error('Failed to initialize voice engine:', error);
            this.emitError({
                type: 'initialization-failed',
                message: error.message,
                error
            });
            throw error;
        }
    }

    /**
     * Check if environment supports voice recognition
     */
    isEnvironmentSupported() {
        // Check for secure context (required for Web Speech API)
        if (!window.isSecureContext) {
            this.logger.warn('Voice recognition requires secure context (HTTPS)');
            return false;
        }
        
        // Check for Web Speech API support
        const hasWebSpeech = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
        
        if (!hasWebSpeech) {
            this.logger.warn('Web Speech API not available');
            return false;
        }
        
        return true;
    }

    /**
     * Request microphone permissions
     */
    async requestMicrophonePermission() {
        try {
            this.logger.info('Requesting microphone permission...');
            
            const permission = await this.permissionManager.requestMicrophone();
            
            if (permission.state === 'granted') {
                this.logger.info('Microphone permission granted');
                return true;
            } else if (permission.state === 'denied') {
                this.logger.error('Microphone permission denied');
                this.emitError({
                    type: 'permission-denied',
                    message: 'Microphone access denied. Please enable microphone permissions in your browser settings.'
                });
                return false;
            } else {
                // Permission prompt state - user hasn't decided yet
                this.logger.info('Microphone permission prompt shown');
                return false;
            }
            
        } catch (error) {
            this.logger.error('Error requesting microphone permission:', error);
            
            // Try direct media access as fallback
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach(track => track.stop()); // Clean up
                this.logger.info('Microphone access confirmed via getUserMedia');
                return true;
            } catch (mediaError) {
                this.logger.error('Media access also failed:', mediaError);
                this.emitError({
                    type: 'permission-denied',
                    message: 'Unable to access microphone. Please check your browser permissions.'
                });
                return false;
            }
        }
    }

    /**
     * Initialize recognition engines
     */
    async initializeEngines() {
        this.logger.info('Initializing recognition engines...');
        
        // Primary engine: Web Speech API
        await this.initializeWebSpeechEngine();
        
        // Future: Add fallback engines here
        // - Cloud-based recognition services
        // - Local recognition libraries
        
        this.logger.info(`Initialized ${this.engines.size} recognition engine(s)`);
    }

    /**
     * Initialize Web Speech API engine
     */
    async initializeWebSpeechEngine() {
        try {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            
            if (!SpeechRecognition) {
                throw new Error('Web Speech API not available');
            }
            
            const recognition = new SpeechRecognition();
            
            // Configure recognition
            recognition.continuous = this.config.continuous;
            recognition.interimResults = this.config.interimResults;
            recognition.lang = this.config.language;
            recognition.maxAlternatives = this.config.maxAlternatives;
            
            // Set up event handlers
            recognition.onstart = () => {
                this.logger.debug('Web Speech recognition started');
                this.isListening = true;
                this.emitStatusChange('listening');
            };
            
            recognition.onend = () => {
                this.logger.debug('Web Speech recognition ended');
                this.isListening = false;
                
                // Auto-restart if user wants continuous listening and not manually stopped
                if (this.shouldKeepListening && !this.isPaused && this.isInitialized) {
                    setTimeout(() => {
                        if (this.shouldKeepListening && !this.isPaused) {
                            this.startListening().catch((error) => {
                                this.logger.warn('Failed to restart recognition:', error);
                            });
                        }
                    }, 100);
                } else {
                    this.emitStatusChange('ready');
                }
            };
            
            recognition.onresult = (event) => {
                this.handleRecognitionResult(event, 'webspeech');
            };
            
            recognition.onerror = (event) => {
                this.handleRecognitionError(event, 'webspeech');
            };
            
            // Store engine
            this.engines.set('webspeech', {
                name: 'Web Speech API',
                instance: recognition,
                priority: 10,
                available: true,
                platform: ['all']
            });
            
            this.logger.info('Web Speech API engine initialized successfully');
            
        } catch (error) {
            this.logger.error('Failed to initialize Web Speech API engine:', error);
        }
    }

    /**
     * Select the best available engine
     */
    selectBestEngine() {
        let bestEngine = null;
        let highestPriority = -1;
        
        for (const [key, engine] of this.engines) {
            if (engine.available && engine.priority > highestPriority) {
                if (engine.platform.includes('all') || engine.platform.includes(this.platform)) {
                    bestEngine = key;
                    highestPriority = engine.priority;
                }
            }
        }
        
        if (bestEngine) {
            this.currentEngine = bestEngine;
            this.logger.info(`Selected engine: ${this.engines.get(bestEngine).name}`);
        } else {
            throw new Error('No suitable recognition engine available');
        }
    }

    /**
     * Start listening for voice input
     */
    async startListening() {
        if (!this.isInitialized) {
            throw new Error('Voice engine not initialized');
        }
        
        if (this.isListening) {
            this.logger.warn('Already listening');
            return;
        }
        
        try {
            this.logger.info('Starting voice recognition...');
            this.isPaused = false;
            this.shouldKeepListening = true; // Enable continuous listening
            this.recognitionAttempts = 0;
            
            const engine = this.engines.get(this.currentEngine);
            if (!engine) {
                throw new Error('No recognition engine available');
            }
            
            // Start recognition with timeout
            await this.startEngineWithTimeout(engine);
            
        } catch (error) {
            this.logger.error('Failed to start voice recognition:', error);
            this.emitError({
                type: 'start-failed',
                message: error.message,
                error
            });
            throw error;
        }
    }

    /**
     * Start engine with timeout protection
     */
    async startEngineWithTimeout(engine) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.logger.error('Voice recognition start timeout');
                reject(new Error('Voice recognition start timeout'));
            }, 5000);
            
            try {
                engine.instance.onstart = () => {
                    clearTimeout(timeout);
                    this.isListening = true;
                    this.emitStatusChange('listening');
                    resolve();
                };
                
                engine.instance.start();
                
            } catch (error) {
                clearTimeout(timeout);
                reject(error);
            }
        });
    }

    /**
     * Stop listening for voice input
     */
    stopListening() {
        if (!this.isListening) {
            this.logger.warn('Not currently listening');
            return;
        }
        
        try {
            this.logger.info('Stopping voice recognition...');
            this.isPaused = true;
            this.shouldKeepListening = false; // Disable continuous listening
            
            const engine = this.engines.get(this.currentEngine);
            if (engine && engine.instance) {
                engine.instance.stop();
            }
            
            this.isListening = false;
            this.emitStatusChange('ready');
            
        } catch (error) {
            this.logger.error('Error stopping voice recognition:', error);
        }
    }

    /**
     * Test voice recognition
     */
    async testRecognition() {
        this.logger.info('Starting voice recognition test...');
        
        return new Promise((resolve, reject) => {
            const originalListeners = {
                result: [...this.listeners.result],
                error: [...this.listeners.error]
            };
            
            // Set up test listeners
            const testResultHandler = (result) => {
                this.logger.info('Voice test completed:', result);
                this.restoreListeners(originalListeners);
                resolve(result.transcript);
            };
            
            const testErrorHandler = (error) => {
                this.logger.error('Voice test failed:', error);
                this.restoreListeners(originalListeners);
                reject(error);
            };
            
            // Replace listeners temporarily
            this.listeners.result = [testResultHandler];
            this.listeners.error = [testErrorHandler];
            
            // Start listening
            this.startListening().catch(reject);
            
            // Set timeout
            setTimeout(() => {
                if (this.isListening) {
                    this.stopListening();
                    this.restoreListeners(originalListeners);
                    reject(new Error('Voice test timeout - no speech detected'));
                }
            }, 10000);
        });
    }

    /**
     * Handle recognition result
     */
    handleRecognitionResult(event, engineType) {
        try {
            const results = Array.from(event.results);
            const lastResult = results[results.length - 1];
            
            if (!lastResult.isFinal && !this.config.interimResults) {
                return;
            }
            
            const alternatives = Array.from(lastResult).map(alt => ({
                transcript: alt.transcript,
                confidence: alt.confidence || 0
            }));
            
            // Filter by confidence threshold
            const validAlternatives = alternatives.filter(alt => 
                alt.confidence >= this.config.confidenceThreshold
            );
            
            if (validAlternatives.length === 0) {
                this.logger.warn('No high-confidence recognition results');
                return;
            }
            
            // Select best result
            const bestResult = validAlternatives[0];
            
            // Apply Yu-Gi-Oh specific optimizations
            const optimizedResult = this.optimizeCardNameRecognition(bestResult);
            
            const result = {
                transcript: optimizedResult.transcript,
                confidence: optimizedResult.confidence,
                alternatives: validAlternatives,
                engine: engineType,
                timestamp: new Date().toISOString(),
                isFinal: lastResult.isFinal
            };
            
            this.lastResult = result;
            this.recognitionAttempts = 0; // Reset retry counter on success
            
            this.logger.info('Voice recognition result:', result);
            this.emitResult(result);
            
        } catch (error) {
            this.logger.error('Error processing recognition result:', error);
            this.emitError({
                type: 'result-processing-error',
                message: error.message,
                error
            });
        }
    }

    /**
     * Handle recognition error
     */
    handleRecognitionError(event, engineType) {
        const errorInfo = this.analyzeError(event.error, engineType);
        this.updateErrorState(errorInfo);
        
        this.logger.error(`Recognition error from ${engineType}:`, {
            error: event.error,
            errorType: errorInfo.type,
            consecutiveErrors: this.errorState.consecutiveErrors,
            errorCount: this.errorState.errorCount
        });
        
        this.isListening = false;
        
        // Emit enhanced error information
        this.emitError({
            type: errorInfo.type,
            message: errorInfo.message,
            isRetryable: errorInfo.isRetryable,
            engine: engineType,
            originalError: event.error,
            context: this.getErrorContext(),
            recoveryStrategy: errorInfo.recoveryStrategy,
            userGuidance: errorInfo.userGuidance
        });
        
        // Attempt recovery for retryable errors
        if (errorInfo.isRetryable && this.shouldAttemptRecovery()) {
            this.attemptEnhancedRecovery(errorInfo);
        } else {
            this.emitStatusChange('error');
            this.emitErrorStateChanged();
        }
    }

    /**
     * Analyze error and provide detailed information
     */
    analyzeError(errorCode, engineType) {
        const baseInfo = {
            code: errorCode,
            engine: engineType,
            timestamp: Date.now(),
            platform: this.platform
        };

        switch (errorCode) {
            case 'not-allowed':
                return {
                    ...baseInfo,
                    type: 'permission-denied',
                    message: 'Microphone access denied. Please enable microphone permissions.',
                    isRetryable: false,
                    recoveryStrategy: 'permission-request',
                    userGuidance: this.getPermissionGuidance(),
                    severity: 'high'
                };
                
            case 'no-speech':
                return {
                    ...baseInfo,
                    type: 'no-speech',
                    message: 'No speech detected. Please try speaking louder and clearer.',
                    isRetryable: true,
                    recoveryStrategy: 'immediate-retry',
                    userGuidance: 'Speak clearly into your microphone and try again.',
                    severity: 'low'
                };
                
            case 'audio-capture':
                return {
                    ...baseInfo,
                    type: 'audio-capture',
                    message: 'Microphone not available or audio capture failed.',
                    isRetryable: true,
                    recoveryStrategy: 'device-check',
                    userGuidance: 'Check if your microphone is connected and not being used by another application.',
                    severity: 'medium'
                };
                
            case 'network':
                return {
                    ...baseInfo,
                    type: 'network-error',
                    message: 'Network connection required for speech recognition.',
                    isRetryable: true,
                    recoveryStrategy: 'connectivity-check',
                    userGuidance: 'Check your internet connection and try again.',
                    severity: 'medium'
                };
                
            case 'aborted':
                return {
                    ...baseInfo,
                    type: 'recognition-aborted',
                    message: 'Speech recognition was interrupted.',
                    isRetryable: true,
                    recoveryStrategy: 'gentle-retry',
                    userGuidance: 'Recognition was stopped. Click to try again.',
                    severity: 'low'
                };
                
            case 'bad-grammar':
                return {
                    ...baseInfo,
                    type: 'grammar-error',
                    message: 'Speech recognition grammar error.',
                    isRetryable: true,
                    recoveryStrategy: 'config-reset',
                    userGuidance: 'Try speaking more clearly or check your settings.',
                    severity: 'low'
                };
                
            default:
                return {
                    ...baseInfo,
                    type: 'unknown-error',
                    message: `Unknown recognition error: ${errorCode}`,
                    isRetryable: true,
                    recoveryStrategy: 'full-restart',
                    userGuidance: 'An unexpected error occurred. Please try again.',
                    severity: 'medium'
                };
        }
    }

    /**
     * Update error state tracking
     */
    updateErrorState(errorInfo) {
        this.errorState.lastError = errorInfo;
        this.errorState.errorCount++;
        this.errorState.consecutiveErrors++;
        
        // Add to error history
        this.errorState.errorHistory.unshift({
            ...errorInfo,
            timestamp: Date.now()
        });
        
        // Trim history to max size
        if (this.errorState.errorHistory.length > this.errorState.maxErrorHistory) {
            this.errorState.errorHistory = this.errorState.errorHistory.slice(0, this.errorState.maxErrorHistory);
        }
        
        // Check for error patterns
        this.analyzeErrorPatterns();
    }

    /**
     * Analyze error patterns for better recovery strategies
     */
    analyzeErrorPatterns() {
        const recentErrors = this.errorState.errorHistory.slice(0, 5);
        const errorTypes = recentErrors.map(e => e.type);
        
        // Check for permission issues
        if (errorTypes.includes('permission-denied')) {
            this.errorState.hasPermissionIssues = true;
        }
        
        // Check for audio device issues
        const audioErrors = errorTypes.filter(t => 
            t === 'audio-capture' || t === 'no-speech'
        ).length;
        
        if (audioErrors >= 3) {
            this.errorState.hasAudioDeviceIssues = true;
        }
        
        // Check for network issues
        const networkErrors = errorTypes.filter(t => t === 'network-error').length;
        if (networkErrors >= 2) {
            this.errorState.hasNetworkIssues = true;
        }
    }

    /**
     * Performance monitoring system
     */
    initializePerformanceMonitoring() {
        this.performanceMetrics = {
            // Recognition performance
            recognitionAttempts: 0,
            successfulRecognitions: 0,
            failedRecognitions: 0,
            averageResponseTime: 0,
            responseTimeHistory: [],
            
            // Accuracy metrics
            totalConfidenceSum: 0,
            averageConfidence: 0,
            highConfidenceCount: 0,
            lowConfidenceCount: 0,
            
            // Error tracking
            errorsByType: new Map(),
            errorRecoverySuccess: 0,
            errorRecoveryFailures: 0,
            
            // Performance timing
            startTime: null,
            endTime: null,
            processingTime: 0,
            
            // Memory and resource usage
            memoryUsage: [],
            cpuUsage: [],
            
            // Session statistics
            sessionStart: Date.now(),
            sessionDuration: 0,
            totalUsageTime: 0,
            
            // User experience metrics
            userInterruptions: 0,
            manualRestarts: 0,
            satisfactionScore: 0
        };
        
        // Start performance monitoring interval
        this.performanceInterval = setInterval(() => {
            this.collectPerformanceMetrics();
        }, 5000); // Collect every 5 seconds
        
        this.logger.info('Performance monitoring initialized');
    }

    /**
     * Collect real-time performance metrics
     */
    collectPerformanceMetrics() {
        const metrics = this.performanceMetrics;
        
        // Calculate success rate
        const totalAttempts = metrics.recognitionAttempts;
        const successRate = totalAttempts > 0 ? 
            (metrics.successfulRecognitions / totalAttempts) * 100 : 0;
        
        // Calculate average confidence
        if (metrics.successfulRecognitions > 0) {
            metrics.averageConfidence = metrics.totalConfidenceSum / metrics.successfulRecognitions;
        }
        
        // Update session duration
        metrics.sessionDuration = Date.now() - metrics.sessionStart;
        
        // Collect memory usage if available
        if (performance.memory) {
            metrics.memoryUsage.push({
                timestamp: Date.now(),
                usedJSMemory: performance.memory.usedJSMemory,
                totalJSMemory: performance.memory.totalJSMemory,
                jsMemoryLimit: performance.memory.jsMemoryLimit
            });
            
            // Keep only last 20 measurements
            if (metrics.memoryUsage.length > 20) {
                metrics.memoryUsage = metrics.memoryUsage.slice(-20);
            }
        }
        
        // Log performance summary periodically
        if (Date.now() % 30000 < 5000) { // Every 30 seconds
            this.logger.debug('Performance Summary:', {
                successRate: `${successRate.toFixed(1)}%`,
                averageConfidence: metrics.averageConfidence.toFixed(2),
                totalAttempts: metrics.recognitionAttempts,
                sessionDuration: `${(metrics.sessionDuration / 1000 / 60).toFixed(1)}min`,
                errorCount: metrics.failedRecognitions
            });
        }
        
        // Emit performance data for UI display
        this.emitPerformanceUpdate({
            successRate,
            averageConfidence: metrics.averageConfidence,
            responseTime: metrics.averageResponseTime,
            errorCount: metrics.failedRecognitions,
            isHealthy: this.isPerformanceHealthy(metrics)
        });
    }

    /**
     * Check if performance is healthy
     */
    isPerformanceHealthy(metrics) {
        const successRate = metrics.recognitionAttempts > 0 ? 
            (metrics.successfulRecognitions / metrics.recognitionAttempts) * 100 : 100;
        
        const avgConfidence = metrics.averageConfidence;
        const recentErrors = this.errorState.consecutiveErrors;
        
        return (
            successRate >= 70 &&
            avgConfidence >= 0.6 &&
            recentErrors < 3 &&
            !this.errorState.recoveryInProgress
        );
    }

    /**
     * Record successful recognition
     */
    recordRecognitionSuccess(result) {
        const metrics = this.performanceMetrics;
        
        metrics.recognitionAttempts++;
        metrics.successfulRecognitions++;
        
        // Reset consecutive errors on success
        this.errorState.consecutiveErrors = 0;
        
        // Record confidence
        if (result.confidence) {
            metrics.totalConfidenceSum += result.confidence;
            
            if (result.confidence >= 0.8) {
                metrics.highConfidenceCount++;
            } else if (result.confidence < 0.5) {
                metrics.lowConfidenceCount++;
            }
        }
        
        // Record timing if available
        if (metrics.startTime) {
            const responseTime = Date.now() - metrics.startTime;
            metrics.responseTimeHistory.push(responseTime);
            
            // Keep only last 50 measurements
            if (metrics.responseTimeHistory.length > 50) {
                metrics.responseTimeHistory = metrics.responseTimeHistory.slice(-50);
            }
            
            // Calculate average response time
            metrics.averageResponseTime = metrics.responseTimeHistory.reduce((a, b) => a + b, 0) / 
                metrics.responseTimeHistory.length;
            
            metrics.startTime = null;
        }
        
        this.logger.debug('Recognition success recorded:', {
            confidence: result.confidence,
            responseTime: metrics.averageResponseTime
        });
    }

    /**
     * Record recognition failure
     */
    recordRecognitionFailure(errorInfo) {
        const metrics = this.performanceMetrics;
        
        metrics.recognitionAttempts++;
        metrics.failedRecognitions++;
        
        // Track error by type
        const errorType = errorInfo.type || 'unknown';
        const currentCount = metrics.errorsByType.get(errorType) || 0;
        metrics.errorsByType.set(errorType, currentCount + 1);
        
        this.logger.debug('Recognition failure recorded:', {
            errorType,
            totalFailures: metrics.failedRecognitions,
            consecutiveErrors: this.errorState.consecutiveErrors
        });
    }

    /**
     * Get comprehensive performance report
     */
    getPerformanceReport() {
        const metrics = this.performanceMetrics;
        const totalAttempts = metrics.recognitionAttempts;
        
        return {
            // Success metrics
            totalAttempts,
            successfulRecognitions: metrics.successfulRecognitions,
            failedRecognitions: metrics.failedRecognitions,
            successRate: totalAttempts > 0 ? (metrics.successfulRecognitions / totalAttempts) * 100 : 0,
            
            // Quality metrics
            averageConfidence: metrics.averageConfidence,
            highConfidenceRate: metrics.successfulRecognitions > 0 ? 
                (metrics.highConfidenceCount / metrics.successfulRecognitions) * 100 : 0,
            lowConfidenceRate: metrics.successfulRecognitions > 0 ? 
                (metrics.lowConfidenceCount / metrics.successfulRecognitions) * 100 : 0,
            
            // Performance metrics
            averageResponseTime: metrics.averageResponseTime,
            responseTimeHistory: [...metrics.responseTimeHistory],
            
            // Error analysis
            errorsByType: Object.fromEntries(metrics.errorsByType),
            consecutiveErrors: this.errorState.consecutiveErrors,
            errorRecoveryRate: (metrics.errorRecoverySuccess + metrics.errorRecoveryFailures) > 0 ?
                (metrics.errorRecoverySuccess / (metrics.errorRecoverySuccess + metrics.errorRecoveryFailures)) * 100 : 0,
            
            // Session info
            sessionDuration: metrics.sessionDuration,
            totalUsageTime: metrics.totalUsageTime,
            isHealthy: this.isPerformanceHealthy(metrics),
            
            // System info
            platform: this.platform,
            currentEngine: this.currentEngine,
            memoryUsage: metrics.memoryUsage.slice(-5), // Last 5 measurements
            
            // Recommendations
            recommendations: this.generatePerformanceRecommendations(metrics)
        };
    }

    /**
     * Generate performance improvement recommendations
     */
    generatePerformanceRecommendations(metrics) {
        const recommendations = [];
        const totalAttempts = metrics.recognitionAttempts;
        
        if (totalAttempts === 0) {
            return ['Start using voice recognition to get performance insights.'];
        }
        
        const successRate = (metrics.successfulRecognitions / totalAttempts) * 100;
        const avgConfidence = metrics.averageConfidence;
        
        // Success rate recommendations
        if (successRate < 50) {
            recommendations.push('Success rate is low. Check microphone quality and speak more clearly.');
        } else if (successRate < 70) {
            recommendations.push('Consider improving audio environment to reduce background noise.');
        }
        
        // Confidence recommendations
        if (avgConfidence < 0.5) {
            recommendations.push('Low confidence scores. Try speaking more slowly and clearly.');
        } else if (avgConfidence < 0.7) {
            recommendations.push('Good recognition, but consider reducing background noise for better accuracy.');
        }
        
        // Error pattern recommendations
        if (this.errorState.hasPermissionIssues) {
            recommendations.push('Grant microphone permissions in browser settings for better reliability.');
        }
        
        if (this.errorState.hasAudioDeviceIssues) {
            recommendations.push('Check microphone connection and audio device settings.');
        }
        
        if (this.errorState.hasNetworkIssues) {
            recommendations.push('Ensure stable internet connection for cloud-based recognition.');
        }
        
        // Response time recommendations
        if (metrics.averageResponseTime > 3000) {
            recommendations.push('High response times detected. Check internet connection speed.');
        }
        
        // Memory recommendations
        if (metrics.memoryUsage.length > 0) {
            const latestMemory = metrics.memoryUsage[metrics.memoryUsage.length - 1];
            const memoryUsagePercent = (latestMemory.usedJSMemory / latestMemory.totalJSMemory) * 100;
            
            if (memoryUsagePercent > 90) {
                recommendations.push('High memory usage detected. Consider refreshing the page.');
            }
        }
        
        if (recommendations.length === 0) {
            recommendations.push('Excellent performance! Voice recognition is working optimally.');
        }
        
        return recommendations;
    }

    /**
     * Event listener registration methods (EventEmitter-style)
     */
    onResult(callback) {
        this.listeners.result.push(callback);
    }

    onStatusChange(callback) {
        this.listeners.statusChange.push(callback);
    }

    onError(callback) {
        this.listeners.error.push(callback);
    }

    onPermissionChange(callback) {
        this.listeners.permissionChange.push(callback);
    }

    // Event emission methods
    emitResult(result) {
        this.listeners.result.forEach(callback => {
            try {
                callback(result);
            } catch (error) {
                this.logger.error('Error in result callback:', error);
            }
        });
    }

    emitStatusChange(status) {
        this.listeners.statusChange.forEach(callback => {
            try {
                callback(status);
            } catch (error) {
                this.logger.error('Error in status change callback:', error);
            }
        });
    }

    emitError(errorInfo) {
        this.listeners.error.forEach(callback => {
            try {
                callback(errorInfo);
            } catch (error) {
                this.logger.error('Error in error callback:', error);
            }
        });
    }

    emitPermissionChange(state) {
        this.listeners.permissionChange.forEach(callback => {
            try {
                callback(state);
            } catch (error) {
                this.logger.error('Error in permission change callback:', error);
            }
        });
    }

    emitPerformanceUpdate(metrics) {
        this.listeners.performanceUpdate = this.listeners.performanceUpdate || [];
        this.listeners.performanceUpdate.forEach(callback => {
            try {
                callback(metrics);
            } catch (error) {
                this.logger.error('Error in performance update callback:', error);
            }
        });
    }

    // Helper methods for app.js compatibility
    isAvailable() {
        return this.isInitialized && this.engines.size > 0;
    }

    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isListening: this.isListening,
            isPaused: this.isPaused,
            currentEngine: this.currentEngine,
            availableEngines: Array.from(this.engines.keys()),
            platform: this.platform,
            hasPermission: this.permissionManager ? this.permissionManager.hasPermission() : false,
            errorCount: this.errorState.errorCount,
            consecutiveErrors: this.errorState.consecutiveErrors
        };
    }

    /**
     * Enhanced event emitters
     */
    emitErrorRecovered(recoveryInfo) {
        this.listeners.errorRecovered.forEach(callback => {
            try {
                callback(recoveryInfo);
            } catch (error) {
                this.logger.error('Error in error recovery callback:', error);
            }
        });
    }

    emitErrorStateChanged() {
        this.listeners.errorStateChanged.forEach(callback => {
            try {
                callback(this.getErrorSummary());
            } catch (error) {
                this.logger.error('Error in error state change callback:', error);
            }
        });
    }

    emitConfigChanged(oldConfig, newConfig) {
        this.listeners.configChanged.forEach(callback => {
            try {
                callback({ oldConfig, newConfig });
            } catch (error) {
                this.logger.error('Error in config change callback:', error);
            }
        });
    }

    /**
     * Get error summary for UI display
     */
    getErrorSummary() {
        return {
            hasErrors: this.errorState.errorCount > 0,
            consecutiveErrors: this.errorState.consecutiveErrors,
            totalErrors: this.errorState.errorCount,
            lastError: this.errorState.lastError,
            recoveryInProgress: this.errorState.recoveryInProgress,
            canRetry: this.shouldAttemptRecovery(),
            errorTrend: this.analyzeErrorTrend()
        };
    }

    /**
     * Analyze error trend for proactive handling
     */
    analyzeErrorTrend() {
        if (this.errorState.errorHistory.length < 3) {
            return 'insufficient-data';
        }
        
        const recentErrors = this.errorState.errorHistory.slice(-5);
        const errorTypes = recentErrors.map(e => e.type);
        
        // Check for repeated error types
        const typeCounts = errorTypes.reduce((acc, type) => {
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});
        
        const dominantType = Object.keys(typeCounts).reduce((a, b) => 
            typeCounts[a] > typeCounts[b] ? a : b
        );
        
        if (typeCounts[dominantType] >= 3) {
            return `recurring-${dominantType}`;
        }
        
        return 'sporadic';
    }

    // Enhanced event listener methods
    onErrorRecovered(callback) {
        this.listeners.errorRecovered.push(callback);
    }

    onErrorStateChanged(callback) {
        this.listeners.errorStateChanged.push(callback);
    }

    onConfigChanged(callback) {
        this.listeners.configChanged.push(callback);
    }

    /**
     * Reset error state (useful for testing or manual recovery)
     */
    resetErrorState() {
        this.errorState = {
            lastError: null,
            errorCount: 0,
            consecutiveErrors: 0,
            errorHistory: [],
            recoveryInProgress: false,
            lastRecoveryAttempt: null,
            maxErrorHistory: 10
        };
        
        this.recognitionAttempts = 0;
        this.isRecovering = false;
        
        this.logger.info('Error state reset');
        this.emitErrorStateChanged();
    }

    /**
     * Cleanup method for proper resource management
     */
    destroy() {
        this.logger.info('Destroying VoiceEngine instance');
        
        // Stop listening
        this.stopListening();
        
        // Clear all intervals and timeouts
        clearTimeout(this.timeoutId);
        
        // Clear listeners
        Object.keys(this.listeners).forEach(event => {
            this.listeners[event] = [];
        });
        
        // Cleanup engines
        this.engines.forEach((engine, name) => {
            try {
                if (engine && typeof engine.abort === 'function') {
                    engine.abort();
                }
            } catch (error) {
                this.logger.warn(`Error cleaning up engine ${name}:`, error);
            }
        });
        
        this.engines.clear();
        this.isInitialized = false;
        this.isListening = false;
        
        this.logger.info('VoiceEngine destroyed successfully');
    }

    /**
     * Get detailed diagnostic information
     */
    getDiagnosticInfo() {
        return {
            engine: {
                isInitialized: this.isInitialized,
                currentEngine: this.currentEngine,
                availableEngines: Array.from(this.engines.keys()),
                platform: this.platform
            },
            state: {
                isListening: this.isListening,
                isPaused: this.isPaused,
                shouldKeepListening: this.shouldKeepListening
            },
            errors: this.getErrorSummary(),
            config: { ...this.config },
            context: this.getErrorContext(),
            performance: {
                recognitionAttempts: this.recognitionAttempts,
                lastResult: this.lastResult?.timestamp || null
            }
        };
    }
    
    /**
     * Detect platform for voice engine optimizations
     */
    detectPlatform() {
        const userAgent = navigator.userAgent.toLowerCase();
        
        if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
            return 'ios';
        } else if (userAgent.includes('mac')) {
            return 'mac';
        } else if (userAgent.includes('windows')) {
            return 'windows';
        } else if (userAgent.includes('android')) {
            return 'android';
        } else if (userAgent.includes('linux')) {
            return 'linux';
        } else {
            return 'unknown';
        }
    }
    
    /**
     * Load Yu-Gi-Oh card name optimizations
     */
    async loadCardNameOptimizations() {
        try {
            this.logger.info('Loading Yu-Gi-Oh card name optimizations...');
            
            // Common Yu-Gi-Oh card terms for better recognition
            this.commonCardTerms = [
                // Archetypes
                'blue-eyes', 'dark magician', 'red-eyes', 'elemental hero',
                'cyber dragon', 'blackwing', 'lightsworn', 'synchro',
                'xyz', 'pendulum', 'link', 'fusion',
                
                // Card types
                'monster', 'spell', 'trap', 'magic',
                'ritual', 'effect', 'normal', 'tuner',
                
                // Attributes
                'light', 'dark', 'fire', 'water', 'earth', 'wind',
                
                // Common terms
                'dragon', 'warrior', 'magician', 'beast', 'machine',
                'spellcaster', 'fiend', 'zombie', 'plant', 'insect',
                'rock', 'pyro', 'thunder', 'aqua', 'psychic', 'divine'
            ];
            
            // Card name pattern optimizations for voice recognition
            this.cardNamePatterns.set('blue-eyes-variants', [
                'blue eyes white dragon',
                'blue eyes alternative white dragon',
                'blue eyes chaos dragon',
                'blue eyes twin burst dragon'
            ]);
            
            this.cardNamePatterns.set('dark-magician-variants', [
                'dark magician',
                'dark magician girl',
                'dark magician of chaos',
                'magician of black chaos'
            ]);
            
            this.cardNamePatterns.set('red-eyes-variants', [
                'red eyes black dragon',
                'red eyes darkness metal dragon',
                'red eyes flare metal dragon'
            ]);
            
            // Phonetic replacements for common mispronunciations
            this.phoneticReplacements = new Map([
                ['yu-gi-oh', ['yugioh', 'ygo', 'yu gi oh']],
                ['synchro', ['syncro', 'synkro']],
                ['elemental', ['element', 'elemental']],
                ['magician', ['mage', 'magic user', 'majician']],
                ['dragon', ['dragun', 'drago']],
                ['warrior', ['war', 'warior']],
                ['spellcaster', ['spell caster', 'caster']],
                ['machine', ['machin', 'macheen']],
                ['thunder', ['under', 'funder']],
                ['fiend', ['fend', 'feend']],
                ['zombie', ['zombi', 'zombe']],
                ['psychic', ['psykic', 'saikic']]
            ]);
            
            this.logger.info(`Loaded ${this.commonCardTerms.length} common card terms and ${this.cardNamePatterns.size} pattern groups`);
            return true;
            
        } catch (error) {
            this.logger.error('Failed to load card name optimizations:', error);
            // Don't throw - this is optional functionality
            return false;
        }
    }

    /**
     * Apply platform-specific optimizations
     */
    applyPlatformOptimizations() {
        try {
            this.logger.info(`Applying optimizations for platform: ${this.platform}`);
            
            switch (this.platform) {
                case 'ios':
                    // iOS-specific optimizations
                    this.config.continuous = false; // Better for Safari
                    this.config.interimResults = false;
                    this.config.timeout = 8000; // Longer timeout for iOS
                    break;
                    
                case 'mac':
                    // macOS Safari optimizations
                    this.config.continuous = false;
                    this.config.maxAlternatives = 5;
                    break;
                    
                case 'android':
                    // Android Chrome optimizations
                    this.config.continuous = true;
                    this.config.interimResults = true;
                    break;
                    
                case 'windows':
                    // Windows optimizations
                    this.config.continuous = true;
                    this.config.maxAlternatives = 3;
                    break;
                    
                default:
                    this.logger.debug('Using default optimization settings');
            }
            
            this.logger.info('Platform optimizations applied:', {
                platform: this.platform,
                continuous: this.config.continuous,
                interimResults: this.config.interimResults,
                timeout: this.config.timeout
            });
            
        } catch (error) {
            this.logger.error('Failed to apply platform optimizations:', error);
        }
    }

    /**
     * Optimize card name recognition using Yu-Gi-Oh specific patterns
     */
    optimizeCardNameRecognition(result) {
        try {
            if (!result || !result.transcript) {
                return result;
            }
            
            let optimizedTranscript = result.transcript.toLowerCase().trim();
            
            // Apply phonetic replacements
            if (this.phoneticReplacements) {
                for (const [correct, alternatives] of this.phoneticReplacements) {
                    for (const alt of alternatives) {
                        if (optimizedTranscript.includes(alt)) {
                            optimizedTranscript = optimizedTranscript.replace(alt, correct);
                            this.logger.debug(`Applied phonetic correction: ${alt} -> ${correct}`);
                        }
                    }
                }
            }
            
            // Apply card name pattern matching
            if (this.cardNamePatterns) {
                for (const [category, patterns] of this.cardNamePatterns) {
                    for (const pattern of patterns) {
                        const similarity = this.calculateSimilarity(optimizedTranscript, pattern);
                        if (similarity > 0.7) {
                            optimizedTranscript = pattern;
                            this.logger.debug(`Applied pattern match: ${result.transcript} -> ${pattern} (${category})`);
                            break;
                        }
                    }
                }
            }
            
            return {
                ...result,
                transcript: optimizedTranscript,
                originalTranscript: result.transcript
            };
            
        } catch (error) {
            this.logger.error('Error optimizing card name recognition:', error);
            return result;
        }
    }

    /**
     * Calculate similarity between two strings (simple implementation)
     */
    calculateSimilarity(str1, str2) {
        if (!str1 || !str2) return 0;
        
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }

    /**
     * Calculate Levenshtein distance between two strings
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    /**
     * Restore listeners after test
     */
    restoreListeners(originalListeners) {
        this.listeners.result = originalListeners.result;
        this.listeners.error = originalListeners.error;
    }

    /**
     * Get permission guidance text
     */
    getPermissionGuidance() {
        return this.permissionManager ? this.permissionManager.getPermissionInstructions() : 'Please enable microphone permissions in your browser settings.';
    }

    /**
     * Get error context for debugging
     */
    getErrorContext() {
        return {
            platform: this.platform,
            isInitialized: this.isInitialized,
            isListening: this.isListening,
            currentEngine: this.currentEngine,
            engineCount: this.engines.size,
            configLanguage: this.config.language,
            lastResult: this.lastResult?.timestamp || null
        };
    }

    /**
     * Check if we should attempt error recovery
     */
    shouldAttemptRecovery() {
        return (
            this.config.autoRecoveryEnabled &&
            this.errorState.consecutiveErrors < this.config.maxConsecutiveErrors &&
            (!this.errorState.lastRecoveryAttempt || 
             (Date.now() - this.errorState.lastRecoveryAttempt) > this.config.errorCooldownPeriod)
        );
    }

    /**
     * Attempt enhanced error recovery
     */
    async attemptEnhancedRecovery(errorInfo) {
        try {
            this.errorState.recoveryInProgress = true;
            this.errorState.lastRecoveryAttempt = Date.now();
            
            this.logger.info(`Attempting recovery for ${errorInfo.type} error...`);
            
            switch (errorInfo.recoveryStrategy) {
                case 'immediate-retry':
                    await this.retryWithDelay(1000);
                    break;
                    
                case 'gentle-retry':
                    await this.retryWithDelay(2000);
                    break;
                    
                case 'device-check':
                    // Attempt to reinitialize audio
                    await this.reinitializeAudio();
                    break;
                    
                case 'full-restart':
                    await this.reinitialize();
                    break;
                    
                default:
                    this.logger.warn(`Unknown recovery strategy: ${errorInfo.recoveryStrategy}`);
            }
            
            this.errorState.recoveryInProgress = false;
            
        } catch (recoveryError) {
            this.logger.error('Error recovery failed:', recoveryError);
            this.errorState.recoveryInProgress = false;
        }
    }

    /**
     * Retry with exponential backoff delay
     */
    async retryWithDelay(baseDelay) {
        const delay = Math.min(
            baseDelay * Math.pow(this.config.retryMultiplier, this.recognitionAttempts),
            this.config.maxRetryDelay
        );
        
        this.logger.info(`Retrying in ${delay}ms...`);
        
        return new Promise(resolve => {
            setTimeout(async () => {
                try {
                    await this.startListening();
                    resolve();
                } catch (error) {
                    this.logger.error('Retry failed:', error);
                    resolve();
                }
            }, delay);
        });
    }

    /**
     * Reinitialize audio devices
     */
    async reinitializeAudio() {
        this.logger.info('Reinitializing audio devices...');
        
        try {
            // Request fresh microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            
            // Reinitialize engines
            await this.initializeEngines();
            this.selectBestEngine();
            
            this.logger.info('Audio reinitialization completed');
            
        } catch (error) {
            this.logger.error('Audio reinitialization failed:', error);
            throw error;
        }
    }

    /**
     * Stop voice engine
     */
    async stop() {
        this.logger.info('Stopping voice engine...');
        
        this.stopListening();
        this.isInitialized = false;
        
        // Clear performance monitoring
        if (this.performanceInterval) {
            clearInterval(this.performanceInterval);
            this.performanceInterval = null;
        }
        
        this.emitStatusChange('stopped');
    }

    /**
     * Enhanced event emitters
     */
    
    /**
     * Start performance monitoring - called by tests
     */
    startPerformanceMonitoring() {
        if (!this.performanceMetrics) {
            this.initializePerformanceMonitoring();
        }
        return this.performanceMetrics;
    }
}