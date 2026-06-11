import { Item } from "@/types";
import { getCategoryGroup, normalizeClosetCategory } from "@/lib/categories";

const genericNames = new Set([
    "",
    "item",
    "clothing",
    "top",
    "bottom",
    "footwear",
    "outerwear",
    "accessory"
]);

export function getDisplayItemName(item: Item): string {
    const rawName = (item.name || "").trim();
    const normalizedName = rawName.toLowerCase();

    if (rawName && !genericNames.has(normalizedName)) {
        return rawName;
    }

    const color = getDisplayColor(item.color);
    const specificType = getSpecificItemType(item);

    return [color, specificType].filter(Boolean).join(" ") || getDisplayCategory(item);
}

export function getDisplayCategory(item: Item | string): string {
    const category = typeof item === "string" ? item : item.category;
    const normalized = normalizeClosetCategory(category || "");

    if (!normalized) return "Uncategorized";
    if (normalized === "Shorts/Skirts") return "Shorts / Skirts";
    return normalized;
}

export function getDisplayColor(color?: string | null): string {
    const value = (color || "").trim();
    if (!value) return "Unknown color";

    const normalized = value.toLowerCase();
    if (normalized === "multicolor" || normalized === "multi-color") return "Multi-tone";
    return value;
}

export function formatStyleLabel(style?: string | null): string {
    const value = (style || "").trim();
    if (!value) return "Unstyled";
    if (value.toLowerCase() === "sporty / athleisure") return "Sporty / Athleisure";
    if (value.toLowerCase() === "party / dressy") return "Party / Dressy";
    return value;
}

export function formatWeatherLabel(weather?: string | null): string {
    return (weather || "").trim() || "Any weather";
}

export function getBroadCategoryLabel(category?: string | null): string {
    const group = getCategoryGroup(category || "");
    if (group === "top") return "Upper Body";
    if (group === "bottom") return "Bottoms";
    if (group === "dress") return "Dress";
    if (group === "footwear") return "Footwear";
    if (group === "outerwear") return "Outerwear";
    if (group === "accessory") return "Accessory";
    return "Other";
}

function getSpecificItemType(item: Item): string {
    const text = `${item.name || ""} ${item.category || ""} ${(item.tags || []).join(" ")} ${item.description || ""}`.toLowerCase();

    const candidates = [
        "running shoes",
        "sneakers",
        "boots",
        "heels",
        "loafers",
        "sandals",
        "flats",
        "blazer",
        "coat",
        "jacket",
        "dress",
        "jeans",
        "skirt",
        "shorts",
        "leggings",
        "hoodie",
        "sweater",
        "t-shirt"
    ];

    const match = candidates.find(candidate => text.includes(candidate));
    if (match) return titleCase(match);

    return getDisplayCategory(item);
}

function titleCase(value: string): string {
    return value.replace(/\w\S*/g, word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}
