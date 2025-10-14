/**
 * VoiceRecognitionPage.js - Voice Recognition Testing Interface
 *
 * Provides a dedicated interface for testing voice recognition capabilities:
 * - Voice recognition controls (start/stop/test)
 * - Real-time transcription display
 * - Recognition confidence scoring
 * - Voice engine status monitoring
 * - Pattern matching results
 * - Quick access to voice training
 */

import IconLoader from '../utils/IconLoader.js';

export default class VoiceRecognitionPage {
  constructor(router) {
    this.router = router;
    this.container = null;
    this.app = window.app;
    this.voiceEngine = null;
    this.isListening = false;
    this.transcript = '';
    this.interimTranscript = '';
    this.recognitionResults = [];

    // Bound event handlers for cleanup
    this.boundHandlers = {
      startListening: this.startListening.bind(this),
      stopListening: this.stopListening.bind(this),
      testVoice: this.testVoice.bind(this),
      clearResults: this.clearResults.bind(this),
      onVoiceResult: this.onVoiceResult.bind(this),
      onVoiceStatus: this.onVoiceStatus.bind(this),
      goToTraining: this.goToTraining.bind(this),
      goToPackOpening: this.goToPackOpening.bind(this)
    };
  }

  render() {
    return `
      <div class="page-content">
        <!-- Page Header -->
        <div class="page-header">
          <div class="page-header-content">
            <div class="page-header-icon">
              <i data-lucide="mic" aria-hidden="true"></i>
            </div>
            <div class="page-header-text">
              <h1 class="page-title">Voice Recognition</h1>
              <p class="page-subtitle">Test and monitor voice recognition for Yu-Gi-Oh card identification</p>
            </div>
          </div>
        </div>

        <!-- Voice Engine Status -->
        <div class="glass-card" style="margin-bottom: 2rem;">
          <div class="card-header">
            <h2 class="card-title">
              <i data-lucide="activity" style="width: 20px; height: 20px;"></i>
              Voice Engine Status
            </h2>
          </div>
          <div class="card-body">
            <div class="voice-status-grid">
              <div class="voice-status-item">
                <div class="voice-status-label">Engine Status</div>
                <div class="voice-status-value" id="engine-status">
                  <span class="status-badge status-loading">Checking...</span>
                </div>
              </div>
              <div class="voice-status-item">
                <div class="voice-status-label">Browser Support</div>
                <div class="voice-status-value" id="browser-support">
                  <span class="status-badge status-loading">Checking...</span>
                </div>
              </div>
              <div class="voice-status-item">
                <div class="voice-status-label">Microphone Access</div>
                <div class="voice-status-value" id="mic-access">
                  <span class="status-badge status-loading">Checking...</span>
                </div>
              </div>
              <div class="voice-status-item">
                <div class="voice-status-label">Trained Patterns</div>
                <div class="voice-status-value" id="pattern-count">
                  <span class="status-badge">0</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Voice Controls -->
        <div class="glass-card" style="margin-bottom: 2rem;">
          <div class="card-header">
            <h2 class="card-title">
              <i data-lucide="mic-2" style="width: 20px; height: 20px;"></i>
              Voice Controls
            </h2>
          </div>
          <div class="card-body">
            <!-- Visual Status Indicator -->
            <div class="voice-visual-status" id="voice-visual-status">
              <div class="voice-status-icon" id="voice-status-icon">
                <i data-lucide="mic-off"></i>
              </div>
              <div class="voice-status-text" id="voice-status-text">
                Voice recognition is ready. Click "Start Listening" to begin.
              </div>
            </div>

            <!-- Control Buttons -->
            <div class="voice-button-group">
              <button id="start-listening-btn" class="btn btn-primary btn-lg" aria-label="Start listening">
                <i data-lucide="mic"></i>
                <span>Start Listening</span>
              </button>
              <button id="stop-listening-btn" class="btn btn-danger btn-lg" style="display: none;" aria-label="Stop listening">
                <i data-lucide="mic-off"></i>
                <span>Stop Listening</span>
              </button>
              <button id="test-voice-btn" class="btn btn-secondary" aria-label="Test microphone">
                <i data-lucide="volume-2"></i>
                <span>Test Microphone</span>
              </button>
              <button id="clear-results-btn" class="btn btn-secondary" aria-label="Clear results">
                <i data-lucide="trash-2"></i>
                <span>Clear Results</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Live Transcription -->
        <div class="glass-card" style="margin-bottom: 2rem;">
          <div class="card-header">
            <h2 class="card-title">
              <i data-lucide="type" style="width: 20px; height: 20px;"></i>
              Live Transcription
            </h2>
          </div>
          <div class="card-body">
            <div class="transcript-display" id="transcript-display">
              <div class="transcript-placeholder">
                <i data-lucide="ear"></i>
                <p>Transcription will appear here when you start speaking...</p>
              </div>
            </div>
            <div class="interim-transcript" id="interim-transcript" style="display: none;">
              <small class="text-secondary">Interim: <span id="interim-text"></span></small>
            </div>
          </div>
        </div>

        <!-- Recognition Results -->
        <div class="glass-card" style="margin-bottom: 2rem;">
          <div class="card-header">
            <h2 class="card-title">
              <i data-lucide="check-circle" style="width: 20px; height: 20px;"></i>
              Recognition Results
            </h2>
          </div>
          <div class="card-body">
            <div id="recognition-results">
              <div class="results-placeholder">
                <i data-lucide="search"></i>
                <p>Recognition results will appear here...</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="glass-card">
          <div class="card-header">
            <h2 class="card-title">
              <i data-lucide="zap" style="width: 20px; height: 20px;"></i>
              Quick Actions
            </h2>
          </div>
          <div class="card-body">
            <div class="quick-actions-grid">
              <button id="go-training-btn" class="quick-action-card">
                <i data-lucide="headphones"></i>
                <div class="quick-action-title">Voice Training</div>
                <div class="quick-action-desc">Manage voice patterns and training</div>
              </button>
              <button id="go-pack-opening-btn" class="quick-action-card">
                <i data-lucide="package"></i>
                <div class="quick-action-title">Pack Opening</div>
                <div class="quick-action-desc">Use voice recognition to open packs</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async mount(container) {
    this.container = container;
    this.container.innerHTML = this.render();

    // Initialize Lucide icons
    IconLoader.refreshIcons();

    // Initialize voice engine
    await this.initializeVoiceEngine();

    // Attach event listeners
    this.attachEventListeners();

    // Update status display
    this.updateStatus();

    console.log('VoiceRecognitionPage mounted');
  }

  async initializeVoiceEngine() {
    try {
      if (!this.app || !this.app.voiceEngine) {
        console.error('VoiceEngine not available');
        this.showError('Voice engine not initialized. Please refresh the page.');
        return;
      }

      this.voiceEngine = this.app.voiceEngine;

      // Set up voice engine event listeners
      if (this.voiceEngine.on) {
        this.voiceEngine.on('result', this.boundHandlers.onVoiceResult);
        this.voiceEngine.on('status', this.boundHandlers.onVoiceStatus);
      }
    } catch (error) {
      console.error('Failed to initialize voice engine:', error);
      this.showError('Failed to initialize voice engine: ' + error.message);
    }
  }

  attachEventListeners() {
    // Button event listeners
    const startBtn = document.getElementById('start-listening-btn');
    const stopBtn = document.getElementById('stop-listening-btn');
    const testBtn = document.getElementById('test-voice-btn');
    const clearBtn = document.getElementById('clear-results-btn');
    const trainingBtn = document.getElementById('go-training-btn');
    const packBtn = document.getElementById('go-pack-opening-btn');

    if (startBtn) startBtn.addEventListener('click', this.boundHandlers.startListening);
    if (stopBtn) stopBtn.addEventListener('click', this.boundHandlers.stopListening);
    if (testBtn) testBtn.addEventListener('click', this.boundHandlers.testVoice);
    if (clearBtn) clearBtn.addEventListener('click', this.boundHandlers.clearResults);
    if (trainingBtn) trainingBtn.addEventListener('click', this.boundHandlers.goToTraining);
    if (packBtn) packBtn.addEventListener('click', this.boundHandlers.goToPackOpening);
  }

  updateStatus() {
    // Engine status
    const engineStatus = document.getElementById('engine-status');
    if (engineStatus && this.voiceEngine) {
      const isAvailable = this.voiceEngine.isAvailable && this.voiceEngine.isAvailable();
      engineStatus.innerHTML = isAvailable
        ? '<span class="status-badge status-success">Ready</span>'
        : '<span class="status-badge status-error">Not Available</span>';
    }

    // Browser support
    const browserSupport = document.getElementById('browser-support');
    if (browserSupport) {
      const isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
      browserSupport.innerHTML = isSupported
        ? '<span class="status-badge status-success">Supported</span>'
        : '<span class="status-badge status-error">Not Supported</span>';
    }

    // Microphone access
    const micAccess = document.getElementById('mic-access');
    if (micAccess) {
      micAccess.innerHTML = '<span class="status-badge status-info">Click to test</span>';
    }

    // Pattern count
    const patternCount = document.getElementById('pattern-count');
    if (patternCount && this.voiceEngine && this.voiceEngine.learningEngine) {
      const count = this.voiceEngine.learningEngine.userPatterns?.size || 0;
      patternCount.innerHTML = `<span class="status-badge">${count}</span>`;
    }
  }

  async startListening() {
    if (!this.voiceEngine) {
      this.showError('Voice engine not available');
      return;
    }

    try {
      await this.voiceEngine.startListening();
      this.isListening = true;
      this.updateListeningUI(true);

      if (this.app && this.app.uiManager) {
        this.app.uiManager.showToast('Voice recognition started', 'success');
      }
    } catch (error) {
      console.error('Failed to start listening:', error);
      this.showError('Failed to start listening: ' + error.message);
    }
  }

  async stopListening() {
    if (!this.voiceEngine) return;

    try {
      await this.voiceEngine.stopListening();
      this.isListening = false;
      this.updateListeningUI(false);

      if (this.app && this.app.uiManager) {
        this.app.uiManager.showToast('Voice recognition stopped', 'info');
      }
    } catch (error) {
      console.error('Failed to stop listening:', error);
    }
  }

  async testVoice() {
    if (!this.voiceEngine) {
      this.showError('Voice engine not available');
      return;
    }

    try {
      // Update microphone access status
      const micAccess = document.getElementById('mic-access');
      if (micAccess) {
        micAccess.innerHTML = '<span class="status-badge status-loading">Testing...</span>';
      }

      await this.voiceEngine.testRecognition();

      if (micAccess) {
        micAccess.innerHTML = '<span class="status-badge status-success">Granted</span>';
      }

      if (this.app && this.app.uiManager) {
        this.app.uiManager.showToast('Microphone test successful!', 'success');
      }
    } catch (error) {
      console.error('Microphone test failed:', error);
      const micAccess = document.getElementById('mic-access');
      if (micAccess) {
        micAccess.innerHTML = '<span class="status-badge status-error">Denied</span>';
      }
      this.showError('Microphone test failed: ' + error.message);
    }
  }

  clearResults() {
    this.recognitionResults = [];
    this.transcript = '';
    this.interimTranscript = '';

    const resultsContainer = document.getElementById('recognition-results');
    if (resultsContainer) {
      resultsContainer.innerHTML = `
        <div class="results-placeholder">
          <i data-lucide="search"></i>
          <p>Recognition results will appear here...</p>
        </div>
      `;
      IconLoader.refreshIcons();
    }

    const transcriptDisplay = document.getElementById('transcript-display');
    if (transcriptDisplay) {
      transcriptDisplay.innerHTML = `
        <div class="transcript-placeholder">
          <i data-lucide="ear"></i>
          <p>Transcription will appear here when you start speaking...</p>
        </div>
      `;
      IconLoader.refreshIcons();
    }

    const interimContainer = document.getElementById('interim-transcript');
    if (interimContainer) {
      interimContainer.style.display = 'none';
    }

    if (this.app && this.app.uiManager) {
      this.app.uiManager.showToast('Results cleared', 'info');
    }
  }

  onVoiceResult(result) {
    console.log('Voice result received:', result);

    // Update transcript
    if (result.transcript) {
      this.transcript = result.transcript;
      this.updateTranscript(result.transcript, result.interim);
    }

    // Add to results if not interim
    if (!result.interim && result.cardName) {
      this.recognitionResults.unshift({
        timestamp: new Date(),
        transcript: result.transcript,
        cardName: result.cardName,
        cardNumber: result.cardNumber,
        confidence: result.confidence || 0,
        alternatives: result.alternatives || []
      });

      this.updateResults();
    }
  }

  onVoiceStatus(status) {
    console.log('Voice status:', status);
    this.updateVoiceStatus(status);
  }

  updateListeningUI(isListening) {
    const startBtn = document.getElementById('start-listening-btn');
    const stopBtn = document.getElementById('stop-listening-btn');
    const statusIcon = document.getElementById('voice-status-icon');
    const statusText = document.getElementById('voice-status-text');
    const visualStatus = document.getElementById('voice-visual-status');

    if (startBtn) startBtn.style.display = isListening ? 'none' : 'inline-flex';
    if (stopBtn) stopBtn.style.display = isListening ? 'inline-flex' : 'none';

    if (visualStatus) {
      if (isListening) {
        visualStatus.classList.add('listening');
      } else {
        visualStatus.classList.remove('listening');
      }
    }

    if (statusIcon) {
      statusIcon.innerHTML = isListening
        ? '<i data-lucide="mic"></i>'
        : '<i data-lucide="mic-off"></i>';
      IconLoader.refreshIcons();
    }

    if (statusText) {
      statusText.textContent = isListening
        ? 'Listening... Speak now to recognize Yu-Gi-Oh cards.'
        : 'Voice recognition is ready. Click "Start Listening" to begin.';
    }
  }

  updateVoiceStatus(status) {
    const statusText = document.getElementById('voice-status-text');
    if (!statusText) return;

    const statusMessages = {
      ready: 'Voice recognition is ready.',
      listening: 'Listening... Speak now.',
      processing: 'Processing your voice input...',
      error: 'An error occurred with voice recognition.',
      'no-speech': 'No speech detected. Please try again.',
      'not-allowed': 'Microphone access denied.',
      'network-error': 'Network error occurred.'
    };

    statusText.textContent = statusMessages[status] || status;
  }

  updateTranscript(text, isInterim = false) {
    const transcriptDisplay = document.getElementById('transcript-display');
    const interimContainer = document.getElementById('interim-transcript');
    const interimText = document.getElementById('interim-text');

    if (isInterim) {
      // Update interim transcript
      this.interimTranscript = text;
      if (interimContainer && interimText) {
        interimContainer.style.display = 'block';
        interimText.textContent = text;
      }
    } else {
      // Update final transcript
      if (transcriptDisplay) {
        transcriptDisplay.innerHTML = `
          <div class="transcript-text">${this.escapeHtml(text)}</div>
        `;
      }
      // Hide interim
      if (interimContainer) {
        interimContainer.style.display = 'none';
      }
      this.interimTranscript = '';
    }
  }

  updateResults() {
    const resultsContainer = document.getElementById('recognition-results');
    if (!resultsContainer) return;

    if (this.recognitionResults.length === 0) {
      resultsContainer.innerHTML = `
        <div class="results-placeholder">
          <i data-lucide="search"></i>
          <p>Recognition results will appear here...</p>
        </div>
      `;
      IconLoader.refreshIcons();
      return;
    }

    const resultsHtml = this.recognitionResults.map((result, index) => `
      <div class="recognition-result-card" style="animation-delay: ${index * 50}ms;">
        <div class="result-header">
          <div class="result-time">
            <i data-lucide="clock"></i>
            <span>${this.formatTime(result.timestamp)}</span>
          </div>
          <div class="result-confidence">
            <span class="confidence-badge confidence-${this.getConfidenceLevel(result.confidence)}">
              ${(result.confidence * 100).toFixed(0)}% confidence
            </span>
          </div>
        </div>
        <div class="result-body">
          <div class="result-transcript">
            <strong>You said:</strong> "${this.escapeHtml(result.transcript)}"
          </div>
          <div class="result-match">
            <strong>Recognized as:</strong>
            <span class="card-name">${this.escapeHtml(result.cardName)}</span>
            ${result.cardNumber ? `<span class="card-number">#${this.escapeHtml(result.cardNumber)}</span>` : ''}
          </div>
          ${result.alternatives && result.alternatives.length > 0 ? `
            <div class="result-alternatives">
              <strong>Alternatives:</strong>
              <ul>
                ${result.alternatives.slice(0, 3).map(alt => `
                  <li>${this.escapeHtml(alt.cardName)} (${(alt.confidence * 100).toFixed(0)}%)</li>
                `).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      </div>
    `).join('');

    resultsContainer.innerHTML = resultsHtml;
    IconLoader.refreshIcons();
  }

