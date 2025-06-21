/**
 * FileStorage - File System Storage Backend
 * 
 * Provides file system access for session persistence:
 * - Saves session data to a JSON file
 * - Loads session data from a JSON file
 * - Handles file system access API or Electron's fs module
 */

import { Logger } from './Logger.js';

export class FileStorage {
    constructor(logger = null) {
        this.logger = logger || new Logger('FileStorage');
        this.fileHandle = null;
        this.fileName = 'current_pack_session.json';
        this.isElectron = window && window.process && window.process.versions && window.process.versions.electron;
        this.fs = null;
        this.path = null;
        
        if (this.isElectron) {
            this.fs = window.require('fs');
            this.path = window.require('path');
            this.os = window.require('os');
        }
        
        this.logger.info('FileStorage initialized', { isElectron: this.isElectron });
    }

    /**
     * Check if file system access is available
     */
    isAvailable() {
        return 'showSaveFilePicker' in window || this.isElectron;
    }

    /**
     * Save data to file
     */
    async saveToFile(data, fileName = this.fileName) {
        try {
            const jsonData = JSON.stringify(data, null, 2);
            
            if (this.isElectron) {
                return this._saveWithElectron(jsonData, fileName);
            } else {
                return this._saveWithFileSystemAPI(jsonData, fileName);
            }
        } catch (error) {
            this.logger.error('Failed to save to file:', error);
            throw error;
        }
    }

    /**
     * Load data from file
     */
    async loadFromFile(fileName = this.fileName) {
        try {
            if (this.isElectron) {
                return this._loadWithElectron(fileName);
            } else {
                return this._loadWithFileSystemAPI(fileName);
            }
        } catch (error) {
            this.logger.error('Failed to load from file:', error);
            throw error;
        }
    }

    /**
     * Save using Electron's fs module
     */
    async _saveWithElectron(data, fileName) {
        return new Promise((resolve, reject) => {
            try {
                const filePath = this.path.join(this.os.homedir(), fileName);
                this.fs.writeFile(filePath, data, 'utf8', (err) => {
                    if (err) {
                        this.logger.error('Electron save error:', err);
                        reject(err);
                    } else {
                        this.logger.info('File saved successfully:', filePath);
                        resolve(true);
                    }
                });
            } catch (error) {
                this.logger.error('Electron save exception:', error);
                reject(error);
            }
        });
    }

    /**
     * Load using Electron's fs module
     */
    async _loadWithElectron(fileName) {
        return new Promise((resolve, reject) => {
            try {
                const filePath = this.path.join(this.os.homedir(), fileName);
                this.fs.readFile(filePath, 'utf8', (err, data) => {
                    if (err) {
                        if (err.code === 'ENOENT') {
                            this.logger.warn('Session file not found, returning null');
                            resolve(null);
                        } else {
                            this.logger.error('Electron load error:', err);
                            reject(err);
                        }
                    } else {
                        try {
                            const parsedData = JSON.parse(data);
                            this.logger.info('File loaded successfully:', filePath);
                            resolve(parsedData);
                        } catch (parseError) {
                            this.logger.error('Failed to parse file content:', parseError);
                            reject(new Error('Invalid JSON in session file'));
                        }
                    }
                });
            } catch (error) {
                this.logger.error('Electron load exception:', error);
                reject(error);
            }
        });
    }

    /**
     * Save using File System Access API
     */
    async _saveWithFileSystemAPI(data, fileName) {
        try {
            // If we already have a file handle, use it
            if (this.fileHandle) {
                return this._writeFile(this.fileHandle, data);
            }
            
            // Otherwise, prompt the user to select a file
            const options = {
                suggestedName: fileName,
                types: [{
                    description: 'JSON Files',
                    accept: { 'application/json': ['.json'] },
                }],
            };
            
            try {
                const handle = await window.showSaveFilePicker(options);
                this.fileHandle = handle;
                return await this._writeFile(handle, data);
            } catch (error) {
                // User likely canceled the save dialog
                if (error.name === 'AbortError') {
                    this.logger.info('User cancelled file save');
                    return false;
                }
                throw error;
            }
        } catch (error) {
            this.logger.error('File System API save error:', error);
            throw error;
        }
    }

