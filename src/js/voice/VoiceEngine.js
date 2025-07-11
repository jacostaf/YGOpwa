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
import { PhoneticMatcher } from './PhoneticMatcher.js';

export class VoiceEngine {
    constructor(permissionManager, logger = null, phoneticMatcher = null, voiceTrainer = null) {
        this.permissionManager = permissionManager;
        this.logger = logger || new Logger('VoiceEngine');
        this.phoneticMatcher = phoneticMatcher || new PhoneticMatcher(this.logger);
        this.voiceTrainer = voiceTrainer;
        
        // Recognition engines
        this.engines = new Map();
        this.currentEngine = null;
        this.fallbackEngines = [];
        
        // State management
        this.isInitialized = false;
        this.isListening = false;
        this.isPaused = false;
        this.shouldKeepListening = false;
        this.recognitionAttempts = 0;
        this.isRecovering = false;
        
        // Configuration - English is primary, Japanese is fallback only
        this.config = {
            primaryLanguage: 'en-US',
            fallbackLanguage: 'ja-JP',
            useFallbackLanguage: false, // Disable Japanese by default
            continuous: true,
            interimResults: true,
            maxAlternatives: 5,
            timeout: 15000,
            retryAttempts: 5,
            retryDelay: 500,
            cardNameOptimization: true,
            confidenceThreshold: 0.5,
            trainingConfidenceThreshold: 0.01
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
        
        // Platform detection
        this.platform = this.detectPlatform();
        
        // Training and phonetic matching integration
        this.trainedMappings = new Map();
        this.isTrainingMode = false;
        
        this.logger.info('VoiceEngine initialized for platform:', this.platform);
    }

    // Set voice trainer instance
    setVoiceTrainer(voiceTrainer) {
        this.voiceTrainer = voiceTrainer;
    }

    // Enable/disable training mode
    setTrainingMode(enabled, useFallbackLanguage = false) {
        this.isTrainingMode = enabled;
        this.config.useFallbackLanguage = useFallbackLanguage;
        this.logger.info(`Training mode ${enabled ? 'enabled' : 'disabled'} with fallback language ${useFallbackLanguage ? 'enabled' : 'disabled'}`);
    }

    // Update configuration
    updateConfig(settings = {}) {
        this.config = { ...this.config, ...settings };
        this.logger.info('Configuration updated:', this.config);
    }

    // Initialize the voice engine
    async initialize() {
        if (this.isInitialized) {
            this.logger.debug('Voice engine already initialized');
            return true;
        }

        try {
            this.logger.info('Initializing voice engine...');
            
            // Check if environment is supported
            if (!this.isEnvironmentSupported()) {
                throw new Error('Voice recognition is not supported in this environment');
            }
            
            // Request microphone permissions
            const hasPermission = await this.requestMicrophonePermission();
            if (!hasPermission) {
                throw new Error('Microphone permission denied');
            }
            
            // Initialize recognition engines
            await this.initializeEngines();
            
            this.isInitialized = true;
            this.logger.info('Voice engine initialized successfully');
            return true;
            
        } catch (error) {
            this.logger.error('Failed to initialize voice engine:', error);
            this.isInitialized = false;
            throw error;
        }
    }

    // Check if environment supports voice recognition
    isEnvironmentSupported() {
        const isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
        this.logger.debug(`Speech recognition supported: ${isSupported}`);
        return isSupported;
    }

    // Request microphone permissions
    async requestMicrophonePermission() {
        try {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                // Stop all tracks to release the microphone
                stream.getTracks().forEach(track => track.stop());
                this.logger.info('Microphone permission granted');
                return true;
            }
            return true; // If we can't check permissions, assume they're granted
        } catch (error) {
            this.logger.error('Microphone permission denied:', error);
            return false;
        }
    }

    // Initialize recognition engines
    async initializeEngines() {
        this.logger.info('Initializing recognition engines...');
        
        try {
            // Primary engine: Web Speech API
            await this.initializeWebSpeechEngine();
            
            // Future: Add fallback engines here
            // - Cloud-based recognition services
            // - Local recognition libraries
            
            this.logger.info(`Initialized ${this.engines.size} recognition engine(s)`);
            
        } catch (error) {
            this.logger.error('Error initializing recognition engines:', error);
            throw error;
        }
    }

