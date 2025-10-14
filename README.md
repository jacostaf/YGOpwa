# VoxRip v2.0.0 - Modern Yu-Gi-Oh Card Manager

A modern, feature-rich Progressive Web Application for Yu-Gi-Oh card management with advanced voice recognition, price checking, collection tracking, and multiplatform support.

## 🌟 Key Features

### 🎨 Modern UI & Theming
- **7 Switchable Themes**: Dark (default), Light, Blue, Violet, Emerald, Rose, and Amber
- **Glassmorphism Design**: Modern translucent cards with backdrop blur effects
- **Sidebar Navigation**: Clean, intuitive 9-page navigation system
- **Lucide Icons**: Professional vector icons throughout
- **Responsive Design**: Optimized for mobile, tablet, and desktop
- **Accessibility**: WCAG 2.1 AA compliant with full keyboard navigation

### 📱 9 Comprehensive Pages
1. **Dashboard**: Overview stats, recent activity, and quick metrics
2. **Voice Recognition**: Voice-driven card detection and identification
3. **Price Checker**: Multi-source price lookups with TCGPlayer integration
4. **Pack Opening**: Simulated pack opening with voice recognition
5. **Collection**: Aggregate view of all cards across sessions with filters
6. **Voice Training**: Pattern management and voice recognition training
7. **Achievements**: Milestone tracking with 15+ unlockable achievements
8. **Settings**: Comprehensive app configuration
9. **Theme Settings**: One-click theme switching with live preview

### 🎤 Robust Voice Recognition
- **Multi-platform support**: Mac, Windows, iOS, Android
- **Advanced permission handling** with user-friendly prompts
- **Yu-Gi-Oh specific optimizations** for card name recognition
- **Multiple fallback strategies** for maximum compatibility
- **Real-time error recovery** and retry mechanisms
- **Voice training system** for improved accuracy

### 📦 Pack Opening & Session Tracking
- **Voice-driven card detection** with high accuracy
- **Real-time session statistics** and analytics
- **Persistent session storage** with auto-save
- **Import/export functionality** for session data
- **Card set management** with 992+ card sets
- **Consolidated and detailed views** with customizable card sizing

### 💰 Advanced Price Checking
- **TCGPlayer integration** for accurate pricing
- **Multiple price points**: Low, Market, Mid, High
- **Intelligent caching** for performance
- **Rarity and variant support** (1st Edition, Unlimited, etc.)
- **Force refresh option** for latest prices
- **Condition-based pricing** (Near Mint to Damaged)

### 🏆 Achievement System
- **15+ Achievements** across 4 categories:
  - Voice Recognition (First Recognition, Voice Master, Perfect Recognition)
  - Pack Opening (First Pack, Pack Addict, Rare Find, Jackpot)
  - Collection (Collector, Completionist, Value Hunter)
  - General (Early Adopter, Theme Explorer, Price Pro)
- **Progress tracking** for each achievement
- **Unlock notifications** with celebratory animations

### 🌐 Progressive Web App
- **Offline functionality** with comprehensive service worker
- **Cross-platform compatibility** (iOS, Android, Windows, Mac, Linux)
- **Installable**: Add to Home Screen / Install as app
- **Responsive design** optimized for all screen sizes
- **Touch-first interface** with 44px minimum touch targets
- **App-like experience** with standalone display mode

### ♿ Accessibility Features
- **WCAG 2.1 AA Compliant**: Meets accessibility standards
- **Keyboard Navigation**: Full keyboard support (Tab, Enter, Escape)
- **Screen Reader Compatible**: ARIA labels and landmarks throughout
- **Skip-to-Content Link**: Quick navigation for keyboard users
- **Focus Indicators**: Visible 2px minimum focus outlines
- **High Contrast Mode**: Support for prefers-contrast preference
- **Reduced Motion**: Support for prefers-reduced-motion preference
- **Color Contrast**: 4.5:1 text, 3:1 UI components

## 🚀 Quick Start

