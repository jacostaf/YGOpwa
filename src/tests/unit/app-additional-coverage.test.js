import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import YGORipperApp from '../../js/app.js';

describe('YGORipperApp - Additional Coverage Aligned With Implementation', () => {
  let app;
  let mockLogger;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="loading-screen"><div class="loading-text">Loading...</div></div>
      <div id="app" class="hidden"></div>
    `;

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn()
    };

    app = new YGORipperApp({ skipInitialization: true });
    app.logger = mockLogger;

    app.uiManager = {
      initialize: vi.fn(),
      showToast: vi.fn(),
      updateSessionInfo: vi.fn(),
      updateVoiceStatus: vi.fn()
    };

    app.storage = {
      initialize: vi.fn(),
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(true)
    };

    app.sessionManager = {
      initialize: vi.fn().mockResolvedValue(true),
      getCurrentSessionInfo: vi.fn().mockReturnValue({ cardCount: 0 }),
      addCard: vi.fn().mockResolvedValue(true),
      saveSession: vi.fn().mockResolvedValue(true),
      isSessionActive: vi.fn(() => true),
      processVoiceInput: vi.fn().mockResolvedValue([]),
      setVoiceEngine: vi.fn(),
      updateSettings: vi.fn()
    };

    app.permissionManager = {
      checkMicrophonePermission: vi.fn().mockResolvedValue('granted')
    };

    app.voiceEngine = {
      initialize: vi.fn().mockResolvedValue(true)
    };
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('handles voice engine initialization failures gracefully', async () => {
    const initError = new Error('Microphone permission denied');
    app.voiceEngine.initialize.mockRejectedValue(initError);

    const initializeSpy = app.voiceEngine.initialize;

    await app.safeInitializeVoice();

    expect(initializeSpy).toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalledWith('Voice engine initialization failed:', initError);
    expect(app.uiManager.showToast).toHaveBeenCalledWith(
      'Voice recognition not available. You can still type card names manually.',
      'info'
    );
  });

  it('retries session initialization when the first attempt fails', async () => {
    const firstError = new Error('session init failed');
    app.sessionManager.initialize
      .mockRejectedValueOnce(firstError)
      .mockResolvedValueOnce(true);

    await app.safeInitializeSession();

    expect(mockLogger.error).toHaveBeenCalledWith('Session manager initialization failed:', firstError);
    expect(app.uiManager.showToast).toHaveBeenCalledWith(
      'Session data was corrupted and has been reset.',
      'warning'
    );
  });

  it('merges stored settings with defaults when loading settings', async () => {
    app.storage.get.mockResolvedValue({ theme: 'light' });

    await app.loadSettings();

    expect(app.settings.theme).toBe('light');
    expect(app.settings).toHaveProperty('voiceTimeout', 5000);
    expect(app.settings).toHaveProperty('autoConfirm', false);
  });

  it('handles settings save failures gracefully', async () => {
    const error = new Error('Storage full');
    app.storage.set.mockRejectedValue(error);

    await expect(app.saveSettings()).rejects.toThrow(error);
    expect(mockLogger.error).toHaveBeenCalledWith('Failed to save settings:', error);
  });

  it('falls back to minimal card data when safeAddCard throws', async () => {
    const addCardError = new Error('Network failure');
    app.sessionManager.addCard
      .mockImplementationOnce(() => {
        throw addCardError;
      })
      .mockResolvedValueOnce(true);

    await app.safeAddCard({ name: 'Test Card' });

    expect(mockLogger.error).toHaveBeenCalledWith('Failed to add card:', addCardError);
    expect(app.sessionManager.addCard).toHaveBeenCalledTimes(2);
    expect(app.uiManager.showToast).toHaveBeenCalledWith(
      'Added Test Card (some data may be missing)',
      'warning'
    );
  });

  it('updates UI state when voice errors occur', () => {
    app.handleVoiceError({ type: 'network-error' });

    expect(mockLogger.error).toHaveBeenCalledWith('Voice recognition error:', { type: 'network-error' });
    expect(app.uiManager.updateVoiceStatus).toHaveBeenCalledWith('error');
    expect(app.uiManager.showToast).toHaveBeenCalledWith(
      'Network connection is required for voice recognition. Please check your internet connection.',
      'error'
    );
  });
});
