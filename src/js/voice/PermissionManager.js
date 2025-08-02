/**
 * Permission Manager - Robust Permission Handling
 * 
 * Handles microphone permissions across different platforms with
 * fallback strategies and user-friendly error messages.
 * 
 * Features:
 * - Cross-platform permission requests
 * - Permission state monitoring
 * - User-friendly permission prompts
 * - Fallback strategies for different browsers
 * - Platform-specific handling (iOS, macOS, Windows)
 */

import { Logger } from '../utils/Logger.js';

export class PermissionManager {
    constructor(logger = null) {
        this.logger = logger || new Logger('PermissionManager');
        
        // Permission state
        this.microphonePermission = 'unknown';
        this.permissionQuery = null;
        
        // Event listeners
        this.listeners = {
            permissionChange: []
        };
        
        // Platform detection
        this.platform = this.detectPlatform();
        this.browser = this.detectBrowser();
        
        // Permission strategies
        this.strategies = [];
        this.initializeStrategies();
        
        this.logger.info(`PermissionManager initialized for ${this.browser} on ${this.platform}`);
    }

    /**
     * Initialize permission request strategies
     */
    initializeStrategies() {
        // Strategy 1: Permissions API (modern browsers)
        this.strategies.push({
            name: 'permissions-api',
            test: () => 'permissions' in navigator && 'query' in navigator.permissions,
            request: () => this.requestViaPermissionsAPI(),
            priority: 10
        });

        // Strategy 2: Direct getUserMedia (fallback)
        this.strategies.push({
            name: 'getusermedia',
            test: () => 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
            request: () => this.requestViaGetUserMedia(),
            priority: 5
        });

        // Strategy 3: Legacy getUserMedia (older browsers)
        this.strategies.push({
            name: 'legacy-getusermedia',
            test: () => 'getUserMedia' in navigator || 'webkitGetUserMedia' in navigator || 'mozGetUserMedia' in navigator,
            request: () => this.requestViaLegacyGetUserMedia(),
            priority: 1
        });

        // Sort strategies by priority
        this.strategies.sort((a, b) => b.priority - a.priority);
        
        this.logger.debug('Permission strategies initialized:', this.strategies.map(s => s.name));
    }

    /**
     * Initialize the permission manager
     */
    async initialize() {
        try {
            this.logger.info('Initializing permission manager...');
            
            // Check current permission state
            await this.checkCurrentPermissionState();
            
            // Set up permission monitoring if available
            await this.setupPermissionMonitoring();
            
            this.logger.info('Permission manager initialized successfully');
            return true;
            
        } catch (error) {
            this.logger.error('Failed to initialize permission manager:', error);
            throw error;
        }
    }

    /**
     * Check current permission state
     */
    async checkCurrentPermissionState() {
        try {
            if ('permissions' in navigator) {
                const result = await navigator.permissions.query({ name: 'microphone' });
                this.microphonePermission = result.state;
                this.logger.info('Current microphone permission state:', result.state);
                return result.state;
            } else {
                this.logger.warn('Permissions API not available, cannot check current state');
                return 'unknown';
            }
        } catch (error) {
            this.logger.warn('Failed to check permission state:', error);
            return 'unknown';
        }
    }

    /**
     * Setup permission monitoring
     */
    async setupPermissionMonitoring() {
        try {
            if ('permissions' in navigator) {
                const result = await navigator.permissions.query({ name: 'microphone' });
                this.permissionQuery = result;
                
                result.addEventListener('change', () => {
                    this.logger.info('Microphone permission changed:', result.state);
                    this.microphonePermission = result.state;
                    this.emitPermissionChange(result.state);
                });
                
                this.logger.debug('Permission monitoring set up successfully');
            }
        } catch (error) {
            this.logger.warn('Failed to setup permission monitoring:', error);
        }
    }

    /**
     * Request microphone permission using the best available strategy
     */
    async requestMicrophone() {
        this.logger.info('Requesting microphone permission...');
        
        // Find the best available strategy
        const strategy = this.strategies.find(s => s.test());
        
        if (!strategy) {
            throw new Error('No permission request strategy available');
        }
        
        this.logger.info(`Using permission strategy: ${strategy.name}`);
        
        try {
            const result = await strategy.request();
            this.logger.info('Permission request completed:', result);
            return result;
        } catch (error) {
            this.logger.error('Permission request failed:', error);
            throw error;
        }
    }

