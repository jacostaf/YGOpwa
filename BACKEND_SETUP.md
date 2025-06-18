# Backend Setup Guide for YGORipperUI v2

This guide explains how to properly set up and run the backend API required for YGORipperUI v2.

## 🏗️ Backend Architecture

YGORipperUI v2 requires the **tcg_ygoripper** backend API, which is a separate Flask application that:

- Fetches and caches Yu-Gi-Oh card data from YGOPRODeck API
- Provides 990+ card sets via REST API endpoints
- Handles price scraping from TCGPlayer.com
- Uses MongoDB for caching and data persistence

## 📋 Prerequisites

### Required Software
- **Python 3.13.3+** (as specified by user)
- **MongoDB** (local or cloud instance)
- **Git** for cloning repositories

### Required Python Packages
The backend uses these key packages:
- Flask (web framework)
- pymongo (MongoDB driver)
- requests (HTTP client)
- python-dotenv (environment variables)

## 🚀 Backend Setup Instructions

### Step 1: Clone the Backend Repository

```bash
# Clone the correct backend repository
git clone -b copilot/fix-5 https://github.com/jacostaf/tcg_ygoripper.git
cd tcg_ygoripper
```

### Step 2: Set Up Python Environment

```bash
# Create virtual environment with Python 3.13.3
python3 -m venv venv

# Activate virtual environment
# macOS/Linux:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Step 3: Configure Environment Variables

Create a `.env` file in the tcg_ygoripper directory:

```env
# MongoDB Configuration
MONGODB_CONNECTION_STRING=mongodb://localhost:27017/ygo_database
# OR for MongoDB Atlas:
# MONGODB_CONNECTION_STRING=mongodb+srv://username:password@cluster.mongodb.net/ygo_database

# TCGPlayer Configuration (optional)
TCGPLAYER_MAX_PREFERRED_RESULTS=50
TCGPLAYER_MAX_ACCEPTABLE_RESULTS=200
TCGPLAYER_DEFAULT_VARIANT_LIMIT=100

# API Configuration
FLASK_ENV=development
FLASK_DEBUG=True
```

### Step 4: Set Up MongoDB

#### Option A: Local MongoDB
```bash
# Install MongoDB (macOS with Homebrew)
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB service
brew services start mongodb-community

# Verify MongoDB is running
mongo --eval "db.runCommand('ping')"
```

#### Option B: MongoDB Atlas (Cloud)
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free cluster
3. Get connection string and update `.env` file
4. Whitelist your IP address

### Step 5: Initialize Backend Data

```bash
# Start the Flask backend
python3 main.py

# The backend will start on http://127.0.0.1:5000

# In another terminal, initialize card sets data
curl -X POST http://127.0.0.1:5000/card-sets/upload
```

## 🔌 API Endpoints Reference

### Card Sets Endpoints
- `GET /health` - Health check
- `GET /card-sets` - Get all card sets from YGO API
- `POST /card-sets/upload` - Upload card sets to MongoDB cache
- `GET /card-sets/from-cache` - Get cached card sets (used by YGORipperUI v2)
- `GET /card-sets/search/<set_name>` - Search sets by name (used by search functionality)
- `GET /card-sets/count` - Get total count of card sets
- `GET /card-sets/<set_name>/cards` - Get all cards from a specific set

### Response Format
All endpoints return JSON with this structure:
```json
{
    "success": true,
    "data": [...],
    "message": "Optional message"
}
```

## 🧪 Testing Backend Setup

Use the provided test script to verify your backend setup:

```bash
# From YGORipperUI directory
python3 test_backend_api.py
```

Expected output:
```
🧪 YGORipperUI v2 Backend API Test Suite
==================================================
Testing backend at: http://127.0.0.1:5000

🔍 Testing backend health...
✅ Backend health check passed

🔍 Testing card sets from cache...
✅ Loaded 992 card sets from cache
✅ Good set count: 992 sets (expected 990+)