    /**
     * Write data to a file handle
     */
    async _writeFile(fileHandle, data) {
        try {
            const writable = await fileHandle.createWritable();
            await writable.write(data);
            await writable.close();
            this.logger.info('File saved successfully');
            return true;
        } catch (error) {
            this.logger.error('Error writing to file:', error);
            throw error;
        }
    }

    /**
     * Load using File System Access API
     */
    async _loadWithFileSystemAPI(fileName) {
        try {
            const [handle] = await window.showOpenFilePicker({
                multiple: false,
                types: [{
                    description: 'JSON Files',
                    accept: { 'application/json': ['.json'] },
                }],
            });
            
            if (!handle) {
                this.logger.info('No file selected');
                return null;
            }
            
            this.fileHandle = handle;
            const file = await handle.getFile();
            const content = await file.text();
            
            try {
                return JSON.parse(content);
            } catch (parseError) {
                this.logger.error('Failed to parse file content:', parseError);
                throw new Error('Invalid JSON in session file');
            }
        } catch (error) {
            // User likely canceled the open dialog
            if (error.name === 'AbortError') {
                this.logger.info('User cancelled file open');
                return null;
            }
            this.logger.error('File System API load error:', error);
            throw error;
        }
    }

    /**
     * Check if a file exists (Electron only)
     */
    async fileExists(fileName = this.fileName) {
        if (!this.isElectron) {
            throw new Error('File existence check only available in Electron');
        }
        
        return new Promise((resolve) => {
            const filePath = this.path.join(this.os.homedir(), fileName);
            this.fs.access(filePath, this.fs.constants.F_OK, (err) => {
                resolve(!err);
            });
        });
    }

    /**
     * Get the full path to a file, handling different environments
     */
    _getFullPath(fileName) {
        if (this.isElectron) {
            // In Electron, use app data directory
            return this.path.join(this.appDataPath, fileName);
        }
        // In browser, just return the filename
        return fileName;
    }
    
    /**
     * Get the path to the session file
     */
    getSessionFilePath(fileName = this.fileName) {
        return this._getFullPath(fileName);
    }
    
    /**
     * Optimize data before saving
     */
    _optimizeData(data) {
        if (!data || typeof data !== 'object') return data;
        
        // Create a shallow copy to avoid modifying original
        const result = Array.isArray(data) ? [] : {};
        
        for (const [key, value] of Object.entries(data)) {
            // Skip large binary data from being saved
            if (key.endsWith('_data') || key === 'image' || key === 'image_data') {
                continue;
            }
            
            // Recursively process nested objects
            if (value && typeof value === 'object') {
                result[key] = this._optimizeData(value);
            } else {
                result[key] = value;
            }
        }
        
        return result;
    }
    
    /**
     * Process data after loading
     */
    _processLoadedData(data) {
        if (!data) return null;
        
        // Add any post-processing needed after loading
        // For example, rehydrating dates or rebuilding object prototypes
        
        return data;
    }
    
    /**
     * Update write performance metrics
     */
    _updateWriteMetrics(duration) {
        this.metrics.writeCount++;
        this.metrics.lastWriteTime = Date.now();
        
        // Update running average
        this.metrics.avgWriteTime = 
            ((this.metrics.avgWriteTime * (this.metrics.writeCount - 1)) + duration) / 
            this.metrics.writeCount;
        
        this.logger.debug(`Write operation took ${duration.toFixed(2)}ms (avg: ${this.metrics.avgWriteTime.toFixed(2)}ms)`);
    }
    
    /**
     * Update read performance metrics
     */
    _updateReadMetrics(duration) {
        this.metrics.readCount++;
        this.metrics.lastReadTime = Date.now();
        
        // Update running average
        this.metrics.avgReadTime = 
            ((this.metrics.avgReadTime * (this.metrics.readCount - 1)) + duration) / 
            this.metrics.readCount;
        
        this.logger.debug(`Read operation took ${duration.toFixed(2)}ms (avg: ${this.metrics.avgReadTime.toFixed(2)}ms)`);
    }
    
    /**
     * Get storage statistics and metrics
     */
    getStats() {
        return {
            ...this.metrics,
            isElectron: this.isElectron,
            config: this.config
        };
    }
}
