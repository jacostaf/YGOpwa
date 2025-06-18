# YGOUIv2 Platform Installation Guide

This guide provides detailed, step-by-step instructions for running YGOUIv2 on Mac, Windows, and iPhone with full offline capabilities.

## 🚀 Quick Setup Overview

YGOUIv2 is a Progressive Web App (PWA) that works with your existing backend API. Here's what you need:

1. **Backend API** running on `http://127.0.0.1:8081` (your Python ygo_ripper.py backend)
2. **Web server** to serve the YGOUIv2 files
3. **Modern browser** with JavaScript enabled

## 📋 Prerequisites

### Required
- Python 3.13.3 (your existing setup)
- Your backend API from the main project directory
- A modern web browser (Chrome, Safari, Firefox, Edge)

### Optional but Recommended
- Node.js (for development server)
- HTTPS setup (for full PWA features)

---

## 🍎 macOS Installation

### Method 1: Using Python HTTP Server (Recommended)

1. **Start your backend API first:**
   ```bash
   cd /path/to/YGORipperUI
   python3 ygo_ripper.py
   ```
   This will start your backend on `http://127.0.0.1:8081`

2. **Open a new terminal and navigate to YGOUIv2:**
   ```bash
   cd /path/to/YGORipperUI/YGOUIv2
   ```

3. **Start the web server:**
   ```bash
   python3 -m http.server 8080
   ```

4. **Open in Safari or Chrome:**
   ```
   http://localhost:8080
   ```

5. **For offline use (PWA installation):**
   - In Safari: Click Share → "Add to Home Screen" 
   - In Chrome: Click the install icon in the address bar
   - The app will now work offline and appear in your Applications

### Method 2: Using Node.js Development Server

