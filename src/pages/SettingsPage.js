/**
 * SettingsPage.js - Application Settings Management
 *
 * Complete implementation for Phase 10: Settings Page
 * Provides interface for managing voice recognition settings and general application settings.
 *
 * Features:
 * - Voice Recognition Settings (9 settings)
 * - General Settings (3 settings)
 * - Real-time preview (settings apply immediately)
 * - Save/Reset functionality
 * - Form validation
 * - Toast notifications
 * - Glassmorphism styling
 */

import ToggleSwitch from '../components/ToggleSwitch.js';
import themeManager from '../themes/ThemeManager.js';
import { authService } from '../services/authService.js';

export default class SettingsPage {
  constructor(router) {
    this.router = router;
    this.container = null;
    this.app = null;

    // State
    this.currentSettings = {};
    this.originalSettings = {};
    this.hasChanges = false;
    this.toggleSwitches = {};

    // Bound handlers
    this.boundHandlers = {
      handleSave: this.handleSave.bind(this),
      handleReset: this.handleReset.bind(this),
      handleThemeChange: this.handleThemeChange.bind(this),
      handleSliderChange: this.handleSliderChange.bind(this),
      handleInputChange: this.handleInputChange.bind(this),
      handleToggleChange: this.handleToggleChange.bind(this),
      handleProfileUpdate: this.handleProfileUpdate.bind(this)
    };
  }

  /**
   * Get current username from auth service
   */
  getProfileUsername() {
    const profile = authService?.profile;
    return profile?.display_name || '';
  }

  /**
   * Handle profile update
   */
  async handleProfileUpdate() {
    const input = this.container.querySelector('#profileUsername');
    const btn = this.container.querySelector('#saveProfileBtn');

    if (!input || !btn) return;

    const newUsername = input.value.trim();
    const currentUsername = this.getProfileUsername();

    if (!newUsername) {
      this.showToast('Username cannot be empty', 'error');
      return;
    }

    if (newUsername === currentUsername) {
      this.showToast('No changes to save', 'info');
      return;
    }

    // Validate username format (alphanumeric + underscore, 3-20 chars)
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(newUsername)) {
      this.showToast('Username must be 3-20 characters, alphanumeric or underscore', 'error');
      return;
    }

    try {
      btn.disabled = true;
      btn.innerHTML = '<i data-lucide="loader-2" class="animate-spin"></i> Saving...';

      if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();

      const { error } = await authService.updateProfile({ display_name: newUsername });

      if (error) {
        if (error.code === '23505') { // Unique violation
          this.showToast('Username is already taken', 'error');
        } else {
          throw error;
        }
      } else {
        this.showToast('Username updated successfully', 'success');
        // Refresh page to show new state if needed, though auth listener might handle it
      }
    } catch (err) {
      console.error('Profile update failed:', err);
      this.showToast('Failed to update username', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Update';
    }
  }

