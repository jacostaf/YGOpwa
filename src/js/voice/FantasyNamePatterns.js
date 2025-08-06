/**
 * FantasyNamePatterns - Comprehensive Pattern Database for Yu-Gi-Oh Fantasy Names
 * 
 * Contains extensive pattern mappings for Yu-Gi-Oh card names including:
 * - Japanese romanization patterns
 * - Archetype-specific patterns
 * - Monster type patterns
 * - Spell/Trap patterns
 * - Popular card-specific patterns
 */

export const FANTASY_NAME_PATTERNS = {
    version: '2.0',
    lastUpdated: '2025-01-08',
    
    // Japanese romanization with common Western mispronunciations
    japanese: {
        // Long vowels and common romanization variants
        'ou|oo|ow': 'ou',      // 王 (ou - king)
        'uu|u:|oou': 'uu',     // Long u sounds
        'ei|ay|ey': 'ei',      // エイ sounds
        'ai|eye|ay': 'ai',     // アイ sounds
        
        // Common Japanese name components
        'ryuu|ryu|rew|roo': 'ryu',        // 龍 (dragon)
        'jin|jin|gin': 'jin',             // 人 (person)
        'kai|kye|ky|khy': 'kai',          // 界 (world)
        'shou|sho|show': 'sho',           // 将 (general)
        'shin|shinn|seen': 'shin',        // 真 (true)
        'sen|senn|san': 'sen',            // 千 (thousand)
        'ten|tenn|tan': 'ten',            // 天 (heaven)
        'dou|do|doo': 'dou',              // 道 (way)
        'kou|ko|kow': 'kou',              // 光 (light)
        'rei|ray|rai': 'rei',            // 霊 (spirit)
        'sei|say|sai': 'sei',            // 星 (star)
        'mai|my|may': 'mai',              // 舞 (dance)
        'dai|dye|dy': 'dai',              // 大 (great)
        'mon|mun|men': 'mon',             // 門 (gate)
        'geki|gaky|geky': 'geki',         // 激 (intense)
        
        // Specific problematic Japanese words
        'kuriboh|curiboh|kuribo': 'kuriboh',
        'ojama|ojamma|ohama': 'ojama',
        'gagaga|gagagaga': 'gagaga',
        'utopia|eutopia': 'utopia',
        'kaiju|kyju|kaijuu': 'kaiju',
        'shiranui|shiranuy': 'shiranui',
        'ghostrick|ghostrik': 'ghostrick'
    },
    
    // Archetype patterns with common mispronunciations
    archetypes: {
        // Classic archetypes
        'blue\\s*[aiyeY]*\\s*eye[sd]?|blew\\s*[aiyeY]*\\s*eye[sd]?': 'blue-eyes',
        'red\\s*[aiyeY]*\\s*eye[sd]?|rad\\s*[aiyeY]*\\s*eye[sd]?': 'red-eyes',
        'dark\\s*maj?[aeiou]*[sc]h?[aeiou]*n': 'dark magician',
        'cyber\\s*dragon|syber\\s*dragon|ciber\\s*dragon': 'cyber dragon',
        
        // Elemental Heroes variants
        'element[a-z]*\\s*hero|elemint\\s*hero': 'elemental hero',
        'destiny\\s*hero|desteny\\s*hero': 'destiny hero',
        'vision\\s*hero|vishun\\s*hero': 'vision hero',
        'evil\\s*hero|evyl\\s*hero': 'evil hero',
        'masked\\s*hero|maskd\\s*hero': 'masked hero',
        
        // Modern archetypes
        'sky\\s*striker|sky\\s*stryker': 'sky striker',
        'salamangreat|salamangraet|salamangret': 'salamangreat',
        'altergeist|alterguyst|altergeyst': 'altergeist',
        'world\\s*legacy|world\\s*legasy': 'world legacy',
        'mekk\\s*knight|mek\\s*knight|meck\\s*knight': 'mekk-knight',
        'tri\\s*brigade|try\\s*brigade': 'tri-brigade',
        'drytron|drytryn|drytrun': 'drytron',
        'eldlich|eldlitch|eldlick': 'eldlich',
        'virtual\\s*world|virtuel\\s*world': 'virtual world',
        
        // GX Era archetypes
        'crystal\\s*beast|cristal\\s*beast': 'crystal beast',
        'gladiator\\s*beast|gladiater\\s*beast': 'gladiator beast',
        'ancient\\s*gear|anchient\\s*gear': 'ancient gear',
        'volcanic|volcanik|volkanic': 'volcanic',
        'gem\\s*knight|gem\\s*night': 'gem-knight',
        
        // 5Ds Era archetypes
        'blackwing|black\\s*wing|blakwing': 'blackwing',
        'lightsworn|light\\s*sworn|litesorn': 'lightsworn',
        'six\\s*samurai|6\\s*samurai|siks\\s*samurai': 'six samurai',
        'synchro|sinkro|sychro': 'synchro',
        
        // Zexal Era archetypes
        'odd\\s*eyes|od\\s*eyes': 'odd-eyes',
        'performapal|performappal|preformapal': 'performapal',
        'pendulum\\s*magician|pendulum\\s*majician': 'pendulum magician',
        'xyz|ex\\s*y\\s*z|exsees': 'xyz',
        
        // Arc-V Era archetypes
        'burning\\s*abyss|burning\\s*abys': 'burning abyss',
        'shaddoll|shadoll|shaddol': 'shaddoll',
        'qliphort|qliphorth|cliport': 'qliphort',
        'nekroz|nekros|necros': 'nekroz',
        'ritual\\s*beast|rituall\\s*beast': 'ritual beast',
        
        // Vrains Era archetypes
        'trickstar|trikstar|trickstrar': 'trickstar',
        'gouki|goki|goky': 'gouki',
        'firewall|firwall|firewal': 'firewall',
        'knightmare|nightmar|knightmair': 'knightmare'
    },
    
    // Monster types with common mispronunciations
    monsterTypes: {
        // Basic types
        'dragun|dragon|dragan|dragoon|dracon': 'dragon',
        'maj?i[sc]h?i[ea]n|magition|magishun|magicain': 'magician',
        'warrior|warior|warier|warrier': 'warrior',
        'spellcaster|spelcaster|spellcster': 'spellcaster',
        'zombie|zomby|zombe': 'zombie',
        'machine|machien|masheen': 'machine',
        'fiend|feind|fynd': 'fiend',
        'beast|beest|biest': 'beast',
        'winged\\s*beast|wingd\\s*beast': 'winged beast',
        'sea\\s*serpent|see\\s*serpent': 'sea serpent',
        'dinosaur|dynosore|dinasaur': 'dinosaur',
        'fish|fich|fysh': 'fish',
        'aqua|akwa|aqua': 'aqua',
        'pyro|piro|pyro': 'pyro',
        'thunder|thundr|tunder': 'thunder',
        'rock|rok|roc': 'rock',
        'plant|plent|plantt': 'plant',
        'insect|insekt|incect': 'insect',
        'reptile|reptyl|reptile': 'reptile',
        'psychic|psycic|psyhic': 'psychic',
        'divine|divien|devien': 'divine beast',
        'creator\\s*god|creater\\s*god': 'creator god',
        'wyrm|wurm|worm': 'wyrm',
        'cyberse|cybors|syberse': 'cyberse'
    },
    
    // Spell/Trap types
    spellTrapTypes: {
        'spell|spel|spehl': 'spell',
        'trap|trep|tarp': 'trap',
        'quick\\s*play|quik\\s*play|quick\\s*ply': 'quick-play',
        'continuous|continuus|continyus': 'continuous',
        'equip|equyp|ekwip': 'equip',
        'field|feeld|fild': 'field',
        'ritual|rituall|rituel': 'ritual',
        'counter|countr|kounter': 'counter',
        'normal|normall|normel': 'normal'
    },
    
    // Rarity patterns
    rarities: {
        'common|comun|comon': 'common',
        'rare|raer|rair': 'rare',
        'super\\s*rare|supr\\s*rare|super\\s*raer': 'super rare',
        'ultra\\s*rare|ultr\\s*rare|ultra\\s*raer': 'ultra rare',
        'secret\\s*rare|secrt\\s*rare|secret\\s*raer': 'secret rare',
        'ultimate\\s*rare|ultimet\\s*rare|ultimate\\s*raer': 'ultimate rare',
        'ghost\\s*rare|goast\\s*rare|ghost\\s*raer': 'ghost rare',
        'starlight\\s*rare|starlit\\s*rare|star\\s*light\\s*rare': 'starlight rare',
        'collector\\s*rare|collectr\\s*rare|collector\\s*raer': 'collector rare',
        'prismatic\\s*secret|prismatik\\s*secret': 'prismatic secret rare',
        'gold\\s*rare|gld\\s*rare': 'gold rare',
        'platinum\\s*rare|platnum\\s*rare': 'platinum rare'
    },
    
    // Specific popular cards with multiple pronunciation variants
    popularCards: {
        // Egyptian God Cards
        'slifer\\s*the\\s*sky\\s*dragon|slyfer|slyfr': 'slifer the sky dragon',
        'obelisk\\s*the\\s*tormentor|obelisk|obelik|obelisk\\s*tormentr': 'obelisk the tormentor',
        'winged\\s*dragon\\s*of\\s*ra|ra\\s*the\\s*winged|wingd\\s*dragon\\s*ra': 'winged dragon of ra',
        
        // Classic staples
        'pot\\s*of\\s*greed|pot\\s*greed|pot\\s*of\\s*green': 'pot of greed',
        'mirror\\s*force|miror\\s*force|mirr\\s*force': 'mirror force',
        'mystical\\s*space\\s*typhoon|mistical\\s*space\\s*tyfoon|mst': 'mystical space typhoon',
        'heavy\\s*storm|hevy\\s*storm|heavy\\s*storn': 'heavy storm',
        'raigeki|rygeki|raygeki|ryu\\s*jin': 'raigeki',
        'harpie\\s*feather\\s*duster|harpy\\s*feather\\s*dustr|harpie\\s*duster': 'harpies feather duster',
        
        // Popular boss monsters
        'exodia\\s*the\\s*forbidden\\s*one|exodea|exodia|exodya': 'exodia the forbidden one',
        'thousand\\s*dragon|thousend\\s*dragon|1000\\s*dragon': 'thousand dragon',
        'summoned\\s*skull|summond\\s*skull|summend\\s*skull': 'summoned skull',
        'jinzo|ginzo|jinso|jynzo': 'jinzo',
        'elemental\\s*hero\\s*sparkman|elemint\\s*hero\\s*sparkmen': 'elemental hero sparkman',
        'stardust\\s*dragon|stardust\\s*dragun|star\\s*dust\\s*dragon': 'stardust dragon',
        
        // Modern meta cards
        'ash\\s*blossom|ash\\s*blosom|ash\\s*blosm': 'ash blossom & joyous spring',
        'effect\\s*veiler|efect\\s*veilr|efekt\\s*veiler': 'effect veiler',
        'mulcharmy\\s*purulia|mulcharmie\\s*purulia|mulcharmi\\s*purulia|mulcharmy\\s*perolia|mulcharmy\\s*purolia': 'mulcharmy purulia',
        'maxx\\s*c|max\\s*c|maks\\s*c': 'maxx "c"',
        'infinite\\s*impermanence|infinit\\s*impermanenc|infinite\\s*imperminence': 'infinite impermanence',
        'called\\s*by\\s*the\\s*grave|cald\\s*by\\s*the\\s*grav': 'called by the grave',
        'nibiru\\s*the\\s*primal\\s*being|niburu|nibiru': 'nibiru, the primal being'
    },
    
    // Number patterns (for card numbers in names)
    numbers: {
        'one|won|1': '1',
        'two|too|to|2': '2', 
        'three|tree|3': '3',
        'four|fore|for|4': '4',
        'five|fyv|5': '5',
        'six|siks|6': '6',
        'seven|sevn|7': '7',
        'eight|ayt|8': '8',
        'nine|nyn|9': '9',
        'ten|10': '10',
        'thousand|thousend|1000': '1000',
        'hundred|hundrd|100': '100'
    },
    
    // Attribute patterns
    attributes: {
        'light|lite|lyt': 'light',
        'dark|darc|drk': 'dark',
        'fire|fyr|fir': 'fire',
        'water|watr|waer': 'water',
        'earth|erth|earht': 'earth',
        'wind|wynd|windd': 'wind',
        'divine|divyn|divien': 'divine'
    },
    
    // Common adjectives and modifiers
    modifiers: {
        'ancient|anchient|anchant|anshent': 'ancient',
        'master|mastur|mastir|mastr': 'master',
        'supreme|supream|supriem|suprm': 'supreme',
        'ultimate|ultimet|ultimat|ultimit': 'ultimate',
        'legendary|legendery|legendry|legnedary': 'legendary',
        'mystical|mistical|mystycal|mistikal': 'mystical',
        'elemental|elemantal|elemint|elementel': 'elemental',
        'forbidden|forbiden|forbiddn': 'forbidden',
        'sacred|sacrd|sakred': 'sacred',
        'divine|divien|devien': 'divine',
        'infernal|infernl|infurnal': 'infernal',
        'celestial|celestiel|selestial': 'celestial',
        'phantom|fantom|phantm': 'phantom',
        'shadow|shadw|shado': 'shadow',
        'crystal|cristal|crystel': 'crystal',
        'golden|goldin|goldn': 'golden',
        'silver|silvr|silvar': 'silver',
        'platinum|platnum|platinm': 'platinum'
    },
    
    // Common card name prefixes/suffixes that can be removed for better matching
    removePatterns: [
        '\\bthe\\b',       // Articles
        '\\ba\\b',
        '\\ban\\b',
        '\\bof\\b',        // Prepositions
        '\\bin\\b',
        '\\bwith\\b',
        '\\bfrom\\b',
        '\\bmonster\\b',   // Generic terms
        '\\bcard\\b',
        '\\bspell\\b',
        '\\btrap\\b',
        '\\beffect\\b'
    ],
    
    // Cleanup patterns for formatting
    cleanupPatterns: [
        { pattern: /[^\w\s-]/g, replacement: '' },    // Remove special characters except hyphens
        { pattern: /\s+/g, replacement: ' ' },        // Multiple spaces to single
        { pattern: /\s*-\s*/g, replacement: '-' },    // Normalize hyphens
        { pattern: /^\s+|\s+$/g, replacement: '' }    // Trim whitespace
    ]
};

