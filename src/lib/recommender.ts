import { Item } from "@/types"

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

/**
 * Configuration for outfit selection diversity
 * TOP_K: Number of top-scoring candidates to consider for final selection
 */
const TOP_K = 50;

/**
 * Valid weather conditions
 */
export type WeatherType = "Sunny" | "Rainy" | "Cold" | "Warm" | "Snowy";

/**
 * Valid style/occasion types
 */
export type StyleType = "Casual" | "Smart Casual" | "Formal" | "Party / Dressy" | "Sporty / Athleisure" | "Streetwear";

/**
 * Base outfit structure with common fields
 */
type OutfitBase = {
    footwear: Item;
    outerwear?: Item;
    accessory?: Item;
    score: number;
    ruleScore: number;
    mlScore?: number;
    features: number[];
}

/**
 * Separates outfit: Top + Bottom + Footwear (+ optional Outerwear/Accessory)
 */
export type SeparatesOutfit = OutfitBase & {
    type: 'separates';
    top: Item;
    bottom: Item;
}

/**
 * Dress outfit: Dress + Footwear (+ optional Outerwear/Accessory)
 */
export type DressOutfit = OutfitBase & {
    type: 'dress';
    dress: Item;
}

/**
 * Union type for all outfit types
 */
export type Outfit = SeparatesOutfit | DressOutfit;

/**
 * User preferences for outfit generation
 */
export type Preferences = {
    weather: WeatherType;
    occasion: StyleType;
    favoriteColor?: string;
    penalizedOuterwearIds?: string[];
}

/**
 * Result of outfit generation
 */
export type GeneratedOutfitResult = {
    success: boolean;
    outfits?: Outfit[]; // Main change: Return multiple
    error?: string;
    message?: string;
    // Legacy support (optional, for existing UI until updated)
    outfit?: Outfit;
}

/**
 * Valid values for internal style logic (normalized)
 */
type NormalizedStyle = "casual" | "smart casual" | "formal" | "party" | "sporty" | "streetwear";

/**
 * History tracking to prevent repetition
 */
type OutfitHistory = {
    recentFullOutfitIds: string[]; // Full ID: base + outer + shoes
    recentKeyItemIds: string[];    // Top ID or Dress ID
    recentOuterwearIds: string[];  // Outerwear ID
}

const HISTORY_KEY = "aiCloset_outfit_history_v1";

// ============================================================================
// MAIN RECOMMENDER CLASS
// ============================================================================

export class HybridRecommender {
    // Logistic Regression Weights for ML scoring
    // Features: [styleMatchCount, neutralCount, hasContrast, weatherMatch, hasOuterwear, isDress]
    private weights = [0.8, 0.3, 0.5, 0.6, 0.5, 0.4];
    private bias = -2.0;

    // Captured during partitioning for second-pass attachment
    private lastPartitionedAccessories: Item[] = [];