  /**
   * Render the page
   */
  render() {
    return `
      <div class="page-content settings-page">
        <!-- Profile Settings -->
        <div class="settings-section bg-neutral-900/40 backdrop-blur-sm border border-neutral-800/50 rounded-xl">
          <div class="section-header">
            <h2><i data-lucide="user"></i> Profile Settings</h2>
            <p class="section-description">Manage your public profile information</p>
          </div>

          <div class="settings-list">
            <!-- Username -->
            <div class="setting-item">
              <div class="setting-info">
                <label for="profileUsername" class="setting-label">Username</label>
                <p class="setting-description">Your unique display name across the platform</p>
              </div>
              <div class="setting-control">
                <div class="input-group">
                  <input
                    type="text"
                    id="profileUsername"
                    class="setting-input-text"
                    placeholder="Enter username"
                    value="${this.getProfileUsername()}"
                    maxlength="20"
                  >
                  <button class="btn btn-sm btn-secondary" id="saveProfileBtn">
                    Update
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Voice Recognition Settings -->
        <div class="settings-section bg-neutral-900/40 backdrop-blur-sm border border-neutral-800/50 rounded-xl">
          <div class="section-header">
            <h2><i data-lucide="mic"></i> Voice Recognition</h2>
            <p class="section-description">Configure voice recognition behavior and accuracy</p>
          </div>

          <div class="settings-list">
            <!-- 1. Enable Auto-confirm -->
            <div class="setting-item" id="setting-autoConfirm">
              <!-- Toggle will be mounted here -->
            </div>

            <!-- 2. Auto-confirm Threshold -->
            <div class="setting-item">
              <div class="setting-info">
                <label for="autoConfirmThreshold" class="setting-label">Auto-confirm Threshold</label>
                <p class="setting-description">Minimum confidence level (%) required for automatic card confirmation</p>
              </div>
              <div class="setting-control">
                <input
                  type="range"
                  id="autoConfirmThreshold"
                  class="setting-slider"
                  min="0"
                  max="100"
                  step="5"
                  value="${this.currentSettings.autoConfirmThreshold || 85}"
                >
                <span class="slider-value">${this.currentSettings.autoConfirmThreshold || 85}%</span>
              </div>
            </div>

            <!-- 3. Voice Confidence Threshold -->
            <div class="setting-item">
              <div class="setting-info">
                <label for="voiceConfidenceThreshold" class="setting-label">Voice Confidence Threshold</label>
                <p class="setting-description">Minimum confidence level (%) for accepting voice results</p>
              </div>
              <div class="setting-control">
                <input
                  type="range"
                  id="voiceConfidenceThreshold"
                  class="setting-slider"
                  min="0"
                  max="100"
                  step="5"
                  value="${Math.round((this.currentSettings.voiceConfidenceThreshold || 0.5) * 100)}"
                >
                <span class="slider-value">${Math.round((this.currentSettings.voiceConfidenceThreshold || 0.5) * 100)}%</span>
              </div>
            </div>

            <!-- 4. Max Voice Alternatives -->
            <div class="setting-item">
              <div class="setting-info">
                <label for="voiceMaxAlternatives" class="setting-label">Max Voice Alternatives</label>
                <p class="setting-description">Maximum number of alternative recognition results to consider (1-10)</p>
              </div>
              <div class="setting-control">
                <input
                  type="number"
                  id="voiceMaxAlternatives"
                  class="setting-input-number"
                  min="1"
                  max="10"
                  value="${this.currentSettings.voiceMaxAlternatives || 5}"
                >
              </div>
            </div>

            <!-- 5. Continuous Listening -->
            <div class="setting-item" id="setting-voiceContinuous">
              <!-- Toggle will be mounted here -->
            </div>

            <!-- 6. Show Interim Results -->
            <div class="setting-item" id="setting-voiceInterimResults">
              <!-- Toggle will be mounted here -->
            </div>

            <!-- 7. Live Transcript Display -->
            <div class="setting-item" id="setting-liveTranscript">
              <!-- Toggle will be mounted here -->
            </div>

            <!-- 8. Auto-extract Rarity -->
            <div class="setting-item" id="setting-autoExtractRarity">
              <!-- Toggle will be mounted here -->
            </div>

            <!-- 9. Auto-extract Art Variant -->
            <div class="setting-item" id="setting-autoExtractArtVariant">
              <!-- Toggle will be mounted here -->
            </div>

            <!-- 10. Auto-extract Set -->
            <div class="setting-item" id="setting-autoExtractSet">
              <!-- Toggle will be mounted here -->
            </div>

            <!-- 11. Flexible Extraction (Order-Independent) -->
            <div class="setting-item" id="setting-useFlexibleExtraction">
              <!-- Toggle will be mounted here -->
            </div>

            <!-- 12. Extraction Confidence Threshold -->
            <div class="setting-item">
              <div class="setting-info">
                <label for="extractionConfidenceThreshold" class="setting-label">Extraction Confidence Threshold</label>
                <p class="setting-description">Minimum confidence to auto-add cards (0.5-1.0). Below this shows confirmation dialog.</p>
              </div>
              <div class="setting-control">
                <input
                  type="number"
                  id="extractionConfidenceThreshold"
                  class="setting-input-number"
                  min="0.5"
                  max="1.0"
                  step="0.05"
                  value="${this.currentSettings.extractionConfidenceThreshold || 0.75}"
                >
              </div>
            </div>
          </div>
        </div>

        <!-- General Settings -->
        <div class="settings-section bg-neutral-900/40 backdrop-blur-sm border border-neutral-800/50 rounded-xl">
          <div class="section-header">
            <h2><i data-lucide="sliders"></i> General Settings</h2>
            <p class="section-description">General application preferences</p>
          </div>

          <div class="settings-list">
            <!-- 1. Voice Timeout -->
            <div class="setting-item">
              <div class="setting-info">
                <label for="voiceTimeout" class="setting-label">Voice Timeout</label>
                <p class="setting-description">Maximum listening duration in seconds (1-10)</p>
              </div>
              <div class="setting-control">
                <input
                  type="number"
                  id="voiceTimeout"
                  class="setting-input-number"
                  min="1"
                  max="10"
                  step="1"
                  value="${(this.currentSettings.voiceTimeout || 5000) / 1000}"
                >
                <span class="input-unit">seconds</span>
              </div>
            </div>

            <!-- 2. Auto-save Sessions -->
            <div class="setting-item" id="setting-sessionAutoSave">
              <!-- Toggle will be mounted here -->
            </div>

            <!-- 3. Theme Selector -->
            <div class="setting-item">
              <div class="setting-info">
                <label for="themeSelect" class="setting-label">Theme</label>
                <p class="setting-description">Choose your preferred color theme</p>
              </div>
              <div class="setting-control">
                <select id="themeSelect" class="setting-select">
                  <option value="dusk" ${this.currentSettings.theme === 'dusk' ? 'selected' : ''}>Dusk</option>
                  <option value="dark" ${this.currentSettings.theme === 'dark' ? 'selected' : ''}>Dark</option>
                  <option value="light" ${this.currentSettings.theme === 'light' ? 'selected' : ''}>Light</option>
                  <option value="blue" ${this.currentSettings.theme === 'blue' ? 'selected' : ''}>Blue</option>
                  <option value="violet" ${this.currentSettings.theme === 'violet' ? 'selected' : ''}>Violet</option>
                  <option value="emerald" ${this.currentSettings.theme === 'emerald' ? 'selected' : ''}>Emerald</option>
                  <option value="rose" ${this.currentSettings.theme === 'rose' ? 'selected' : ''}>Rose</option>
                  <option value="amber" ${this.currentSettings.theme === 'amber' ? 'selected' : ''}>Amber</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="settings-actions bg-neutral-900/40 backdrop-blur-sm border border-neutral-800/50 rounded-xl">
          <button class="btn btn-danger btn-reset">
            <i data-lucide="rotate-ccw"></i>
            Reset to Defaults
          </button>
          <button class="btn btn-primary btn-save ${!this.hasChanges ? 'btn-disabled' : ''}">
            <i data-lucide="save"></i>
            Save Settings
          </button>
        </div>

        <!-- Info Section -->
        <div class="settings-info-card bg-neutral-900/40 backdrop-blur-sm border border-neutral-800/50 rounded-xl">
          <div class="info-icon">
            <i data-lucide="info"></i>
          </div>
          <div class="info-content">
            <h3>About Settings</h3>
            <ul>
              <li><strong>Auto-confirm:</strong> Automatically adds cards when confidence is above the threshold</li>
              <li><strong>Continuous Listening:</strong> Keeps microphone active for multiple recognitions</li>
              <li><strong>Interim Results:</strong> Shows real-time transcription as you speak</li>
              <li><strong>Flexible Extraction:</strong> Say card name, rarity, set in any order ("LP25 secret rare blue eyes")</li>
              <li><strong>Settings are saved locally</strong> and persist across sessions</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Mount page to container
   */
  async mount(container) {
    this.container = container;

    // Get app instance from router
    this.app = this.router.app;

    // Inject ToggleSwitch styles
    ToggleSwitch.injectStyles();

    // Load current settings
    await this.loadSettings();

    // Render page
    this.container.innerHTML = this.render();

    // Mount toggle switches
    this.mountToggleSwitches();

    // Attach event listeners
    this.attachEventListeners();

    // Initialize Lucide icons
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }

    console.log('SettingsPage mounted');
  }

  /**
   * Load settings from app
   */
  async loadSettings() {
    try {
      if (this.app && this.app.settings) {
        // Clone settings to avoid mutating app settings directly
        this.currentSettings = { ...this.app.settings };
        this.originalSettings = { ...this.app.settings };
      } else {
        // Use default settings if app not available
        this.currentSettings = this.getDefaultSettings();
        this.originalSettings = { ...this.currentSettings };
      }

      console.log('Settings loaded:', this.currentSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
      this.currentSettings = this.getDefaultSettings();
      this.originalSettings = { ...this.currentSettings };
    }
  }

  /**
   * Get default settings
   */
  getDefaultSettings() {
    return {
      theme: 'dark',
      voiceTimeout: 5000,
      voiceLanguage: 'en-US',
      autoPriceRefresh: false,
      sessionAutoSave: true,
      debugMode: false,
      autoConfirm: false,
      autoConfirmThreshold: 85,
      voiceConfidenceThreshold: 0.5,
      voiceMaxAlternatives: 5,
      voiceContinuous: true,
      voiceInterimResults: true,
      liveTranscript: true,
      autoExtractRarity: false,
      autoExtractArtVariant: false,
      autoExtractSet: false,
      useFlexibleExtraction: false,
      extractionConfidenceThreshold: 0.75
    };
  }

  /**
   * Mount all toggle switches
   */
  mountToggleSwitches() {
    // Toggle switch configurations
    const toggleConfigs = [
      {
        id: 'setting-autoConfirm',
        key: 'autoConfirm',
        label: 'Enable Auto-confirm',
        description: 'Automatically add cards when confidence exceeds the threshold'
      },
      {
        id: 'setting-voiceContinuous',
        key: 'voiceContinuous',
        label: 'Continuous Listening',
        description: 'Keep microphone active for multiple card recognitions in a row'
      },
      {
        id: 'setting-voiceInterimResults',
        key: 'voiceInterimResults',
        label: 'Show Interim Results',
        description: 'Display real-time transcription as you speak'
      },
      {
        id: 'setting-liveTranscript',
        key: 'liveTranscript',
        label: 'Live Transcript Display',
        description: 'Show live voice transcription in the interface'
      },
      {
        id: 'setting-autoExtractRarity',
        key: 'autoExtractRarity',
        label: 'Auto-extract Rarity',
        description: 'Automatically detect and extract rarity from card names'
      },
      {
        id: 'setting-autoExtractArtVariant',
        key: 'autoExtractArtVariant',
        label: 'Auto-extract Art Variant',
        description: 'Automatically detect and extract art variant info (e.g., "1st Edition")'
      },
      {
        id: 'setting-autoExtractSet',
        key: 'autoExtractSet',
        label: 'Auto-extract Set',
        description: 'Automatically detect and extract set code/name from voice input'
      },
      {
        id: 'setting-useFlexibleExtraction',
        key: 'useFlexibleExtraction',
        label: 'Flexible Extraction',
        description: 'Extract name, rarity, set, and art from voice in any order (replaces individual auto-extract options above)'
      },
      {
        id: 'setting-sessionAutoSave',
        key: 'sessionAutoSave',
        label: 'Auto-save Sessions',
        description: 'Automatically save session data periodically'
      }
    ];

    // Mount each toggle
    toggleConfigs.forEach(config => {
      const container = this.container.querySelector(`#${config.id}`);
      if (container) {
        const toggle = new ToggleSwitch({
          id: config.key,
          name: config.key,
          label: config.label,
          description: config.description,
          checked: this.currentSettings[config.key] || false,
          onChange: this.boundHandlers.handleToggleChange
        });

        toggle.mount(container);
        this.toggleSwitches[config.key] = toggle;
      }
    });

    // Apply initial state: grey out auto-extract toggles if flexible extraction is on
    if (this.currentSettings.useFlexibleExtraction) {
      this.updateAutoExtractToggles(true);
    }
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    if (!this.container) return;

    // Save button
    const saveBtn = this.container.querySelector('.btn-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', this.boundHandlers.handleSave);
    }

    // Reset button
    const resetBtn = this.container.querySelector('.btn-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', this.boundHandlers.handleReset);
    }

    // Theme selector
    const themeSelect = this.container.querySelector('#themeSelect');
    if (themeSelect) {
      themeSelect.addEventListener('change', this.boundHandlers.handleThemeChange);
    }

    // Sliders
    const sliders = this.container.querySelectorAll('.setting-slider');
    sliders.forEach(slider => {
      slider.addEventListener('input', this.boundHandlers.handleSliderChange);
    });

    // Number inputs
    const numberInputs = this.container.querySelectorAll('.setting-input-number');
    numberInputs.forEach(input => {
      input.addEventListener('change', this.boundHandlers.handleInputChange);
      input.addEventListener('blur', this.boundHandlers.handleInputChange);
    });

    // Profile update button
    const profileBtn = this.container.querySelector('#saveProfileBtn');
    if (profileBtn) {
      profileBtn.addEventListener('click', this.boundHandlers.handleProfileUpdate);
    }
  }

  /**
   * Handle toggle change
   */
  handleToggleChange(checked, id, name) {
    console.log(`Toggle changed: ${name} = ${checked}`);

    // Update current settings
    this.currentSettings[name] = checked;

    // When flexible extraction is toggled, disable/enable individual auto-extract toggles
    if (name === 'useFlexibleExtraction') {
      this.updateAutoExtractToggles(checked);
    }

    // Mark as changed
    this.markAsChanged();

    // Apply preview (some settings can be previewed immediately)
    this.applyPreview();
  }

  /**
   * Enable/disable individual auto-extract toggles based on flexible extraction state
   */
  updateAutoExtractToggles(flexEnabled) {
    const dependentKeys = ['autoExtractRarity', 'autoExtractArtVariant', 'autoExtractSet'];

    dependentKeys.forEach(key => {
      const toggle = this.toggleSwitches[key];
      if (!toggle) return;

      const container = this.container.querySelector(`#setting-${key}`);
      if (!container) return;

      if (flexEnabled) {
        // Disable and grey out — flex handles everything
        container.style.opacity = '0.4';
        container.style.pointerEvents = 'none';
      } else {
        // Re-enable
        container.style.opacity = '1';
        container.style.pointerEvents = 'auto';
      }
    });
  }

  /**
   * Handle slider change
   */
  handleSliderChange(e) {
    const slider = e.target;
    const value = parseInt(slider.value);
    const id = slider.id;

    // Update value display
    const valueDisplay = slider.parentElement.querySelector('.slider-value');
    if (valueDisplay) {
      valueDisplay.textContent = `${value}%`;
    }

    // Update current settings
    if (id === 'voiceConfidenceThreshold') {
      // Convert percentage to decimal (0-1)
      this.currentSettings[id] = value / 100;
    } else {
      this.currentSettings[id] = value;
    }

    // Mark as changed
    this.markAsChanged();

    console.log(`Slider changed: ${id} = ${this.currentSettings[id]}`);
  }

  /**
   * Handle input change
   */
  handleInputChange(e) {
    const input = e.target;
    const id = input.id;

    // Use parseFloat for decimal inputs, parseInt for integers
    const isDecimalInput = id === 'extractionConfidenceThreshold';
    let value = isDecimalInput ? parseFloat(input.value) : parseInt(input.value);

    // Validate value
    const min = parseFloat(input.min);
    const max = parseFloat(input.max);

    if (isNaN(value)) {
      value = min;
      input.value = min;
    } else if (value < min) {
      value = min;
      input.value = min;
    } else if (value > max) {
      value = max;
      input.value = max;
    }

    // Update current settings
    if (id === 'voiceTimeout') {
      // Convert seconds to milliseconds
      this.currentSettings[id] = value * 1000;
    } else {
      this.currentSettings[id] = value;
    }

    // Mark as changed
    this.markAsChanged();

    console.log(`Input changed: ${id} = ${this.currentSettings[id]}`);
  }

  /**
   * Handle theme change
   */
  handleThemeChange(e) {
    const theme = e.target.value;
    console.log(`Theme changed: ${theme}`);

    // Update current settings
    this.currentSettings.theme = theme;

    // Apply theme immediately (preview)
    if (themeManager && typeof themeManager.applyTheme === 'function') {
      themeManager.applyTheme(theme, false); // Don't persist yet
    }

    // Mark as changed
    this.markAsChanged();
  }

  /**
   * Mark settings as changed
   */
  markAsChanged() {
    // Check if settings actually changed
    const hasChanges = JSON.stringify(this.currentSettings) !== JSON.stringify(this.originalSettings);

    if (hasChanges !== this.hasChanges) {
      this.hasChanges = hasChanges;
      this.updateSaveButton();
      this.updateUnsavedIndicator();
    }
  }

  /**
   * Update save button state
   */
  updateSaveButton() {
    const saveBtn = this.container.querySelector('.btn-save');
    if (saveBtn) {
      if (this.hasChanges) {
        saveBtn.classList.remove('btn-disabled');
        saveBtn.disabled = false;
      } else {
        saveBtn.classList.add('btn-disabled');
        saveBtn.disabled = true;
      }
    }
  }

  /**
   * Update unsaved indicator
   */
  updateUnsavedIndicator() {
    const pageHeader = this.container.querySelector('.page-header');
    if (!pageHeader) return;

    let indicator = pageHeader.querySelector('.unsaved-indicator');

    if (this.hasChanges && !indicator) {
      // Add indicator
      indicator = document.createElement('div');
      indicator.className = 'unsaved-indicator';
      indicator.innerHTML = '<i data-lucide="alert-circle"></i> Unsaved changes';
      pageHeader.appendChild(indicator);

      // Re-initialize Lucide icons
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    } else if (!this.hasChanges && indicator) {
      // Remove indicator
      indicator.remove();
    }
  }

  /**
   * Apply preview (non-destructive)
   */
  applyPreview() {
    // Some settings can be previewed immediately without saving
    // For now, we only preview theme (already handled in handleThemeChange)
    console.log('Preview applied');
  }

  /**
   * Handle save
   */
  async handleSave() {
    if (!this.hasChanges) {
      this.showToast('No changes to save', 'info');
      return;
    }

    try {
      console.log('Saving settings:', this.currentSettings);

      // Validate settings
      if (!this.validateSettings()) {
        this.showToast('Invalid settings. Please check your inputs.', 'error');
        return;
      }

      // Save to app
      if (this.app && typeof this.app.handleSettingsSave === 'function') {
        await this.app.handleSettingsSave(this.currentSettings);
      } else if (this.app) {
        // Fallback: manually update and save
        this.app.settings = { ...this.currentSettings };
        if (typeof this.app.saveSettings === 'function') {
          await this.app.saveSettings();
        }

        // Update components
        if (this.app.voiceEngine && typeof this.app.voiceEngine.updateConfig === 'function') {
          this.app.voiceEngine.updateConfig(this.currentSettings);
        }

        if (this.app.sessionManager && typeof this.app.sessionManager.updateSettings === 'function') {
          this.app.sessionManager.updateSettings(this.currentSettings);
        }

        // Apply theme persistently
        if (themeManager && typeof themeManager.applyTheme === 'function') {
          themeManager.applyTheme(this.currentSettings.theme, true);
        }
      }

      // Update original settings
      this.originalSettings = { ...this.currentSettings };
      this.hasChanges = false;
      this.updateSaveButton();
      this.updateUnsavedIndicator();

      this.showToast('Settings saved successfully', 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showToast('Failed to save settings', 'error');
    }
  }

  /**
   * Handle reset
   */
  async handleReset() {
    const confirmed = confirm(
      'Are you sure you want to reset all settings to defaults?\n\nThis action cannot be undone.'
    );

    if (!confirmed) return;

    try {
      console.log('Resetting settings to defaults');

      // Get default settings
      const defaults = this.getDefaultSettings();

      // Update current settings
      this.currentSettings = { ...defaults };

      // Save to app
      if (this.app && typeof this.app.handleSettingsSave === 'function') {
        await this.app.handleSettingsSave(this.currentSettings);
      } else if (this.app) {
        this.app.settings = { ...this.currentSettings };
        if (typeof this.app.saveSettings === 'function') {
          await this.app.saveSettings();
        }
      }

      // Update original settings
      this.originalSettings = { ...this.currentSettings };
      this.hasChanges = false;

      // Reload page to reflect changes
      this.refreshPage();

      this.showToast('Settings reset to defaults', 'success');
    } catch (error) {
      console.error('Error resetting settings:', error);
      this.showToast('Failed to reset settings', 'error');
    }
  }

  /**
   * Validate settings
   */
  validateSettings() {
    try {
      // Validate voice timeout (1-10 seconds)
      if (this.currentSettings.voiceTimeout < 1000 || this.currentSettings.voiceTimeout > 10000) {
        console.error('Invalid voiceTimeout:', this.currentSettings.voiceTimeout);
        return false;
      }

      // Validate auto-confirm threshold (0-100)
      if (this.currentSettings.autoConfirmThreshold < 0 || this.currentSettings.autoConfirmThreshold > 100) {
        console.error('Invalid autoConfirmThreshold:', this.currentSettings.autoConfirmThreshold);
        return false;
      }

      // Validate voice confidence threshold (0-1)
      if (this.currentSettings.voiceConfidenceThreshold < 0 || this.currentSettings.voiceConfidenceThreshold > 1) {
        console.error('Invalid voiceConfidenceThreshold:', this.currentSettings.voiceConfidenceThreshold);
        return false;
      }

      // Validate max alternatives (1-10)
      if (this.currentSettings.voiceMaxAlternatives < 1 || this.currentSettings.voiceMaxAlternatives > 10) {
        console.error('Invalid voiceMaxAlternatives:', this.currentSettings.voiceMaxAlternatives);
        return false;
      }

      // Validate theme
      const validThemes = ['dark', 'light', 'blue', 'violet', 'emerald', 'rose', 'amber'];
      if (!validThemes.includes(this.currentSettings.theme)) {
        console.error('Invalid theme:', this.currentSettings.theme);
        return false;
      }

      // Validate extraction confidence threshold (0.5-1.0)
      if (this.currentSettings.extractionConfidenceThreshold !== undefined) {
        if (this.currentSettings.extractionConfidenceThreshold < 0.5 || this.currentSettings.extractionConfidenceThreshold > 1) {
          console.error('Invalid extractionConfidenceThreshold:', this.currentSettings.extractionConfidenceThreshold);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Validation error:', error);
      return false;
    }
  }

  /**
   * Refresh page content
   */
  refreshPage() {
    if (this.container) {
      // Reload settings
      this.loadSettings().then(() => {
        // Re-render
        this.container.innerHTML = this.render();

        // Re-mount toggles
        this.mountToggleSwitches();

        // Re-attach listeners
        this.attachEventListeners();

        // Re-initialize icons
        if (window.lucide && typeof window.lucide.createIcons === 'function') {
          window.lucide.createIcons();
        }
      });
    }
  }

  /**
   * Show toast notification
   */
  showToast(message, type = 'info') {
    if (this.app && typeof this.app.showToast === 'function') {
      this.app.showToast(message, type);
    } else {
      console.log(`[Toast ${type}]:`, message);
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Unmount page
   */
  async unmount() {
    // Destroy all toggle switches
    Object.values(this.toggleSwitches).forEach(toggle => {
      if (toggle && typeof toggle.destroy === 'function') {
        toggle.destroy();
      }
    });
    this.toggleSwitches = {};

    // Clear container
    if (this.container) {
      this.container.innerHTML = '';
    }

    console.log('SettingsPage unmounted');
  }
}
