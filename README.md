# Access Nature - Outdoor Accessibility Tracker

A comprehensive web application for tracking and documenting outdoor route accessibility.

## 🌟 Features

- **GPS Tracking**: Real-time location tracking with intelligent filtering
- **Route Documentation**: Photo capture and text notes during tracking
- **Accessibility Forms**: Comprehensive accessibility surveys
- **Multi-format Export**: JSON, GPX, and PDF exports
- **Offline Support**: Local storage with auto-backup
- **Mobile Optimized**: Touch-friendly responsive design

## 📁 Project Structure

project/
├── index.html                 # Main HTML file
├── firebase-setup.js          # Firebase configuration
├── README.md                  # This file
└── src/
├── main.js               # Application entry point
├── core/                 # Core functionality
│   ├── storage.js        # State management
│   ├── map.js           # Map integration
│   ├── tracking.js       # GPS tracking
│   └── timer.js         # Timer functionality
├── features/             # Feature modules
│   ├── accessibility.js  # Accessibility forms
│   ├── media.js         # Media capture
│   ├── export.js        # Export functionality
│   └── firebase.js      # Cloud integration (optional)
├── ui/                   # UI controllers
│   ├── navigation.js    # Panel management
│   └── compass.js       # Compass functionality
├── utils/                # Utilities
│   ├── geolocation.js   # GPS utilities
│   ├── calculations.js  # Math functions
│   └── helpers.js       # Common helpers
└── css/                  # Stylesheets
├── base.css         # Base styles
├── layout.css       # Layout
├── components.css   # UI components
├── accessibility.css # Form styles
└── themes.css       # Themes & responsive

## 🚀 Quick Start

1. **Download all files** and organize them according to the folder structure above
2. **Serve over HTTP** (required for GPS functionality):
   - Python: `python -m http.server 8000`
   - Node.js: `npx serve .`
   - PHP: `php -S localhost:8000`
3. **Open in browser**: Navigate to `http://localhost:8000`
4. **Allow location permissions** when prompted
5. **Start tracking** and test all features!

## 🎯 Usage

1. **Start Tracking**: Click the play button (▶) to begin GPS tracking
2. **Capture Media**: Take photos and add notes during your route
3. **Fill Accessibility Form**: Document accessibility features (optional)
4. **Export Data**: Save routes in multiple formats
5. **View Routes**: Access saved routes and statistics

## 🛠️ Browser Requirements

- Modern browser with GPS support
- HTTPS required for production deployment
- Recommended: Chrome 90+, Safari 14+, Firefox 88+

## 📱 Mobile Support

Optimized for mobile devices with:
- Touch-friendly interface
- Responsive design
- Device orientation support
- Camera integration
- Offline functionality

## 🔒 Privacy & Data

- All data stored locally by default
- Optional cloud backup with Firebase
- No tracking or analytics
- User controls all data export/deletion

## 📄 License

MIT License - feel free to use and modify for your projects.