    /**
     * Main entry point: Generate outfit based on user preferences
     * 
     * @param items - All wardrobe items
     * @param preferences - User's weather and style preferences
     * @returns GeneratedOutfitResult with outfit or error message
     */
    /**
     * Main entry point: Generate outfit based on user preferences
     * 
     * @param items - All wardrobe items
     * @param preferences - User's weather and style preferences
     * @returns GeneratedOutfitResult with outfit or error message
     */
    generateOutfit(items: Item[], preferences: Preferences): GeneratedOutfitResult {
        // 1. Load History
        const history = this.loadHistory();

        // 2. Strict Item Filtering & Partitioning
        // We now filter items based on tags (Style & Weather) BEFORE partitioning.
        const filteredItems = this.filterItemsStrict(items, preferences);

        // DEBUG: Outerwear filtering audit
        // Include common synonyms for outerwear in the audit scope
        const allOuterInWardrobe = items.filter(i => {
            const cat = (i.category || "").toLowerCase();
            return cat === "outerwear" || cat === "jacket" || cat === "coat" || cat.includes("jacket") || cat.includes("coat");
        });
        const targetStyle = preferences.occasion || (preferences as any).style || "";
        console.log(`[Filter Audit] Target Style: "${targetStyle}", Weather: "${preferences.weather}"`);
        console.log(`[Filter Audit] Potential Outerwear in Wardrobe: ${allOuterInWardrobe.length}`);
        allOuterInWardrobe.forEach(o => {
            const styleMatch = this.matchesStyle(o, targetStyle);
            const targetWeather = preferences.weather || "";
            const hasNoWeatherTags = !o.weather || o.weather.length === 0;
            const weatherMatch = !targetWeather || hasNoWeatherTags ||
                !!o.weather?.some(w => w.trim().toLowerCase() === targetWeather.trim().toLowerCase());
            const passed = styleMatch && weatherMatch;
            const catLabel = o.category || "No Category";
            console.log(`   - [${passed ? 'PASS' : 'FAIL'}] ${o.name} (${o.id}) [Cat: ${catLabel}] | StyleMatch=${styleMatch}, WeatherMatch=${weatherMatch} | Styles: [${this.getItemStyles(o).join(', ')}] | Weather: [${o.weather?.join(', ') || ''}]`);
        });

        console.log(`[Generate] Items: ${items.length} -> Filtered: ${filteredItems.length}`);

        // 3. Partition items (Strict Categories)
        const partitioned = this.partitionItems(filteredItems);
        this.lastPartitionedAccessories = partitioned.accessories;

        // --- WINTER BOTTOMS LOGIC (Snowy Pre-filter) ---
        let excludedSnowyShortsCount = 0;
        let eligibleBottomsCount = partitioned.bottoms.length;
        let fallbackTriggered = false;

        if (preferences.weather === "Snowy") {
            const nonShortBottoms = partitioned.bottoms.filter(b => !this.isShortsOrSkirts(b));

            // Safety fallback: If < 3 eligible non-short bottoms remain, allow them but still log.
            if (nonShortBottoms.length < 3 && partitioned.bottoms.length > nonShortBottoms.length) {
                console.log(`[Generate] Snowy Fallback triggered: only ${nonShortBottoms.length} non-short bottoms. Allowing shorts/skirts.`);
                fallbackTriggered = true;
            } else {
                excludedSnowyShortsCount = partitioned.bottoms.length - nonShortBottoms.length;
                partitioned.bottoms = nonShortBottoms;
                eligibleBottomsCount = partitioned.bottoms.length;
                console.log(`[Generate] Snowy Filter: excluded ${excludedSnowyShortsCount} shorts/skirts.`);
            }
        }

        // 4. Validate Wardrobe
        const validationResult = this.validateWardrobe(partitioned, preferences);
        if (!validationResult.valid) {
            // If validation failed after filtering, it means we don't have enough items matching the criteria.
            return {
                success: false,
                error: `Not enough items match your criteria (${preferences.weather}, ${preferences.occasion}). ${validationResult.message}`
            };
        }

        // 5. Generate Candidates
        const candidates = this.generateCandidates(partitioned, preferences);

        // 6. Filter by Style (Strict Key-Piece Logic)
        // Note: Since we filtered items upfront, this should be redundant for matching, 
        // but it preserves the "Top AND Bottom" logic structure if filtering was loose.
        // With strict filtering, all styles match, so "Top matches AND Bottom matches" is true by definition.
        const styleFiltered = candidates;

        console.log(`[Generate] Candidates: ${candidates.length}`);
        if (excludedSnowyShortsCount > 0) console.log(`[Generate] Excluded Snowy Shorts: ${excludedSnowyShortsCount}`);
        if (fallbackTriggered) console.log(`[Generate] Fallback Triggered: true`);

        if (styleFiltered.length === 0) {
            return {
                success: false,
                error: `No outfits found for "${preferences.occasion}" in "${preferences.weather}" weather.`
            };
        }

        // 7. Score and Rank (with History & Dislike Penalties)
        const eligibleOuterCount = partitioned.outerwear.length;

        console.log(`[Generate] Outerwear Eligible Count: ${eligibleOuterCount}`);
        if (eligibleOuterCount > 0) {
            console.log(`[Generate] Outerwear Pool:`, partitioned.outerwear.map(o => ({
                id: o.id,
                name: o.name,
                styles: o.styles,
                weather: o.weather
            })));
        }
        const nonShortBottomsCount = partitioned.bottoms.filter(b => !this.isShortsOrSkirts(b)).length;

        console.log(`[Generate] Non-Short Bottoms Eligible: ${nonShortBottomsCount}`);

        const scored = this.scoreAndRank(styleFiltered, preferences, history, eligibleOuterCount, nonShortBottomsCount);

        // 8. Select Finalists (Weighted Top-K with Diversity Fallback)
        const baseFinalists = this.selectDiverseFinalists(scored, history, eligibleOuterCount);

        // 9. Attach Outerwear (Pass 2 - Batch Uniqueness Guaranteed)
        const finalists = this.attachOuterwearToFinalists(baseFinalists, partitioned.outerwear, preferences, history);

        // 10. Update & Save History
        if (finalists.length > 0) {
            this.updateHistory(history, finalists);
        }

        return {
            success: true,
            outfits: finalists,
            outfit: finalists[0]
        };
    }

    // ========================================================================
    // HISTORY & SELECTION HELPERS
    // ========================================================================

    private loadHistory(): OutfitHistory {
        const defaultHistory = { recentFullOutfitIds: [], recentKeyItemIds: [], recentOuterwearIds: [] };

        try {
            if (typeof localStorage === 'undefined') return defaultHistory;
            const raw = localStorage.getItem(HISTORY_KEY);
            if (!raw) return defaultHistory;
            const parsed = JSON.parse(raw);
            return {
                ...defaultHistory,
                ...parsed
            };
        } catch (e) {
            // This happens in Node 25+ environments without --localstorage-file
            return defaultHistory;
        }
    }

    private updateHistory(history: OutfitHistory, newOutfits: Outfit[]) {
        try {
            if (typeof localStorage === 'undefined') return;

            // Add new items to history
            for (const o of newOutfits) {
                history.recentFullOutfitIds.unshift(this.getFullId(o));
                history.recentKeyItemIds.unshift(this.getKeyItemId(o));
                if (o.outerwear) {
                    history.recentOuterwearIds.unshift(o.outerwear.id);
                }
            }

            // Trim history
            history.recentFullOutfitIds = history.recentFullOutfitIds.slice(0, 50); // Keep last 50 full outfits
            history.recentKeyItemIds = history.recentKeyItemIds.slice(0, 80);       // Keep last 80 key items
            history.recentOuterwearIds = history.recentOuterwearIds.slice(0, 40);   // Keep last 40 outerwear

            localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        } catch (e) {
            // Silent fail
        }
    }

