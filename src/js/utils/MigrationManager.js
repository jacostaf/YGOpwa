/**
 * Migration Manager for VoxRip Space UI System
 * 
 * This class orchestrates the migration process between legacy interface theme
 * and the VoxRip space theme, handling layout switching, component
 * initialization, and functionality preservation.
 * 
 * Key Responsibilities:
 * - Theme switching coordination
 * - Layout activation/deactivation
 * - Component re-initialization
 * - Event handler migration
 * - Performance monitoring
 * - Rollback capabilities
 */

import { FeatureFlags } from './FeatureFlags.js';
import { SelectorMapper } from './SelectorMapper.js';

export class MigrationManager {
  constructor(options = {}) {
    this.options = {
      animationDuration: 500,
      enableAnalytics: true,
      debugMode: false,
      performanceMonitoring: true,
      ...options
    };

    // Initialize core systems
    this.featureFlags = new FeatureFlags({
      analyticsEnabled: this.options.enableAnalytics,
      developmentOverrides: this.options.debugMode
    });
    
    this.selectorMapper = new SelectorMapper(this.featureFlags);
    
    // Migration state
    this.currentTheme = 'legacy';
    this.isTransitioning = false;
    this.animationsEnabled = true;
    this.migrationHistory = [];
    this.performanceMetrics = {
      themeSwitch: [],
      componentInit: [],
      layoutRender: []
    };

    // Component references
    this.components = {
      legacy: new Map(),
      space: new Map()
    };

    // Animation manager (will be created when needed)
    this.animationManager = null;
    this.themeManager = null;

    // Panel management system
    this.panelManager = null;

    this.initialize();
  }

  /**
   * Initialize the migration system
   */
  async initialize() {
    this.log('Initializing Migration Manager...');

    // Set up event listeners
    this.setupEventListeners();

    // Determine initial theme based on feature flags
    const useSpaceTheme = this.featureFlags.isEnabled('USE_SPACE_THEME');
    const initialTheme = useSpaceTheme ? 'space' : 'legacy';

    // Initialize theme system
    await this.initializeTheme(initialTheme);

    // Set up performance monitoring
    if (this.options.performanceMonitoring) {
      this.setupPerformanceMonitoring();
    }

    this.log('Migration Manager initialized successfully');
  }

  /**
   * Initialize theme system and activate appropriate layout
   */
  async initializeTheme(theme) {
    this.log(`Initializing theme: ${theme}`);

    const startTime = performance.now();

    try {
      if (theme === 'space') {
        await this.initializeSpaceTheme();
      } else {
        await this.initializeLegacyTheme();
      }

      this.currentTheme = theme;
      
      // Record performance metrics
      const duration = performance.now() - startTime;
      this.recordPerformanceMetric('themeInit', duration);

      this.log(`Theme ${theme} initialized in ${duration.toFixed(2)}ms`);
      
    } catch (error) {
      console.error('Theme initialization failed:', error);
      
      // Fallback to legacy theme
      if (theme !== 'legacy') {
        this.log('Falling back to legacy theme...');
        await this.initializeLegacyTheme();
        this.currentTheme = 'legacy';
      }
      
      throw error;
    }
  }

  /**
   * Initialize legacy theme
   */
  async initializeLegacyTheme() {
    this.log('Initializing legacy theme...');

    // Show legacy layout and hide space layout - CRITICAL FIX
    const legacyApp = document.getElementById('app');
    const spaceApp = document.getElementById('space-app');
    
    if (legacyApp) {
      legacyApp.style.display = 'block';
      legacyApp.classList.remove('hidden');
      this.log('Legacy app shown');
    }
    
    if (spaceApp) {
      spaceApp.style.display = 'none';
      spaceApp.classList.add('hidden');
      spaceApp.classList.remove('active');
      this.log('Space app hidden');
    }

    // Disable space theme CSS - CRITICAL FIX
    const spaceLayoutCSS = document.getElementById('space-layout-css');
    if (spaceLayoutCSS) {
      spaceLayoutCSS.disabled = true;
      this.log('Space theme CSS disabled');
    }

    // Remove space theme classes from body
    document.body.classList.remove('space-theme', 'nebula-theme', 'matrix-theme');
    this.log('Space theme classes removed from body');

    // Update selector mapper
    this.selectorMapper.switchTheme('legacy');

    this.log('Legacy theme layout activated');
  }

  /**
   * Initialize VoxRip space theme
   */
  async initializeSpaceTheme() {
    const startTime = performance.now();

    this.log('Initializing space theme...');

    // Enable space theme CSS - CRITICAL FIX
    const spaceLayoutCSS = document.getElementById('space-layout-css');
    if (spaceLayoutCSS) {
      spaceLayoutCSS.disabled = false;
      this.log('Space theme CSS enabled');
    } else {
      this.log('WARNING: Space theme CSS link not found');
    }

    // Add space theme class to body
    document.body.classList.add('space-theme');
    this.log('Space theme class added to body');

    // Hide legacy layout and show space layout - CRITICAL FIX
    const legacyApp = document.getElementById('app');
    const spaceApp = document.getElementById('space-app');
    
    if (legacyApp) {
      legacyApp.style.display = 'none';
      legacyApp.classList.add('hidden');
      this.log('Legacy app hidden');
    } else {
      this.log('WARNING: Legacy app element not found');
    }
    
    if (spaceApp) {
      spaceApp.style.display = 'block';
      spaceApp.classList.remove('hidden');
      spaceApp.classList.add('active');
      this.log('Space app shown and activated');
    } else {
      this.log('ERROR: Space app element not found! Theme switching will fail.');
    }

    // Update selector mapper
    this.selectorMapper.switchTheme('space');

    // Initialize space theme components
    await this.initializeSpaceComponents();

    // Initialize animations if enabled
    if (this.featureFlags.isEnabled('ENABLE_ANIMATIONS') && this.animationsEnabled) {
      await this.initializeAnimations();
    } else {
      this.log('Animations disabled by user preference');
    }
    
    // Apply animation state
    this.applyAnimationState();

    // Initialize theme customization if enabled
    if (this.featureFlags.isEnabled('THEME_CUSTOMIZATION')) {
      await this.initializeThemeCustomization();
    }

    const duration = performance.now() - startTime;
    this.log(`Space theme initialized in ${duration.toFixed(2)}ms`);
  }

  /**
   * Initialize space theme specific components
   */
  async initializeSpaceComponents() {
    // Create stars and cosmic elements
    this.generateStarField();
    this.generateCosmicElements();

    // Set up theme toggle functionality
    this.setupThemeToggle();
    
    // Set up animation toggle functionality
    this.setupAnimationToggle();

    // Set up navigation system
    this.setupSpaceNavigation();

    // Wait a moment for DOM to settle, then set up theme settings
    setTimeout(() => {
      this.setupThemeSettings();
      this.log('Theme settings setup delayed for DOM stability');
    }, 100);

    // Initialize panel management system
    this.initializePanelManager();

    // Ensure center panel is visible
    this.ensureCenterPanelVisible();

    this.log('Space theme components initialized');
  }

  /**
   * Ensure the center panel is visible when space theme is active
   */
  ensureCenterPanelVisible() {
    const centerPanel = document.querySelector('.space-layout .center-panel');
    if (centerPanel) {
      centerPanel.classList.remove('hidden');
      centerPanel.style.display = 'flex'; // Ensure flex display
      centerPanel.style.visibility = 'visible';
      this.log('Center panel made visible');
      
      // Set pack ripper as default active tab
      const packRipperTab = document.querySelector('.space-layout .nav-item[data-tab="pack-ripper"]');
      if (packRipperTab) {
        packRipperTab.click();
        this.log('Pack ripper set as default tab');
      }
    } else {
      this.log('WARNING: Center panel not found');
    }
  }

