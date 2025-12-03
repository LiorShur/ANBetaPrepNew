# Access Nature - New Chat Quick Start

## For Claude in the Next Session

**Project:** Access Nature - Accessibility-focused trail documentation app  
**Phase:** Transitioning from bug-fix to enhancement phase  
**Status:** Core functionality working, ready for new features

---

## Immediate Tasks (In Order)

### 1. Monetization Foundation
- Add new fields to Firebase user schema (accountTier, usage, engagement, achievements)
- Create `/src/config/featureFlags.js` with tier configurations
- Create `/src/services/userService.js` for engagement tracking
- Integrate with existing auth.js

### 2. Phase 1: Pre-Beta Polish
- Offline indicator component
- Improved error message system
- Loading states (skeleton loaders, button states)

### 3. Phase 2: Beta Features
- Trail search and filters
- 3-tier accessibility rating system (🟢🟡🔴)
- Real-time conditions reporting
- Basic gamification (badges, levels, points)

---

## Key Technical Context

### Stack
- Vanilla JavaScript (ES6 modules)
- Firebase (Auth, Firestore)
- Leaflet for mapping
- IndexedDB for offline
- Mobile-first design

### Recently Fixed Issues (Don't Re-Break!)
1. **Modal index 0 bug** - Fixed with explicit undefined check
2. **Firebase Target ID conflicts** - Fixed with query caching and conditional init
3. **Async/await missing** - Added throughout modal/toast calls
4. **Selection type handling** - parseInt for string values from modals

### File Sizes (Large Files to Note)
- auth.js: 66KB - handles auth + cloud storage
- export.js: 46KB - all export formats
- landing.js: 49KB - landing page controller
- accessibility.js: 30KB - 16-category survey

---

## What to Request from User

Ask user to upload ZIP containing:
```
access-nature/
├── index.html
├── tracker.html
├── landing.js
├── src/
│   ├── main.js
│   ├── features/*.js
│   └── utils/*.js
├── css/
└── (any other files)
```

---

## Detailed Specifications

See full handoff document: `ACCESS-NATURE-HANDOFF.md`

Contains:
- Complete fix history
- Schema specifications with code
- Feature flags system code
- User service implementation
- Phase 1-3 implementation guides
- Testing checklists
- All technical details

---

## User's Goals

1. **Beta testing readiness** - Polish and robust functionality
2. **Future monetization** - Foundation without user-facing changes
3. **Community building** - Gamification and engagement
4. **Unique positioning** - Accessibility-first trail documentation

---

## Starting Prompt for New Chat

User can paste this:

> I'm ready to begin the Access Nature enhancement phase. I've uploaded my complete working project files.
> 
> Please review the files and the handoff document (ACCESS-NATURE-HANDOFF.md if available), then let's implement in this order:
> 
> 1. **Monetization Foundation** - Schema additions and feature flags
> 2. **Phase 1** - Offline indicator, error messages, loading states  
> 3. **Phase 2** - Search/filters, accessibility ratings, conditions, badges
> 
> Let's start with the schema changes and feature flags system.

---

**Good luck! 🌲♿🗺️**
