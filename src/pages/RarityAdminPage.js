/**
 * RarityAdminPage.js
 *
 * Dedicated page for rarity management admin panel.
 * Features the Rarity Vault interface for managing card rarity weights.
 */

import { Logger } from '../js/utils/Logger.js';
import { authService } from '../services/authService.js';
import RarityAdmin from '../components/RarityAdmin.js';
import { refreshIcons } from '../utils/IconLoader.js';

export default class RarityAdminPage {
  constructor(router) {
    this.router = router;
    this.logger = new Logger('RarityAdminPage');
    this.container = null;
    this.isAdmin = false;
    this.rarityAdmin = null;
  }

  async mount(container) {
    this.container = container;
    this.checkAdminStatus();

    // Import the CSS
    this.loadStyles();

    if (!this.isAdmin) {
      this.renderAccessDenied();
      return;
    }

    // Initialize the RarityAdmin component
    this.rarityAdmin = new RarityAdmin({ container: this.container });
    await this.rarityAdmin.init();
  }

  checkAdminStatus() {
    const profile = authService?.profile;
    this.isAdmin = profile && profile.is_admin;
  }

  loadStyles() {
    // Check if CSS is already loaded
    if (!document.querySelector('link[href*="rarity-admin.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/src/css/rarity-admin.css';
      document.head.appendChild(link);
    }
  }

  renderAccessDenied() {
    this.container.innerHTML = `
      <div class="rarity-admin-error" style="min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--surface-primary); color: var(--feedback-error);">
        <i data-lucide="lock" style="width: 48px; height: 48px; margin-bottom: 1rem;"></i>
        <h2 style="font-family: 'Instrument Serif', Georgia, serif; font-size: 1.5rem; margin-bottom: 0.5rem;">Access Denied</h2>
        <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 1.5rem;">Admin privileges required to access the Rarity Vault.</p>
        <button class="btn btn-primary" onclick="window.router?.navigate('dashboard')">
          Return to Dashboard
        </button>
      </div>
    `;

    refreshIcons();
  }

  async unmount() {
    if (this.rarityAdmin) {
      this.rarityAdmin.destroy();
      this.rarityAdmin = null;
    }
    this.container.innerHTML = '';
  }
}
