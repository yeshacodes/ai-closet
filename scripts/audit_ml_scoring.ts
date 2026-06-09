import { HybridRecommender, Outfit, Preferences, StyleType, WeatherType } from "../src/lib/recommender";
import { Item } from "../src/types";
import { writeFileSync } from "fs";

type OutfitAuditRow = {
    weather: WeatherType;
    style: StyleType;
    mlScore: number;
    ruleScore: number;
    finalScore: number;
    adjustments: {
        rotationPenalty: number;
        weatherPenalty: number;
        feedbackAdjustment: number;
        preferenceAdjustment: number;
        randomAdjustment: number;
        total: number;
    };
    top: string | null;
    bottom: string | null;
    dress: string | null;
    footwear: string;
    outerwear: string | null;
    accessory: string | null;
    features: {
        styleCoverage: number;
        neutralRatio: number;
        hasContrast: number;
        weatherQuality: number;
        hasOuterwear: number;
        isDress: number;
        colorHarmonyQuality: number;
        categoryCompleteness: number;
        weatherSpecificity: number;
        outerwearFit: number;
        recentKeyPenaltySignal: number;
        feedbackPenaltySignal: number;
    };
};

type Stats = {
    min: number;
    max: number;
    mean: number;
    median: number;
    standardDeviation: number;
    p10: number;
    p25: number;
    p75: number;
    p90: number;
};

const weatherTypes: WeatherType[] = ["Sunny", "Rainy", "Cold", "Warm", "Snowy"];
const styleTypes: StyleType[] = ["Casual", "Smart Casual", "Formal", "Party / Dressy", "Sporty / Athleisure", "Streetwear"];
const colors = ["Black", "White", "Navy", "Grey", "Red", "Green", "Purple", "Yellow"];

function seededRandom(seed: number) {
    let state = seed;
    return () => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 0x100000000;
    };
}

function makeItem(id: string, name: string, category: string, color: string, styles: string[], weather: string[], tags: string[] = []): Item {
    return {
        id,
        name,
        category,
        color,
        styles,
        weather,
        tags,
        image_url: "audit://image",
        created_at: "2026-01-01",
        description: "Synthetic audit item",
        style: styles[0] || "Casual"
    };
}

function buildAuditWardrobe(): Item[] {
    const items: Item[] = [];

    for (const style of styleTypes) {
        const slug = style.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");

        weatherTypes.forEach((weather, weatherIndex) => {
            const neutral = colors[weatherIndex % 4];
            const accent = colors[(weatherIndex + 4) % colors.length];

            items.push(makeItem(`${slug}-${weather}-top-1`, `${style} ${weather} Top`, weather === "Cold" ? "Sweater" : "Top", neutral, [style], [weather]));
            items.push(makeItem(`${slug}-${weather}-top-2`, `${style} ${weather} Accent Top`, weather === "Cold" ? "Hoodie" : "T-Shirt", accent, [style], [weather]));
            items.push(makeItem(`${slug}-${weather}-bottom-1`, `${style} ${weather} Pants`, weather === "Warm" || weather === "Sunny" ? "Shorts" : "Pants", neutral, [style], [weather]));
            items.push(makeItem(`${slug}-${weather}-bottom-2`, `${style} ${weather} Jeans`, "Jeans", accent, [style], [weather]));
            items.push(makeItem(`${slug}-${weather}-shoe-1`, `${style} ${weather} Footwear`, weather === "Rainy" || weather === "Snowy" ? "Boots" : "Footwear", neutral, [style], [weather], weather === "Rainy" ? ["waterproof", "rain"] : []));
            items.push(makeItem(`${slug}-${weather}-shoe-2`, `${style} ${weather} Contrast Footwear`, "Footwear", accent, [style], [weather]));
            items.push(makeItem(`${slug}-${weather}-dress`, `${style} ${weather} Dress`, "Dress", weatherIndex % 2 === 0 ? neutral : accent, [style], [weather]));
        });

        items.push(makeItem(`${slug}-allweather-top`, `${style} Legacy Top`, "Top", "Black", [style], []));
        items.push(makeItem(`${slug}-allweather-bottom`, `${style} Legacy Pants`, "Pants", "White", [style], []));
        items.push(makeItem(`${slug}-allweather-shoe`, `${style} Legacy Shoes`, "Footwear", "Grey", [style], []));
    }

    items.push(makeItem("all-cold-coat", "All Styles Winter Coat", "Outerwear", "Black", ["All Styles"], ["Cold", "Snowy"], ["coat"]));
    items.push(makeItem("all-rain-jacket", "All Styles Rain Jacket", "Outerwear", "Navy", ["All Styles"], ["Rainy"], ["waterproof", "rain"]));
    items.push(makeItem("all-umbrella", "Black Umbrella", "Accessory", "Black", ["All Styles"], ["Rainy"], ["umbrella"]));
    items.push(makeItem("all-neutral-bag", "Neutral Crossbody Bag", "Bag", "Brown", ["All Styles"], [], ["bag"]));

    return items;
}

