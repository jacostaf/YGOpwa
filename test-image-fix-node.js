/**
 * ImageManager Fix Verification
 * 
 * This script demonstrates that the displayImage fix correctly handles data URLs
 * by creating new image elements instead of using cloneNode().
 */

// Mock DOM environment for Node.js testing
function setupMockDOM() {
    // Mock window object for Logger
    global.window = {
        location: {
            hostname: 'localhost',
            protocol: 'http:',
            search: ''
        }
    };
    const mockElements = new Map();
    let elementId = 0;
    
    global.document = {
        createElement: (tagName) => {
            const id = ++elementId;
            const element = {
                id: `mock-${tagName}-${id}`,
                tagName: tagName.toUpperCase(),
                className: '',
                innerHTML: '',
                style: {},
                children: [],
                _eventListeners: {},
                
                appendChild: function(child) {
                    this.children.push(child);
                    child.parentNode = this;
                },
                
                querySelector: function(selector) {
                    // Simple selector matching for our test
                    if (selector === '.card-image-wrapper') {
                        return this.children.find(child => 
                            child.className && child.className.includes('card-image-wrapper')
                        );
                    }
                    if (selector === '.card-image') {
                        // Look for card-image in all descendants, but not wrappers
                        const findInChildren = (node) => {
                            if (node.className && node.className === 'card-image') {
                                return node;
                            }
                            if (node.children) {
                                for (const child of node.children) {
                                    const found = findInChildren(child);
                                    if (found) return found;
                                }
                            }
                            return null;
                        };
                        return findInChildren(this);
                    }
                    return null;
                },
                
                cloneNode: function(deep) {
                    const clone = { ...this };
                    if (deep && this.children) {
                        clone.children = this.children.map(child => child.cloneNode(true));
                    }
                    // Simulate the issue: cloneNode doesn't preserve data URL properly
                    if (this.tagName === 'IMG' && this.src && this.src.startsWith('data:')) {
                        clone.src = ''; // This simulates the bug where data URLs get lost
                    }
                    return clone;
                }
            };
            
            // Special handling for canvas
            if (tagName === 'canvas') {
                element.width = 0;
                element.height = 0;
                element.getContext = () => ({
                    drawImage: () => {},
                    fillRect: () => {},
                    strokeRect: () => {},
                    fillText: () => {},
                    fillStyle: '',
                    strokeStyle: '',
                    lineWidth: 1,
                    font: '',
                    textAlign: 'left',
                    textBaseline: 'alphabetic'
                });
                element.toDataURL = (type, quality) => `data:image/png;base64,mock-canvas-data-${id}`;
            }
            
            // Special handling for images
            if (tagName === 'img') {
                let _src = '';
                Object.defineProperty(element, 'src', {
                    get: () => _src,
                    set: (value) => {
                        _src = value;
                        // Simulate async loading
                        setTimeout(() => {
                            element.complete = true;
                            if (element.onload) element.onload();
                        }, 0);
                    }
                });
                element.complete = false;
                element.onload = null;
                element.onerror = null;
            }
            
            mockElements.set(id, element);
            return element;
        }
    };
    
    global.Image = function() {
        const img = document.createElement('img');
        return img;
    };
    
    // Mock console for capturing debug output
    const originalConsole = { ...console };
    global.console = {
        ...originalConsole,
        debug: (...args) => {
            if (args[0] && args[0].includes('ImageManager')) {
                console.log('[TEST]', ...args);
            }
        }
    };
    
    return mockElements;
}

// Test the fix
async function testDisplayImageFix() {
    console.log('🧪 Testing displayImage fix...\n');
    
    // Setup mock DOM
    const mockElements = setupMockDOM();
    
    try {
        // Import ImageManager (this will work with Node.js module resolution)
        const ImageManagerModule = await import('./src/js/utils/ImageManager.js');
        const { ImageManager } = ImageManagerModule;
        
        console.log('✅ ImageManager imported successfully');
        
        // Create an ImageManager instance
        const imageManager = new ImageManager();
        console.log('✅ ImageManager instance created');
        
        // Create a mock container
        const container = document.createElement('div');
        container.id = 'test-container';
        console.log('✅ Container element created');
        
        // Create a test image with data URL (simulating cached image)
        const testDataUrl = 'data:image/png;base64,mock-test-data';
        const testImage = new Image();
        testImage.src = testDataUrl;
        testImage.style.width = '100px';
        testImage.style.height = '145px';
        testImage.style.objectFit = 'contain';
        
        console.log('✅ Test image created with data URL');
        
        // Wait for image to "load"
        await new Promise(resolve => {
            testImage.onload = resolve;
        });
        
        console.log('✅ Test image loaded');
        
        // Test the displayImage method
        imageManager.displayImage(testImage, container);
        
        console.log('✅ displayImage method called');
        console.log('   Original image src:', testImage.src);
        console.log('   Container children:', container.children.length);
        
        // Verify the fix
        const wrapper = container.querySelector('.card-image-wrapper');
        if (!wrapper) {
            throw new Error('Wrapper element not created');
        }
        console.log('✅ Wrapper element found');
        
        const displayedImage = wrapper.querySelector('.card-image');
        if (!displayedImage) {
            console.log('   Wrapper children:', wrapper.children);
            throw new Error('Image element not created');
        }
        console.log('✅ Displayed image element found');
        console.log('   Displayed image tagName:', displayedImage.tagName);
        console.log('   Displayed image className:', displayedImage.className);
        console.log('   Displayed image src:', displayedImage.src);
        
        // Let's also check the actual image child directly
        const actualImageChild = wrapper.children.find(child => child.tagName === 'IMG');
        if (actualImageChild) {
            console.log('   Direct image child src:', actualImageChild.src);
        }
        
        // Check that the image src is preserved (this is the key fix)
        if (displayedImage.src !== testDataUrl) {
            throw new Error(`Image src not preserved. Expected: ${testDataUrl}, Got: ${displayedImage.src}`);
        }
        console.log('✅ Image src correctly preserved');
        
        // Check that styles are copied
        if (displayedImage.style.width !== '100px') {
            throw new Error(`Width not copied. Expected: 100px, Got: ${displayedImage.style.width}`);
        }
        console.log('✅ Width style copied correctly');
        
        if (displayedImage.style.height !== '145px') {
            throw new Error(`Height not copied. Expected: 145px, Got: ${displayedImage.style.height}`);
        }
        console.log('✅ Height style copied correctly');
        
        if (displayedImage.style.objectFit !== 'contain') {
            throw new Error(`ObjectFit not copied. Expected: contain, Got: ${displayedImage.style.objectFit}`);
        }
        console.log('✅ ObjectFit style copied correctly');
        
        // Verify that we're NOT using cloneNode (which would lose the data URL)
        const clonedImage = testImage.cloneNode(true);
        if (clonedImage.src === testDataUrl) {
            console.log('⚠️  Warning: Mock cloneNode is not simulating the real bug');
        } else {
            console.log('✅ Confirmed: cloneNode would lose data URL (simulated)');
        }
        
        console.log('\n🎉 All tests passed! The displayImage fix is working correctly.');
        console.log('\n📋 Summary of the fix:');
        console.log('   - OLD: displayImg = img.cloneNode(true) [loses data URLs]');
        console.log('   - NEW: displayImg = new Image(); displayImg.src = img.src [preserves data URLs]');
        console.log('   - NEW: Copy styles explicitly from original image');
        
        return true;
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return false;
    }
}

// Run the test
testDisplayImageFix().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
});