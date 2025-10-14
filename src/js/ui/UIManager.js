/**
 * UI Manager - Simplified UI Utilities for Router-Based Navigation
 *
 * Provides essential UI utilities for VoxRip:
 * - Toast notifications with animations
 * - Modal dialogs with animations
 * - Loading states with animations
 * - Generic UI helpers
 *
 * Note: Page rendering and navigation now handled by Router and Page components
 */

import { Logger } from '../utils/Logger.js';
import AnimationHelper from '../../utils/AnimationHelper.js';

export class UIManager {
    constructor(logger = null) {
        this.logger = logger || new Logger('UIManager');

        // Animation helper
        this.animationHelper = AnimationHelper;

        // Toast management
        this.toasts = [];
        this.toastContainer = null;

        // Modal management
        this.modals = [];
        this.modalOverlay = null;
        this.currentModal = null;

        // Loading state
        this.isLoading = false;
        this.loadingOverlay = null;

        // Configuration
        this.config = {
            toastDuration: 5000,
            maxToasts: 5,
            animationDuration: 300
        };

        this.logger.info('UIManager initialized (router-based)');
    }

    /**
     * Initialize the UI manager
     */
    async initialize(app) {
        try {
            this.logger.info('Initializing UI manager...');
            this.app = app;

            // Get DOM element references
            this.toastContainer = document.getElementById('toast-container') || this.createToastContainer();
            this.modalOverlay = document.getElementById('modal-overlay') || this.createModalOverlay();

            // Set up global event listeners
            this.setupGlobalListeners();

            this.logger.info('UI manager initialized successfully');

        } catch (error) {
            this.logger.error('Failed to initialize UI manager:', error);
            throw error;
        }
    }

