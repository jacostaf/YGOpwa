/**
 * Performance Monitor - Real-time performance tracking for YGO Ripper UI
 * 
 * Tracks and analyzes:
 * - Voice recognition latency and accuracy
 * - API response times and success rates
 * - Memory usage and cleanup efficiency
 * - User interaction patterns
 * - Error rates and recovery times
 * 
 * @version 1.0.0
 */

export class PerformanceMonitor {
    constructor(logger) {
        this.logger = logger;
        this.metrics = {
            voice: {
                totalRecognitions: 0,
                successfulRecognitions: 0,
                averageLatency: 0,
                accuracyRate: 0,
                errorRate: 0,
                responseTimeHistory: []
            },
            api: {
                totalRequests: 0,
                successfulRequests: 0,
                averageResponseTime: 0,
                errorRate: 0,
                endpointMetrics: new Map(),
                responseTimeHistory: []
            },
            memory: {
                usageHistory: [],
                peakUsage: 0,
                gcEvents: 0,
                leakWarnings: 0
            },
            ui: {
                interactionCount: 0,
                averageResponseTime: 0,
                slowInteractions: 0,
                errorDialogs: 0
            },
            session: {
                startTime: null,
                cardsProcessed: 0,
                averageProcessingTime: 0,
                sessionDuration: 0
            }
        };
        
        this.thresholds = {
            voiceLatency: 2000, // 2 seconds
            apiResponseTime: 5000, // 5 seconds
            memoryUsage: 100 * 1024 * 1024, // 100MB
            uiResponseTime: 100 // 100ms
        };
        
        this.alerts = [];
        this.isMonitoring = false;
        this.monitoringInterval = null;
        this.perfObserver = null;
        
        this.setupPerformanceObserver();
    }

    /**
     * Start performance monitoring
     */
    start() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        this.metrics.session.startTime = Date.now();
        
        // Start periodic monitoring
        this.monitoringInterval = setInterval(() => {
            this.collectMetrics();
            this.analyzePerformance();
        }, 5000); // Every 5 seconds
        