    private selectDiverseFinalists(scoredCandidates: Outfit[], history: OutfitHistory, eligibleOuterCount: number): Outfit[] {
        const TOP_K_POOL = 50;
        const TARGET_COUNT = 5;

        // Take top pool of candidates (they are already sorted by score (desc) which includes penalties)
        // Filter out -Infinity scores (hard skips)
        const pool = scoredCandidates
            .filter(c => c.score > -999)
            .slice(0, TOP_K_POOL);

        const selected: Outfit[] = [];
        const batchFullIds = new Set<string>();
        const batchKeyItemIds = new Set<string>();


        // Diversity loop
        let attempts = 0;
        while (selected.length < TARGET_COUNT && pool.length > 0 && attempts < 100) {
            attempts++;

            let bestCandidateIndex = -1;

            const findBestInPass = (passStrict: boolean) => {
                for (let i = 0; i < pool.length; i++) {
                    const cand = pool[i];
                    const keyId = this.getKeyItemId(cand);
                    const fullId = this.getFullId(cand);

                    const keyNew = !batchKeyItemIds.has(keyId);
                    const fullIdNew = !batchFullIds.has(fullId);

                    if (passStrict) {
                        // Pass 1: Unique Key Piece AND Unique Full ID
                        if (keyNew && fullIdNew) return i;
                    } else {
                        // Pass 2: Just Unique Full ID
                        if (fullIdNew) return i;
                    }
                }
                return -1;
            };

            // Pass 1: Strict Diversity (New Key Piece)
            bestCandidateIndex = findBestInPass(true);

            // Pass 2: Lax Diversity (Key Piece repeat OK)
            if (bestCandidateIndex === -1) {
                bestCandidateIndex = findBestInPass(false);
            }

            if (bestCandidateIndex !== -1) {
                const candidate = pool[bestCandidateIndex];

                // Track batch usage
                batchFullIds.add(this.getFullId(candidate));
                batchKeyItemIds.add(this.getKeyItemId(candidate));

                selected.push(candidate);

                // Remove from pool so we don't pick again
                pool.splice(bestCandidateIndex, 1);
            } else {
                // No candidate found even after skipping uniqueness constraints
                break;
            }
        }

        return selected;
    }

    private getBaseId(o: Outfit): string {
        return o.type === 'separates' ? `${o.top.id}-${o.bottom.id}` : o.dress.id;
    }

    private getKeyItemId(o: Outfit): string {
        return o.type === 'separates' ? o.top.id : o.dress.id;
    }

    private getFullId(o: Outfit): string {
        const base = this.getBaseId(o);
        const outer = o.outerwear ? `-${o.outerwear.id}` : '-none';
        const shoes = o.footwear ? `-${o.footwear.id}` : '-none';
        return base + outer + shoes;
    }

    /**
     * Pass 2: Attach outerwear to chosen base finalists
     * This guarantees batch-level uniqueness and applies rotation rules.
     */
    private attachOuterwearToFinalists(
        finalists: Outfit[],
        eligibleOuterwear: Item[],
        preferences: Preferences,
        history: OutfitHistory
    ): Outfit[] {
        const usedOuterwearIds = new Set<string>();
        const isCold = preferences.weather === "Cold" || preferences.weather === "Snowy";
        const eligibleCount = eligibleOuterwear.length;

        console.log(`[Bulletproof Outer] Starting Assignment for ${finalists.length} base outfits.`);
        console.log(`[Bulletproof Outer] Eligible Pool (${eligibleCount}): [${eligibleOuterwear.map(o => o.id).join(', ')}]`);
        console.log(`[Bulletproof Outer] Base Finalist IDs: [${finalists.map(f => this.getBaseId(f)).join(', ')}]`);

        return finalists.map((outfit, idx) => {
            const accessories = this.lastPartitionedAccessories || [];

            // 1. Rank outerwear for THIS specific outfit
            const rankedOuter = eligibleOuterwear.map(outer => {
                let score = 0;

                // Style Match (filtered items get +5)
                score += 5;

                // Color Harmony
                const baseColor = outfit.type === 'separates' ? outfit.top.color : outfit.dress.color;
                if (this.isValidColorCombination(baseColor, outer.color)) score += 3;

                // Rotation Penalties
                const recentIds = history.recentOuterwearIds || [];
                let isBlocked = false;
                if (eligibleCount >= 5) {
                    if (recentIds.slice(0, 2).includes(outer.id)) isBlocked = true;
                } else if (eligibleCount >= 3) {
                    if (recentIds.slice(0, 1).includes(outer.id)) isBlocked = true;
                }
                if (isBlocked) score -= 20;

                const recentIndex = recentIds.indexOf(outer.id);
                if (recentIndex !== -1) {
                    const recencyFactor = Math.max(0, 1 - (recentIndex / 10));
                    score -= (2 + (2 * recencyFactor));
                }

                // SOFT PENALTY for Disliked Outerwear
                // Safety: Ignore penalty if pool is too small (< 3)
                if (eligibleCount >= 3 && preferences.penalizedOuterwearIds?.includes(outer.id)) {
                    score -= 5; // Significant soft penalty
                }

                return { outer, score };
            }).sort((a, b) => b.score - a.score);

            // 2. Select best available (Batch uniqueness)
            let chosenOuter: Item | undefined = undefined;
            const uniqueChoice = rankedOuter.find(r => !usedOuterwearIds.has(r.outer.id));

            // LOGGING: IDs and Count
            const penalizedCount = preferences.penalizedOuterwearIds?.length || 0;
            if (idx === 0) {
                console.log(`[Bulletproof Outer] Eligible IDs: [${eligibleOuterwear.map(o => o.id).join(', ')}]`);
                console.log(`[Bulletproof Outer] Penalized IDs Count: ${penalizedCount}`);
            }

            if (uniqueChoice) {
                chosenOuter = uniqueChoice.outer;
                usedOuterwearIds.add(chosenOuter.id);
            } else if (eligibleCount > 0) {
                // Fallback: Best repeat
                chosenOuter = rankedOuter[0].outer;
                console.log(`[Bulletproof Outer]   #${idx + 1}: Pool exhausted for uniqueness. Re-using best match.`);
            }

            if (chosenOuter) {
                console.log(`[Bulletproof Outer]   #${idx + 1}: Chosen: ${chosenOuter.name} (${chosenOuter.id}) | Used Set: [${Array.from(usedOuterwearIds).join(', ')}]`);
                outfit = { ...outfit, outerwear: chosenOuter };
            } else if (isCold) {
                console.warn(`[Bulletproof Outer]   #${idx + 1}: MANDATORY outerwear missing for Cold/Snowy!`);
            }

            // 3. Add Accessory (since it was removed from Pass 1)
            const withAcc = this.addAccessoryIfNeeded(outfit, accessories, preferences);
            return withAcc[0] || outfit;
        });
    }

