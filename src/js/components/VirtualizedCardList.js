/**
 * VirtualizedCardList - A high-performance virtualized list for rendering large numbers of cards
 * 
 * Features:
 * - Only renders visible cards in the viewport
 * - Smooth scrolling with dynamic height calculation
 * - Efficient updates with minimal DOM operations
 * - Configurable item height and buffer size
 */

export class VirtualizedCardList {
    /**
     * Create a new VirtualizedCardList
     * @param {HTMLElement} container - The container element for the list
     * @param {Object} options - Configuration options
     * @param {Function} options.renderItem - Function to render a single item
     * @param {number} [options.itemHeight=150] - Height of each item in pixels
     * @param {number} [options.overscan=5] - Number of items to render outside the viewport
     * @param {Function} [options.onRender] - Callback after rendering is complete
     */
    constructor(container, { renderItem, itemHeight = 150, overscan = 5, onRender = null }) {
        if (!container || !(container instanceof HTMLElement)) {
            throw new Error('A valid container element is required');
        }
        
        if (typeof renderItem !== 'function') {
            throw new Error('renderItem must be a function');
        }
        
        this.container = container;
        this.renderItem = renderItem;
        this.itemHeight = Math.max(1, itemHeight);
        this.overscan = Math.max(0, overscan);
        this.onRender = onRender || (() => {});
        
        // State
        this.items = [];
        this.visibleItems = [];
        this.scrollTop = 0;
        this.height = 0;
        this.width = 0;
        this.isDestroyed = false;
        
        // Create the scrollable container
        this.scrollContainer = document.createElement('div');
        this.scrollContainer.className = 'virtual-list-scroll-container';
        this.scrollContainer.style.overflowY = 'auto';
        this.scrollContainer.style.height = '100%';
        this.scrollContainer.style.position = 'relative';
        this.scrollContainer.setAttribute('role', 'list');
        this.scrollContainer.setAttribute('aria-live', 'polite');
        this.scrollContainer.setAttribute('aria-atomic', 'false');
        this.scrollContainer.setAttribute('aria-relevant', 'additions removals');
        
        // Create the inner container that will hold all items
        this.innerContainer = document.createElement('div');
        this.innerContainer.className = 'virtual-list-inner';
        this.innerContainer.style.position = 'relative';
        this.innerContainer.style.height = '0';
        this.innerContainer.setAttribute('role', 'presentation');
        
        try {
            // Set up the DOM structure
            this.scrollContainer.appendChild(this.innerContainer);
            this.container.innerHTML = '';
            this.container.appendChild(this.scrollContainer);
            
            // Set up scroll event listener with debouncing
            this.handleScroll = this._debounce(this._handleScroll.bind(this), 16);
            this.scrollContainer.addEventListener('scroll', this.handleScroll, { passive: true });
            
            // Set up resize observer
            this.resizeObserver = new ResizeObserver(this._handleResize.bind(this));
            this.resizeObserver.observe(this.container);
            
            // Initial render
            this._updateDimensions();
        } catch (error) {
            // Clean up partially created DOM elements on error
            this.destroy();
            throw error;
        }
    }
    
    /**
     * Set the items to be rendered
     * @param {Array} items - The array of items to render
     */
    setItems(items) {
        if (this.isDestroyed) {
            console.warn('Cannot setItems on a destroyed VirtualizedCardList');
            return;
        }
        
        this.items = Array.isArray(items) ? items : [];
        this._updateDimensions();
        this._updateVisibleItems();
        
        // Call the onRender callback if provided
        if (typeof this.onRender === 'function') {
            try {
                this.onRender();
            } catch (error) {
                console.error('Error in onRender callback:', error);
            }
        }
    }
    
    /**
     * Update the height of the list
     */
    _updateDimensions() {
        const rect = this.container.getBoundingClientRect();
        this.height = rect.height;
        this.width = rect.width;
        
        // Update the inner container height to enable scrolling
        this.innerContainer.style.height = `${this.items.length * this.itemHeight}px`;
        
        // Recalculate visible items
        this._updateVisibleItems();
    }
    
