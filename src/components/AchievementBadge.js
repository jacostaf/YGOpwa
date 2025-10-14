/**
 * AchievementBadge - Displays individual achievement badge
 *
 * Features:
 * - Locked/unlocked states
 * - Progress bar for locked achievements
 * - Rarity-based styling (common, uncommon, rare, epic, legendary)
 * - Glassmorphism design
 * - Lucide icons
 * - Hover effects
 * - Unlock date display
 *
 * @class AchievementBadge
 */

export class AchievementBadge {
  constructor(achievement, options = {}) {
    this.achievement = achievement;
    this.options = {
      showProgress: true,
      showRarity: true,
      size: 'medium', // small, medium, large
      ...options
    };
  }

  /**
   * Render the achievement badge
   * @returns {string} HTML string
   */
  render() {
    const { achievement } = this;
    const { unlocked, progress, requirement, name, description, icon, rarity, unlockedAt } = achievement;

    const progressPercent = Math.min(100, Math.round((progress / requirement) * 100));
    const isLocked = !unlocked;

    // Rarity colors
    const rarityColors = {
      common: {
        bg: 'rgba(156, 163, 175, 0.1)',
        border: 'rgba(156, 163, 175, 0.3)',
        glow: 'rgba(156, 163, 175, 0.2)',
        text: '#9CA3AF'
      },
      uncommon: {
        bg: 'rgba(34, 197, 94, 0.1)',
        border: 'rgba(34, 197, 94, 0.3)',
        glow: 'rgba(34, 197, 94, 0.2)',
        text: '#22C55E'
      },
      rare: {
        bg: 'rgba(59, 130, 246, 0.1)',
        border: 'rgba(59, 130, 246, 0.3)',
        glow: 'rgba(59, 130, 246, 0.2)',
        text: '#3B82F6'
      },
      epic: {
        bg: 'rgba(168, 85, 247, 0.1)',
        border: 'rgba(168, 85, 247, 0.3)',
        glow: 'rgba(168, 85, 247, 0.2)',
        text: '#A855F7'
      },
      legendary: {
        bg: 'rgba(234, 179, 8, 0.1)',
        border: 'rgba(234, 179, 8, 0.3)',
        glow: 'rgba(234, 179, 8, 0.2)',
        text: '#EAB308'
      }
    };

    const colors = rarityColors[rarity] || rarityColors.common;
    const sizeClasses = {
      small: 'p-3',
      medium: 'p-4',
      large: 'p-6'
    };

    return `
      <div class="achievement-badge ${isLocked ? 'locked' : 'unlocked'} ${this.options.size}"
           data-achievement-id="${achievement.id}"
           style="
             background: ${isLocked ? 'rgba(0, 0, 0, 0.3)' : colors.bg};
             border: 2px solid ${isLocked ? 'rgba(255, 255, 255, 0.1)' : colors.border};
             border-radius: 16px;
             ${sizeClasses[this.options.size] || sizeClasses.medium};
             position: relative;
             overflow: hidden;
             backdrop-filter: blur(10px);
             transition: all 0.3s ease;
           ">

        ${!isLocked ? `
          <div class="achievement-glow" style="
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, ${colors.glow} 0%, transparent 70%);
            opacity: 0.5;
            pointer-events: none;
          "></div>
        ` : ''}

        <div class="achievement-content" style="position: relative; z-index: 1;">
          <!-- Icon -->
          <div class="achievement-icon-wrapper" style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: 64px;
            height: 64px;
            margin: 0 auto 16px;
            border-radius: 50%;
            background: ${isLocked ? 'rgba(255, 255, 255, 0.05)' : colors.bg};
            border: 2px solid ${isLocked ? 'rgba(255, 255, 255, 0.1)' : colors.border};
            ${isLocked ? 'opacity: 0.3; filter: grayscale(100%);' : ''}
          ">
            <i data-lucide="${isLocked ? 'Lock' : icon}"
               style="width: 32px; height: 32px; color: ${isLocked ? '#666' : colors.text};"></i>
          </div>

          <!-- Rarity Badge -->
          ${this.options.showRarity && !isLocked ? `
            <div class="achievement-rarity" style="
              position: absolute;
              top: 8px;
              right: 8px;
              padding: 4px 8px;
              border-radius: 8px;
              background: ${colors.bg};
              border: 1px solid ${colors.border};
              font-size: 10px;
              font-weight: 600;
              text-transform: uppercase;
              color: ${colors.text};
              letter-spacing: 0.05em;
            ">${rarity}</div>
          ` : ''}

          <!-- Name -->
          <h3 style="
            font-size: 16px;
            font-weight: 600;
            color: ${isLocked ? '#666' : 'white'};
            margin: 0 0 8px 0;
            text-align: center;
          ">${name}</h3>

          <!-- Description -->
          <p style="
            font-size: 13px;
            color: ${isLocked ? '#555' : 'rgba(255, 255, 255, 0.7)'};
            margin: 0 0 12px 0;
            text-align: center;
            line-height: 1.5;
          ">${description}</p>

          <!-- Progress Bar (for locked achievements) -->
          ${isLocked && this.options.showProgress ? `
            <div class="achievement-progress" style="margin-top: 16px;">
              <div style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 6px;
              ">
                <span style="font-size: 12px; color: rgba(255, 255, 255, 0.5);">Progress</span>
                <span style="font-size: 12px; color: rgba(255, 255, 255, 0.7); font-weight: 600;">
                  ${progress} / ${requirement}
                </span>
              </div>
              <div style="
                width: 100%;
                height: 6px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
                overflow: hidden;
              ">
                <div style="
                  width: ${progressPercent}%;
                  height: 100%;
                  background: linear-gradient(90deg, ${colors.text}, ${colors.border});
                  border-radius: 3px;
                  transition: width 0.3s ease;
                "></div>
              </div>
              <div style="
                text-align: center;
                font-size: 11px;
                color: rgba(255, 255, 255, 0.5);
                margin-top: 4px;
              ">${progressPercent}% Complete</div>
            </div>
          ` : ''}

          <!-- Unlock Date (for unlocked achievements) -->
          ${!isLocked && unlockedAt ? `
            <div class="achievement-unlocked-date" style="
              text-align: center;
              font-size: 11px;
              color: rgba(255, 255, 255, 0.5);
              margin-top: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 4px;
            ">
              <i data-lucide="Check" style="width: 12px; height: 12px;"></i>
              <span>Unlocked ${this.formatDate(unlockedAt)}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Format unlock date
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date
   */
  formatDate(dateString) {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;

      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (error) {
      return 'recently';
    }
  }

