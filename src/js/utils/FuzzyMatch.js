/**
 * Fuzzy String Matching Utility
 * 
 * Provides fuzzy string matching capabilities similar to Python's fuzzywuzzy
 * for voice recognition of fantasy card names.
 */

export class FuzzyMatch {
    constructor() {
        this.logger = null;
    }

    /**
     * Calculate the Levenshtein distance between two strings
     */
    static levenshteinDistance(a, b) {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;

        const matrix = [];

        // Initialize matrix
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }

        // Fill in the matrix
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        matrix[i][j - 1] + 1,     // insertion
                        matrix[i - 1][j] + 1      // deletion
                    );
                }
            }
        }

        return matrix[b.length][a.length];
    }

    /**
     * Calculate similarity ratio between two strings (0-100)
     */
    static ratio(a, b) {
        if (!a || !b) return 0;
        
        a = a.toLowerCase().trim();
        b = b.toLowerCase().trim();
        
        if (a === b) return 100;
        
        const maxLen = Math.max(a.length, b.length);
        if (maxLen === 0) return 100;
        
        const distance = this.levenshteinDistance(a, b);
        return Math.round((1 - distance / maxLen) * 100);
    }

    /**
     * Partial ratio - finds best matching substring
     */
    static partialRatio(a, b) {
        if (!a || !b) return 0;
        
        a = a.toLowerCase().trim();
        b = b.toLowerCase().trim();
        
        if (a === b) return 100;
        
        const shorter = a.length <= b.length ? a : b;
        const longer = a.length > b.length ? a : b;
        
        let bestRatio = 0;
        
        // Try all possible substrings of the longer string
        for (let i = 0; i <= longer.length - shorter.length; i++) {
            const substr = longer.substring(i, i + shorter.length);
            const ratio = this.ratio(shorter, substr);
            bestRatio = Math.max(bestRatio, ratio);
        }
        
        return bestRatio;
    }

    /**
     * Token sort ratio - compares sorted tokens
     */
    static tokenSortRatio(a, b) {
        if (!a || !b) return 0;
        
        const tokensA = a.toLowerCase().trim().split(/\s+/).sort().join(' ');
        const tokensB = b.toLowerCase().trim().split(/\s+/).sort().join(' ');
        
        return this.ratio(tokensA, tokensB);
    }

    /**
     * Token set ratio - compares intersection and remainders
     */
    static tokenSetRatio(a, b) {
        if (!a || !b) return 0;
        
        const tokensA = new Set(a.toLowerCase().trim().split(/\s+/));
        const tokensB = new Set(b.toLowerCase().trim().split(/\s+/));
        
        const intersection = new Set([...tokensA].filter(x => tokensB.has(x)));
        const diffA = new Set([...tokensA].filter(x => !tokensB.has(x)));
        const diffB = new Set([...tokensB].filter(x => !tokensA.has(x)));
        
        const intersectionStr = Array.from(intersection).sort().join(' ');
        const diffAStr = Array.from(diffA).sort().join(' ');
        const diffBStr = Array.from(diffB).sort().join(' ');
        
        const t0 = intersectionStr;
        const t1 = (intersectionStr + ' ' + diffAStr).trim();
        const t2 = (intersectionStr + ' ' + diffBStr).trim();
        
        const ratios = [
            this.ratio(t0, t1),
            this.ratio(t0, t2),
            this.ratio(t1, t2)
        ];
        
        return Math.max(...ratios);
    }

    /**
     * Comprehensive fuzzy matching (similar to fuzzywuzzy.fuzz.WRatio)
     */
    static weightedRatio(a, b) {
        if (!a || !b) return 0;
        
        const ratios = [
            this.ratio(a, b),
            this.partialRatio(a, b),
            this.tokenSortRatio(a, b),
            this.tokenSetRatio(a, b)
        ];
        
        // Weight the ratios - token set ratio is most important for card names
        const weights = [0.2, 0.3, 0.2, 0.3];
        let weightedScore = 0;
        
        for (let i = 0; i < ratios.length; i++) {
            weightedScore += ratios[i] * weights[i];
        }
        
        return Math.round(weightedScore);
    }

    /**
     * Find best matches from a list of choices
     */
    static extractBest(query, choices, limit = 5, minScore = 50) {
        if (!query || !Array.isArray(choices)) return [];
        
        const results = choices.map(choice => {
            const text = typeof choice === 'string' ? choice : choice.name || choice.text || String(choice);
            const score = this.weightedRatio(query, text);
            
            return {
                match: text,
                score: score,
                originalChoice: choice
            };
        })
        .filter(result => result.score >= minScore)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
        
        return results;
    }
}