    /**
     * Update the list of visible items based on scroll position
     */
    _updateVisibleItems() {
        if (!this.items.length) {
            this.innerContainer.innerHTML = '';
            return;
        }
        
        // Calculate which items should be visible
        const scrollTop = this.scrollContainer.scrollTop;
        const startIndex = Math.max(0, Math.floor(scrollTop / this.itemHeight) - this.overscan);
        const endIndex = Math.min(
            this.items.length - 1,
            Math.ceil((scrollTop + this.height) / this.itemHeight) + this.overscan
        );
        
        // Calculate the offset for the visible items
        const offsetY = startIndex * this.itemHeight;
        
        // Create a document fragment for efficient DOM updates
        const fragment = document.createDocumentFragment();
        
        // Create or update items
        for (let i = startIndex; i <= endIndex; i++) {
            const item = this.items[i];
            let itemElement = this.innerContainer.querySelector(`[data-index="${i}"]`);
            
            if (!itemElement) {
                itemElement = document.createElement('div');
                itemElement.className = 'virtual-list-item';
                itemElement.style.position = 'absolute';
                itemElement.style.top = '0';
                itemElement.style.left = '0';
                itemElement.style.right = '0';
                itemElement.style.height = `${this.itemHeight}px`;
                itemElement.style.transform = `translateY(${i * this.itemHeight}px)`;
                itemElement.setAttribute('data-index', i);
                itemElement.setAttribute('role', 'listitem');
                itemElement.setAttribute('aria-posinset', i + 1);
                itemElement.setAttribute('aria-setsize', this.items.length);
                
                // Render the item content
                const content = this.renderItem(item, i);
                if (content instanceof HTMLElement) {
                    itemElement.appendChild(content);
                } else if (typeof content === 'string') {
                    itemElement.innerHTML = content;
                }
                
                fragment.appendChild(itemElement);
            } else {
                // Update existing element position
                itemElement.style.transform = `translateY(${i * this.itemHeight}px)`;
                itemElement.setAttribute('aria-posinset', i + 1);
                itemElement.setAttribute('aria-setsize', this.items.length);
            }
        }
        
        // Remove items that are no longer visible
        const allItems = this.innerContainer.querySelectorAll('.virtual-list-item');
        allItems.forEach(item => {
            const index = parseInt(item.getAttribute('data-index') || '0', 10);
            if (index < startIndex || index > endIndex) {
                item.remove();
            }
        });
        
        // Add new items to the DOM
        if (fragment.hasChildNodes()) {
            this.innerContainer.appendChild(fragment);
        }
        
        // Update the inner container height if the number of items has changed
        const currentHeight = parseInt(this.innerContainer.style.height, 10) || 0;
        const newHeight = this.items.length * this.itemHeight;
        if (currentHeight !== newHeight) {
            this.innerContainer.style.height = `${newHeight}px`;
        }
    }
    
    /**
     * Handle scroll events
     */
    _handleScroll() {
        this.scrollTop = this.scrollContainer.scrollTop;
        this._updateVisibleItems();
    }
    
    /**
     * Handle resize events
     */
    _handleResize() {
        this._updateDimensions();
    }
    
    /**
     * Scroll to a specific item
     * @param {number} index - The index of the item to scroll to
     * @param {string} [behavior='auto'] - Scroll behavior ('auto' or 'smooth')
     */
    scrollToItem(index, behavior = 'auto') {
        if (this.isDestroyed) {
            console.warn('Cannot scrollToItem on a destroyed VirtualizedCardList');
            return;
        }
        
        if (this.items.length === 0) return;
        
        const itemIndex = Math.max(0, Math.min(index, this.items.length - 1));
        const scrollTop = itemIndex * this.itemHeight;
        
        try {
            this.scrollContainer.scrollTo({
                top: scrollTop,
                behavior
            });
        } catch (error) {
            console.error('Error scrolling to item:', error);
            // Fallback to direct scrollTop assignment
            this.scrollContainer.scrollTop = scrollTop;
        }
    }
    
    /**
     * Clean up resources and event listeners
     */
    destroy() {
        if (this.isDestroyed) return;
        
        this.isDestroyed = true;
        
        // Remove event listeners
        if (this.scrollContainer && this.handleScroll) {
            this.scrollContainer.removeEventListener('scroll', this.handleScroll);
        }
        
        // Disconnect resize observer
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        
        // Clear references
        this.items = [];
        this.visibleItems = [];
        
        // Remove DOM elements
        if (this.innerContainer && this.innerContainer.parentNode) {
            this.innerContainer.parentNode.removeChild(this.innerContainer);
        }
        
        if (this.scrollContainer && this.scrollContainer.parentNode) {
            this.scrollContainer.parentNode.removeChild(this.scrollContainer);
        }
        
        // Clear all references
        this.container = null;
        this.scrollContainer = null;
        this.innerContainer = null;
        this.renderItem = null;
        this.onRender = null;
        this.handleScroll = null;
    }
    
    /**
     * Recalculate item positions and update the view
     * Useful when item heights change or container is resized
     */
    recalculatePositions() {
        if (this.isDestroyed) {
            console.warn('Cannot recalculatePositions on a destroyed VirtualizedCardList');
            return;
        }
        
        this._updateDimensions();
        this._updateVisibleItems();
    }
    
    /**
     * Update the configuration of the virtualized list
     * @param {Object} config - Configuration options to update
     */
    updateConfig(config) {
        if (this.isDestroyed) {
            console.warn('Cannot updateConfig on a destroyed VirtualizedCardList');
            return;
        }
        
        if (config.itemHeight !== undefined) {
            this.itemHeight = Math.max(1, config.itemHeight);
        }
        
        if (config.overscan !== undefined) {
            this.overscan = Math.max(0, config.overscan);
        }
        
        if (config.onRender !== undefined) {
            this.onRender = typeof config.onRender === 'function' ? config.onRender : null;
        }
        
        this.recalculatePositions();
    }
    
    /**
     * Debounce a function
     * @private
     */
    /**
     * Debounce a function
     * @private
     */
    _debounce(func, wait) {
        let timeout = null;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func.apply(this, args);
            };
            
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        }.bind(this);
    }
}

// Add default styles if not already defined
if (!document.getElementById('virtualized-list-styles')) {
    const style = document.createElement('style');
    style.id = 'virtualized-list-styles';
    style.textContent = `
        .virtual-list-scroll-container {
            -webkit-overflow-scrolling: touch;
            will-change: scroll-position;
            contain: strict;
        }
        
        .virtual-list-item {
            will-change: transform;
            contain: content;
        }
        
        /* Smooth scrolling on iOS */
        @supports (-webkit-touch-callout: none) {
            .virtual-list-scroll-container {
                -webkit-overflow-scrolling: touch;
            }
        }
    `;
    document.head.appendChild(style);
}