  /**
   * Generate animated star field
   */
  generateStarField() {
    const starLayers = document.querySelector('.space-layout .star-layers');
    if (!starLayers) return;

    // Clear existing stars
    starLayers.innerHTML = '';

    for (let layer = 1; layer <= 3; layer++) {
      const starLayer = document.createElement('div');
      starLayer.className = `star-layer star-layer-${layer}`;
      
      // Generate different number of stars per layer for performance
      const starCounts = { 1: 50, 2: 30, 3: 20 };
      const starCount = starCounts[layer];
      
      for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = `space-star ${this.getRandomStarSize()}`;
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 100}%`;
        star.style.animationDelay = `${Math.random() * 4}s`;
        star.style.animationDuration = `${2 + Math.random() * 3}s`;
        starLayer.appendChild(star);
      }
      
      starLayers.appendChild(starLayer);
    }

    this.log('Star field generated');
  }

  /**
   * Get random star size class
   */
  getRandomStarSize() {
    const sizes = ['tiny', 'small', 'medium', 'large'];
    const weights = [0.5, 0.3, 0.15, 0.05]; // Probability distribution
    
    const random = Math.random();
    let sum = 0;
    
    for (let i = 0; i < weights.length; i++) {
      sum += weights[i];
      if (random <= sum) {
        return sizes[i];
      }
    }
    
    return 'tiny';
  }

  /**
   * Generate cosmic elements (clouds, galaxies)
   */
  generateCosmicElements() {
    const cosmicContainer = document.querySelector('.space-layout .cosmic-elements');
    if (!cosmicContainer) return;

    // Clear existing elements
    cosmicContainer.innerHTML = '';

    // Generate cosmic clouds
    for (let i = 0; i < 5; i++) {
      const cloud = document.createElement('div');
      cloud.className = 'cosmic-cloud';
      cloud.style.width = `${100 + Math.random() * 200}px`;
      cloud.style.height = `${60 + Math.random() * 120}px`;
      cloud.style.left = `${-10 + Math.random() * 120}%`;
      cloud.style.top = `${Math.random() * 100}%`;
      cloud.style.animationDelay = `${Math.random() * 20}s`;
      cloud.style.animationDuration = `${30 + Math.random() * 20}s`;
      cosmicContainer.appendChild(cloud);
    }

    // Generate distant galaxies
    for (let i = 0; i < 3; i++) {
      const galaxy = document.createElement('div');
      galaxy.className = 'galaxy';
      galaxy.style.left = `${Math.random() * 80}%`;
      galaxy.style.top = `${Math.random() * 80}%`;
      galaxy.style.animationDelay = `${Math.random() * 30}s`;
      cosmicContainer.appendChild(galaxy);
    }

    this.log('Cosmic elements generated');
  }

  /**
   * Set up theme toggle functionality
   */
  setupThemeToggle() {
    // Set up space theme toggle button (in space layout)
    const spaceToggleButton = document.getElementById('space-theme-toggle');
    if (spaceToggleButton) {
      spaceToggleButton.addEventListener('click', () => {
        this.toggleTheme();
      });
      this.log('Space theme toggle button set up');
    }

    // Set up legacy theme toggle button (the 🚀 button in legacy layout)
    const legacyToggleButton = document.getElementById('legacy-theme-toggle');
    if (legacyToggleButton) {
      legacyToggleButton.addEventListener('click', () => {
        this.toggleTheme();
      });
      this.log('Legacy theme toggle button set up');
    }

    this.log('Theme toggle buttons set up');
  }

  /**
   * Set up animation toggle functionality
   */
  setupAnimationToggle() {
    // Load saved animation preference
    const savedAnimationState = localStorage.getItem('space-theme-animations');
    if (savedAnimationState !== null) {
      this.animationsEnabled = savedAnimationState === 'true';
    }

    // Set up animation toggle button
    const animationToggleButton = document.getElementById('animation-toggle-btn');
    if (animationToggleButton) {
      // Remove any existing listeners first to prevent duplicates
      animationToggleButton.replaceWith(animationToggleButton.cloneNode(true));
      const newButton = document.getElementById('animation-toggle-btn');
      
      if (newButton) {
        newButton.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.toggleAnimations();
        }, { once: false });
        this.log('Animation toggle button set up');
        
        // Update initial button state
        this.updateAnimationToggleButton();
      }
    }

    // Apply initial animation state
    this.applyAnimationState();

    this.log('Animation toggle functionality set up');
  }

  /**
   * Toggle animations on/off
   */
  toggleAnimations() {
    // Prevent multiple simultaneous toggles
    if (this.isTogglingAnimations) {
      return;
    }
    
    this.isTogglingAnimations = true;
    
    // Toggle the state
    this.animationsEnabled = !this.animationsEnabled;
    
    // Save preference
    localStorage.setItem('space-theme-animations', this.animationsEnabled.toString());
    
    // Apply the animation state
    this.applyAnimationState();
    
    // Update button state
    this.updateAnimationToggleButton();
    
    this.log(`Animations ${this.animationsEnabled ? 'enabled' : 'disabled'}`);
    
    // Dispatch event
    window.dispatchEvent(new CustomEvent('animationsToggled', {
      detail: {
        enabled: this.animationsEnabled
      }
    }));
    
    // Reset flag after a short delay
    setTimeout(() => {
      this.isTogglingAnimations = false;
    }, 100);
  }

  /**
   * Apply animation state to the UI
   */
  applyAnimationState() {
    const spaceApp = document.getElementById('space-app');
    const deepSpaceBg = document.querySelector('.deep-space-bg');
    const body = document.body;
    
    if (this.animationsEnabled) {
      // Enable animations
      if (spaceApp) spaceApp.classList.remove('animations-disabled');
      body.classList.remove('animations-disabled');
      if (deepSpaceBg) deepSpaceBg.classList.remove('static');
      
      // Remove static backgrounds from animated elements
      document.querySelectorAll('.star-layers, .cosmic-elements').forEach(el => {
        el.style.display = '';
      });
    } else {
      // Disable animations
      if (spaceApp) spaceApp.classList.add('animations-disabled');
      body.classList.add('animations-disabled');
      if (deepSpaceBg) deepSpaceBg.classList.add('static');
      
      // Hide animated elements completely
      document.querySelectorAll('.star-layers, .cosmic-elements').forEach(el => {
        el.style.display = 'none';
      });
    }
  }

  /**
   * Update animation toggle button appearance
   */
  updateAnimationToggleButton() {
    const animationToggleButton = document.getElementById('animation-toggle-btn');
    if (animationToggleButton) {
      const span = animationToggleButton.querySelector('span');
      
      if (this.animationsEnabled) {
        animationToggleButton.classList.remove('animations-disabled');
        animationToggleButton.title = 'Disable Animations';
        if (span) span.textContent = '🎬';
      } else {
        animationToggleButton.classList.add('animations-disabled');
        animationToggleButton.title = 'Enable Animations';
        if (span) span.textContent = '🚫';
      }
    }
  }

  /**
   * Set up space navigation system
   */
  setupSpaceNavigation() {
    // Main navigation items
    const navItems = document.querySelectorAll('.space-layout .nav-item[data-tab]');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        const tabId = e.currentTarget.dataset.tab;
        this.switchSpaceTab(tabId);
      });
    });

    // Center panel tab navigation
    const centerTabs = document.querySelectorAll('.space-layout .center-tab[data-center-tab]');
    centerTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabId = e.currentTarget.dataset.centerTab;
        this.switchCenterTab(tabId);
      });
    });
    
    // Initialize with voice recognition as default
    this.switchCenterTab('voice-recognition');

    this.log('Space navigation set up');
  }

  /**
   * Set up theme settings functionality
   */
  setupThemeSettings() {
    // Use more specific selectors and add debugging
    const spaceLayout = document.getElementById('space-app');
    if (!spaceLayout) {
      this.log('WARNING: Space app not found, cannot setup theme settings');
      return;
    }

    // Theme header toggle
    const themeHeader = spaceLayout.querySelector('.theme-header');
    if (themeHeader) {
      // Remove any existing listeners
      const newThemeHeader = themeHeader.cloneNode(true);
      themeHeader.parentNode.replaceChild(newThemeHeader, themeHeader);
      
      newThemeHeader.addEventListener('click', (e) => {
        e.stopPropagation();
        this.log('Theme header clicked');
        this.toggleThemeSettings();
      });
      this.log('Theme header listener added');
    } else {
      this.log('WARNING: Theme header not found');
    }

    // Theme preset buttons
    const presetButtons = spaceLayout.querySelectorAll('.theme-preset');
    if (presetButtons.length > 0) {
      presetButtons.forEach(button => {
        // Clone to remove any existing listeners
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        newButton.addEventListener('click', (e) => {
          e.stopPropagation();
          const theme = e.currentTarget.dataset.theme;
          this.log(`Theme preset clicked: ${theme}`);
          this.applyThemePreset(theme);
        });
      });
      this.log(`Added listeners to ${presetButtons.length} theme preset buttons`);
    } else {
      this.log('WARNING: No theme preset buttons found');
    }

    // Color pickers
    const colorPickers = spaceLayout.querySelectorAll('input[type="color"]');
    if (colorPickers.length > 0) {
      colorPickers.forEach(picker => {
        // Clone to remove any existing listeners
        const newPicker = picker.cloneNode(true);
        picker.parentNode.replaceChild(newPicker, picker);
        
        newPicker.addEventListener('change', (e) => {
          this.log(`Color picker changed: ${e.target.id} = ${e.target.value}`);
          this.handleColorChange(e.target.id, e.target.value);
        });
        
        newPicker.addEventListener('input', (e) => {
          this.handleColorChange(e.target.id, e.target.value);
        });
      });
      this.log(`Added listeners to ${colorPickers.length} color pickers`);
    } else {
      this.log('WARNING: No color pickers found');
    }

    // Opacity slider
    const opacitySlider = document.getElementById('panel-opacity-slider');
    if (opacitySlider) {
      const newSlider = opacitySlider.cloneNode(true);
      opacitySlider.parentNode.replaceChild(newSlider, opacitySlider);
      
      newSlider.addEventListener('input', (e) => {
        this.log(`Opacity slider changed: ${e.target.value}`);
        this.handleOpacityChange(e.target.value);
      });
      this.log('Opacity slider listener added');
    } else {
      this.log('WARNING: Opacity slider not found');
    }

    // Advanced control sliders
    const glowSlider = document.getElementById('glow-intensity-slider');
    if (glowSlider) {
      const newSlider = glowSlider.cloneNode(true);
      glowSlider.parentNode.replaceChild(newSlider, glowSlider);
      
      newSlider.addEventListener('input', (e) => {
        this.log(`Glow slider changed: ${e.target.value}`);
        this.handleSliderChange('glow-intensity-slider', e.target.value);
      });
      this.log('Glow slider listener added');
    } else {
      this.log('WARNING: Glow slider not found');
    }

    const blurSlider = document.getElementById('blur-intensity-slider');
    if (blurSlider) {
      const newSlider = blurSlider.cloneNode(true);
      blurSlider.parentNode.replaceChild(newSlider, blurSlider);
      
      newSlider.addEventListener('input', (e) => {
        this.log(`Blur slider changed: ${e.target.value}`);
        this.handleSliderChange('blur-intensity-slider', e.target.value);
      });
      this.log('Blur slider listener added');
    } else {
      this.log('WARNING: Blur slider not found');
    }

    // Generate Harmony button
    const generateHarmonyBtn = document.getElementById('generate-harmony-btn');
    if (generateHarmonyBtn) {
      // Clone to remove any existing listeners
      const newBtn = generateHarmonyBtn.cloneNode(true);
      generateHarmonyBtn.parentNode.replaceChild(newBtn, generateHarmonyBtn);
      
      newBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.log('Generate harmony clicked');
        this.generateColorHarmony();
      });
      this.log('Generate harmony button listener added');
    } else {
      this.log('WARNING: Generate harmony button not found');
    }

    // Color temperature buttons
    const tempButtons = spaceLayout.querySelectorAll('.temp-preset');
    if (tempButtons.length > 0) {
      tempButtons.forEach(button => {
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        newButton.addEventListener('click', (e) => {
          e.stopPropagation();
          const temperature = e.currentTarget.dataset.temp;
          this.log(`Temperature preset clicked: ${temperature}`);
          this.applyColorTemperature(temperature);
        });
      });
      this.log(`Added listeners to ${tempButtons.length} temperature preset buttons`);
    } else {
      this.log('WARNING: No temperature preset buttons found');
    }

    // Reset and random theme buttons
    const resetBtn = document.getElementById('reset-theme-btn');
    if (resetBtn) {
      const newResetBtn = resetBtn.cloneNode(true);
      resetBtn.parentNode.replaceChild(newResetBtn, resetBtn);
      
      newResetBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.log('Reset theme clicked');
        this.resetThemeToDefault();
      });
      this.log('Reset button listener added');
    } else {
      this.log('WARNING: Reset button not found');
    }

    const randomBtn = document.getElementById('random-theme-btn');
    if (randomBtn) {
      const newRandomBtn = randomBtn.cloneNode(true);
      randomBtn.parentNode.replaceChild(newRandomBtn, randomBtn);
      
      newRandomBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.log('Random theme clicked');
        this.generateRandomTheme();
      });
      this.log('Random button listener added');
    } else {
      this.log('WARNING: Random button not found');
    }

    // Initialize color previews and gradient
    this.initializeColorPreviews();

    this.log('Advanced theme settings set up');
  }

  /**
   * Toggle between legacy and space themes
   */
  async toggleTheme() {
    if (this.isTransitioning) {
      this.log('Theme transition already in progress');
      return;
    }

    const newTheme = this.currentTheme === 'legacy' ? 'space' : 'legacy';
    await this.switchTheme(newTheme);
  }

  /**
   * Switch to a specific theme
   */
  async switchTheme(theme) {
    if (this.isTransitioning || this.currentTheme === theme) {
      return;
    }

    this.log(`Switching theme from ${this.currentTheme} to ${theme}`);
    this.isTransitioning = true;

    const startTime = performance.now();

    try {
      // Record migration event
      this.migrationHistory.push({
        from: this.currentTheme,
        to: theme,
        timestamp: Date.now(),
        trigger: 'manual'
      });

      // Update feature flag
      this.featureFlags.setFlag('USE_SPACE_THEME', theme === 'space');

      // Perform the theme switch
      await this.initializeTheme(theme);

      // Record performance
      const duration = performance.now() - startTime;
      this.recordPerformanceMetric('themeSwitch', duration);

      // Dispatch event
      window.dispatchEvent(new CustomEvent('themeChanged', {
        detail: {
          from: this.migrationHistory[this.migrationHistory.length - 1].from,
          to: theme,
          duration: duration
        }
      }));

      this.log(`Theme switch completed in ${duration.toFixed(2)}ms`);

    } catch (error) {
      console.error('Theme switch failed:', error);
      
      // Attempt rollback
      try {
        await this.rollbackTheme();
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
      }
      
      throw error;
    } finally {
      this.isTransitioning = false;
    }
  }

  /**
   * Switch space theme tab
   */
  switchSpaceTab(tabId) {
    // Update navigation active state
    const navItems = document.querySelectorAll('.space-layout .nav-item[data-tab]');
    navItems.forEach(item => {
      item.classList.toggle('active', item.dataset.tab === tabId);
    });

    // Update workspace content
    this.updateSpaceWorkspace(tabId);

    this.log(`Switched to space tab: ${tabId}`);
  }

  /**
   * Switch center panel tabs
   */
  switchCenterTab(tabId) {
    // Update center tab active state
    const centerTabs = document.querySelectorAll('.space-layout .center-tab');
    centerTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.centerTab === tabId);
    });

    // Hide all interface content sections first
    const functionInterface = document.getElementById('space-function-interface');
    if (functionInterface) {
      const allInterfaceContent = functionInterface.querySelectorAll('.interface-content');
      allInterfaceContent.forEach(section => {
        section.classList.add('hidden');
        section.style.display = 'none';
      });
    }

    // Switch content based on center tab
    switch (tabId) {
      case 'voice-recognition':
        this.showInterfaceContent('space-voice-recognition-content');
        this.log('Switched to voice-recognition center tab');
        break;
      case 'training-patterns':
        this.showInterfaceContent('space-training-patterns-content');
        this.log('Switched to training-patterns center tab');
        break;
      default:
        this.log(`Unknown center tab: ${tabId}`);
        break;
    }
    
    // Store current center tab
    this.currentCenterTab = tabId;
  }

  /**
   * Update space workspace content based on active tab
   */
  updateSpaceWorkspace(tabId) {
    const functionInterface = document.getElementById('space-function-interface');

    if (!functionInterface) {
      this.log('ERROR: Cannot find function interface for content switching');
      return;
    }

    // Hide all interface content sections first
    const allInterfaceContent = functionInterface.querySelectorAll('.interface-content');
    allInterfaceContent.forEach(section => {
      section.classList.add('hidden');
      section.style.display = 'none';
    });

    switch (tabId) {
      case 'price-checker':
        // Hide center panel tabs for price checker
        const centerTabs = document.getElementById('center-panel-tabs');
        if (centerTabs) {
          centerTabs.style.display = 'none';
        }
        this.showInterfaceContent('space-price-checker-content');
        this.log('Switched to price-checker interface');
        break;

      case 'pack-ripper':
        // Show center panel tabs
        const centerPanelTabs = document.getElementById('center-panel-tabs');
        if (centerPanelTabs) {
          centerPanelTabs.style.display = 'flex';
        }
        // Switch to voice recognition as default center tab
        this.switchCenterTab('voice-recognition');
        this.log('Switched to pack-ripper interface with voice recognition tab');
        break;

      default:
        this.showInterfaceContent('space-price-checker-content'); // Default fallback
        this.log(`Switched to default interface (${tabId})`);
    }
  }

  /**
   * Show specific interface content section and hide others
   */
  showInterfaceContent(contentId) {
    const contentSection = document.getElementById(contentId);
    if (contentSection) {
      contentSection.classList.remove('hidden');
      contentSection.style.display = 'block';
      this.log(`Interface content shown: ${contentId}`);
    } else {
      this.log(`ERROR: Interface content not found: ${contentId}`);
    }
  }

  /**
   * Load price checker content into space interface
   */
  loadPriceCheckerContent(container) {
    // Show the price checker interface content
    this.showInterfaceContent('space-price-checker-content');
  }

  /**
   * Load pack ripper content into space interface
   */
  loadPackRipperContent(container) {
    // Show the voice recognition interface as default for pack ripper
    this.showInterfaceContent('space-voice-recognition-content');
  }

  /**
   * Load default content
   */
  loadDefaultContent(container) {
    // Show the price checker interface as the default
    this.showInterfaceContent('space-price-checker-content');
  }

  /**
   * Toggle theme settings panel
   */
  toggleThemeSettings() {
    const settingsContent = document.getElementById('theme-settings');
    const toggleIcon = document.querySelector('.theme-header .theme-toggle-icon');
    
    if (settingsContent) {
      const isCurrentlyHidden = settingsContent.classList.contains('hidden');
      
      if (isCurrentlyHidden) {
        // Show the settings: remove hidden, add expanded
        settingsContent.classList.remove('hidden');
        settingsContent.classList.add('expanded');
        if (toggleIcon) toggleIcon.textContent = '▲';
        this.log('Theme settings expanded');
      } else {
        // Hide the settings: remove expanded, add hidden
        settingsContent.classList.remove('expanded');
        settingsContent.classList.add('hidden');
        if (toggleIcon) toggleIcon.textContent = '▼';
        this.log('Theme settings collapsed');
      }
    } else {
      this.log('WARNING: Theme settings content not found');
    }
  }

  /**
   * Apply a theme preset
   */
  applyThemePreset(presetName) {
    // Remove all theme classes
    document.body.classList.remove('nebula-theme', 'matrix-theme', 'voxrip-classic-theme');
    
    // Handle space-theme class based on preset
    if (presetName === 'voxrip-classic') {
      // Classic theme doesn't use space-theme
      document.body.classList.remove('space-theme');
      document.body.classList.add('voxrip-classic-theme');
    } else {
      // All space-based themes need space-theme class
      document.body.classList.add('space-theme');
      
      // Apply specific theme variant
      if (presetName !== 'space-blue') {
        let themeClass;
        switch (presetName) {
          case 'space-purple':
            themeClass = 'nebula-theme';
            break;
          case 'space-green':
            themeClass = 'matrix-theme';
            break;
          default:
            themeClass = presetName.replace('space-', '') + '-theme';
        }
        document.body.classList.add(themeClass);
      }
    }

    // Update active preset button
    const presetButtons = document.querySelectorAll('.space-layout .theme-preset');
    presetButtons.forEach(button => {
      button.classList.toggle('active', button.dataset.theme === presetName);
    });

    this.log(`Applied theme preset: ${presetName} -> ${this.getCurrentThemeClasses()}`);
  }

  /**
   * Get current theme classes for debugging
   */
  getCurrentThemeClasses() {
    const classes = [];
    if (document.body.classList.contains('space-theme')) classes.push('space-theme');
    if (document.body.classList.contains('nebula-theme')) classes.push('nebula-theme');
    if (document.body.classList.contains('matrix-theme')) classes.push('matrix-theme');
    if (document.body.classList.contains('voxrip-classic-theme')) classes.push('voxrip-classic-theme');
    return classes.length > 0 ? classes.join(' ') : 'default';
  }

  /**
   * Handle color picker changes
   */
  handleColorChange(pickerId, color) {
    const root = document.documentElement;
    
    switch (pickerId) {
      case 'primary-color-picker':
        root.style.setProperty('--color-primary', color);
        root.style.setProperty('--space-primary', color);
        this.updateColorPreview('primary-color-preview', color);
        break;
      case 'secondary-color-picker':
        root.style.setProperty('--color-secondary', color);
        root.style.setProperty('--space-secondary', color);
        this.updateColorPreview('secondary-color-preview', color);
        break;
      case 'accent-color-picker':
        root.style.setProperty('--color-accent', color);
        root.style.setProperty('--space-accent', color);
        this.updateColorPreview('accent-color-preview', color);
        break;
    }

    // Update gradient preview
    this.updateGradientPreview();

    this.log(`Color changed: ${pickerId} = ${color}`);
  }

  /**
   * Handle opacity slider changes
   */
  handleOpacityChange(opacity) {
    const root = document.documentElement;
    root.style.setProperty('--panel-opacity', opacity);
    
    // Update opacity value display
    const opacityValue = document.getElementById('opacity-value');
    if (opacityValue) {
      opacityValue.textContent = `${Math.round(opacity * 100)}%`;
    }
    
    this.log(`Panel opacity changed: ${opacity}`);
  }

  /**
   * Update color preview box
   */
  updateColorPreview(previewId, color) {
    const preview = document.getElementById(previewId);
    if (preview) {
      preview.style.backgroundColor = color;
    }
  }

  /**
   * Update gradient preview
   */
  updateGradientPreview() {
    const gradientPreview = document.getElementById('gradient-preview');
    if (!gradientPreview) return;

    const primaryColor = document.getElementById('primary-color-picker')?.value || '#4c9fff';
    const secondaryColor = document.getElementById('secondary-color-picker')?.value || '#7c3aed';
    const accentColor = document.getElementById('accent-color-picker')?.value || '#00d4ff';

    // Create a beautiful gradient with all three colors
    const gradient = `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 50%, ${accentColor} 100%)`;
    gradientPreview.style.background = gradient;
  }

  /**
   * Generate color harmony based on selected type
   */
  generateColorHarmony() {
    const harmonyType = document.getElementById('harmony-type')?.value || 'complementary';
    const baseColor = document.getElementById('primary-color-picker')?.value || '#4c9fff';
    
    const colors = this.calculateColorHarmony(baseColor, harmonyType);
    
    // Apply the generated colors
    if (colors.primary) {
      document.getElementById('primary-color-picker').value = colors.primary;
      this.handleColorChange('primary-color-picker', colors.primary);
    }
    if (colors.secondary) {
      document.getElementById('secondary-color-picker').value = colors.secondary;
      this.handleColorChange('secondary-color-picker', colors.secondary);
    }
    if (colors.accent) {
      document.getElementById('accent-color-picker').value = colors.accent;
      this.handleColorChange('accent-color-picker', colors.accent);
    }

    this.log(`Generated ${harmonyType} color harmony from base color: ${baseColor}`);
  }

  /**
   * Calculate color harmony based on color theory
   */
  calculateColorHarmony(baseColor, harmonyType) {
    const hsl = this.hexToHsl(baseColor);
    let colors = { primary: baseColor };

    switch (harmonyType) {
      case 'complementary':
        colors.secondary = this.hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l);
        colors.accent = this.hslToHex((hsl.h + 150) % 360, hsl.s * 0.8, Math.min(hsl.l + 0.2, 1));
        break;

      case 'triadic':
        colors.secondary = this.hslToHex((hsl.h + 120) % 360, hsl.s, hsl.l);
        colors.accent = this.hslToHex((hsl.h + 240) % 360, hsl.s, hsl.l);
        break;

      case 'analogous':
        colors.secondary = this.hslToHex((hsl.h + 30) % 360, hsl.s, hsl.l);
        colors.accent = this.hslToHex((hsl.h - 30 + 360) % 360, hsl.s, hsl.l);
        break;

      case 'monochromatic':
        colors.secondary = this.hslToHex(hsl.h, hsl.s, Math.max(hsl.l - 0.3, 0));
        colors.accent = this.hslToHex(hsl.h, Math.min(hsl.s + 0.2, 1), Math.min(hsl.l + 0.3, 1));
        break;
    }

    return colors;
  }

  /**
   * Convert hex color to HSL
   */
  hexToHsl(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    const sum = max + min;

    let h = 0;
    let s = 0;
    const l = sum / 2;

    if (diff !== 0) {
      s = l < 0.5 ? diff / sum : diff / (2 - sum);

      switch (max) {
        case r:
          h = ((g - b) / diff + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / diff + 2) / 6;
          break;
        case b:
          h = ((r - g) / diff + 4) / 6;
          break;
      }
    }

    return { h: h * 360, s, l };
  }

  /**
   * Convert HSL to hex color
   */
  hslToHex(h, s, l) {
    h = h / 360;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h * 6) % 2 - 1));
    const m = l - c / 2;

    let r, g, b;

    if (h < 1/6) {
      r = c; g = x; b = 0;
    } else if (h < 2/6) {
      r = x; g = c; b = 0;
    } else if (h < 3/6) {
      r = 0; g = c; b = x;
    } else if (h < 4/6) {
      r = 0; g = x; b = c;
    } else if (h < 5/6) {
      r = x; g = 0; b = c;
    } else {
      r = c; g = 0; b = x;
    }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  /**
   * Handle slider changes for advanced controls
   */
  handleSliderChange(sliderId, value) {
    const root = document.documentElement;
    
    switch (sliderId) {
      case 'glow-intensity-slider':
        root.style.setProperty('--glow-intensity', value);
        const glowValue = document.getElementById('glow-value');
        if (glowValue) glowValue.textContent = `${Math.round(value * 100)}%`;
        break;
        
      case 'blur-intensity-slider':
        root.style.setProperty('--blur-intensity', `${value}px`);
        const blurValue = document.getElementById('blur-value');
        if (blurValue) blurValue.textContent = `${value}px`;
        break;
    }
  }

  /**
   * Apply color temperature preset
   */
  applyColorTemperature(temperature) {
    const root = document.documentElement;
    
    // Remove previous temperature classes
    document.body.classList.remove('cool-temperature', 'neutral-temperature', 'warm-temperature');
    
    // Apply new temperature
    document.body.classList.add(`${temperature}-temperature`);
    
    // Update active button
    const tempButtons = document.querySelectorAll('.temp-preset');
    tempButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.temp === temperature);
    });

    this.log(`Applied ${temperature} color temperature`);
  }

  /**
   * Reset theme to default values
   */
  resetThemeToDefault() {
    // Reset color pickers to default values
    const defaults = {
      'primary-color-picker': '#4c9fff',
      'secondary-color-picker': '#7c3aed',
      'accent-color-picker': '#00d4ff'
    };

    Object.entries(defaults).forEach(([id, color]) => {
      const picker = document.getElementById(id);
      if (picker) {
        picker.value = color;
        this.handleColorChange(id, color);
      }
    });

    // Reset sliders
    const opacitySlider = document.getElementById('panel-opacity-slider');
    if (opacitySlider) {
      opacitySlider.value = '0.8';
      this.handleOpacityChange(0.8);
    }

    const glowSlider = document.getElementById('glow-intensity-slider');
    if (glowSlider) {
      glowSlider.value = '1';
      this.handleSliderChange('glow-intensity-slider', 1);
    }

    const blurSlider = document.getElementById('blur-intensity-slider');
    if (blurSlider) {
      blurSlider.value = '10';
      this.handleSliderChange('blur-intensity-slider', 10);
    }

    // Reset temperature to neutral
    this.applyColorTemperature('neutral');

    this.log('Theme reset to default values');
  }

  /**
   * Generate random theme colors
   */
  generateRandomTheme() {
    const randomColor = () => {
      const hue = Math.floor(Math.random() * 360);
      const saturation = 0.6 + Math.random() * 0.4; // 60-100%
      const lightness = 0.4 + Math.random() * 0.3;  // 40-70%
      return this.hslToHex(hue, saturation, lightness);
    };

    const colors = {
      'primary-color-picker': randomColor(),
      'secondary-color-picker': randomColor(),
      'accent-color-picker': randomColor()
    };

    Object.entries(colors).forEach(([id, color]) => {
      const picker = document.getElementById(id);
      if (picker) {
        picker.value = color;
        this.handleColorChange(id, color);
      }
    });

    this.log('Generated random theme colors');
  }

  /**
   * Initialize color previews on startup
   */
  initializeColorPreviews() {
    // Initialize color previews with current values
    const colorPickers = [
      { id: 'primary-color-picker', previewId: 'primary-color-preview' },
      { id: 'secondary-color-picker', previewId: 'secondary-color-preview' },
      { id: 'accent-color-picker', previewId: 'accent-color-preview' }
    ];

    colorPickers.forEach(({ id, previewId }) => {
      const picker = document.getElementById(id);
      if (picker) {
        this.updateColorPreview(previewId, picker.value);
      }
    });

    // Initialize gradient preview
    this.updateGradientPreview();

    // Initialize slider value displays
    const opacitySlider = document.getElementById('panel-opacity-slider');
    if (opacitySlider) {
      this.handleOpacityChange(opacitySlider.value);
    }

    const glowSlider = document.getElementById('glow-intensity-slider');
    if (glowSlider) {
      this.handleSliderChange('glow-intensity-slider', glowSlider.value);
    }

    const blurSlider = document.getElementById('blur-intensity-slider');
    if (blurSlider) {
      this.handleSliderChange('blur-intensity-slider', blurSlider.value);
    }

    this.log('Color previews initialized');
  }

  /**
   * Initialize animations system
   */
  async initializeAnimations() {
    // Dynamically import AnimationManager when needed
    try {
      const { AnimationManager } = await import('./AnimationManager.js');
      this.animationManager = new AnimationManager(this.featureFlags);
      this.log('Animations initialized');
    } catch (error) {
      console.warn('Could not initialize animations:', error);
    }
  }

  /**
   * Initialize theme customization system
   */
  async initializeThemeCustomization() {
    // Dynamically import ThemeManager when needed
    try {
      const { ThemeManager } = await import('./ThemeManager.js');
      this.themeManager = new ThemeManager(this.selectorMapper.storage, this.featureFlags);
      this.log('Theme customization initialized');
    } catch (error) {
      console.warn('Could not initialize theme customization:', error);
    }
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Listen for feature flag changes
    window.addEventListener('featureFlagChanged', (event) => {
      if (event.detail.flagKey === 'USE_SPACE_THEME') {
        const newTheme = event.detail.enabled ? 'space' : 'legacy';
        if (newTheme !== this.currentTheme) {
          this.switchTheme(newTheme);
        }
      }
    });

    // Listen for resize events
    window.addEventListener('resize', () => {
      this.handleResize();
    });

    // Listen for visibility change
    document.addEventListener('visibilitychange', () => {
      this.handleVisibilityChange();
    });
  }

  /**
   * Handle window resize
   */
  handleResize() {
    // Regenerate responsive elements if needed
    if (this.currentTheme === 'space') {
      // Could regenerate star field or adjust layout
    }
  }

  /**
   * Handle visibility change (tab switching)
   */
  handleVisibilityChange() {
    if (document.hidden) {
      // Pause animations when tab is hidden
      this.pauseAnimations();
    } else {
      // Resume animations when tab is visible
      this.resumeAnimations();
    }
  }

  /**
   * Pause animations for performance
   */
  pauseAnimations() {
    if (this.animationManager) {
      this.animationManager.pause();
    }
  }

  /**
   * Resume animations
   */
  resumeAnimations() {
    if (this.animationManager) {
      this.animationManager.resume();
    }
  }

  /**
   * Set up performance monitoring
   */
  setupPerformanceMonitoring() {
    // Monitor paint events
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'paint') {
            this.recordPerformanceMetric(entry.name, entry.startTime);
          }
        });
      });
      
      try {
        observer.observe({ entryTypes: ['paint', 'measure'] });
      } catch (error) {
        console.warn('Performance monitoring not available:', error);
      }
    }
  }

  /**
   * Record performance metric
   */
  recordPerformanceMetric(type, value) {
    if (!this.performanceMetrics[type]) {
      this.performanceMetrics[type] = [];
    }
    
    this.performanceMetrics[type].push({
      value,
      timestamp: Date.now()
    });

    // Keep only last 10 metrics per type
    if (this.performanceMetrics[type].length > 10) {
      this.performanceMetrics[type] = this.performanceMetrics[type].slice(-10);
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  /**
   * Rollback to previous theme
   */
  async rollbackTheme() {
    if (this.migrationHistory.length === 0) {
      return;
    }

    const lastMigration = this.migrationHistory[this.migrationHistory.length - 1];
    const rollbackTheme = lastMigration.from;

    this.log(`Rolling back to theme: ${rollbackTheme}`);
    
    // Remove the failed migration from history
    this.migrationHistory.pop();
    
    await this.switchTheme(rollbackTheme);
  }

  /**
   * Get current migration status
   */
  getStatus() {
    return {
      currentTheme: this.currentTheme,
      isTransitioning: this.isTransitioning,
      animationsEnabled: this.animationsEnabled,
      migrationHistory: [...this.migrationHistory],
      enabledFlags: this.featureFlags.getEnabledFlags(),
      performanceMetrics: this.getPerformanceMetrics()
    };
  }

  /**
   * Initialize the panel management system
   */
  initializePanelManager() {
    try {
      // Create and initialize PanelManager
      this.panelManager = new PanelManager(this);
      this.log('Panel management system initialized');
    } catch (error) {
      console.error('Failed to initialize panel management:', error);
      this.panelManager = null;
    }
  }

  /**
   * Log messages with context
   */
  log(message) {
    if (this.options.debugMode) {
      console.log(`[MigrationManager] ${message}`);
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    // Clean up panel manager
    if (this.panelManager) {
      this.panelManager.destroy();
    }

    // Clean up feature flags
    if (this.featureFlags) {
      this.featureFlags.destroy();
    }

    // Clean up selector mapper
    if (this.selectorMapper) {
      this.selectorMapper.destroy();
    }

    // Clean up animation manager
    if (this.animationManager) {
      this.animationManager.destroy();
    }

    // Clean up theme manager
    if (this.themeManager) {
      this.themeManager.destroy();
    }

    this.log('Migration Manager destroyed');
  }
}

/**
 * PanelManager Class
 * Handles the pin/unpin functionality for collapsible sidebar panels
 */
class PanelManager {
  constructor(migrationManager) {
    this.migrationManager = migrationManager;
    this.storageKey = 'space-panel-state';
    
    // Panel state management
    this.state = {
      leftCollapsed: false,
      rightCollapsed: false,
      leftPinned: false,
      rightPinned: false
    };
    
    // Event handlers for cleanup
    this.eventHandlers = new Map();
    
    this.initialize();
  }

  /**
   * Initialize the panel management system
   */
  initialize() {
    try {
      // Load saved state
      this.loadState();
      
      // Create panel controls (collapse buttons, indicators, pin buttons)
      this.createPanelControls();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Apply initial state
      this.restoreState();
      
      // Ensure button is positioned correctly after DOM settles
      setTimeout(() => {
        this.updateButtonPosition('left');
      }, 100);
      
      // Also update on next animation frame for immediate visual correction
      requestAnimationFrame(() => {
        this.updateButtonPosition('left');
      });
      
      this.log('Panel management initialized successfully');
    } catch (error) {
      console.error('Panel management initialization failed:', error);
    }
  }

  /**
   * Create collapse/expand buttons and 4-dot indicators for both panels
   */
  createPanelControls() {
    const leftPanel = document.querySelector('.space-layout .left-panel');
    const rightPanel = document.querySelector('.space-layout .right-panel');
    
    if (leftPanel) {
      // Create collapse/expand button
      if (!document.querySelector('.panel-collapse-btn[data-side="left"]')) {
        const leftCollapseBtn = this.createCollapseButton('left');
        // Append to space layout for fixed positioning
        const spaceLayout = document.querySelector('#space-app');
        if (spaceLayout) {
          spaceLayout.appendChild(leftCollapseBtn);
          this.log('Left panel collapse button created and appended to space layout');
          // Update position based on panel
          this.updateButtonPosition('left');
        }
      }
      
      // Create 4-dot indicators
      if (!leftPanel.querySelector('.left-panel-indicators')) {
        const indicators = this.create4DotIndicators();
        leftPanel.appendChild(indicators);
        this.log('Left panel 4-dot indicators created');
      }
    }
    
    if (rightPanel) {
      // Create collapse/expand button
      if (!rightPanel.querySelector('.panel-collapse-btn')) {
        const rightCollapseBtn = this.createCollapseButton('right');
        rightPanel.insertBefore(rightCollapseBtn, rightPanel.firstChild);
        this.log('Right panel collapse button created');
      }
    }
  }

  /**
   * Create individual pin button
   */
  createPinButton(side) {
    const button = document.createElement('button');
    button.className = 'panel-pin-btn';
    button.dataset.side = side;
    button.setAttribute('aria-label', `Pin/Unpin ${side} panel`);
    
    // Create button content
    const icon = document.createElement('span');
    icon.className = 'pin-icon';
    
    const label = document.createElement('span');
    label.className = 'pin-label';
    
    button.appendChild(icon);
    button.appendChild(label);
    
    // Update button state
    this.updatePinButton(button, side);
    
    return button;
  }
  
  /**
   * Create collapse/expand button
   */
  createCollapseButton(side) {
    const button = document.createElement('button');
    button.className = 'panel-collapse-btn';
    button.dataset.side = side;
    button.setAttribute('aria-label', `Collapse/Expand ${side} panel`);
    
    // Button will be positioned by CSS relative to panel
    // No need for inline styles
    
    // Update button state
    this.updateCollapseButton(button, side);
    
    this.migrationManager.log(`Created collapse button for ${side} panel`);
    
    return button;
  }
  
  /**
   * Create 4-dot indicators for left panel
   */
  create4DotIndicators() {
    const container = document.createElement('div');
    container.className = 'left-panel-indicators';
    
    // Create 4 dots for the navigation items
    const indicators = [
      { icon: '💰', label: 'Price Scanner', tab: 'price-checker' },
      { icon: '📦', label: 'Pack Ripper', tab: 'pack-ripper' },
      { icon: '🎙️', label: 'Voice Recognition', tab: 'voice-recognition' },
      { icon: '🧠', label: 'Neural Training', tab: 'training-patterns' }
    ];
    
    indicators.forEach(item => {
      const dot = document.createElement('div');
      dot.className = 'panel-indicator-dot';
      dot.dataset.tab = item.tab;
      dot.textContent = item.icon;
      dot.title = item.label;
      dot.setAttribute('aria-label', `${item.label} indicator`);
      
      container.appendChild(dot);
    });
    
    return container;
  }

  /**
   * Update pin button appearance based on state
   */
  updatePinButton(button, side) {
    if (!button) return;
    
    const icon = button.querySelector('.pin-icon');
    const label = button.querySelector('.pin-label');
    const isCollapsed = this.state[side + 'Collapsed'];
    const isPinned = this.state[side + 'Pinned'];
    
    if (isPinned) {
      button.classList.add('pinned');
      button.title = `Unpin ${side} panel`;
      if (icon) icon.textContent = '📌';
      if (label) label.textContent = 'Pinned';
    } else {
      button.classList.remove('pinned');
      if (isCollapsed) {
        button.title = `Pin ${side} panel (collapsed)`;
        if (icon) icon.textContent = '📍';
        if (label) label.textContent = 'Pin';
      } else {
        button.title = `Collapse ${side} panel`;
        if (icon) icon.textContent = '◀';
        if (label) label.textContent = 'Collapse';
      }
    }
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Panel control click handlers
    this.addEventHandler(document, 'click', (e) => {
      // Handle collapse/expand button clicks
      if (e.target.closest('.panel-collapse-btn')) {
        const button = e.target.closest('.panel-collapse-btn');
        const side = button.dataset.side;
        this.handleCollapseButtonClick(side);
      }
      
      // Handle 4-dot indicator clicks
      if (e.target.closest('.panel-indicator-dot')) {
        const dot = e.target.closest('.panel-indicator-dot');
        const side = 'left'; // Only left panel has indicators
        this.handleIndicatorClick(dot, side);
      }
    });

    // Resize handler for responsive behavior
    this.addEventHandler(window, 'resize', () => {
      this.handleResize();
    });

    // Keyboard shortcuts (optional enhancement)
    this.addEventHandler(document, 'keydown', (e) => {
      this.handleKeyboardShortcuts(e);
    });

    this.log('Panel management event listeners set up');
  }

  /**
   * Add event handler with cleanup tracking
   */
  addEventHandler(element, event, handler) {
    element.addEventListener(event, handler);
    
    if (!this.eventHandlers.has(element)) {
      this.eventHandlers.set(element, []);
    }
    this.eventHandlers.get(element).push({ event, handler });
  }

  /**
   * Handle collapse/expand button clicks
   */
  handleCollapseButtonClick(side) {
    const isCollapsed = this.state[side + 'Collapsed'];
    
    if (isCollapsed) {
      // Expand the collapsed panel
      this.expandPanel(side);
    } else {
      // Collapse the expanded panel
      this.collapsePanel(side);
    }
  }
  
  /**
   * Handle pin button clicks
   */
  handlePinButtonClick(side) {
    const isCollapsed = this.state[side + 'Collapsed'];
    const isPinned = this.state[side + 'Pinned'];
    
    if (isPinned) {
      // Unpin the panel
      this.unpinPanel(side);
    } else if (isCollapsed) {
      // Pin the collapsed panel
      this.pinPanel(side);
    } else {
      // Collapse the panel
      this.collapsePanel(side);
    }
  }
  
  /**
   * Handle 4-dot indicator clicks (expand temporarily)
   */
  handleIndicatorClick(dot, side) {
    if (this.state[side + 'Collapsed'] && !this.state[side + 'Pinned']) {
      // Toggle temporary expansion
      this.toggleTemporaryExpansion(side);
    }
  }

  /**
   * Collapse a panel
   */
  collapsePanel(side) {
    this.state[side + 'Collapsed'] = true;
    
    this.updateContainerClasses();
    this.updatePanelClasses();
    this.updateAllButtons();
    this.saveState();
    
    // Update button position after transition
    setTimeout(() => {
      this.updateButtonPosition(side);
    }, 350);
    
    this.log(`${side} panel collapsed`);
  }

  /**
   * Pin a panel (keeps it collapsed but prevents expansion)
   */
  pinPanel(side) {
    this.state[side + 'Collapsed'] = true;
    this.state[side + 'Pinned'] = true;
    
    this.updateContainerClasses();
    this.updatePanelClasses();
    this.updateAllButtons();
    this.saveState();
    
    this.log(`${side} panel pinned`);
  }

  /**
   * Expand a panel (button-based)
   */
  expandPanel(side) {
    this.state[side + 'Collapsed'] = false;
    
    this.updateContainerClasses();
    this.updatePanelClasses();
    this.updateAllButtons();
    this.saveState();
    
    // Update button position after transition
    setTimeout(() => {
      this.updateButtonPosition(side);
    }, 350);
    
    this.log(`${side} panel expanded`);
  }
  
  /**
   * Toggle temporary expansion (for 4-dot indicators)
   */
  toggleTemporaryExpansion(side) {
    const panel = document.querySelector(`.space-layout .${side}-panel`);
    if (panel) {
      panel.classList.toggle('expanded');
      this.log(`${side} panel temporary expansion toggled`);
    }
  }
  
  /**
   * Unpin a panel (expands it)
   */
  unpinPanel(side) {
    this.state[side + 'Collapsed'] = false;
    this.state[side + 'Pinned'] = false;
    
    this.updateContainerClasses();
    this.updatePanelClasses();
    this.updateAllButtons();
    this.saveState();
    
    this.log(`${side} panel unpinned and expanded`);
  }

  /**
   * Update container classes based on panel states
   */
  updateContainerClasses() {
    const container = document.querySelector('.space-layout .container');
    if (!container) {
      this.log('WARNING: Container not found for class updates');
      return;
    }

    // Remove all panel state classes
    container.classList.remove('panels-normal', 'panels-collapsed', 'left-collapsed', 'right-collapsed');
    
    // Determine new container state
    const leftCollapsed = this.state.leftCollapsed;
    const rightCollapsed = this.state.rightCollapsed;
    
    if (leftCollapsed && rightCollapsed) {
      container.classList.add('panels-collapsed');
    } else if (leftCollapsed) {
      container.classList.add('left-collapsed');
    } else if (rightCollapsed) {
      container.classList.add('right-collapsed');
    } else {
      container.classList.add('panels-normal');
    }
  }

  /**
   * Update individual panel classes
   */
  updatePanelClasses() {
    const leftPanel = document.querySelector('.space-layout .left-panel');
    const rightPanel = document.querySelector('.space-layout .right-panel');
    
    // Update left panel
    if (leftPanel) {
      leftPanel.classList.toggle('collapsed', this.state.leftCollapsed);
      
      // Remove temporary expansion class
      leftPanel.classList.remove('expanded');
    }
    
    // Update right panel
    if (rightPanel) {
      rightPanel.classList.toggle('collapsed', this.state.rightCollapsed);
      
      // Remove temporary expansion class
      rightPanel.classList.remove('expanded');
    }
  }

  /**
   * Update collapse button appearance based on state
   */
  updateCollapseButton(button, side) {
    if (!button) return;
    
    const isCollapsed = this.state[side + 'Collapsed'];
    
    // Update button title for accessibility
    button.title = isCollapsed ? 'Expand left panel' : 'Collapse left panel';
    
    // Update position
    this.updateButtonPosition(side);
  }
  
  /**
   * Update button position based on panel state and actual position
   */
  updateButtonPosition(side) {
    if (side !== 'left') return;
    
    const button = document.querySelector('.panel-collapse-btn[data-side="left"]');
    const panel = document.querySelector('.space-layout .left-panel');
    
    if (!button || !panel) return;
    
    // Get the actual position of the panel
    const panelRect = panel.getBoundingClientRect();
    const isCollapsed = this.state.leftCollapsed;
    
    // Position button at right edge of panel (button fully on the right edge)
    const buttonLeft = panelRect.right; // Button starts exactly at panel's right edge
    button.style.left = `${buttonLeft}px`;
    
    this.migrationManager.log(`Updated button position: ${buttonLeft}px (panel right: ${panelRect.right})`);
    
    // Ensure button is visible
    button.style.opacity = '1';
    button.style.visibility = 'visible';
  }
  
  /**
   * Update 4-dot indicators based on current active tab
   */
  update4DotIndicators() {
    const indicators = document.querySelectorAll('.panel-indicator-dot');
    const activeTab = document.querySelector('.nav-item.active');
    const activeTabName = activeTab ? activeTab.dataset.tab : 'price-checker';
    
    indicators.forEach(dot => {
      if (dot.dataset.tab === activeTabName) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }

  /**
   * Update all panel buttons (collapse only)
   */
  updateAllButtons() {
    // Update collapse buttons
    const leftCollapseBtn = document.querySelector('.panel-collapse-btn[data-side="left"]');
    const rightCollapseBtn = document.querySelector('.panel-collapse-btn[data-side="right"]');
    
    if (leftCollapseBtn) this.updateCollapseButton(leftCollapseBtn, 'left');
    if (rightCollapseBtn) this.updateCollapseButton(rightCollapseBtn, 'right');
    
    // Update 4-dot indicators
    this.update4DotIndicators();
  }

  /**
   * Handle keyboard shortcuts
   */
  handleKeyboardShortcuts(e) {
    // Only handle shortcuts if space theme is active
    if (this.migrationManager.currentTheme !== 'space') return;
    
    // Ctrl/Cmd + [ = Toggle left panel
    if ((e.ctrlKey || e.metaKey) && e.key === '[') {
      e.preventDefault();
      this.togglePanel('left');
    }
    
    // Ctrl/Cmd + ] = Toggle right panel  
    if ((e.ctrlKey || e.metaKey) && e.key === ']') {
      e.preventDefault();
      this.togglePanel('right');
    }
  }

  /**
   * Toggle panel state (collapse/expand)
   */
  togglePanel(side) {
    if (this.state[side + 'Collapsed']) {
      this.expandPanel(side);
    } else {
      this.collapsePanel(side);
    }
  }

  /**
   * Handle window resize for responsive behavior
   */
  handleResize() {
    const isMobile = window.innerWidth <= 768;
    const container = document.querySelector('.space-layout .container');
    
    if (isMobile) {
      // Disable collapsible functionality on mobile
      if (container) {
        container.classList.remove('panels-collapsed', 'left-collapsed', 'right-collapsed');
        container.classList.add('panels-normal');
      }
      
      // Hide panel control buttons on mobile
      const collapseButtons = document.querySelectorAll('.panel-collapse-btn');
      collapseButtons.forEach(btn => {
        btn.style.display = 'none';
      });
      
      const indicators = document.querySelector('.left-panel-indicators');
      if (indicators) {
        indicators.style.display = 'none';
      };
      
      this.log('Panel management disabled for mobile');
    } else {
      // Re-enable on desktop
      this.updateContainerClasses();
      
      // Show panel control buttons
      const collapseButtons = document.querySelectorAll('.panel-collapse-btn');
      collapseButtons.forEach(btn => {
        btn.style.display = 'flex';
      });
      
      const indicators = document.querySelector('.left-panel-indicators');
      if (indicators) {
        indicators.style.display = 'flex';
      };
      
      this.log('Panel management enabled for desktop');
    }
  }

  /**
   * Load state from localStorage
   */
  loadState() {
    try {
      const savedState = localStorage.getItem(this.storageKey);
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        this.state = {
          ...this.state,
          ...parsedState
        };
        this.log('Panel state loaded from localStorage');
      }
    } catch (error) {
      console.warn('Failed to load panel state:', error);
      // Use default state
    }
  }

  /**
   * Save state to localStorage
   */
  saveState() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch (error) {
      console.warn('Failed to save panel state:', error);
    }
  }

  /**
   * Restore state on initialization
   */
  restoreState() {
    // Apply the loaded state
    this.updateContainerClasses();
    this.updatePanelClasses();
    this.updateAllButtons();
    
    // Handle initial responsive state
    this.handleResize();
    
    // Position button after state is restored
    requestAnimationFrame(() => {
      this.updateButtonPosition('left');
    });
    
    this.log('Panel state restored');
  }

  /**
   * Get current panel state (for debugging)
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Reset panels to default state
   */
  resetPanels() {
    this.state = {
      leftCollapsed: false,
      rightCollapsed: false,
      leftPinned: false,
      rightPinned: false
    };
    
    this.updateContainerClasses();
    this.updatePanelClasses();
    this.updatePinButtons();
    this.saveState();
    
    this.log('Panels reset to default state');
  }

  /**
   * Log messages with context
   */
  log(message) {
    if (this.migrationManager && this.migrationManager.options.debugMode) {
      console.log(`[PanelManager] ${message}`);
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    // Remove all event listeners
    for (const [element, handlers] of this.eventHandlers) {
      for (const { event, handler } of handlers) {
        element.removeEventListener(event, handler);
      }
    }
    
    this.eventHandlers.clear();
    this.log('Panel management destroyed');
  }
}