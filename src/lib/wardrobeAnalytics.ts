import { Item } from "@/types";
import { OutfitHistoryRow, getHistoryItems } from "@/lib/outfitHistory";
import { getDisplayCategory, getDisplayColor, getDisplayItemName, formatStyleLabel } from "@/lib/itemDisplay";

export type AnalyticsMetric = {
    label: string;
    count: number;
}

export type WardrobeAnalytics = {
    mostWornColors: AnalyticsMetric[];
    mostWornCategories: AnalyticsMetric[];
    mostWornFootwear: AnalyticsMetric[];
    mostWornStyles: AnalyticsMetric[];
    wardrobeUtilizationPercent: number;
    uniqueItemsWorn: number;
    totalWardrobeItems: number;
}

export function buildWardrobeAnalytics(rows: OutfitHistoryRow[], wardrobeItems: Item[]): WardrobeAnalytics {
    const itemMap = new Map(wardrobeItems.map(item => [item.id, item]));
    const wornItemIds = new Set<string>();
    const colorCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};
    const footwearCounts: Record<string, number> = {};
    const styleCounts: Record<string, number> = {};

    const add = (bucket: Record<string, number>, key?: string | null) => {
        if (!key) return;
        bucket[key] = (bucket[key] || 0) + 1;
    };

    for (const row of rows) {
        add(styleCounts, row.style);

        for (const item of getHistoryItems(row, itemMap)) {
            wornItemIds.add(item.id);
            add(colorCounts, getDisplayColor(item.color));
            add(categoryCounts, getDisplayCategory(item));

            if (item.id === row.footwear_id) {
                add(footwearCounts, getDisplayItemName(item));
            }
        }
    }

    const utilization = wardrobeItems.length > 0
        ? (wornItemIds.size / wardrobeItems.length) * 100
        : 0;

    return {
        mostWornColors: topMetrics(colorCounts),
        mostWornCategories: topMetrics(categoryCounts),
        mostWornFootwear: topMetrics(footwearCounts),
        mostWornStyles: topMetrics(Object.fromEntries(
            Object.entries(styleCounts).map(([style, count]) => [formatStyleLabel(style), count])
        )),
        wardrobeUtilizationPercent: Number(utilization.toFixed(1)),
        uniqueItemsWorn: wornItemIds.size,
        totalWardrobeItems: wardrobeItems.length
    };
}

function topMetrics(counts: Record<string, number>, limit = 5): AnalyticsMetric[] {
    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([label, count]) => ({ label, count }));
}
