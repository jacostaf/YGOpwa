/**
 * Browser-specific test setup for ImageManager tests
 * This setup file works in real browsers (not Node.js/JSDOM)
 */

// Browser environment already has these APIs, just need to set up test utilities
window.testUtils = {
  // Wait for async operations to complete
  waitFor: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Create mock API response
  mockApiResponse: (data, success = true) => ({
    ok: success,
    status: success ? 200 : 500,
    json: () => Promise.resolve(success ? { success: true, data } : { success: false, error: 'API Error' })
  }),
  
  // Create mock DOM event
  mockEvent: (type, properties = {}) => ({
    type,
    target: properties.target || {},
    preventDefault: () => {},
    stopPropagation: () => {},
    ...properties
  }),

  // Setup test container for ImageManager tests
  setupTestContainer: () => {
    const container = document.createElement('div');
    container.id = 'test-container';
    container.innerHTML = `
      <div id="image-container" style="width: 200px; height: 200px;"></div>
      <div id="placeholder-container" style="width: 150px; height: 150px;"></div>
    `;
    document.body.appendChild(container);
    return container;
  },

  // Clean up test DOM
  cleanup: () => {
    const container = document.getElementById('test-container');
    if (container) {
      container.remove();
    }
    // Clear localStorage for clean test state
    localStorage.clear();
  }
};

// Mock console to reduce noise in browser tests
const originalConsole = { ...console };
console.log = () => {};
console.info = () => {};
console.warn = () => {};

// Restore console for errors (still want to see real errors)
console.error = originalConsole.error;
console.debug = originalConsole.debug;