1. **Install Node.js** from [nodejs.org](https://nodejs.org)

2. **Navigate to YGOUIv2 directory:**
   ```bash
   cd /path/to/YGORipperUI/YGOUIv2
   ```

3. **Install dependencies (optional):**
   ```bash
   npm install
   ```

4. **Start development server:**
   ```bash
   npm run dev
   # or if you don't have npm scripts:
   npx serve -s . -l 8080
   ```

5. **Open browser:**
   ```
   http://localhost:8080
   ```

### macOS Troubleshooting

**Voice Recognition Issues:**
- Go to System Preferences → Security & Privacy → Privacy → Microphone
- Ensure your browser has microphone access enabled
- If using Safari, try Chrome for better speech recognition support

**Network Issues:**
- Make sure both servers are running (backend on 8081, frontend on 8080)
- Check firewall settings if you can't access localhost
- Try using 127.0.0.1 instead of localhost

---

## 🪟 Windows Installation

### Method 1: Using Python HTTP Server (Recommended)

1. **Start your backend API first:**
   ```cmd
   cd C:\path\to\YGORipperUI
   python ygo_ripper.py
   ```
   This starts your backend on `http://127.0.0.1:8081`

2. **Open a new Command Prompt and navigate to YGOUIv2:**
   ```cmd
   cd C:\path\to\YGORipperUI\YGOUIv2
   ```

3. **Start the web server:**
   ```cmd
   python -m http.server 8080
   ```

4. **Open in your browser:**
   ```
   http://localhost:8080
   ```

5. **For offline use (PWA installation):**
   - In Chrome/Edge: Click the install icon in the address bar
   - The app will now work offline and appear in your Start Menu

### Method 2: Using IIS (Advanced)

1. **Enable IIS** in Windows Features
2. **Copy YGOUIv2 folder** to `C:\inetpub\wwwroot\YGOUIv2`
3. **Configure IIS** to serve static files
4. **Access via** `http://localhost/YGOUIv2`

### Windows Troubleshooting

**Voice Recognition Issues:**
- Go to Settings → Privacy → Microphone
- Ensure your browser has microphone access
- Use Chrome or Edge for best speech recognition support

**PowerShell Execution Policy:**
If you get execution policy errors:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Port Conflicts:**
If port 8080 is busy:
```cmd
python -m http.server 3000
# Then use http://localhost:3000
```

---

## 📱 iPhone Installation

### Requirements
- iOS 14.3 or later
- Safari browser (for best PWA support)
- Internet connection for initial setup

### Installation Steps

1. **Ensure your backend is accessible:**
   - Your Mac/PC must be running the backend on `http://127.0.0.1:8081`
   - Your Mac/PC must be running YGOUIv2 web server on port 8080
   - Both devices must be on the same WiFi network

2. **Find your computer's IP address:**
   - **Mac:** System Preferences → Network → Select WiFi → Look for IP address
   - **Windows:** Open Command Prompt → type `ipconfig` → look for IPv4 Address

3. **Start servers on your computer:**
   ```bash
   # Terminal 1: Start backend
   cd /path/to/YGORipperUI
   python3 ygo_ripper.py

   # Terminal 2: Start frontend (allow external connections)
   cd /path/to/YGORipperUI/YGOUIv2
   python3 -m http.server 8080 --bind 0.0.0.0
   ```

4. **On your iPhone, open Safari and go to:**
   ```
   http://YOUR_COMPUTER_IP:8080
   ```
   (Replace YOUR_COMPUTER_IP with the IP address from step 2)

5. **Install as PWA:**
   - Tap the Share button (square with arrow)
   - Tap "Add to Home Screen"
   - Give it a name like "YGO Ripper"
   - Tap "Add"

6. **Launch the app:**
   - Tap the new icon on your home screen
   - The app will work fully offline after initial setup!

### iPhone-Specific Features

**Voice Recognition:**
- Safari on iOS 14.3+ has excellent Web Speech API support
- Grant microphone permissions when prompted
- Speak clearly for best results

**Offline Mode:**
- After first load, the app works completely offline
- Session data is saved locally on your device
- Price data is cached for offline access

**Touch Optimizations:**
- Interface is optimized for touch interaction
- Swipe gestures for navigation
- Large touch targets for easy use

### iPhone Troubleshooting

**Can't access the server:**
- Ensure both devices are on the same WiFi network
- Check that your computer's firewall allows connections on port 8080
- Try using the computer's actual IP address instead of localhost

**Voice recognition not working:**
- Go to Settings → Safari → Camera & Microphone → Allow
- Make sure you're using the PWA installed version, not Safari
- iOS Safari has the best speech recognition support

**App won't install:**
- Make sure you're using Safari (not Chrome or Firefox)
- Ensure you're on the actual website, not just saved bookmark
- Try clearing Safari cache and reloading

---

## 🔧 Advanced Configuration

### Custom Backend URL

If your backend runs on a different port or host, you can configure YGOUIv2:

1. **Edit the configuration** in `src/js/session/SessionManager.js`:
   ```javascript
   getApiUrl() {
       return 'http://your-custom-host:your-port';
   }
   ```

2. **Or use environment variables** (if supported by your setup):
   ```bash
   export API_URL=http://127.0.0.1:8081
   ```

### HTTPS Setup (For Full PWA Features)

For production use with full PWA capabilities:

1. **Get SSL certificates** (Let's Encrypt recommended)
2. **Configure HTTPS server:**
   ```bash
   # Using Node.js serve with HTTPS
   npx serve -s . -l 443 --ssl-cert cert.pem --ssl-key key.pem
   ```
3. **Update backend to use HTTPS** as well

### Network Configuration

**For remote access (access from other devices):**
```bash
# Allow external connections
python3 -m http.server 8080 --bind 0.0.0.0

# Or specify interface
python3 -m http.server 8080 --bind 192.168.1.100
```

---

## 📊 Performance Optimization

### For Large Card Collections
- Enable service worker caching
- Use IndexedDB for large datasets
- Implement virtual scrolling for card lists

### For Slow Networks
- Enable progressive loading
- Use CDN for static assets
- Optimize image sizes and formats

---

## 🛠️ Troubleshooting Common Issues

### Backend Connection Issues

**Problem:** "Failed to load card sets"
**Solution:**
1. Verify backend is running: `curl http://127.0.0.1:8081/health`
2. Check backend logs for errors
3. Ensure no firewall blocking port 8081

**Problem:** CORS errors in browser console
**Solution:**
1. Backend needs CORS headers enabled
2. Use same protocol (http/https) for both frontend and backend
3. Check browser developer console for specific errors

### Voice Recognition Issues

**Problem:** "Microphone access denied"
**Solution:**
1. Grant microphone permissions in browser
2. Ensure HTTPS or localhost (required for getUserMedia)
3. Check browser settings for site permissions

**Problem:** Poor voice recognition accuracy
**Solution:**
1. Speak clearly and at normal pace
2. Ensure quiet environment
3. Use Chrome/Safari for best results
4. Check microphone levels in system settings

### Storage and Caching Issues

**Problem:** App doesn't work offline
**Solution:**
1. Ensure service worker is registered (check DevTools > Application)
2. Clear browser cache and reload
3. Check service worker console for errors

**Problem:** Session data lost
**Solution:**
1. Check browser storage settings (don't clear on exit)
2. Ensure adequate storage space
3. Check IndexedDB in browser developer tools

---

## 🚀 Quick Start Commands

### For Mac/Linux:
```bash
# Start backend
cd YGORipperUI && python3 ygo_ripper.py &

# Start frontend
cd YGORipperUI/YGOUIv2 && python3 -m http.server 8080 &

# Open browser
open http://localhost:8080
```

### For Windows:
```cmd
# Terminal 1
cd YGORipperUI
python ygo_ripper.py

# Terminal 2
cd YGORipperUI\YGOUIv2
python -m http.server 8080

# Open browser
start http://localhost:8080
```

### One-Line Setup Script

Create `start-ygo.sh` (Mac/Linux) or `start-ygo.bat` (Windows):

**Mac/Linux:**
```bash
#!/bin/bash
cd "$(dirname "$0")"
python3 ygo_ripper.py &
cd YGOUIv2
python3 -m http.server 8080 &
open http://localhost:8080
```

**Windows:**
```batch
@echo off
cd /d "%~dp0"
start "Backend" python ygo_ripper.py
cd YGOUIv2
start "Frontend" python -m http.server 8080
timeout /t 3
start http://localhost:8080
```

---

## 📞 Support

If you encounter issues:

1. **Check the browser console** (F12) for error messages
2. **Verify both servers are running** (backend on 8081, frontend on 8080)
3. **Test the backend directly**: `curl http://127.0.0.1:8081/health`
4. **Check network connectivity** between frontend and backend
5. **Review browser permissions** for microphone and storage

For iPhone-specific issues:
- Ensure iOS 14.3+
- Use Safari for PWA installation
- Check WiFi connectivity between devices
- Verify firewall settings on your computer

Remember: YGOUIv2 is designed to work seamlessly with your existing ygo_ripper.py backend, providing the same functionality with a modern web interface and robust voice recognition.