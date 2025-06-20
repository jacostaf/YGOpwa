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
            confidenceThreshold: 0.5  // Lowered from 0.7 to show more potential matches
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
        
        this.logger.info('Loading comprehensive Yu-Gi-Oh card name optimizations...');
        
        // Initialize phonetic and linguistic mapping systems
        this.initializePhoneticMappings();
        this.initializeLanguageSpecificMappings();
        
        this.logger.info('Loaded comprehensive dynamic card name optimization system');
    }

    /**
     * Initialize comprehensive phonetic mappings for voice recognition
     */
    initializePhoneticMappings() {
        // Base phonetic substitutions for voice recognition errors
        this.phoneticMappings = {
            // Common voice recognition confusions
            'yu': ['you', 'u', 'yuu'],
            'gi': ['gee', 'ji', 'jee'],
            'oh': ['o', 'oo', 'ow'],
            'dragun': ['dragon', 'dragoon'],
            'majician': ['magician', 'magishun'],
            'warriar': ['warrior', 'worrier'],
            'elemental': ['elemental', 'element'],
            'spellcaster': ['spell', 'caster'],
            'fiend': ['fend', 'friend'],
            
            // Japanese romanization variations
            'ou': ['oo', 'o', 'ow'],
            'ei': ['ay', 'ai', 'e'],
            'uu': ['u', 'oo'],
            'ii': ['i', 'ee'],
            'aa': ['a', 'ah'],
            'nn': ['n', 'mm'],
            'tsu': ['su', 'tsu', 'zu'],
            'chi': ['chi', 'ti'],
            'shi': ['shi', 'si'],
            'ji': ['ji', 'zi'],
            'zu': ['zu', 'su'],
            'fu': ['fu', 'hu'],
            
            // Common card type variations
            'dragon': ['dragun', 'dragoon', 'drago'],
            'magician': ['majician', 'magishun', 'mage'],
            'warrior': ['warriar', 'worrier', 'war'],
            'machine': ['mach', 'machin'],
            'beast': ['best', 'beast'],
            'aqua': ['agua', 'aqua'],
            'winged': ['wing', 'winged'],
            'thunder': ['under', 'thunder'],
            'zombie': ['zomb', 'zombie'],
            'plant': ['plan', 'plant'],
            'insect': ['insec', 'insect'],
            'rock': ['rok', 'rock'],
            'pyro': ['fire', 'pyro'],
            'sea': ['see', 'sea'],
            'divine': ['divin', 'divine'],
            
            // Archetype-specific mappings
            'hero': ['hiro', 'heero', 'hero'],
            'neo': ['new', 'neo'],
            'cyber': ['siber', 'cyber'],
            'crystal': ['cristal', 'crystal'],
            'ancient': ['ansient', 'ancient'],
            'gladiator': ['gladiater', 'gladiator'],
            'blackwing': ['black wing', 'blackwing'],
            'lightsworn': ['light sworn', 'lightsworn'],
            'six samurai': ['six samurai', 'samurai'],
            
            // Japanese particle handling
            'no': ['of', 'the', 'no'], // の particle
            'ni': ['to', 'in', 'ni'], // に particle
            'wa': ['wa', 'ha'], // は particle
            'ga': ['ga', 'ka'], // が particle
            'wo': ['wo', 'o'], // を particle
            'de': ['de', 'at'], // で particle
            
            // Common Japanese words in card names
            'mitsurugi': ['mitsurugi', 'mitsurgi', 'mitsu rugi'],
            'mitama': ['mitama', 'mi tama'],
            'futsu': ['futsu', 'fu tsu'],
            'kage': ['kage', 'ka ge', 'cage'],
            'yami': ['yami', 'ya mi', 'dark'],
            'hikari': ['hikari', 'hi kari', 'light'],
            'oni': ['oni', 'o ni', 'demon'],
            'kami': ['kami', 'ka mi', 'god'],
            'ryu': ['ryu', 'ru', 'dragon'],
            'kitsune': ['kitsune', 'kit sune', 'fox'],
            'tengu': ['tengu', 'ten gu'],
            'yokai': ['yokai', 'yo kai'],
            'bushido': ['bushido', 'bu shi do'],
            'samurai': ['samurai', 'sa mu rai'],
            'ninja': ['ninja', 'nin ja'],
            'shogun': ['shogun', 'sho gun'],
            'senshi': ['senshi', 'sen shi', 'warrior'],
            'maho': ['maho', 'ma ho', 'magic'],
            'densetsu': ['densetsu', 'den setsu', 'legend'],
            'kokoro': ['kokoro', 'ko ko ro', 'heart'],
            'tamashii': ['tamashii', 'ta ma shii', 'soul'],
            'ikari': ['ikari', 'i ka ri', 'anger'],
            'chikara': ['chikara', 'chi ka ra', 'power']
        };
    }

    /**
     * Initialize language-specific mappings
     */
    initializeLanguageSpecificMappings() {
        // Common compound word patterns in Yu-Gi-Oh
        this.compoundWordPatterns = [
            // Spacing variations
            { pattern: /(\w+)\s+(\w+)/g, variations: ['$1$2', '$1-$2', '$1 $2'] },
            
            // Particle removal for Japanese names
            { pattern: /(\w+)\s+no\s+(\w+)/gi, variations: ['$1 $2', '$1$2', '$1-$2'] },
            { pattern: /(\w+)\s+ni\s+(\w+)/gi, variations: ['$1 $2', '$1$2', '$1-$2'] },
            { pattern: /(\w+)\s+wa\s+(\w+)/gi, variations: ['$1 $2', '$1$2', '$1-$2'] },
            { pattern: /(\w+)\s+ga\s+(\w+)/gi, variations: ['$1 $2', '$1$2', '$1-$2'] },
            { pattern: /(\w+)\s+wo\s+(\w+)/gi, variations: ['$1 $2', '$1$2', '$1-$2'] },
            { pattern: /(\w+)\s+de\s+(\w+)/gi, variations: ['$1 $2', '$1$2', '$1-$2'] },
            
            // Common archetype patterns
            { pattern: /elemental\s+hero/gi, variations: ['Elemental HERO', 'ElementalHERO', 'Elemental-HERO'] },
            { pattern: /destiny\s+hero/gi, variations: ['Destiny HERO', 'DestinyHERO', 'Destiny-HERO'] },
            { pattern: /evil\s+hero/gi, variations: ['Evil HERO', 'EvilHERO', 'Evil-HERO'] },
            { pattern: /masked\s+hero/gi, variations: ['Masked HERO', 'MaskedHERO', 'Masked-HERO'] },
            { pattern: /vision\s+hero/gi, variations: ['Vision HERO', 'VisionHERO', 'Vision-HERO'] },
            { pattern: /six\s+samurai/gi, variations: ['Six Samurai', 'SixSamurai', 'Six-Samurai'] },
            { pattern: /cyber\s+dragon/gi, variations: ['Cyber Dragon', 'CyberDragon', 'Cyber-Dragon'] },
            { pattern: /blue\s+eyes/gi, variations: ['Blue-Eyes', 'BlueEyes', 'Blue Eyes'] },
            { pattern: /red\s+eyes/gi, variations: ['Red-Eyes', 'RedEyes', 'Red Eyes'] },
            { pattern: /time\s+wizard/gi, variations: ['Time Wizard', 'TimeWizard', 'Time-Wizard'] }
        ];
        
        // Number word to digit mappings
        this.numberMappings = {
            'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
            'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
            'ten': '10', 'eleven': '11', 'twelve': '12', 'thirteen': '13',
            'fourteen': '14', 'fifteen': '15', 'sixteen': '16', 'seventeen': '17',
            'eighteen': '18', 'nineteen': '19', 'twenty': '20'
        };
    }

    /**
     * Optimize card name recognition using comprehensive dynamic variant generation
     */
    optimizeCardNameRecognition(result) {
        if (!this.config.cardNameOptimization) {
            return result;
        }
        
        const originalTranscript = result.transcript;
        
        // Generate comprehensive variants for the input
        const variants = this.generateCardNameVariants(originalTranscript);
        
        // Select the best variant (for now, return the first one as it includes the original)
        // In a real implementation, this would be used for fuzzy matching against a card database
        const optimizedTranscript = variants[0];
        
        return {
            transcript: optimizedTranscript,
            confidence: result.confidence,
            originalTranscript: originalTranscript,
            variants: variants // Include all variants for debugging/matching
        };
    }

    /**
     * Generate comprehensive card name variants for better voice recognition matching
     * Inspired by oldIteration.py's sophisticated approach
     */
    generateCardNameVariants(inputName) {
        if (!inputName || typeof inputName !== 'string') {
            return [inputName || ''];
        }
        
        const variants = new Set([inputName]); // Use Set to avoid duplicates
        const lowerInput = inputName.toLowerCase().trim();
        
        // Step 1: Apply phonetic substitutions
        const phoneticVariants = this.generatePhoneticVariants(lowerInput);
        phoneticVariants.forEach(variant => variants.add(variant));
        
        // Step 2: Handle compound words and spacing variations
        const compoundVariants = this.generateCompoundWordVariants(lowerInput);
        compoundVariants.forEach(variant => variants.add(variant));
        
        // Step 3: Handle Japanese particles and linguistic patterns
        const linguisticVariants = this.generateLinguisticVariants(lowerInput);
        linguisticVariants.forEach(variant => variants.add(variant));
        
        // Step 4: Number word to digit conversion
        const numberVariants = this.convertNumberWordsToDigits(lowerInput);
        numberVariants.forEach(variant => variants.add(variant));
        
        // Step 5: Apply all phonetic mappings to all existing variants
        const enhancedVariants = new Set();
        for (const variant of variants) {
            enhancedVariants.add(variant);
            const enhanced = this.applyAllPhoneticMappings(variant);
            enhanced.forEach(v => enhancedVariants.add(v));
        }
        
        // Step 6: Clean up variants
        const cleanedVariants = Array.from(enhancedVariants)
            .map(variant => this.cleanUpVariant(variant))
            .filter(variant => variant && variant.length > 0)
            .filter((variant, index, array) => array.indexOf(variant) === index); // Remove duplicates
        
        this.logger.debug(`Generated ${cleanedVariants.length} variants for "${inputName}":`, cleanedVariants.slice(0, 10));
        
        return cleanedVariants;
    }

    /**
     * Generate phonetic variants for better voice recognition
     */
    generatePhoneticVariants(input) {
        const variants = new Set([input]);
        
        // Apply all phonetic mappings
        for (const [original, alternatives] of Object.entries(this.phoneticMappings)) {
            const regex = new RegExp(`\\b${original}\\b`, 'gi');
            if (regex.test(input)) {
                for (const alt of alternatives) {
                    const variant = input.replace(regex, alt);
                    variants.add(variant);
                }
            }
        }
        
        return Array.from(variants);
    }

    /**
     * Generate compound word variants (like "metal flame" -> "metalflame")
     */
    generateCompoundWordVariants(input) {
        const variants = new Set([input]);
        const words = input.split(/\s+/);
        
        if (words.length >= 2) {
            // Remove all spaces (compound word)
            variants.add(words.join(''));
            
            // Add hyphens instead of spaces
            variants.add(words.join('-'));
            
            // Various spacing combinations for multi-word terms
            for (let i = 1; i < words.length; i++) {
                const leftPart = words.slice(0, i).join('');
                const rightPart = words.slice(i).join(' ');
                variants.add(`${leftPart} ${rightPart}`);
                
                const leftPartSpaced = words.slice(0, i).join(' ');
                const rightPartCompound = words.slice(i).join('');
                variants.add(`${leftPartSpaced} ${rightPartCompound}`);
            }
        }
        
        return Array.from(variants);
    }

    /**
     * Generate linguistic variants (Japanese particles, etc.)
     */
    generateLinguisticVariants(input) {
        const variants = new Set([input]);
        
        // Apply compound word patterns
        for (const pattern of this.compoundWordPatterns) {
            if (pattern.pattern.test(input)) {
                for (const variation of pattern.variations) {
                    const variant = input.replace(pattern.pattern, variation);
                    variants.add(variant);
                }
            }
        }
        
        // Special handling for Japanese particles - remove them completely
        let particleRemoved = input;
        const particles = ['no', 'ni', 'wa', 'ga', 'wo', 'de'];
        for (const particle of particles) {
            // Remove particle with surrounding spaces
            const particleRegex = new RegExp(`\\s+${particle}\\s+`, 'gi');
            particleRemoved = particleRemoved.replace(particleRegex, ' ');
        }
        
        // Clean up extra spaces and add to variants
        if (particleRemoved !== input) {
            const cleaned = particleRemoved.replace(/\s+/g, ' ').trim();
            if (cleaned) {
                variants.add(cleaned);
                
                // Also add compound version (no spaces)
                const compound = cleaned.replace(/\s+/g, '');
                if (compound) {
                    variants.add(compound);
                }
                
                // Add hyphenated version
                const hyphenated = cleaned.replace(/\s+/g, '-');
                if (hyphenated) {
                    variants.add(hyphenated);
                }
            }
        }
        
        return Array.from(variants);
    }

    /**
     * Convert number words to digits
     */
    convertNumberWordsToDigits(input) {
        const variants = new Set([input]);
        let converted = input;
        
        for (const [word, digit] of Object.entries(this.numberMappings)) {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            converted = converted.replace(regex, digit);
        }
        
        if (converted !== input) {
            variants.add(converted);
        }
        
        return Array.from(variants);
    }

    /**
     * Apply all phonetic mappings to a variant
     */
    applyAllPhoneticMappings(input) {
        const variants = new Set([input]);
        
        // Multiple passes to catch cascading substitutions
        for (let pass = 0; pass < 3; pass++) {
            const currentVariants = Array.from(variants);
            for (const variant of currentVariants) {
                for (const [original, alternatives] of Object.entries(this.phoneticMappings)) {
                    for (const alt of alternatives) {
                        // Word boundary replacements
                        const wordRegex = new RegExp(`\\b${original}\\b`, 'gi');
                        if (wordRegex.test(variant)) {
                            variants.add(variant.replace(wordRegex, alt));
                        }
                        
                        // Substring replacements for compound words
                        if (variant.includes(original.toLowerCase())) {
                            const substringVariant = variant.replace(
                                new RegExp(original, 'gi'), 
                                alt
                            );
                            variants.add(substringVariant);
                        }
                    }
                }
            }
        }
        
        return Array.from(variants);
    }

    /**
     * Clean up a variant by removing extra spaces and special characters
     */
    cleanUpVariant(variant) {
        if (!variant || typeof variant !== 'string') {
            return '';
        }
        
        return variant
            .replace(/\s+/g, ' ') // Multiple spaces to single space
            .replace(/[^\w\s'-]/g, '') // Remove special chars except hyphens and apostrophes
            .trim();
    }

    /**
     * Calculate similarity between two strings using multiple methods
     * This provides fuzzy matching capabilities for card name recognition
     */
    calculateSimilarity(str1, str2) {
        if (!str1 || !str2) {
            return 0;
        }
        
        const s1 = str1.toLowerCase().trim();
        const s2 = str2.toLowerCase().trim();
        
        if (s1 === s2) {
            return 1.0;
        }
        
        // Method 1: Levenshtein distance based similarity
        const levenshteinSimilarity = this.calculateLevenshteinSimilarity(s1, s2);
        
        // Method 2: Token-based similarity (good for word order differences)
        const tokenSimilarity = this.calculateTokenSimilarity(s1, s2);
        
        // Method 3: Substring similarity (good for partial matches)
        const substringSimilarity = this.calculateSubstringSimilarity(s1, s2);
        
        // Return the best similarity score
        return Math.max(levenshteinSimilarity, tokenSimilarity, substringSimilarity);
    }

    /**
     * Calculate Levenshtein distance based similarity
     */
    calculateLevenshteinSimilarity(str1, str2) {
        const len1 = str1.length;
        const len2 = str2.length;
        
        if (len1 === 0) return len2 === 0 ? 1 : 0;
        if (len2 === 0) return 0;
        
        const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null));
        
        for (let i = 0; i <= len1; i++) matrix[0][i] = i;
        for (let j = 0; j <= len2; j++) matrix[j][0] = j;
        
        for (let j = 1; j <= len2; j++) {
            for (let i = 1; i <= len1; i++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1, // deletion
                    matrix[j - 1][i] + 1, // insertion
                    matrix[j - 1][i - 1] + cost // substitution
                );
            }
        }
        
        const distance = matrix[len2][len1];
        const maxLen = Math.max(len1, len2);
        return (maxLen - distance) / maxLen;
    }

    /**
     * Calculate token-based similarity (good for word order differences)
     */
    calculateTokenSimilarity(str1, str2) {
        const tokens1 = new Set(str1.split(/\s+/));
        const tokens2 = new Set(str2.split(/\s+/));
        
        const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
        const union = new Set([...tokens1, ...tokens2]);
        
        return union.size === 0 ? 0 : intersection.size / union.size;
    }

    /**
     * Calculate substring similarity (good for partial matches)
     */
    calculateSubstringSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        // Find longest common substring
        let maxLength = 0;
        for (let i = 0; i < shorter.length; i++) {
            for (let j = i + 1; j <= shorter.length; j++) {
                const substring = shorter.substring(i, j);
                if (longer.includes(substring) && substring.length > maxLength) {
                    maxLength = substring.length;
                }
            }
        }
        
        return maxLength / longer.length;
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