    /**
     * Create toast container if it doesn't exist
     */
    createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        container.setAttribute('aria-live', 'polite');
        container.setAttribute('aria-atomic', 'false');
        document.body.appendChild(container);
        return container;
    }

    /**
     * Create modal overlay if it doesn't exist
     */
    createModalOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'modal-overlay';
        overlay.className = 'modal-overlay hidden';
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.closeModal();
            }
        });
        document.body.appendChild(overlay);
        return overlay;
    }

    /**
     * Set up global event listeners
     */
    setupGlobalListeners() {
        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentModal) {
                this.closeModal();
            }
        });
    }

    /**
     * Show a toast notification
     * @param {string} message - Toast message
     * @param {string} type - Toast type: 'info', 'success', 'warning', 'error'
     * @param {number} duration - Duration in ms (optional)
     */
    showToast(message, type = 'info', duration = null) {
        if (!this.toastContainer) {
            console.warn('Toast container not initialized');
            return;
        }

        // Remove old toasts if we have too many
        while (this.toasts.length >= this.config.maxToasts) {
            const oldToast = this.toasts.shift();
            if (oldToast && oldToast.element) {
                oldToast.element.remove();
            }
        }

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
        toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon" aria-hidden="true">${this.getToastIcon(type)}</span>
                <span class="toast-message">${this.escapeHtml(message)}</span>
                <button class="toast-close" aria-label="Close notification">&times;</button>
            </div>
        `;

        // Add to container
        this.toastContainer.appendChild(toast);

        // Close button handler
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            this.removeToast(toast);
        });

        // Auto-remove after duration
        const toastDuration = duration || this.config.toastDuration;
        const timeoutId = setTimeout(() => {
            this.removeToast(toast);
        }, toastDuration);

        // Store toast reference
        const toastObj = { element: toast, timeoutId };
        this.toasts.push(toastObj);

        // Animate in with slide from right
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';

        requestAnimationFrame(() => {
            toast.classList.add('toast');
            if (type === 'success') {
                toast.classList.add('toast-success');
            }
            toast.style.transition = 'all 300ms ease-out';
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        });

        this.logger.debug(`Toast shown: ${type} - ${message}`);
    }

    /**
     * Remove a toast
     */
    async removeToast(toastElement) {
        if (!toastElement) return;

        // Find toast in array
        const index = this.toasts.findIndex(t => t.element === toastElement);
        if (index !== -1) {
            const toast = this.toasts[index];

            // Clear timeout
            if (toast.timeoutId) {
                clearTimeout(toast.timeoutId);
            }

            // Remove from array
            this.toasts.splice(index, 1);
        }

        // Animate out (slide right and fade)
        toastElement.classList.add('toast-exit');
        toastElement.style.opacity = '0';
        toastElement.style.transform = 'translateX(100%)';

        setTimeout(() => {
            toastElement.remove();
        }, this.config.animationDuration);
    }

    /**
     * Get icon for toast type
     */
    getToastIcon(type) {
        const icons = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌'
        };
        return icons[type] || icons.info;
    }

    /**
     * Show a modal dialog
     * @param {Object} options - Modal options
     */
    showModal(options = {}) {
        const {
            title = 'Modal',
            content = '',
            buttons = [],
            closeOnOverlay = true,
            onClose = null
        } = options;

        if (!this.modalOverlay) {
            console.warn('Modal overlay not initialized');
            return;
        }

        // Close existing modal
        if (this.currentModal) {
            this.closeModal();
        }

        // Create modal element
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-header">
                <h2>${this.escapeHtml(title)}</h2>
                <button class="modal-close" aria-label="Close">&times;</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
            <div class="modal-footer">
                ${this.renderModalButtons(buttons)}
            </div>
        `;

        // Add to overlay
        this.modalOverlay.innerHTML = '';
        this.modalOverlay.appendChild(modal);
        this.modalOverlay.classList.remove('hidden');

        // Animate modal in
        this.modalOverlay.classList.add('modal-backdrop');
        modal.classList.add('modal-content');
        modal.style.opacity = '0';
        modal.style.transform = 'scale(0.9)';

        requestAnimationFrame(() => {
            modal.style.transition = 'all 250ms ease-out';
            modal.style.opacity = '1';
            modal.style.transform = 'scale(1)';
        });

        // Close button handler
        const closeBtn = modal.querySelector('.modal-close');
        closeBtn.addEventListener('click', () => {
            this.closeModal();
            if (onClose) onClose();
        });

        // Button handlers
        buttons.forEach((button, index) => {
            const btnElement = modal.querySelector(`[data-button-index="${index}"]`);
            if (btnElement && button.onClick) {
                btnElement.addEventListener('click', () => {
                    button.onClick();
                    if (button.closeOnClick !== false) {
                        this.closeModal();
                    }
                });
            }
        });

        this.currentModal = modal;

        this.logger.debug(`Modal shown: ${title}`);
    }

    /**
     * Render modal buttons
     */
    renderModalButtons(buttons) {
        if (!buttons || buttons.length === 0) {
            return '<button class="btn btn-primary" data-button-index="0">OK</button>';
        }

        return buttons.map((button, index) => {
            const className = button.className || 'btn btn-secondary';
            const label = this.escapeHtml(button.label || 'Button');
            return `<button class="${className}" data-button-index="${index}">${label}</button>`;
        }).join('');
    }

    /**
     * Close the current modal
     */
    closeModal() {
        if (!this.currentModal || !this.modalOverlay) return;

        // Animate modal out
        this.currentModal.classList.add('modal-content-exit');
        this.currentModal.style.opacity = '0';
        this.currentModal.style.transform = 'scale(0.9)';

        this.modalOverlay.classList.add('modal-backdrop-exit');

        setTimeout(() => {
            this.modalOverlay.classList.add('hidden');
            this.modalOverlay.classList.remove('modal-backdrop', 'modal-backdrop-exit');
            this.currentModal = null;
        }, 200);

        this.logger.debug('Modal closed');
    }

    /**
     * Set loading state
     * @param {boolean} loading - Loading state
     * @param {string} message - Loading message (optional)
     */
    setLoading(loading, message = 'Loading...') {
        this.isLoading = loading;

        if (loading) {
            this.showLoadingOverlay(message);
        } else {
            this.hideLoadingOverlay();
        }
    }

    /**
     * Show loading overlay
     */
    showLoadingOverlay(message) {
        if (!this.loadingOverlay) {
            this.loadingOverlay = document.createElement('div');
            this.loadingOverlay.className = 'loading-overlay';
            document.body.appendChild(this.loadingOverlay);
        }

        this.loadingOverlay.innerHTML = `
            <div class="loading-content">
                <svg class="spinner" style="width: 40px; height: 40px;" viewBox="0 0 50 50">
                    <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" stroke-width="4" stroke-dasharray="90, 150" stroke-linecap="round"></circle>
                </svg>
                <p class="loading-text">${this.escapeHtml(message)}</p>
            </div>
        `;

        this.loadingOverlay.classList.remove('hidden', 'loading-overlay-exit');

        // Animate in
        this.loadingOverlay.style.opacity = '0';
        requestAnimationFrame(() => {
            this.loadingOverlay.style.transition = 'opacity 200ms ease-out';
            this.loadingOverlay.style.opacity = '1';
        });
    }

    /**
     * Hide loading overlay
     */
    hideLoadingOverlay() {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.add('loading-overlay-exit');
            this.loadingOverlay.style.opacity = '0';

            setTimeout(() => {
                this.loadingOverlay.classList.add('hidden');
                this.loadingOverlay.classList.remove('loading-overlay-exit');
            }, 200);
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (typeof text !== 'string') return text;

        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Show confirmation dialog
     * @param {string} message - Confirmation message
     * @param {function} onConfirm - Callback on confirm
     * @param {function} onCancel - Callback on cancel (optional)
     */
    showConfirmation(message, onConfirm, onCancel = null) {
        this.showModal({
            title: 'Confirm',
            content: `<p>${this.escapeHtml(message)}</p>`,
            buttons: [
                {
                    label: 'Cancel',
                    className: 'btn btn-secondary',
                    onClick: () => {
                        if (onCancel) onCancel();
                    }
                },
                {
                    label: 'Confirm',
                    className: 'btn btn-primary',
                    onClick: onConfirm
                }
            ]
        });
    }

    /**
     * Show alert dialog
     * @param {string} message - Alert message
     * @param {string} type - Alert type: 'info', 'success', 'warning', 'error'
     */
    showAlert(message, type = 'info') {
        const icon = this.getToastIcon(type);
        this.showModal({
            title: type.charAt(0).toUpperCase() + type.slice(1),
            content: `<p>${icon} ${this.escapeHtml(message)}</p>`,
            buttons: [
                {
                    label: 'OK',
                    className: 'btn btn-primary'
                }
            ]
        });
    }

    /**
     * Clean up UI manager
     */
    cleanup() {
        // Remove all toasts
        this.toasts.forEach(toast => {
            if (toast.timeoutId) {
                clearTimeout(toast.timeoutId);
            }
            if (toast.element) {
                toast.element.remove();
            }
        });
        this.toasts = [];

        // Close modal
        this.closeModal();

        // Hide loading
        this.setLoading(false);

        this.logger.info('UI manager cleaned up');
    }

    /**
     * Utility: Format currency
     */
    formatCurrency(value, currency = 'USD') {
        if (value === null || value === undefined || isNaN(value)) {
            return '--';
        }
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(value);
    }

    /**
     * Utility: Format date
     */
    formatDate(date, options = {}) {
        if (!date) return '--';

        const d = date instanceof Date ? date : new Date(date);
        return d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            ...options
        });
    }

    /**
     * Utility: Format relative time (e.g., "2 hours ago")
     */
    formatRelativeTime(date) {
        if (!date) return '--';

        const d = date instanceof Date ? date : new Date(date);
        const now = Date.now();
        const diff = now - d.getTime();

        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'just now';
    }
}
