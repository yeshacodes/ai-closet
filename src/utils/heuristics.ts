export interface PredictionResult {
    name?: string;
    category?: string;
    styles?: string[];
    color?: string;
    confidence: number;
}

const CATEGORIES = {
    "Top": ["shirt", "t-shirt", "blouse", "sweater", "top", "tee", "tank", "cardigan", "vest"],
    "Bottom": ["jeans", "pants", "trousers", "leggings", "joggers", "sweatpants", "bottom"],
    "Dress": ["dress", "gown", "frock", "jumpsuit", "romper", "one-piece"],
    "Shorts/Skirts": ["skirt", "shorts", "mini", "midi", "maxi", "skort", "bermuda"],
    "Footwear": ["shoes", "sneakers", "boots", "sandals", "heels", "flats", "loafers", "trainers", "slippers"],
    "Outerwear": ["coat", "jacket", "parka", "raincoat", "windbreaker", "blazer", "hoodie"],
    "Accessory": ["hat", "cap", "scarf", "gloves", "belt", "bag", "purse", "wallet", "sunglasses", "jewelry", "watch"]
};

// Multi-select styles mapping
const STYLE_KEYWORDS: Record<string, string[]> = {
    "Casual": ["t-shirt", "jeans", "sneakers", "hoodie", "sweatpants", "leggings", "casual", "everyday", "denim", "tee"],
    "Smart Casual": ["polo", "chinos", "loafer", "blazer", "shirt", "knit", "sweater", "cardigan"],
    "Formal": ["suit", "trousers", "dress shirt", "formal", "business", "office", "tie", "blazer", "oxford"],
    "Party / Dressy": ["dress", "gown", "skirt", "heels", "blouse", "party", "evening", "sequin", "silk", "satin", "cocktail"],
    "Sporty / Athleisure": ["activewear", "gym", "running", "yoga", "sports", "trainers", "joggers", "tracksuit", "leggings", "athletic", "sneakers", "shorts"],
    "Streetwear": ["oversized", "graphic", "street", "urban", "cargo", "bomber", "hoodie", "sneakers", "baggy"]
};

const COLORS = ["Black", "White", "Blue", "Red", "Green", "Yellow", "Pink", "Purple", "Beige", "Grey", "Brown", "Orange", "Navy", "Maroon", "Teal", "Olive"];

export function predictItemDetails(filename: string, itemName: string, currentCategory?: string): PredictionResult {
    const searchString = `${filename} ${itemName}`.toLowerCase();
    const result: PredictionResult = { confidence: 0, styles: [] };

    // 1. Predict Category
    if (currentCategory && currentCategory !== "") {
        result.category = currentCategory;
        result.confidence = 1.0;
    } else {
        for (const [cat, keywords] of Object.entries(CATEGORIES)) {
            if (keywords.some(k => searchString.includes(k))) {
                result.category = cat;
                result.confidence = 0.7;
                break;
            }
        }
    }

    // 2. Predict Color
    for (const color of COLORS) {
        if (searchString.includes(color.toLowerCase())) {
            result.color = color;
            result.confidence = Math.max(result.confidence, 0.8);
            break;
        }
    }

    // 3. Predict Styles (Multi-select)
    const detectedStyles = new Set<string>();
    for (const [style, keywords] of Object.entries(STYLE_KEYWORDS)) {
        if (keywords.some(k => searchString.includes(k))) {
            detectedStyles.add(style);
        }
    }
    if (detectedStyles.size > 0) {
        result.styles = Array.from(detectedStyles);
        result.confidence = Math.max(result.confidence, 0.6);
    }

    // 4. Predict Name (if empty)
    if (!itemName && result.color && result.category) {
        let garment = result.category;
        const allKeywords = Object.values(CATEGORIES).flat();
        const match = allKeywords.find(k => searchString.includes(k));
        if (match) {
            garment = match.charAt(0).toUpperCase() + match.slice(1);
        }

        result.name = `${result.color} ${garment}`;
        result.confidence = Math.max(result.confidence, 0.5);
    }

    // Adjust confidence
    let fieldsFilled = 0;
    if (result.category) fieldsFilled++;
    if (result.color) fieldsFilled++;
    if (result.styles && result.styles.length > 0) fieldsFilled++;

    if (fieldsFilled === 0) {
        result.confidence = 0;
    } else if (fieldsFilled >= 2) {
        result.confidence = Math.max(result.confidence, 0.85);
    }

    return result;
}
