import type { WeatherType } from "@/lib/recommender";

export type WeatherMappingInput = {
    temperatureFahrenheit: number;
    conditionText?: string;
    precipitationInches?: number;
    rainChanceNextHours?: number[];
    snowChanceNextHours?: number[];
}

const rainyTerms = [
    "rain",
    "drizzle",
    "thunder",
    "shower",
    "sleet"
];

const snowyTerms = [
    "snow",
    "blizzard",
    "ice",
    "freezing",
    "freezing rain"
];

export function mapWeatherToCategory(input: WeatherMappingInput): WeatherType {
    const condition = (input.conditionText || "").toLowerCase();
    const rainChance = input.rainChanceNextHours || [];
    const snowChance = input.snowChanceNextHours || [];

    if (
        snowChance.some(chance => chance >= 50) ||
        snowyTerms.some(term => condition.includes(term))
    ) {
        return "Snowy";
    }

    if (
        (input.precipitationInches || 0) > 0 ||
        rainChance.some(chance => chance >= 50) ||
        rainyTerms.some(term => condition.includes(term))
    ) {
        return "Rainy";
    }

    if (input.temperatureFahrenheit < 50) {
        return "Cold";
    }

    if (input.temperatureFahrenheit > 75) {
        return "Warm";
    }

    return "Sunny";
}

export function getWeatherBadgeIcon(category: WeatherType): string {
    if (category === "Rainy") return "🌧";
    if (category === "Snowy") return "❄️";
    if (category === "Cold") return "🧥";
    if (category === "Warm") return "🌤";
    return "☀️";
}
