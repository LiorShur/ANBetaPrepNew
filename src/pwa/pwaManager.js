/**
 * PWA Manager
 * Access Nature - Progressive Web App Functionality
 * 
 * Handles:
 * - Service Worker registration & updates
 * - Install prompt (Add to Home Screen)
 * - Background sync queue
 * - Offline maps management
 * - Cache management
 */

import { toast } from '../utils/toast.js';
import { modal } from '../utils/modal.js';

class PWAManager {
  constructor() {
    this.swRegistration = null;
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.pendingSync = {
      routes: [],
      reports: [],
      guides: []
    };
    this.storageKey = 'accessNature_pwa';
  }

  /**
   * Initialize PWA functionality
   */
  async initialize() {
    // Check if already installed
    this.checkInstallStatus();
    
    // Register service worker
    await this.registerServiceWorker();
    
    // Listen for install prompt
    this.setupInstallPrompt();
    
    // Listen for online/offline events
    this.setupConnectivityListeners();
    
    // Listen for service worker messages
    this.setupMessageListener();
    
    // Load pending sync items
    this.loadPendingSync();
    
    // Show install prompt if appropriate
    this.maybeShowInstallBanner();
    
    console.log('✅ PWA Manager initialized');
  }

  // ==================== Service Worker ====================

  /**
   * Register service worker
   * TEMPORARILY DISABLED to fix infinite update loop
   */
  async registerServiceWorker() {
    // TEMPORARY: Skip service worker registration entirely
    // This breaks the infinite update loop while we debug
    console.log('[PWA] Service Worker registration SKIPPED (temporary fix)');
    
    // Unregister any existing service workers to clean up
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
          console.log('[PWA] Unregistered old service worker');
        }
      } catch (e) {
        console.warn('[PWA] Could not unregister service workers:', e);
      }
    }
    
    return;
    
    /* ORIGINAL CODE - DISABLED
    if (!('serviceWorker' in navigator)) {
      console.warn('[PWA] Service workers not supported');
      return;
    }

    try {
      this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('[PWA] Service Worker registered:', this.swRegistration.scope);

      // Check for updates
      this.swRegistration.addEventListener('updatefound', () => {
        this.handleUpdateFound();
      });

      // Handle controller change (new SW activated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[PWA] New Service Worker activated');
      });

      // Check if there's a waiting worker
      if (this.swRegistration.waiting) {
        this.promptForUpdate();
      }

    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error);
    }
    */
  }

  /**
   * Handle new service worker found
   */
  handleUpdateFound() {
    const newWorker = this.swRegistration.installing;
    console.log('[PWA] New Service Worker installing...');

    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        // New SW waiting to activate
        this.promptForUpdate();
      }
    });
  }

  /**
   * Prompt user to update to new version
   */
  async promptForUpdate() {
    console.log('[PWA] New version detected - auto-updating...');
    // Skip the modal and just apply the update directly
    this.applyUpdate();
  }

  /**
   * Apply the waiting service worker
   */
  applyUpdate() {
    if (this.swRegistration?.waiting) {
      // Tell SW to skip waiting
      this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Reload page to use new SW
      window.location.reload();
    }
  }

  // ==================== Install Prompt ====================

  /**
   * Check if app is already installed
   */
  checkInstallStatus() {
    // Check display-mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true;
    }

    // Check iOS standalone
    if (window.navigator.standalone === true) {
      this.isInstalled = true;
    }

    // Check localStorage flag
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      const data = JSON.parse(saved);
      if (data.installed) {
        this.isInstalled = true;
      }
    }
  }

  /**
   * Setup install prompt listener
   */
  setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('[PWA] Install prompt available');
      
      // Prevent automatic prompt
      e.preventDefault();
      
      // Store event for later use
      this.deferredPrompt = e;
      
      // Show custom install button/banner
      this.showInstallButton();
    });

    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed successfully');
      this.isInstalled = true;
      this.deferredPrompt = null;
      this.hideInstallButton();
      this.saveState({ installed: true });
      toast.success('Access Nature installed! 🎉');
    });
  }

  /**
   * Show install button in UI
   */
  showInstallButton() {
    // Create install banner if doesn't exist
    let banner = document.getElementById('pwaInstallBanner');
    
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'pwaInstallBanner';
      banner.className = 'pwa-install-banner';
      banner.innerHTML = `
        <div class="install-content">
          <span class="install-icon">📱</span>
          <div class="install-text">
            <strong>Install Access Nature</strong>
            <span>Add to home screen for offline access</span>
          </div>
        </div>
        <div class="install-actions">
          <button class="install-btn" id="pwaInstallBtn">Install</button>
          <button class="install-dismiss" id="pwaInstallDismiss">×</button>
        </div>
      `;
      
      document.body.appendChild(banner);
      
      // Add event listeners
      document.getElementById('pwaInstallBtn')?.addEventListener('click', () => {
        this.promptInstall();
      });
      
      document.getElementById('pwaInstallDismiss')?.addEventListener('click', () => {
        this.dismissInstallBanner();
      });
    }
    
    banner.classList.add('visible');
  }

  /**
   * Hide install button
   */
  hideInstallButton() {
    const banner = document.getElementById('pwaInstallBanner');
    banner?.classList.remove('visible');
  }

  /**
   * Dismiss install banner for this session
   */
  dismissInstallBanner() {
    this.hideInstallButton();
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
  }

  /**
   * Maybe show install banner based on conditions
   */
  maybeShowInstallBanner() {
    // Don't show if already installed
    if (this.isInstalled) return;
    
    // Don't show if dismissed this session
    if (sessionStorage.getItem('pwa_banner_dismissed')) return;
    
    // Don't show if no prompt available
    if (!this.deferredPrompt) return;
    
    // Show after delay
    setTimeout(() => {
      this.showInstallButton();
    }, 5000);
  }

  /**
   * Trigger install prompt
   */
  async promptInstall() {
    if (!this.deferredPrompt) {
      toast.info('Install is not available on this device');
      return;
    }

    // Show the prompt
    this.deferredPrompt.prompt();

    // Wait for user response
    const { outcome } = await this.deferredPrompt.userChoice;
    
    console.log('[PWA] Install prompt outcome:', outcome);
    
    if (outcome === 'accepted') {
      this.deferredPrompt = null;
    }
    
    this.hideInstallButton();
  }

  // ==================== Connectivity ====================

  /**
   * Setup online/offline listeners
   */
  setupConnectivityListeners() {
    window.addEventListener('online', () => {
      console.log('[PWA] Connection restored');
      toast.success('Back online! Syncing data...');
      this.syncPendingData();
    });

    window.addEventListener('offline', () => {
      console.log('[PWA] Connection lost');
      toast.warning('You are offline. Changes will sync when connected.');
    });
  }

  /**
   * Check if online
   */
  isOnline() {
    return navigator.onLine;
  }

  // ==================== Background Sync ====================

  /**
   * Setup service worker message listener
   */
  setupMessageListener() {
    navigator.serviceWorker?.addEventListener('message', (event) => {
      const { type, data } = event.data;
      
      switch (type) {
        case 'SYNC_SUCCESS':
          this.handleSyncSuccess(data);
          break;
          
        case 'MAP_CACHE_PROGRESS':
          this.handleMapCacheProgress(data);
          break;
          
        case 'MAP_CACHE_COMPLETE':
          this.handleMapCacheComplete(data);
          break;
      }
    });
  }

  /**
   * Handle successful sync notification
   */
  handleSyncSuccess(data) {
    console.log('[PWA] Sync success:', data);
    toast.success(`${data.type} synced successfully`);
    
    // Remove from pending
    this.removePendingItem(data.type + 's', data.id);
  }

  /**
   * Load pending sync items from storage
   */
  loadPendingSync() {
    try {
      const saved = localStorage.getItem(this.storageKey + '_pending');
      if (saved) {
        this.pendingSync = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('[PWA] Failed to load pending sync:', e);
    }
  }

  /**
   * Save pending sync items
   */
  savePendingSync() {
    try {
      localStorage.setItem(this.storageKey + '_pending', JSON.stringify(this.pendingSync));
    } catch (e) {
      console.warn('[PWA] Failed to save pending sync:', e);
    }
  }

  /**
   * Add item to sync queue
   * @param {string} type - 'routes', 'reports', or 'guides'
   * @param {object} data - Data to sync
   */
  addToSyncQueue(type, data) {
    const item = {
      id: data.id || Date.now().toString(),
      data,
      timestamp: Date.now()
    };
    
    this.pendingSync[type].push(item);
    this.savePendingSync();
    
    // Try to sync immediately if online
    if (this.isOnline()) {
      this.requestSync(type);
    }
    
    return item.id;
  }

  /**
   * Remove item from pending queue
   */
  removePendingItem(type, id) {
    this.pendingSync[type] = this.pendingSync[type].filter(item => item.id !== id);
    this.savePendingSync();
  }

  /**
   * Request background sync
   * @param {string} tag - Sync tag
   */
  async requestSync(tag) {
    if (!this.swRegistration?.sync) {
      // Background sync not supported - sync manually
      this.manualSync(tag);
      return;
    }

    try {
      await this.swRegistration.sync.register(`sync-${tag}`);
      console.log('[PWA] Background sync registered:', tag);
    } catch (error) {
      console.warn('[PWA] Background sync failed, trying manual:', error);
      this.manualSync(tag);
    }
  }

  /**
   * Manual sync when background sync not available
   */
  async manualSync(type) {
    const items = this.pendingSync[type];
    
    for (const item of items) {
      try {
        // This would call the actual sync function
        // For now, dispatch an event for the app to handle
        window.dispatchEvent(new CustomEvent('pwa-sync', {
          detail: { type, data: item.data }
        }));
        
        this.removePendingItem(type, item.id);
      } catch (error) {
        console.error('[PWA] Manual sync failed:', error);
      }
    }
  }

  /**
   * Sync all pending data
   */
  async syncPendingData() {
    for (const type of ['routes', 'reports', 'guides']) {
      if (this.pendingSync[type].length > 0) {
        await this.requestSync(type);
      }
    }
  }

  /**
   * Get pending sync count
   */
  getPendingSyncCount() {
    return this.pendingSync.routes.length + 
           this.pendingSync.reports.length + 
           this.pendingSync.guides.length;
  }

  // ==================== Offline Maps ====================

  /**
   * Cache map tiles for a region
   * @param {object} bounds - { north, south, east, west }
   * @param {number} zoom - Current zoom level
   * @param {number} maxZoom - Maximum zoom to cache (default 16)
   */
  async cacheMapRegion(bounds, zoom, maxZoom = 16) {
    if (!this.swRegistration?.active) {
      toast.error('Service worker not ready');
      return;
    }

    // Estimate tile count
    const tileCount = this.estimateTileCount(bounds, zoom, maxZoom);
    
    const confirm = await modal.confirm(
      `This will download approximately ${tileCount} map tiles (${this.formatBytes(tileCount * 15000)}). Continue?`,
      '📥 Download Map Area'
    );
    
    if (!confirm) return;

    toast.info('Downloading map tiles...');

    // Send message to service worker
    this.swRegistration.active.postMessage({
      type: 'CACHE_MAP_REGION',
      payload: { bounds, zoom, maxZoom }
    });
  }

  /**
   * Estimate number of tiles for a region
   */
  estimateTileCount(bounds, minZoom, maxZoom) {
    let count = 0;
    
    for (let z = minZoom; z <= maxZoom; z++) {
      const tilesX = Math.ceil((bounds.east - bounds.west) / (360 / Math.pow(2, z)));
      const tilesY = Math.ceil((bounds.north - bounds.south) / (180 / Math.pow(2, z)));
      count += tilesX * tilesY;
    }
    
    return count;
  }

  /**
   * Handle map cache progress
   */
  handleMapCacheProgress(data) {
    const percent = Math.round((data.cached / data.total) * 100);
    
    // Update progress indicator
    const indicator = document.getElementById('mapCacheProgress');
    if (indicator) {
      indicator.textContent = `Downloading: ${percent}%`;
    }
  }

  /**
   * Handle map cache complete
   */
  handleMapCacheComplete(data) {
    toast.success(`Map downloaded! ${data.cached} tiles cached.`);
    
    const indicator = document.getElementById('mapCacheProgress');
    if (indicator) {
      indicator.textContent = '';
    }
  }

  /**
   * Get current map bounds from Leaflet map
   */
  getMapBounds(map) {
    const bounds = map.getBounds();
    return {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest()
    };
  }

  /**
   * Download current map view for offline use
   * @param {L.Map} map - Leaflet map instance
   */
  async downloadCurrentMapView(map) {
    if (!map) {
      toast.error('Map not available');
      return;
    }

    const bounds = this.getMapBounds(map);
    const zoom = map.getZoom();
    
    await this.cacheMapRegion(bounds, zoom);
  }

  // ==================== Cache Management ====================

  /**
   * Get cache size
   */
  async getCacheSize() {
    return new Promise((resolve) => {
      if (!this.swRegistration?.active) {
        resolve(0);
        return;
      }

      const channel = new MessageChannel();
      
      channel.port1.onmessage = (event) => {
        resolve(event.data.size);
      };

      this.swRegistration.active.postMessage(
        { type: 'GET_CACHE_SIZE' },
        [channel.port2]
      );
    });
  }

  /**
   * Clear all cached data
   */
  async clearCache(cacheName = null) {
    const confirm = await modal.confirm(
      cacheName 
        ? `Clear ${cacheName} cache?`
        : 'Clear all cached data? This will remove offline maps and cached pages.',
      '🗑️ Clear Cache'
    );
    
    if (!confirm) return;

    if (this.swRegistration?.active) {
      this.swRegistration.active.postMessage({
        type: 'CLEAR_CACHE',
        payload: { cacheName }
      });
    }

    toast.success('Cache cleared');
  }

  /**
   * Clear map cache only
   */
  async clearMapCache() {
    await this.clearCache('access-nature-maps-v1.0.0');
  }

  // ==================== Utility Methods ====================

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  /**
   * Save state to localStorage
   */
  saveState(data) {
    try {
      const existing = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
      localStorage.setItem(this.storageKey, JSON.stringify({ ...existing, ...data }));
    } catch (e) {
      console.warn('[PWA] Failed to save state:', e);
    }
  }

  /**
   * Check if running as installed PWA
   */
  isRunningAsPWA() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  }
}

// Create singleton instance
export const pwaManager = new PWAManager();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => pwaManager.initialize());
} else {
  pwaManager.initialize();
}

// Make available globally
window.pwaManager = pwaManager;

export default pwaManager;