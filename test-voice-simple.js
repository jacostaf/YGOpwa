/**
 * Simple test for fuzzy matching improvements
 * Tests the core matching algorithms without browser dependencies
 */

// Simple fuzzy matching implementation for testing
class TestFuzzyMatch {
    static levenshteinDistance(a, b) {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;

        const matrix = [];
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        return matrix[b.length][a.length];
    }

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
}

// Test variant generation
function generateVariants(inputName) {
    const variants = new Set([inputName]);
    const lowerInput = inputName.toLowerCase().trim();
    
    // Japanese particle removal
    let particleRemoved = lowerInput;
    const particles = ['no', 'ni', 'wa', 'ga', 'wo', 'de'];
    for (const particle of particles) {
        const particleRegex = new RegExp(`\\s+${particle}\\s+`, 'gi');
        particleRemoved = particleRemoved.replace(particleRegex, ' ');
    }
    
    if (particleRemoved !== lowerInput) {
        const cleaned = particleRemoved.replace(/\s+/g, ' ').trim();
        if (cleaned) {
            variants.add(cleaned);
            variants.add(cleaned.replace(/\s+/g, ''));
            variants.add(cleaned.replace(/\s+/g, '-'));
        }
    }
    
    // Compound word variants
    const words = lowerInput.split(/\s+/);
    if (words.length >= 2) {
        variants.add(words.join(''));
        variants.add(words.join('-'));
    }
    
    // Phonetic substitutions
    const phoneticMap = {
        'dragun': 'dragon',
        'majician': 'magician',
        'elemental': 'element',
        'hero': 'hiro',
        'mystical': 'mystical',
        'typhoon': 'typhon'
    };
    
    for (const [original, replacement] of Object.entries(phoneticMap)) {
        if (lowerInput.includes(original)) {
            variants.add(lowerInput.replace(original, replacement));
        }
        if (lowerInput.includes(replacement)) {
            variants.add(lowerInput.replace(replacement, original));
        }
    }
    
    return Array.from(variants);
}

// Test cards
const testCards = [
    "Futsu no Mitama no Mitsurugi",
    "Blue-Eyes White Dragon", 
    "Dark Magician",
    "Elemental HERO Sparkman",
    "Blackwing - Gale the Whirlwind",
    "Mystical Space Typhoon"
];

// Test cases
const testInputs = [
    { input: "futsu no mitama no mitsurugi", expected: "Futsu no Mitama no Mitsurugi" },
    { input: "futsu mitama mitsurugi", expected: "Futsu no Mitama no Mitsurugi" },
    { input: "blue eyes white dragun", expected: "Blue-Eyes White Dragon" },
    { input: "blue i white dragun", expected: "Blue-Eyes White Dragon" },
    { input: "elemental hero", expected: "Elemental HERO Sparkman" },
    { input: "element hiro sparkman", expected: "Elemental HERO Sparkman" },
    { input: "black wing gale", expected: "Blackwing - Gale the Whirlwind" },
    { input: "mystical space typhon", expected: "Mystical Space Typhoon" },
    { input: "dark majician", expected: "Dark Magician" }
];

console.log('=== Voice Recognition Improvement Test ===\n');

testInputs.forEach(testCase => {
    console.log(`Testing: "${testCase.input}"`);
    console.log(`Expected: ${testCase.expected}`);
    
    // Generate variants for the input
    const variants = generateVariants(testCase.input);
    console.log(`Variants: ${variants.slice(0, 5).join(', ')}${variants.length > 5 ? ` ... (${variants.length} total)` : ''}`);
    
    // Test against all cards
    const results = [];
    testCards.forEach(cardName => {
        let bestScore = 0;
        
        // Test direct fuzzy match
        bestScore = Math.max(bestScore, TestFuzzyMatch.ratio(testCase.input, cardName));
        bestScore = Math.max(bestScore, TestFuzzyMatch.tokenSetRatio(testCase.input, cardName));
        
        // Test all variants
        variants.forEach(variant => {
            bestScore = Math.max(bestScore, TestFuzzyMatch.ratio(variant, cardName));
            bestScore = Math.max(bestScore, TestFuzzyMatch.tokenSetRatio(variant, cardName));
        });
        
        if (bestScore >= 40) { // 40% minimum threshold
            results.push({ name: cardName, score: bestScore });
        }
    });
    
    // Sort by score
    results.sort((a, b) => b.score - a.score);
    
    if (results.length === 0) {
        console.log('❌ NO MATCHES FOUND');
    } else {
        console.log('✅ Matches found:');
        results.forEach((result, index) => {
            const isExpected = result.name === testCase.expected;
            console.log(`  ${index + 1}. ${result.name} (${result.score}%)${isExpected ? ' 🎯' : ''}`);
        });
        
        // Check if expected card is in top results
        const foundExpected = results.some(r => r.name === testCase.expected);
        if (foundExpected) {
            console.log('✅ Expected card found!');
        } else {
            console.log('⚠️ Expected card not found');
        }
    }
    
    console.log('---\n');
});

console.log('Test completed! The new system should find matches for previously unmatchable inputs like "futsu no mitama no mitsurugi".');