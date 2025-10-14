/**
 * PatternList.js - Voice Training Pattern List Component
 *
 * Displays and manages voice recognition training patterns.
 * Allows users to view, edit, delete, and analyze their learned patterns.
 */

export default class PatternList {
  constructor(options = {}) {
    this.patterns = options.patterns || [];
    this.onEdit = options.onEdit || (() => {});
    this.onDelete = options.onDelete || (() => {});
    this.onSelect = options.onSelect || (() => {});

    this.container = null;
    this.selectedPatterns = new Set();
    this.sortBy = 'lastSeen'; // lastSeen, successRate, reinforcements
    this.sortOrder = 'desc';
    this.viewMode = 'cards'; // cards or table

    this.boundHandlers = {
      handleSort: this.handleSort.bind(this),
      handleViewToggle: this.handleViewToggle.bind(this),
      handleSelectAll: this.handleSelectAll.bind(this),
      handleBulkDelete: this.handleBulkDelete.bind(this)
    };
  }

  /**
   * Render the pattern list
   */
  render() {
    if (!this.patterns || this.patterns.length === 0) {
      return this.renderEmptyState();
    }

    const sortedPatterns = this.getSortedPatterns();

    return `
      <div class="pattern-list">
        <!-- List Controls -->
        <div class="pattern-list-controls glass-card">
          <div class="control-group">
            <label>Sort by:</label>
            <select class="sort-select" data-sort-by="${this.sortBy}">
              <option value="lastSeen" ${this.sortBy === 'lastSeen' ? 'selected' : ''}>Recently Used</option>
              <option value="successRate" ${this.sortBy === 'successRate' ? 'selected' : ''}>Success Rate</option>
              <option value="reinforcements" ${this.sortBy === 'reinforcements' ? 'selected' : ''}>Times Used</option>
              <option value="voiceInput" ${this.sortBy === 'voiceInput' ? 'selected' : ''}>Voice Input (A-Z)</option>
              <option value="targetCard" ${this.sortBy === 'targetCard' ? 'selected' : ''}>Target Card (A-Z)</option>
            </select>
            <button class="btn-icon sort-order-btn" title="Toggle sort order">
              <i data-lucide="${this.sortOrder === 'desc' ? 'arrow-down' : 'arrow-up'}"></i>
            </button>
          </div>

          <div class="control-group">
            <button class="btn-icon view-toggle-btn" title="Toggle view mode">
              <i data-lucide="${this.viewMode === 'cards' ? 'list' : 'grid'}"></i>
            </button>
          </div>

          ${this.selectedPatterns.size > 0 ? `
            <div class="control-group bulk-actions">
              <span class="selected-count">${this.selectedPatterns.size} selected</span>
              <button class="btn btn-secondary btn-sm bulk-delete-btn">
                <i data-lucide="trash-2"></i>
                Delete Selected
              </button>
            </div>
          ` : ''}
        </div>

        <!-- Pattern Count -->
        <div class="pattern-count">
          <span>${sortedPatterns.length} pattern${sortedPatterns.length !== 1 ? 's' : ''}</span>
        </div>

        <!-- Pattern Items -->
        <div class="pattern-items ${this.viewMode === 'table' ? 'table-view' : 'cards-view'}">
          ${this.viewMode === 'cards' ? this.renderCardsView(sortedPatterns) : this.renderTableView(sortedPatterns)}
        </div>
      </div>
    `;
  }

  /**
   * Render cards view
   */
  renderCardsView(patterns) {
    return patterns.map((pattern, index) => this.renderPatternCard(pattern, index)).join('');
  }