function getOutfitNames(outfit: Outfit) {
    return {
        top: outfit.type === "separates" ? outfit.top.name : null,
        bottom: outfit.type === "separates" ? outfit.bottom.name : null,
        dress: outfit.type === "dress" ? outfit.dress.name : null,
        footwear: outfit.footwear.name,
        outerwear: outfit.outerwear?.name || null,
        accessory: outfit.accessory?.name || null
    };
}

function toAuditRow(outfit: Outfit, preferences: Preferences): OutfitAuditRow {
    const details = outfit.scoringDetails;
    const features = outfit.features || [];
    const adjustments = {
        rotationPenalty: details?.rotationPenalty ?? 0,
        weatherPenalty: details?.weatherPenalty ?? 0,
        feedbackAdjustment: details?.feedbackAdjustment ?? 0,
        preferenceAdjustment: details?.preferenceAdjustment ?? 0,
        randomAdjustment: details?.randomAdjustment ?? 0,
        total: details
            ? details.rotationPenalty + details.weatherPenalty + details.feedbackAdjustment + details.preferenceAdjustment + details.randomAdjustment
            : 0
    };

    return {
        weather: preferences.weather,
        style: preferences.occasion,
        mlScore: details?.mlScorePercent ?? (outfit.mlScore || 0) * 100,
        ruleScore: details?.ruleScorePercent ?? 0,
        finalScore: details?.finalScore ?? outfit.score * 100,
        adjustments,
        ...getOutfitNames(outfit),
        features: {
            styleCoverage: features[0] ?? 0,
            neutralRatio: features[1] ?? 0,
            hasContrast: features[2] ?? 0,
            weatherQuality: features[3] ?? 0,
            hasOuterwear: features[4] ?? 0,
            isDress: features[5] ?? 0,
            colorHarmonyQuality: features[6] ?? 0,
            categoryCompleteness: features[7] ?? 0,
            weatherSpecificity: features[8] ?? 0,
            outerwearFit: features[9] ?? 0,
            recentKeyPenaltySignal: features[10] ?? 0,
            feedbackPenaltySignal: features[11] ?? 0
        }
    };
}

function round(value: number) {
    return Number(value.toFixed(3));
}

