/**
 * Stats Dashboard - Collection Analytics and Insights
 * 
 * Provides comprehensive statistics and analytics for card collections:
 * - Collection value tracking
 * - Rarity distribution analysis
 * - Set completion progress
 * - Price trend analysis
 * - Pack opening statistics
 * - Session performance metrics
 */

import { Logger } from '../utils/Logger.js';
import { formatCurrency, formatNumber } from '../utils/formatters.js';

export class StatsDashboard {
    constructor(sessionManager, priceChecker, storage, logger = null) {
        this.sessionManager = sessionManager;
        this.priceChecker = priceChecker;
        this.storage = storage;
        this.logger = logger || new Logger('StatsDashboard');
        
        // Dashboard elements
        this.container = null;
        this.isVisible = false;
        
        // Statistics cache
        this.statsCache = new Map();
        this.lastUpdateTime = 0;
        this.cacheTimeout = 300000; // 5 minutes
        
        // Chart instances
        this.charts = new Map();
        
        this.logger.info('StatsDashboard initialized');
    }

    /**
     * Initialize the dashboard
     */
    async initialize() {
        try {
            this.createDashboardContainer();
            await this.loadStatistics();
            this.setupEventListeners();
            
            this.logger.info('Stats dashboard initialized successfully');
            return true;
        } catch (error) {
            this.logger.error('Failed to initialize stats dashboard:', error);
            throw error;
        }
    }

