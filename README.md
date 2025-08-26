# YGO Ripper UI v2.1.0 - Cross-Platform Voice Recognition

A completely revamped, robust Progressive Web Application for Yu-Gi-Oh card price checking and pack ripping with advanced voice recognition capabilities.

## 🌟 Key Features

### 🎤 Robust Voice Recognition
- **Multi-platform support**: Mac, Windows, iOS, Android
- **Advanced permission handling** with user-friendly prompts
- **Yu-Gi-Oh specific optimizations** for card name recognition
- **Multiple fallback strategies** for maximum compatibility
- **Real-time error recovery** and retry mechanisms

### 📦 Pack Ripper & Session Tracking
- **Voice-driven card detection** with high accuracy
- **Real-time session statistics** and analytics
- **Persistent session storage** with auto-save
- **Import/export functionality** for session data
- **Card set management** with comprehensive database

### 💰 Advanced Price Checking
- **Multiple price sources** (TCGPlayer, Cardmarket, PriceCharting)
- **Intelligent caching** for performance
- **Price history tracking** and trends
- **Condition and variant support**
- **Confidence scoring** for price accuracy

### 🌐 Progressive Web App
- **Offline functionality** with service worker
- **Cross-platform compatibility** (iOS, Android, Desktop)
- **Responsive design** optimized for all screen sizes
- **Touch-first interface** with accessibility features
- **PWA installation** support

### 🤖 AI Agent Testable
- **Comprehensive test suite** with automated testing
- **Clear DOM structure** for easy automation
- **Predictable state management** for reliable testing
- **Detailed logging** and debugging capabilities
- **API-friendly architecture** for integration testing

## 🚀 Quick Start

### Prerequisites
YGORipperUI v2 requires the backend API from [tcg_ygoripper](https://github.com/jacostaf/tcg_ygoripper/tree/copilot/fix-5) to function properly.

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

### Step 2: Start YGORipperUI v2
```bash
# In a new terminal, navigate to YGOUIv2 folder
cd YGORipperUI/YGOUIv2

# Start development server
python3 -m http.server 8080

# Open in browser
open http://localhost:8080
```

### Platform-Specific Instructions

#### 🍎 Mac
```bash
cd YGOUIv2
python3 -m http.server 8080
# Safari/Chrome: http://localhost:8080
# PWA: Safari → Share → "Add to Home Screen"
```

#### 🪟 Windows  
```powershell
cd YGOUIv2
python -m http.server 8080
# Chrome/Edge: http://localhost:8080
# PWA: Click install icon in address bar
```

#### 📱 iPhone
```bash
# Find your IP address, then start server
python3 -m http.server 8080 --bind 0.0.0.0
# iPhone Safari: http://YOUR_IP:8080
# PWA: Safari → Share → "Add to Home Screen" (recommended)
```

### Testing
```bash
# Run voice recognition tests
open http://localhost:8080?test=voice

# Manual testing
open browser console and run: runVoiceTests()
```

### Production Build & Deployment
```bash
# Install dependencies
npm install

# Build for production
npm run build

# Preview production build locally
npm run preview
```

**🚀 For complete deployment instructions, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)**

The deployment guide includes:
- **Render.com deployment** (recommended) - step-by-step with screenshots
- **Alternative platforms** (Netlify, Vercel, GitHub Pages, Firebase)
- **Manual deployment** for traditional hosting (FTP, cPanel)
- **PWA deployment verification** and testing procedures
- **Continuous deployment** setup with GitHub Actions
- **Production optimization** and security hardening
- **Troubleshooting guide** for common deployment issues

## 🏗️ Architecture

### Modern Tech Stack
- **Frontend**: Vanilla JavaScript ES6+ modules
- **Voice**: Web Speech API with robust fallbacks
- **Storage**: IndexedDB + LocalStorage with abstraction layer
- **Offline**: Service Worker with intelligent caching
- **UI**: CSS Grid/Flexbox with modern responsive design
- **PWA**: Full offline capability and app-like experience

### Component Structure
```
src/
├── js/
│   ├── app.js                 # Main application controller
│   ├── voice/
│   │   ├── VoiceEngine.js     # Multi-strategy voice recognition
│   │   └── PermissionManager.js # Cross-platform permissions
│   ├── session/
│   │   └── SessionManager.js  # Pack ripper session management
│   ├── price/
│   │   └── PriceChecker.js    # Multi-source price checking
│   ├── ui/
│   │   └── UIManager.js       # UI state and interaction management
│   ├── utils/
│   │   ├── Logger.js          # Advanced logging system
│   │   └── Storage.js         # Unified storage abstraction
│   └── tests/
│       └── voice.test.js      # Comprehensive test suite
├── css/
│   ├── main.css              # Core styles and theming
│   ├── components.css        # Component-specific styles
│   └── responsive.css        # Cross-platform responsive design
└── assets/
    └── icons/                # PWA icons and assets
```

## 🎯 Voice Recognition

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

### Usage
```javascript
// Initialize voice recognition
const voiceEngine = new VoiceEngine(permissionManager);
await voiceEngine.initialize();

// Start listening
await voiceEngine.startListening();

// Handle results
voiceEngine.onResult((result) => {
    console.log(`Recognized: ${result.transcript} (${result.confidence})`);
});
```