    // Initialize Web Speech API engine
    async initializeWebSpeechEngine() {
        try {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            
            if (!SpeechRecognition) {
                this.logger.warn('Web Speech API not available in this browser');
                return false;
            }
            
            const recognition = new SpeechRecognition();
            
            // Configure recognition
            recognition.continuous = this.config.continuous;
            recognition.interimResults = this.config.interimResults;
            recognition.lang = this.config.language;
            recognition.maxAlternatives = this.config.maxAlternatives;
            
            // Store engine with platform info
            const engineInfo = {
                name: 'Web Speech API',
                instance: recognition,
                priority: 10,
                available: true,
                platform: ['all'],
                languages: [this.config.language, this.config.japaneseLanguage],
                
                // Event handlers
                onstart: () => {
                    this.logger.debug('Web Speech recognition started');
                    this.isListening = true;
                    this.emitStatusChange('listening');
                },
                
                onend: () => {
                    this.logger.debug('Web Speech recognition ended');
                    this.isListening = false;
                    
                    // Auto-restart if user wants continuous listening and not manually stopped
                    if (this.shouldKeepListening && !this.isPaused && this.isInitialized) {
                        setTimeout(() => {
                            if (this.shouldKeepListening && !this.isPaused) {
                                this.startListening().catch(error => {
                                    this.logger.warn('Failed to restart recognition:', error);
                                });
                            }
                        }, 100);
                    } else {
                        this.emitStatusChange('ready');
                    }
                },
                
                onresult: (event) => {
                    this.handleRecognitionResult(event, 'webspeech');
                },
                
                onerror: (event) => {
                    this.handleRecognitionError(event, 'webspeech');
                }
            };
            
            // Set up event handlers
            Object.entries(engineInfo).forEach(([event, handler]) => {
                if (event.startsWith('on') && typeof handler === 'function') {
                    recognition[event] = handler.bind(this);
                }
            });
            
            this.engines.set('webspeech', engineInfo);
            this.logger.info('Web Speech API engine initialized successfully');
            
            // Set as current engine if none selected
            if (!this.currentEngine) {
                this.currentEngine = 'webspeech';
            }
            
            return true;
            
        } catch (error) {
            this.logger.error('Failed to initialize Web Speech API engine:', error);
            return false;
        }
    }

    // Select the best available engine
    selectBestEngine() {
        this.logger.debug('Selecting best available engine...');
        
        if (this.engines.size === 0) {
            const errorMsg = 'No recognition engines available. Please check if Web Speech API is supported in your browser.';
            this.logger.error(errorMsg);
            throw new Error(errorMsg);
        }
        
        let bestEngine = null;
        let highestPriority = -1;
        
        // Find the best available engine
        for (const [key, engine] of this.engines) {
            if (engine.available) {
                const isPlatformCompatible = engine.platform.includes('all') || 
                                          engine.platform.includes(this.platform);
                
                this.logger.debug(`Checking engine ${key} (${engine.name}):`, {
                    priority: engine.priority,
                    platform: engine.platform,
                    currentPlatform: this.platform,
                    isPlatformCompatible,
                    currentHighest: highestPriority
                });
                
                if (isPlatformCompatible && engine.priority > highestPriority) {
                    bestEngine = key;
                    highestPriority = engine.priority;
                }
            }
        }
        
        if (bestEngine) {
            const selectedEngine = this.engines.get(bestEngine);
            this.currentEngine = bestEngine;
            this.logger.info(`Selected engine: ${selectedEngine.name} (${bestEngine})`, {
                priority: selectedEngine.priority,
                languages: selectedEngine.languages || []
            });
            
            return bestEngine;
        }
        
        const errorMsg = `No suitable recognition engine found for platform: ${this.platform}. ` +
                       `Available engines: ${Array.from(this.engines.keys()).join(', ')}`;
        this.logger.error(errorMsg);
        throw new Error(errorMsg);
    }

