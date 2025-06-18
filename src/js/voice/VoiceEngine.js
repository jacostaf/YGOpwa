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
        
        // Configuration
        this.config = {
            language: 'en-US',
            continuous: false, // Better for macOS/iOS
            interimResults: false,
            maxAlternatives: 3,
            timeout: 10000,
            retryAttempts: 3,
            retryDelay: 1000,
            // Yu-Gi-Oh specific settings
            cardNameOptimization: true,
            confidenceThreshold: 0.7
        };
        
        // Event listeners
        this.listeners = {
            result: [],
            error: [],
            statusChange: [],
            permissionChange: []
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
    async initialize() {
        if (this.isInitialized) {
            return true;
        }

        try {
            this.logger.info('Initializing voice engine...');
            
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
        this.logger.error(`Recognition error from ${engineType}:`, event.error);
        
        let errorType = 'unknown-error';
        let message = 'Voice recognition error';
        let isRetryable = true;
        
        switch (event.error) {
            case 'not-allowed':
                errorType = 'permission-denied';
                message = 'Microphone access denied. Please enable microphone permissions.';
                isRetryable = false;
                break;
            case 'no-speech':
                errorType = 'no-speech';
                message = 'No speech detected. Please try speaking louder and clearer.';
                isRetryable = true;
                break;
            case 'audio-capture':
                errorType = 'audio-capture-error';
                message = 'Microphone not available. Please check your audio settings.';
                isRetryable = false;
                break;
            case 'network':
                errorType = 'network-error';
                message = 'Network error. Please check your internet connection.';
                isRetryable = true;
                break;
            case 'service-not-allowed':
                errorType = 'service-blocked';
                message = 'Speech service blocked. Please check browser settings.';
                isRetryable = false;
                break;
            case 'aborted':
                errorType = 'aborted';
                message = 'Voice recognition was stopped.';
                isRetryable = true;
                break;
            default:
                errorType = 'unknown-error';
                message = `Voice recognition error: ${event.error}`;
                isRetryable = true;
        }
        
        this.isListening = false;
        
        // Attempt recovery for retryable errors
        if (isRetryable && !this.isRecovering) {
            this.attemptRecovery();
        } else {
            this.emitStatusChange('error');
        }
        
        this.emitError({
            type: errorType,
            message,
            isRetryable,
            engine: engineType,
            originalError: event.error
        });
    }

    /**
     * Attempt error recovery
     */
    async attemptRecovery() {
        if (this.recognitionAttempts >= this.config.retryAttempts) {
            this.logger.error('Max retry attempts reached');
            this.isRecovering = false;
            this.emitStatusChange('error');
            return;
        }
        
        this.isRecovering = true;
        this.recognitionAttempts++;
        
        this.logger.info(`Attempting recovery (attempt ${this.recognitionAttempts}/${this.config.retryAttempts})`);
        this.emitStatusChange('recovering');
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        
        try {
            await this.startListening();
            this.isRecovering = false;
        } catch (error) {
            this.logger.error('Recovery attempt failed:', error);
            this.attemptRecovery(); // Try again
        }
    }

    /**
     * Load Yu-Gi-Oh card name optimizations
     */
    async loadCardNameOptimizations() {
        if (!this.config.cardNameOptimization) {
            return;
        }
        
        this.logger.info('Loading Yu-Gi-Oh card name optimizations...');
        
        // Common Yu-Gi-Oh terms and their phonetic variations
        this.commonCardTerms = [
            // Card types
            { pattern: /dragun/gi, replacement: 'Dragon' },
            { pattern: /majician/gi, replacement: 'Magician' },
            { pattern: /warriar/gi, replacement: 'Warrior' },
            { pattern: /elemental/gi, replacement: 'Elemental' },
            
            // Common card names
            { pattern: /blue.*i.*white.*dragun/gi, replacement: 'Blue-Eyes White Dragon' },
            { pattern: /dark.*majician/gi, replacement: 'Dark Magician' },
            { pattern: /red.*i.*black.*dragun/gi, replacement: 'Red-Eyes Black Dragon' },
            { pattern: /time.*wiserd/gi, replacement: 'Time Wizard' },
            
            // Common misrecognitions
            { pattern: /pott?.*of.*greed/gi, replacement: 'Pot of Greed' },
            { pattern: /mirror.*four.*ce/gi, replacement: 'Mirror Force' },
            { pattern: /ryu.*gin.*jin/gi, replacement: 'Raigeki' },
        ];
        
        this.logger.info(`Loaded ${this.commonCardTerms.length} card name optimizations`);
    }

    /**
     * Optimize card name recognition
     */
    optimizeCardNameRecognition(result) {
        if (!this.config.cardNameOptimization) {
            return result;
        }
        
        let optimizedTranscript = result.transcript;
        
        // Apply pattern replacements
        for (const term of this.commonCardTerms) {
            optimizedTranscript = optimizedTranscript.replace(term.pattern, term.replacement);
        }
        
        // Clean up common issues
        optimizedTranscript = optimizedTranscript
            .replace(/\s+/g, ' ') // Multiple spaces
            .replace(/[^\w\s-]/g, '') // Special characters except hyphens
            .trim();
        
        return {
            transcript: optimizedTranscript,
            confidence: result.confidence,
            originalTranscript: result.transcript
        };
    }

    /**
     * Apply platform-specific optimizations
     */
    applyPlatformOptimizations() {
        this.logger.info(`Applying optimizations for platform: ${this.platform}`);
        
        switch (this.platform) {
            case 'ios':
            case 'mac':
                // macOS/iOS optimizations
                this.config.continuous = false; // Better compatibility
                this.config.timeout = 15000; // Longer timeout
                break;
                
            case 'windows':
                // Windows optimizations
                this.config.maxAlternatives = 5; // More alternatives
                break;
                
            case 'android':
                // Android optimizations
                this.config.interimResults = true; // Better feedback
                break;
        }
    }

    /**
     * Detect platform
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
     * Check if voice recognition is available
     */
    isAvailable() {
        return this.isInitialized && this.engines.size > 0;
    }

    /**
     * Get current status
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isListening: this.isListening,
            isPaused: this.isPaused,
            currentEngine: this.currentEngine,
            platform: this.platform,
            availableEngines: Array.from(this.engines.keys()),
            lastResult: this.lastResult
        };
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.logger.info('Configuration updated:', this.config);
        
        // Apply new config to current engine if available
        if (this.currentEngine && this.engines.has(this.currentEngine)) {
            const engine = this.engines.get(this.currentEngine);
            if (engine.instance) {
                engine.instance.lang = this.config.language;
                engine.instance.continuous = this.config.continuous;
                engine.instance.interimResults = this.config.interimResults;
                engine.instance.maxAlternatives = this.config.maxAlternatives;
            }
        }
    }

    // Event handling methods
    onResult(callback) {
        this.listeners.result.push(callback);
    }

    onError(callback) {
        this.listeners.error.push(callback);
    }

    onStatusChange(callback) {
        this.listeners.statusChange.push(callback);
    }

    onPermissionChange(callback) {
        this.listeners.permissionChange.push(callback);
    }

    emitResult(result) {
        this.listeners.result.forEach(callback => {
            try {
                callback(result);
            } catch (error) {
                this.logger.error('Error in result callback:', error);
            }
        });
    }

    emitError(error) {
        this.listeners.error.forEach(callback => {
            try {
                callback(error);
            } catch (err) {
                this.logger.error('Error in error callback:', err);
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

    emitPermissionChange(permission) {
        this.listeners.permissionChange.forEach(callback => {
            try {
                callback(permission);
            } catch (error) {
                this.logger.error('Error in permission change callback:', error);
            }
        });
    }

    restoreListeners(originalListeners) {
        this.listeners.result = originalListeners.result;
        this.listeners.error = originalListeners.error;
    }
}