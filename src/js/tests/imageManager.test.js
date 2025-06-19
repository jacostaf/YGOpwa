/**
 * ImageManager Tests
 * 
 * Tests for the ImageManager to ensure proper image loading, caching, and display
 */

// Simple test framework
class TestFramework {
    constructor() {
        this.tests = [];
        this.results = [];
    }

    test(name, testFn) {
        this.tests.push({ name, testFn });
    }

    async runAll() {
        console.log('🧪 Running ImageManager Tests...\n');
        
        for (const { name, testFn } of this.tests) {
            try {
                console.log(`⏳ ${name}...`);
                await testFn();
                console.log(`✅ ${name} - PASSED\n`);
                this.results.push({ name, status: 'PASSED' });
            } catch (error) {
                console.error(`❌ ${name} - FAILED:`, error.message);
                this.results.push({ name, status: 'FAILED', error: error.message });
            }
        }
        
        this.printSummary();
    }

    printSummary() {
        const passed = this.results.filter(r => r.status === 'PASSED').length;
        const failed = this.results.filter(r => r.status === 'FAILED').length;
        
        console.log(`\n📊 Test Summary:`);
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📈 Total: ${this.results.length}`);
    }
}

// Test the displayImage fix
async function testDisplayImage() {
    // Create a mock ImageManager
    const { ImageManager } = await import('../utils/ImageManager.js');
    const imageManager = new ImageManager();
    
    // Create a test container
    const container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);
    
    // Create a test image with data URL
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 145;
    const ctx = canvas.getContext('2d');
    
    // Draw a simple test pattern
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(0, 0, 50, 145);
    ctx.fillStyle = '#00FF00';
    ctx.fillRect(50, 0, 50, 145);
    
    const testDataUrl = canvas.toDataURL('image/png');
    
    // Create test image
    const testImg = new Image();
    testImg.src = testDataUrl;
    testImg.style.width = '100px';
    testImg.style.height = '145px';
    testImg.style.objectFit = 'contain';
    
    // Wait for image to load
    await new Promise((resolve) => {
        testImg.onload = resolve;
    });
    
    // Test displayImage method
    imageManager.displayImage(testImg, container);
    
    // Verify the image was displayed correctly
    const wrapper = container.querySelector('.card-image-wrapper');
    if (!wrapper) {
        throw new Error('Image wrapper not created');
    }
    
    const displayedImg = wrapper.querySelector('.card-image');
    if (!displayedImg) {
        throw new Error('Image not displayed');
    }
    
    if (displayedImg.src !== testDataUrl) {
        throw new Error('Image src not copied correctly');
    }
    
    if (displayedImg.style.width !== '100px') {
        throw new Error('Image width not copied correctly');
    }
    
    if (displayedImg.style.height !== '145px') {
        throw new Error('Image height not copied correctly');
    }
    
    if (displayedImg.style.objectFit !== 'contain') {
        throw new Error('Image objectFit not copied correctly');
    }
    
    // Clean up
    document.body.removeChild(container);
}

// Test creating image from data URL
async function testCreateImageFromData() {
    const { ImageManager } = await import('../utils/ImageManager.js');
    const imageManager = new ImageManager();
    
    // Create test data URL
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 145;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0000FF';
    ctx.fillRect(0, 0, 100, 145);
    const testDataUrl = canvas.toDataURL('image/png');
    
    // Test createImageFromData
    const img = await imageManager.createImageFromData(testDataUrl, { width: 100, height: 145 });
    
    if (!img) {
        throw new Error('Image not created');
    }
    
    if (img.src !== testDataUrl) {
        throw new Error('Image src not set correctly');
    }
    
    if (img.style.width !== '100px') {
        throw new Error('Image width not set correctly');
    }
    
    if (img.style.height !== '145px') {
        throw new Error('Image height not set correctly');
    }
}

// Test placeholder display
async function testDisplayPlaceholder() {
    const { ImageManager } = await import('../utils/ImageManager.js');
    const imageManager = new ImageManager();
    
    // Create test container
    const container = document.createElement('div');
    container.id = 'test-placeholder-container';
    document.body.appendChild(container);
    
    // Test displayPlaceholder
    imageManager.displayPlaceholder(container, 'Test Card');
    
    const placeholder = container.querySelector('.card-image-placeholder');
    if (!placeholder) {
        throw new Error('Placeholder not created');
    }
    
    const placeholderText = placeholder.querySelector('.placeholder-text');
    if (!placeholderText || placeholderText.textContent !== 'Test Card') {
        throw new Error('Placeholder text not set correctly');
    }
    
    // Clean up
    document.body.removeChild(container);
}

// Run tests
async function runTests() {
    const framework = new TestFramework();
    
    framework.test('displayImage with data URL', testDisplayImage);
    framework.test('createImageFromData', testCreateImageFromData);
    framework.test('displayPlaceholder', testDisplayPlaceholder);
    
    await framework.runAll();
}

// Export for use
export { runTests };

// Run tests if this file is loaded directly
if (typeof window !== 'undefined' && window.location.search.includes('test=imageManager')) {
    runTests();
}