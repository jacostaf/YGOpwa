# Testing Guide for Enhanced Card Details Implementation

This guide explains how to test the enhanced card details functionality that mimics oldIteration.py.

## Features Implemented

✅ **Card Image Display**
- Downloads and caches card images locally (no hotlinking)
- Uses YGOPRODeck API-compatible image URLs
- Implements proper loading states and error handling
- Supports multiple image sizes for different display modes

✅ **Enhanced Price Display** 
- Matches oldIteration.py format exactly
- Shows detailed card information (Name, Number, Rarity, Set, etc.)
- Displays TCGPlayer Low and Market prices
- Includes additional information section
- Shows query time and data source

✅ **Async Loading & Caching**
- Non-blocking UI with loading indicators
- Longer timeouts (30 seconds) for API calls
- In-memory and localStorage caching for images
- LRU cache eviction when cache is full

✅ **API Compliance**
- No hotlinking of images (downloads and hosts locally)
- Proper error handling and fallbacks
- Mock data support when backend is unavailable

## How to Test

### 1. Start the Development Server
```bash
cd /home/runner/work/YGOpwa/YGOpwa
npm run dev
# Server will run on http://localhost:8080
```

### 2. Navigate to Price Checker Tab
- Open http://localhost:8080 in your browser
- Ensure you're on the "Price Checker" tab (should be default)

### 3. Test Basic Functionality
Enter test data in the price checker form:

**Test Case 1: Blue-Eyes White Dragon**
- Card Number: `LOB-001`
- Card Name: `Blue-Eyes White Dragon`
- Rarity: `ultra`
- Art Variant: `1st Edition`

**Test Case 2: Red-Eyes Black Dragon**
- Card Number: `MRD-001` 
- Card Name: `Red-Eyes Black Dragon`
- Rarity: `ultra`
- Art Variant: `Unlimited`

**Test Case 3: Unknown Card**
- Card Number: `TEST-999`
- Card Name: `Test Card`
- Rarity: `common`

### 4. Expected Results

After clicking "Check Price", you should see:

1. **Loading State**: Brief loading indicator while processing
2. **Enhanced Display**: Results matching oldIteration.py format:
   - Header with "YGORIPPERUI - CARD PRICE INFORMATION"
   - Card image on the left (200x290px)
   - Card details section with all fields
   - Pricing information with TCGPlayer prices
   - Additional information section

3. **Card Image**: 
   - Should load for LOB-001 and MRD-001 (real YGOPRODeck images)
   - Should show placeholder for unknown cards
   - Loading spinner while downloading

4. **Price Data**:
   - Mock TCGPlayer Low and Market prices
   - Realistic pricing based on rarity
   - Confidence levels and aggregated statistics

### 5. Test Error Handling

**Image Loading Errors:**
- Try card number with no image available
- Should show placeholder with error message

**API Timeout:**
- Backend API calls will timeout and fallback to mock data
- Should see "Data Source: Mock Data" in additional information

**Network Issues:**
- Images that fail to load show placeholder
- App continues to function without crashing

### 6. Test Caching

**Image Cache:**
1. Load a card with an image (e.g., LOB-001)
2. Clear the price results and search for the same card again
3. Image should load faster the second time (from cache)

**Price Cache:**
1. Search for a card
2. Search for the same card again without "Force Refresh"
3. Should return cached results

### 7. Verify Data Format

The results should match oldIteration.py exactly:

```
🃏 YGORIPPERUI - CARD PRICE INFORMATION
═══════════════════════════════════════

📋 CARD DETAILS:
- Name: [Card Name]
- Number: [Card Number] 
- Rarity: [Rarity]
- Set: [Set Name]
- Art Variant: [Variant]
- Set Code: [Code]
- Last Updated: [Timestamp]

💰 PRICING INFORMATION:
- 🎯 TCGPlayer Low: $X.XX
- 📈 TCGPlayer Market: $X.XX

ℹ️ ADDITIONAL INFORMATION:
- Scrape Success: ✅ Yes/❌ No
- Source URL: [URL if available]
- Data Source: Backend API/Mock Data
- Query Time: [Timestamp]
```

## Browser Console Testing

Open browser developer tools (F12) and check the console for:

✅ **Success Messages:**
- "✅ Successfully loaded image for card [number]"
- Price check completion logs

⚠️ **Warning Messages:**
- "Backend API not available, using mock data"
- "Failed to load card image: [reason]"

❌ **Error Handling:**
- Errors should be caught and not crash the app
- Fallbacks should work properly

## File Structure

The implementation consists of these key files:

- `src/js/utils/ImageManager.js` - Card image handling
- `src/js/price/PriceChecker.js` - Enhanced price checking
- `src/js/ui/UIManager.js` - UI display logic
- `src/css/components.css` - Styling for enhanced display

## Mock Data

When the backend API is not available, the system uses realistic mock data:

- **Pricing**: Based on card rarity with realistic variance
- **Images**: Uses real YGOPRODeck URLs for known cards
- **Set Information**: Maps set codes to actual set names
- **Format**: Exactly matches oldIteration.py backend response

## Performance

- **Image Loading**: Async with timeouts and caching
- **API Calls**: 30-second timeout with fallback to mock data
- **UI**: Non-blocking with loading indicators
- **Cache**: LRU eviction when limits exceeded

## Compatibility

✅ **YGOPRODeck API Guidelines:**
- No hotlinking (downloads images locally)
- Proper caching to avoid rate limits
- Error handling for failed requests

✅ **Rate Limit Prevention:**
- Image caching in localStorage (7-day expiration)
- In-memory cache with LRU eviction
- Failed image tracking to avoid retries