    private normalizeStyleKey(style: string): string {
        if (!style) return "";
        return style
            .trim()
            .toLowerCase()
            .replace(/\s+/g, ' ')       // Collapse multiple spaces
            .replace(/\s*\/\s*/g, '/'); // Normalize "/" spacing: "Party / Dressy" -> "party/dressy"
    }

    /**
     * Helper: Get normalized styles from an item
     */
    private getItemStyles(item: Item): string[] {
        const styles = new Set<string>();
        // Check legacy single-style field
        if (item.style) styles.add(this.normalizeStyleKey(item.style));

        // Check new multi-styles array
        if (item.styles && Array.isArray(item.styles)) {
            item.styles.forEach(s => styles.add(this.normalizeStyleKey(s)));
        }
        return Array.from(styles);
    }

    /**
     * Helper: Check if item matches target style (STRICT matching)
     * No aliases. Input must be exact match (formatting-normalized).
     */
    private matchesStyle(item: Item, targetStyle: string): boolean {
        const normalizedTarget = this.normalizeStyleKey(targetStyle);
        if (!normalizedTarget || normalizedTarget === "all styles") return true;

        const itemStyles = this.getItemStyles(item);
        // "all styles" tag on an item matches any requested style
        return itemStyles.some(s => s === normalizedTarget || s === "all styles");
    }

    // ========================================================================
    // ITEM PARTITIONING & HELPERS
    // ========================================================================

    /**
     * Strict Item Filtering based on Tags
     */
    private filterItemsStrict(items: Item[], preferences: Preferences): Item[] {
        const targetStyle = (preferences.occasion || (preferences as any).style || "").trim();
        const targetWeather = (preferences.weather || "").trim();
        const isAllStyles = targetStyle.toLowerCase() === "all styles";
        const isRainy = targetWeather.toLowerCase() === "rainy";

        return items.filter(item => {
            // Special Case: Umbrellas are ALWAYS included for rainy weather
            const isUmbrella = item.name.toLowerCase().includes("umbrella") ||
                (item.tags && item.tags.some(t => t.toLowerCase().includes("umbrella")));

            if (isRainy && isUmbrella) return true;

            // 1. Style Filter
            if (!isAllStyles && targetStyle) {
                const match = this.matchesStyle(item, targetStyle);
                if (!match) return false;
            }

            // 2. Weather Filter
            // If item has weather tags and they are not empty, check strict match.
            // If item has NO weather tags (or empty), allow it (Legacy/All-weather support).
            if (targetWeather && item.weather && item.weather.length > 0) {
                const normalizedTargetWeather = targetWeather.trim().toLowerCase();
                const match = item.weather.some(w => w.trim().toLowerCase() === normalizedTargetWeather);
                if (!match) return false;
            }

            return true;
        });
    }

