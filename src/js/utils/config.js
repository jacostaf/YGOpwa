/**
 * Configuration for YGO Ripper UI v2
 * 
 * Centralized configuration management for the frontend application
 */

export const config = {
    // API Configuration - Update this to match your backend server
    API_URL: 'http://localhost:8082',
    
    // Price Checker Configuration
    PRICE_CHECK: {
        timeout: 30000, // 30 seconds
        retryAttempts: 3,
        retryDelay: 1000,
        enableCache: true,
        defaultCondition: 'near-mint'
    },
    
    // Voice Recognition Configuration
    VOICE: {
        timeout: 5000,
        language: 'en-US',
        confidenceThreshold: 0.5,
        maxAlternatives: 5,
        continuous: true,
        interimResults: true
    },
    
    // Session Management Configuration
    SESSION: {
        autoSave: true,
        autoSaveInterval: 30000, // 30 seconds
        maxSessionHistory: 10
    },
    
    // UI Configuration
    UI: {
        theme: 'dark',
        toastDuration: 3000,
        loadingTimeout: 30000
    },
    
    // Debug Configuration
    DEBUG: {
        enabled: false,
        logLevel: 'info'
    }
};