✅ All tests completed successfully!
Backend API is ready for YGORipperUI v2 with 992 card sets
```

## 🐛 Troubleshooting

### Backend Won't Start

**Error**: `ImportError: No module named 'flask'`
**Solution**: 
```bash
pip install flask pymongo requests python-dotenv
```

**Error**: `Port 5000 already in use`
**Solution**: 
```bash
# Kill process using port 5000
lsof -ti:5000 | xargs kill -9

# Or use different port in main.py
app.run(host='127.0.0.1', port=5001, debug=True)
```

### MongoDB Connection Issues

**Error**: `pymongo.errors.ServerSelectionTimeoutError`
**Solutions**:
1. Check MongoDB is running: `brew services list | grep mongodb`
2. Verify connection string in `.env` file
3. For Atlas: check IP whitelist and credentials

### Card Sets Not Loading

**Error**: "Cannot connect to backend API"
**Solutions**:
1. Verify backend is running: `curl http://127.0.0.1:5000/health`
2. Check firewall settings for port 5000
3. Initialize card sets: `curl -X POST http://127.0.0.1:5000/card-sets/upload`

**Error**: Low card set count (< 500 sets)
**Solutions**:
1. Check YGOPRODeck API connectivity
2. Verify MongoDB has cached data
3. Re-upload card sets: `curl -X POST http://127.0.0.1:5000/card-sets/upload`

### CORS Issues

If YGORipperUI v2 shows CORS errors:

1. Ensure backend includes CORS headers
2. Check Flask-CORS configuration
3. Try accessing UI from `http://localhost:8080` instead of `file://`

## 📊 Backend Performance

### Expected Performance
- **Startup Time**: 5-10 seconds
- **Card Sets Load**: 992+ sets in < 2 seconds
- **Search Response**: < 500ms for most queries
- **Memory Usage**: ~100-200MB typical

### Optimization Tips
1. **MongoDB Indexing**: Ensure proper indexes on search fields
2. **Caching**: Use Redis for additional caching if needed
3. **Rate Limiting**: Configure appropriate API rate limits
4. **Connection Pooling**: Use MongoDB connection pooling

## 🔄 Development Workflow

### Backend Development
```bash
# Start backend with auto-reload
export FLASK_ENV=development
python3 main.py

# Backend restarts automatically on code changes
```

### Frontend Development
```bash
# In YGOUIv2 directory
python3 -m http.server 8080

# Open http://localhost:8080
```

### Full Stack Testing
1. Start MongoDB
2. Start tcg_ygoripper backend (port 5000)
3. Start YGORipperUI v2 frontend (port 8080)
4. Test card set loading and search functionality

## 📝 Backend Code Review

The tcg_ygoripper backend (`main.py`) provides these key features that YGORipperUI v2 relies on:

### Card Set Management
- Fetches all Yu-Gi-Oh card sets from YGOPRODeck API
- Caches sets in MongoDB collection `YGO_SETS_CACHE_V1`
- Provides search functionality across set names and codes
- Maintains data freshness and synchronization

### API Rate Limiting
- Respects YGOPRODeck API limits (20 requests/second)
- Implements intelligent caching to minimize API calls
- Provides offline functionality via MongoDB cache

### Data Structure
Card sets are stored with these fields:
- `set_name`: Full name of the card set
- `set_code`: Short code identifier (e.g., "LOB")
- Additional metadata from YGOPRODeck API

This matches exactly what YGORipperUI v2 expects in the SessionManager implementation.

## 🎯 Conclusion

Once the tcg_ygoripper backend is properly set up and running on port 5000, YGORipperUI v2 will:

1. ✅ Load all 990+ card sets from `/card-sets/from-cache`
2. ✅ Provide real-time search via `/card-sets/search/<term>`
3. ✅ Display proper set counts and data
4. ✅ Enable full pack ripper functionality

The backend integration is now correctly configured to work with the Flask default port 5000 instead of the previously incorrect port 8081.