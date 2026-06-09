export const CLOSET_CATEGORIES = [
    "T-Shirt",
    "Hoodie",
    "Sweater",
    "Top",
    "Jeans",
    "Pants",
    "Leggings",
    "Shorts/Skirts",
    "Dress",
    "Footwear",
    "Outerwear",
    "Accessory"
] as const;

export type ClosetCategory = typeof CLOSET_CATEGORIES[number];

const CATEGORY_ALIASES: Record<string, ClosetCategory> = {
    "tee": "T-Shirt",
    "tshirt": "T-Shirt",
    "t-shirt": "T-Shirt",
    "shirt": "T-Shirt",
    "hooded sweatshirt": "Hoodie",
    "pullover hoodie": "Hoodie",
    "jumper": "Sweater",
    "knit": "Sweater",
    "knitwear": "Sweater",
    "jacket": "Outerwear",
    "coat": "Outerwear",
    "blazer": "Outerwear",
    "cardigan": "Outerwear",
    "bottom": "Pants",
    "trousers": "Pants",
    "shorts": "Shorts/Skirts",
    "skirt": "Shorts/Skirts",
    "shorts/skirts": "Shorts/Skirts",
    "shoe": "Footwear",
    "shoes": "Footwear",
    "sneakers": "Footwear",
    "boots": "Footwear",
    "purse": "Accessory",
    "bag": "Accessory",
    "handbag": "Accessory"
};

export function normalizeClosetCategory(category: string): ClosetCategory | string {
    const trimmed = category.trim();
    if (!trimmed) return "";

    const direct = CLOSET_CATEGORIES.find(c => c.toLowerCase() === trimmed.toLowerCase());
    if (direct) return direct;

    return CATEGORY_ALIASES[trimmed.toLowerCase()] || trimmed;
}

export function getCategoryGroup(category: string): "top" | "bottom" | "dress" | "footwear" | "outerwear" | "accessory" | "unknown" {
    const normalized = normalizeClosetCategory(category).toLowerCase();

    if (["t-shirt", "hoodie", "top", "sweater"].includes(normalized)) return "top";
    if (["bottom", "jeans", "pants", "leggings", "shorts", "skirt", "shorts/skirts"].includes(normalized)) return "bottom";
    if (normalized === "dress") return "dress";
    if (normalized === "footwear") return "footwear";
    if (normalized === "outerwear") return "outerwear";
    if (normalized === "bag" || normalized === "accessory") return "accessory";

    return "unknown";
}