    /**
     * Request permission via Permissions API
     */
    async requestViaPermissionsAPI() {
        try {
            // First check current state
            const query = await navigator.permissions.query({ name: 'microphone' });
            
            if (query.state === 'granted') {
                this.microphonePermission = 'granted';
                return { state: 'granted', method: 'permissions-api' };
            }
            
            if (query.state === 'denied') {
                this.microphonePermission = 'denied';
                return { 
                    state: 'denied', 
                    method: 'permissions-api',
                    message: 'Microphone access has been denied. Please enable it in your browser settings.'
                };
            }
            
            // If prompt state, we need to trigger a getUserMedia to show the prompt
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: true,
                video: false
            });
            
            // Clean up the stream immediately
            stream.getTracks().forEach(track => track.stop());
            
            // Check permission state again
            const newQuery = await navigator.permissions.query({ name: 'microphone' });
            this.microphonePermission = newQuery.state;
            
            return { 
                state: newQuery.state, 
                method: 'permissions-api',
                message: newQuery.state === 'granted' ? 'Microphone access granted' : 'Permission request failed'
            };
            
        } catch (error) {
            this.logger.error('Permissions API request failed:', error);
            
            if (error.name === 'NotAllowedError') {
                this.microphonePermission = 'denied';
                return { 
                    state: 'denied', 
                    method: 'permissions-api',
                    message: 'Microphone access denied by user'
                };
            }
            
            throw error;
        }
    }

    /**
     * Request permission via getUserMedia
     */
    async requestViaGetUserMedia() {
        try {
            this.logger.debug('Requesting permission via getUserMedia');
            
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: false
            });
            
            // Clean up the stream
            stream.getTracks().forEach(track => track.stop());
            
            this.microphonePermission = 'granted';
            
            return { 
                state: 'granted', 
                method: 'getusermedia',
                message: 'Microphone access granted'
            };
            
        } catch (error) {
            this.logger.error('getUserMedia request failed:', error);
            
            let message = 'Failed to access microphone';
            
            switch (error.name) {
                case 'NotAllowedError':
                    this.microphonePermission = 'denied';
                    message = 'Microphone access denied. Please click "Allow" when prompted or enable microphone access in your browser settings.';
                    break;
                case 'NotFoundError':
                    message = 'No microphone found. Please connect a microphone and try again.';
                    break;
                case 'NotReadableError':
                    message = 'Microphone is being used by another application. Please close other applications and try again.';
                    break;
                case 'OverconstrainedError':
                    message = 'Microphone does not meet the required constraints. Please try a different microphone.';
                    break;
                case 'SecurityError':
                    message = 'Microphone access blocked due to security restrictions. Please ensure you are using HTTPS.';
                    break;
                default:
                    message = `Microphone access error: ${error.message}`;
            }
            
            return { 
                state: 'denied', 
                method: 'getusermedia',
                message,
                error: error.name
            };
        }
    }

    /**
     * Request permission via legacy getUserMedia
     */
    async requestViaLegacyGetUserMedia() {
        return new Promise((resolve, reject) => {
            this.logger.debug('Requesting permission via legacy getUserMedia');
            
            const constraints = { audio: true, video: false };
            
            const successCallback = (stream) => {
                // Clean up the stream
                if (stream.getTracks) {
                    stream.getTracks().forEach(track => track.stop());
                } else if (stream.stop) {
                    stream.stop();
                }
                
                this.microphonePermission = 'granted';
                resolve({ 
                    state: 'granted', 
                    method: 'legacy-getusermedia',
                    message: 'Microphone access granted'
                });
            };
            
            const errorCallback = (error) => {
                this.logger.error('Legacy getUserMedia failed:', error);
                
                let message = 'Failed to access microphone';
                
                if (error.name === 'PermissionDeniedError' || error.name === 'NotAllowedError') {
                    this.microphonePermission = 'denied';
                    message = 'Microphone access denied. Please enable microphone access in your browser settings.';
                } else if (error.name === 'DevicesNotFoundError' || error.name === 'NotFoundError') {
                    message = 'No microphone found. Please connect a microphone and try again.';
                }
                
                resolve({ 
                    state: 'denied', 
                    method: 'legacy-getusermedia',
                    message,
                    error: error.name
                });
            };
            
            // Try different legacy methods
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                navigator.mediaDevices.getUserMedia(constraints)
                    .then(successCallback)
                    .catch(errorCallback);
            } else if (navigator.getUserMedia) {
                navigator.getUserMedia(constraints, successCallback, errorCallback);
            } else if (navigator.webkitGetUserMedia) {
                navigator.webkitGetUserMedia(constraints, successCallback, errorCallback);
            } else if (navigator.mozGetUserMedia) {
                navigator.mozGetUserMedia(constraints, successCallback, errorCallback);
            } else {
                reject(new Error('No getUserMedia method available'));
            }
        });
    }

    /**
     * Show platform-specific permission instructions
     */
    showPermissionInstructions() {
        const instructions = this.getPermissionInstructions();
        
        // This would be called by the UI to show instructions
        return instructions;
    }

    /**
     * Get platform-specific permission instructions
     */
    getPermissionInstructions() {
        const browser = this.browser;
        const platform = this.platform;
        
        let instructions = {
            title: 'Enable Microphone Access',
            steps: [],
            notes: []
        };
        
        if (platform === 'ios') {
            if (browser === 'safari') {
                instructions.steps = [
                    'Go to Settings > Safari > Camera & Microphone',
                    'Enable "Ask" or "Allow" for microphone access',
                    'Refresh this page and try again'
                ];
            } else {
                instructions.steps = [
                    'Go to Settings > Privacy & Security > Microphone',
                    `Find ${browser} and enable microphone access`,
                    'Refresh this page and try again'
                ];
            }
            instructions.notes = [
                'You may need to restart your browser after changing settings',
                'Make sure your device is not in silent mode'
            ];
        } else if (platform === 'mac') {
            instructions.steps = [
                'Go to System Preferences > Security & Privacy > Privacy',
                'Select "Microphone" from the left sidebar',
                `Check the box next to ${browser}`,
                'Refresh this page and try again'
            ];
            instructions.notes = [
                'You may need to restart your browser after changing settings',
                'Click the lock icon to make changes if needed'
            ];
        } else if (platform === 'windows') {
            instructions.steps = [
                'Go to Settings > Privacy > Microphone',
                'Make sure "Allow apps to access your microphone" is On',
                `Make sure "${browser}" has microphone access enabled`,
                'Refresh this page and try again'
            ];
            instructions.notes = [
                'You may need to restart your browser after changing settings'
            ];
        } else {
            // Generic instructions
            instructions.steps = [
                'Check your browser settings for microphone permissions',
                'Look for a microphone icon in the address bar',
                'Click "Allow" when prompted for microphone access',
                'Refresh this page if needed'
            ];
        }
        
        return instructions;
    }

    /**
     * Get current permission state
     */
    getPermissionState() {
        return {
            microphone: this.microphonePermission,
            platform: this.platform,
            browser: this.browser,
            hasPermissionsAPI: 'permissions' in navigator,
            hasGetUserMedia: 'mediaDevices' in navigator && navigator.mediaDevices && 'getUserMedia' in navigator.mediaDevices
        };
    }

    /**
     * Reset permission state
     */
    resetPermissionState() {
        this.microphonePermission = 'unknown';
        this.logger.info('Permission state reset');
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
     * Detect browser
     */
    detectBrowser() {
        const userAgent = navigator.userAgent.toLowerCase();
        
        // Check for Edge first since it contains 'chrome' in its user agent
        if (userAgent.includes('edge') || userAgent.includes('edg/')) {
            return 'edge';
        } else if (userAgent.includes('chrome')) {
            return 'chrome';
        } else if (userAgent.includes('firefox')) {
            return 'firefox';
        } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
            return 'safari';
        } else {
            return 'unknown';
        }
    }

    /**
     * Check if environment supports microphone access
     */
    isSupported() {
        // Check for secure context
        if (!window.isSecureContext) {
            return {
                supported: false,
                reason: 'Microphone access requires a secure context (HTTPS)'
            };
        }
        
        // Check for any getUserMedia method
        const hasGetUserMedia = 
            (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) ||
            navigator.getUserMedia ||
            navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia;
        
        if (!hasGetUserMedia) {
            return {
                supported: false,
                reason: 'getUserMedia is not supported in this browser'
            };
        }
        
        return {
            supported: true,
            reason: 'Microphone access is supported'
        };
    }

    // Event handling
    onPermissionChange(callback) {
        this.listeners.permissionChange.push(callback);
    }

    emitPermissionChange(newState) {
        this.listeners.permissionChange.forEach(callback => {
            try {
                callback(newState);
            } catch (error) {
                this.logger.error('Error in permission change callback:', error);
            }
        });
    }
}