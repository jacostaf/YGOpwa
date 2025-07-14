import { VoiceEngine } from '../../src/js/voice/VoiceEngine.js';

describe('VoiceEngine', () => {
    let engine;
    let mockPermissionManager;
    let mockLogger;

    beforeEach(() => {
        // Mock permission manager
        mockPermissionManager = {
            initialize: jest.fn().mockResolvedValue(true),
            requestMicrophone: jest.fn().mockResolvedValue({ state: 'granted' }),
            hasPermission: jest.fn().mockReturnValue(true),
            getPermissionInstructions: jest.fn().mockReturnValue('Enable microphone permissions')
        };

        // Mock logger
        mockLogger = {
            info: jest.fn(),
            debug: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        };

        // Mock browser APIs
        global.window = {
            isSecureContext: true,
            SpeechRecognition: jest.fn().mockImplementation(() => ({
                start: jest.fn(),
                stop: jest.fn(),
                abort: jest.fn(),
                onstart: null,
                onend: null,
                onresult: null,
                onerror: null,
                continuous: false,
                interimResults: false,
                lang: 'en-US',
                maxAlternatives: 3
            }))
        };

        global.navigator = {
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
            mediaDevices: {
                getUserMedia: jest.fn().mockResolvedValue({
                    getTracks: () => [{ stop: jest.fn() }]
                })
            }
        };

        // Create engine instance
        engine = new VoiceEngine(mockPermissionManager, mockLogger);
    });

    afterEach(() => {
        if (engine) {
            engine.destroy();
        }
    });

    describe('Constructor', () => {
        test('should initialize with default configuration', () => {
            expect(engine.isInitialized).toBe(false);
            expect(engine.isListening).toBe(false);
            expect(engine.platform).toBe('mac');
        });

        test('should use provided logger', () => {
            expect(engine.logger).toBe(mockLogger);
        });

        test('should detect platform correctly', () => {
            expect(engine.platform).toBe('mac');
        });
    });

    describe('initialize()', () => {
        test('should initialize successfully', async () => {
            const result = await engine.initialize();
            
            expect(result).toBe(true);
            expect(engine.isInitialized).toBe(true);
            expect(mockPermissionManager.initialize).toHaveBeenCalled();
            expect(mockPermissionManager.requestMicrophone).toHaveBeenCalled();
        });

        test('should handle permission denied', async () => {
            mockPermissionManager.requestMicrophone.mockResolvedValue({ state: 'denied' });
            
            await expect(engine.initialize()).rejects.toThrow('Microphone permission denied');
        });

        test('should handle unsupported environment', async () => {
            global.window.isSecureContext = false;
            
            await expect(engine.initialize()).rejects.toThrow('Voice recognition not supported in this environment');
        });
    });

    describe('Configuration', () => {
        test('should update configuration', () => {
            const settings = {
                voiceConfidenceThreshold: 0.8,
                voiceLanguage: 'es-ES'
            };
            
            engine.updateConfig(settings);
            
            expect(engine.config.confidenceThreshold).toBe(0.8);
            expect(engine.config.language).toBe('es-ES');
        });

        test('should handle empty settings', () => {
            const originalConfig = { ...engine.config };
            engine.updateConfig({});
            expect(engine.config).toEqual(originalConfig);
        });
    });

    describe('Voice Recognition', () => {
        beforeEach(async () => {
            await engine.initialize();
        });

        test('should start listening', async () => {
            await engine.startListening();
            expect(engine.shouldKeepListening).toBe(true);
        });

        test('should stop listening', () => {
            engine.isListening = true;
            engine.stopListening();
            expect(engine.isPaused).toBe(true);
            expect(engine.shouldKeepListening).toBe(false);
        });

        test('should handle recognition results', () => {
            const mockEvent = {
                results: [{
                    isFinal: true,
                    0: { transcript: 'blue eyes white dragon', confidence: 0.9 }
                }]
            };

            engine.handleRecognitionResult(mockEvent, 'webspeech');
            expect(engine.lastResult).toBeDefined();
            expect(engine.lastResult.transcript).toBe('blue eyes white dragon');
        });

        test('should test recognition', async () => {
            // Mock successful recognition
            setTimeout(() => {
                engine.handleRecognitionResult({
                    results: [{
                        isFinal: true,
                        0: { transcript: 'test result', confidence: 0.8 }
                    }]
                }, 'webspeech');
            }, 100);

            const result = await engine.testRecognition();
            expect(result).toBe('test result');
        });
    });

    describe('Error Handling', () => {
        test('should analyze errors correctly', () => {
            const errorInfo = engine.analyzeError('not-allowed', 'webspeech');
            
            expect(errorInfo.type).toBe('permission-denied');
            expect(errorInfo.isRetryable).toBe(false);
            expect(errorInfo.severity).toBe('high');
        });

        test('should handle no-speech error', () => {
            const errorInfo = engine.analyzeError('no-speech', 'webspeech');
            
            expect(errorInfo.type).toBe('no-speech');
            expect(errorInfo.isRetryable).toBe(true);
            expect(errorInfo.severity).toBe('low');
        });

        test('should reset error state', () => {
            engine.errorState.errorCount = 5;
            engine.errorState.consecutiveErrors = 3;
            
            engine.resetErrorState();
            
            expect(engine.errorState.errorCount).toBe(0);
            expect(engine.errorState.consecutiveErrors).toBe(0);
        });
    });

    describe('Performance Monitoring', () => {
        test('should initialize performance monitoring', () => {
            const metrics = engine.startPerformanceMonitoring();
            
            expect(metrics).toBeDefined();
            expect(metrics.recognitionAttempts).toBe(0);
            expect(metrics.successfulRecognitions).toBe(0);
        });

        test('should record recognition success', () => {
            engine.startPerformanceMonitoring();
            
            const result = { confidence: 0.8 };
            engine.recordRecognitionSuccess(result);
            
            expect(engine.performanceMetrics.successfulRecognitions).toBe(1);
            expect(engine.errorState.consecutiveErrors).toBe(0);
        });

        test('should record recognition failure', () => {
            engine.startPerformanceMonitoring();
            
            const errorInfo = { type: 'no-speech' };
            engine.recordRecognitionFailure(errorInfo);
            
            expect(engine.performanceMetrics.failedRecognitions).toBe(1);
        });

        test('should generate performance report', () => {
            engine.startPerformanceMonitoring();
            
            const report = engine.getPerformanceReport();
            
            expect(report).toHaveProperty('totalAttempts');
            expect(report).toHaveProperty('successRate');
            expect(report).toHaveProperty('recommendations');
        });
    });

    describe('Card Name Optimization', () => {
        beforeEach(async () => {
            await engine.loadCardNameOptimizations();
        });

        test('should optimize card names', () => {
            const result = { transcript: 'blue eyes white dragon', confidence: 0.8 };
            const optimized = engine.optimizeCardNameRecognition(result);
            
            expect(optimized.transcript).toBe('blue eyes white dragon');
            expect(optimized.originalTranscript).toBe('blue eyes white dragon');
        });

        test('should calculate string similarity', () => {
            const similarity = engine.calculateSimilarity('blue eyes', 'blue eyes white');
            expect(similarity).toBeGreaterThan(0.5);
        });

        test('should calculate Levenshtein distance', () => {
            const distance = engine.levenshteinDistance('cat', 'bat');
            expect(distance).toBe(1);
        });
    });

    describe('Event Handling', () => {
        test('should register and emit result events', (done) => {
            engine.onResult((result) => {
                expect(result.transcript).toBe('test');
                done();
            });
            
            engine.emitResult({ transcript: 'test' });
        });

        test('should register and emit status change events', (done) => {
            engine.onStatusChange((status) => {
                expect(status).toBe('listening');
                done();
            });
            
            engine.emitStatusChange('listening');
        });

        test('should register and emit error events', (done) => {
            engine.onError((error) => {
                expect(error.type).toBe('test-error');
                done();
            });
            
            engine.emitError({ type: 'test-error' });
        });
    });

    describe('Utility Methods', () => {
        test('should check availability', async () => {
            await engine.initialize();
            expect(engine.isAvailable()).toBe(true);
        });

        test('should get status', () => {
            const status = engine.getStatus();
            
            expect(status).toHaveProperty('isInitialized');
            expect(status).toHaveProperty('isListening');
            expect(status).toHaveProperty('platform');
        });

        test('should get diagnostic info', () => {
            const info = engine.getDiagnosticInfo();
            
            expect(info).toHaveProperty('engine');
            expect(info).toHaveProperty('state');
            expect(info).toHaveProperty('errors');
        });

        test('should stop engine', async () => {
            await engine.initialize();
            await engine.stop();
            
            expect(engine.isInitialized).toBe(false);
        });
    });
});