## 📱 Cross-Platform Support

### iOS (iPhone/iPad)
- ✅ **PWA Installation**: Add to Home Screen support
- ✅ **Voice Recognition**: Web Speech API with Safari optimizations
- ✅ **Offline Mode**: Full functionality without internet
- ✅ **Touch Interface**: Optimized for touch navigation
- ✅ **Safe Area**: Proper handling of notches and home indicators

### Android
- ✅ **PWA Installation**: Chrome and Edge browser support
- ✅ **Voice Recognition**: Chrome Speech API with fallbacks
- ✅ **Offline Mode**: Service worker caching
- ✅ **Material Design**: Android-friendly interface patterns

### Desktop (Windows/Mac/Linux)
- ✅ **Full Feature Set**: Complete functionality
- ✅ **Keyboard Shortcuts**: Ctrl/Cmd+1,2,3 for tab switching
- ✅ **High DPI Support**: Retina and 4K display optimization
- ✅ **Platform Detection**: OS-specific optimizations

## 🧪 Testing & Quality Assurance

### Automated Testing
```bash
# Voice recognition tests
runVoiceTests()

# Session management tests
runSessionTests()

# Price checking tests
runPriceTests()

# Integration tests
runIntegrationTests()
```

### Manual Testing Checklist
- [ ] Voice recognition works on target platforms
- [ ] Session persistence across browser restarts
- [ ] Offline functionality with service worker
- [ ] Price checking with multiple sources
- [ ] Responsive design on different screen sizes
- [ ] Accessibility with screen readers
- [ ] Touch navigation on mobile devices

### AI Agent Testing
The application is designed to be easily testable by AI agents:

- **Predictable DOM structure**: Consistent IDs and classes
- **Clear state management**: Observable application state
- **Comprehensive logging**: Detailed debug information
- **Event-driven architecture**: Easy to monitor and test
- **REST-like patterns**: Predictable data flow

## 🔧 Configuration

### Backend API Integration
YGORipperUI v2 connects to the backend API at `http://127.0.0.1:8081` with the following endpoints:
- **Card Sets**: `/card-sets/from-cache` - Loads all 990+ card sets
- **Set Search**: `/card-sets/search/{term}` - Searches card sets by name/code  
- **Set Cards**: `/card-sets/{set_name}/cards` - Gets cards for specific set
- **Health Check**: `/health` - Verifies API connectivity

### Voice Recognition Settings
```javascript
{
    language: 'en-US',           // Recognition language
    continuous: false,           // Continuous vs single-shot
    interimResults: false,       // Show partial results
    timeout: 10000,             // Recognition timeout
    retryAttempts: 3,           // Error retry count
    confidenceThreshold: 0.7,   // Minimum confidence score
    cardNameOptimization: true  // YGO-specific improvements
}
```

### Price Checking Configuration
```javascript
{
    timeout: 10000,             // API request timeout
    retryAttempts: 3,           // Request retry count
    enableCache: true,          // Cache price results
    enableMultiSource: true,    // Use multiple price sources
    defaultCondition: 'near-mint'
}
```

## 🚨 Troubleshooting

### Voice Recognition Issues
1. **Permission Denied**:
   - Check browser microphone permissions
   - Ensure HTTPS or localhost environment
   - Try refreshing the page

2. **Poor Recognition**:
   - Speak clearly and at normal pace
   - Ensure quiet environment
   - Check microphone levels

3. **iOS/Safari Specific**:
   - Ensure iOS 14.3+ for full Web Speech API support
   - Check Settings > Safari > Camera & Microphone
   - Try restarting Safari

### General Issues
1. **App Won't Load**:
   - Check browser console for errors
   - Ensure JavaScript is enabled
   - Try clearing browser cache

2. **Offline Mode Issues**:
   - Ensure service worker is registered
   - Check Network tab in DevTools
   - Try force refresh (Ctrl+Shift+R)

## 🔮 Future Enhancements

### Planned Features
- [ ] **Cloud Sync**: Optional cloud synchronization for sessions
- [ ] **Advanced Analytics**: Detailed pack opening statistics
- [ ] **Card Image Recognition**: Visual card identification
- [ ] **Multi-language Support**: Recognition in multiple languages
- [ ] **Voice Commands**: Advanced voice control beyond card names
- [ ] **Real-time Collaboration**: Shared pack opening sessions

### Technical Improvements
- [ ] **WebAssembly**: Local speech recognition for complete offline use
- [ ] **Machine Learning**: Improved card name recognition with ML
- [ ] **Push Notifications**: Price alerts and session reminders
- [ ] **Background Sync**: Automatic data synchronization
- [ ] **Advanced Caching**: Smarter cache strategies and prefetching

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Style
- Use ES6+ features
- Follow existing naming conventions
- Add JSDoc comments for public methods
- Maintain responsive design principles
- Ensure accessibility compliance

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- **Yu-Gi-Oh! Trading Card Game** by Konami
- **Web Speech API** specification and implementations
- **Progressive Web App** standards and best practices
- **Modern JavaScript** community and tooling

---

**Note**: This is a complete rewrite of the YGOUIv2 application with focus on robust voice recognition, cross-platform compatibility, and modern web standards. The previous implementation has been archived in `YGOUIv2_backup/` for reference.