    /**
     * Partition items by category with STRICT Categories
     */
    private partitionItems(items: Item[]) {
        const normalize = (s: string) => s?.trim().toLowerCase() || "";

        // Shuffle items initially to promote diversity
        const shuffled = [...items].sort(() => Math.random() - 0.5);

        const partitioned = {
            tops: [] as Item[],
            bottoms: [] as Item[],
            dresses: [] as Item[],
            footwear: [] as Item[],
            outerwear: [] as Item[],
            accessories: [] as Item[]
        };

        for (const item of shuffled) {
            const rawCat = item.category || "";
            const c = normalize(rawCat);

            // CATEGORY MAPPING (Inclusive for synonyms)
            if (c === "top") partitioned.tops.push(item);
            else if (c === "bottom" || c === "shorts/skirts") partitioned.bottoms.push(item);
            else if (c === "dress") partitioned.dresses.push(item);
            else if (c === "footwear") partitioned.footwear.push(item);
            else if (c === "outerwear" || c === "jacket" || c === "coat" || c.includes("jacket") || c.includes("coat")) {
                partitioned.outerwear.push(item);
            }
            else if (c === "accessory" || item.name.toLowerCase().includes("umbrella") || (item.tags && item.tags.some(t => t.toLowerCase().includes("umbrella")))) {
                partitioned.accessories.push(item);
            }
        }

        // DEBUG LOGGING
        console.log("--- Recommender Partitioning (Strict) ---");
        console.log(`Tops: ${partitioned.tops.length}, Bottoms: ${partitioned.bottoms.length}`);
        console.log(`Dresses: ${partitioned.dresses.length}`);
        console.log(`Footwear: ${partitioned.footwear.length}, Outerwear: ${partitioned.outerwear.length}, Acc: ${partitioned.accessories.length}`);

        return partitioned;
    }

    /**
     * Validate that wardrobe has minimum items
     */
    private validateWardrobe(partitioned: ReturnType<typeof this.partitionItems>, preferences: Preferences) {
        const { tops, bottoms, dresses, footwear } = partitioned;
        const occasion = preferences.occasion;

        // Need at least footwear
        if (footwear.length === 0) {
            return {
                valid: false,
                message: "You need at least one pair of shoes to generate outfits."
            };
        }

        // Check if we have enough items for the SPECIFIC occasion
        // (Don't fail hard if generic items exist, but warn in logs?)

        const canMakeSeparates = tops.length > 0 && bottoms.length > 0;
        const canMakeDress = dresses.length > 0;

        if (!canMakeSeparates && !canMakeDress) {
            return {
                valid: false,
                message: "You need either (Tops + Bottoms) OR (Dresses) to generate outfits."
            };
        }

        return { valid: true };
    }

    // ========================================================================
    // CANDIDATE GENERATION
    // ========================================================================

    /**
     * Generate all valid outfit candidates (both separates and dress)
     */
    private generateCandidates(
        partitioned: ReturnType<typeof this.partitionItems>,
        preferences: Preferences
    ): Outfit[] {
        const candidates: Outfit[] = [];
        const isParty = ["party", "dressy", "formal", "evening"].some(t => preferences.occasion.toLowerCase().includes(t));

        // 1. Generate Separates Outfits (Tops + Bottoms + Footwear)
        const separates = this.generateSeparates(partitioned, preferences);
        candidates.push(...separates);

        // 2. Generate Dress Outfits (Dresses + Footwear)
        const dresses = this.generateDressOutfits(partitioned, preferences);

        // Boost dress score logic here? Or later in scoring?
        // Let's just add them for now.
        candidates.push(...dresses);

        console.log(`Generated ${candidates.length} candidates (${separates.length} separates, ${dresses.length} dresses)`);

        return candidates;
    }

    /**
     * Generate separates outfits (Top + Bottom + Footwear)
     */
    private generateSeparates(
        partitioned: ReturnType<typeof this.partitionItems>,
        preferences: Preferences
    ): SeparatesOutfit[] {
        const { tops, bottoms, footwear, outerwear, accessories } = partitioned;
        const candidates: SeparatesOutfit[] = [];

        const isCold = preferences.weather === "Cold" || preferences.weather === "Snowy";
        const normalize = (s: string) => s?.trim().toLowerCase() || "";

        if (tops.length === 0 || bottoms.length === 0 || footwear.length === 0) {
            return candidates;
        }

        // Limit huge combinatorics if necessary (e.g. max 50 tops * 50 bottoms * 50 shoes = 125,000)
        // With shuffling done in partitionItems, taking full cross product of sliced arrays might be safer
        // But for typical wardrobe sizes (<500 items), full iteration is fine.

        for (const top of tops) {
            for (const bottom of bottoms) {
                // Cold Weather Rule: REMOVED.
                // Users can wear tights with skirts/shorts. Logic was too aggressive.

                for (const shoe of footwear) {
                    // Color constraint
                    if (!this.isValidColorCombination(top.color, bottom.color)) continue;

                    const baseOutfit: SeparatesOutfit = {
                        type: 'separates',
                        top,
                        bottom,
                        footwear: shoe,
                        score: 0,
                        ruleScore: 0,
                        features: []
                    };

                    candidates.push(baseOutfit);
                }
            }
        }

        return candidates;
    }

    /**
     * Generate dress outfits (Dress + Footwear)
     */
    private generateDressOutfits(
        partitioned: ReturnType<typeof this.partitionItems>,
        preferences: Preferences
    ): DressOutfit[] {
        const { dresses, footwear, outerwear, accessories } = partitioned;
        const candidates: DressOutfit[] = [];

        if (dresses.length === 0 || footwear.length === 0) {
            return candidates;
        }

        for (const dress of dresses) {
            for (const shoe of footwear) {
                const baseOutfit: DressOutfit = {
                    type: 'dress',
                    dress,
                    footwear: shoe,
                    score: 0,
                    ruleScore: 0,
                    features: []
                };

                candidates.push(baseOutfit);
            }
        }

        return candidates;
    }