/**
 * Apply fantasy name patterns to normalize text
 * @param {string} text - Input text to normalize
 * @param {Array} categories - Specific categories to apply (optional)
 * @returns {string} Normalized text
 */
export function applyFantasyNamePatterns(text, categories = null) {
    if (!text || typeof text !== 'string') return '';
    
    let normalized = text.toLowerCase().trim();
    const patterns = FANTASY_NAME_PATTERNS;
    
    // Determine which categories to apply
    const categoriesToApply = categories || [
        'japanese', 'archetypes', 'monsterTypes', 'spellTrapTypes', 
        'rarities', 'popularCards', 'numbers', 'attributes', 'modifiers'
    ];
    
    // Apply pattern categories
    for (const category of categoriesToApply) {
        if (patterns[category]) {
            for (const [pattern, replacement] of Object.entries(patterns[category])) {
                const regex = new RegExp(pattern, 'gi');
                normalized = normalized.replace(regex, replacement);
            }
        }
    }
    
    // Remove common unnecessary terms
    if (patterns.removePatterns) {
        for (const pattern of patterns.removePatterns) {
            const regex = new RegExp(pattern, 'gi');
            normalized = normalized.replace(regex, '');
        }
    }
    
    // Apply cleanup patterns
    if (patterns.cleanupPatterns) {
        for (const { pattern, replacement } of patterns.cleanupPatterns) {
            normalized = normalized.replace(pattern, replacement);
        }
    }
    
    return normalized;
}

/**
 * Get pattern statistics
 * @returns {Object} Pattern count statistics
 */
export function getPatternStats() {
    const patterns = FANTASY_NAME_PATTERNS;
    const stats = {};
    
    for (const [category, categoryPatterns] of Object.entries(patterns)) {
        if (typeof categoryPatterns === 'object' && categoryPatterns !== null && !Array.isArray(categoryPatterns)) {
            stats[category] = Object.keys(categoryPatterns).length;
        } else if (Array.isArray(categoryPatterns)) {
            stats[category] = categoryPatterns.length;
        }
    }
    
    const totalPatterns = Object.values(stats).reduce((sum, count) => sum + count, 0);
    
    return {
        ...stats,
        total: totalPatterns,
        version: patterns.version,
        lastUpdated: patterns.lastUpdated
    };
}