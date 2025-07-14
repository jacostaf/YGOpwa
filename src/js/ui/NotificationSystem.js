/**
 * Enhanced Notification System
 * 
 * Provides comprehensive notification management with:
 * - Multiple notification types (success, error, warning, info)
 * - Auto-dismiss and persistent notifications
 * - Action buttons and callbacks
 * - Position and styling customization
 * - Sound notifications
 * - Notification history
 */

import { Logger } from '../utils/Logger.js';

export class NotificationSystem {
    constructor(logger = null) {
        this.logger = logger || new Logger('NotificationSystem');
        
        // Notification container
        this.container = null;
        this.notifications = new Map();
        this.history = [];
        
        // Configuration
        this.config = {
            position: 'top-right',
            maxNotifications: 5,
            defaultDuration: 5000,
            enableSounds: true,
            enableHistory: true
        };
        
        // Sound effects
        this.sounds = new Map();
        
        this.initialize();
    }

    /**
     * Initialize the notification system
     */
    initialize() {
        this.createContainer();
        this.loadSounds();
        this.setupStyles();
        
        this.logger.info('Notification system initialized');
    }

    /**
     * Create notification container
     */
    createContainer() {
        this.container = document.createElement('div');
        this.container.id = 'notification-container';
        this.container.className = `notification-container ${this.config.position}`;
        
        document.body.appendChild(this.container);
    }

    /**
     * Load notification sounds
     */
    loadSounds() {
        const soundFiles = {
            success: 'data:audio/wav;base64,UklGRnAEAABXQVZFZm10IBAAAAABAAEBB...',
            error: 'data:audio/wav;base64,UklGRnAEAABXQVZFZm10IBAAAAABAAEBB...',
            warning: 'data:audio/wav;base64,UklGRnAEAABXQVZFZm10IBAAAAABAAEBB...',
            info: 'data:audio/wav;base64,UklGRnAEAABXQVZFZm10IBAAAAABAAEBB...'
        };

        for (const [type, data] of Object.entries(soundFiles)) {
            try {
                const audio = new Audio(data);
                audio.volume = 0.3;
                this.sounds.set(type, audio);
            } catch (error) {
                this.logger.warn(`Failed to load ${type} sound:`, error);
            }
        }
    }

