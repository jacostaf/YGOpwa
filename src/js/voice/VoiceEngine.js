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
import { PhoneticMapper } from './PhoneticMapper.js';
import { AdaptiveConfidenceManager } from './AdaptiveConfidenceManager.js';
import { ProgressiveLearningEngine } from './ProgressiveLearningEngine.js';

export class VoiceEngine {
    constructor(permissionManager, logger = null, storage = null) {
        this.permissionManager = permissionManager;
        this.logger = logger || new Logger('VoiceEngine');
        this.storage = storage;
        
        // Recognition engines
        this.engines = new Map();
        this.currentEngine = null;
        this.fallbackEngines = [];
        
        // State management
        this.isInitialized = false;
        this.isListening = false;
        this.isPaused = false;
        this.shouldKeepListening = false; // Track if user wants continuous listening
        
        // Enhanced fantasy name processing components
        this.phoneticMapper = new PhoneticMapper(this.logger);
        this.confidenceManager = new AdaptiveConfidenceManager(this.storage, this.logger);
        this.learningEngine = new ProgressiveLearningEngine(this.storage, this.logger);
        
        // Configuration
        this.config = {
            language: 'en-US',
            continuous: false, // Better for macOS/iOS
            interimResults: true, // Enable interim results for live display
            maxAlternatives: 10, // Increased for better fantasy name alternatives
            timeout: 10000,
            retryAttempts: 3,
            retryDelay: 1000,
            maxRetries: 3,
            // Yu-Gi-Oh specific settings
            cardNameOptimization: true,
            confidenceThreshold: 0.4, // Lowered for fantasy names
            // Enhanced settings
            adaptiveThreshold: true,
            progressiveLearning: true,
            phoneticEnhancement: true,
            multiLanguageSupport: true
        };
        
        // Event listeners
        this.listeners = {
            result: [],
            error: [],
            statusChange: [],
            permissionChange: [],
            interimResult: []
        };
        
        // Recognition state
        this.lastResult = null;
        this.recognitionAttempts = 0;
        this.isRecovering = false;
        this.retryCount = 0;
        
        // Platform detection
        this.platform = this.detectPlatform();
        
        // Yu-Gi-Oh specific optimizations (legacy support)
        this.cardNamePatterns = new Map();
        this.commonCardTerms = [];
        
        // Context for enhanced processing
        this.currentContext = {
            currentSet: null,
            sessionLength: 0,
            userPreferences: {}
        };
        
        this.logger.info('Enhanced VoiceEngine initialized for platform:', this.platform);
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
        this.stopListening();
        await this.initialize();
    }
    