    /**
     * Add outerwear to outfit based on weather conditions
     */
    private addOuterwearIfNeeded<T extends OutfitBase>(
        outfit: T,
        outerwearItems: Item[],
        preferences: Preferences
    ): T[] {
        const results: T[] = [];
        const isCold = preferences.weather === "Cold" || preferences.weather === "Snowy";
        const isHot = preferences.weather === "Sunny" || preferences.weather === "Warm";
        const isRainy = preferences.weather === "Rainy";

        // Filter out disliked outerwear
        // REFACTORED: NO HARD BAN. Use all strictly filtered outerwear.
        let availableOuterwear = outerwearItems;

        // FALLBACK: If Cold/Snowy and no outerwear is available,
        // (though partitioning handles this, we keep a safety check).
        if (isCold && availableOuterwear.length === 0 && outerwearItems.length > 0) {
            console.warn("[Outerwear] No eligible outerwear found for Cold weather, even though wardrobe has some. Logic fallback triggered.");
            availableOuterwear = outerwearItems;
        }

        // COLD WEATHER LOGIC: Must have outerwear if any exists in ELIGIBLE pool
        if (isCold) {
            if (availableOuterwear.length > 0) {
                // Must add at least one outer option.
                // Do NOT add the base 'outfit' without outerwear.
                for (const outer of availableOuterwear) {
                    results.push({ ...outfit, outerwear: outer });
                }
            } else {
                // No outerwear matches filters (Style/Weather).
                // Log a warning and allow base outfit (safe fallback).
                console.warn("[Outerwear] Cold/Snowy weather but 0 eligible outerwear available. Allowing base outfit.");
                results.push(outfit);
            }
        }
        // RAINY WEATHER LOGIC: Prefer rain gear, allow normal
        else if (isRainy) {
            const rainGear = availableOuterwear.filter(i => this.isRainGear(i));
            if (rainGear.length > 0) {
                for (const gear of rainGear) results.push({ ...outfit, outerwear: gear });
                // Also allow base outfit (umbrella case handled elsewhere)
                results.push(outfit);
            } else {
                // No specific rain gear, allow all
                results.push(outfit);
                for (const outer of availableOuterwear) results.push({ ...outfit, outerwear: outer });
            }
        }
        // HOT WEATHER LOGIC: Prefer no outerwear, but allow if style demands it?
        else if (isHot) {
            results.push(outfit);
            // Maybe allow very light layers? For now, just base.
        }
        // MODERATE (Default)
        else {
            results.push(outfit);
            for (const outer of availableOuterwear) {
                results.push({ ...outfit, outerwear: outer });
            }
        }

        return results;
    }

    /**
     * Add accessories to outfit based on weather conditions
     */
    private addAccessoryIfNeeded<T extends OutfitBase>(
        outfit: T,
        accessoryItems: Item[],
        preferences: Preferences
    ): T[] {
        const results: T[] = [];

        if (preferences.weather === "Rainy") {
            // Look for umbrellas
            const umbrellas = accessoryItems.filter(i =>
                i.name.toLowerCase().includes("umbrella") ||
                (i.tags && i.tags.some(t => t.toLowerCase().includes("umbrella")))
            );

            if (umbrellas.length > 0) {
                // If it's rainy and we have umbrellas, ONLY suggest outfits with umbrellas
                for (const umbrella of umbrellas) {
                    results.push({ ...outfit, accessory: umbrella });
                }
                return results; // Return early, making umbrella mandatory
            }
        }

        // Always include the option without accessory for other weather or if no umbrella found
        results.push(outfit);

        return results;
    }

    /**
     * Check if an item is suitable for rain (Windcheater, Raincoat, etc.)
     */
    private isRainGear(item: Item): boolean {
        const keywords = ["rain", "waterproof", "windcheater", "trench", "parka", "anorak", "hoodie", "nylon"];
        const name = item.name.toLowerCase();
        const tags = item.tags || [];

        return keywords.some(k => name.includes(k) || tags.some(t => t.toLowerCase().includes(k)));
    }

    // ========================================================================
    // CONSTRAINTS & FILTERS
    // ========================================================================

    /**
     * Check if color combination is valid (avoid same bright color)
     */
    private isValidColorCombination(color1: string, color2: string): boolean {
        const neutralColors = ["Black", "White", "Grey", "Gray", "Beige", "Navy", "Denim", "Brown"];
        const isNeutral1 = neutralColors.some(n => color1?.includes(n));
        const isNeutral2 = neutralColors.some(n => color2?.includes(n));

        // If either is neutral, combination is fine
        if (isNeutral1 || isNeutral2) return true;

        // If both are non-neutral, they should be different
        return color1 !== color2;
    }

    /**
     * Check if outfit has at least one item matching the target style
     */
    /**
     * Check if outfit has at least one item matching the target style
     * REFACTORED: STRICTEST LOGIC.
     * Separates: Top AND Bottom must match.
     * Dress: Dress must match.
     */
    private hasStyleMatch(outfit: Outfit, targetStyle: string): boolean {
        if (outfit.type === 'dress') {
            return this.matchesStyle(outfit.dress, targetStyle);
        } else {
            // Separates: Top AND Bottom must match
            // Shoes/Outerwear are optional but do not count towards the requirement
            return this.matchesStyle(outfit.top, targetStyle) &&
                this.matchesStyle(outfit.bottom, targetStyle);
        }
    }

