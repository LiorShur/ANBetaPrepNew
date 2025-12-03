# Access Nature - Comprehensive Handoff Document

**Document Version:** 1.0  
**Date:** December 1, 2025  
**Purpose:** Complete reference for transitioning from bug-fix phase to enhancement phase

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Current Working State](#2-current-working-state)
3. [Completed Fixes Summary](#3-completed-fixes-summary)
4. [File Structure & Locations](#4-file-structure--locations)
5. [Technical Architecture](#5-technical-architecture)
6. [Monetization Foundation Specifications](#6-monetization-foundation-specifications)
7. [Phase 1: Pre-Beta Implementation Guide](#7-phase-1-pre-beta-implementation-guide)
8. [Phase 2: Beta Features Implementation Guide](#8-phase-2-beta-features-implementation-guide)
9. [Phase 3: Post-Beta Roadmap](#9-phase-3-post-beta-roadmap)
10. [Testing Checklist](#10-testing-checklist)
11. [Known Considerations](#11-known-considerations)
12. [Quick Reference](#12-quick-reference)

---

## 1. Project Overview

### Mission
Access Nature is a comprehensive web application focused on outdoor accessibility and trail documentation. The primary mission is to make outdoor spaces more accessible by enabling users to document trail conditions, barriers, and accessibility features for people with various mobility needs.

### Unique Value Proposition
- **Accessibility-first trail documentation** — 16-category survey system
- **Urban barrier reporting** — AccessReport system for municipal integration
- **Community-driven** — Shared trail guides and statistics
- **Multi-format exports** — JSON, GPX, PDF, HTML

### Target Users
- People with mobility challenges
- Outdoor enthusiasts
- Accessibility advocates
- Municipal authorities
- Healthcare providers (future)

### Technology Stack
| Component | Technology |
|-----------|------------|
| Frontend | Vanilla JavaScript (ES6 modules) |
| Database | Firebase Firestore |
| Authentication | Firebase Auth |
| Mapping | Leaflet.js |
| Offline Storage | IndexedDB |
| Hosting | Firebase Hosting |
| Design | Mobile-first, WCAG 2.1 AA+ compliant |

---

## 2. Current Working State

### ✅ Confirmed Working Features

| Feature | Status | Notes |
|---------|--------|-------|
| GPS Tracking | ✅ Working | Intelligent filtering, accurate coordinates |
| Route Saving | ✅ Working | Local (IndexedDB) and cloud (Firebase) |
| Photo Capture | ✅ Working | Geolocation tagged, base64 storage |
| Accessibility Survey | ✅ Working | 16 categories, integrated into tracking |
| Multi-format Export | ✅ Working | JSON, GPX, PDF, HTML |
| Firebase Auth | ✅ Working | Google sign-in, session persistence |
| Cloud Sync | ✅ Working | Trail guides upload/download |
| Landing Page | ✅ Working | Community stats, featured trails |
| AccessReport | ✅ Working | Urban barrier reporting system |
| Modal System | ✅ Working | Async/await, proper value handling |
| Toast Notifications | ✅ Working | Non-blocking, accessible |

### Recent Session Fixes Applied
All critical bugs from the debugging session have been resolved. See Section 3 for details.

---

## 3. Completed Fixes Summary

### 3.1 Modal System Fixes

**File:** `/src/utils/modal.js`

**Issue:** First item in modal.choice() lists returned label instead of value (index 0 bug)

**Root Cause:** 
```javascript
// BEFORE (buggy)
action: c.value || c.label  // 0 is falsy, falls back to label

// AFTER (fixed)
action: c.value !== undefined && c.value !== null ? c.value : c.label
```

**Impact:** All list selections now work correctly, including first item.

---

### 3.2 Async/Await Fixes

**Files Affected:**
- `/src/features/auth.js`
- `/src/features/tracking.js`
- `/src/features/export.js`
- `/landing.js`

**Issue:** Missing `await` keywords when calling async modal/toast functions caused race conditions and Firebase timing errors.

**Key Fixes:**
```javascript
// tracking.js - stop() method made async
async stop() {
  const confirmStop = await modal.confirm('Stop tracking?', 'Your route will be saved.');
  if (!confirmStop) return false;
  // ... rest of method
}

// auth.js - All modal calls now awaited
const choice = await modal.choice('Select Route', routeOptions);
const selectedIndex = typeof choice === 'string' ? parseInt(choice, 10) : choice;
```

---

### 3.3 Firebase Target ID Conflict Resolution

**Files:** `/src/features/auth.js`, `/landing.js`

**Issue:** `FirebaseError: Target ID already exists` when landing page loaded

**Root Causes:**
1. auth.js auto-initialized on ALL pages including landing
2. Warmup query in auth.js conflicted with landing.js queries
3. Simultaneous identical queries to same collection

**Fixes Applied:**

1. **Removed warmup query from auth.js:**
```javascript
// Removed the test query that caused conflicts
// Kept enableIndexedDbPersistence() and enableNetwork()
```

2. **Conditional auth.js initialization:**
```javascript
// Only auto-initialize on tracker.html
if (window.location.pathname.includes('tracker')) {
  authController.initialize();
}
```

3. **Query caching in landing.js:**
```javascript
// Cache results to prevent duplicate queries
this.publicGuidesCache = null;

async loadCommunityStats() {
  // ... fetch and cache
  this.publicGuidesCache = guides;
}

async loadFeaturedTrails() {
  // Use cached data instead of duplicate query
  const guides = this.publicGuidesCache || await this.fetchGuides();
}
```

4. **Retry mechanism with exponential backoff:**
```javascript
const MAX_RETRIES = 3;
// Retries on "Target ID" errors with increasing delays
```

5. **getDocsFromServer fallback:**
```javascript
try {
  guidesSnapshot = await getDocsFromServer(publicGuidesQuery);
} catch (serverError) {
  guidesSnapshot = await getDocs(publicGuidesQuery);
}
```

---

### 3.4 Selection Type Handling

**File:** `/src/features/auth.js`

**Issue:** Modal returns strings (from data attributes), but code expected numbers.

**Fix Pattern Applied Across All List Handlers:**
```javascript
const selectedIndex = typeof choice === 'string' ? parseInt(choice, 10) : choice;
if (typeof selectedIndex === 'number' && !isNaN(selectedIndex) && 
    selectedIndex >= 0 && selectedIndex < items.length) {
  // Process selection
}
```

**Methods Fixed:**
- `displayMyGuides()`
- `showRoutesList()`
- `showCloudRoutesList()`
- `loadRouteData()`
- `loadCloudRouteData()`

---

### 3.5 Console Warning Cleanup

**File:** `/src/features/auth.js`

**Issue:** `⚠️ loadMyGuidesBtn not found` appearing on landing page

**Fix:**
```javascript
if (window.location.pathname.includes('tracker')) {
  console.warn('⚠️ loadMyGuidesBtn not found on tracker page');
}
// Retry timeouts only on tracker page
```

---

### 3.6 Landing Page Initialization

**File:** `/landing.js`

**Issue:** Duplicate DOMContentLoaded listeners causing double initialization

**Fix:** Consolidated into single listener:
```javascript
document.addEventListener('DOMContentLoaded', async () => {
  const landingController = new LandingPageController();
  await landingController.initialize();
  landingController.setupGlobalFunctions();
  window.LandingPageController = landingController;
  await initAccessReport();
});
```

---

## 4. File Structure & Locations

### Primary Application Files

```
access-nature/
├── index.html                 # Landing page HTML
├── tracker.html               # Main tracker page HTML
├── reports.html               # AccessReport page HTML (if separate)
│
├── landing.js                 # Landing page controller (~49KB)
│
├── src/
│   ├── main.js               # Main application entry (~21KB)
│   │
│   ├── features/
│   │   ├── accessibility.js  # 16-category survey system (~30KB)
│   │   ├── auth.js           # Firebase auth + cloud storage (~66KB)
│   │   ├── compass.js        # Compass functionality (~4.5KB)
│   │   ├── export.js         # Multi-format exports (~46KB)
│   │   ├── firebase.js       # Firebase configuration (~2.5KB)
│   │   ├── map.js            # Leaflet map management (~10KB)
│   │   ├── media.js          # Photo capture (~5.5KB)
│   │   ├── navigation.js     # App navigation (~7.5KB)
│   │   └── tracking.js       # GPS tracking core (~21KB)
│   │
│   ├── utils/
│   │   ├── modal.js          # Async modal system
│   │   └── toast.js          # Toast notifications
│   │
│   └── ui/                   # UI components (if exists)
│
├── css/
│   └── (stylesheets)
│
└── assets/
    └── (images, icons)
```

### Key File Responsibilities

| File | Primary Responsibility |
|------|----------------------|
| `landing.js` | Landing page, community stats, featured trails, public guide browsing |
| `auth.js` | Authentication, cloud storage, user guides management, route sync |
| `tracking.js` | GPS tracking, route recording, intelligent filtering |
| `accessibility.js` | 16-category accessibility survey, form handling |
| `export.js` | JSON, GPX, PDF, HTML export generation |
| `modal.js` | Async modal dialogs (alert, confirm, prompt, choice) |
| `toast.js` | Non-blocking toast notifications |
| `map.js` | Leaflet map initialization and management |

---

## 5. Technical Architecture

### 5.1 Module Dependencies

```
main.js
├── tracking.js
│   ├── map.js
│   ├── compass.js
│   └── media.js
├── accessibility.js
├── auth.js
│   └── firebase.js
├── export.js
├── navigation.js
└── utils/
    ├── modal.js
    └── toast.js

landing.js (separate entry point)
├── firebase.js (shared config)
├── modal.js
└── toast.js
```

### 5.2 Data Flow

```
User Action
    ↓
Controller (tracking.js, auth.js, etc.)
    ↓
Modal/Toast for user interaction (async/await)
    ↓
Firebase Firestore (cloud) or IndexedDB (local)
    ↓
UI Update
```

### 5.3 Firebase Collections

| Collection | Purpose | Key Fields |
|------------|---------|------------|
| `users` | User profiles | uid, email, displayName, createdAt |
| `trail_guides` | Shared trail guides | userId, guideName, routeData, accessibilityData, isPublic |
| `access_reports` | Urban barrier reports | userId, location, category, description, photos, status |

### 5.4 IndexedDB Stores

| Store | Purpose |
|-------|---------|
| `routes` | Locally saved routes |
| `photos` | Cached photos |
| `settings` | User preferences |

---

## 6. Monetization Foundation Specifications

### 6.1 User Schema Additions

Add these fields to user documents in Firebase:

```javascript
// User document structure (additions in bold comments)
{
  // Existing fields
  uid: "firebase-user-id",
  email: "user@example.com",
  displayName: "User Name",
  createdAt: Timestamp,
  
  // === NEW: Account Tier ===
  accountTier: "free",          // "free" | "plus" | "pro" | "institutional"
  
  // === NEW: Organization (for B2B) ===
  organizationId: null,         // Reference to organization document or null
  organizationRole: null,       // "member" | "admin" | "owner" | null
  
  // === NEW: Subscription Status ===
  subscription: {
    status: null,               // "active" | "cancelled" | "expired" | "trial" | null
    plan: null,                 // "plus_annual" | "pro_annual" | "institutional" | null
    startDate: null,            // Timestamp
    expiryDate: null,           // Timestamp
    paymentProvider: null,      // "stripe" | "apple" | "google" | null
    externalId: null            // External subscription ID
  },
  
  // === NEW: Usage Tracking ===
  usage: {
    savedRoutes: 0,             // Count of saved routes
    guidesCreated: 0,           // Count of trail guides created
    exportsThisMonth: 0,        // Export count (resets monthly)
    apiCallsThisMonth: 0,       // API calls (for future API access)
    lastResetDate: Timestamp    // When monthly counters were reset
  },
  
  // === NEW: Engagement Metrics ===
  engagement: {
    totalTrackedDistance: 0,    // Cumulative km/miles tracked
    totalTrackedTime: 0,        // Cumulative tracking time (seconds)
    surveysCompleted: 0,        // Accessibility surveys submitted
    reportsSubmitted: 0,        // Barrier reports submitted
    photosUploaded: 0,          // Photos contributed
    firstTrackDate: null,       // Date of first tracking session
    lastActiveDate: null        // Last activity timestamp
  },
  
  // === NEW: Gamification ===
  achievements: {
    badges: [],                 // Array of earned badge IDs
    level: 1,                   // User level
    points: 0,                  // Total points
    streakDays: 0,              // Current activity streak
    longestStreak: 0            // Best streak achieved
  },
  
  // === NEW: Preferences ===
  preferences: {
    mobilityProfile: null,      // "manual_wheelchair" | "power_wheelchair" | "cane_walker" | "stroller" | "vision_impaired" | null
    units: "metric",            // "metric" | "imperial"
    notifications: true,
    emailUpdates: false
  }
}
```

### 6.2 Feature Flags System

Create new file: `/src/config/featureFlags.js`

```javascript
/**
 * Feature Flags Configuration
 * Controls feature access based on account tier
 */

export const FEATURE_FLAGS = {
  free: {
    // Tracking
    gpsTracking: true,
    maxTrackingHours: 8,
    
    // Storage
    maxSavedRoutes: 5,
    maxCloudGuides: 3,
    maxPhotosPerRoute: 10,
    
    // Features
    accessibilitySurvey: true,
    barrierReporting: true,
    viewPublicGuides: true,
    basicSearch: true,
    
    // Exports
    exportFormats: ['json'],
    pdfExports: false,
    
    // Premium Features
    offlineMaps: false,
    advancedFilters: false,
    customRoutes: false,
    apiAccess: false,
    
    // Ads
    showAds: true
  },
  
  plus: {
    // Tracking
    gpsTracking: true,
    maxTrackingHours: -1,       // Unlimited
    
    // Storage
    maxSavedRoutes: 50,
    maxCloudGuides: 25,
    maxPhotosPerRoute: 50,
    
    // Features
    accessibilitySurvey: true,
    barrierReporting: true,
    viewPublicGuides: true,
    basicSearch: true,
    
    // Exports
    exportFormats: ['json', 'gpx', 'pdf', 'html'],
    pdfExports: true,
    
    // Premium Features
    offlineMaps: true,
    advancedFilters: true,
    customRoutes: false,
    apiAccess: false,
    
    // Ads
    showAds: false
  },
  
  pro: {
    // Tracking
    gpsTracking: true,
    maxTrackingHours: -1,
    
    // Storage
    maxSavedRoutes: -1,         // Unlimited
    maxCloudGuides: -1,
    maxPhotosPerRoute: -1,
    
    // Features
    accessibilitySurvey: true,
    barrierReporting: true,
    viewPublicGuides: true,
    basicSearch: true,
    
    // Exports
    exportFormats: ['json', 'gpx', 'pdf', 'html', 'csv', 'kml'],
    pdfExports: true,
    
    // Premium Features
    offlineMaps: true,
    advancedFilters: true,
    customRoutes: true,
    apiAccess: true,
    
    // Ads
    showAds: false
  },
  
  institutional: {
    // Inherits all Pro features plus:
    // (Spread pro and add institutional-specific)
    
    // Tracking
    gpsTracking: true,
    maxTrackingHours: -1,
    
    // Storage
    maxSavedRoutes: -1,
    maxCloudGuides: -1,
    maxPhotosPerRoute: -1,
    
    // Features
    accessibilitySurvey: true,
    barrierReporting: true,
    viewPublicGuides: true,
    basicSearch: true,
    
    // Exports
    exportFormats: ['json', 'gpx', 'pdf', 'html', 'csv', 'kml'],
    pdfExports: true,
    
    // Premium Features
    offlineMaps: true,
    advancedFilters: true,
    customRoutes: true,
    apiAccess: true,
    
    // Institutional-only
    multiUserManagement: true,
    analyticsDashboard: true,
    whitelabelReports: true,
    prioritySupport: true,
    bulkExport: true,
    
    // Ads
    showAds: false
  }
};

// Badge Definitions
export const BADGES = {
  // Explorer badges
  first_track: {
    id: 'first_track',
    name: 'First Steps',
    description: 'Complete your first tracking session',
    icon: '👣',
    category: 'explorer',
    points: 10
  },
  distance_10k: {
    id: 'distance_10k',
    name: 'Trail Walker',
    description: 'Track 10 kilometers total',
    icon: '🥾',
    category: 'explorer',
    points: 25
  },
  distance_50k: {
    id: 'distance_50k',
    name: 'Trail Runner',
    description: 'Track 50 kilometers total',
    icon: '🏃',
    category: 'explorer',
    points: 50
  },
  distance_100k: {
    id: 'distance_100k',
    name: 'Trail Blazer',
    description: 'Track 100 kilometers total',
    icon: '🔥',
    category: 'explorer',
    points: 100
  },
  
  // Accessibility Advocate badges
  first_survey: {
    id: 'first_survey',
    name: 'Accessibility Scout',
    description: 'Complete your first accessibility survey',
    icon: '📋',
    category: 'advocate',
    points: 15
  },
  surveys_10: {
    id: 'surveys_10',
    name: 'Accessibility Advocate',
    description: 'Complete 10 accessibility surveys',
    icon: '♿',
    category: 'advocate',
    points: 50
  },
  surveys_50: {
    id: 'surveys_50',
    name: 'Accessibility Champion',
    description: 'Complete 50 accessibility surveys',
    icon: '🏆',
    category: 'advocate',
    points: 150
  },
  
  // Community badges
  first_guide: {
    id: 'first_guide',
    name: 'Trail Guide',
    description: 'Share your first public trail guide',
    icon: '🗺️',
    category: 'community',
    points: 20
  },
  guides_5: {
    id: 'guides_5',
    name: 'Community Contributor',
    description: 'Share 5 public trail guides',
    icon: '🤝',
    category: 'community',
    points: 75
  },
  guides_25: {
    id: 'guides_25',
    name: 'Trail Master',
    description: 'Share 25 public trail guides',
    icon: '👑',
    category: 'community',
    points: 200
  },
  
  // Barrier Reporter badges
  first_report: {
    id: 'first_report',
    name: 'Barrier Spotter',
    description: 'Submit your first barrier report',
    icon: '🚧',
    category: 'reporter',
    points: 15
  },
  reports_10: {
    id: 'reports_10',
    name: 'Urban Scout',
    description: 'Submit 10 barrier reports',
    icon: '🔍',
    category: 'reporter',
    points: 50
  },
  reports_50: {
    id: 'reports_50',
    name: 'City Improver',
    description: 'Submit 50 barrier reports',
    icon: '🏙️',
    category: 'reporter',
    points: 150
  },
  
  // Streak badges
  streak_7: {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Use the app 7 days in a row',
    icon: '📅',
    category: 'streak',
    points: 30
  },
  streak_30: {
    id: 'streak_30',
    name: 'Monthly Explorer',
    description: 'Use the app 30 days in a row',
    icon: '🌟',
    category: 'streak',
    points: 100
  },
  
  // Special badges
  beta_tester: {
    id: 'beta_tester',
    name: 'Beta Pioneer',
    description: 'Joined during the beta testing phase',
    icon: '🧪',
    category: 'special',
    points: 50
  },
  early_adopter: {
    id: 'early_adopter',
    name: 'Early Adopter',
    description: 'One of the first 1000 users',
    icon: '🌱',
    category: 'special',
    points: 100
  }
};

// Level thresholds
export const LEVELS = [
  { level: 1, name: 'Newcomer', minPoints: 0 },
  { level: 2, name: 'Explorer', minPoints: 50 },
  { level: 3, name: 'Adventurer', minPoints: 150 },
  { level: 4, name: 'Trailblazer', minPoints: 300 },
  { level: 5, name: 'Pathfinder', minPoints: 500 },
  { level: 6, name: 'Trail Master', minPoints: 800 },
  { level: 7, name: 'Access Champion', minPoints: 1200 },
  { level: 8, name: 'Nature Guardian', minPoints: 1800 },
  { level: 9, name: 'Community Hero', minPoints: 2500 },
  { level: 10, name: 'Legend', minPoints: 5000 }
];

/**
 * Check if a feature is available for the given account tier
 * @param {string} feature - Feature key to check
 * @param {string} tier - Account tier (default: 'free')
 * @returns {boolean|number|array} - Feature value
 */
export function getFeatureValue(feature, tier = 'free') {
  const tierConfig = FEATURE_FLAGS[tier] || FEATURE_FLAGS.free;
  return tierConfig[feature];
}

/**
 * Check if user can access a feature
 * @param {string} feature - Feature key
 * @param {string} tier - Account tier
 * @returns {boolean}
 */
export function canAccess(feature, tier = 'free') {
  const value = getFeatureValue(feature, tier);
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (Array.isArray(value)) return value.length > 0;
  return !!value;
}

/**
 * Check if user is within usage limits
 * @param {string} limitType - Type of limit to check
 * @param {number} currentUsage - Current usage count
 * @param {string} tier - Account tier
 * @returns {boolean}
 */
export function isWithinLimit(limitType, currentUsage, tier = 'free') {
  const limit = getFeatureValue(limitType, tier);
  if (limit === -1) return true; // Unlimited
  return currentUsage < limit;
}

/**
 * Get user's level based on points
 * @param {number} points - User's total points
 * @returns {object} - Level object
 */
export function getLevel(points) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (points >= LEVELS[i].minPoints) {
      return LEVELS[i];
    }
  }
  return LEVELS[0];
}

/**
 * Get points needed for next level
 * @param {number} points - Current points
 * @returns {number|null} - Points needed, or null if max level
 */
export function getPointsToNextLevel(points) {
  const currentLevel = getLevel(points);
  const nextLevelIndex = LEVELS.findIndex(l => l.level === currentLevel.level + 1);
  if (nextLevelIndex === -1) return null;
  return LEVELS[nextLevelIndex].minPoints - points;
}
```

### 6.3 User Service Implementation

Create new file: `/src/services/userService.js`

```javascript
/**
 * User Service
 * Handles user data, engagement tracking, and achievements
 */

import { doc, getDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../features/firebase.js';
import { BADGES, getLevel, getPointsToNextLevel } from '../config/featureFlags.js';

class UserService {
  constructor() {
    this.currentUser = null;
    this.userData = null;
  }

  /**
   * Initialize user data on sign in
   * @param {object} firebaseUser - Firebase user object
   */
  async initializeUser(firebaseUser) {
    this.currentUser = firebaseUser;
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    
    if (userDoc.exists()) {
      this.userData = userDoc.data();
      // Ensure all new fields exist (migration)
      await this.migrateUserData();
    } else {
      // New user - create document with all fields
      await this.createNewUser(firebaseUser);
    }
    
    // Update last active
    await this.updateLastActive();
  }

  /**
   * Create new user document with all fields
   */
  async createNewUser(firebaseUser) {
    const now = new Date();
    const newUserData = {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName || 'Anonymous',
      createdAt: serverTimestamp(),
      
      // Account
      accountTier: 'free',
      organizationId: null,
      organizationRole: null,
      
      // Subscription
      subscription: {
        status: null,
        plan: null,
        startDate: null,
        expiryDate: null,
        paymentProvider: null,
        externalId: null
      },
      
      // Usage
      usage: {
        savedRoutes: 0,
        guidesCreated: 0,
        exportsThisMonth: 0,
        apiCallsThisMonth: 0,
        lastResetDate: serverTimestamp()
      },
      
      // Engagement
      engagement: {
        totalTrackedDistance: 0,
        totalTrackedTime: 0,
        surveysCompleted: 0,
        reportsSubmitted: 0,
        photosUploaded: 0,
        firstTrackDate: null,
        lastActiveDate: serverTimestamp()
      },
      
      // Achievements
      achievements: {
        badges: ['beta_tester'], // Give beta badge to early users
        level: 1,
        points: 50, // Starting points for beta testers
        streakDays: 0,
        longestStreak: 0
      },
      
      // Preferences
      preferences: {
        mobilityProfile: null,
        units: 'metric',
        notifications: true,
        emailUpdates: false
      }
    };
    
    await setDoc(doc(db, 'users', firebaseUser.uid), newUserData);
    this.userData = newUserData;
  }

  /**
   * Migrate existing user data to include new fields
   */
  async migrateUserData() {
    const updates = {};
    
    // Check and add missing fields
    if (!this.userData.accountTier) updates.accountTier = 'free';
    if (!this.userData.subscription) updates.subscription = { status: null, plan: null, startDate: null, expiryDate: null, paymentProvider: null, externalId: null };
    if (!this.userData.usage) updates.usage = { savedRoutes: 0, guidesCreated: 0, exportsThisMonth: 0, apiCallsThisMonth: 0, lastResetDate: serverTimestamp() };
    if (!this.userData.engagement) updates.engagement = { totalTrackedDistance: 0, totalTrackedTime: 0, surveysCompleted: 0, reportsSubmitted: 0, photosUploaded: 0, firstTrackDate: null, lastActiveDate: serverTimestamp() };
    if (!this.userData.achievements) updates.achievements = { badges: [], level: 1, points: 0, streakDays: 0, longestStreak: 0 };
    if (!this.userData.preferences) updates.preferences = { mobilityProfile: null, units: 'metric', notifications: true, emailUpdates: false };
    
    if (Object.keys(updates).length > 0) {
      await updateDoc(doc(db, 'users', this.currentUser.uid), updates);
      this.userData = { ...this.userData, ...updates };
    }
  }

  /**
   * Update last active timestamp and streak
   */
  async updateLastActive() {
    const now = new Date();
    const lastActive = this.userData.engagement?.lastActiveDate?.toDate?.() || null;
    
    let streakUpdate = {};
    if (lastActive) {
      const daysSinceActive = Math.floor((now - lastActive) / (1000 * 60 * 60 * 24));
      
      if (daysSinceActive === 1) {
        // Consecutive day - increment streak
        const newStreak = (this.userData.achievements?.streakDays || 0) + 1;
        streakUpdate = {
          'achievements.streakDays': newStreak,
          'achievements.longestStreak': Math.max(newStreak, this.userData.achievements?.longestStreak || 0)
        };
        
        // Check streak badges
        if (newStreak === 7) await this.awardBadge('streak_7');
        if (newStreak === 30) await this.awardBadge('streak_30');
      } else if (daysSinceActive > 1) {
        // Streak broken
        streakUpdate = { 'achievements.streakDays': 1 };
      }
      // Same day - no streak update needed
    } else {
      // First activity
      streakUpdate = { 'achievements.streakDays': 1 };
    }
    
    await updateDoc(doc(db, 'users', this.currentUser.uid), {
      'engagement.lastActiveDate': serverTimestamp(),
      ...streakUpdate
    });
  }

  /**
   * Track distance completed
   * @param {number} distance - Distance in meters
   */
  async trackDistance(distance) {
    const distanceKm = distance / 1000;
    const newTotal = (this.userData.engagement?.totalTrackedDistance || 0) + distanceKm;
    
    await updateDoc(doc(db, 'users', this.currentUser.uid), {
      'engagement.totalTrackedDistance': newTotal
    });
    
    // Check first track
    if (!this.userData.engagement?.firstTrackDate) {
      await updateDoc(doc(db, 'users', this.currentUser.uid), {
        'engagement.firstTrackDate': serverTimestamp()
      });
      await this.awardBadge('first_track');
    }
    
    // Check distance badges
    if (newTotal >= 10 && !this.hasBadge('distance_10k')) await this.awardBadge('distance_10k');
    if (newTotal >= 50 && !this.hasBadge('distance_50k')) await this.awardBadge('distance_50k');
    if (newTotal >= 100 && !this.hasBadge('distance_100k')) await this.awardBadge('distance_100k');
  }

  /**
   * Track survey completion
   */
  async trackSurveyCompleted() {
    const newCount = (this.userData.engagement?.surveysCompleted || 0) + 1;
    
    await updateDoc(doc(db, 'users', this.currentUser.uid), {
      'engagement.surveysCompleted': increment(1)
    });
    
    // Check survey badges
    if (newCount === 1) await this.awardBadge('first_survey');
    if (newCount === 10 && !this.hasBadge('surveys_10')) await this.awardBadge('surveys_10');
    if (newCount === 50 && !this.hasBadge('surveys_50')) await this.awardBadge('surveys_50');
  }

  /**
   * Track barrier report submission
   */
  async trackReportSubmitted() {
    const newCount = (this.userData.engagement?.reportsSubmitted || 0) + 1;
    
    await updateDoc(doc(db, 'users', this.currentUser.uid), {
      'engagement.reportsSubmitted': increment(1)
    });
    
    // Check report badges
    if (newCount === 1) await this.awardBadge('first_report');
    if (newCount === 10 && !this.hasBadge('reports_10')) await this.awardBadge('reports_10');
    if (newCount === 50 && !this.hasBadge('reports_50')) await this.awardBadge('reports_50');
  }

  /**
   * Track guide creation
   */
  async trackGuideCreated(isPublic = false) {
    await updateDoc(doc(db, 'users', this.currentUser.uid), {
      'usage.guidesCreated': increment(1)
    });
    
    if (isPublic) {
      const publicGuides = (this.userData.engagement?.publicGuidesCreated || 0) + 1;
      
      // Check guide badges
      if (publicGuides === 1) await this.awardBadge('first_guide');
      if (publicGuides === 5 && !this.hasBadge('guides_5')) await this.awardBadge('guides_5');
      if (publicGuides === 25 && !this.hasBadge('guides_25')) await this.awardBadge('guides_25');
    }
  }

  /**
   * Check if user has a badge
   * @param {string} badgeId - Badge ID
   * @returns {boolean}
   */
  hasBadge(badgeId) {
    return this.userData.achievements?.badges?.includes(badgeId) || false;
  }

  /**
   * Award a badge to the user
   * @param {string} badgeId - Badge ID
   * @returns {object|null} - Badge object if newly awarded, null if already had
   */
  async awardBadge(badgeId) {
    if (this.hasBadge(badgeId)) return null;
    
    const badge = BADGES[badgeId];
    if (!badge) return null;
    
    const newBadges = [...(this.userData.achievements?.badges || []), badgeId];
    const newPoints = (this.userData.achievements?.points || 0) + badge.points;
    const newLevel = getLevel(newPoints);
    
    await updateDoc(doc(db, 'users', this.currentUser.uid), {
      'achievements.badges': newBadges,
      'achievements.points': newPoints,
      'achievements.level': newLevel.level
    });
    
    // Update local cache
    this.userData.achievements.badges = newBadges;
    this.userData.achievements.points = newPoints;
    this.userData.achievements.level = newLevel.level;
    
    return badge;
  }

  /**
   * Get user's current tier
   * @returns {string}
   */
  getTier() {
    return this.userData?.accountTier || 'free';
  }

  /**
   * Get user's achievements summary
   * @returns {object}
   */
  getAchievementsSummary() {
    const achievements = this.userData?.achievements || {};
    const level = getLevel(achievements.points || 0);
    const pointsToNext = getPointsToNextLevel(achievements.points || 0);
    
    return {
      badges: (achievements.badges || []).map(id => BADGES[id]).filter(Boolean),
      badgeCount: achievements.badges?.length || 0,
      level: level,
      points: achievements.points || 0,
      pointsToNextLevel: pointsToNext,
      streakDays: achievements.streakDays || 0,
      longestStreak: achievements.longestStreak || 0
    };
  }
}

// Export singleton instance
export const userService = new UserService();
```

---

## 7. Phase 1: Pre-Beta Implementation Guide

### 7.1 Offline Indicator

**Purpose:** Show users when they're offline and what features are affected.

**Implementation Location:** Add to main.js or create `/src/ui/offlineIndicator.js`

```javascript
/**
 * Offline Indicator Component
 */
class OfflineIndicator {
  constructor() {
    this.isOnline = navigator.onLine;
    this.indicator = null;
    this.init();
  }

  init() {
    this.createIndicator();
    this.bindEvents();
    this.updateStatus();
  }

  createIndicator() {
    this.indicator = document.createElement('div');
    this.indicator.id = 'offline-indicator';
    this.indicator.className = 'offline-indicator hidden';
    this.indicator.setAttribute('role', 'status');
    this.indicator.setAttribute('aria-live', 'polite');
    this.indicator.innerHTML = `
      <span class="offline-icon">📡</span>
      <span class="offline-text">You're offline. Some features may be limited.</span>
    `;
    document.body.appendChild(this.indicator);
  }

  bindEvents() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.updateStatus();
      toast.success('Back online!');
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.updateStatus();
      toast.warning('You\'re offline. Changes will sync when reconnected.');
    });
  }

  updateStatus() {
    if (this.isOnline) {
      this.indicator.classList.add('hidden');
    } else {
      this.indicator.classList.remove('hidden');
    }
  }
}

// CSS to add
const offlineStyles = `
.offline-indicator {
  position: fixed;
  bottom: 70px; /* Above bottom nav */
  left: 50%;
  transform: translateX(-50%);
  background: #ff9800;
  color: #000;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  transition: opacity 0.3s, transform 0.3s;
}

.offline-indicator.hidden {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
  pointer-events: none;
}

.offline-icon {
  font-size: 16px;
}
`;
```

### 7.2 Improved Error Messages

**Create error message utility:** `/src/utils/errorMessages.js`

```javascript
/**
 * User-friendly error messages
 */
export const ERROR_MESSAGES = {
  // Firebase errors
  'permission-denied': {
    title: 'Access Denied',
    message: 'You don\'t have permission to perform this action. Please sign in and try again.',
    action: 'Sign In'
  },
  'unavailable': {
    title: 'Service Unavailable',
    message: 'Our servers are temporarily unavailable. Your data is saved locally and will sync automatically.',
    action: 'Retry'
  },
  'not-found': {
    title: 'Not Found',
    message: 'The requested item could not be found. It may have been deleted.',
    action: 'Go Back'
  },
  'already-exists': {
    title: 'Already Exists',
    message: 'An item with this name already exists. Please choose a different name.',
    action: 'Rename'
  },
  
  // GPS errors
  'gps-denied': {
    title: 'Location Access Denied',
    message: 'Access Nature needs location permission to track your route. Please enable location access in your device settings.',
    action: 'Open Settings'
  },
  'gps-unavailable': {
    title: 'Location Unavailable',
    message: 'Unable to determine your location. Make sure GPS is enabled and you have a clear view of the sky.',
    action: 'Retry'
  },
  'gps-timeout': {
    title: 'Location Timeout',
    message: 'Getting your location is taking longer than expected. Please wait or try again.',
    action: 'Retry'
  },
  
  // Network errors
  'network-error': {
    title: 'Connection Problem',
    message: 'Unable to connect to the internet. Check your connection and try again.',
    action: 'Retry'
  },
  'offline': {
    title: 'You\'re Offline',
    message: 'This feature requires an internet connection. Your changes will be saved and synced when you\'re back online.',
    action: 'OK'
  },
  
  // Generic
  'unknown': {
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
    action: 'Retry'
  }
};

/**
 * Get user-friendly error message
 * @param {Error|string} error - Error object or code
 * @returns {object} - {title, message, action}
 */
export function getErrorMessage(error) {
  let code = 'unknown';
  
  if (typeof error === 'string') {
    code = error;
  } else if (error?.code) {
    // Firebase error codes often include prefixes like 'permission-denied'
    code = error.code.replace('firestore/', '').replace('auth/', '');
  } else if (error?.message) {
    // Try to match common error patterns
    const msg = error.message.toLowerCase();
    if (msg.includes('permission')) code = 'permission-denied';
    else if (msg.includes('network')) code = 'network-error';
    else if (msg.includes('offline')) code = 'offline';
    else if (msg.includes('not found')) code = 'not-found';
  }
  
  return ERROR_MESSAGES[code] || ERROR_MESSAGES.unknown;
}

/**
 * Show error to user with appropriate UI
 * @param {Error|string} error - Error
 * @param {object} options - Display options
 */
export async function showError(error, options = {}) {
  const { title, message, action } = getErrorMessage(error);
  
  console.error('Error:', error);
  
  if (options.useModal) {
    await modal.alert(title, message);
  } else {
    toast.error(`${title}: ${message}`);
  }
  
  return { title, message, action };
}
```

### 7.3 Loading States

**Create loading component:** `/src/ui/loadingStates.js`

```javascript
/**
 * Loading States Component
 * Provides skeleton loaders and loading indicators
 */

export const LoadingStates = {
  /**
   * Show loading overlay on element
   * @param {HTMLElement} element - Element to show loading on
   * @param {string} message - Loading message
   */
  showLoading(element, message = 'Loading...') {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
      <div class="loading-spinner"></div>
      <p class="loading-message">${message}</p>
    `;
    element.style.position = 'relative';
    element.appendChild(overlay);
  },

  /**
   * Hide loading overlay
   * @param {HTMLElement} element - Element with loading
   */
  hideLoading(element) {
    const overlay = element.querySelector('.loading-overlay');
    if (overlay) overlay.remove();
  },

  /**
   * Create skeleton loader for list items
   * @param {number} count - Number of skeleton items
   * @returns {string} - HTML string
   */
  skeletonList(count = 3) {
    return Array(count).fill(`
      <div class="skeleton-item">
        <div class="skeleton-avatar"></div>
        <div class="skeleton-content">
          <div class="skeleton-line skeleton-title"></div>
          <div class="skeleton-line skeleton-subtitle"></div>
        </div>
      </div>
    `).join('');
  },

  /**
   * Create skeleton loader for cards
   * @param {number} count - Number of skeleton cards
   * @returns {string} - HTML string
   */
  skeletonCards(count = 2) {
    return Array(count).fill(`
      <div class="skeleton-card">
        <div class="skeleton-image"></div>
        <div class="skeleton-card-content">
          <div class="skeleton-line skeleton-title"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line short"></div>
        </div>
      </div>
    `).join('');
  },

  /**
   * Button loading state
   * @param {HTMLButtonElement} button - Button element
   * @param {boolean} loading - Loading state
   */
  setButtonLoading(button, loading) {
    if (loading) {
      button.dataset.originalText = button.textContent;
      button.disabled = true;
      button.innerHTML = '<span class="btn-spinner"></span> Loading...';
    } else {
      button.disabled = false;
      button.textContent = button.dataset.originalText || 'Submit';
    }
  }
};

// CSS for loading states
const loadingStyles = `
/* Loading Overlay */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 100;
  border-radius: inherit;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e0e0e0;
  border-top-color: #2e7d32;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-message {
  margin-top: 12px;
  color: #666;
  font-size: 14px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Skeleton Loaders */
.skeleton-item {
  display: flex;
  align-items: center;
  padding: 12px;
  gap: 12px;
}

.skeleton-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-content {
  flex: 1;
}

.skeleton-line {
  height: 12px;
  border-radius: 6px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  margin-bottom: 8px;
}

.skeleton-line.skeleton-title {
  width: 60%;
  height: 16px;
}

.skeleton-line.skeleton-subtitle {
  width: 40%;
}

.skeleton-line.short {
  width: 30%;
}

.skeleton-card {
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 16px;
}

.skeleton-image {
  width: 100%;
  height: 150px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-card-content {
  padding: 16px;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

/* Button Spinner */
.btn-spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  vertical-align: middle;
  margin-right: 8px;
}
`;
```

---

## 8. Phase 2: Beta Features Implementation Guide

### 8.1 Trail Search and Filters

**New Component:** `/src/features/trailSearch.js`

**Key Features:**
- Search by name, location, keywords
- Filter by accessibility rating
- Filter by distance/difficulty
- Filter by surface type
- Sort options (newest, rating, distance)

**UI Elements Needed:**
- Search input with autocomplete
- Filter panel (collapsible on mobile)
- Results list with cards
- Map integration for location-based search

### 8.2 Accessibility Rating System (3-Tier)

**Rating Definitions:**

| Rating | Icon | Label | Criteria |
|--------|------|-------|----------|
| 🟢 | ♿ | Fully Accessible | Paved/firm surface, <5% grade, no steps, accessible facilities |
| 🟡 | ⚠️ | Partially Accessible | Some barriers but navigable, assistance may be needed |
| 🔴 | ❌ | Not Accessible | Significant barriers, not recommended for mobility devices |

**Database Addition to Trail Guides:**
```javascript
{
  // ... existing fields
  accessibilityRating: {
    overall: 'fully' | 'partial' | 'not', // Calculated from survey
    surface: 'paved' | 'gravel' | 'dirt' | 'mixed',
    maxGrade: 5, // Percentage
    steps: false,
    facilities: {
      parking: true,
      restrooms: true,
      water: false
    },
    ratedBy: 'userId',
    ratedAt: Timestamp,
    communityVerified: false,
    verificationCount: 0
  }
}
```

### 8.3 Real-Time Conditions Reporting

**New Feature:** Allow users to report current trail conditions.

**Condition Types:**
- Weather impact (muddy, flooded, icy)
- Obstacles (fallen tree, construction)
- Safety concerns (wildlife, damage)
- Positive updates (freshly cleared, new signage)

**Database Collection:** `trail_conditions`
```javascript
{
  trailGuideId: 'ref',
  userId: 'ref',
  timestamp: Timestamp,
  expiresAt: Timestamp, // Auto-expire conditions after 7 days
  conditionType: 'weather' | 'obstacle' | 'safety' | 'positive',
  severity: 1-5,
  description: 'string',
  photoUrl: 'string' | null,
  location: { lat, lng }, // Specific point on trail
  verified: false,
  verificationCount: 0
}
```

### 8.4 Basic Gamification Implementation

**UI Components Needed:**
1. **Badge Display** - Grid of earned badges in profile
2. **Progress Indicators** - Show progress to next badge/level
3. **Achievement Popups** - Celebrate when badges earned
4. **Leaderboard** - Optional community rankings

**Integration Points:**
- After tracking session ends → check distance badges
- After survey submission → check survey badges
- After guide publish → check guide badges
- After report submission → check report badges
- On app open → check/update streak

---

## 9. Phase 3: Post-Beta Roadmap

### 9.1 Full PWA with Offline Maps

**Requirements:**
- Service Worker for caching
- IndexedDB for map tile storage
- Background sync for pending uploads
- Install prompt handling

**Map Tile Strategy:**
- Cache tiles for saved trails
- Allow download of specific regions
- Track storage usage

### 9.2 Voice Navigation

**Features:**
- Turn-by-turn audio directions
- Announce upcoming features
- Distance/time remaining
- Screen reader optimization

**Technologies:**
- Web Speech API
- Pre-recorded audio clips for reliability

### 9.3 Community Features

**Groups:**
- Create/join hiking groups
- Group challenges
- Shared trails/achievements

**Buddies:**
- Add friends
- Share live location
- Activity feed

### 9.4 Municipal Integration

**Features:**
- Export reports in Open311 format
- Direct submission to city portals
- Status tracking from municipalities
- Aggregated data dashboards

---

## 10. Testing Checklist

### Pre-Beta Testing (Before Enhancement)

```
Authentication
□ Google sign-in works
□ Session persists on refresh
□ Sign out clears data appropriately
□ Auth state updates across tabs

GPS Tracking
□ Location permission request works
□ Tracking starts and shows on map
□ Pause/resume works correctly
□ Stop saves route properly
□ Distance calculation is accurate
□ Battery usage is acceptable

Route Management
□ Save to local storage works
□ Save to cloud works
□ Load local routes displays correctly
□ Load cloud routes displays correctly
□ Delete routes works
□ First item in lists selects correctly

Accessibility Survey
□ Form displays all 16 categories
□ Selections save correctly
□ Survey integrates into trail guide
□ Form is accessible (keyboard, screen reader)

Exports
□ JSON export contains all data
□ GPX export works in other apps
□ PDF generates correctly
□ HTML generates correctly

Landing Page
□ Loads without errors
□ Community stats display
□ Featured trails load
□ Public guides browsable

AccessReport
□ Report form opens
□ Location capture works
□ Photo upload works
□ Submit saves to Firebase
```

### Post-Enhancement Testing

```
Monetization Foundation
□ User schema migrations work
□ Feature flags return correct values
□ Usage tracking increments correctly
□ Badge awards trigger properly

Phase 1 Features
□ Offline indicator shows when offline
□ Error messages are user-friendly
□ Loading states display during operations

Phase 2 Features
□ Trail search returns relevant results
□ Filters narrow results correctly
□ Accessibility ratings display properly
□ Conditions can be reported
□ Badges award and display correctly
```

---

## 11. Known Considerations

### Technical Debt

| Item | Priority | Notes |
|------|----------|-------|
| Large file sizes | Medium | auth.js (66KB) could be split |
| Duplicate code | Low | Some patterns repeated across files |
| Error handling | Medium | Could be more consistent |
| Test coverage | High | No automated tests exist |

### Browser Compatibility

| Feature | Chrome | Safari | Firefox | Edge |
|---------|--------|--------|---------|------|
| Geolocation | ✅ | ✅ | ✅ | ✅ |
| IndexedDB | ✅ | ✅ | ✅ | ✅ |
| Service Worker | ✅ | ✅* | ✅ | ✅ |
| Camera API | ✅ | ✅ | ✅ | ✅ |

*Safari has some PWA limitations

### Firebase Considerations

- **Firestore quotas:** Monitor reads/writes in free tier
- **Storage:** Currently using Firestore for photos (base64) - consider Firebase Storage for scale
- **Indexes:** May need composite indexes for complex queries
- **Security rules:** Review before public launch

### Accessibility Compliance

- ✅ ARIA labels on interactive elements
- ✅ Keyboard navigation
- ✅ Color contrast (WCAG AA)
- ⚠️ Screen reader testing needed
- ⚠️ Focus management in modals (verify)

---

## 12. Quick Reference

### Key File Locations

| Purpose | File Path |
|---------|-----------|
| Landing page logic | `/landing.js` |
| Main app entry | `/src/main.js` |
| GPS tracking | `/src/features/tracking.js` |
| Authentication | `/src/features/auth.js` |
| Accessibility survey | `/src/features/accessibility.js` |
| Exports | `/src/features/export.js` |
| Modal system | `/src/utils/modal.js` |
| Toast notifications | `/src/utils/toast.js` |

### Firebase Collections

| Collection | Purpose |
|------------|---------|
| `users` | User profiles and settings |
| `trail_guides` | Shared trail documentation |
| `access_reports` | Urban barrier reports |
| `trail_conditions` | Real-time trail conditions (Phase 2) |

### CSS Variables (if using)

```css
:root {
  --color-primary: #2e7d32;
  --color-primary-dark: #1b5e20;
  --color-accent: #4caf50;
  --color-background: #f5f5f5;
  --color-surface: #ffffff;
  --color-error: #d32f2f;
  --color-warning: #ff9800;
  --color-success: #4caf50;
  --border-radius: 12px;
  --shadow-sm: 0 2px 4px rgba(0,0,0,0.1);
  --shadow-md: 0 4px 8px rgba(0,0,0,0.15);
}
```

### Console Debugging

```javascript
// Check current user
console.log(firebase.auth().currentUser);

// Check tracking state
console.log(window.tracker?.isTracking);

// Check feature flags
console.log(getFeatureValue('offlineMaps', 'free'));

// Check user achievements
console.log(userService.getAchievementsSummary());
```

---

## Document End

**Next Steps:**
1. Upload complete project files to new chat
2. Implement monetization foundation (schema + feature flags)
3. Proceed with Phase 1 pre-beta enhancements
4. Move to Phase 2 beta features

**Good luck with Access Nature! 🌲♿🗺️**