    async initialize() {
        if (this.isInitialized) {
            return true;
        }

        try {
            this.logger.info('Initializing voice engine...');
            this.logger.debug('Voice engine config:', this.config);
            
            // Reset retry count
            this.retryCount = 0;
            
            // Check environment compatibility
            if (!this.isEnvironmentSupported()) {
                throw new Error('Voice recognition is not supported in this environment');
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
            
            // Load Yu-Gi-Oh optimizations (legacy)
            await this.loadCardNameOptimizations();
            
            // Initialize enhanced components
            await this.initializeEnhancedComponents();
            
            // Apply platform-specific optimizations
            this.applyPlatformOptimizations();
            
            // Set up error recovery
            this.setupErrorRecovery();
            
            this.isInitialized = true;
            this.emitStatusChange('ready');
            
            this.logger.info('Voice engine initialized successfully');
            return true;
            
        } catch (error) {
            this.logger.error('Failed to initialize voice engine:', error);
            this.isInitialized = false;
            
            // Return user-friendly error object instead of throwing
            return this.handleError(error, 'initialization');
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
                    // Give more time for result processing and training UI to appear
                    setTimeout(() => {
                        if (this.shouldKeepListening && !this.isPaused) {
                            this.startListening().catch((error) => {
                                this.logger.warn('Failed to restart recognition:', error);
                            });
                        }
                    }, 2000); // Increased from 100ms to 2000ms
                } else {
                    this.emitStatusChange('ready');
                }
            };
            
            recognition.onresult = (event) => {
                console.log('🎯 RAW VOICE RESULT DETECTED:', event);
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
            const error = new Error('Voice engine not initialized');
            return this.handleError(error, 'start listening');
        }
        
        if (this.isListening) {
            this.logger.warn('Already listening');
            return true;
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
            
            return true;
            
        } catch (error) {
            this.logger.error('Failed to start voice recognition:', error);
            this.emitError({
                type: 'start-failed',
                message: error.message,
                error
            });
            return this.handleError(error, 'start listening');
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
            
            // Store reject function for error simulation in tests
            this.currentTestReject = reject;
            
            // Set up test listeners
            const testResultHandler = (result) => {
                this.logger.info('Voice test completed:', result);
                this.restoreListeners(originalListeners);
                this.currentTestReject = null;
                resolve(result.transcript);
            };
            
            const testErrorHandler = (error) => {
                this.logger.error('Voice test failed:', error);
                this.restoreListeners(originalListeners);
                this.currentTestReject = null;
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
                    this.currentTestReject = null;
                    reject(new Error('Voice test timeout after 10 seconds'));
                }
            }, 10000);
        });
    }

    /**
     * Handle recognition result
     */
    async handleRecognitionResult(event, engineType) {
        console.log('🔍 HANDLE RECOGNITION RESULT CALLED');
        try {
            const results = Array.from(event.results);
            const lastResult = results[results.length - 1];
            
            // Always log what's being heard for debugging
            const transcript = lastResult[0].transcript;
            const confidence = lastResult[0].confidence || 0;
            
            if (!lastResult.isFinal) {
                // Show interim results (what's being heard in real-time)
                this.logger.info(`[LIVE] Hearing: "${transcript}" (interim, ${(confidence * 100).toFixed(1)}%)`);
                this.emitInterimResult(transcript, confidence);
                return;
            } else {
                // Show final results
                console.log('🎯 FINAL RESULT DETECTED:', transcript, 'confidence:', confidence);
                this.logger.info(`[FINAL] Heard: "${transcript}" (final, ${(confidence * 100).toFixed(1)}%)`);
            }
            
            if (!lastResult.isFinal && !this.config.interimResults) {
                return;
            }
            
            const alternatives = Array.from(lastResult).map(alt => ({
                transcript: alt.transcript,
                confidence: alt.confidence || 0
            }));
            
            // Apply enhanced fantasy name processing
            console.log('📝 About to enhance results:', alternatives);
            const enhancedResults = await this.enhanceRecognitionResults(alternatives, engineType);
            console.log('✨ Enhanced results:', enhancedResults);
            
            if (enhancedResults.length === 0) {
                console.log('❌ NO ENHANCED RESULTS - EXITING EARLY');
                this.logger.warn('No valid recognition results after enhancement');
                return;
            }
            
            console.log('✅ CONTINUING WITH ENHANCED RESULTS');
            // Select best enhanced result
            const bestResult = enhancedResults[0];
            
            const result = {
                transcript: bestResult.transcript,
                confidence: bestResult.confidence,
                alternatives: enhancedResults,
                engine: engineType,
                timestamp: new Date().toISOString(),
                isFinal: lastResult.isFinal,
                // Enhanced metadata
                phoneticProcessed: bestResult.phoneticProcessed || false,
                learningApplied: bestResult.learningApplied || false,
                adaptiveThreshold: bestResult.adaptiveThreshold || this.config.confidenceThreshold,
                originalTranscript: bestResult.originalTranscript || bestResult.transcript
            };
            
            this.lastResult = result;
            this.recognitionAttempts = 0; // Reset retry counter on success
            
            this.logger.info('Voice recognition result:', result);
            console.log('🚀 ABOUT TO EMIT RESULT:', result.transcript);
            this.emitResult(result);
            console.log('✅ RESULT EMITTED');
            
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
            // Card types and common mispronunciations
            { pattern: /dragun/gi, replacement: 'Dragon' },
            { pattern: /maj?i[sc]h?i[ea]n/gi, replacement: 'Magician' },
            { pattern: /warri[oa]r/gi, replacement: 'Warrior' },
            { pattern: /element[a-z]*/gi, replacement: 'Elemental' },
            { pattern: /synch?ro/gi, replacement: 'Synchro' },
            { pattern: /ex[cs]ee?z/gi, replacement: 'XYZ' },
            { pattern: /linku?/gi, replacement: 'Link' },
            { pattern: /pendulum/gi, replacement: 'Pendulum' },
            
            // Specific problematic cards
            { pattern: /mulch?army\s*me[ao]wls?/gi, replacement: 'Mulcharmy Meowls' },
            { pattern: /mulch?army\s*p[ue]r[uo]lia/gi, replacement: 'Mulcharmy Purulia' },
            { pattern: /futsu\s*no\s*mitama\s*no\s*mitsurugi/gi, replacement: 'Futsu no Mitama no Mitsurugi' },
            { pattern: /blue\s*[ie]y?e[ds]?\s*white\s*drag[ou]n/gi, replacement: 'Blue-Eyes White Dragon' },
            { pattern: /dark\s*mag?i[sc]h?i[ea]n/gi, replacement: 'Dark Magician' },
            { pattern: /red\s*-?\s*ey?e[ds]?\s*black\s*drag[ou]n/gi, replacement: 'Red-Eyes Black Dragon' },
            { pattern: /time\s*wiz[ae]rd/gi, replacement: 'Time Wizard' },
            { pattern: /pot\s*of\s*greed/gi, replacement: 'Pot of Greed' },
            { pattern: /mirror\s*force/gi, replacement: 'Mirror Force' },
            { pattern: /ryu[ -]?jin/gi, replacement: 'Raigeki' },
            { pattern: /har[ip]e[iy]e?/gi, replacement: 'Harpie' },
            { 
                pattern: /toon\s*([^\s]*)/gi, 
                replacement: (match, p1) => 'Toon ' + p1 
            },
            
            // Japanese card name patterns
            { pattern: /shin?d[ou]\s*in?sh[ou]k[au]n/gi, replacement: 'Shin Do Inshoukan' },
            { pattern: /y[ou]?[ -]?g[ie]?[ -]?[ou]h?[ou]?/gi, replacement: 'Yu-Gi-Oh' },
            { pattern: /m[ae]k[ou]?sh[aei]/gi, replacement: 'Mekk-Knight' },
            { pattern: /salamangreat/gi, replacement: 'Salamangreat' },
            
            // Common prefixes and suffixes
            { pattern: /\b(?:the|a|an)\s+/gi, replacement: '' }, // Remove articles
            { pattern: /(?:monster|card|spell|trap)\b/gi, replacement: '' }, // Remove common generic terms
            { pattern: /\s{2,}/g, replacement: ' ' }, // Clean up extra spaces
            { pattern: /^\s+|\s+$/g, replacement: '' } // Trim spaces
        ];
        
        // Configure recognition settings for better fantasy name recognition
        this.config.confidenceThreshold = 0.5; // Lower threshold for better acceptance
        this.config.maxAlternatives = 5; // Consider more alternatives
        this.config.continuous = true; // Better for multi-word card names
        
        this.logger.info(`Loaded ${this.commonCardTerms.length} card name optimizations`);
    }

    /**
     * Initialize enhanced fantasy name processing components
     */
    async initializeEnhancedComponents() {
        try {
            this.logger.info('Initializing enhanced fantasy name processing components...');
            
            // Load confidence manager history
            await this.confidenceManager.loadUserHistory();
            
            // Load learning engine patterns
            await this.learningEngine.loadPatterns();
            
            this.logger.info('Enhanced components initialized successfully');
        } catch (error) {
            this.logger.warn('Failed to initialize enhanced components:', error);
        }
    }

    /**
     * Enhanced recognition results processing with phonetic mapping, 
     * adaptive confidence, and progressive learning
     */
    async enhanceRecognitionResults(alternatives, engineType) {
        if (!alternatives || alternatives.length === 0) return [];

        try {
            const enhancedResults = [];

            for (const alternative of alternatives) {
                let enhanced = { 
                    ...alternative,
                    originalTranscript: alternative.transcript 
                };

                // Step 1: Apply phonetic normalization if enabled
                if (this.config.phoneticEnhancement) {
                    const normalized = this.phoneticMapper.normalize(alternative.transcript);
                    if (normalized !== alternative.transcript) {
                        enhanced.transcript = normalized;
                        enhanced.phoneticProcessed = true;
                        this.logger.debug(`Phonetic normalization: "${alternative.transcript}" → "${normalized}"`);
                    }
                }

                // Step 2: Apply legacy optimizations for compatibility
                enhanced = this.optimizeCardNameRecognition(enhanced);

                // Step 3: Apply adaptive confidence threshold if enabled
                if (this.config.adaptiveThreshold) {
                    const adaptiveThreshold = this.confidenceManager.getAdaptiveThreshold(
                        enhanced.transcript,
                        this.currentContext
                    );
                    enhanced.adaptiveThreshold = adaptiveThreshold;
                    enhanced.isAboveThreshold = enhanced.confidence >= adaptiveThreshold;
                    
                    this.logger.debug(`Adaptive threshold for "${enhanced.transcript}": ${adaptiveThreshold.toFixed(3)}`);
                } else {
                    enhanced.isAboveThreshold = enhanced.confidence >= this.config.confidenceThreshold;
                }

                enhancedResults.push(enhanced);
            }

            // Step 4: Apply progressive learning if enabled
            let finalResults = enhancedResults;
            if (this.config.progressiveLearning && enhancedResults.length > 0) {
                // Create dummy candidates for learning engine (it expects card name format)
                const candidates = enhancedResults.map(result => ({
                    name: result.transcript,
                    confidence: result.confidence,
                    ...result
                }));

                const learnedCandidates = this.learningEngine.applyPersonalizedRecognition(
                    alternatives[0].transcript, // Original voice input
                    candidates
                );

                // Convert back to result format
                finalResults = learnedCandidates.map(candidate => ({
                    transcript: candidate.name,
                    confidence: candidate.confidence,
                    originalTranscript: candidate.originalTranscript || candidate.name,
                    phoneticProcessed: candidate.phoneticProcessed || false,
                    learningApplied: candidate.learningApplied || false,
                    adaptiveThreshold: candidate.adaptiveThreshold || this.config.confidenceThreshold,
                    isAboveThreshold: candidate.confidence >= (candidate.adaptiveThreshold || this.config.confidenceThreshold),
                    personalizedScore: candidate.personalizedScore || 0
                }));
            }

            // Step 5: Filter by adaptive thresholds and sort by confidence
            console.log('🎯 BEFORE FILTERING:', finalResults.map(r => ({
                transcript: r.transcript,
                confidence: r.confidence,
                adaptiveThreshold: r.adaptiveThreshold,
                isAboveThreshold: r.isAboveThreshold
            })));
            
            // Allow low-confidence results for training - don't filter out everything
            const validResults = finalResults
                .filter(result => result.isAboveThreshold || result.confidence > 0.1) // Keep anything above 10% for training
                .sort((a, b) => b.confidence - a.confidence);
            
            console.log('🎯 AFTER FILTERING:', validResults.length, 'valid results');

            this.logger.debug(`Enhanced recognition: ${alternatives.length} → ${validResults.length} valid results`);

            return validResults;

        } catch (error) {
            this.logger.error('Error in enhanced recognition processing:', error);
            
            // Fallback to basic processing
            return alternatives
                .filter(alt => alt.confidence >= this.config.confidenceThreshold)
                .map(alt => ({
                    ...alt,
                    originalTranscript: alt.transcript,
                    phoneticProcessed: false,
                    learningApplied: false,
                    adaptiveThreshold: this.config.confidenceThreshold,
                    isAboveThreshold: true
                }));
        }
    }

    /**
     * Record user interaction for learning (called when user confirms/rejects)
     */
    recordUserInteraction(voiceInput, selectedCard, wasCorrect, context = {}) {
        if (!this.config.progressiveLearning) return;

        try {
            // Record for confidence manager
            this.confidenceManager.recordInteraction({
                voiceInput: voiceInput,
                cardName: selectedCard,
                wasCorrect: wasCorrect,
                confidence: this.lastResult?.confidence || 0,
                context: { ...this.currentContext, ...context }
            });

            // Record for learning engine
            if (wasCorrect) {
                this.learningEngine.learnFromSuccess(
                    voiceInput,
                    selectedCard,
                    this.lastResult?.confidence || 0,
                    { ...this.currentContext, ...context }
                );
            } else if (selectedCard) {
                this.learningEngine.learnFromRejection(
                    voiceInput,
                    selectedCard,
                    context.correctCard,
                    this.lastResult?.confidence || 0
                );
            }

            this.logger.debug('Recorded user interaction for learning', {
                voiceInput,
                selectedCard,
                wasCorrect
            });

        } catch (error) {
            this.logger.error('Failed to record user interaction:', error);
        }
    }

    /**
     * Update current context for better recognition
     */
    updateContext(context = {}) {
        this.currentContext = {
            ...this.currentContext,
            ...context
        };
        
        this.logger.debug('Updated voice recognition context:', this.currentContext);
    }

    /**
     * Get enhanced recognition statistics
     */
    getEnhancedStats() {
        const baseStats = this.getStatus();
        
        try {
            return {
                ...baseStats,
                phoneticMapper: {
                    patterns: this.phoneticMapper.getPatternStats()
                },
                confidenceManager: {
                    userStats: this.confidenceManager.getUserStats()
                },
                learningEngine: {
                    stats: this.learningEngine.getLearningStats()
                },
                enhancedFeatures: {
                    phoneticEnhancement: this.config.phoneticEnhancement,
                    adaptiveThreshold: this.config.adaptiveThreshold,
                    progressiveLearning: this.config.progressiveLearning
                }
            };
        } catch (error) {
            this.logger.error('Failed to get enhanced stats:', error);
            return baseStats;
        }
    }

    /**
     * Export all learned data for backup
     */
    async exportLearningData() {
        try {
            const data = {
                version: '1.0',
                timestamp: Date.now(),
                userInteractions: this.confidenceManager.getUserStats(),
                learnedPatterns: this.learningEngine.exportPatterns(),
                configuration: {
                    phoneticEnhancement: this.config.phoneticEnhancement,
                    adaptiveThreshold: this.config.adaptiveThreshold,
                    progressiveLearning: this.config.progressiveLearning
                }
            };
            
            return data;
        } catch (error) {
            this.logger.error('Failed to export learning data:', error);
            throw error;
        }
    }

    /**
     * Import learning data from backup
     */
    async importLearningData(data) {
        if (!data || data.version !== '1.0') {
            throw new Error('Invalid learning data format');
        }
        
        try {
            if (data.learnedPatterns) {
                this.learningEngine.importPatterns(data.learnedPatterns);
            }
            
            this.logger.info('Successfully imported learning data');
        } catch (error) {
            this.logger.error('Failed to import learning data:', error);
            throw error;
        }
    }

    /**
     * Reset all learning data
     */
    async resetLearningData() {
        try {
            this.confidenceManager.resetHistory();
            this.learningEngine.reset();
            
            this.logger.info('All learning data has been reset');
        } catch (error) {
            this.logger.error('Failed to reset learning data:', error);
            throw error;
        }
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
        if (!newConfig) return;
        
        // Map settings to our internal config (support both formats)
        const configUpdates = {
            confidenceThreshold: newConfig.voiceConfidenceThreshold || newConfig.confidenceThreshold,
            maxAlternatives: newConfig.voiceMaxAlternatives || newConfig.maxAlternatives,
            continuous: newConfig.voiceContinuous !== undefined ? newConfig.voiceContinuous : newConfig.continuous,
            interimResults: newConfig.voiceInterimResults !== undefined ? newConfig.voiceInterimResults : newConfig.interimResults,
            language: newConfig.voiceLanguage || newConfig.language
        };
        
        // Apply updates
        Object.keys(configUpdates).forEach(key => {
            if (configUpdates[key] !== undefined) {
                this.config[key] = configUpdates[key];
            }
        });
        
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
        
        // Reinitialize if already initialized
        if (this.isInitialized) {
            this.reinitialize();
        }
    }

    /**
     * Enhanced error handling with user-friendly messages
     */
    handleError(error, operation = 'voice recognition') {
        this.logger.error(`${operation} error:`, error);

        // Create user-friendly error with recovery options
        const userError = this.createUserFriendlyError(error, operation);
        
        // Emit error to UI with recovery options
        this.emitError(userError);
        
        // Auto-retry for transient errors
        if (userError.isRetryable && this.retryCount < (this.config.maxRetries || 3)) {
            this.scheduleRetry(operation);
        }
        
        return userError;
    }

    /**
     * Create user-friendly error messages with recovery options
     */
    createUserFriendlyError(error, operation) {
        const userError = {
            type: error.name || 'unknown',
            operation,
            timestamp: new Date().toISOString(),
            isRetryable: false,
            recoveryOptions: [],
            userMessage: 'An error occurred',
            technicalMessage: error.message
        };

        // Map technical errors to user-friendly messages
        if (error.message && error.message.includes('Microphone permission denied')) {
            userError.type = 'general-error';
            userError.userMessage = 'Microphone access is required for voice recognition. Please enable microphone permissions in your browser settings.';
            userError.isRetryable = true;
            userError.recoveryOptions = [
                { action: 'retry', label: 'Try Again' },
                { action: 'manual', label: 'Type Instead' },
                { action: 'help', label: 'Show Help' }
            ];
        } else if (error.message && error.message.includes('Voice recognition not supported')) {
            userError.type = 'general-error';
            userError.userMessage = 'Voice recognition is not supported in this environment. Please use HTTPS and a compatible browser.';
            userError.isRetryable = true;
            userError.recoveryOptions = [
                { action: 'manual', label: 'Type Instead' },
                { action: 'help', label: 'Browser Support' }
            ];
        } else {
            userError.type = 'general-error';
            userError.userMessage = 'Voice recognition encountered an issue. You can try again or type your input manually.';
            userError.isRetryable = true;
            userError.recoveryOptions = [
                { action: 'retry', label: 'Try Again' },
                { action: 'manual', label: 'Type Instead' }
            ];
        }

        return userError;
    }

    /**
     * Schedule automatic retry for transient errors
     */
    scheduleRetry(operation) {
        if (!this.retryCount) this.retryCount = 0;
        this.retryCount++;
        const delay = Math.min(1000 * Math.pow(2, this.retryCount), 10000); // Exponential backoff
        
        this.logger.info(`Scheduling retry ${this.retryCount} for ${operation} in ${delay}ms`);
        
        setTimeout(() => {
            this.logger.info(`Retrying ${operation} (attempt ${this.retryCount})`);
            
            switch (operation) {
                case 'initialization':
                    this.initialize().catch(error => {
                        this.handleError(error, 'initialization');
                    });
                    break;
                    
                case 'start listening':
                    this.startListening().catch(error => {
                        this.handleError(error, 'start listening');
                    });
                    break;
                    
                default:
                    this.logger.warn(`Unknown operation for retry: ${operation}`);
            }
        }, delay);
    }

    /**
     * Get appropriate engine for current platform
     */
    getEngineForPlatform() {
        // Return the current selected engine or the best available one
        if (this.currentEngine && this.engines.has(this.currentEngine)) {
            return this.engines.get(this.currentEngine);
        }
        
        // Select best engine if none is currently selected
        try {
            this.selectBestEngine();
            return this.engines.get(this.currentEngine);
        } catch (error) {
            this.logger.error('No suitable engine available for platform:', this.platform);
            return null;
        }
    }

    /**
     * Setup error recovery mechanisms
     */
    setupErrorRecovery() {
        // Initialize retry count if not already set
        if (this.retryCount === undefined) {
            this.retryCount = 0;
        }
        
        this.logger.debug('Error recovery mechanisms initialized');
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

    onInterimResult(callback) {
        this.listeners.interimResult.push(callback);
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

    emitInterimResult(transcript, confidence) {
        this.listeners.interimResult.forEach(callback => {
            try {
                callback({ transcript, confidence, interim: true });
            } catch (error) {
                this.logger.error('Error in interim result callback:', error);
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