/**
 * PatternManagerUI - Training Patterns Management Interface
 * 
 * Provides UI for viewing, editing, and managing voice recognition training patterns.
 * Allows users to see all saved patterns, edit them, delete individual ones, or reset all.
 */

import { Logger } from '../utils/Logger.js';

export class PatternManagerUI {
    constructor(app, logger = null) {
        this.app = app;
        this.logger = logger || new Logger('PatternManagerUI');
        
        // State
        this.patterns = [];
        this.filteredPatterns = [];
        this.searchQuery = '';
        this.editingPattern = null;
        
        // DOM elements
        this.patternsList = null;
        this.patternsCount = null;
        this.patternsSuccessRate = null;
        this.searchInput = null;
        this.refreshButton = null;
        this.resetAllButton = null;
        this.emptyState = null;
        
        this.logger.info('PatternManagerUI initialized');
    }

    /**
     * Initialize the patterns manager UI
     */
    async initialize() {
        try {
            // Get DOM elements
            this.patternsList = document.getElementById('patterns-list');
            this.patternsCount = document.getElementById('patterns-count');
            this.patternsSuccessRate = document.getElementById('patterns-success-rate');
            this.searchInput = document.getElementById('patterns-search-input');
            this.refreshButton = document.getElementById('refresh-patterns-btn');
            this.resetAllButton = document.getElementById('reset-all-patterns-btn');
            this.emptyState = document.getElementById('empty-patterns');
            
            if (!this.patternsList || !this.searchInput) {
                throw new Error('Required DOM elements not found');
            }
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load patterns
            await this.loadPatterns();
            
            this.logger.info('PatternManagerUI initialized successfully');
            
        } catch (error) {
            this.logger.error('Failed to initialize PatternManagerUI:', error);
            throw error;
        }
    }

