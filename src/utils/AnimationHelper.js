/**
 * AnimationHelper
 *
 * Utility class for managing animations throughout the VoxRip application.
 * Provides helper methods for common animations, skeleton screens, and
 * performance-optimized animation control.
 *
 * Features:
 * - Promise-based animation control
 * - Reduced motion support
 * - Skeleton screen generation
 * - Ripple effects
 * - Staggered animations
 * - Page transitions
 */

export class AnimationHelper {
  constructor() {
    this.prefersReducedMotion = this.checkReducedMotion();
    this.animationDurations = {
      fast: 150,
      normal: 300,
      slow: 600
    };

    // Listen for reduced motion preference changes
    if (window.matchMedia) {
      const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      motionQuery.addEventListener('change', () => {
        this.prefersReducedMotion = this.checkReducedMotion();
      });
    }
  }

  /**
   * Check if user prefers reduced motion
   * @returns {boolean}
   */
  checkReducedMotion() {
    if (window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  }

  /**
   * Get animation duration based on preference
   * @param {string} speed - 'fast', 'normal', or 'slow'
   * @returns {number} Duration in milliseconds
   */
  getDuration(speed = 'normal') {
    if (this.prefersReducedMotion) {
      return 10; // Nearly instant for reduced motion
    }
    return this.animationDurations[speed] || this.animationDurations.normal;
  }

  /**
   * Fade in element
   * @param {HTMLElement} element
   * @param {number} duration - Duration in ms (optional)
   * @returns {Promise}
   */
  fadeIn(element, duration = null) {
    if (!element) return Promise.resolve();

    const dur = duration || this.getDuration('normal');
    element.style.opacity = '0';
    element.classList.add('fade-in');

    return this.waitForAnimation(element, dur).then(() => {
      element.style.opacity = '';
      element.classList.remove('fade-in');
    });
  }

  /**
   * Fade out element
   * @param {HTMLElement} element
   * @param {number} duration - Duration in ms (optional)
   * @returns {Promise}
   */
  fadeOut(element, duration = null) {
    if (!element) return Promise.resolve();

    const dur = duration || this.getDuration('normal');
    element.classList.add('fade-out');

    return this.waitForAnimation(element, dur).then(() => {
      element.style.opacity = '0';
      element.classList.remove('fade-out');
    });
  }

  /**
   * Slide up element
   * @param {HTMLElement} element
   * @param {number} duration - Duration in ms (optional)
   * @returns {Promise}
   */
  slideUp(element, duration = null) {
    if (!element) return Promise.resolve();

    const dur = duration || this.getDuration('normal');
    element.classList.add('slide-up');

    return this.waitForAnimation(element, dur).then(() => {
      element.classList.remove('slide-up');
    });
  }

  /**
   * Slide down element
   * @param {HTMLElement} element
   * @param {number} duration - Duration in ms (optional)
   * @returns {Promise}
   */
  slideDown(element, duration = null) {
    if (!element) return Promise.resolve();

    const dur = duration || this.getDuration('normal');
    element.classList.add('slide-down');

    return this.waitForAnimation(element, dur).then(() => {
      element.classList.remove('slide-down');
    });
  }

  /**
   * Scale in element
   * @param {HTMLElement} element
   * @param {number} duration - Duration in ms (optional)
   * @returns {Promise}
   */
  scaleIn(element, duration = null) {
    if (!element) return Promise.resolve();

    const dur = duration || this.getDuration('normal');
    element.classList.add('scale-in');

    return this.waitForAnimation(element, dur).then(() => {
      element.classList.remove('scale-in');
    });
  }

  /**
   * Scale out element
   * @param {HTMLElement} element
   * @param {number} duration - Duration in ms (optional)
   * @returns {Promise}
   */
  scaleOut(element, duration = null) {
    if (!element) return Promise.resolve();

    const dur = duration || this.getDuration('normal');
    element.classList.add('scale-out');

    return this.waitForAnimation(element, dur).then(() => {
      element.classList.remove('scale-out');
    });
  }

  /**
   * Pulse element
   * @param {HTMLElement} element
   */
  pulse(element) {
    if (!element || this.prefersReducedMotion) return;

    element.classList.add('pulse');
    setTimeout(() => {
      element.classList.remove('pulse');
    }, 1500);
  }

  /**
   * Shake element (for errors)
   * @param {HTMLElement} element
   */
  shake(element) {
    if (!element || this.prefersReducedMotion) return;

    element.classList.add('shake');
    setTimeout(() => {
      element.classList.remove('shake');
    }, 300);
  }

  /**
   * Page transition animation
   * @param {HTMLElement} oldPage - Current page element
   * @param {HTMLElement} newPage - New page element
   * @returns {Promise}
   */
  async pageTransition(oldPage, newPage) {
    if (!oldPage || !newPage) return Promise.resolve();

    const duration = this.getDuration('normal');

    // Fade out old page
    if (oldPage) {
      oldPage.classList.add('page-exit');
      await this.waitForAnimation(oldPage, duration * 0.66);
    }

    // Fade in new page
    if (newPage) {
      newPage.classList.add('page-enter');
      await this.waitForAnimation(newPage, duration);
      newPage.classList.remove('page-enter');
    }

    if (oldPage) {
      oldPage.classList.remove('page-exit');
    }
  }

  /**
   * Staggered animation for list items
   * @param {HTMLElement[]} elements - Array of elements to animate
   * @param {number} staggerDelay - Delay between each element (ms)
   * @param {string} animationClass - CSS class to add
   */
  staggerAnimation(elements, staggerDelay = 50, animationClass = 'fade-in') {
    if (!elements || elements.length === 0) return;

    elements.forEach((element, index) => {
      if (!element) return;

      setTimeout(() => {
        element.classList.add(animationClass);
        setTimeout(() => {
          element.classList.remove(animationClass);
        }, this.getDuration('normal'));
      }, index * staggerDelay);
    });
  }

  /**
   * Create ripple effect on click
   * @param {HTMLElement} element - Container element
   * @param {MouseEvent} event - Click event
   */
  createRipple(element, event) {
    if (!element || this.prefersReducedMotion) return;

    // Create ripple element
    const ripple = document.createElement('span');
    ripple.classList.add('ripple-effect');

    // Calculate position
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    // Set ripple styles
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';

    // Add to element
    element.appendChild(ripple);

    // Remove after animation
    setTimeout(() => {
      ripple.remove();
    }, 600);
  }

  /**
   * Wait for animation to complete
   * @param {HTMLElement} element
   * @param {number} duration - Duration in ms (optional)
   * @returns {Promise}
   */
  waitForAnimation(element, duration = null) {
    if (!element) return Promise.resolve();

    const dur = duration || this.getDuration('normal');

    return new Promise((resolve) => {
      if (this.prefersReducedMotion || dur <= 10) {
        resolve();
        return;
      }

      // Use animationend event if available, fallback to timeout
      let resolved = false;

      const handleAnimationEnd = () => {
        if (!resolved) {
          resolved = true;
          element.removeEventListener('animationend', handleAnimationEnd);
          resolve();
        }
      };

      element.addEventListener('animationend', handleAnimationEnd, { once: true });

      // Fallback timeout
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          element.removeEventListener('animationend', handleAnimationEnd);
          resolve();
        }
      }, dur + 50); // Add 50ms buffer
    });
  }

  /**
   * Generate skeleton screen HTML
   * @param {Object} config - Configuration object
   * @returns {string} HTML string
   */
  generateSkeletonScreen(config = {}) {
    const {
      type = 'card', // 'card', 'text', 'title', 'list', 'grid'
      count = 1,
      className = ''
    } = config;

    let html = '';

    for (let i = 0; i < count; i++) {
      switch (type) {
        case 'card':
          html += `<div class="skeleton skeleton-card ${className}"></div>`;
          break;
        case 'text':
          html += `<div class="skeleton skeleton-text ${className}"></div>`;
          break;
        case 'title':
          html += `<div class="skeleton skeleton-title ${className}"></div>`;
          break;
        case 'list':
          html += `
            <div class="skeleton-list-item ${className}">
              <div class="skeleton skeleton-avatar"></div>
              <div style="flex: 1;">
                <div class="skeleton skeleton-text" style="width: 70%; margin-bottom: 8px;"></div>
                <div class="skeleton skeleton-text" style="width: 90%;"></div>
              </div>
            </div>
          `;
          break;
        case 'grid':
          html += `
            <div class="skeleton-grid ${className}" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px;">
              ${this.generateSkeletonScreen({ type: 'card', count: 4 })}
            </div>
          `;
          break;
        default:
          html += `<div class="skeleton ${className}" style="height: 100px;"></div>`;
      }
    }

    return html;
  }

  /**
   * Create skeleton card grid
   * @param {number} count - Number of cards
   * @returns {string} HTML string
   */
  skeletonCardGrid(count = 4) {
    return `
      <div class="skeleton-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px;">
        ${Array(count).fill(null).map(() => `
          <div class="skeleton skeleton-card" style="height: 300px;"></div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Create skeleton stat cards
   * @param {number} count - Number of cards
   * @returns {string} HTML string
   */
  skeletonStatCards(count = 3) {
    return `
      <div class="skeleton-stats" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
        ${Array(count).fill(null).map((_, i) => `
          <div class="glass-card stat-card card-stagger-${i + 1}">
            <div class="skeleton skeleton-text" style="width: 40%; margin-bottom: 12px;"></div>
            <div class="skeleton skeleton-title" style="width: 60%; margin-bottom: 8px;"></div>
            <div class="skeleton skeleton-text" style="width: 50%;"></div>
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Create skeleton list
   * @param {number} count - Number of items
   * @returns {string} HTML string
   */
  skeletonList(count = 5) {
    return `
      <div class="skeleton-list">
        ${Array(count).fill(null).map(() => `
          <div class="skeleton-list-item" style="display: flex; gap: 12px; margin-bottom: 16px; align-items: center;">
            <div class="skeleton skeleton-avatar"></div>
            <div style="flex: 1;">
              <div class="skeleton skeleton-text" style="width: 70%; margin-bottom: 8px;"></div>
              <div class="skeleton skeleton-text" style="width: 90%;"></div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Show loading spinner
   * @param {HTMLElement} container - Container element
   * @param {string} size - 'small', 'medium', or 'large'
   */
  showSpinner(container, size = 'medium') {
    if (!container) return;

    const sizeMap = {
      small: '20px',
      medium: '40px',
      large: '60px'
    };

    const spinnerSize = sizeMap[size] || sizeMap.medium;

    container.innerHTML = `
      <div class="spinner-container" style="display: flex; justify-content: center; align-items: center; padding: 40px;">
        <svg class="spinner" style="width: ${spinnerSize}; height: ${spinnerSize};" viewBox="0 0 50 50">
          <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" stroke-width="4" stroke-dasharray="90, 150" stroke-linecap="round"></circle>
        </svg>
      </div>
    `;
  }

  /**
   * Show dot loader
   * @param {HTMLElement} container - Container element
   */
  showDotLoader(container) {
    if (!container) return;

    container.innerHTML = `
      <div class="dot-loader">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;
  }

  /**
   * Add card flip animation to element
   * @param {HTMLElement} element
   * @returns {Promise}
   */
  cardFlip(element) {
    if (!element) return Promise.resolve();

    const duration = this.getDuration('slow');
    element.classList.add('card-flip');

    return this.waitForAnimation(element, duration).then(() => {
      element.classList.remove('card-flip');
    });
  }

  /**
   * Animate value change in number display
   * @param {HTMLElement} element - Element containing the number
   * @param {number} from - Starting value
   * @param {number} to - Ending value
   * @param {number} duration - Duration in ms (optional)
   */
  animateValue(element, from, to, duration = null) {
    if (!element) return;

    const dur = duration || this.getDuration('slow');
    const startTime = performance.now();
    const difference = to - from;

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / dur, 1);

      // Easing function (ease-out)
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (difference * eased);

      // Update element
      if (Number.isInteger(to)) {
        element.textContent = Math.round(current);
      } else {
        element.textContent = current.toFixed(2);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * Add achievement unlock animation
   * @param {HTMLElement} element
   */
  achievementUnlock(element) {
    if (!element || this.prefersReducedMotion) return;

    element.classList.add('achievement-unlock');
    setTimeout(() => {
      element.classList.remove('achievement-unlock');
    }, 1600);
  }

  /**
   * Add glow effect to element
   * @param {HTMLElement} element
   * @param {number} duration - Duration in ms (optional)
   */
  glow(element, duration = 2000) {
    if (!element || this.prefersReducedMotion) return;

    element.classList.add('glow');
    setTimeout(() => {
      element.classList.remove('glow');
    }, duration);
  }

  /**
   * Clean up animations on element
   * @param {HTMLElement} element
   */
  cleanup(element) {
    if (!element) return;

    // Remove all animation classes
    const animationClasses = [
      'fade-in', 'fade-out', 'slide-up', 'slide-down',
      'scale-in', 'scale-out', 'pulse', 'shake', 'glow',
      'page-enter', 'page-exit', 'card-flip', 'achievement-unlock'
    ];

    animationClasses.forEach(className => {
      element.classList.remove(className);
    });

    // Reset inline styles
    element.style.opacity = '';
    element.style.transform = '';
  }
}

// Export singleton instance
export default new AnimationHelper();
