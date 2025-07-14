// Simple test to verify ES6 modules are working
console.log('=== MODULE LOADING TEST ===');
console.log('TEST: Basic JavaScript execution working');

// Test ES6 module syntax
try {
    console.log('TEST: ES6 syntax supported');
    
    // Test basic fetch (for backend connectivity)
    fetch('http://localhost:8082/health')
        .then(response => {
            console.log('TEST: Backend connectivity check - Status:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('TEST: Backend response:', data);
        })
        .catch(error => {
            console.log('TEST: Backend connectivity failed:', error.message);
        });
        
} catch (error) {
    console.error('TEST: ES6 syntax error:', error);
}

// Test DOM loading
document.addEventListener('DOMContentLoaded', () => {
    console.log('TEST: DOM loaded successfully');
    
    // Test loading screen exists
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        console.log('TEST: Loading screen element found');
    } else {
        console.error('TEST: Loading screen element missing');
    }
});

export default null; // Valid ES6 export