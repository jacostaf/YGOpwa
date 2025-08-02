/**
 * Comprehensive Test Runner
 * 
 * Integrates all test suites and provides a unified interface for running
 * unit tests, integration tests, and end-to-end tests.
 */

import { VoiceTestFramework } from './voice.test.js';
import { SessionTestFramework } from './session.test.js';
import { AppTestFramework } from './app.test.js';
import { Logger } from '../utils/Logger.js';

class TestRunner {
    constructor() {
        this.logger = new Logger('TestRunner');
        this.testSuites = new Map();
        this.results = new Map();
        this.isRunning = false;
        
        // Register test suites
        this.registerTestSuite('voice', VoiceTestFramework);
        this.registerTestSuite('session', SessionTestFramework);
        this.registerTestSuite('app', AppTestFramework);
        
        // Test configuration
        this.config = {
            parallel: false,
            timeout: 30000,
            retries: 1,
            verbose: false,
            coverage: false,
            bail: false // Stop on first failure
        };
        
        this.setupUI();
    }

    /**
     * Register a test suite
     */
    registerTestSuite(name, testFramework) {
        this.testSuites.set(name, testFramework);
        this.logger.info(`Registered test suite: ${name}`);
    }

    /**
     * Run all test suites
     */
    async runAll(options = {}) {
        if (this.isRunning) {
            this.logger.warn('Test runner is already running');
            return;
        }

        this.isRunning = true;
        this.updateConfig(options);
        
        try {
            this.logger.info('Starting comprehensive test run...');
            this.showTestRunner();
            this.updateStatus('Running tests...');
            
            const startTime = Date.now();
            const results = new Map();
            
            if (this.config.parallel) {
                // Run test suites in parallel
                const promises = Array.from(this.testSuites.entries()).map(
                    ([name, framework]) => this.runTestSuite(name, framework)
                );
                
                const suiteResults = await Promise.allSettled(promises);
                suiteResults.forEach((result, index) => {
                    const suiteName = Array.from(this.testSuites.keys())[index];
                    results.set(suiteName, result.status === 'fulfilled' ? result.value : {
                        error: result.reason,
                        passed: 0,
                        failed: 1,
                        total: 1
                    });
                });
            } else {
                // Run test suites sequentially
                for (const [name, framework] of this.testSuites) {
                    try {
                        const result = await this.runTestSuite(name, framework);
                        results.set(name, result);
                        
                        // Check if we should bail on failure
                        if (this.config.bail && result.failed > 0) {
                            this.logger.warn(`Bailing out due to failures in ${name}`);
                            break;
                        }
                    } catch (error) {
                        this.logger.error(`Error running test suite ${name}:`, error);
                        results.set(name, {
                            error: error.message,
                            passed: 0,
                            failed: 1,
                            total: 1
                        });
                        
                        if (this.config.bail) {
                            break;
                        }
                    }
                }
            }
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            this.results = results;
            this.displayResults(results, duration);
            
            return this.generateReport(results, duration);
            
        } catch (error) {
            this.logger.error('Test runner error:', error);
            this.updateStatus('Error occurred during test run');
            throw error;
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Run a specific test suite
     */
    async runTestSuite(name, framework) {
        this.logger.info(`Running test suite: ${name}`);
        this.updateSuiteStatus(name, 'running');
        
        try {
            const results = await framework.runAll();
            
            const passed = results.filter(r => r.status === 'passed').length;
            const failed = results.filter(r => r.status === 'failed').length;
            const total = results.length;
            
            const suiteResult = {
                name,
                passed,
                failed,
                total,
                results,
                duration: 0 // Framework should provide this
            };
            
            this.updateSuiteStatus(name, failed > 0 ? 'failed' : 'passed');
            this.logger.info(`Test suite ${name} completed: ${passed}/${total} passed`);
            
            return suiteResult;
            
        } catch (error) {
            this.updateSuiteStatus(name, 'error');
            this.logger.error(`Test suite ${name} failed:`, error);
            throw error;
        }
    }

    /**
     * Run specific tests
     */
    async runTests(suiteNames) {
        if (!Array.isArray(suiteNames)) {
            suiteNames = [suiteNames];
        }
        
        const filteredSuites = new Map();
        for (const name of suiteNames) {
            if (this.testSuites.has(name)) {
                filteredSuites.set(name, this.testSuites.get(name));
            } else {
                this.logger.warn(`Test suite not found: ${name}`);
            }
        }
        
        if (filteredSuites.size === 0) {
            throw new Error('No valid test suites found');
        }
        
        // Temporarily replace test suites
        const originalSuites = this.testSuites;
        this.testSuites = filteredSuites;
        
        try {
            return await this.runAll();
        } finally {
            this.testSuites = originalSuites;
        }
    }

    /**
     * Update configuration
     */
    updateConfig(options) {
        this.config = { ...this.config, ...options };
        this.logger.debug('Test configuration updated:', this.config);
    }

    /**
     * Display test results
     */
    displayResults(results, duration) {
        const totalPassed = Array.from(results.values()).reduce((sum, r) => sum + (r.passed || 0), 0);
        const totalFailed = Array.from(results.values()).reduce((sum, r) => sum + (r.failed || 0), 0);
        const totalTests = totalPassed + totalFailed;
        
        const successRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0;
        
        // Update UI
        this.updateOverallResults({
            passed: totalPassed,
            failed: totalFailed,
            total: totalTests,
            successRate,
            duration
        });
        
        // Console output
        console.log('\n🎯 Test Results Summary');
        console.log('=' .repeat(50));
        
        results.forEach((result, suiteName) => {
            const status = result.failed > 0 ? '❌' : '✅';
            const rate = result.total > 0 ? ((result.passed / result.total) * 100).toFixed(1) : 0;
            
            console.log(`${status} ${suiteName}: ${result.passed}/${result.total} (${rate}%)`);
            
            if (this.config.verbose && result.results) {
                result.results.forEach(test => {
                    const testStatus = test.status === 'passed' ? '  ✅' : '  ❌';
                    console.log(`${testStatus} ${test.name}`);
                    if (test.error && this.config.verbose) {
                        console.log(`     Error: ${test.error.message}`);
                    }
                });
            }
        });
        
        console.log('=' .repeat(50));
        console.log(`📊 Overall: ${totalPassed}/${totalTests} passed (${successRate}%)`);
        console.log(`⏱️  Duration: ${duration}ms`);
        
        this.updateStatus(`Tests completed: ${totalPassed}/${totalTests} passed`);
    }

    /**
     * Generate test report
     */
    generateReport(results, duration) {
        const totalPassed = Array.from(results.values()).reduce((sum, r) => sum + (r.passed || 0), 0);
        const totalFailed = Array.from(results.values()).reduce((sum, r) => sum + (r.failed || 0), 0);
        const totalTests = totalPassed + totalFailed;
        
        const report = {
            timestamp: new Date().toISOString(),
            duration,
            summary: {
                total: totalTests,
                passed: totalPassed,
                failed: totalFailed,
                successRate: totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0
            },
            suites: Array.from(results.entries()).map(([name, result]) => ({
                name,
                passed: result.passed || 0,
                failed: result.failed || 0,
                total: result.total || 0,
                error: result.error || null,
                tests: result.results || []
            })),
            config: this.config
        };
        
        // Store report
        this.saveReport(report);
        
        return report;
    }

    /**
     * Save test report
     */
    saveReport(report) {
        try {
            const reportData = JSON.stringify(report, null, 2);
            const blob = new Blob([reportData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            // Create download link
            const a = document.createElement('a');
            a.href = url;
            a.download = `test-report-${new Date().toISOString().split('T')[0]}.json`;
            a.style.display = 'none';
            document.body.appendChild(a);
            
            // Auto-download is optional
            if (this.config.saveReport) {
                a.click();
            }
            
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.logger.info('Test report generated');
            
        } catch (error) {
            this.logger.error('Failed to save test report:', error);
        }
    }

    /**
     * Setup test runner UI
     */
    setupUI() {
        // Create test runner UI if not exists
        if (!document.getElementById('test-runner-ui')) {
            const ui = document.createElement('div');
            ui.id = 'test-runner-ui';
            ui.className = 'test-runner-ui hidden';
            ui.innerHTML = `
                <div class="test-runner-header">
                    <h3>🧪 Test Runner</h3>
                    <button id="close-test-runner" class="close-btn">&times;</button>
                </div>
                <div class="test-runner-content">
                    <div class="test-controls">
                        <button id="run-all-tests" class="btn btn-primary">Run All Tests</button>
                        <button id="run-voice-tests" class="btn btn-secondary">Voice Tests</button>
                        <button id="run-session-tests" class="btn btn-secondary">Session Tests</button>
                        <button id="run-app-tests" class="btn btn-secondary">App Tests</button>
                    </div>
                    
                    <div class="test-config">
                        <label>
                            <input type="checkbox" id="parallel-tests"> Run in parallel
                        </label>
                        <label>
                            <input type="checkbox" id="verbose-output"> Verbose output
                        </label>
                        <label>
                            <input type="checkbox" id="bail-on-failure"> Bail on failure
                        </label>
                    </div>
                    
                    <div class="test-status">
                        <div id="test-status-text">Ready to run tests</div>
                        <div class="test-progress">
                            <div id="test-progress-bar" class="progress-bar"></div>
                        </div>
                    </div>
                    
                    <div class="test-results">
                        <div id="overall-results" class="overall-results hidden">
                            <h4>Overall Results</h4>
                            <div class="results-summary">
                                <span id="total-passed">0</span> passed, 
                                <span id="total-failed">0</span> failed, 
                                <span id="success-rate">0%</span> success rate
                            </div>
                            <div class="test-duration">
                                Duration: <span id="test-duration">0ms</span>
                            </div>
                        </div>
                        
                        <div id="suite-results" class="suite-results">
                            <div class="suite-result" data-suite="voice">
                                <span class="suite-name">Voice Tests</span>
                                <span class="suite-status">pending</span>
                            </div>
                            <div class="suite-result" data-suite="session">
                                <span class="suite-name">Session Tests</span>
                                <span class="suite-status">pending</span>
                            </div>
                            <div class="suite-result" data-suite="app">
                                <span class="suite-name">App Tests</span>
                                <span class="suite-status">pending</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(ui);
            this.setupEventListeners();
        }
    }

    /**
     * Setup event listeners for test runner UI
     */
    setupEventListeners() {
        // Close button
        document.getElementById('close-test-runner').addEventListener('click', () => {
            this.hideTestRunner();
        });
        
        // Run all tests
        document.getElementById('run-all-tests').addEventListener('click', () => {
            this.runAll(this.getUIConfig());
        });
        
        // Run specific test suites
        document.getElementById('run-voice-tests').addEventListener('click', () => {
            this.runTests(['voice']);
        });
        
        document.getElementById('run-session-tests').addEventListener('click', () => {
            this.runTests(['session']);
        });
        
        document.getElementById('run-app-tests').addEventListener('click', () => {
            this.runTests(['app']);
        });
        
        // Config change listeners
        document.getElementById('parallel-tests').addEventListener('change', (e) => {
            this.config.parallel = e.target.checked;
        });
        
        document.getElementById('verbose-output').addEventListener('change', (e) => {
            this.config.verbose = e.target.checked;
        });
        
        document.getElementById('bail-on-failure').addEventListener('change', (e) => {
            this.config.bail = e.target.checked;
        });
    }

    /**
     * Get configuration from UI
     */
    getUIConfig() {
        return {
            parallel: document.getElementById('parallel-tests').checked,
            verbose: document.getElementById('verbose-output').checked,
            bail: document.getElementById('bail-on-failure').checked
        };
    }

    /**
     * Show test runner UI
     */
    showTestRunner() {
        const ui = document.getElementById('test-runner-ui');
        if (ui) {
            ui.classList.remove('hidden');
        }
    }

    /**
     * Hide test runner UI
     */
    hideTestRunner() {
        const ui = document.getElementById('test-runner-ui');
        if (ui) {
            ui.classList.add('hidden');
        }
    }

    /**
     * Update test status
     */
    updateStatus(message) {
        const statusElement = document.getElementById('test-status-text');
        if (statusElement) {
            statusElement.textContent = message;
        }
    }

    /**
     * Update suite status
     */
    updateSuiteStatus(suiteName, status) {
        const suiteElement = document.querySelector(`[data-suite="${suiteName}"] .suite-status`);
        if (suiteElement) {
            suiteElement.textContent = status;
            suiteElement.className = `suite-status ${status}`;
        }
    }

    /**
     * Update overall results
     */
    updateOverallResults(results) {
        const overallElement = document.getElementById('overall-results');
        if (overallElement) {
            overallElement.classList.remove('hidden');
            
            document.getElementById('total-passed').textContent = results.passed;
            document.getElementById('total-failed').textContent = results.failed;
            document.getElementById('success-rate').textContent = results.successRate + '%';
            document.getElementById('test-duration').textContent = results.duration + 'ms';
        }
    }

    /**
     * Get test statistics
     */
    getStatistics() {
        return {
            suites: this.testSuites.size,
            lastRun: this.results.size > 0 ? {
                totalPassed: Array.from(this.results.values()).reduce((sum, r) => sum + (r.passed || 0), 0),
                totalFailed: Array.from(this.results.values()).reduce((sum, r) => sum + (r.failed || 0), 0),
                timestamp: new Date().toISOString()
            } : null,
            isRunning: this.isRunning
        };
    }
}

// Create and export test runner instance
const testRunner = new TestRunner();

// Global test runner functions
window.runAllTests = () => testRunner.runAll();
window.runVoiceTests = () => testRunner.runTests(['voice']);
window.runSessionTests = () => testRunner.runTests(['session']);
window.runAppTests = () => testRunner.runTests(['app']);
window.showTestRunner = () => testRunner.showTestRunner();

// Auto-run tests if specified in URL
if (window.location.search.includes('test=all')) {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            testRunner.runAll();
        }, 1000);
    });
}

// Add CSS for test runner UI
const style = document.createElement('style');
style.textContent = `
    .test-runner-ui {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 400px;
        max-height: 80vh;
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        overflow-y: auto;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    .test-runner-ui.hidden {
        display: none;
    }
    
    .test-runner-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
        background: #f8f9fa;
        border-bottom: 1px solid #ddd;
        border-radius: 8px 8px 0 0;
    }
    
    .test-runner-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
    }
    
    .close-btn {
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: #666;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .close-btn:hover {
        color: #333;
    }
    
    .test-runner-content {
        padding: 16px;
    }
    
    .test-controls {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 16px;
    }
    
    .test-controls .btn {
        padding: 6px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: white;
        cursor: pointer;
        font-size: 12px;
    }
    
    .test-controls .btn-primary {
        background: #007bff;
        color: white;
        border-color: #007bff;
    }
    
    .test-controls .btn-secondary {
        background: #6c757d;
        color: white;
        border-color: #6c757d;
    }
    
    .test-config {
        margin-bottom: 16px;
    }
    
    .test-config label {
        display: block;
        margin-bottom: 8px;
        font-size: 12px;
    }
    
    .test-config input {
        margin-right: 8px;
    }
    
    .test-status {
        margin-bottom: 16px;
    }
    
    .test-progress {
        width: 100%;
        height: 4px;
        background: #f0f0f0;
        border-radius: 2px;
        margin-top: 8px;
    }
    
    .progress-bar {
        height: 100%;
        background: #007bff;
        border-radius: 2px;
        transition: width 0.3s;
        width: 0%;
    }
    
    .overall-results {
        margin-bottom: 16px;
        padding: 12px;
        background: #f8f9fa;
        border-radius: 4px;
    }
    
    .overall-results h4 {
        margin: 0 0 8px 0;
        font-size: 14px;
    }
    
    .results-summary {
        font-size: 12px;
        margin-bottom: 4px;
    }
    
    .test-duration {
        font-size: 12px;
        color: #666;
    }
    
    .suite-result {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px solid #eee;
        font-size: 12px;
    }
    
    .suite-result:last-child {
        border-bottom: none;
    }
    
    .suite-status {
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 10px;
        font-weight: 500;
    }
    
    .suite-status.pending {
        background: #f8f9fa;
        color: #666;
    }
    
    .suite-status.running {
        background: #fff3cd;
        color: #856404;
    }
    
    .suite-status.passed {
        background: #d4edda;
        color: #155724;
    }
    
    .suite-status.failed {
        background: #f8d7da;
        color: #721c24;
    }
    
    .suite-status.error {
        background: #f8d7da;
        color: #721c24;
    }
    
    #total-passed {
        color: #28a745;
        font-weight: 600;
    }
    
    #total-failed {
        color: #dc3545;
        font-weight: 600;
    }
`;
document.head.appendChild(style);

console.log('🧪 Test Runner loaded. Available commands:');
console.log('  - runAllTests() - Run all test suites');
console.log('  - runVoiceTests() - Run voice recognition tests');
console.log('  - runSessionTests() - Run session management tests');
console.log('  - runAppTests() - Run application tests');
console.log('  - showTestRunner() - Show test runner UI');

export default testRunner;
export { TestRunner };