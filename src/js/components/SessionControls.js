/**
 * SessionControls - UI Controls for Session Management
 * 
 * Provides UI elements for managing ripper sessions:
 * - Reload Last Session button
 * - Session status indicators
 * - Performance metrics display
 */

export class SessionControls {
    constructor(sessionManager, containerId = 'session-controls') {
        this.sessionManager = sessionManager;
        this.container = document.getElementById(containerId);
        this.initialized = false;
        
        // Bind methods
        this.init = this.init.bind(this);
        this.render = this.render.bind(this);
        this.handleReloadClick = this.handleReloadClick.bind(this);
        this.updateStatus = this.updateStatus.bind(this);
        
        // Initialize
        this.init();
    }
    
    /**
     * Initialize the component
     */
    init() {
        if (this.initialized) return;
        
        // Create container if it doesn't exist
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'session-controls';
            document.body.appendChild(this.container);
        }
        
        // Add event listeners
        document.addEventListener('session:update', this.updateStatus);
        
        // Store bound methods for cleanup
        this.boundHandleReloadClick = this.handleReloadClick.bind(this);
        
        // Initial render
        this.render();
        this.initialized = true;
        
        console.log('SessionControls initialized');
    }
    
    /**
     * Clean up event listeners and resources
     */
    cleanup() {
        if (!this.initialized) return;
        
        console.log('Cleaning up SessionControls...');
        
        // Remove event listeners
        document.removeEventListener('session:update', this.updateStatus);
        
        // Remove button click listener if it exists
        const reloadButton = this.container.querySelector('.reload-session-btn');
        if (reloadButton) {
            reloadButton.removeEventListener('click', this.boundHandleReloadClick);
        }
        
        // Clear container content
        this.container.innerHTML = '';
        
        this.initialized = false;
        console.log('SessionControls cleanup complete');
    }
    
    /**
     * Render the component
     */
    render() {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="session-controls-container">
                <div class="session-status">
                    <span class="status-indicator" id="session-status-indicator"></span>
                    <span id="session-status-text">Session Inactive</span>
                </div>
                <div class="session-actions">
                    <button id="reload-session-btn" class="btn btn-secondary" disabled>
                        <i class="fas fa-sync-alt"></i> Reload Last Session
                    </button>
                    <div class="session-stats" id="session-stats">
                        <span class="stat">Cards: <span id="card-count">0</span></span>
                        <span class="stat">Value: $<span id="session-value">0.00</span></span>
                    </div>
                </div>
                <div class="performance-metrics" id="performance-metrics">
                    <div class="metric">
                        <span class="metric-label">Save Time:</span>
                        <span class="metric-value" id="save-time">0ms</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Last Save:</span>
                        <span class="metric-value" id="last-save">Never</span>
                    </div>
                </div>
            </div>
        `;
        
        // Add event listeners
        const reloadBtn = this.container.querySelector('#reload-session-btn');
        if (reloadBtn) {
            // Remove any existing listener to prevent duplicates
            reloadBtn.removeEventListener('click', this.boundHandleReloadClick);
            // Add the bound listener
            reloadBtn.addEventListener('click', this.boundHandleReloadClick);
        }
        
        // Initial update
        this.updateStatus();
    }
    
    /**
     * Handle click on Reload Last Session button
     */
    async handleReloadClick() {
        const btn = this.container.querySelector('#reload-session-btn');
        if (!btn || btn.disabled) return;
        
        try {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
            
            // Show loading state
            this.updateStatus({ loading: true });
            
            // Reload the session
            const session = await this.sessionManager.loadLastSession();
            
            if (session) {
                // Show success message
                this.showNotification('Session loaded successfully', 'success');
                
                // Update UI
                this.updateStatus({ 
                    active: true,
                    cardCount: session.cards?.length || 0,
                    sessionValue: session.statistics?.totalValue || 0
                });
                
                // Emit event for other components
                document.dispatchEvent(new CustomEvent('session:reloaded', { 
                    detail: { session }
                }));
            } else {
                this.showNotification('No previous session found', 'warning');
            }
            
        } catch (error) {
            console.error('Failed to reload session:', error);
            this.showNotification('Failed to load session', 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-sync-alt"></i> Reload Last Session';
            }
            this.updateStatus({ loading: false });
        }
    }
    
    /**
     * Update the status display
     */
    updateStatus(data = {}) {
        const indicator = this.container?.querySelector('#session-status-indicator');
        const statusText = this.container?.querySelector('#session-status-text');
        const cardCount = this.container?.querySelector('#card-count');
        const sessionValue = this.container?.querySelector('#session-value');
        const reloadBtn = this.container?.querySelector('#reload-session-btn');
        const saveTime = this.container?.querySelector('#save-time');
        const lastSave = this.container?.querySelector('#last-save');
        
        if (!indicator || !statusText || !reloadBtn) return;
        
        // Update loading state
        if (data.loading !== undefined) {
            reloadBtn.disabled = data.loading;
            reloadBtn.innerHTML = data.loading 
                ? '<i class="fas fa-spinner fa-spin"></i> Loading...' 
                : '<i class="fas fa-sync-alt"></i> Reload Last Session';
        }
        
        // Update session status
        if (data.active !== undefined) {
            indicator.className = `status-indicator ${data.active ? 'active' : 'inactive'}`;
            statusText.textContent = data.active ? 'Session Active' : 'Session Inactive';
        }
        
        // Update card count and value
        if (data.cardCount !== undefined && cardCount) {
            cardCount.textContent = data.cardCount;
        }
        
        if (data.sessionValue !== undefined && sessionValue) {
            sessionValue.textContent = data.sessionValue.toFixed(2);
        }
        
        // Update performance metrics if available
        if (data.metrics) {
            if (saveTime) {
                saveTime.textContent = `${data.metrics.avgSaveTime?.toFixed(2) || '0'}ms`;
            }
            
            if (lastSave && data.metrics.lastSaveTime) {
                const lastSaveDate = new Date(data.metrics.lastSaveTime);
                lastSave.textContent = lastSaveDate.toLocaleTimeString();
            }
        }
    }
    
    /**
     * Show a notification to the user
     */
    showNotification(message, type = 'info') {
        // You can replace this with your preferred notification system
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Add to container if it exists
        if (this.container) {
            this.container.appendChild(notification);
            
            // Auto-remove after delay
            setTimeout(() => {
                notification.classList.add('fade-out');
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
    
    /**
     * Clean up event listeners and references
     */
    destroy() {
        if (this.container) {
            const reloadBtn = this.container.querySelector('#reload-session-btn');
            if (reloadBtn) {
                reloadBtn.removeEventListener('click', this.handleReloadClick);
            }
            
            document.removeEventListener('session:update', this.updateStatus);
            
            if (this.container.parentNode) {
                this.container.parentNode.removeChild(this.container);
            }
            
            this.container = null;
        }
        
        this.initialized = false;
    }
}

// Add some basic styles if not already present
if (!document.getElementById('session-controls-styles')) {
    const style = document.createElement('style');
    style.id = 'session-controls-styles';
    style.textContent = `
        .session-controls-container {
            display: flex;
            flex-direction: column;
            gap: 10px;
            padding: 15px;
            background-color: #f5f5f5;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .session-status {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 500;
        }
        
        .status-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background-color: #ccc;
        }
        
        .status-indicator.active {
            background-color: #4caf50;
            box-shadow: 0 0 5px #4caf50;
        }
        
        .status-indicator.inactive {
            background-color: #f44336;
        }
        
        .session-actions {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .session-stats {
            display: flex;
            gap: 15px;
            margin-left: auto;
        }
        
        .stat {
            font-size: 0.9em;
            color: #666;
        }
        
        .performance-metrics {
            display: flex;
            gap: 20px;
            font-size: 0.8em;
            color: #777;
            margin-top: 5px;
        }
        
        .metric {
            display: flex;
            gap: 5px;
        }
        
        .metric-label {
            font-weight: 500;
        }
        
        .notification {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 4px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            animation: slideIn 0.3s ease-out;
        }
        
        .notification.success {
            background-color: #4caf50;
        }
        
        .notification.error {
            background-color: #f44336;
        }
        
        .notification.warning {
            background-color: #ff9800;
        }
        
        .notification.info {
            background-color: #2196f3;
        }
        
        .notification.fade-out {
            animation: fadeOut 0.3s ease-out forwards;
        }
        
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes fadeOut {
            to { opacity: 0; transform: translateY(20px); }
        }
    `;
    
    document.head.appendChild(style);
}