        this.logger.info('Performance monitoring started');
    }

    /**
     * Stop performance monitoring
     */
    stop() {
        if (!this.isMonitoring) return;
        
        this.isMonitoring = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        if (this.perfObserver) {
            this.perfObserver.disconnect();
        }
        
        this.metrics.session.sessionDuration = Date.now() - this.metrics.session.startTime;
        
        this.logger.info('Performance monitoring stopped', {
            sessionDuration: this.metrics.session.sessionDuration,
            cardsProcessed: this.metrics.session.cardsProcessed,
            finalMetrics: this.getPerformanceSummary()
        });
    }

    /**
     * Setup Performance Observer for browser APIs
     */
    setupPerformanceObserver() {
        if (!window.PerformanceObserver) return;
        
        try {
            this.perfObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                
                entries.forEach(entry => {
                    if (entry.entryType === 'measure') {
                        this.recordCustomMeasurement(entry.name, entry.duration);
                    } else if (entry.entryType === 'navigation') {
                        this.recordPageLoad(entry);
                    }
                });
            });
            
            this.perfObserver.observe({ entryTypes: ['measure', 'navigation'] });
        } catch (error) {
            this.logger.warn('Performance Observer not available:', error);
        }
    }

    /**
     * Record voice recognition performance
     */
    recordVoiceRecognition(startTime, endTime, success, accuracy = null, errorType = null) {
        const latency = endTime - startTime;
        
        this.metrics.voice.totalRecognitions++;
        if (success) {
            this.metrics.voice.successfulRecognitions++;
        }
        
        // Update average latency
        this.metrics.voice.responseTimeHistory.push(latency);
        if (this.metrics.voice.responseTimeHistory.length > 100) {
            this.metrics.voice.responseTimeHistory.shift();
        }
        
        this.metrics.voice.averageLatency = this.calculateAverage(this.metrics.voice.responseTimeHistory);
        this.metrics.voice.accuracyRate = this.metrics.voice.successfulRecognitions / this.metrics.voice.totalRecognitions;
        this.metrics.voice.errorRate = 1 - this.metrics.voice.accuracyRate;
        
        // Check for performance issues
        if (latency > this.thresholds.voiceLatency) {
            this.addAlert('warning', 'Voice Recognition', `High latency detected: ${latency}ms`);
        }
        
        if (accuracy !== null && accuracy < 0.7) {
            this.addAlert('warning', 'Voice Recognition', `Low accuracy detected: ${(accuracy * 100).toFixed(1)}%`);
        }
        
        this.logger.debug('Voice recognition performance recorded', {
            latency,
            success,
            accuracy,
            errorType,
            averageLatency: this.metrics.voice.averageLatency
        });
    }

    /**
     * Record API request performance
     */
    recordApiRequest(endpoint, startTime, endTime, success, errorType = null) {
        const responseTime = endTime - startTime;
        
        this.metrics.api.totalRequests++;
        if (success) {
            this.metrics.api.successfulRequests++;
        }
        
        // Update endpoint-specific metrics
        if (!this.metrics.api.endpointMetrics.has(endpoint)) {
            this.metrics.api.endpointMetrics.set(endpoint, {
                totalRequests: 0,
                successfulRequests: 0,
                averageResponseTime: 0,
                responseTimeHistory: []
            });
        }
        
        const endpointMetrics = this.metrics.api.endpointMetrics.get(endpoint);
        endpointMetrics.totalRequests++;
        if (success) {
            endpointMetrics.successfulRequests++;
        }
        
        endpointMetrics.responseTimeHistory.push(responseTime);
        if (endpointMetrics.responseTimeHistory.length > 50) {
            endpointMetrics.responseTimeHistory.shift();
        }
        
        endpointMetrics.averageResponseTime = this.calculateAverage(endpointMetrics.responseTimeHistory);
        
        // Update overall API metrics
        this.metrics.api.responseTimeHistory.push(responseTime);
        if (this.metrics.api.responseTimeHistory.length > 100) {
            this.metrics.api.responseTimeHistory.shift();
        }
        
        this.metrics.api.averageResponseTime = this.calculateAverage(this.metrics.api.responseTimeHistory);
        this.metrics.api.errorRate = 1 - (this.metrics.api.successfulRequests / this.metrics.api.totalRequests);
        
        // Check for performance issues
        if (responseTime > this.thresholds.apiResponseTime) {
            this.addAlert('warning', 'API Performance', `Slow API response: ${endpoint} took ${responseTime}ms`);
        }
        
        if (!success) {
            this.addAlert('error', 'API Error', `Failed request to ${endpoint}: ${errorType || 'Unknown error'}`);
        }
        
        this.logger.debug('API request performance recorded', {
            endpoint,
            responseTime,
            success,
            errorType,
            averageResponseTime: this.metrics.api.averageResponseTime
        });
    }

    /**
     * Record card processing performance
     */
    recordCardProcessing(startTime, endTime, cardName, success) {
        const processingTime = endTime - startTime;
        
        this.metrics.session.cardsProcessed++;
        
        // Update average processing time
        if (!this.metrics.session.processingTimeHistory) {
            this.metrics.session.processingTimeHistory = [];
        }
        
        this.metrics.session.processingTimeHistory.push(processingTime);
        if (this.metrics.session.processingTimeHistory.length > 50) {
            this.metrics.session.processingTimeHistory.shift();
        }
        
        this.metrics.session.averageProcessingTime = this.calculateAverage(this.metrics.session.processingTimeHistory);
        
        this.logger.debug('Card processing performance recorded', {
            cardName,
            processingTime,
            success,
            averageProcessingTime: this.metrics.session.averageProcessingTime
        });
    }

    /**
     * Record UI interaction performance
     */
    recordUIInteraction(interactionType, startTime, endTime, success = true) {
        const responseTime = endTime - startTime;
        
        this.metrics.ui.interactionCount++;
        
        if (!this.metrics.ui.responseTimeHistory) {
            this.metrics.ui.responseTimeHistory = [];
        }
        
        this.metrics.ui.responseTimeHistory.push(responseTime);
        if (this.metrics.ui.responseTimeHistory.length > 100) {
            this.metrics.ui.responseTimeHistory.shift();
        }
        
        this.metrics.ui.averageResponseTime = this.calculateAverage(this.metrics.ui.responseTimeHistory);
        
        if (responseTime > this.thresholds.uiResponseTime) {
            this.metrics.ui.slowInteractions++;
            this.addAlert('warning', 'UI Performance', `Slow ${interactionType} interaction: ${responseTime}ms`);
        }
        
        if (!success) {
            this.metrics.ui.errorDialogs++;
        }
    }

    /**
     * Collect current system metrics
     */
    collectMetrics() {
        // Memory usage
        if (performance.memory) {
            const memoryUsage = performance.memory.usedJSHeapSize;
            this.metrics.memory.usageHistory.push({
                timestamp: Date.now(),
                usage: memoryUsage
            });
            
            if (this.metrics.memory.usageHistory.length > 60) { // Keep last 5 minutes
                this.metrics.memory.usageHistory.shift();
            }
            
            if (memoryUsage > this.metrics.memory.peakUsage) {
                this.metrics.memory.peakUsage = memoryUsage;
            }
            
            // Check for memory issues
            if (memoryUsage > this.thresholds.memoryUsage) {
                this.addAlert('warning', 'Memory Usage', `High memory usage: ${(memoryUsage / 1024 / 1024).toFixed(2)}MB`);
            }
        }
    }

    /**
     * Analyze performance and generate insights
     */
    analyzePerformance() {
        const analysis = {
            overall: 'good',
            issues: [],
            recommendations: []
        };
        
        // Voice performance analysis
        if (this.metrics.voice.errorRate > 0.2) {
            analysis.issues.push('High voice recognition error rate');
            analysis.recommendations.push('Check microphone permissions and background noise');
            analysis.overall = 'warning';
        }
        
        if (this.metrics.voice.averageLatency > this.thresholds.voiceLatency) {
            analysis.issues.push('Slow voice recognition response');
            analysis.recommendations.push('Consider adjusting voice timeout settings');
            analysis.overall = 'warning';
        }
        
        // API performance analysis
        if (this.metrics.api.errorRate > 0.1) {
            analysis.issues.push('High API error rate');
            analysis.recommendations.push('Check network connection and backend status');
            analysis.overall = 'critical';
        }
        
        if (this.metrics.api.averageResponseTime > this.thresholds.apiResponseTime) {
            analysis.issues.push('Slow API responses');
            analysis.recommendations.push('Consider implementing request caching or retry logic');
            analysis.overall = 'warning';
        }
        
        // Memory analysis
        const currentMemory = this.metrics.memory.usageHistory[this.metrics.memory.usageHistory.length - 1];
        if (currentMemory && currentMemory.usage > this.thresholds.memoryUsage) {
            analysis.issues.push('High memory usage');
            analysis.recommendations.push('Consider clearing old session data or restarting the app');
            analysis.overall = 'warning';
        }
        
        // Log analysis if there are issues
        if (analysis.issues.length > 0) {
            this.logger.warn('Performance analysis detected issues', analysis);
        }
        
        return analysis;
    }

    /**
     * Add performance alert
     */
    addAlert(level, category, message) {
        const alert = {
            timestamp: Date.now(),
            level,
            category,
            message
        };
        
        this.alerts.push(alert);
        
        // Keep only last 50 alerts
        if (this.alerts.length > 50) {
            this.alerts.shift();
        }
        
        this.logger.log(level, `Performance Alert [${category}]: ${message}`);
    }

    /**
     * Get current performance summary
     */
    getPerformanceSummary() {
        return {
            voice: {
                totalRecognitions: this.metrics.voice.totalRecognitions,
                successRate: this.metrics.voice.accuracyRate,
                averageLatency: Math.round(this.metrics.voice.averageLatency)
            },
            api: {
                totalRequests: this.metrics.api.totalRequests,
                successRate: this.metrics.api.successfulRequests / Math.max(this.metrics.api.totalRequests, 1),
                averageResponseTime: Math.round(this.metrics.api.averageResponseTime)
            },
            memory: {
                currentUsage: this.metrics.memory.usageHistory[this.metrics.memory.usageHistory.length - 1]?.usage || 0,
                peakUsage: this.metrics.memory.peakUsage
            },
            session: {
                cardsProcessed: this.metrics.session.cardsProcessed,
                duration: this.metrics.session.startTime ? Date.now() - this.metrics.session.startTime : 0,
                averageProcessingTime: Math.round(this.metrics.session.averageProcessingTime || 0)
            },
            recentAlerts: this.alerts.slice(-10)
        };
    }

    /**
     * Get detailed metrics for specific component
     */
    getDetailedMetrics(component) {
        switch (component) {
            case 'voice':
                return {
                    ...this.metrics.voice,
                    responseTimeDistribution: this.calculateDistribution(this.metrics.voice.responseTimeHistory)
                };
            case 'api':
                return {
                    ...this.metrics.api,
                    endpointBreakdown: Array.from(this.metrics.api.endpointMetrics.entries()),
                    responseTimeDistribution: this.calculateDistribution(this.metrics.api.responseTimeHistory)
                };
            case 'memory':
                return {
                    ...this.metrics.memory,
                    trend: this.calculateTrend(this.metrics.memory.usageHistory.map(h => h.usage))
                };
            default:
                return this.metrics[component] || null;
        }
    }

    /**
     * Export performance data
     */
    exportData(format = 'json') {
        const data = {
            exportTime: new Date().toISOString(),
            metrics: this.metrics,
            alerts: this.alerts,
            summary: this.getPerformanceSummary(),
            analysis: this.analyzePerformance()
        };
        
        if (format === 'csv') {
            return this.convertToCSV(data);
        }
        
        return JSON.stringify(data, null, 2);
    }

    /**
     * Calculate average of an array
     */
    calculateAverage(arr) {
        if (!arr || arr.length === 0) return 0;
        return arr.reduce((sum, val) => sum + val, 0) / arr.length;
    }

    /**
     * Calculate distribution of values
     */
    calculateDistribution(arr) {
        if (!arr || arr.length === 0) return {};
        
        const sorted = [...arr].sort((a, b) => a - b);
        return {
            min: sorted[0],
            max: sorted[sorted.length - 1],
            median: sorted[Math.floor(sorted.length / 2)],
            p95: sorted[Math.floor(sorted.length * 0.95)],
            p99: sorted[Math.floor(sorted.length * 0.99)]
        };
    }

    /**
     * Calculate trend of values
     */
    calculateTrend(arr) {
        if (!arr || arr.length < 2) return 'stable';
        
        const recent = arr.slice(-10);
        const older = arr.slice(-20, -10);
        
        if (older.length === 0) return 'stable';
        
        const recentAvg = this.calculateAverage(recent);
        const olderAvg = this.calculateAverage(older);
        
        const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100;
        
        if (changePercent > 10) return 'increasing';
        if (changePercent < -10) return 'decreasing';
        return 'stable';
    }

    /**
     * Convert data to CSV format
     */
    convertToCSV(data) {
        // Simplified CSV export - could be enhanced based on needs
        const rows = [
            ['Metric', 'Value', 'Timestamp'],
            ['Voice Recognition Rate', `${(data.summary.voice.successRate * 100).toFixed(2)}%`, new Date().toISOString()],
            ['Voice Average Latency', `${data.summary.voice.averageLatency}ms`, new Date().toISOString()],
            ['API Success Rate', `${(data.summary.api.successRate * 100).toFixed(2)}%`, new Date().toISOString()],
            ['API Average Response Time', `${data.summary.api.averageResponseTime}ms`, new Date().toISOString()],
            ['Cards Processed', data.summary.session.cardsProcessed, new Date().toISOString()],
            ['Session Duration', `${Math.round(data.summary.session.duration / 1000)}s`, new Date().toISOString()]
        ];
        
        return rows.map(row => row.join(',')).join('\n');
    }

    /**
     * Record custom performance measurement
     */
    recordCustomMeasurement(name, duration) {
        if (!this.customMeasurements) {
            this.customMeasurements = new Map();
        }
        
        if (!this.customMeasurements.has(name)) {
            this.customMeasurements.set(name, []);
        }
        
        const measurements = this.customMeasurements.get(name);
        measurements.push(duration);
        
        if (measurements.length > 100) {
            measurements.shift();
        }
        
        this.logger.debug(`Custom measurement recorded: ${name} = ${duration}ms`);
    }

    /**
     * Record page load performance
     */
    recordPageLoad(entry) {
        this.metrics.pageLoad = {
            domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
            loadComplete: entry.loadEventEnd - entry.loadEventStart,
            totalTime: entry.loadEventEnd - entry.navigationStart
        };
        
        this.logger.info('Page load performance recorded', this.metrics.pageLoad);
    }
}