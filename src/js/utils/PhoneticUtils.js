/**
 * Double Metaphone implementation for phonetic matching
 * Based on: https://github.com/words/double-metaphone
 */

/**
 * Constants and helpers
 */
const VOWELS = new Set(['A', 'E', 'I', 'O', 'U', 'Y']);
const SILENT_STARTERS = [
    'GN', 'KN', 'PN', 'WR', 'PS'
];

/**
 * Main Double Metaphone function
 */
export function doubleMetaphone(value) {
    if (typeof value !== 'string' || !value) {
        return ['', ''];
    }

    // Clean and normalize the input
    const string = value.toUpperCase().replace(/[^\u0000-\u007F]/g, '');
    const length = string.length;
    const last = length - 1;
    let index = 0;
    
    // Initialize primary and secondary codes
    let primary = '';
    let secondary = '';
    
    // Handle initial silent letters
    if (SILENT_STARTERS.some(prefix => string.startsWith(prefix))) {
        index += 1;
    }
    
    // Main processing loop
    while (primary.length < 4 && secondary.length < 4 && index < length) {
        const character = string.charAt(index);
        const next = index < last ? string.charAt(index + 1) : '\0';
        const nextNext = index < last - 1 ? string.charAt(index + 2) : '\0';
        
        // Skip non-alphabetic characters
        if (!/[A-Z]/.test(character)) {
            index++;
            continue;
        }
        
        // Handle different starting letters
        switch (character) {
            case 'A':
            case 'E':
            case 'I':
            case 'O':
            case 'U':
            case 'Y':
                // Vowels at the start get 'A' code
                if (index === 0) {
                    primary += 'A';
                    secondary += 'A';
                }
                index++;
                break;
                
            case 'B':
                // B -> B unless at end after M
                primary += 'P';
                secondary += 'P';
                if (next === 'B') index += 2;
                else index++;
                break;
                
            case 'C':
                // Various C sounds
                if (next === 'H') {
                    primary += 'K';
                    secondary += 'K';
                    index += 2;
                } else if (next === 'I' || next === 'E' || next === 'Y') {
                    primary += 'S';
                    secondary += 'S';
                    index += 2;
                } else {
                    primary += 'K';
                    secondary += 'K';
                    index++;
                }
                break;
                
            // Add more cases for other letters...
            // (Full implementation would include all letters)
            
            default:
                // Default: just move to next character
                index++;
        }
    }
    
    // Ensure codes are max 4 characters
    return [
        primary.substring(0, 4),
        secondary.substring(0, 4) || primary.substring(0, 4)
    ];
}

/**
 * Get all phonetic codes for a string (primary and secondary)
 */
export function getPhoneticCodes(value) {
    const [primary, secondary] = doubleMetaphone(value);
    const codes = new Set([primary]);
    
    if (secondary && secondary !== primary) {
        codes.add(secondary);
    }
    
    return Array.from(codes);
}

/**
 * Calculate phonetic similarity between two strings (0-1)
 */
export function phoneticSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    if (str1 === str2) return 1;
    
    const codes1 = getPhoneticCodes(str1);
    const codes2 = getPhoneticCodes(str2);
    
    // Check for any matching codes
    for (const code1 of codes1) {
        for (const code2 of codes2) {
            if (code1 === code2) return 1;
            
            // Check for partial matches
            const minLength = Math.min(code1.length, code2.length);
            if (minLength >= 2) {
                if (code1.startsWith(code2) || code2.startsWith(code1)) {
                    return 0.8;
                }
                
                // Check for common prefixes
                for (let i = 2; i <= minLength; i++) {
                    if (code1.substring(0, i) === code2.substring(0, i)) {
                        return 0.5 + (i * 0.1);
                    }
                }
            }
        }
    }
    
    return 0;
}