    // Start listening for voice input
    async startListening() {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (this.isListening) {
            this.logger.warn('Voice recognition is already active');
            return;
        }

        try {
            this.logger.info('Starting voice recognition...');
            
            // Select the best available engine
            const selectedEngineId = this.selectBestEngine();
            if (!selectedEngineId) {
                throw new Error('No suitable recognition engine available');
            }
            
            // Get the current engine
            const engine = this.engines.get(selectedEngineId);
            if (!engine || !engine.instance) {
                throw new Error('No valid recognition engine instance available');
            }
            
            this.logger.debug(`Using engine: ${engine.name} (${selectedEngineId})`);
            this.recognitionAttempts = 0;
            this.shouldKeepListening = true;
            this.isPaused = false;
            
            // Always start with primary language (English)
            engine.instance.lang = this.config.primaryLanguage;
            this.logger.info(`Using primary language: ${this.config.primaryLanguage}`);
            
            // Only try fallback language if explicitly enabled in training mode
            if (this.isTrainingMode && this.config.useFallbackLanguage) {
                this.logger.info('Training mode: Fallback language is enabled but will only be used if primary language fails');
            }
            
            await this.startEngineWithTimeout(engine.instance);
            
        } catch (error) {
            this.logger.error('Failed to start voice recognition:', error);
            this.emitError({
                type: 'start-failed',
                message: error.message,
                error
            });
            
            // Try recovery if we haven't exceeded max attempts
            if (this.recognitionAttempts < this.config.retryAttempts) {
                this.recognitionAttempts++;
                this.logger.info(`Attempting recovery (attempt ${this.recognitionAttempts}/${this.config.retryAttempts})`);
                await this.attemptRecovery();
            } else {
                this.logger.error('Max recovery attempts reached');
                throw error;
            }
        }
    }

