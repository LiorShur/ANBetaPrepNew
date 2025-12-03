// Landing page controller
import { auth, db } from '../firebase-setup.js';
import { toast } from './utils/toast.js';
import { modal } from './utils/modal.js';
import { offlineIndicator } from './ui/offlineIndicator.js';
import { loadingStates } from './ui/loadingStates.js';
import { gamificationUI } from './ui/gamificationUI.js';
import { accessibilityRating } from './features/accessibilityRating.js';
import { trailSearch } from './features/trailSearch.js';
import { showError, getErrorMessage } from './utils/errorMessages.js';
import { userService } from './services/userService.js';
// import { initializeAccessReport } from './js/modules/access-report-main.js';

class LandingPageController {
  constructor() {
    this.authController = null;
    this.currentFilters = {};
    this.currentSearch = '';
    this.lastVisible = null;
    this.isLoading = false;
    this.allFeaturedTrails = [];      // Store ALL trails
    this.filteredTrails = [];         // Store filtered trails
    this.displayedFeaturedCount = 0;  // How many currently shown
    this.featuredBatchSize = 6;       // Load 6 at a time
    this.publicGuidesCache = null;    // Cache for shared queries
  }

  async initialize() {
    console.log('🏠 initialize() method called');
    try {
      console.log('🏠 Initializing landing page...');
      
      // Initialize offline indicator
      offlineIndicator.initialize();
      
      // Initialize search UI
      console.log('🏠 About to call initializeTrailSearch()');
      this.initializeTrailSearch();
      console.log('🏠 initializeTrailSearch() completed');
      
      this.setupEventListeners();
      await this.updateLandingAuthStatus();
      await this.loadCommunityStats();
      await this.loadFeaturedTrails();
      this.updateUserStats();
      
      // Make this instance globally available for modal functions
      window.landingAuth = this;
      
      console.log('✅ Landing page initialized');
    } catch (error) {
      console.error('❌ Landing page initialization failed:', error);
      showError(error);
    }
  }

  /**
   * Initialize trail search UI
   */
  initializeTrailSearch() {
    console.log('🔍 initializeTrailSearch() called');
    const searchContainer = document.getElementById('trailSearchContainer');
    console.log('🔍 searchContainer:', searchContainer);
    if (!searchContainer) {
      console.log('⚠️ Trail search container not found');
      return;
    }
    
    // Create search UI
    const searchUI = trailSearch.createSearchUI({
      showSort: true,
      showFilters: true,
      expandedByDefault: false,
      placeholder: 'Search trails by name or location...'
    });
    
    searchContainer.appendChild(searchUI);
    
    // Set up filter change callback
    trailSearch.onFilterChange = (filters, sortBy) => {
      console.log('🔍 Filters changed:', filters, 'Sort:', sortBy);
      this.applyTrailFilters();
    };
    
    console.log('🔍 Trail search UI initialized');
  }

  /**
   * Apply trail filters and update display
   */
  applyTrailFilters() {
    // Filter and sort trails
    this.filteredTrails = trailSearch.filterAndSort(this.allFeaturedTrails);
    
    // Update results header
    const headerContainer = document.getElementById('trailResultsHeader');
    if (headerContainer) {
      headerContainer.innerHTML = '';
      const header = trailSearch.createResultsHeader(
        this.filteredTrails.length,
        this.allFeaturedTrails.length
      );
      headerContainer.appendChild(header);
    }
    
    // Reset displayed count and show filtered results
    this.displayedFeaturedCount = 0;
    this.displayFilteredTrails();
  }

  /**
   * Display filtered trails
   */
  displayFilteredTrails() {
    const container = document.getElementById('featuredTrails');
    if (!container) return;
    
    // Use filtered trails if we have them, otherwise use all
    const trailsToUse = this.filteredTrails.length > 0 || trailSearch.getActiveFilterCount() > 0
      ? this.filteredTrails 
      : this.allFeaturedTrails;
    
    // No results
    if (trailsToUse.length === 0) {
      container.innerHTML = '';
      container.appendChild(trailSearch.createNoResults());
      this.updateLoadMoreButtonFiltered(0, 0);
      return;
    }
    
    // Calculate what to show
    const startIndex = this.displayedFeaturedCount;
    const endIndex = Math.min(
      startIndex + this.featuredBatchSize,
      trailsToUse.length
    );
    
    const trailsToShow = trailsToUse.slice(startIndex, endIndex);
    
    // First batch: replace content
    if (this.displayedFeaturedCount === 0) {
      const featuredHTML = trailsToShow
        .map(trail => this.createFeaturedTrailCard(trail))
        .join('');
      container.innerHTML = featuredHTML;
    } else {
      // Subsequent batches: append content
      const featuredHTML = trailsToShow
        .map(trail => this.createFeaturedTrailCard(trail))
        .join('');
      container.insertAdjacentHTML('beforeend', featuredHTML);
    }
    
    this.displayedFeaturedCount = endIndex;
    this.updateLoadMoreButtonFiltered(this.displayedFeaturedCount, trailsToUse.length);
  }

  /**
   * Update load more button for filtered results
   */
  updateLoadMoreButtonFiltered(displayed, total) {
    const button = document.getElementById('loadMoreBtn') || document.querySelector('.load-more-btn');
    if (!button) return;
    
    const remaining = total - displayed;
    
    if (remaining > 0) {
      button.style.display = 'block';
      button.textContent = `Load More Trails (${remaining} more)`;
      button.disabled = false;
      button.style.opacity = '1';
      button.style.cursor = 'pointer';
    } else if (total > 0) {
      button.textContent = `All ${total} trails shown ✓`;
      button.disabled = true;
      button.style.opacity = '0.5';
      button.style.cursor = 'not-allowed';
    } else {
      button.style.display = 'none';
    }
  }