  /**
   * Render single pattern card
   */
  renderPatternCard(pattern, index) {
    const isSelected = this.selectedPatterns.has(pattern.id);
    const successRateClass = this.getSuccessRateClass(pattern.successRate);
    const lastSeenText = this.formatRelativeTime(pattern.lastSeen);

    return `
      <div class="pattern-card glass-card ${isSelected ? 'selected' : ''}" data-pattern-id="${pattern.id}" data-index="${index}">
        <div class="pattern-card-header">
          <div class="pattern-select">
            <input
              type="checkbox"
              class="pattern-checkbox"
              data-pattern-id="${pattern.id}"
              ${isSelected ? 'checked' : ''}
            >
          </div>
          <div class="pattern-success-rate ${successRateClass}">
            <div class="success-rate-circle">
              <i data-lucide="target"></i>
              <span>${Math.round(pattern.successRate * 100)}%</span>
            </div>
          </div>
        </div>

        <div class="pattern-card-body">
          <div class="pattern-mapping">
            <div class="voice-input">
              <i data-lucide="mic"></i>
              <span class="pattern-text">"${this.escapeHtml(pattern.voiceInput)}"</span>
            </div>
            <div class="mapping-arrow">
              <i data-lucide="arrow-right"></i>
            </div>
            <div class="target-card">
              <i data-lucide="file-text"></i>
              <span class="pattern-text">"${this.escapeHtml(pattern.targetCard)}"</span>
            </div>
          </div>

          <div class="pattern-stats">
            <div class="stat-item">
              <i data-lucide="repeat"></i>
              <span>${pattern.reinforcements || 1} use${(pattern.reinforcements || 1) !== 1 ? 's' : ''}</span>
            </div>
            <div class="stat-item">
              <i data-lucide="clock"></i>
              <span>${lastSeenText}</span>
            </div>
            ${pattern.confidence ? `
              <div class="stat-item">
                <i data-lucide="zap"></i>
                <span>${Math.round(pattern.confidence * 100)}% confidence</span>
              </div>
            ` : ''}
          </div>
        </div>

        <div class="pattern-card-actions">
          <button class="btn btn-icon btn-sm pattern-edit-btn" data-pattern-id="${pattern.id}" title="Edit pattern">
            <i data-lucide="edit-2"></i>
          </button>
          <button class="btn btn-icon btn-sm pattern-delete-btn" data-pattern-id="${pattern.id}" title="Delete pattern">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Render table view
   */
  renderTableView(patterns) {
    return `
      <div class="pattern-table glass-card">
        <table>
          <thead>
            <tr>
              <th>
                <input type="checkbox" class="select-all-checkbox" ${this.selectedPatterns.size === patterns.length && patterns.length > 0 ? 'checked' : ''}>
              </th>
              <th>Voice Input</th>
              <th>Target Card</th>
              <th>Success Rate</th>
              <th>Uses</th>
              <th>Last Used</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${patterns.map((pattern, index) => this.renderTableRow(pattern, index)).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Render table row
   */
  renderTableRow(pattern, index) {
    const isSelected = this.selectedPatterns.has(pattern.id);
    const successRateClass = this.getSuccessRateClass(pattern.successRate);
    const lastSeenText = this.formatRelativeTime(pattern.lastSeen);

    return `
      <tr class="${isSelected ? 'selected' : ''}" data-pattern-id="${pattern.id}" data-index="${index}">
        <td>
          <input
            type="checkbox"
            class="pattern-checkbox"
            data-pattern-id="${pattern.id}"
            ${isSelected ? 'checked' : ''}
          >
        </td>
        <td class="voice-input-cell">
          <i data-lucide="mic"></i>
          <span>"${this.escapeHtml(pattern.voiceInput)}"</span>
        </td>
        <td class="target-card-cell">
          <i data-lucide="file-text"></i>
          <span>"${this.escapeHtml(pattern.targetCard)}"</span>
        </td>
        <td class="success-rate-cell">
          <span class="success-badge ${successRateClass}">${Math.round(pattern.successRate * 100)}%</span>
        </td>
        <td class="uses-cell">${pattern.reinforcements || 1}</td>
        <td class="last-seen-cell">${lastSeenText}</td>
        <td class="actions-cell">
          <button class="btn btn-icon btn-sm pattern-edit-btn" data-pattern-id="${pattern.id}" title="Edit">
            <i data-lucide="edit-2"></i>
          </button>
          <button class="btn btn-icon btn-sm pattern-delete-btn" data-pattern-id="${pattern.id}" title="Delete">
            <i data-lucide="trash-2"></i>
          </button>
        </td>
      </tr>
    `;
  }

  /**
   * Render empty state
   */
  renderEmptyState() {
    return `
      <div class="pattern-list-empty glass-card">
        <div class="empty-icon">
          <i data-lucide="inbox"></i>
        </div>
        <h3>No Training Patterns Yet</h3>
        <p>Training patterns will appear here as you use the voice recognition system.</p>
        <p>Use the Pack Opening page to start recognizing cards, and the system will learn from your corrections.</p>
      </div>
    `;
  }

  /**
   * Mount component to container
   */
  mount(container) {
    this.container = container;
    this.container.innerHTML = this.render();
    this.attachEventListeners();

    // Initialize Lucide icons
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  /**
   * Update patterns and re-render
   */
  update(patterns) {
    this.patterns = patterns;
    if (this.container) {
      this.container.innerHTML = this.render();
      this.attachEventListeners();

      // Re-initialize Lucide icons
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    }
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    if (!this.container) return;

    // Sort controls
    const sortSelect = this.container.querySelector('.sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', this.boundHandlers.handleSort);
    }

    const sortOrderBtn = this.container.querySelector('.sort-order-btn');
    if (sortOrderBtn) {
      sortOrderBtn.addEventListener('click', () => {
        this.sortOrder = this.sortOrder === 'desc' ? 'asc' : 'desc';
        this.update(this.patterns);
      });
    }

    // View toggle
    const viewToggleBtn = this.container.querySelector('.view-toggle-btn');
    if (viewToggleBtn) {
      viewToggleBtn.addEventListener('click', this.boundHandlers.handleViewToggle);
    }

    // Select all checkbox
    const selectAllCheckbox = this.container.querySelector('.select-all-checkbox');
    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener('change', this.boundHandlers.handleSelectAll);
    }

    // Pattern checkboxes
    const patternCheckboxes = this.container.querySelectorAll('.pattern-checkbox');
    patternCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const patternId = e.target.dataset.patternId;
        if (e.target.checked) {
          this.selectedPatterns.add(patternId);
        } else {
          this.selectedPatterns.delete(patternId);
        }
        this.update(this.patterns);
      });
    });

    // Edit buttons
    const editButtons = this.container.querySelectorAll('.pattern-edit-btn');
    editButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const patternId = e.currentTarget.dataset.patternId;
        const pattern = this.patterns.find(p => p.id === patternId);
        if (pattern) {
          this.onEdit(pattern);
        }
      });
    });

    // Delete buttons
    const deleteButtons = this.container.querySelectorAll('.pattern-delete-btn');
    deleteButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const patternId = e.currentTarget.dataset.patternId;
        const pattern = this.patterns.find(p => p.id === patternId);
        if (pattern) {
          this.onDelete(pattern);
        }
      });
    });

    // Bulk delete button
    const bulkDeleteBtn = this.container.querySelector('.bulk-delete-btn');
    if (bulkDeleteBtn) {
      bulkDeleteBtn.addEventListener('click', this.boundHandlers.handleBulkDelete);
    }
  }

  /**
   * Handle sort change
   */
  handleSort(e) {
    this.sortBy = e.target.value;
    this.update(this.patterns);
  }

  /**
   * Handle view toggle
   */
  handleViewToggle() {
    this.viewMode = this.viewMode === 'cards' ? 'table' : 'cards';
    this.update(this.patterns);
  }

  /**
   * Handle select all
   */
  handleSelectAll(e) {
    if (e.target.checked) {
      this.patterns.forEach(pattern => this.selectedPatterns.add(pattern.id));
    } else {
      this.selectedPatterns.clear();
    }
    this.update(this.patterns);
  }

  /**
   * Handle bulk delete
   */
  handleBulkDelete() {
    const selectedPatternsList = this.patterns.filter(p => this.selectedPatterns.has(p.id));
    if (selectedPatternsList.length > 0) {
      this.onDelete(selectedPatternsList);
    }
  }

  /**
   * Get sorted patterns
   */
  getSortedPatterns() {
    const patterns = [...this.patterns];

    patterns.sort((a, b) => {
      let compareA, compareB;

      switch (this.sortBy) {
        case 'lastSeen':
          compareA = a.lastSeen || 0;
          compareB = b.lastSeen || 0;
          break;
        case 'successRate':
          compareA = a.successRate || 0;
          compareB = b.successRate || 0;
          break;
        case 'reinforcements':
          compareA = a.reinforcements || 0;
          compareB = b.reinforcements || 0;
          break;
        case 'voiceInput':
          compareA = (a.voiceInput || '').toLowerCase();
          compareB = (b.voiceInput || '').toLowerCase();
          break;
        case 'targetCard':
          compareA = (a.targetCard || '').toLowerCase();
          compareB = (b.targetCard || '').toLowerCase();
          break;
        default:
          compareA = a.lastSeen || 0;
          compareB = b.lastSeen || 0;
      }

      if (this.sortOrder === 'desc') {
        return compareB > compareA ? 1 : -1;
      } else {
        return compareA > compareB ? 1 : -1;
      }
    });

    return patterns;
  }

  /**
   * Get success rate CSS class
   */
  getSuccessRateClass(successRate) {
    if (successRate >= 0.8) return 'success-high';
    if (successRate >= 0.5) return 'success-medium';
    return 'success-low';
  }

  /**
   * Format relative time
   */
  formatRelativeTime(timestamp) {
    if (!timestamp) return 'Never';

    const now = Date.now();
    const diff = now - timestamp;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
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
   * Clear selected patterns
   */
  clearSelection() {
    this.selectedPatterns.clear();
    this.update(this.patterns);
  }

  /**
   * Unmount component
   */
  unmount() {
    if (this.container) {
      this.container.innerHTML = '';
      this.container = null;
    }
    this.selectedPatterns.clear();
  }
}