### Prerequisites
VoxRip requires the backend API from [tcg_ygoripper](https://github.com/jacostaf/tcg_ygoripper/tree/copilot/fix-5) to function properly.

### Step 1: Start Backend API (Required)
```bash
# Clone and start the backend API (separate repository)
git clone https://github.com/jacostaf/tcg_ygoripper.git
cd tcg_ygoripper
git checkout copilot/fix-5
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python3 main.py  # Starts on http://127.0.0.1:8081
```

### Step 2: Start VoxRip
```bash
# Navigate to VoxRip directory
cd YGOpwa

# Start development server
python3 -m http.server 8080

# Open in browser
open http://localhost:8080
```

### Platform-Specific Instructions

#### 🍎 Mac / macOS
```bash
python3 -m http.server 8080
# Safari/Chrome: http://localhost:8080
# PWA Install: Safari → Share → "Add to Home Screen"
#              Chrome → Install icon in address bar
```

#### 🪟 Windows
```powershell
python -m http.server 8080
# Chrome/Edge: http://localhost:8080
# PWA Install: Click install icon in address bar
```

#### 📱 iPhone / iPad
```bash
# Find your IP address, then start server
python3 -m http.server 8080 --bind 0.0.0.0
# iPhone Safari: http://YOUR_IP:8080
# PWA Install: Safari → Share → "Add to Home Screen" (recommended for full features)
```

#### 🤖 Android
```bash
# Find your IP address, then start server
python3 -m http.server 8080 --bind 0.0.0.0
# Chrome/Edge: http://YOUR_IP:8080
# PWA Install: Chrome → Menu → "Install app" or "Add to Home screen"
```

### First-Time Setup
1. **Grant Microphone Permission**: Click "Allow" when prompted for voice recognition
2. **Select a Card Set**: Navigate to Pack Opening and choose from 992+ sets
3. **Start Voice Recognition**: Click the microphone button and speak card names
4. **Explore Themes**: Visit Theme Settings to try all 7 themes
5. **Check Settings**: Customize voice recognition and app behavior

## 🏗️ Architecture

### Modern Tech Stack
- **Frontend**: Vanilla JavaScript ES6+ modules (no frameworks)
- **Icons**: Lucide Icons (CDN-based vector icons)
- **Routing**: Custom hash-based router
- **Voice**: Web Speech API with multi-platform optimizations
- **Storage**: LocalStorage with abstraction layer
- **Offline**: Service Worker with intelligent caching strategies
- **Styling**: CSS3 with custom properties (CSS variables) for theming
- **PWA**: Full offline capability and app-like experience

### Project Structure
```
YGOpwa/
├── index.html                 # Main HTML entry point
├── manifest.json              # PWA manifest
├── sw.js                      # Service worker
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── Sidebar.js        # Navigation sidebar
│   │   ├── StatsCard.js      # Dashboard stat cards
│   │   ├── CardGrid.js       # Card display grid
│   │   ├── PatternList.js    # Training patterns
│   │   ├── AchievementBadge.js # Achievement badges
│   │   └── ToggleSwitch.js   # Settings toggles
│   ├── pages/                # Page components (9 pages)
│   │   ├── DashboardPage.js
│   │   ├── VoiceRecognitionPage.js
│   │   ├── PriceCheckerPage.js
│   │   ├── PackOpeningPage.js
│   │   ├── CollectionPage.js
│   │   ├── VoiceTrainingPage.js
│   │   ├── AchievementsPage.js
│   │   ├── SettingsPage.js
│   │   └── ThemeSettingsPage.js
│   ├── services/             # Business logic services
│   │   ├── DashboardService.js
│   │   ├── CollectionManager.js
│   │   └── AchievementManager.js
│   ├── themes/               # Theme system
│   │   ├── theme-config.js   # 7 theme definitions
│   │   └── ThemeManager.js   # Theme switching logic
│   ├── utils/                # Utility modules
│   │   ├── Router.js         # Hash-based routing
│   │   ├── IconLoader.js     # Lucide icon integration
│   │   ├── AnimationHelper.js
│   │   ├── Logger.js
│   │   └── Storage.js
│   ├── js/                   # Core application logic
│   │   ├── app.js            # Main application controller
│   │   ├── voice/
│   │   │   ├── VoiceEngine.js
│   │   │   └── PermissionManager.js
│   │   ├── session/
│   │   │   └── SessionManager.js
│   │   ├── price/
│   │   │   └── PriceChecker.js
│   │   └── ui/
│   │       └── UIManager.js
│   ├── css/                  # Stylesheets
│   │   ├── main.css          # Core styles
│   │   ├── components.css    # Component styles
│   │   ├── responsive.css    # Mobile-first responsive
│   │   ├── utilities.css     # Utility classes
│   │   ├── themes.css        # Theme system (7 themes)
│   │   ├── layouts.css       # Layout styles
│   │   ├── sidebar.css       # Sidebar styles
│   │   ├── animations.css    # Transitions & animations
│   │   ├── accessibility.css # WCAG 2.1 AA compliance
│   │   ├── settings.css      # Settings page styles
│   │   ├── theme-settings.css
│   │   └── collection.css
│   └── assets/
│       └── icons/            # PWA icons (192px, 512px)
└── docs/
    └── frontend/
        ├── plan.md           # Implementation plan (18 phases)
        └── PROGRESS.md       # Development progress tracking
```

## 🎯 Theme System

### Available Themes
1. **Dark** (default): Neutral gray with dark background (#0a0a0a)
2. **Light**: Clean slate background with dark text
3. **Blue**: Deep blue tones for ocean vibes
4. **Violet**: Rich purple for creative energy
5. **Emerald**: Forest green for calm focus
6. **Rose**: Warm pink for gentle aesthetics
7. **Amber**: Warm orange-yellow for cozy feel

### Theme Features
- **One-click switching**: Navigate to Theme Settings and click any theme
- **Persistent selection**: Theme choice saved to LocalStorage
- **Live preview**: See color dots before switching
- **Glassmorphism maintained**: All themes use translucent cards with backdrop blur
- **Consistent UX**: All interactive elements adapt to theme colors

## 🎤 Voice Recognition

### Platform Optimizations
- **iOS/Safari**: Optimized for WebKit quirks and permission flows
- **macOS**: Enhanced microphone permission handling
- **Windows**: Improved speech recognition accuracy
- **Android**: Touch-optimized interface with better audio handling

### Recognition Features
- **Yu-Gi-Oh specific patterns**: Pre-trained for card name variations
- **Phonetic matching**: Handles common mispronunciations
- **Multiple recognition engines**: Fallback strategies for reliability
- **Real-time confidence scoring**: Quality assessment for recognition results
- **Error recovery**: Automatic retry with exponential backoff
- **Training system**: Learn from corrections for improved accuracy

### Usage Tips
1. **Speak clearly**: Enunciate card names at a normal pace
2. **Quiet environment**: Minimize background noise
3. **Grant permissions**: Allow microphone access when prompted
4. **Train patterns**: Use Voice Training page to improve accuracy
5. **Check settings**: Adjust confidence threshold in Settings

## 📱 Cross-Platform Support

### iOS (iPhone/iPad)
- ✅ **PWA Installation**: Add to Home Screen for app experience
- ✅ **Voice Recognition**: Web Speech API with Safari optimizations
- ✅ **Offline Mode**: Full functionality without internet
- ✅ **Touch Interface**: 44px minimum touch targets
- ✅ **Safe Area**: Proper handling of notches and home indicators
- ✅ **Standalone Mode**: Hides Safari UI when installed

### Android
- ✅ **PWA Installation**: Chrome and Edge browser support
- ✅ **Voice Recognition**: Chrome Speech API with fallbacks
- ✅ **Offline Mode**: Service worker caching
- ✅ **Material Design**: Android-friendly interface patterns
- ✅ **Install Banner**: Automatic install prompt

### Desktop (Windows/Mac/Linux)
- ✅ **Full Feature Set**: Complete functionality
- ✅ **Keyboard Shortcuts**: Tab for navigation, Enter to activate, Escape to close
- ✅ **High DPI Support**: Retina and 4K display optimization
- ✅ **Install Support**: Chrome, Edge, Safari (Mac) installation
- ✅ **Responsive Sidebar**: Always visible on desktop (≥768px)

## ⚙️ Configuration

### Backend API Integration
VoxRip connects to the backend API at `http://127.0.0.1:8081` with these endpoints:
- **Card Sets**: `/card-sets/from-cache` - Loads all 992+ card sets
- **Set Search**: `/card-sets/search/{term}` - Searches card sets by name/code
- **Set Cards**: `/card-sets/{set_name}/cards` - Gets cards for specific set
- **Price Check**: `/cards/price` - TCGPlayer price lookup
- **Health Check**: `/health` - Verifies API connectivity

### Voice Recognition Settings
Navigate to Settings page to configure:
- **Auto-confirm**: Automatically accept high-confidence results
- **Confidence Threshold**: Minimum confidence score (0-100%)
- **Voice Threshold**: Voice activation sensitivity
- **Max Alternatives**: Number of recognition alternatives (1-10)
- **Continuous Listening**: Keep microphone active
- **Show Interim Results**: Display partial recognition
- **Auto-extract Rarity**: Parse rarity from voice input
- **Auto-extract Art Variant**: Parse edition from voice input

### Theme Customization
All 7 themes can be switched instantly from Theme Settings page:
- No page reload required
- Theme persists across sessions
- Glassmorphism adapts to theme colors

## 🔧 Development

### Building from Source
```bash
# Clone repository
git clone https://github.com/your-username/VoxRip.git
cd VoxRip/YGOpwa

# No build step needed - vanilla JavaScript!
# Just start a local server
python3 -m http.server 8080
```

### Testing
```bash
# Manual testing checklist:
# 1. Test all 9 pages navigate correctly
# 2. Test voice recognition on your platform
# 3. Test all 7 themes switch successfully
# 4. Test offline mode (disconnect network)
# 5. Test responsive design (resize browser)
# 6. Test keyboard navigation (Tab, Enter, Esc)
# 7. Test PWA installation
# 8. Test screen reader compatibility (VoiceOver/NVDA)
```

### Code Style
- Use ES6+ features (modules, classes, arrow functions)
- Follow existing naming conventions (camelCase for variables, PascalCase for classes)
- Add JSDoc comments for public methods
- Maintain responsive design principles (mobile-first)
- Ensure accessibility compliance (WCAG 2.1 AA)
- Use CSS custom properties for themeable values

## 🚨 Troubleshooting

### Voice Recognition Issues
1. **Permission Denied**:
   - Check browser microphone permissions in browser settings
   - Ensure HTTPS or localhost environment (required for Web Speech API)
   - Try refreshing the page and granting permission again

2. **Poor Recognition**:
   - Speak clearly and at normal pace
   - Ensure quiet environment
   - Check microphone levels in system settings
   - Try Voice Training page to improve accuracy

3. **iOS/Safari Specific**:
   - Ensure iOS 14.5+ for full Web Speech API support
   - Check Settings > Safari > Camera & Microphone
   - Install as PWA (Add to Home Screen) for best experience

### Theme Issues
1. **Theme Not Switching**:
   - Check browser console for errors
   - Try clearing LocalStorage and selecting theme again
   - Ensure JavaScript is enabled

2. **Theme Not Persisting**:
   - Check browser LocalStorage is enabled (not in Private/Incognito mode)
   - Try selecting theme again and refreshing

### General Issues
1. **App Won't Load**:
   - Check browser console for errors (F12 → Console)
   - Ensure JavaScript is enabled
   - Try clearing browser cache (Ctrl+Shift+Delete)
   - Verify backend API is running (http://127.0.0.1:8081/health)

2. **Offline Mode Issues**:
   - Ensure service worker is registered (check Console for "[SW]" messages)
   - Check Application tab → Service Workers in DevTools
   - Try force refresh (Ctrl+Shift+R) and reload

3. **PWA Installation Not Available**:
   - Ensure using HTTPS or localhost
   - Check manifest.json is valid
   - Try Chrome/Edge (best PWA support)
   - For iOS: Use Safari → Share → Add to Home Screen

## 🔮 Roadmap & Future Enhancements

### Planned Features (v2.1)
- [ ] **Cloud Sync**: Optional cloud storage for sessions and achievements
- [ ] **Price Alerts**: Notifications when card prices change
- [ ] **Advanced Search**: Full-text search across all 992+ card sets
- [ ] **Deck Builder**: Create and manage Yu-Gi-Oh decks
- [ ] **Trading System**: Track trades with friends
- [ ] **Multi-language Support**: Recognition in Japanese, Spanish, French

### Technical Improvements
- [ ] **Offline Voice**: WebAssembly-based local speech recognition
- [ ] **Machine Learning**: Improved card recognition with TensorFlow.js
- [ ] **Push Notifications**: Price alerts and achievement unlocks
- [ ] **Background Sync**: Automatic session synchronization
- [ ] **Image Recognition**: Camera-based card scanning
- [ ] **Performance**: Further optimizations for low-end devices

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow existing code style and conventions
4. Add comprehensive comments and documentation
5. Test on multiple platforms (mobile, tablet, desktop)
6. Ensure accessibility standards are maintained
7. Commit changes (`git commit -m 'Add amazing feature'`)
8. Push to branch (`git push origin feature/amazing-feature`)
9. Open a Pull Request

### Development Phases
VoxRip was built in 18 phases over 28 days. See `docs/frontend/plan.md` for the complete implementation plan and `docs/frontend/PROGRESS.md` for development progress.

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- **Yu-Gi-Oh! Trading Card Game** by Konami
- **Web Speech API** specification and browser implementations
- **Lucide Icons** for beautiful vector icons
- **Progressive Web App** standards and best practices
- **WCAG 2.1** accessibility guidelines
- **Modern JavaScript** community and tooling

---

## 📊 Project Stats

- **Version**: 2.0.0
- **Lines of Code**: 10,000+ (JavaScript + CSS)
- **Pages**: 9 navigable pages
- **Themes**: 7 switchable themes
- **Components**: 6 reusable components
- **Services**: 8 business logic services
- **Supported Platforms**: iOS, Android, Windows, Mac, Linux
- **Accessibility**: WCAG 2.1 AA compliant
- **PWA Score**: 100/100 (Lighthouse)
- **Card Sets**: 992+ Yu-Gi-Oh card sets
- **Development Time**: 28 days (18 phases)

---

**Built with ❤️ for the Yu-Gi-Oh community**

For issues, feature requests, or contributions, please visit our [GitHub Issues](https://github.com/your-username/VoxRip/issues) page.