    /**
     * Check if an item has a specific style
     * DEPRECATED: Use matchesStyle() instead for internal checks
     */
    private itemHasStyle(item: Item, targetStyle: string): boolean {
        return this.matchesStyle(item, targetStyle);
    }

    /**
     * Get all items in an outfit as an array
     */
    private getOutfitItems(outfit: Outfit): Item[] {
        const items: Item[] = [outfit.footwear];

        if (outfit.type === 'separates') {
            items.push(outfit.top, outfit.bottom);
        } else {
            items.push(outfit.dress);
        }

        if (outfit.outerwear) {
            items.push(outfit.outerwear);
        }

        if (outfit.accessory) {
            items.push(outfit.accessory);
        }

        return items;
    }

    // ========================================================================
    // SCORING SYSTEM
    // ========================================================================

    /**
     * Score and rank all candidates using hybrid approach (rules + ML)
     */
    private scoreAndRank(
        candidates: Outfit[],
        preferences: Preferences,
        history: OutfitHistory,
        eligibleOuterCount: number,
        nonShortBottomsCount: number = 5 // Default to safe number if not provided
    ): Outfit[] {
        let coldPenaltyAppliedCount = 0;

        const results = candidates.map(outfit => {
            // Calculate rule-based score
            const ruleScore = this.calculateRuleScore(outfit, preferences);

            // Extract features for ML
            const features = this.extractFeatures(outfit, preferences);

            // Calculate ML score
            const mlScore = this.predictProbability(features);

            // Hybrid score: 70% rules, 30% ML
            const normalizedRuleScore = ruleScore / 17; // Max rule score is 17
            const finalScore = 0.7 * normalizedRuleScore + 0.3 * mlScore;

            // --- PENALTIES (Proportional to 0-1 range) ---
            let penalty = 0;
            const fullId = this.getFullId(outfit);
            const keyId = this.getKeyItemId(outfit);


            if (history.recentFullOutfitIds.includes(fullId)) {
                // HARD SKIP: If exact full outfit shown recently -> Kill it.
                return { ...outfit, ruleScore, mlScore, score: -9999, features };
            }

            if (history.recentKeyItemIds.includes(keyId)) {
                // SOFT PENALTY: Repetitive main piece -> -0.20
                penalty -= 0.20;
            }

            // WINTER BOTTOMS PENALTY (Cold Weather only, Snowy handled via pre-filter)
            if (preferences.weather === "Cold" && outfit.type === "separates" && this.isShortsOrSkirts(outfit.bottom)) {
                // Safety: only penalize if we have enough non-short bottoms
                if (nonShortBottomsCount >= 3) {
                    penalty -= 0.25;
                    coldPenaltyAppliedCount++;
                }
            }

            // --- Note: Outerwear penalties REMOVED from Pass 1 scoring ---
            // They are now handled in Pass 2 (attachOuterwearToFinalists)

            // Add 5% Random Jitter
            const jitter = (Math.random() - 0.5) * 0.05;

            return {
                ...outfit,
                ruleScore,
                mlScore,
                score: finalScore + penalty + jitter,
                features
            };
        }).sort((a, b) => b.score - a.score);

        if (coldPenaltyAppliedCount > 0) {
            console.log(`[Score] Applied Cold penalty to ${coldPenaltyAppliedCount} short/skirt outfits.`);
        }

        return results;
    }

    /**
     * Calculate rule-based score (0-17 points)
     * 
     * Components:
     * - Style match: 0-8 points
     * - Color harmony: 0-6 points
     * - Weather fit: 0-3 points
     * - Dress bonus: 0-1 point
     */
    private calculateRuleScore(outfit: Outfit, preferences: Preferences): number {
        let score = 0;

        // 1. Style Match Score (0-8 points)
        score += this.calculateStyleScore(outfit, preferences.occasion);

        // 2. Color/Contrast Score (0-6 points)
        score += this.calculateColorScore(outfit);

        // 3. Weather Score (0-3 points)
        score += this.calculateWeatherScore(outfit, preferences.weather);

        // 4. Dress Bonus (0-1 point)
        if (outfit.type === 'dress' &&
            (preferences.occasion === "Party / Dressy" || preferences.occasion === "Formal")) {
            score += 1;
        }

        return score;
    }

    /**
     * Style match scoring (0-8 points)
     * +2 per item matching selected style
     * +1 per item with style overlap with other items
     */
    private calculateStyleScore(outfit: Outfit, targetStyle: string): number {
        const items = this.getOutfitItems(outfit);
        let score = 0;

        // +2 per item matching target style
        const matchingItems = items.filter(item => this.itemHasStyle(item, targetStyle));
        score += matchingItems.length * 2;

        // +1 for style consistency between items
        const allStyles = items.flatMap(item =>
            item.styles && item.styles.length > 0 ? item.styles : [item.style]
        ).filter(Boolean);

        const styleSet = new Set(allStyles);
        if (styleSet.size <= 2 && items.length >= 3) {
            // Good style consistency
            score += 1;
        }

        return Math.min(score, 8);
    }

