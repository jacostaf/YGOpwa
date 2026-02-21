/**
 * ActivityService.js
 *
 * Global activity feed service — fetches cross-user events from Supabase
 * and formats them for display on the dashboard.
 */

import { supabase } from '../lib/supabaseClient.js';

/** Standard event type enum */
export const ACTIVITY_EVENTS = {
  add: 'add',
  remove: 'remove',
  import: 'import',
  sync: 'sync',
  pack_opened: 'pack_opened',
};

/** Icon + color per event type (Lucide icon names + Tailwind classes) */
export const EVENT_CONFIG = {
  [ACTIVITY_EVENTS.add]:         { icon: 'Plus',      color: 'text-green-400' },
  [ACTIVITY_EVENTS.remove]:      { icon: 'Minus',     color: 'text-red-400' },
  [ACTIVITY_EVENTS.import]:      { icon: 'Download',  color: 'text-blue-400' },
  [ACTIVITY_EVENTS.sync]:        { icon: 'RefreshCw', color: 'text-amber-400' },
  [ACTIVITY_EVENTS.pack_opened]: { icon: 'Package',   color: 'text-purple-400' },
};

/**
 * Fetch the global activity feed via Supabase RPC.
 * @param {number} [limit=8]
 * @returns {Promise<Array<{type: string, displayName: string, description: string, createdAt: string, icon: string, color: string}>>}
 */
export async function fetchGlobalActivity(limit = 8) {
  const { data, error } = await supabase.rpc('get_global_activity_feed', { p_limit: limit });

  if (error) {
    console.error('[ActivityService] fetchGlobalActivity failed:', error);
    return [];
  }

  return (data || []).map((row) => {
    const cfg = EVENT_CONFIG[row.event_type] || { icon: 'Activity', color: 'text-neutral-500' };
    return {
      type: row.event_type,
      displayName: row.display_name || 'Unknown User',
      description: row.description,
      createdAt: row.created_at,
      icon: cfg.icon,
      color: cfg.color,
    };
  });
}

/**
 * Format a date string as relative time ("5m ago", "2h ago", "3d ago").
 * @param {string} dateStr - ISO 8601 date string
 * @returns {string}
 */
export function formatTimeAgo(dateStr) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return 'just now';

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