function percentile(sortedValues: number[], p: number) {
    if (sortedValues.length === 0) return 0;
    const index = (sortedValues.length - 1) * p;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sortedValues[lower];
    const weight = index - lower;
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

function stats(values: number[]): Stats {
    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / values.length;

    return {
        min: round(sorted[0]),
        max: round(sorted[sorted.length - 1]),
        mean: round(mean),
        median: round(percentile(sorted, 0.5)),
        standardDeviation: round(Math.sqrt(variance)),
        p10: round(percentile(sorted, 0.1)),
        p25: round(percentile(sorted, 0.25)),
        p75: round(percentile(sorted, 0.75)),
        p90: round(percentile(sorted, 0.9))
    };
}

function correlation(a: number[], b: number[]) {
    const meanA = a.reduce((sum, value) => sum + value, 0) / a.length;
    const meanB = b.reduce((sum, value) => sum + value, 0) / b.length;
    let numerator = 0;
    let denomA = 0;
    let denomB = 0;

    for (let i = 0; i < a.length; i++) {
        const da = a[i] - meanA;
        const db = b[i] - meanB;
        numerator += da * db;
        denomA += da ** 2;
        denomB += db ** 2;
    }

    if (denomA === 0 || denomB === 0) return 0;
    return round(numerator / Math.sqrt(denomA * denomB));
}

function pct(count: number, total: number) {
    return round((count / total) * 100);
}

function summarizeCase(row: OutfitAuditRow) {
    return {
        weather: row.weather,
        style: row.style,
        mlScore: round(row.mlScore),
        ruleScore: round(row.ruleScore),
        finalScore: round(row.finalScore),
        adjustments: {
            ...row.adjustments,
            randomAdjustment: round(row.adjustments.randomAdjustment),
            total: round(row.adjustments.total)
        },
        top: row.top,
        bottom: row.bottom,
        dress: row.dress,
        footwear: row.footwear,
        outerwear: row.outerwear,
        features: row.features,
        likelyReason: `Heuristic confidence is driven by styleCoverage=${row.features.styleCoverage}, colorHarmonyQuality=${row.features.colorHarmonyQuality}, weatherQuality=${row.features.weatherQuality}, hasOuterwear=${row.features.hasOuterwear}, and penalty signals recent=${row.features.recentKeyPenaltySignal}/feedback=${row.features.feedbackPenaltySignal}.`
    };
}

function main() {
    const originalRandom = Math.random;
    const originalLog = console.log;
    const originalWarn = console.warn;

    Math.random = seededRandom(20260608);
    console.log = () => undefined;
    console.warn = () => undefined;

    const recommender = new HybridRecommender();
    const wardrobe = buildAuditWardrobe();
    const rows: OutfitAuditRow[] = [];
    const failures: Array<{ weather: WeatherType; style: StyleType; error: string }> = [];

    for (let run = 0; run < 4; run++) {
        for (const weather of weatherTypes) {
            for (const style of styleTypes) {
                const preferences: Preferences = { weather, occasion: style };
                const result = recommender.generateOutfit(wardrobe, preferences);

                if (!result.success || !result.outfits) {
                    failures.push({ weather, style, error: result.error || result.message || "Unknown error" });
                    continue;
                }

                result.outfits.forEach(outfit => rows.push(toAuditRow(outfit, preferences)));
            }
        }
    }

    Math.random = originalRandom;
    console.log = originalLog;
    console.warn = originalWarn;

    const mlScores = rows.map(row => row.mlScore);
    const ruleScores = rows.map(row => row.ruleScore);
    const finalScores = rows.map(row => row.finalScore);

    const report = {
        generatedAt: new Date().toISOString(),
        totalRecommendations: rows.length,
        failedPreferenceRuns: failures,
        pipeline: {
            scoreType: "Deterministic heuristic confidence score using hard-coded weights, not a trained model loaded from data.",
            mlFormula: "clamp(27 + weighted normalized style/color/weather/category features - dress/recent/feedback penalty signals, 0, 100)",
            features: ["styleCoverage", "neutralRatio", "hasContrast", "weatherQuality", "hasOuterwear", "isDress", "colorHarmonyQuality", "categoryCompleteness", "weatherSpecificity", "outerwearFit", "recentKeyPenaltySignal", "feedbackPenaltySignal"]
        },
        statistics: {
            mlScore: stats(mlScores),
            ruleScore: stats(ruleScores),
            finalScore: stats(finalScores)
        },
        compression: {
            mlGreaterThan80Percent: pct(rows.filter(row => row.mlScore > 80).length, rows.length),
            mlGreaterThan90Percent: pct(rows.filter(row => row.mlScore > 90).length, rows.length),
            mlLessThan60Percent: pct(rows.filter(row => row.mlScore < 60).length, rows.length),
            mlRange: round(Math.max(...mlScores) - Math.min(...mlScores))
        },
        correlations: {
            mlScoreToFinalScore: correlation(mlScores, finalScores),
            ruleScoreToFinalScore: correlation(ruleScores, finalScores)
        },
        featureConsistency: {
            hasOuterwearMismatches: rows.filter(row => !!row.outerwear !== Boolean(row.features.hasOuterwear)).length,
            hasOuterwearMismatchPercent: pct(rows.filter(row => !!row.outerwear !== Boolean(row.features.hasOuterwear)).length, rows.length),
            displayedOuterwearCount: rows.filter(row => !!row.outerwear).length,
            featureHasOuterwearCount: rows.filter(row => Boolean(row.features.hasOuterwear)).length
        },
        suspiciousCases: {
            highestMlScores: [...rows].sort((a, b) => b.mlScore - a.mlScore).slice(0, 10).map(summarizeCase),
            lowestMlScores: [...rows].sort((a, b) => a.mlScore - b.mlScore).slice(0, 10).map(summarizeCase),
            highMlPoorRule: rows
                .filter(row => row.mlScore >= 90 && row.ruleScore < 65)
                .sort((a, b) => (b.mlScore - a.mlScore) || (a.ruleScore - b.ruleScore))
                .slice(0, 10)
                .map(summarizeCase),
            highRulePoorMl: rows
                .filter(row => row.ruleScore >= 80 && row.mlScore < 70)
                .sort((a, b) => (b.ruleScore - a.ruleScore) || (a.mlScore - b.mlScore))
                .slice(0, 10)
                .map(summarizeCase)
        },
        rows
    };

    writeFileSync("scripts/ml_scoring_audit_report.json", JSON.stringify(report, null, 2));
    console.log(JSON.stringify({
        reportPath: "scripts/ml_scoring_audit_report.json",
        totalRecommendations: report.totalRecommendations,
        statistics: report.statistics,
        compression: report.compression,
        correlations: report.correlations,
        featureConsistency: report.featureConsistency,
        suspiciousCaseCounts: {
            highestMlScores: report.suspiciousCases.highestMlScores.length,
            lowestMlScores: report.suspiciousCases.lowestMlScores.length,
            highMlPoorRule: report.suspiciousCases.highMlPoorRule.length,
            highRulePoorMl: report.suspiciousCases.highRulePoorMl.length
        },
        failedPreferenceRuns: failures.length
    }, null, 2));
}

main();