  /**
   * Get HTML element (for programmatic usage)
   * @returns {HTMLElement} Badge element
   */
  createElement() {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = this.render();
    return wrapper.firstElementChild;
  }

  /**
   * Get inline CSS styles for the badge
   * @returns {string} CSS styles
   */
  static getStyles() {
    return `
      .achievement-badge {
        cursor: default;
        user-select: none;
      }

      .achievement-badge:not(.locked):hover {
        transform: translateY(-4px) scale(1.02);
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3);
      }

      .achievement-badge.locked {
        cursor: help;
      }

      .achievement-badge.locked:hover {
        transform: translateY(-2px);
        border-color: rgba(255, 255, 255, 0.2) !important;
      }

      @media (prefers-reduced-motion: reduce) {
        .achievement-badge,
        .achievement-badge:hover {
          transform: none !important;
          transition: none !important;
        }
      }

      /* Animation for newly unlocked achievements */
      @keyframes achievement-unlock {
        0% {
          transform: scale(0.8);
          opacity: 0;
        }
        50% {
          transform: scale(1.1);
        }
        100% {
          transform: scale(1);
          opacity: 1;
        }
      }

      .achievement-badge.newly-unlocked {
        animation: achievement-unlock 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
    `;
  }

  /**
   * Inject styles into document (call once)
   */
  static injectStyles() {
    if (!document.getElementById('achievement-badge-styles')) {
      const styleTag = document.createElement('style');
      styleTag.id = 'achievement-badge-styles';
      styleTag.textContent = AchievementBadge.getStyles();
      document.head.appendChild(styleTag);
    }
  }
}

export default AchievementBadge;
