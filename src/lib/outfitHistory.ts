import { Item } from "@/types";
import { supabase } from "@/lib/supabase";
import { Outfit, Preferences, WearHistoryContext } from "@/lib/recommender";
import type { ActiveUserScope } from "@/lib/sessionMode";
import { getScopedInsertData, scopedDelete, scopedSelect } from "@/lib/dataScope";

export type OutfitHistoryRow = {
    id: string;
    user_id: string | null;
    is_demo?: boolean | null;
    outfit_id: string | null;
    top_id: string | null;
    bottom_id: string | null;
    dress_id: string | null;
    footwear_id: string | null;
    outerwear_id: string | null;
    weather: string;
    style: string;
    worn_at: string;
    created_at: string;
}

export type OutfitHistoryPayload = {
    user_id?: string | null;
    outfit_id: string;
    top_id?: string | null;
    bottom_id?: string | null;
    dress_id?: string | null;
    footwear_id: string;
    outerwear_id?: string | null;
    weather: string;
    style: string;
    worn_at?: string;
}

export function getOutfitItemIds(outfit: Outfit): string[] {
    const ids = [outfit.footwear.id];

    if (outfit.type === "separates") {
        ids.push(outfit.top.id, outfit.bottom.id);
    } else {
        ids.push(outfit.dress.id);
    }

    if (outfit.outerwear) ids.push(outfit.outerwear.id);
    return ids;
}

export function getOutfitCombinationId(outfit: Outfit): string {
    return getOutfitItemIds(outfit).sort().join("|");
}

export function buildOutfitHistoryPayload(
    outfit: Outfit,
    preferences: Pick<Preferences, "weather" | "occasion">
): OutfitHistoryPayload {
    return {
        outfit_id: getOutfitCombinationId(outfit),
        top_id: outfit.type === "separates" ? outfit.top.id : null,
        bottom_id: outfit.type === "separates" ? outfit.bottom.id : null,
        dress_id: outfit.type === "dress" ? outfit.dress.id : null,
        footwear_id: outfit.footwear.id,
        outerwear_id: outfit.outerwear?.id || null,
        weather: preferences.weather,
        style: preferences.occasion,
        worn_at: new Date().toISOString()
    };
}

export async function fetchOutfitHistory(limit = 100, scope?: ActiveUserScope): Promise<OutfitHistoryRow[]> {
    const query = scope
        ? scopedSelect("outfit_history", scope).order("worn_at", { ascending: false }).limit(limit)
        : supabase.from("outfit_history").select("*").order("worn_at", { ascending: false }).limit(limit);
    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as OutfitHistoryRow[];
}

export async function saveOutfitHistory(payload: OutfitHistoryPayload, scope?: ActiveUserScope): Promise<OutfitHistoryRow> {
    const scopedPayload = scope ? getScopedInsertData(payload as Record<string, unknown>, scope) : payload;
    const { data, error } = await supabase
        .from("outfit_history")
        .insert(scopedPayload)
        .select("*")
        .single();

    if (error) throw error;
    return data as OutfitHistoryRow;
}

export async function deleteOutfitHistoryEntry(id: string, scope?: ActiveUserScope): Promise<void> {
    const query = scope
        ? scopedDelete("outfit_history", scope).eq("id", id)
        : supabase.from("outfit_history").delete().eq("id", id);
    const { error } = await query;

    if (error) throw error;
}

export function buildWearHistoryContext(rows: OutfitHistoryRow[]): WearHistoryContext {
    return {
        recentFullOutfitIds: rows.map(row => row.outfit_id).filter(Boolean) as string[],
        recentTopIds: rows.map(row => row.top_id || row.dress_id).filter(Boolean) as string[],
        recentBottomIds: rows.map(row => row.bottom_id).filter(Boolean) as string[],
        recentFootwearIds: rows.map(row => row.footwear_id).filter(Boolean) as string[],
        recentOuterwearIds: rows.map(row => row.outerwear_id).filter(Boolean) as string[]
    };
}

export function getHistoryItems(row: OutfitHistoryRow, itemMap: Map<string, Item>): Item[] {
    return [row.top_id, row.bottom_id, row.dress_id, row.footwear_id, row.outerwear_id]
        .filter(Boolean)
        .map(id => itemMap.get(id as string))
        .filter(Boolean) as Item[];
}