    /**
     * Setup event listeners
     * @private
     */
    setupEventListeners() {
        // Search input
        this.searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase().trim();
            this.filterAndDisplayPatterns();
        });
        
        // Refresh button
        this.refreshButton.addEventListener('click', () => {
            this.loadPatterns();
        });
        
        // Reset all button
        this.resetAllButton.addEventListener('click', () => {
            this.showResetAllConfirmation();
        });
        
        // Pattern list event delegation
        this.patternsList.addEventListener('click', (e) => {
            if (e.target.closest('.edit-pattern-btn')) {
                const patternId = e.target.closest('.pattern-item').dataset.patternId;
                this.editPattern(patternId);
            } else if (e.target.closest('.delete-pattern-btn')) {
                const patternId = e.target.closest('.pattern-item').dataset.patternId;
                this.deletePattern(patternId);
            }
        });
    }

    /**
     * Load training patterns from the learning engine
     */
    async loadPatterns() {
        try {
            if (!this.app.voiceEngine?.learningEngine) {
                this.logger.warn('Learning engine not available');
                this.patterns = [];
                this.updateDisplay();
                return;
            }
            
            const learningEngine = this.app.voiceEngine.learningEngine;
            
            // Convert Map to array with additional metadata
            this.patterns = Array.from(learningEngine.userPatterns.entries()).map(([key, pattern]) => ({
                id: key,
                key: key,
                voiceInput: pattern.voiceInput,
                targetCard: pattern.targetCard,
                confidence: pattern.confidence || 1.0,
                reinforcements: pattern.reinforcements || 1,
                successRate: pattern.successRate || 1.0,
                timestamp: pattern.timestamp,
                lastSeen: pattern.lastSeen || pattern.timestamp,
                context: pattern.context || {}
            }));
            
            // Sort by most recent first
            this.patterns.sort((a, b) => (b.lastSeen || b.timestamp) - (a.lastSeen || a.timestamp));
            
            this.filterAndDisplayPatterns();
            this.updateStats();
            
            this.logger.info(`Loaded ${this.patterns.length} training patterns`);
            
        } catch (error) {
            this.logger.error('Failed to load patterns:', error);
            this.patterns = [];
            this.updateDisplay();
        }
    }

    /**
     * Filter patterns based on search query and update display
     * @private
     */
    filterAndDisplayPatterns() {
        if (!this.searchQuery) {
            this.filteredPatterns = [...this.patterns];
        } else {
            this.filteredPatterns = this.patterns.filter(pattern => 
                pattern.voiceInput.toLowerCase().includes(this.searchQuery) ||
                pattern.targetCard.toLowerCase().includes(this.searchQuery)
            );
        }
        
        this.updateDisplay();
    }

    /**
     * Update the patterns display
     * @private
     */
    updateDisplay() {
        if (this.filteredPatterns.length === 0) {
            this.showEmptyState();
        } else {
            this.showPatternsList();
        }
    }

    /**
     * Show empty state
     * @private
     */
    showEmptyState() {
        this.emptyState.style.display = 'block';
        // Clear the patterns list but keep the empty state
        const patternItems = this.patternsList.querySelectorAll('.pattern-item');
        patternItems.forEach(item => item.remove());
    }

    /**
     * Show patterns list
     * @private
     */
    showPatternsList() {
        this.emptyState.style.display = 'none';
        
        // Clear existing pattern items
        const existingItems = this.patternsList.querySelectorAll('.pattern-item');
        existingItems.forEach(item => item.remove());
        
        // Create pattern items
        this.filteredPatterns.forEach(pattern => {
            const patternElement = this.createPatternElement(pattern);
            this.patternsList.appendChild(patternElement);
        });
    }

    /**
     * Create a pattern element
     * @private
     */
    createPatternElement(pattern) {
        const patternDiv = document.createElement('div');
        patternDiv.className = 'pattern-item';
        patternDiv.dataset.patternId = pattern.id;
        
        const lastSeenDate = new Date(pattern.lastSeen || pattern.timestamp).toLocaleDateString();
        const confidencePercent = Math.round(pattern.confidence * 100);
        const successPercent = Math.round(pattern.successRate * 100);
        
        patternDiv.innerHTML = `
            <div class="pattern-content">
                <div class="pattern-main">
                    <div class="pattern-mapping">
                        <div class="voice-input">
                            <span class="input-label">Voice Input:</span>
                            <span class="input-value">"${this.escapeHtml(pattern.voiceInput)}"</span>
                        </div>
                        <div class="mapping-arrow">→</div>
                        <div class="target-card">
                            <span class="card-label">Target Card:</span>
                            <span class="card-value">"${this.escapeHtml(pattern.targetCard)}"</span>
                        </div>
                    </div>
                    
                    <div class="pattern-stats">
                        <div class="stat">
                            <span class="stat-label">Success Rate:</span>
                            <span class="stat-value ${successPercent >= 80 ? 'good' : successPercent >= 50 ? 'medium' : 'poor'}">${successPercent}%</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Uses:</span>
                            <span class="stat-value">${pattern.reinforcements}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Confidence:</span>
                            <span class="stat-value">${confidencePercent}%</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Last Used:</span>
                            <span class="stat-value">${lastSeenDate}</span>
                        </div>
                    </div>
                </div>
                
                <div class="pattern-actions">
                    <button class="btn btn-sm btn-secondary edit-pattern-btn" title="Edit this pattern">
                        <span class="btn-icon">✏️</span>
                        Edit
                    </button>
                    <button class="btn btn-sm btn-danger delete-pattern-btn" title="Delete this pattern">
                        <span class="btn-icon">🗑️</span>
                        Delete
                    </button>
                </div>
            </div>
        `;
        
        return patternDiv;
    }

    /**
     * Update statistics display
     * @private
     */
    updateStats() {
        if (this.patternsCount) {
            this.patternsCount.textContent = this.patterns.length;
        }
        
        if (this.patternsSuccessRate && this.patterns.length > 0) {
            const avgSuccessRate = this.patterns.reduce((sum, p) => sum + (p.successRate || 1.0), 0) / this.patterns.length;
            this.patternsSuccessRate.textContent = `${Math.round(avgSuccessRate * 100)}%`;
        } else if (this.patternsSuccessRate) {
            this.patternsSuccessRate.textContent = 'N/A';
        }
    }

    /**
     * Edit a pattern
     */
    editPattern(patternId) {
        const pattern = this.patterns.find(p => p.id === patternId);
        if (!pattern) {
            this.logger.warn('Pattern not found:', patternId);
            return;
        }
        
        this.showEditPatternDialog(pattern);
    }

    /**
     * Show edit pattern dialog
     * @private
     */
    showEditPatternDialog(pattern) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay pattern-edit-modal';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal pattern-edit-modal-content';
        
        modalContent.innerHTML = `
            <div class="modal-header">
                <h3>Edit Training Pattern</h3>
                <button class="modal-close" aria-label="Close edit dialog">&times;</button>
            </div>
            <div class="modal-body">
                <form id="edit-pattern-form" class="edit-pattern-form">
                    <div class="form-group">
                        <label for="edit-voice-input">Voice Input:</label>
                        <input type="text" id="edit-voice-input" class="form-control" 
                               value="${this.escapeHtml(pattern.voiceInput)}" required>
                        <small class="form-help">What the user says to trigger this pattern</small>
                    </div>
                    
                    <div class="form-group">
                        <label for="edit-target-card">Target Card:</label>
                        <input type="text" id="edit-target-card" class="form-control" 
                               value="${this.escapeHtml(pattern.targetCard)}" required>
                        <small class="form-help">The card name this should map to (base name without rarity)</small>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary cancel-edit">Cancel</button>
                        <button type="submit" class="btn btn-primary save-edit">Save Changes</button>
                    </div>
                </form>
            </div>
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Event listeners
        const closeBtn = modalContent.querySelector('.modal-close');
        const cancelBtn = modalContent.querySelector('.cancel-edit');
        const form = modalContent.querySelector('#edit-pattern-form');
        
        const closeModal = () => {
            modal.remove();
        };
        
        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.savePatternEdit(pattern, {
                voiceInput: form.querySelector('#edit-voice-input').value.trim(),
                targetCard: form.querySelector('#edit-target-card').value.trim()
            });
            closeModal();
        });
        
        // Focus the first input
        setTimeout(() => {
            modalContent.querySelector('#edit-voice-input').focus();
        }, 100);
    }

    /**
     * Save pattern edit
     * @private
     */
    async savePatternEdit(originalPattern, newData) {
        try {
            if (!this.app.voiceEngine?.learningEngine) {
                throw new Error('Learning engine not available');
            }
            
            const learningEngine = this.app.voiceEngine.learningEngine;
            
            // Remove the old pattern
            learningEngine.userPatterns.delete(originalPattern.key);
            
            // Create new pattern with updated data
            const updatedPattern = {
                ...originalPattern,
                voiceInput: newData.voiceInput,
                targetCard: newData.targetCard,
                timestamp: Date.now(), // Update timestamp
                lastSeen: Date.now()
            };
            
            // Create new key for the updated pattern
            const newKey = learningEngine.createPatternKey(newData.voiceInput, newData.targetCard);
            
            // Add the updated pattern
            learningEngine.userPatterns.set(newKey, updatedPattern);
            
            // Save patterns to storage
            await learningEngine.savePatterns();
            
            // Reload and refresh display
            await this.loadPatterns();
            
            this.app.showToast(`Pattern updated: "${newData.voiceInput}" → "${newData.targetCard}"`, 'success');
            this.logger.info('Pattern updated successfully:', newData);
            
        } catch (error) {
            this.logger.error('Failed to save pattern edit:', error);
            this.app.showToast('Failed to update pattern', 'error');
        }
    }

    /**
     * Delete a pattern
     */
    async deletePattern(patternId) {
        const pattern = this.patterns.find(p => p.id === patternId);
        if (!pattern) {
            this.logger.warn('Pattern not found:', patternId);
            return;
        }
        
        // Show confirmation dialog
        const confirmed = await this.showDeleteConfirmation(pattern);
        if (!confirmed) return;
        
        try {
            if (!this.app.voiceEngine?.learningEngine) {
                throw new Error('Learning engine not available');
            }
            
            const learningEngine = this.app.voiceEngine.learningEngine;
            
            // Delete the pattern
            learningEngine.userPatterns.delete(pattern.key);
            
            // Save patterns to storage
            await learningEngine.savePatterns();
            
            // Reload and refresh display
            await this.loadPatterns();
            
            this.app.showToast(`Pattern deleted: "${pattern.voiceInput}" → "${pattern.targetCard}"`, 'success');
            this.logger.info('Pattern deleted successfully:', pattern.voiceInput);
            
        } catch (error) {
            this.logger.error('Failed to delete pattern:', error);
            this.app.showToast('Failed to delete pattern', 'error');
        }
    }

    /**
     * Show delete confirmation dialog
     * @private
     */
    showDeleteConfirmation(pattern) {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay delete-confirm-modal';
            
            const modalContent = document.createElement('div');
            modalContent.className = 'modal delete-confirm-modal-content';
            
            modalContent.innerHTML = `
                <div class="modal-header">
                    <h3>Delete Training Pattern</h3>
                    <button class="modal-close" aria-label="Close confirmation dialog">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="delete-confirmation">
                        <div class="warning-icon">⚠️</div>
                        <p>Are you sure you want to delete this training pattern?</p>
                        <div class="pattern-preview">
                            <strong>"${this.escapeHtml(pattern.voiceInput)}"</strong> → 
                            <strong>"${this.escapeHtml(pattern.targetCard)}"</strong>
                        </div>
                        <p class="warning-text">This action cannot be undone.</p>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary cancel-delete">Cancel</button>
                        <button type="button" class="btn btn-danger confirm-delete">Delete Pattern</button>
                    </div>
                </div>
            `;
            
            modal.appendChild(modalContent);
            document.body.appendChild(modal);
            
            // Event listeners
            const closeBtn = modalContent.querySelector('.modal-close');
            const cancelBtn = modalContent.querySelector('.cancel-delete');
            const confirmBtn = modalContent.querySelector('.confirm-delete');
            
            const closeModal = (result = false) => {
                modal.remove();
                resolve(result);
            };
            
            closeBtn.addEventListener('click', () => closeModal(false));
            cancelBtn.addEventListener('click', () => closeModal(false));
            confirmBtn.addEventListener('click', () => closeModal(true));
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal(false);
            });
        });
    }

    /**
     * Show reset all patterns confirmation
     */
    showResetAllConfirmation() {
        if (this.patterns.length === 0) {
            this.app.showToast('No patterns to reset', 'info');
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay reset-all-confirm-modal';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal reset-all-confirm-modal-content';
        
        modalContent.innerHTML = `
            <div class="modal-header">
                <h3>Reset All Training Patterns</h3>
                <button class="modal-close" aria-label="Close confirmation dialog">&times;</button>
            </div>
            <div class="modal-body">
                <div class="reset-confirmation">
                    <div class="warning-icon">⚠️</div>
                    <p>Are you sure you want to delete <strong>all ${this.patterns.length} training patterns</strong>?</p>
                    <p class="warning-text">This will completely reset your voice recognition training and cannot be undone.</p>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary cancel-reset">Cancel</button>
                    <button type="button" class="btn btn-danger confirm-reset">Reset All Patterns</button>
                </div>
            </div>
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Event listeners
        const closeBtn = modalContent.querySelector('.modal-close');
        const cancelBtn = modalContent.querySelector('.cancel-reset');
        const confirmBtn = modalContent.querySelector('.confirm-reset');
        
        const closeModal = () => {
            modal.remove();
        };
        
        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        confirmBtn.addEventListener('click', async () => {
            await this.resetAllPatterns();
            closeModal();
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    /**
     * Reset all patterns
     */
    async resetAllPatterns() {
        try {
            if (!this.app.voiceEngine?.learningEngine) {
                throw new Error('Learning engine not available');
            }
            
            const learningEngine = this.app.voiceEngine.learningEngine;
            const patternCount = learningEngine.userPatterns.size;
            
            // Reset all patterns using the learning engine's reset method
            learningEngine.reset();
            
            // Reload and refresh display
            await this.loadPatterns();
            
            this.app.showToast(`Reset ${patternCount} training patterns`, 'success');
            this.logger.info(`Reset all ${patternCount} training patterns`);
            
        } catch (error) {
            this.logger.error('Failed to reset patterns:', error);
            this.app.showToast('Failed to reset patterns', 'error');
        }
    }

    /**
     * Escape HTML for safe display
     * @private
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Clean up event listeners and DOM elements
     */
    cleanup() {
        // Remove event listeners if needed
        this.logger.info('PatternManagerUI cleaned up');
    }
}