  getConfidenceLevel(confidence) {
    if (confidence >= 0.8) return 'high';
    if (confidence >= 0.5) return 'medium';
    return 'low';
  }

  formatTime(date) {
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    return date.toLocaleTimeString();
  }

  goToTraining() {
    if (this.router) {
      this.router.navigate('training');
    }
  }

  goToPackOpening() {
    if (this.router) {
      this.router.navigate('pack-opening');
    }
  }

  showError(message) {
    if (this.app && this.app.uiManager) {
      this.app.uiManager.showToast(message, 'error');
    } else {
      console.error(message);
      alert(message);
    }
  }

  escapeHtml(text) {
    if (typeof text !== 'string') return text;
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async unmount() {
    // Stop listening if active
    if (this.isListening && this.voiceEngine) {
      await this.voiceEngine.stopListening();
    }

    // Remove voice engine event listeners
    if (this.voiceEngine && this.voiceEngine.off) {
      this.voiceEngine.off('result', this.boundHandlers.onVoiceResult);
      this.voiceEngine.off('status', this.boundHandlers.onVoiceStatus);
    }

    // Remove DOM event listeners
    const startBtn = document.getElementById('start-listening-btn');
    const stopBtn = document.getElementById('stop-listening-btn');
    const testBtn = document.getElementById('test-voice-btn');
    const clearBtn = document.getElementById('clear-results-btn');
    const trainingBtn = document.getElementById('go-training-btn');
    const packBtn = document.getElementById('go-pack-opening-btn');

    if (startBtn) startBtn.removeEventListener('click', this.boundHandlers.startListening);
    if (stopBtn) stopBtn.removeEventListener('click', this.boundHandlers.stopListening);
    if (testBtn) testBtn.removeEventListener('click', this.boundHandlers.testVoice);
    if (clearBtn) clearBtn.removeEventListener('click', this.boundHandlers.clearResults);
    if (trainingBtn) trainingBtn.removeEventListener('click', this.boundHandlers.goToTraining);
    if (packBtn) packBtn.removeEventListener('click', this.boundHandlers.goToPackOpening);

    // Clear container
    if (this.container) {
      this.container.innerHTML = '';
    }

    console.log('VoiceRecognitionPage unmounted');
  }
}
