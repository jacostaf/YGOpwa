/**
 * VoxRip Theme Configuration
 * Defines all 7 available themes with their color palettes
 *
 * Each theme includes:
 * - name: Theme identifier
 * - displayName: Human-readable name
 * - colors: Complete color palette with CSS custom property values
 */

export const THEMES = {
  dark: {
    name: 'dark',
    displayName: 'Dark',
    colors: {
      // Background colors
      '--bg-primary': '#0a0a0a',           // neutral-950
      '--bg-secondary': '#171717',         // neutral-900
      '--bg-tertiary': '#262626',          // neutral-800

      // Card/Surface colors (with transparency for glassmorphism)
      '--card-bg': 'rgba(23, 23, 23, 0.4)',      // neutral-900/40
      '--card-bg-hover': 'rgba(23, 23, 23, 0.6)', // neutral-900/60
      '--card-border': 'rgba(38, 38, 38, 0.5)',   // neutral-800/50

      // Text colors
      '--text-primary': '#ffffff',         // white
      '--text-secondary': '#a3a3a3',       // neutral-400
      '--text-tertiary': '#737373',        // neutral-500
      '--text-muted': '#525252',           // neutral-600

      // Accent colors
      '--accent-primary': '#737373',       // neutral-500
      '--accent-secondary': '#525252',     // neutral-600
      '--accent-hover': '#a3a3a3',         // neutral-400

      // Gradient backgrounds
      '--gradient-from': '#0a0a0a',        // neutral-950
      '--gradient-via': '#171717',         // neutral-900
      '--gradient-to': '#0a0a0a',          // neutral-950

      // Border colors
      '--border-primary': '#262626',       // neutral-800
      '--border-secondary': '#404040',     // neutral-700

      // Sidebar colors
      '--sidebar-bg': 'rgba(23, 23, 23, 0.8)',
      '--sidebar-active': 'rgba(115, 115, 115, 0.2)',
      '--sidebar-hover': 'rgba(115, 115, 115, 0.1)',

      // Status colors (consistent across themes)
      '--success': '#22c55e',              // green-500
      '--warning': '#eab308',              // yellow-500
      '--error': '#ef4444',                // red-500
      '--info': '#3b82f6',                 // blue-500
    }
  },

  light: {
    name: 'light',
    displayName: 'Light',
    colors: {
      // Background colors
      '--bg-primary': '#f8fafc',           // slate-50
      '--bg-secondary': '#f1f5f9',         // slate-100
      '--bg-tertiary': '#e2e8f0',          // slate-200

      // Card/Surface colors
      '--card-bg': 'rgba(241, 245, 249, 0.4)',
      '--card-bg-hover': 'rgba(241, 245, 249, 0.6)',
      '--card-border': 'rgba(226, 232, 240, 0.5)',

      // Text colors
      '--text-primary': '#0f172a',         // slate-900
      '--text-secondary': '#64748b',       // slate-500
      '--text-tertiary': '#94a3b8',        // slate-400
      '--text-muted': '#cbd5e1',           // slate-300

      // Accent colors
      '--accent-primary': '#64748b',       // slate-500
      '--accent-secondary': '#94a3b8',     // slate-400
      '--accent-hover': '#475569',         // slate-600

      // Gradient backgrounds
      '--gradient-from': '#f8fafc',        // slate-50
      '--gradient-via': '#f1f5f9',         // slate-100
      '--gradient-to': '#f8fafc',          // slate-50

      // Border colors
      '--border-primary': '#e2e8f0',       // slate-200
      '--border-secondary': '#cbd5e1',     // slate-300

      // Sidebar colors
      '--sidebar-bg': 'rgba(241, 245, 249, 0.8)',
      '--sidebar-active': 'rgba(100, 116, 139, 0.2)',
      '--sidebar-hover': 'rgba(100, 116, 139, 0.1)',

      // Status colors
      '--success': '#22c55e',
      '--warning': '#eab308',
      '--error': '#ef4444',
      '--info': '#3b82f6',
    }
  },

  blue: {
    name: 'blue',
    displayName: 'Blue',
    colors: {
      // Background colors
      '--bg-primary': '#172554',           // blue-950
      '--bg-secondary': '#1e3a8a',         // blue-900
      '--bg-tertiary': '#1e40af',          // blue-800

      // Card/Surface colors
      '--card-bg': 'rgba(30, 58, 138, 0.4)',
      '--card-bg-hover': 'rgba(30, 58, 138, 0.6)',
      '--card-border': 'rgba(30, 64, 175, 0.5)',

      // Text colors
      '--text-primary': '#ffffff',
      '--text-secondary': '#93c5fd',       // blue-300
      '--text-tertiary': '#60a5fa',        // blue-400
      '--text-muted': '#3b82f6',           // blue-500

      // Accent colors
      '--accent-primary': '#3b82f6',       // blue-500
      '--accent-secondary': '#2563eb',     // blue-600
      '--accent-hover': '#60a5fa',         // blue-400

      // Gradient backgrounds
      '--gradient-from': '#172554',        // blue-950
      '--gradient-via': '#1e3a8a',         // blue-900
      '--gradient-to': '#172554',          // blue-950

      // Border colors
      '--border-primary': '#1e40af',       // blue-800
      '--border-secondary': '#2563eb',     // blue-600

      // Sidebar colors
      '--sidebar-bg': 'rgba(30, 58, 138, 0.8)',
      '--sidebar-active': 'rgba(59, 130, 246, 0.2)',
      '--sidebar-hover': 'rgba(59, 130, 246, 0.1)',

      // Status colors
      '--success': '#22c55e',
      '--warning': '#eab308',
      '--error': '#ef4444',
      '--info': '#60a5fa',
    }
  },

  violet: {
    name: 'violet',
    displayName: 'Violet',
    colors: {
      // Background colors
      '--bg-primary': '#2e1065',           // violet-950
      '--bg-secondary': '#4c1d95',         // violet-900
      '--bg-tertiary': '#5b21b6',          // violet-800

      // Card/Surface colors
      '--card-bg': 'rgba(76, 29, 149, 0.4)',
      '--card-bg-hover': 'rgba(76, 29, 149, 0.6)',
      '--card-border': 'rgba(91, 33, 182, 0.5)',

      // Text colors
      '--text-primary': '#ffffff',
      '--text-secondary': '#c4b5fd',       // violet-300
      '--text-tertiary': '#a78bfa',        // violet-400
      '--text-muted': '#8b5cf6',           // violet-500

      // Accent colors
      '--accent-primary': '#8b5cf6',       // violet-500
      '--accent-secondary': '#7c3aed',     // violet-600
      '--accent-hover': '#a78bfa',         // violet-400

      // Gradient backgrounds
      '--gradient-from': '#2e1065',        // violet-950
      '--gradient-via': '#4c1d95',         // violet-900
      '--gradient-to': '#2e1065',          // violet-950

      // Border colors
      '--border-primary': '#5b21b6',       // violet-800
      '--border-secondary': '#7c3aed',     // violet-600

      // Sidebar colors
      '--sidebar-bg': 'rgba(76, 29, 149, 0.8)',
      '--sidebar-active': 'rgba(139, 92, 246, 0.2)',
      '--sidebar-hover': 'rgba(139, 92, 246, 0.1)',

      // Status colors
      '--success': '#22c55e',
      '--warning': '#eab308',
      '--error': '#ef4444',
      '--info': '#a78bfa',
    }
  },

  emerald: {
    name: 'emerald',
    displayName: 'Emerald',
    colors: {
      // Background colors
      '--bg-primary': '#022c22',           // emerald-950
      '--bg-secondary': '#064e3b',         // emerald-900
      '--bg-tertiary': '#065f46',          // emerald-800

      // Card/Surface colors
      '--card-bg': 'rgba(6, 78, 59, 0.4)',
      '--card-bg-hover': 'rgba(6, 78, 59, 0.6)',
      '--card-border': 'rgba(6, 95, 70, 0.5)',

      // Text colors
      '--text-primary': '#ffffff',
      '--text-secondary': '#6ee7b7',       // emerald-300
      '--text-tertiary': '#34d399',        // emerald-400
      '--text-muted': '#10b981',           // emerald-500

      // Accent colors
      '--accent-primary': '#10b981',       // emerald-500
      '--accent-secondary': '#059669',     // emerald-600
      '--accent-hover': '#34d399',         // emerald-400

      // Gradient backgrounds
      '--gradient-from': '#022c22',        // emerald-950
      '--gradient-via': '#064e3b',         // emerald-900
      '--gradient-to': '#022c22',          // emerald-950

      // Border colors
      '--border-primary': '#065f46',       // emerald-800
      '--border-secondary': '#059669',     // emerald-600

      // Sidebar colors
      '--sidebar-bg': 'rgba(6, 78, 59, 0.8)',
      '--sidebar-active': 'rgba(16, 185, 129, 0.2)',
      '--sidebar-hover': 'rgba(16, 185, 129, 0.1)',

      // Status colors
      '--success': '#34d399',
      '--warning': '#eab308',
      '--error': '#ef4444',
      '--info': '#34d399',
    }
  },

  rose: {
    name: 'rose',
    displayName: 'Rose',
    colors: {
      // Background colors
      '--bg-primary': '#4c0519',           // rose-950
      '--bg-secondary': '#881337',         // rose-900
      '--bg-tertiary': '#9f1239',          // rose-800

      // Card/Surface colors
      '--card-bg': 'rgba(136, 19, 55, 0.4)',
      '--card-bg-hover': 'rgba(136, 19, 55, 0.6)',
      '--card-border': 'rgba(159, 18, 57, 0.5)',

      // Text colors
      '--text-primary': '#ffffff',
      '--text-secondary': '#fda4af',       // rose-300
      '--text-tertiary': '#fb7185',        // rose-400
      '--text-muted': '#f43f5e',           // rose-500

      // Accent colors
      '--accent-primary': '#f43f5e',       // rose-500
      '--accent-secondary': '#e11d48',     // rose-600
      '--accent-hover': '#fb7185',         // rose-400

      // Gradient backgrounds
      '--gradient-from': '#4c0519',        // rose-950
      '--gradient-via': '#881337',         // rose-900
      '--gradient-to': '#4c0519',          // rose-950

      // Border colors
      '--border-primary': '#9f1239',       // rose-800
      '--border-secondary': '#e11d48',     // rose-600

      // Sidebar colors
      '--sidebar-bg': 'rgba(136, 19, 55, 0.8)',
      '--sidebar-active': 'rgba(244, 63, 94, 0.2)',
      '--sidebar-hover': 'rgba(244, 63, 94, 0.1)',

      // Status colors
      '--success': '#22c55e',
      '--warning': '#eab308',
      '--error': '#fb7185',
      '--info': '#fb7185',
    }
  },

  amber: {
    name: 'amber',
    displayName: 'Amber',
    colors: {
      // Background colors
      '--bg-primary': '#451a03',           // amber-950
      '--bg-secondary': '#78350f',         // amber-900
      '--bg-tertiary': '#92400e',          // amber-800

      // Card/Surface colors
      '--card-bg': 'rgba(120, 53, 15, 0.4)',
      '--card-bg-hover': 'rgba(120, 53, 15, 0.6)',
      '--card-border': 'rgba(146, 64, 14, 0.5)',

      // Text colors
      '--text-primary': '#ffffff',
      '--text-secondary': '#fcd34d',       // amber-300
      '--text-tertiary': '#fbbf24',        // amber-400
      '--text-muted': '#f59e0b',           // amber-500

      // Accent colors
      '--accent-primary': '#f59e0b',       // amber-500
      '--accent-secondary': '#d97706',     // amber-600
      '--accent-hover': '#fbbf24',         // amber-400

      // Gradient backgrounds
      '--gradient-from': '#451a03',        // amber-950
      '--gradient-via': '#78350f',         // amber-900
      '--gradient-to': '#451a03',          // amber-950

      // Border colors
      '--border-primary': '#92400e',       // amber-800
      '--border-secondary': '#d97706',     // amber-600

      // Sidebar colors
      '--sidebar-bg': 'rgba(120, 53, 15, 0.8)',
      '--sidebar-active': 'rgba(245, 158, 11, 0.2)',
      '--sidebar-hover': 'rgba(245, 158, 11, 0.1)',

      // Status colors
      '--success': '#22c55e',
      '--warning': '#fbbf24',
      '--error': '#ef4444',
      '--info': '#fbbf24',
    }
  }
};

/**
 * Default theme configuration
 */
export const DEFAULT_THEME = 'dark';

/**
 * Get all available theme names
 * @returns {string[]} Array of theme names
 */
export function getThemeNames() {
  return Object.keys(THEMES);
}

/**
 * Get theme configuration by name
 * @param {string} themeName - Name of the theme
 * @returns {object|null} Theme configuration object or null if not found
 */
export function getTheme(themeName) {
  return THEMES[themeName] || null;
}

/**
 * Check if a theme exists
 * @param {string} themeName - Name of the theme
 * @returns {boolean} True if theme exists
 */
export function themeExists(themeName) {
  return themeName in THEMES;
}
