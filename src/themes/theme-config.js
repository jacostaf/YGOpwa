/**
 * VoxRip Theme Configuration
 * Defines all 8 available themes with their color palettes
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

  dusk: {
    name: 'dusk',
    displayName: 'Dusk',
    colors: {
      // Background colors - Warm charcoal
      '--bg-primary': '#0c0a07',
      '--bg-secondary': '#161209',
      '--bg-tertiary': '#1e1a12',

      // Card/Surface colors
      '--card-bg': 'rgba(21, 17, 8, 0.4)',
      '--card-bg-hover': 'rgba(28, 23, 16, 0.6)',
      '--card-border': 'rgba(34, 29, 20, 0.5)',

      // Text colors - Warm cream/sand
      '--text-primary': '#ece6db',
      '--text-secondary': '#a69a8a',
      '--text-tertiary': '#7e7264',
      '--text-muted': '#5e5446',

      // Accent colors - Desaturated warm sand
      '--accent-primary': '#c4b8a4',
      '--accent-secondary': '#a29784',
      '--accent-hover': '#d8cfc0',

      // Gradient backgrounds
      '--gradient-from': '#0c0a07',
      '--gradient-via': '#161209',
      '--gradient-to': '#0c0a07',

      // Border colors - Warm brown
      '--border-primary': '#2c2519',
      '--border-secondary': '#453b2f',

      // Sidebar colors
      '--sidebar-bg': 'rgba(16, 13, 8, 0.8)',
      '--sidebar-active': 'rgba(196, 184, 164, 0.12)',
      '--sidebar-hover': 'rgba(196, 184, 164, 0.06)',

      // Status colors
      '--success': '#4ade80',
      '--warning': '#fbbf24',
      '--error': '#f87171',
      '--info': '#60a5fa',
    }
  },

  light: {
    name: 'light',
    displayName: 'Light',
    colors: {
      // Background colors - Warm off-whites
      '--bg-primary': '#f9f8f5',
      '--bg-secondary': '#f5f3ef',
      '--bg-tertiary': '#e8e4de',

      // Card/Surface colors - Warm
      '--card-bg': 'rgba(245, 243, 239, 0.4)',
      '--card-bg-hover': 'rgba(245, 243, 239, 0.6)',
      '--card-border': 'rgba(221, 217, 213, 0.5)',

      // Text colors - Warm, WCAG AA compliant
      '--text-primary': '#1c1917',
      '--text-secondary': '#57524c',
      '--text-tertiary': '#68625c',
      '--text-muted': '#8f8880',

      // Accent colors - Warm dark
      '--accent-primary': '#3a3530',
      '--accent-secondary': '#4d4740',
      '--accent-hover': '#252018',

      // Gradient backgrounds - Warm
      '--gradient-from': '#f9f8f5',
      '--gradient-via': '#f5f3ef',
      '--gradient-to': '#f9f8f5',

      // Border colors - Warm, visible
      '--border-primary': '#ccc7c2',
      '--border-secondary': '#a8a29e',

      // Sidebar colors - Warm
      '--sidebar-bg': 'rgba(245, 243, 239, 0.8)',
      '--sidebar-active': 'rgba(58, 53, 48, 0.15)',
      '--sidebar-hover': 'rgba(58, 53, 48, 0.08)',

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
export const DEFAULT_THEME = 'dusk';

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