    // Start engine with timeout protection
    async startEngineWithTimeout(recognition) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.logger.error('Voice recognition start timeout');
                reject(new Error('Voice recognition start timeout'));
            }, this.config.timeout);
            
            // Set up handlers
            const onStart = () => {
                clearTimeout(timeout);
                this.isListening = true;
                this.emitStatusChange('listening');
                resolve();
            };
            
            const onError = (event) => {
                clearTimeout(timeout);
                this.handleRecognitionError(event, 'webspeech');
                reject(event.error || new Error('Unknown recognition error'));
            };
            
            // Add temporary handlers
            recognition.onstart = onStart;
            recognition.onerror = onError;
            
            try {
                recognition.start();
            } catch (error) {
                clearTimeout(timeout);
                this.logger.error('Error starting recognition:', error);
                reject(error);
            }
        });
    }

    // Stop listening for voice input
    stopListening() {
        if (!this.isListening) {
            this.logger.warn('Voice recognition is not active');
            return;
        }
        
        try {
            this.logger.info('Stopping voice recognition...');
            this.shouldKeepListening = false;
            
            const engine = this.engines.get(this.currentEngine);
            if (engine && engine.instance) {
                engine.instance.stop();
            }
            
            this.isListening = false;
            this.emitStatusChange('stopped');
            this.logger.info('Voice recognition stopped');
            
        } catch (error) {
            this.logger.error('Error stopping voice recognition:', error);
            throw error;
        }
    }

    // Handle recognition result
    handleRecognitionResult(event, engineType) {
        if (!event || !event.results) {
            this.logger.warn('Invalid recognition result:', event);
            return;
        }
        
        const results = event.results;
        const result = results[results.length - 1]; // Get the latest result
        
        if (!result || !result.isFinal) {
            return; // Skip interim results
        }
        
        // Process alternatives
        const alternatives = Array.from(result).map(alt => ({
            transcript: alt.transcript.trim(),
            confidence: alt.confidence || 0,
            isFinal: result.isFinal,
            language: this.config.primaryLanguage // Always use primary language for display
        }));
        
        // Sort by confidence (highest first)
        alternatives.sort((a, b) => b.confidence - a.confidence);
        
        // Get best result
        const bestMatch = alternatives[0];
        
        // Log results for debugging
        this.logger.debug('Recognition results:', {
            alternatives,
            engine: engineType,
            isFinal: result.isFinal,
            language: this.config.primaryLanguage
        });
        
        // Emit the result - always use primary language for display
        this.lastResult = {
            transcript: bestMatch.transcript,
            confidence: bestMatch.confidence,
            alternatives: alternatives.slice(1), // Exclude the best match
            engine: engineType,
            timestamp: new Date().toISOString(),
            isFinal: result.isFinal,
            language: this.config.primaryLanguage // Ensure we're using English for display
        };
        
        this.emitResult(this.lastResult);
    }

    // Handle recognition error
    handleRecognitionError(event, engineType) {
        this.logger.error(`Recognition error from ${engineType}:`, event);
        
        let errorType = 'unknown-error';
        let message = 'Voice recognition error';
        
        if (event.error) {
            switch (event.error) {
                case 'no-speech':
                    errorType = 'no-speech';
                    message = 'No speech was detected';
                    break;
                case 'audio-capture':
                    errorType = 'audio-capture';
                    message = 'No microphone was found';
                    break;
                case 'not-allowed':
                    errorType = 'not-allowed';
                    message = 'Microphone access was denied';
                    break;
                case 'service-not-allowed':
                    errorType = 'service-not-allowed';
                    message = 'Speech recognition service is not allowed';
                    break;
                case 'network':
                    errorType = 'network';
                    message = 'Network error occurred';
                    break;
                case 'language-not-supported':
                    errorType = 'language-not-supported';
                    message = 'Language not supported';
                    break;
                default:
                    errorType = 'recognition-error';
                    message = `Recognition error: ${event.error}`;
            }
        }
        
        this.emitError({
            type: errorType,
            message,
            error: event,
            engine: engineType
        });
    }

    // Attempt error recovery
    async attemptRecovery() {
        if (this.recognitionAttempts >= this.config.retryAttempts) {
            this.logger.warn('Max recovery attempts reached');
            return false;
        }
        
        this.recognitionAttempts++;
        const delay = this.config.retryDelay * Math.pow(2, this.recognitionAttempts - 1);
        
        this.logger.info(`Attempting recovery in ${delay}ms (attempt ${this.recognitionAttempts}/${this.config.retryAttempts})`);
        
        return new Promise(resolve => {
            setTimeout(async () => {
                try {
                    await this.startListening();
                    resolve(true);
                } catch (error) {
                    this.logger.error(`Recovery attempt ${this.recognitionAttempts} failed:`, error);
                    resolve(false);
                }
            }, delay);
        });
    }

    // Detect platform
    detectPlatform() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        
        if (/windows phone/i.test(userAgent)) return 'windows-phone';
        if (/android/i.test(userAgent)) return 'android';
        if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) return 'ios';
        if (/Mac/i.test(navigator.platform)) return 'mac';
        if (/Win/i.test(navigator.platform)) return 'windows';
        if (/Linux/i.test(navigator.platform)) return 'linux';
        
        return 'unknown';
    }

    /**
     * Check if voice recognition is available in the current environment
     * @returns {boolean} True if voice recognition is available, false otherwise
     */
    isAvailable() {
        try {
            // Check if Web Speech API is available
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                this.logger.warn('Web Speech API not supported in this browser');
                return false;
            }
            
            // Check if we have any available engines
            if (this.engines.size === 0) {
                this.logger.warn('No recognition engines available');
                return false;
            }
            
            // Check if the current engine is available
            if (this.currentEngine) {
                const engine = this.engines.get(this.currentEngine);
                if (engine && engine.available) {
                    return true;
                }
            }
            
            // If no current engine, check if any engine is available
            for (const [_, engine] of this.engines) {
                if (engine.available) {
                    return true;
                }
            }
            
            this.logger.warn('No available recognition engines found');
            return false;
            
        } catch (error) {
            this.logger.error('Error checking voice recognition availability:', error);
            return false;
        }
    }
    
    // Event handling
    onResult(callback) {
        if (typeof callback === 'function') {
            this.listeners.result.push(callback);
        }
        return this;
    }
    
    onError(callback) {
        if (typeof callback === 'function') {
            this.listeners.error.push(callback);
        }
        return this;
    }
    
    onStatusChange(callback) {
        if (typeof callback === 'function') {
            this.listeners.statusChange.push(callback);
        }
        return this;
    }
    
    onPermissionChange(callback) {
        if (typeof callback === 'function') {
            this.listeners.permissionChange.push(callback);
        }
        return this;
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
}