    /**
     * Color harmony scoring (0-6 points)
     * +2 if at least one neutral
     * +2 if one accent color + neutrals
     * -2 if all bright/clashing
     */
    private calculateColorScore(outfit: Outfit): number {
        const items = this.getOutfitItems(outfit);
        const colors = items.map(item => item.color).filter(Boolean);

        const neutralColors = ["Black", "White", "Grey", "Gray", "Beige", "Navy", "Denim", "Brown"];
        const neutralCount = colors.filter(c =>
            neutralColors.some(n => c.includes(n))
        ).length;

        let score = 0;

        // +2 if at least one neutral (provides base)
        if (neutralCount >= 1) {
            score += 2;
        }

        // +2 if good color balance (1-2 accent colors with neutrals)
        const nonNeutralColors = colors.filter(c =>
            !neutralColors.some(n => c.includes(n))
        );
        const uniqueNonNeutral = new Set(nonNeutralColors).size;

        if (uniqueNonNeutral <= 1 && neutralCount >= 1) {
            score += 2; // One accent color with neutrals
        } else if (uniqueNonNeutral === 0) {
            score += 2; // All neutrals (classic)
        } else if (uniqueNonNeutral >= 3) {
            score -= 2; // Too many colors (likely clashing)
        }

        return Math.max(0, Math.min(score, 6));
    }

    /**
     * Weather appropriateness scoring (0-3 points)
     */
    private calculateWeatherScore(outfit: Outfit, weather: WeatherType): number {
        let score = 0;

        if (weather === "Cold" || weather === "Snowy") {
            if (outfit.outerwear) {
                score += 3; // Perfect for cold weather
            } else {
                score -= 2; // Missing outerwear in cold weather
            }
        } else if (weather === "Sunny" || weather === "Warm") {
            if (!outfit.outerwear) {
                score += 2; // Good for hot weather
            } else {
                score -= 1; // Outerwear in hot weather
            }
        } else if (weather === "Rainy") {
            // Bonus for rain gear
            if (outfit.outerwear && this.isRainGear(outfit.outerwear)) {
                score += 3; // Perfect rain gear
            } else if (outfit.accessory && outfit.accessory.name.toLowerCase().includes("umbrella")) {
                score += 3; // Has umbrella
            } else if (outfit.footwear.category.includes("Boot") || this.isRainGear(outfit.footwear)) {
                score += 2; // Good footwear
            } else {
                score += 1; // Base score
            }
        } else {
            // Moderate weather (Warm)
            score += 1; // Any outfit works reasonably
        }

        return Math.max(0, Math.min(score, 3));
    }

    // ========================================================================
    // ML FEATURE EXTRACTION
    // ========================================================================

    /**
     * Extract features for ML model
     * Returns: [styleMatchCount, neutralCount, hasContrast, weatherMatch, hasOuterwear, isDress]
     */
    private extractFeatures(outfit: Outfit, preferences: Preferences): number[] {
        const items = this.getOutfitItems(outfit);

        // 1. Style match count (0-4)
        const styleMatchCount = items.filter(item =>
            this.itemHasStyle(item, preferences.occasion)
        ).length;

        // 2. Neutral color count (0-4)
        const neutralColors = ["Black", "White", "Grey", "Gray", "Beige", "Navy", "Denim", "Brown"];
        const neutralCount = items.filter(item =>
            neutralColors.some(n => item.color?.includes(n))
        ).length;

        // 3. Has contrast (0 or 1)
        let hasContrast = 0;
        if (outfit.type === 'separates') {
            hasContrast = outfit.top.color !== outfit.bottom.color ? 1 : 0;
        }

        // 4. Weather match (0 or 1)
        let weatherMatch = 0;
        if ((preferences.weather === "Cold" || preferences.weather === "Snowy") && outfit.outerwear) {
            weatherMatch = 1;
        } else if ((preferences.weather === "Sunny" || preferences.weather === "Warm") && !outfit.outerwear) {
            weatherMatch = 1;
        } else if (preferences.weather === "Rainy") {
            if ((outfit.outerwear && this.isRainGear(outfit.outerwear)) ||
                (outfit.accessory && outfit.accessory.name.toLowerCase().includes("umbrella"))) {
                weatherMatch = 1;
            }
        }

        // 5. Has outerwear (0 or 1)
        const hasOuterwear = outfit.outerwear ? 1 : 0;

        // 6. Is dress (0 or 1)
        const isDress = outfit.type === 'dress' ? 1 : 0;

        return [styleMatchCount, neutralCount, hasContrast, weatherMatch, hasOuterwear, isDress];
    }

    /**
     * Logistic regression prediction
     * P(y=1|x) = 1 / (1 + e^-(w*x + b))
     */
    private predictProbability(features: number[]): number {
        let z = this.bias;
        for (let i = 0; i < Math.min(features.length, this.weights.length); i++) {
            z += features[i] * this.weights[i];
        }

        // Small random jitter for variety (±0.05)
        z += (Math.random() - 0.5) * 0.1;

        return 1 / (1 + Math.exp(-z));
    }

    /**
     * Helper: Detect if an item is a Short or Skirt
     */
    private isShortsOrSkirts(item: Item): boolean {
        const normalize = (s: string) => s?.trim().toLowerCase() || "";
        const cat = normalize(item.category);
        if (cat === "shorts/skirts") return true;

        const name = normalize(item.name);
        const tags = (item.tags || []).map(t => normalize(t));
        const keywords = ["short", "skirt"];

        return keywords.some(k => name.includes(k) || tags.some(t => t.includes(k)));
    }
}
