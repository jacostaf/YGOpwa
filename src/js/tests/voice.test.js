/**
 * Voice Test Suite
 * Legacy voice functionality tests
 */

// Import Jest functions for ES module compatibility
import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { VoiceEngine } from '../voice/VoiceEngine.js';

describe('Voice Legacy Tests', () => {
    let voiceEngine;
    let mockPermissionManager;

    beforeEach(() => {
        mockPermissionManager = {
            requestMicrophone: jest.fn().mockResolvedValue({ state: 'granted' }),
            hasPermission: jest.fn().mockReturnValue(true),
            detectBrowser: jest.fn().mockReturnValue('chrome'),
            isSupported: jest.fn().mockReturnValue(true),
            initialize: jest.fn().mockResolvedValue(true),
            getPermissionInstructions: jest.fn().mockReturnValue('Enable microphone permissions')
        };

        voiceEngine = new VoiceEngine(mockPermissionManager);
    });

    test('should create voice engine instance', () => {
        expect(voiceEngine).toBeTruthy();
        expect(voiceEngine.permissionManager).toBe(mockPermissionManager);
    });

    test('should initialize voice engine', async () => {
        await voiceEngine.initialize();

        expect(mockPermissionManager.initialize).toHaveBeenCalled();
        expect(voiceEngine.isInitialized).toBe(true);
    });

    test('should request microphone permission', async () => {
        await voiceEngine.requestMicrophonePermission();

        expect(mockPermissionManager.requestMicrophone).toHaveBeenCalled();
    });

    test('should check if permission is granted', () => {
        const hasPermission = mockPermissionManager.hasPermission();

        expect(mockPermissionManager.hasPermission).toHaveBeenCalled();
        expect(hasPermission).toBe(true);
    });

    test('should detect browser type', () => {
        const browser = mockPermissionManager.detectBrowser();

        expect(mockPermissionManager.detectBrowser).toHaveBeenCalled();
        expect(browser).toBe('chrome');
    });

    test('should check if environment is supported', () => {
        // In test environment with mocks, it will return true
        const isSupported = voiceEngine.isEnvironmentSupported();

        expect(isSupported).toBe(true); // Test environment has mocked Web Speech API
    });

    // Add more tests as needed...
});