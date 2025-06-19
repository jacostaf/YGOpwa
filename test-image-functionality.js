#!/usr/bin/env node

/**
 * Manual Image Loading Test
 * 
 * Tests the image loading functionality in a browser environment
 * Run this after starting the local server
 */

console.log('🧪 Manual Image Loading Test');
console.log('==========================');
console.log('');

// Test configuration
const TEST_IMAGES = [
    'https://images.ygoprodeck.com/images/cards/89631139.jpg', // Blue-Eyes White Dragon
    'https://images.ygoprodeck.com/images/cards/70903634.jpg', // Dark Magician
    'https://images.ygoprodeck.com/images/cards/55144522.jpg'  // Pot of Greed
];

const SERVER_URL = 'http://localhost:8082';

function logStep(step, description) {
    console.log(`\n${step}. ${description}`);
    console.log(''.padEnd(description.length + 4, '-'));
}

function logSuccess(message) {
    console.log(`✅ ${message}`);
}

function logError(message) {
    console.log(`❌ ${message}`);
}

function logInfo(message) {
    console.log(`ℹ️  ${message}`);
}

async function testServerConnection() {
    logStep(1, 'Testing Server Connection');
    
    try {
        const response = await fetch(`${SERVER_URL}/index.html`);
        if (response.ok) {
            logSuccess('Server is running and accessible');
            return true;
        } else {
            logError(`Server responded with status: ${response.status}`);
            return false;
        }
    } catch (error) {
        logError(`Failed to connect to server: ${error.message}`);
        logInfo('Make sure to run: npm run dev');
        return false;
    }
}

async function testServiceWorkerRegistration() {
    logStep(2, 'Testing Service Worker');
    
    try {
        const response = await fetch(`${SERVER_URL}/sw.js`);
        if (response.ok) {
            const content = await response.text();
            if (content.includes('ygo-image-proxy')) {
                logSuccess('Service Worker includes YGO image proxy functionality');
                return true;
            } else {
                logError('Service Worker does not include YGO image proxy functionality');
                return false;
            }
        } else {
            logError(`Service Worker not accessible: ${response.status}`);
            return false;
        }
    } catch (error) {
        logError(`Failed to check Service Worker: ${error.message}`);
        return false;
    }
}

async function testImageManagerModule() {
    logStep(3, 'Testing ImageManager Module');
    
    try {
        const response = await fetch(`${SERVER_URL}/src/js/utils/ImageManager.js`);
        if (response.ok) {
            const content = await response.text();
            if (content.includes('loadImageViaServiceWorkerProxy')) {
                logSuccess('ImageManager includes service worker proxy functionality');
                return true;
            } else {
                logError('ImageManager does not include service worker proxy functionality');
                return false;
            }
        } else {
            logError(`ImageManager not accessible: ${response.status}`);
            return false;
        }
    } catch (error) {
        logError(`Failed to check ImageManager: ${error.message}`);
        return false;
    }
}

async function testImageProxyEndpoint() {
    logStep(4, 'Testing Image Proxy Endpoint');
    
    // Test the service worker proxy endpoint directly
    const testImageUrl = TEST_IMAGES[0];
    const proxyUrl = `${SERVER_URL}/ygo-image-proxy/${encodeURIComponent(testImageUrl)}`;
    
    try {
        logInfo(`Testing proxy URL: ${proxyUrl}`);
        const response = await fetch(proxyUrl);
        
        if (response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.startsWith('image/')) {
                logSuccess('Image proxy endpoint is working and returning image data');
                return true;
            } else {
                logError(`Proxy returned non-image content type: ${contentType}`);
                return false;
            }
        } else {
            logError(`Proxy endpoint responded with status: ${response.status}`);
            // This might be expected if service worker isn't active in fetch context
            logInfo('Note: Service worker may not be active in Node.js fetch context');
            return false;
        }
    } catch (error) {
        logError(`Failed to test proxy endpoint: ${error.message}`);
        logInfo('Note: This test requires a browser environment with active service worker');
        return false;
    }
}

async function generateTestReport() {
    logStep(5, 'Generating Test Report');
    
    console.log('\n📋 Manual Testing Instructions:');
    console.log('================================');
    console.log('');
    console.log('1. Open your browser and navigate to:');
    console.log(`   ${SERVER_URL}/test-image-loading.html`);
    console.log('');
    console.log('2. Check the Service Worker Status section');
    console.log('   - Should show "Service Worker is active and ready"');
    console.log('');
    console.log('3. Click "Load YGOPRODeck Image" button');
    console.log('   - Should load and display a Yu-Gi-Oh card image');
    console.log('   - Check browser console for detailed logs');
    console.log('');
    console.log('4. Click "Load Multiple Images" button');
    console.log('   - Should load 5 different card images');
    console.log('   - Some may fall back to placeholders if proxy fails');
    console.log('');
    console.log('5. Check Cache Statistics');
    console.log('   - Should show cached images in memory and localStorage');
    console.log('   - serviceWorkerReady should be true');
    console.log('');
    console.log('6. Test the main app:');
    console.log(`   ${SERVER_URL}/`);
    console.log('   - Go to Price Checker tab');
    console.log('   - Enter card number: LOB-001');
    console.log('   - Select rarity: Ultra Rare');
    console.log('   - Click "Check Price"');
    console.log('   - Card image should load in results');
    console.log('');
    console.log('🔍 Debugging Tips:');
    console.log('==================');
    console.log('');
    console.log('• Open browser Developer Tools (F12)');
    console.log('• Check Console tab for image loading logs');
    console.log('• Check Network tab for image requests');
    console.log('• Check Application > Service Workers for SW status');
    console.log('• Check Application > Storage > Local Storage for cached images');
    console.log('');
    console.log('🚨 Expected Behavior:');
    console.log('=====================');
    console.log('');
    console.log('✅ Service worker should proxy YGOPRODeck images');
    console.log('✅ Images should cache locally (no hotlinking)');
    console.log('✅ Failed images should show placeholder');
    console.log('✅ Multiple fallback strategies should be attempted');
    console.log('✅ Cache statistics should update after loading images');
}

async function runTests() {
    console.log('Starting automated tests...\n');
    
    const results = [];
    
    results.push(await testServerConnection());
    results.push(await testServiceWorkerRegistration());
    results.push(await testImageManagerModule());
    results.push(await testImageProxyEndpoint());
    
    const passedTests = results.filter(Boolean).length;
    const totalTests = results.length;
    
    console.log('\n📊 Automated Test Results:');
    console.log('===========================');
    console.log(`Passed: ${passedTests}/${totalTests} tests`);
    
    if (passedTests === totalTests) {
        logSuccess('All automated tests passed!');
    } else {
        logError(`${totalTests - passedTests} tests failed`);
    }
    
    await generateTestReport();
    
    console.log('\n🎯 Next Steps:');
    console.log('==============');
    console.log('1. Follow the manual testing instructions above');
    console.log('2. Test in the main application (price checker & session)');
    console.log('3. Check that images are cached and not hotlinked');
    console.log('4. Verify fallback behavior when service worker fails');
    
    return passedTests === totalTests;
}

// Only run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runTests().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('\n💥 Test runner failed:', error);
        process.exit(1);
    });
}

export { runTests };