    /**
     * Create dashboard container
     */
    createDashboardContainer() {
        this.container = document.createElement('div');
        this.container.id = 'stats-dashboard';
        this.container.className = 'stats-dashboard hidden';
        
        this.container.innerHTML = `
            <div class="stats-header">
                <h2>
                    <i class="fas fa-chart-bar"></i>
                    Collection Statistics
                </h2>
                <div class="stats-controls">
                    <button id="refresh-stats" class="btn btn-primary btn-sm">
                        <i class="fas fa-sync-alt"></i>
                        Refresh
                    </button>
                    <button id="export-stats" class="btn btn-secondary btn-sm">
                        <i class="fas fa-download"></i>
                        Export
                    </button>
                    <button id="close-stats" class="btn btn-outline btn-sm">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            
            <div class="stats-content">
                <!-- Overview Cards -->
                <div class="stats-overview">
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-coins"></i>
                        </div>
                        <div class="stat-info">
                            <h3 id="total-value">$0.00</h3>
                            <p>Total Collection Value</p>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-layer-group"></i>
                        </div>
                        <div class="stat-info">
                            <h3 id="total-cards">0</h3>
                            <p>Total Cards</p>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-gem"></i>
                        </div>
                        <div class="stat-info">
                            <h3 id="rare-cards">0</h3>
                            <p>Rare+ Cards</p>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-box-open"></i>
                        </div>
                        <div class="stat-info">
                            <h3 id="packs-opened">0</h3>
                            <p>Packs Opened</p>
                        </div>
                    </div>
                </div>
                
                <!-- Charts Section -->
                <div class="stats-charts">
                    <div class="chart-container">
                        <h4>Rarity Distribution</h4>
                        <canvas id="rarity-chart"></canvas>
                    </div>
                    
                    <div class="chart-container">
                        <h4>Value Distribution</h4>
                        <canvas id="value-chart"></canvas>
                    </div>
                    
                    <div class="chart-container">
                        <h4>Pack Opening Timeline</h4>
                        <canvas id="timeline-chart"></canvas>
                    </div>
                    
                    <div class="chart-container">
                        <h4>Set Completion Progress</h4>
                        <div id="set-progress"></div>
                    </div>
                </div>
                
                <!-- Detailed Statistics -->
                <div class="stats-details">
                    <div class="details-section">
                        <h4>Most Valuable Cards</h4>
                        <div id="valuable-cards"></div>
                    </div>
                    
                    <div class="details-section">
                        <h4>Recent Additions</h4>
                        <div id="recent-cards"></div>
                    </div>
                    
                    <div class="details-section">
                        <h4>Session Statistics</h4>
                        <div id="session-stats"></div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.container);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Control buttons
        document.getElementById('refresh-stats')?.addEventListener('click', () => {
            this.refreshStatistics();
        });
        
        document.getElementById('export-stats')?.addEventListener('click', () => {
            this.exportStatistics();
        });
        
        document.getElementById('close-stats')?.addEventListener('click', () => {
            this.hide();
        });
        
        // Session manager events
        this.sessionManager?.addEventListener('cardAdded', () => {
            this.invalidateCache();
        });
        
        this.sessionManager?.addEventListener('sessionStart', () => {
            this.invalidateCache();
        });
        
        this.sessionManager?.addEventListener('sessionStop', () => {
            this.refreshStatistics();
        });
    }

    /**
     * Show the dashboard
     */
    show() {
        if (this.container) {
            this.container.classList.remove('hidden');
            this.isVisible = true;
            this.refreshStatistics();
        }
    }

    /**
     * Hide the dashboard
     */
    hide() {
        if (this.container) {
            this.container.classList.add('hidden');
            this.isVisible = false;
        }
    }

    /**
     * Toggle dashboard visibility
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Load and calculate statistics
     */
    async loadStatistics() {
        try {
            const now = Date.now();
            
            // Check cache validity
            if (this.lastUpdateTime > 0 && (now - this.lastUpdateTime) < this.cacheTimeout) {
                this.logger.debug('Using cached statistics');
                return this.statsCache.get('current');
            }
            
            this.logger.info('Calculating fresh statistics...');
            
            const stats = await this.calculateStatistics();
            
            // Cache the results
            this.statsCache.set('current', stats);
            this.lastUpdateTime = now;
            
            this.logger.info('Statistics calculated successfully');
            return stats;
            
        } catch (error) {
            this.logger.error('Failed to load statistics:', error);
            throw error;
        }
    }

    /**
     * Calculate comprehensive statistics
     */
    async calculateStatistics() {
        const stats = {
            overview: {
                totalValue: 0,
                totalCards: 0,
                rareCards: 0,
                packsOpened: 0
            },
            rarity: new Map(),
            value: {
                ranges: new Map(),
                mostValuable: []
            },
            timeline: [],
            sets: new Map(),
            sessions: {
                total: 0,
                averageValue: 0,
                bestSession: null
            },
            recent: []
        };
        
        // Get session history
        const sessionHistory = this.sessionManager?.sessionHistory || [];
        
        for (const session of sessionHistory) {
            if (!session.cards || session.cards.length === 0) continue;
            
            stats.sessions.total++;
            let sessionValue = 0;
            
            for (const card of session.cards) {
                stats.overview.totalCards++;
                
                // Rarity distribution
                const rarity = card.rarity?.toLowerCase() || 'common';
                stats.rarity.set(rarity, (stats.rarity.get(rarity) || 0) + 1);
                
                // Count rare cards
                if (['rare', 'super', 'ultra', 'secret', 'ultimate', 'ghost'].includes(rarity)) {
                    stats.overview.rareCards++;
                }
                
                // Value calculations
                const cardValue = this.getCardValue(card);
                stats.overview.totalValue += cardValue;
                sessionValue += cardValue;
                
                // Value ranges
                const range = this.getValueRange(cardValue);
                stats.value.ranges.set(range, (stats.value.ranges.get(range) || 0) + 1);
                
                // Most valuable cards
                if (cardValue > 0) {
                    stats.value.mostValuable.push({
                        ...card,
                        value: cardValue
                    });
                }
                
                // Set tracking
                const setCode = card.setCode || 'Unknown';
                if (!stats.sets.has(setCode)) {
                    stats.sets.set(setCode, {
                        name: card.setName || setCode,
                        cards: 0,
                        value: 0
                    });
                }
                const setData = stats.sets.get(setCode);
                setData.cards++;
                setData.value += cardValue;
                
                // Recent additions
                if (stats.recent.length < 10) {
                    stats.recent.push({
                        ...card,
                        sessionDate: session.startTime,
                        value: cardValue
                    });
                }
            }
            
            // Session statistics
            stats.sessions.averageValue += sessionValue;
            
            if (!stats.sessions.bestSession || sessionValue > stats.sessions.bestSession.value) {
                stats.sessions.bestSession = {
                    date: session.startTime,
                    value: sessionValue,
                    cards: session.cards.length
                };
            }
            
            // Timeline data
            stats.timeline.push({
                date: session.startTime,
                cards: session.cards.length,
                value: sessionValue,
                sessionName: session.name || 'Unknown Session'
            });
        }
        
        // Finalize calculations
        if (stats.sessions.total > 0) {
            stats.sessions.averageValue /= stats.sessions.total;
        }
        
        // Sort most valuable cards
        stats.value.mostValuable.sort((a, b) => b.value - a.value);
        stats.value.mostValuable = stats.value.mostValuable.slice(0, 10);
        
        // Sort recent additions by date
        stats.recent.sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate));
        
        return stats;
    }

    /**
     * Get estimated card value
     */
    getCardValue(card) {
        // Try to get cached price data
        if (card.priceData && card.priceData.aggregated) {
            return card.priceData.aggregated.averagePrice || 0;
        }
        
        // Fallback to estimated values based on rarity
        const rarityValues = {
            'common': 0.25,
            'rare': 1.00,
            'super': 3.00,
            'ultra': 8.00,
            'secret': 15.00,
            'ultimate': 25.00,
            'ghost': 50.00
        };
        
        const rarity = card.rarity?.toLowerCase() || 'common';
        return rarityValues[rarity] || 0.25;
    }

    /**
     * Get value range category
     */
    getValueRange(value) {
        if (value < 1) return '$0-1';
        if (value < 5) return '$1-5';
        if (value < 10) return '$5-10';
        if (value < 25) return '$10-25';
        if (value < 50) return '$25-50';
        return '$50+';
    }

    /**
     * Refresh statistics and update display
     */
    async refreshStatistics() {
        try {
            this.invalidateCache();
            const stats = await this.loadStatistics();
            this.updateDisplay(stats);
            
            this.logger.info('Statistics refreshed successfully');
        } catch (error) {
            this.logger.error('Failed to refresh statistics:', error);
            this.showError('Failed to refresh statistics');
        }
    }

    /**
     * Update dashboard display
     */
    updateDisplay(stats) {
        // Update overview cards
        document.getElementById('total-value').textContent = formatCurrency(stats.overview.totalValue);
        document.getElementById('total-cards').textContent = formatNumber(stats.overview.totalCards);
        document.getElementById('rare-cards').textContent = formatNumber(stats.overview.rareCards);
        document.getElementById('packs-opened').textContent = formatNumber(stats.sessions.total);
        
        // Update charts
        this.updateRarityChart(stats.rarity);
        this.updateValueChart(stats.value.ranges);
        this.updateTimelineChart(stats.timeline);
        this.updateSetProgress(stats.sets);
        
        // Update detail sections
        this.updateValuableCards(stats.value.mostValuable);
        this.updateRecentCards(stats.recent);
        this.updateSessionStats(stats.sessions);
    }

    /**
     * Update rarity distribution chart
     */
    updateRarityChart(rarityData) {
        const canvas = document.getElementById('rarity-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        // Simple pie chart implementation
        const total = Array.from(rarityData.values()).reduce((sum, count) => sum + count, 0);
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b', '#eb4d4b', '#6c5ce7'];
        
        let currentAngle = 0;
        let colorIndex = 0;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        for (const [rarity, count] of rarityData) {
            const sliceAngle = (count / total) * 2 * Math.PI;
            
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, 80, currentAngle, currentAngle + sliceAngle);
            ctx.lineTo(canvas.width / 2, canvas.height / 2);
            ctx.fillStyle = colors[colorIndex % colors.length];
            ctx.fill();
            
            currentAngle += sliceAngle;
            colorIndex++;
        }
    }

    /**
     * Update value distribution chart
     */
    updateValueChart(valueRanges) {
        const canvas = document.getElementById('value-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const ranges = Array.from(valueRanges.entries());
        const maxCount = Math.max(...ranges.map(([_, count]) => count));
        
        ranges.forEach(([range, count], index) => {
            const barHeight = (count / maxCount) * (canvas.height - 40);
            const barWidth = canvas.width / ranges.length - 10;
            const x = index * (barWidth + 10) + 5;
            const y = canvas.height - barHeight - 20;
            
            ctx.fillStyle = '#4ecdc4';
            ctx.fillRect(x, y, barWidth, barHeight);
            
            ctx.fillStyle = '#333';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(range, x + barWidth / 2, canvas.height - 5);
        });
    }

    /**
     * Update timeline chart
     */
    updateTimelineChart(timeline) {
        const canvas = document.getElementById('timeline-chart');
        if (!canvas) return;
        
        if (timeline.length === 0) return;
        
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const maxValue = Math.max(...timeline.map(point => point.value));
        const pointWidth = canvas.width / timeline.length;
        
        ctx.strokeStyle = '#4ecdc4';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        timeline.forEach((point, index) => {
            const x = index * pointWidth + pointWidth / 2;
            const y = canvas.height - (point.value / maxValue) * (canvas.height - 20) - 10;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
    }

    /**
     * Update set completion progress
     */
    updateSetProgress(sets) {
        const container = document.getElementById('set-progress');
        if (!container) return;
        
        container.innerHTML = '';
        
        const sortedSets = Array.from(sets.entries())
            .sort(([_, a], [__, b]) => b.value - a.value)
            .slice(0, 5);
        
        sortedSets.forEach(([setCode, setData]) => {
            const setDiv = document.createElement('div');
            setDiv.className = 'set-progress-item';
            setDiv.innerHTML = `
                <div class="set-info">
                    <span class="set-name">${setData.name}</span>
                    <span class="set-stats">${setData.cards} cards • ${formatCurrency(setData.value)}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${Math.min(100, (setData.cards / 20) * 100)}%"></div>
                </div>
            `;
            container.appendChild(setDiv);
        });
    }

    /**
     * Update most valuable cards list
     */
    updateValuableCards(valuableCards) {
        const container = document.getElementById('valuable-cards');
        if (!container) return;
        
        container.innerHTML = '';
        
        valuableCards.slice(0, 5).forEach(card => {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'valuable-card-item';
            cardDiv.innerHTML = `
                <div class="card-info">
                    <span class="card-name">${card.cardName || 'Unknown Card'}</span>
                    <span class="card-details">${card.cardNumber} • ${card.rarity}</span>
                </div>
                <div class="card-value">${formatCurrency(card.value)}</div>
            `;
            container.appendChild(cardDiv);
        });
    }

    /**
     * Update recent cards list
     */
    updateRecentCards(recentCards) {
        const container = document.getElementById('recent-cards');
        if (!container) return;
        
        container.innerHTML = '';
        
        recentCards.slice(0, 5).forEach(card => {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'recent-card-item';
            cardDiv.innerHTML = `
                <div class="card-info">
                    <span class="card-name">${card.cardName || 'Unknown Card'}</span>
                    <span class="card-details">${new Date(card.sessionDate).toLocaleDateString()}</span>
                </div>
                <div class="card-rarity">${card.rarity}</div>
            `;
            container.appendChild(cardDiv);
        });
    }

    /**
     * Update session statistics
     */
    updateSessionStats(sessionStats) {
        const container = document.getElementById('session-stats');
        if (!container) return;
        
        container.innerHTML = `
            <div class="session-stat">
                <span class="stat-label">Total Sessions:</span>
                <span class="stat-value">${sessionStats.total}</span>
            </div>
            <div class="session-stat">
                <span class="stat-label">Average Session Value:</span>
                <span class="stat-value">${formatCurrency(sessionStats.averageValue)}</span>
            </div>
            ${sessionStats.bestSession ? `
                <div class="session-stat">
                    <span class="stat-label">Best Session:</span>
                    <span class="stat-value">${formatCurrency(sessionStats.bestSession.value)} (${sessionStats.bestSession.cards} cards)</span>
                </div>
            ` : ''}
        `;
    }

    /**
     * Export statistics
     */
    async exportStatistics() {
        try {
            const stats = await this.loadStatistics();
            
            const exportData = {
                exportDate: new Date().toISOString(),
                overview: stats.overview,
                rarity: Object.fromEntries(stats.rarity),
                valueRanges: Object.fromEntries(stats.value.ranges),
                mostValuableCards: stats.value.mostValuable,
                recentCards: stats.recent,
                sessionStats: stats.sessions,
                timeline: stats.timeline
            };
            
            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `collection-stats-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.logger.info('Statistics exported successfully');
            
        } catch (error) {
            this.logger.error('Failed to export statistics:', error);
            this.showError('Failed to export statistics');
        }
    }

    /**
     * Invalidate statistics cache
     */
    invalidateCache() {
        this.lastUpdateTime = 0;
        this.statsCache.clear();
    }

    /**
     * Show error message
     */
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff6b6b;
            color: white;
            padding: 12px;
            border-radius: 4px;
            z-index: 10000;
        `;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            document.body.removeChild(errorDiv);
        }, 5000);
    }
}