    /**
     * Setup notification styles
     */
    setupStyles() {
        if (document.getElementById('notification-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification-container {
                position: fixed;
                z-index: 10000;
                pointer-events: none;
            }
            
            .notification-container.top-right {
                top: 20px;
                right: 20px;
            }
            
            .notification-container.top-left {
                top: 20px;
                left: 20px;
            }
            
            .notification-container.bottom-right {
                bottom: 20px;
                right: 20px;
            }
            
            .notification-container.bottom-left {
                bottom: 20px;
                left: 20px;
            }
            
            .notification {
                pointer-events: auto;
                margin-bottom: 10px;
                min-width: 300px;
                max-width: 400px;
                padding: 16px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                border-left: 4px solid;
                background: white;
                transform: translateX(100%);
                transition: all 0.3s ease;
                opacity: 0;
            }
            
            .notification.show {
                transform: translateX(0);
                opacity: 1;
            }
            
            .notification.success {
                border-left-color: #28a745;
                background: #f8fff9;
            }
            
            .notification.error {
                border-left-color: #dc3545;
                background: #fff8f8;
            }
            
            .notification.warning {
                border-left-color: #ffc107;
                background: #fffef8;
            }
            
            .notification.info {
                border-left-color: #17a2b8;
                background: #f8feff;
            }
            
            .notification-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 8px;
            }
            
            .notification-title {
                font-weight: 600;
                font-size: 14px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .notification-icon {
                font-size: 16px;
            }
            
            .notification-close {
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                opacity: 0.5;
                transition: opacity 0.2s;
            }
            
            .notification-close:hover {
                opacity: 1;
            }
            
            .notification-message {
                font-size: 13px;
                line-height: 1.4;
                color: #666;
                margin-bottom: 12px;
            }
            
            .notification-actions {
                display: flex;
                gap: 8px;
                justify-content: flex-end;
            }
            
            .notification-action {
                padding: 4px 12px;
                border: 1px solid #ddd;
                background: white;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .notification-action:hover {
                background: #f8f9fa;
            }
            
            .notification-action.primary {
                background: #007bff;
                color: white;
                border-color: #007bff;
            }
            
            .notification-action.primary:hover {
                background: #0056b3;
            }
            
            .notification-progress {
                height: 3px;
                background: rgba(0, 0, 0, 0.1);
                margin-top: 8px;
                border-radius: 1px;
                overflow: hidden;
            }
            
            .notification-progress-bar {
                height: 100%;
                background: currentColor;
                border-radius: 1px;
                transition: width 0.1s linear;
            }
        `;
        
        document.head.appendChild(styles);
    }

    /**
     * Show notification
     */
    show(options = {}) {
        const notification = this.createNotification(options);
        const id = this.generateId();
        
        notification.dataset.id = id;
        this.notifications.set(id, notification);
        
        // Add to history
        if (this.config.enableHistory) {
            this.history.unshift({
                id,
                timestamp: new Date(),
                ...options
            });
            
            // Limit history size
            if (this.history.length > 100) {
                this.history = this.history.slice(0, 100);
            }
        }
        
        // Remove old notifications if limit exceeded
        if (this.notifications.size > this.config.maxNotifications) {
            const oldestId = Array.from(this.notifications.keys())[0];
            this.hide(oldestId);
        }
        
        // Add to container
        this.container.appendChild(notification);
        
        // Show animation
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });
        
        // Play sound
        if (this.config.enableSounds && options.type) {
            this.playSound(options.type);
        }
        
        // Auto-dismiss
        if (options.duration !== false) {
            const duration = options.duration || this.config.defaultDuration;
            setTimeout(() => {
                this.hide(id);
            }, duration);
        }
        
        return id;
    }

    /**
     * Create notification element
     */
    createNotification(options) {
        const {
            type = 'info',
            title = '',
            message = '',
            actions = [],
            showProgress = false
        } = options;
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icon = this.getIcon(type);
        
        notification.innerHTML = `
            <div class="notification-header">
                <div class="notification-title">
                    <i class="notification-icon ${icon}"></i>
                    ${title}
                </div>
                <button class="notification-close" aria-label="Close">×</button>
            </div>
            ${message ? `<div class="notification-message">${message}</div>` : ''}
            ${actions.length > 0 ? `<div class="notification-actions"></div>` : ''}
            ${showProgress ? `
                <div class="notification-progress">
                    <div class="notification-progress-bar" style="width: 0%"></div>
                </div>
            ` : ''}
        `;
        
        // Setup close button
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            const id = notification.dataset.id;
            this.hide(id);
        });
        
        // Setup action buttons
        if (actions.length > 0) {
            const actionsContainer = notification.querySelector('.notification-actions');
            actions.forEach(action => {
                const button = document.createElement('button');
                button.className = `notification-action ${action.style || ''}`;
                button.textContent = action.text;
                button.addEventListener('click', () => {
                    if (action.callback) {
                        action.callback();
                    }
                    if (action.dismiss !== false) {
                        const id = notification.dataset.id;
                        this.hide(id);
                    }
                });
                actionsContainer.appendChild(button);
            });
        }
        
        return notification;
    }

    /**
     * Get icon for notification type
     */
    getIcon(type) {
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        return icons[type] || icons.info;
    }

    /**
     * Hide notification
     */
    hide(id) {
        const notification = this.notifications.get(id);
        if (!notification) return;
        
        notification.classList.remove('show');
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            this.notifications.delete(id);
        }, 300);
    }

    /**
     * Update notification progress
     */
    updateProgress(id, percentage) {
        const notification = this.notifications.get(id);
        if (!notification) return;
        
        const progressBar = notification.querySelector('.notification-progress-bar');
        if (progressBar) {
            progressBar.style.width = `${Math.max(0, Math.min(100, percentage))}%`;
        }
    }

    /**
     * Play notification sound
     */
    playSound(type) {
        const sound = this.sounds.get(type);
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(() => {
                // Ignore sound play errors (user interaction required)
            });
        }
    }

    /**
     * Generate unique ID
     */
    generateId() {
        return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Clear all notifications
     */
    clearAll() {
        for (const id of this.notifications.keys()) {
            this.hide(id);
        }
    }

    /**
     * Configure notification system
     */
    configure(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        // Update container position
        if (newConfig.position) {
            this.container.className = `notification-container ${newConfig.position}`;
        }
    }

    /**
     * Convenience methods
     */
    success(title, message, options = {}) {
        return this.show({
            type: 'success',
            title,
            message,
            ...options
        });
    }

    error(title, message, options = {}) {
        return this.show({
            type: 'error',
            title,
            message,
            duration: false, // Errors don't auto-dismiss
            ...options
        });
    }

    warning(title, message, options = {}) {
        return this.show({
            type: 'warning',
            title,
            message,
            ...options
        });
    }

    info(title, message, options = {}) {
        return this.show({
            type: 'info',
            title,
            message,
            ...options
        });
    }

    /**
     * Show progress notification
     */
    progress(title, message, options = {}) {
        return this.show({
            type: 'info',
            title,
            message,
            showProgress: true,
            duration: false,
            ...options
        });
    }

    /**
     * Get notification history
     */
    getHistory() {
        return [...this.history];
    }
}