  setupEventListeners() {
    // Quick search
    const quickSearchInput = document.getElementById('quickSearch');
    if (quickSearchInput) {
      quickSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.quickSearch();
        }
      });
      window.viewTrailGuide = (guideId) => this.viewTrailGuide(guideId);
    }

    // Make functions global
    window.openTrailBrowser = () => this.openTrailBrowser();
    window.closeTrailBrowser = () => this.closeTrailBrowser();
    window.openTracker = () => this.openTracker();
    window.quickSearch = () => this.quickSearch();
    window.searchTrails = () => this.searchTrails();
    window.applyFilters = () => this.applyFilters();
    window.loadMoreResults = () => this.loadMoreResults();
    window.loadMoreFeatured = () => this.loadMoreFeatured();
    window.viewTrailGuide = (guideId) => this.viewTrailGuide(guideId);
    window.loadMyTrailGuides = () => this.loadMyTrailGuides();
    
    // Info functions
    window.showAbout = () => this.showAbout();
    window.showPrivacy = () => this.showPrivacy();
    window.showContact = () => this.showContact();
    window.showHelp = () => this.showHelp();
  }

  // Navigation Functions
  openTrailBrowser() {
    const modal = document.getElementById('trailBrowserModal');
    if (modal) {
      modal.classList.remove('hidden');
      this.searchTrails(); // Load initial results
    }
  }

  closeTrailBrowser() {
    const modal = document.getElementById('trailBrowserModal');
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  openTracker() {
    // Redirect to main tracker app
    window.location.href = 'tracker.html';
  }

  // Search Functions
  async quickSearch() {
    const searchInput = document.getElementById('quickSearch');
    const searchTerm = searchInput?.value?.trim();
    
    if (!searchTerm) {
      toast.warning('Please enter a search term');
      return;
    }

    this.currentSearch = searchTerm;
    this.openTrailBrowser();
  }

// UPDATED: Search with better error handling
async searchTrails() {
  if (this.isLoading) return;
  
  this.isLoading = true;
  this.showLoading('trailResults');
  
  try {
    const searchInput = document.getElementById('trailSearch');
    const searchTerm = searchInput?.value?.trim() || this.currentSearch;
    
    console.log('Searching trails:', searchTerm || 'all trails');
    
    const { collection, query, where, getDocs } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
    
    // Simple query without orderBy
    let guidesQuery = query(
      collection(db, 'trail_guides'),
      where('isPublic', '==', true)
    );
    
    const querySnapshot = await getDocs(guidesQuery);
    const guides = [];
    
    querySnapshot.forEach(doc => {
      const data = doc.data();
      
      // Apply text search filter on client side
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const nameMatch = data.routeName?.toLowerCase().includes(searchLower);
        const locationMatch = data.accessibility?.location?.toLowerCase().includes(searchLower);
        const authorMatch = data.userEmail?.toLowerCase().includes(searchLower);
        
        if (!nameMatch && !locationMatch && !authorMatch) {
          return; // Skip this result
        }
      }
      
      // Apply other filters on client side
      if (this.currentFilters.wheelchairAccess && 
          data.accessibility?.wheelchairAccess !== this.currentFilters.wheelchairAccess) {
        return;
      }
      
      if (this.currentFilters.difficulty && 
          data.accessibility?.difficulty !== this.currentFilters.difficulty) {
        return;
      }
      
      if (this.currentFilters.distance) {
        const distance = data.metadata?.totalDistance || 0;
        const [min, max] = this.parseDistanceFilter(this.currentFilters.distance);
        if (distance < min || (max && distance > max)) {
          return;
        }
      }
      
      guides.push({
        id: doc.id,
        ...data
      });
    });
    
    // Sort client-side by creation date (newest first)
    guides.sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt));
    
    console.log(`Found ${guides.length} trails matching criteria`);
    this.displayTrailResults(guides);
    this.updateResultsCount(guides.length);
    
  } catch (error) {
    console.error('Search failed:', error);
    
    const resultsContainer = document.getElementById('trailResults');
    if (resultsContainer) {
      resultsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <h3>Search temporarily unavailable</h3>
          <p>Please try again in a moment, or check your connection.</p>
          <button onclick="searchTrails()" class="nav-card-button primary">Retry Search</button>
        </div>
      `;
    }
  } finally {
    this.isLoading = false;
  }
}

  applyFilters() {
    // Collect filter values
    this.currentFilters = {
      wheelchairAccess: document.getElementById('wheelchairFilter')?.value || '',
      difficulty: document.getElementById('difficultyFilter')?.value || '',
      distance: document.getElementById('distanceFilter')?.value || ''
    };
    
    console.log('🎯 Applying filters:', this.currentFilters);
    this.searchTrails();
  }

  displayTrailResults(guides) {
    const resultsContainer = document.getElementById('trailResults');
    if (!resultsContainer) return;
    
    if (guides.length === 0) {
      resultsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <h3>No trails found</h3>
          <p>Try adjusting your search terms or filters</p>
          <button onclick="clearFilters()" class="nav-card-button primary">Clear Filters</button>
        </div>
      `;
      return;
    }
    
    const resultsHTML = guides.map(guide => this.createTrailResultCard(guide)).join('');
    resultsContainer.innerHTML = resultsHTML;
  }

  createTrailResultCard(guide) {
    const date = new Date(guide.generatedAt).toLocaleDateString();
    const accessibility = guide.accessibility || {};
    const metadata = guide.metadata || {};
    const community = guide.community || {};
    
    return `
      <div class="trail-result-card" onclick="viewTrailGuide('${guide.id}')">
        <div class="trail-result-header">
          <div class="trail-result-name">${guide.routeName}</div>
          <div class="trail-result-author">by ${guide.userEmail}</div>
          <div class="trail-result-date">${date}</div>
        </div>
        
        <div class="trail-result-body">
          <div class="trail-result-stats">
            <div class="trail-stat">
              <span class="trail-stat-value">${(metadata.totalDistance || 0).toFixed(1)}</span>
              <span class="trail-stat-label">km</span>
            </div>
            <div class="trail-stat">
              <span class="trail-stat-value">${metadata.locationCount || 0}</span>
              <span class="trail-stat-label">GPS Points</span>
            </div>
          </div>
          
          <div class="trail-accessibility-tags">
            ${accessibility.wheelchairAccess ? `<span class="accessibility-tag">♿ ${accessibility.wheelchairAccess}</span>` : ''}
            ${accessibility.difficulty ? `<span class="accessibility-tag">🥾 ${accessibility.difficulty}</span>` : ''}
            ${accessibility.trailSurface ? `<span class="accessibility-tag">🛤️ ${accessibility.trailSurface}</span>` : ''}
          </div>
          
          <div class="trail-community-stats">
            <span>👁️ ${community.views || 0} views</span>
            <span>📷 ${metadata.photoCount || 0} photos</span>
            <span>📝 ${metadata.noteCount || 0} notes</span>
          </div>
        </div>
      </div>
    `;
  }

  async viewTrailGuide(guideId) {
    try {
      console.log('👁️ Viewing trail guide:', guideId);
      
      // Get trail guide with HTML content
      const authController = window.AccessNatureApp?.getController?.('auth');
      if (authController && typeof authController.getTrailGuide === 'function') {
        const guide = await authController.getTrailGuide(guideId);
        
        if (guide && guide.htmlContent) {
          // Open HTML content in new tab
          const blob = new Blob([guide.htmlContent], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          const newWindow = window.open(url, '_blank');
          
          // Clean up URL after delay
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        } else {
          toast.error('Trail guide not found');
        }
      } else {
        toast.info('Please sign in to view full trail guides');
      }
      
    } catch (error) {
      console.error('❌ Failed to view trail guide:', error);
      toast.error('Failed to load trail guide. Please try again.');
    }
  }

  // Stats Functions
// UPDATED: Load community stats without count queries
async loadCommunityStats(retryCount = 0) {
  const MAX_RETRIES = 3;
  
  try {
    console.log('Loading community stats...');
    
    // If we already loaded public guides, use cached data
    if (this.publicGuidesCache && this.publicGuidesCache.length > 0) {
      console.log('Using cached public guides for stats');
      this.calculateAndDisplayStats(this.publicGuidesCache);
      return;
    }
    
    // Wait for any other Firebase operations to complete
    await new Promise(resolve => setTimeout(resolve, 100 + (retryCount * 500)));
    
    const { collection, query, where, getDocs, getDocsFromServer } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
    
    // Query public guides
    const publicGuidesQuery = query(
      collection(db, 'trail_guides'), 
      where('isPublic', '==', true)
    );
    
    // Try getDocsFromServer first to avoid cache conflicts, fall back to getDocs
    let guidesSnapshot;
    try {
      guidesSnapshot = await getDocsFromServer(publicGuidesQuery);
    } catch (serverError) {
      console.log('Server query failed, trying cached:', serverError.message);
      guidesSnapshot = await getDocs(publicGuidesQuery);
    }
    
    // Cache the results for loadFeaturedTrails
    this.publicGuidesCache = [];
    guidesSnapshot.forEach(doc => {
      this.publicGuidesCache.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    this.calculateAndDisplayStats(this.publicGuidesCache);
    console.log('Community stats loaded successfully');
    
  } catch (error) {
    console.error('Failed to load community stats:', error);
    
    // Retry on Target ID error
    if (error.message && error.message.includes('Target ID') && retryCount < MAX_RETRIES) {
      console.log(`🔄 Retrying community stats... (${retryCount + 1}/${MAX_RETRIES})`);
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      return this.loadCommunityStats(retryCount + 1);
    }
    
    // Set default values if failing
    this.updateElement('publicGuides', '0');
    this.updateElement('totalKm', '0');
    this.updateElement('accessibleTrails', '0');
    this.updateElement('totalUsers', '0');
  }
}

// Helper to calculate and display stats
calculateAndDisplayStats(guides) {
  let totalKm = 0;
  let accessibleTrails = 0;
  const uniqueUsers = new Set();
  const publicGuidesCount = guides.length;
  
  guides.forEach(data => {
    totalKm += data.metadata?.totalDistance || 0;
    uniqueUsers.add(data.userId);
    
    if (data.accessibility?.wheelchairAccess === 'Fully Accessible') {
      accessibleTrails++;
    }
  });
  
  // Update display with animation
  this.animateNumber('publicGuides', publicGuidesCount);
  this.animateNumber('totalKm', Math.round(totalKm));
  this.animateNumber('accessibleTrails', accessibleTrails);
  this.animateNumber('totalUsers', uniqueUsers.size);
}

// UPDATED: Load featured trails using cached data if available
async loadFeaturedTrails() {
  try {
    console.log('📍 Loading featured trails...');
    
    let guides;
    
    // Use cached data if available (from loadCommunityStats)
    if (this.publicGuidesCache && this.publicGuidesCache.length > 0) {
      console.log('📍 Using cached public guides for featured trails');
      guides = this.publicGuidesCache;
    } else {
      // Load fresh if no cache
      const { collection, query, where, getDocs, getDocsFromServer } = 
        await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
      
      const featuredQuery = query(
        collection(db, 'trail_guides'),
        where('isPublic', '==', true)
      );
    
      // Try getDocsFromServer first to avoid cache conflicts
      let querySnapshot;
      try {
        querySnapshot = await getDocsFromServer(featuredQuery);
      } catch (serverError) {
        console.log('Server query failed, trying cached:', serverError.message);
        querySnapshot = await getDocs(featuredQuery);
      }
      
      guides = [];
      
      querySnapshot.forEach(doc => {
        guides.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Cache for future use
      this.publicGuidesCache = guides;
    }
    
    this.allFeaturedTrails = guides;
    
    // Sort by date
    this.allFeaturedTrails.sort((a, b) => 
      new Date(b.generatedAt) - new Date(a.generatedAt)
    );
    
    console.log(`✅ Found ${this.allFeaturedTrails.length} total public trail guides`);
    
    // Initialize filtered trails as all trails (no filters active yet)
    this.filteredTrails = [...this.allFeaturedTrails];
    
    // Update results header
    const headerContainer = document.getElementById('trailResultsHeader');
    if (headerContainer) {
      const header = trailSearch.createResultsHeader(
        this.allFeaturedTrails.length,
        this.allFeaturedTrails.length
      );
      headerContainer.appendChild(header);
    }
    
    // Display first batch
    this.displayedFeaturedCount = 0;
    this.displayFeaturedBatch();
    
  } catch (error) {
    console.error('❌ Failed to load featured trails:', error);
    
    // Retry on Target ID error
    if (error.message && error.message.includes('Target ID') && !this._featuredRetried) {
      console.log('🔄 Retrying featured trails...');
      this._featuredRetried = true;
      await new Promise(resolve => setTimeout(resolve, 2000));
      return this.loadFeaturedTrails();
    }
    
    this.showFeaturedPlaceholder();
  }
}

displayFeaturedBatch() {
  const container = document.getElementById('featuredTrails');
  if (!container) return;
  
  // Empty state
  if (this.allFeaturedTrails.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⭐</div>
        <h3>No featured trails yet</h3>
        <p>Be the first to contribute accessible trail guides!</p>
        <button onclick="openTracker()" class="nav-card-button primary">
          Start Mapping
        </button>
      </div>
    `;
    this.updateLoadMoreButton();
    return;
  }
  
  // Calculate what to show
  const startIndex = this.displayedFeaturedCount;
  const endIndex = Math.min(
    startIndex + this.featuredBatchSize,   // +6
    this.allFeaturedTrails.length          // Don't exceed total
  );
  
  const trailsToShow = this.allFeaturedTrails.slice(startIndex, endIndex);
  
  // First batch: replace content
  if (this.displayedFeaturedCount === 0) {
    const featuredHTML = trailsToShow
      .map(trail => this.createFeaturedTrailCard(trail))
      .join('');
    container.innerHTML = featuredHTML;
  } 
  // Subsequent batches: append content
  else {
    const featuredHTML = trailsToShow
      .map(trail => this.createFeaturedTrailCard(trail))
      .join('');
    container.insertAdjacentHTML('beforeend', featuredHTML);
  }
  
  this.displayedFeaturedCount = endIndex;
  console.log(`📊 Showing ${this.displayedFeaturedCount} of ${this.allFeaturedTrails.length} trails`);
  
  // Update button text
  this.updateLoadMoreButton();
}

updateLoadMoreButton() {
  const button = document.querySelector('.load-more-btn');
  if (!button) return;
  
  const remaining = this.allFeaturedTrails.length - this.displayedFeaturedCount;
  
  if (remaining > 0) {
    // More trails available
    button.style.display = 'block';
    button.textContent = `Load More Trails (${remaining} more available)`;
    button.disabled = false;
    button.style.opacity = '1';
    button.style.cursor = 'pointer';
  } else {
    // All trails loaded
    if (this.allFeaturedTrails.length > 0) {
      button.textContent = `All ${this.allFeaturedTrails.length} trails loaded ✓`;
      button.disabled = true;
      button.style.opacity = '0.5';
      button.style.cursor = 'not-allowed';
    } else {
      button.style.display = 'none';
    }
  }
}

  displayFeaturedTrails(trails) {
    const container = document.getElementById('featuredTrails');
    if (!container) return;
    
    if (trails.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⭐</div>
          <h3>No featured trails yet</h3>
          <p>Be the first to contribute accessible trail guides!</p>
          <button onclick="openTracker()" class="nav-card-button primary">Start Mapping</button>
        </div>
      `;
      return;
    }
    
    const featuredHTML = trails.map(trail => this.createFeaturedTrailCard(trail)).join('');
    container.innerHTML = featuredHTML;
  }

  createFeaturedTrailCard(trail) {
    const accessibility = trail.accessibility || {};
    const metadata = trail.metadata || {};
    const community = trail.community || {};
    
    return `
      <div class="featured-trail">
        <div class="trail-image">🌲</div>
        <div class="trail-info">
          <div class="trail-name">${trail.routeName}</div>
          <div class="trail-meta">
            <span>📍 ${accessibility.location || 'Location not specified'}</span>
            <span>📅 ${new Date(trail.generatedAt).toLocaleDateString()}</span>
          </div>
          <div class="trail-accessibility">
            ${accessibility.wheelchairAccess ? `<span class="accessibility-badge">♿ ${accessibility.wheelchairAccess}</span>` : ''}
            ${accessibility.difficulty ? `<span class="accessibility-badge">🥾 ${accessibility.difficulty}</span>` : ''}
          </div>
          <div class="trail-stats">
            <span>📏 ${(metadata.totalDistance || 0).toFixed(1)} km</span>
            <span>👁️ ${community.views || 0} views</span>
            <span>📷 ${metadata.photoCount || 0} photos</span>
          </div>
          <button class="view-trail-btn" onclick="viewTrailGuide('${trail.id}')">
            View Trail Guide
          </button>
        </div>
      </div>
    `;
  }

  showFeaturedPlaceholder() {
    const container = document.getElementById('featuredTrails');
    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🌲</div>
          <h3>Featured trails coming soon!</h3>
          <p>Help build our community by mapping accessible trails</p>
        </div>
      `;
    }
  }

async updateUserStats() {
  try {
    const authStatus = await this.checkLandingAuth();
    
    if (authStatus.isSignedIn) {
      // User is signed in - load their cloud data
      await this.loadUserCloudStats();
    } else {
      // User not signed in - check localStorage only
      this.loadLocalStats();
    }
  } catch (error) {
    console.error('Failed to update user stats:', error);
    // Fallback to local stats
    this.loadLocalStats();
  }
}

// Add this new method to load cloud stats
async loadUserCloudStats() {
  try {
    const { collection, query, where, getDocs } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
    const { auth } = await import('../firebase-setup.js');
    
    // Get user's routes from Firebase
    const routesQuery = query(
      collection(db, 'routes'),
      where('userId', '==', auth.currentUser.uid)
    );
    
    const routesSnapshot = await getDocs(routesQuery);
    let totalDistance = 0;
    
    routesSnapshot.forEach(doc => {
      const data = doc.data();
      totalDistance += data.totalDistance || 0;
    });
    
    // Update display
    this.updateElement('totalRoutes', routesSnapshot.size);
    this.updateElement('totalDistance', totalDistance.toFixed(1));
    
    console.log(`User stats: ${routesSnapshot.size} routes, ${totalDistance.toFixed(1)} km`);
    
  } catch (error) {
    console.error('Failed to load cloud stats:', error);
    // Fallback to local stats
    this.loadLocalStats();
  }
}

// Add this method for local stats fallback
loadLocalStats() {
  const totalRoutes = localStorage.getItem('sessions') ? JSON.parse(localStorage.getItem('sessions')).length : 0;
  this.updateElement('totalRoutes', totalRoutes);
  
  let totalDistance = 0;
  try {
    const sessions = JSON.parse(localStorage.getItem('sessions') || '[]');
    totalDistance = sessions.reduce((sum, session) => sum + (session.totalDistance || 0), 0);
  } catch (error) {
    console.warn('Error calculating total distance:', error);
  }
  
  this.updateElement('totalDistance', totalDistance.toFixed(1));
}

  // Utility Functions
  updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  }

  updateResultsCount(count) {
    const element = document.getElementById('resultsCount');
    if (element) {
      element.textContent = `${count} trail${count !== 1 ? 's' : ''} found`;
    }
  }

  showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `
        <div class="loading">
          Loading trails... <span class="loading-spinner">⏳</span>
        </div>
      `;
    }
  }

  showError(message) {
    toast.error(message);
  }

  // Info Functions
  showAbout() {
    toast.info(`🌲 About Access Nature

Making outdoor spaces accessible for everyone.

Our mission is to create a comprehensive database of accessible trail information, documented by the community for the community.

Features:
- GPS tracking and route documentation
- Detailed accessibility surveys
- Photo and note sharing
- Community trail guide database
- Export and sharing capabilities

Join us in making nature accessible to all!`);
  }

  // Info Functions (continued)
  showPrivacy() {
    toast.info(`🔒 Privacy Policy

Access Nature Privacy Commitment:

DATA COLLECTION:
- We only collect data you choose to share
- Route data is stored locally by default
- Cloud sync is optional and user-controlled
- No tracking or analytics without consent

YOUR CONTROL:
- You own all your route data
- Delete data anytime from your device
- Make trail guides public/private as you choose
- Export your data in multiple formats

SHARING:
- Only public trail guides are visible to others
- Personal information is never shared
- Location data is only in routes you publish

SECURITY:
- Data encrypted in transit and at rest
- Firebase security rules protect your data
- Regular security updates and monitoring

Questions? Contact us through the app.`);
  }

  showContact() {
    toast.info(`📧 Contact Access Nature

Get in touch with our team:

SUPPORT:
- Email: support@accessnature.app
- Response time: 24-48 hours
- Include device info for technical issues

FEEDBACK:
- Feature requests welcome
- Bug reports appreciated
- Accessibility suggestions prioritized

PARTNERSHIPS:
- Trail organizations
- Accessibility advocates
- Technology collaborators

COMMUNITY:
- Join our monthly virtual meetups
- Share your accessibility mapping stories
- Help improve trail documentation

We're here to help make nature accessible!`);
  }

  showHelp() {
    toast.info(`❓ Access Nature Help

GETTING STARTED:
1. Sign up for cloud sync (optional)
2. Start tracking a trail
3. Take photos and notes along the way
4. Fill out accessibility survey
5. Save and share your trail guide

TRAIL MAPPING TIPS:
- Keep GPS enabled for accurate tracking
- Take photos of key accessibility features
- Note surface types, obstacles, facilities
- Include gradient and width information

SEARCHING TRAILS:
- Use filters for specific accessibility needs
- Browse by location or difficulty
- Read community reviews and ratings
- Download trail guides for offline use

TROUBLESHOOTING:
- Ensure location permissions enabled
- Use strong internet for cloud sync
- Clear browser cache if issues persist
- Contact support for technical problems

Happy trail mapping! 🥾`);
  }

  // Additional utility functions
  async loadMoreResults() {
    // Implement pagination for search results
    console.log('📄 Loading more results...');
    // This would extend the current search with more results
  }

  async loadMoreFeatured() {
  console.log('⭐ Loading more featured trails...');
  
  // Determine which trails array to use
  const trailsToUse = trailSearch.getActiveFilterCount() > 0 
    ? this.filteredTrails 
    : this.allFeaturedTrails;
  
  // Check if all loaded
  if (this.displayedFeaturedCount >= trailsToUse.length) {
    console.log('✅ All trails already displayed');
    return;
  }
  
  // Show loading state
  const button = document.getElementById('loadMoreBtn') || document.querySelector('.load-more-btn');
  if (button) {
    button.textContent = 'Loading...';
    button.disabled = true;
    
    // Small delay for UX
    setTimeout(() => {
      // Use filtered display if filters are active
      if (trailSearch.getActiveFilterCount() > 0) {
        this.displayFilteredTrails();
      } else {
        this.displayFeaturedBatch();
      }
      button.disabled = false;
    }, 300);
  } else {
    if (trailSearch.getActiveFilterCount() > 0) {
      this.displayFilteredTrails();
    } else {
      this.displayFeaturedBatch();
    }
  }
}

  clearFilters() {
    // Clear all filters and search
    document.getElementById('wheelchairFilter').value = '';
    document.getElementById('difficultyFilter').value = '';
    document.getElementById('distanceFilter').value = '';
    document.getElementById('trailSearch').value = '';
    
    this.currentFilters = {};
    this.currentSearch = '';
    this.searchTrails();
  }

  // Make clearFilters available globally
  setupGlobalFunctions() {
    window.clearFilters = () => this.clearFilters();
  }

  // NEW: Animate number changes for better UX
  animateNumber(elementId, targetValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const startValue = 0;
    const duration = 2000; // 2 seconds
    const startTime = performance.now();
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.round(startValue + (targetValue - startValue) * easeOutCubic);
      
      element.textContent = currentValue;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }

  // NEW: Parse distance filter range
  parseDistanceFilter(distanceFilter) {
    switch (distanceFilter) {
      case '0-2': return [0, 2];
      case '2-5': return [2, 5];
      case '5-10': return [5, 10];
      case '10+': return [10, null];
      default: return [0, null];
    }
  }

  // ADD this debug function to your LandingPageController class
async debugTrailGuides() {
  try {
    console.log('🐛 Debugging trail guides...');
    
    const { collection, getDocs, query, limit } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
    
    // Check ALL trail guides (public and private)
    const allGuidesQuery = query(collection(db, 'trail_guides'), limit(10));
    const allSnapshot = await getDocs(allGuidesQuery);
    
    console.log('📊 Total trail guides in database:', allSnapshot.size);
    
    if (allSnapshot.size > 0) {
      allSnapshot.forEach(doc => {
        const data = doc.data();
        console.log('📄 Trail guide:', {
          id: doc.id,
          name: data.routeName,
          isPublic: data.isPublic,
          userId: data.userId,
          generatedAt: data.generatedAt
        });
      });
      
      // Check specifically for public guides
      const { where } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
      const publicQuery = query(
        collection(db, 'trail_guides'), 
        where('isPublic', '==', true),
        limit(10)
      );
      const publicSnapshot = await getDocs(publicQuery);
      console.log('🌍 Public trail guides:', publicSnapshot.size);
      
    } else {
      console.log('❌ No trail guides found in database');
    }
    
  } catch (error) {
    console.error('🐛 Debug failed:', error);
  }
}

// NEW: View trail guide directly (no auth controller dependency)
async viewTrailGuide(guideId) {
  try {
    console.log('👁️ Viewing trail guide:', guideId);
    
    // Import Firestore functions
    const { doc, getDoc, updateDoc, increment } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
    
    // Get the trail guide document
    const guideRef = doc(db, 'trail_guides', guideId);
    const guideSnap = await getDoc(guideRef);
    
    if (!guideSnap.exists()) {
      toast.error('Trail guide not found');
      return;
    }
    
    const guideData = guideSnap.data();
    
    // Check if it's public or user owns it
    const { auth } = await import('../firebase-setup.js');
    const currentUser = auth.currentUser;
    
    const canView = guideData.isPublic || (currentUser && currentUser.uid === guideData.userId);
    
    if (!canView) {
      toast.error('❌ This trail guide is private and you don\'t have permission to view it.');
      return;
    }
    
    // Increment view count (only for public guides and if not the owner)
    if (guideData.isPublic && (!currentUser || currentUser.uid !== guideData.userId)) {
      try {
        await updateDoc(guideRef, {
          'community.views': increment(1)
        });
        console.log('📈 View count incremented');
      } catch (error) {
        console.warn('Failed to increment view count:', error);
        // Don't fail the whole operation for this
      }
    }
    
    // Show the HTML content
    if (guideData.htmlContent) {
      this.displayTrailGuideHTML(guideData.htmlContent, guideData.routeName);
    } else {
      toast.error('❌ Trail guide content not available');
    }
    
  } catch (error) {
    console.error('❌ Failed to view trail guide:', error);
    toast.error('❌ Failed to load trail guide: ' + error.message);
  }
}

// NEW: Display trail guide HTML in new window
async displayTrailGuideHTML(htmlContent, routeName) {
  try {
    // Create blob and open in new tab
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Open in new window/tab
    const newWindow = window.open(url, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
    
    if (!newWindow) {
      // Popup blocked, offer download instead
      const downloadConfirm = await modal.confirm('Popup blocked! Would you like to download the trail guide instead?', '📥 Download Guide');
      if (downloadConfirm) {
        this.downloadTrailGuide(htmlContent, routeName);
      }
    } else {
      // Set window title
      newWindow.document.title = `${routeName} - Trail Guide`;
    }
    
    // Clean up URL after delay
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    
  } catch (error) {
    console.error('❌ Failed to display trail guide:', error);
    toast.error('Failed to display trail guide: ' + error.message);
  }
}

// NEW: Download trail guide as HTML file
downloadTrailGuide(htmlContent, routeName) {
  try {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${routeName.replace(/[^a-z0-9]/gi, '_')}_trail_guide.html`;
    a.style.display = 'none';
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    setTimeout(() => URL.revokeObjectURL(url), 100);
    
    console.log('✅ Trail guide downloaded');
    
  } catch (error) {
    console.error('❌ Failed to download trail guide:', error);
    toast.error('❌ Failed to download trail guide: ' + error.message);
  }
}

  // UPDATED: Check authentication status for landing page
  async checkLandingAuth() {
    try {
      const { auth } = await import('../firebase-setup.js');
      return {
        isSignedIn: !!auth.currentUser,
        user: auth.currentUser,
        email: auth.currentUser?.email
      };
    } catch (error) {
      console.error('Auth check failed:', error);
      return { isSignedIn: false, user: null, email: null };
    }
  }

  // Update landing auth status
  async updateLandingAuthStatus() {
    const authStatus = await this.checkLandingAuth();
    
    const userInfo = document.getElementById('userInfo');
    const authPrompt = document.getElementById('authPrompt');
    const userEmail = document.getElementById('userEmail');
    
    if (authStatus.isSignedIn) {
      userInfo?.classList.remove('hidden');
      authPrompt?.classList.add('hidden');
      if (userEmail) userEmail.textContent = authStatus.email;
      
      // Initialize userService for gamification
      if (!userService.isInitialized) {
        try {
          await userService.initializeUser(authStatus.user);
          console.log('🏅 UserService initialized for gamification');
        } catch (error) {
          console.warn('⚠️ UserService initialization failed:', error);
        }
      }
    } else {
      userInfo?.classList.add('hidden');
      authPrompt?.classList.remove('hidden');
      userService.reset();
    }
  }

  // Listen for auth state changes
  async setupAuthListener() {
    try {
      const { onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js");
      const { auth } = await import('../firebase-setup.js');
      
      onAuthStateChanged(auth, async (user) => {
        await this.updateLandingAuthStatus();
      });
    } catch (error) {
      console.warn('⚠️ Failed to setup auth listener:', error);
    }
  }

  async loadMyTrailGuides() {
    try {
      console.log('🌐 Loading trail guides from landing page...');
      
      // Check if user is signed in
      const authStatus = await this.checkLandingAuth();
      if (!authStatus.isSignedIn) {
        toast.error('Please sign in first to view your trail guides');
        return;
      }

      // Import Firestore functions
      const { collection, query, where, orderBy, getDocs } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
      const { db, auth } = await import('../firebase-setup.js');
      
      // Query user's trail guides
      const guidesQuery = query(
        collection(db, 'trail_guides'),
        where('userId', '==', auth.currentUser.uid),
        orderBy('generatedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(guidesQuery);
      const guides = [];
      
      querySnapshot.forEach(doc => {
        guides.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log(`Found ${guides.length} trail guides`);
      
      if (guides.length === 0) {
        toast.error('No trail guides found.\n\nTo create trail guides:\n• Record a route in the tracker\n• Save it to cloud\n• Trail guide will be auto-generated');
        return;
      }
      
      await this.displayLandingGuides(guides);
      
    } catch (error) {
      console.error('Failed to load trail guides:', error);
      toast.error('Failed to load trail guides: ' + error.message);
    }
  }

  // Display landing guides
  async displayLandingGuides(guides) {
    const choices = guides.map((guide, index) => {
      const date = new Date(guide.generatedAt).toLocaleDateString();
      const visibility = guide.isPublic ? '🌍' : '🔒';
      const distance = guide.metadata ? (guide.metadata.totalDistance || 0).toFixed(1) : '0';
      
      return {
        label: `${visibility} ${guide.routeName} (${date}, ${distance} km)`,
        value: index
      };
    });
    
    choices.push({ label: '❌ Cancel', value: 'cancel' });
    
    const choice = await modal.choice('Select a guide to view:', '🌐 Your Trail Guides', choices);
    
    if (choice !== null && choice !== 'cancel') {
      await this.viewTrailGuide(guides[choice].id);
    }
  }
}



// FIXED: Landing page authentication integration
// Add this to the bottom of your landing.js file or create a separate auth-landing.js

class LandingAuthController {
  constructor() {
    this.authModal = null;
    this.currentUser = null;
  }

  async initialize() {
    console.log('🔐 Initializing landing page authentication...');
    
    // Set up auth state listener first
    await this.setupAuthStateListener();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Update UI based on current auth state
    await this.updateAuthStatus();
    
    console.log('✅ Landing page authentication initialized');
  }

  setupEventListeners() {
    // FIXED: Sign in button event listener
    const showAuthBtn = document.getElementById('showAuthBtn');
    if (showAuthBtn) {
      console.log('🔧 Setting up sign-in button listener...');
      
      // Remove any existing listeners
      const newBtn = showAuthBtn.cloneNode(true);
      showAuthBtn.parentNode.replaceChild(newBtn, showAuthBtn);
      
      // Add our listener
      newBtn.addEventListener('click', (e) => {
        console.log('🔑 Sign in button clicked');
        e.preventDefault();
        e.stopPropagation();
        this.showAuthModal();
      });
      
      console.log('✅ Sign-in button listener attached');
    } else {
      console.error('❌ Sign-in button not found');
    }

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
      });
    }

    // Modal close handlers
    this.setupModalEventListeners();
  }

setupModalEventListeners() {
  // Handle login form
  const loginForm = document.getElementById('loginFormEl');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => this.handleLogin(e));
  }
  
  // Handle signup form
  const signupForm = document.getElementById('signupFormEl');
  if (signupForm) {
    signupForm.addEventListener('submit', (e) => this.handleSignup(e));
  }
  
  // Close modal when clicking background
  const modal = document.getElementById('authModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target.id === 'authModal') {
        this.closeAuthModal();
      }
    });
  }
}

  async setupAuthStateListener() {
    try {
      // Import Firebase auth
      const { onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js");
      const { auth } = await import('../firebase-setup.js');
      
      onAuthStateChanged(auth, async (user) => {
        this.currentUser = user;
        this.updateAuthStatus();
        
        if (user) {
          console.log('✅ User signed in:', user.email);
          
          // Initialize userService for gamification
          try {
            await userService.initializeUser(user);
            console.log('🏅 UserService initialized for gamification');
          } catch (error) {
            console.warn('⚠️ UserService initialization failed:', error);
          }
        } else {
          console.log('👋 User signed out');
          userService.reset();
        }
      });
      
    } catch (error) {
      console.error('❌ Failed to setup auth listener:', error);
    }
  }

showAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) {
    modal.classList.remove('hidden');
    this.showLoginForm();
  }
}

showLoginForm() {
  const loginForm = document.getElementById('loginFormContent');
  const signupForm = document.getElementById('signupFormContent');
  const title = document.getElementById('authTitle');
  
  if (loginForm) loginForm.style.display = 'block';
  if (signupForm) signupForm.style.display = 'none';
  if (title) title.textContent = 'Welcome Back!';
}

showSignupForm() {
  const loginForm = document.getElementById('loginFormContent');
  const signupForm = document.getElementById('signupFormContent');
  const title = document.getElementById('authTitle');
  
  if (signupForm) signupForm.style.display = 'block';
  if (loginForm) loginForm.style.display = 'none';
  if (title) title.textContent = 'Join Access Nature';
}

closeAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) {
    modal.classList.add('hidden');
    this.clearAuthForms();
  }
}

  switchToLogin() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const title = document.getElementById('authModalTitle');

    if (loginForm) loginForm.classList.add('active');
    if (signupForm) signupForm.classList.remove('active');
    if (title) title.textContent = 'Welcome Back!';
  }

  switchToSignup() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const title = document.getElementById('authModalTitle');

    if (signupForm) signupForm.classList.add('active');
    if (loginForm) loginForm.classList.remove('active');
    if (title) title.textContent = 'Join Access Nature';
  }

async handleLogin(event) {
  event.preventDefault();
  
  const loginBtn = document.getElementById('loginSubmitBtn');
  const emailInput = document.getElementById('loginEmailInput');
  const passwordInput = document.getElementById('loginPasswordInput');
  
  if (!emailInput?.value || !passwordInput?.value) {
    this.showAuthError('Please fill in all fields');
    return;
  }

  try {
    this.setButtonLoading(loginBtn, true);
    
    const { signInWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js");
    const { auth } = await import('../firebase-setup.js');
    
    const userCredential = await signInWithEmailAndPassword(
      auth, 
      emailInput.value, 
      passwordInput.value
    );
    
    console.log('✅ Login successful:', userCredential.user.email);
    this.closeAuthModal();
    this.showSuccessMessage('Welcome back! 🎉');
    
  } catch (error) {
    console.error('❌ Login failed:', error);
    this.showAuthError(this.getFriendlyErrorMessage(error.code));
  } finally {
    this.setButtonLoading(loginBtn, false);
  }
}

async handleSignup(event) {
  event.preventDefault();
  
  const signupBtn = document.getElementById('signupSubmitBtn');
  const nameInput = document.getElementById('signupNameInput');
  const emailInput = document.getElementById('signupEmailInput');
  const passwordInput = document.getElementById('signupPasswordInput');
  
  if (!nameInput?.value || !emailInput?.value || !passwordInput?.value) {
    this.showAuthError('Please fill in all fields');
    return;
  }

  if (passwordInput.value.length < 6) {
    this.showAuthError('Password must be at least 6 characters');
    return;
  }

  try {
    this.setButtonLoading(signupBtn, true);
    
    const { createUserWithEmailAndPassword } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js");
    const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
    const { auth, db } = await import('../firebase-setup.js');
    
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      emailInput.value, 
      passwordInput.value
    );
    
    const user = userCredential.user;
    
    // Save user profile to Firestore
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email,
      name: nameInput.value,
      createdAt: new Date().toISOString(),
      routesCount: 0,
      totalDistance: 0
    });
    
    console.log('✅ Signup successful:', user.email);
    this.closeAuthModal();
    this.showSuccessMessage('Account created successfully! Welcome to Access Nature! 🌲');
    
  } catch (error) {
    console.error('❌ Signup failed:', error);
    this.showAuthError(this.getFriendlyErrorMessage(error.code));
  } finally {
    this.setButtonLoading(signupBtn, false);
  }
}

async handleGoogleAuth() {
  try {
    const { GoogleAuthProvider, signInWithPopup } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js");
    const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js");
    const { auth, db } = await import('../firebase-setup.js');
    
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    // Check if this is a new user and save profile
    if (result._tokenResponse?.isNewUser) {
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        name: user.displayName || 'Google User',
        createdAt: new Date().toISOString(),
        routesCount: 0,
        totalDistance: 0,
        provider: 'google'
      });
    }
    
    console.log('✅ Google sign-in successful:', user.email);
    this.closeAuthModal();
    this.showSuccessMessage('Successfully connected with Google! 🎉');
    
  } catch (error) {
    console.error('❌ Google sign-in failed:', error);
    
    if (error.code === 'auth/popup-closed-by-user') {
      this.showAuthError('Sign-in was cancelled');
    } else {
      this.showAuthError('Google sign-in failed. Please try again.');
    }
  }
}


async updateAuthStatus() {
  const userInfo = document.getElementById('userInfo');
  const authPrompt = document.getElementById('authPrompt');
  const userEmail = document.getElementById('userEmail');

  if (this.currentUser) {
    // User is signed in
    if (userInfo) userInfo.classList.remove('hidden');
    if (authPrompt) authPrompt.classList.add('hidden');
    if (userEmail) userEmail.textContent = this.currentUser.email;
  } else {
    // User is signed out
    if (userInfo) userInfo.classList.add('hidden');
    if (authPrompt) authPrompt.classList.remove('hidden');
  }
}


  showAuthError(message) {
    this.clearAuthError();

    const errorDiv = document.createElement('div');
    errorDiv.className = 'auth-error';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
      background: #ffebee;
      color: #c62828;
      padding: 12px 20px;
      border-radius: 8px;
      margin: 15px 0;
      font-size: 14px;
      border: 1px solid #ffcdd2;
      animation: slideIn 0.3s ease;
    `;

    const activeForm = document.querySelector('.auth-form.active');
    if (activeForm) {
      activeForm.insertBefore(errorDiv, activeForm.firstChild);
    }

    setTimeout(() => this.clearAuthError(), 5000);
  }

  clearAuthError() {
    const existingError = document.querySelector('.auth-error');
    if (existingError) {
      existingError.remove();
    }
  }

  clearAuthForms() {
    const inputs = document.querySelectorAll('#authModal input');
    inputs.forEach(input => input.value = '');
    this.clearAuthError();
  }

  showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.textContent = message;
    successDiv.style.cssText = `
      position: fixed;
      top: 60px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
      color: white;
      padding: 12px 24px;
      border-radius: 25px;
      z-index: 9999;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 20px rgba(76, 175, 80, 0.4);
      animation: slideDown 0.3s ease;
    `;

    document.body.appendChild(successDiv);
    setTimeout(() => successDiv.remove(), 4000);
  }

  getFriendlyErrorMessage(errorCode) {
    const errorMessages = {
      'auth/user-not-found': 'No account found with this email address',
      'auth/wrong-password': 'Incorrect password',
      'auth/email-already-in-use': 'An account with this email already exists',
      'auth/weak-password': 'Password should be at least 6 characters',
      'auth/invalid-email': 'Please enter a valid email address',
      'auth/too-many-requests': 'Too many failed attempts. Please try again later',
      'auth/network-request-failed': 'Network error. Please check your connection'
    };

    return errorMessages[errorCode] || 'An unexpected error occurred. Please try again.';
  }
}

async function initAccessReport() {
  const mapContainer = document.getElementById('accessReportMap');
  if (!mapContainer) return;

  const accessReportMap = L.map('accessReportMap').setView([-33.9249, 18.4241], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(accessReportMap);

  await initializeAccessReport({
    map: accessReportMap,
    mapContainer: mapContainer,
    timelineContainer: document.getElementById('accessReportTimeline'),
    enableTimeline: true,
    enableFilters: true,
    autoLoadReports: true
  });
}

// Initialize landing page when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('📄 DOM Content Loaded - starting landing page init');
  try {
    // Initialize landing page controller
    const landingController = new LandingPageController();
    console.log('📄 LandingPageController created');
    await landingController.initialize();
    console.log('📄 LandingPageController.initialize() completed');
    landingController.setupGlobalFunctions();
    
    // Make controller available globally
    window.LandingPageController = landingController;
    
    // Make utilities available for debugging
    window.offlineIndicator = offlineIndicator;
    window.loadingStates = loadingStates;
    window.gamificationUI = gamificationUI;
    window.accessibilityRating = accessibilityRating;
    window.trailSearch = trailSearch;
    window.userService = userService;
    window.showError = showError;
    window.getErrorMessage = getErrorMessage;
    
    // Setup badge notification popups
    gamificationUI.setupBadgeNotifications();
    
    // Initialize access report if available
    await initAccessReport();
  } catch (error) {
    console.error('Failed to initialize landing page:', error);
  }
});

// Export for use in other modules
export { LandingAuthController, LandingPageController };