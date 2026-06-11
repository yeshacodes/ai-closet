import { getCategoryGroup } from "@/lib/categories";
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
    outerwearDebug?: OuterwearSelectionDebug;
    footwearDebug?: FootwearSelectionDebug;
    selectionDebug?: SelectionDebug;
    score: number;
    ruleScore: number;
    mlScore?: number;
    scoringDetails?: ScoringDetails;
    ruleEvaluation?: RuleEvaluationDetails;
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
    recentKeyItemIds?: string[];
    preferenceProfile?: PreferenceProfile;
    wearHistory?: WearHistoryContext;
    weatherContext?: WeatherContext;
}

export type WearHistoryContext = {
    recentFullOutfitIds: string[];
    recentTopIds: string[];
    recentBottomIds: string[];
    recentFootwearIds: string[];
    recentOuterwearIds: string[];
}

export type WeatherContext = {
    temperatureF: number;
    temperatureC: number;
    weatherCode?: number;
    mappedWeatherCategory: WeatherType;
    source: "live" | "manual";
    detectedAt: string;
}

export type ScoringDetails = {
    ruleScoreRaw: number;
    ruleScoreMax: number;
    ruleScorePercent: number;
    mlScorePercent: number;
    rotationPenalty: number;
    weatherPenalty: number;
    feedbackAdjustment: number;
    preferenceAdjustment: number;
    preferenceReasons: string[];
    randomAdjustment: number;
    baseScoreBeforePreferences: number;
    finalScoreAfterPreferences: number;
    finalScore: number;
    finalScoreFormulaSummary: string;
    heuristicContributions?: HeuristicContribution[];
}

export type HeuristicContribution = {
    component: string;
    value: number;
    weight: number;
    contribution: number;
    explanation: string;
}

export type PassedRule = {
    name: string;
    points: number;
    explanation: string;
}

export type FailedRule = {
    name: string;
    pointsLost: number;
    explanation: string;
}

export type NotApplicableRule = {
    name: string;
    explanation: string;
}

export type RuleEvaluationDetails = {
    passedRules: PassedRule[];
    failedRules: FailedRule[];
    notApplicableRules: NotApplicableRule[];
    rulesPassed: number;
    rulesFailed: number;
    pointsAwarded: number;
    pointsPossible: number;
    pointsLost: number;
}

export type PreferenceProfile = {
    likedColors: Record<string, number>;
    dislikedColors: Record<string, number>;
    likedStyles: Record<string, number>;
    dislikedStyles: Record<string, number>;
    likedCategories: Record<string, number>;
    dislikedCategories: Record<string, number>;
    likedItems?: Record<string, number>;
    dislikedItems: Record<string, number>;
    likedCombinations: Record<string, number>;
    dislikedCombinations: Record<string, number>;
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
    recentFootwearIds: string[];   // Footwear ID
}

type PreferencesWithLegacyStyle = Preferences & {
    style?: string;
}

type OuterwearCandidateDebug = {
    id: string;
    name: string;
    score: number;
    reasons: string[];
}

type OuterwearSelectionDebug = {
    candidateOptions: OuterwearCandidateDebug[];
    selectedOuterwearId?: string;
    selectedOuterwearName?: string;
    reasonSelected: string;
}

type FootwearCandidateDebug = {
    id: string;
    name: string;
    qualityScore: number;
    selectionScore: number;
    styleMatch: boolean;
    recentUseAdjustment: number;
    reasons: string[];
}

type FootwearSelectionDebug = {
    candidateOptions: FootwearCandidateDebug[];
    selectedFootwearId?: string;
    selectedFootwearName?: string;
    reasonSelected: string;
}

type SelectionDebug = {
    qualityScore: number;
    selectionScore: number;
    generatedFootwearAdjustment: number;
    wearHistoryAdjustment: number;
    wearHistoryReasons: string[];
    temperaturePracticalityAdjustment: number;
    temperaturePracticalityReasons: string[];
    affectedItemTypes: string[];
    weatherContext?: WeatherContext;
}

const HISTORY_KEY = "aiCloset_outfit_history_v1";
const RULE_SCORE_MAX = 17;
const RULE_SCORE_WEIGHT = 0.45;
const ML_SCORE_WEIGHT = 0.55;

function clampPercent(value: number): number {
    return Math.max(0, Math.min(100, value));
}

function toPercent(value: number, max: number): number {
    if (max <= 0) return 0;
    return clampPercent((value / max) * 100);
}

export function calculateScoringDetails({
    ruleScoreRaw,
    mlScorePercent,
    rotationPenalty = 0,
    weatherPenalty = 0,
    feedbackAdjustment = 0,
    preferenceAdjustment = 0,
    preferenceReasons = [],
    randomAdjustment = 0,
    heuristicContributions = []
}: {
    ruleScoreRaw: number;
    mlScorePercent: number;
    rotationPenalty?: number;
    weatherPenalty?: number;
    feedbackAdjustment?: number;
    preferenceAdjustment?: number;
    preferenceReasons?: string[];
    randomAdjustment?: number;
    heuristicContributions?: HeuristicContribution[];
}): ScoringDetails {
    const ruleScorePercent = toPercent(ruleScoreRaw, RULE_SCORE_MAX);
    const boundedMlScorePercent = clampPercent(mlScorePercent);
    const weightedBase =
        (RULE_SCORE_WEIGHT * ruleScorePercent) +
        (ML_SCORE_WEIGHT * boundedMlScorePercent);
    const baseScoreBeforePreferences = clampPercent(
        weightedBase +
        rotationPenalty +
        weatherPenalty +
        feedbackAdjustment +
        randomAdjustment
    );
    const finalScore = clampPercent(baseScoreBeforePreferences + preferenceAdjustment);

    return {
        ruleScoreRaw,
        ruleScoreMax: RULE_SCORE_MAX,
        ruleScorePercent,
        mlScorePercent: boundedMlScorePercent,
        rotationPenalty,
        weatherPenalty,
        feedbackAdjustment,
        preferenceAdjustment,
        preferenceReasons,
        randomAdjustment,
        baseScoreBeforePreferences,
        finalScoreAfterPreferences: finalScore,
        finalScore,
        finalScoreFormulaSummary: "Final Score = clamp((45% * Rule Score %) + (55% * Heuristic Match Confidence %) + explicit adjustments, 0, 100)",
        heuristicContributions
    };
}

// ============================================================================
// MAIN RECOMMENDER CLASS
// ============================================================================

export class HybridRecommender {
    // Deterministic heuristic confidence weights. This is not a trained ML model.
    private heuristicWeights = {
        styleCoverage: 8,
        colorHarmonyQuality: 18,
        weatherQuality: 16,
        categoryCompleteness: 2,
        neutralRatio: 1,
        hasContrast: 13,
        outerwearFit: 7,
        footwearStyleFit: 5,
        isDress: -10,
        recentKeyPenalty: -8,
        feedbackPenalty: -8
    };
    private weights = [0, 0, 0, 0, 0, 0];
    private bias = 0;

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
        const targetStyle = preferences.occasion || (preferences as PreferencesWithLegacyStyle).style || "";
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

        // Preliminary scoring only limits combinatorics. Final scoring happens after
        // outerwear/accessory attachment so features and explanations match the UI.
        const baseCandidatePool = scored
            .filter(candidate => candidate.score > -999)
            .slice(0, 250);
        const assembledCandidatePool = this.attachOuterwearToFinalists(baseCandidatePool, partitioned.outerwear, preferences, history);
        const allFinalScoredCandidates = this.rescoreFinalOutfits(assembledCandidatePool, preferences, history, nonShortBottomsCount)
            .sort((a, b) => b.score - a.score);
        const repeatSafeFinalCandidates = allFinalScoredCandidates
            .filter(candidate => !history.recentFullOutfitIds.includes(this.getFullId(candidate)));
        const finalScoredCandidates = repeatSafeFinalCandidates.length > 0
            ? repeatSafeFinalCandidates
            : allFinalScoredCandidates;

        const selectionRankedCandidates = this.rankCandidatesForSelection(finalScoredCandidates, history, preferences.wearHistory, preferences.weatherContext);
        const finalists = this.selectDiverseFinalists(selectionRankedCandidates, history, eligibleOuterCount)
            .sort((a, b) => this.compareCandidatesForSelection(a, b, history, preferences.wearHistory, preferences.weatherContext));
        this.attachFootwearDebug(finalists, selectionRankedCandidates, preferences, history);
        this.attachSelectionDebug(finalists, history, preferences.wearHistory, preferences.weatherContext);

        const selectedScore = finalists[0]?.scoringDetails?.finalScore ?? 0;
        console.log("[Recommendation Audit]", {
            baseCandidates: candidates.length,
            prelimScoredCandidates: scored.length,
            assembledCandidates: assembledCandidatePool.length,
            finalScoredCandidates: finalScoredCandidates.length,
            topFiveScores: finalScoredCandidates.slice(0, 5).map(candidate => Number((candidate.scoringDetails?.finalScore ?? candidate.score * 100).toFixed(1))),
            selectedScore: Number(selectedScore.toFixed(1)),
            selectedReason: finalists[0]
                ? "Selected highest quality outfit after final assembly, with modest footwear rotation used only for close candidate selection."
                : "No final candidate survived scoring."
        });
        if (finalists[0]?.scoringDetails?.heuristicContributions) {
            console.log("[Heuristic Component Debug]", {
                selectedFootwear: finalists[0].footwear.name,
                selectedFootwearColor: finalists[0].footwear.color,
                heuristicConfidence: finalists[0].scoringDetails.mlScorePercent,
                finalScore: finalists[0].scoringDetails.finalScore,
                preferenceBoost: finalists[0].scoringDetails.preferenceAdjustment,
                components: finalists[0].scoringDetails.heuristicContributions
            });
        }

        // 10. Update & Save History
        if (finalists.length > 0) {
            this.updateHistory(history, finalists);
        }

        return {
            success: true,
            outfits: finalists,
            outfit: finalists[0],
            message: selectedScore > 0 && selectedScore < 85
                ? "Best available match from your wardrobe."
                : undefined
        };
    }

    // ========================================================================
    // HISTORY & SELECTION HELPERS
    // ========================================================================

    private loadHistory(): OutfitHistory {
        const defaultHistory = { recentFullOutfitIds: [], recentKeyItemIds: [], recentOuterwearIds: [], recentFootwearIds: [] };

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
                if (o.footwear) {
                    history.recentFootwearIds.unshift(o.footwear.id);
                }
                if (o.outerwear) {
                    history.recentOuterwearIds.unshift(o.outerwear.id);
                }
            }

            // Trim history
            history.recentFullOutfitIds = history.recentFullOutfitIds.slice(0, 50); // Keep last 50 full outfits
            history.recentKeyItemIds = history.recentKeyItemIds.slice(0, 80);       // Keep last 80 key items
            history.recentOuterwearIds = history.recentOuterwearIds.slice(0, 40);   // Keep last 40 outerwear
            history.recentFootwearIds = history.recentFootwearIds.slice(0, 60);     // Keep last 60 footwear

            localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        } catch (e) {
            // Silent fail
        }
    }

    private selectDiverseFinalists(scoredCandidates: Outfit[], history: OutfitHistory, eligibleOuterCount: number): Outfit[] {
        const TOP_K_POOL = 50;
        const TARGET_COUNT = 5;

        // Take top pool of candidates (already ranked for selection).
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

    private getQualityScore(outfit: Outfit): number {
        return outfit.scoringDetails?.finalScore ?? outfit.score * 100;
    }

    private getGeneratedFootwearSelectionAdjustment(outfit: Outfit, history: OutfitHistory): number {
        return this.getFootwearRotationPenalty(outfit.footwear, history);
    }

    private getFootwearSelectionScore(outfit: Outfit, history: OutfitHistory): number {
        return this.getQualityScore(outfit) + this.getFootwearRotationPenalty(outfit.footwear, history);
    }

    private getCandidateSelectionScore(
        outfit: Outfit,
        history: OutfitHistory,
        wearHistory?: WearHistoryContext,
        weatherContext?: WeatherContext
    ): number {
        return this.getQualityScore(outfit) +
            this.getGeneratedFootwearSelectionAdjustment(outfit, history) +
            this.getWearHistorySelectionAdjustment(outfit, wearHistory).adjustment +
            this.getTemperaturePracticalityAdjustment(outfit, weatherContext).adjustment;
    }

    private compareCandidatesForSelection(
        a: Outfit,
        b: Outfit,
        history: OutfitHistory,
        wearHistory?: WearHistoryContext,
        weatherContext?: WeatherContext
    ): number {
        const qualityDifference = this.getQualityScore(b) - this.getQualityScore(a);

        // Rotation is only a close-candidate tiebreaker. It should not let a
        // materially weaker outfit outrank a stronger recommendation, and it never
        // changes the user-facing quality score.
        if (Math.abs(qualityDifference) > 5) {
            return qualityDifference;
        }

        return this.getCandidateSelectionScore(b, history, wearHistory, weatherContext) -
            this.getCandidateSelectionScore(a, history, wearHistory, weatherContext);
    }

    private rankCandidatesForSelection(
        candidates: Outfit[],
        history: OutfitHistory,
        wearHistory?: WearHistoryContext,
        weatherContext?: WeatherContext
    ): Outfit[] {
        return [...candidates].sort((a, b) => this.compareCandidatesForSelection(a, b, history, wearHistory, weatherContext));
    }

    private attachSelectionDebug(
        finalists: Outfit[],
        history: OutfitHistory,
        wearHistory?: WearHistoryContext,
        weatherContext?: WeatherContext
    ) {
        for (const outfit of finalists) {
            const wearSignal = this.getWearHistorySelectionAdjustment(outfit, wearHistory);
            const temperatureSignal = this.getTemperaturePracticalityAdjustment(outfit, weatherContext);
            const generatedFootwearAdjustment = this.getGeneratedFootwearSelectionAdjustment(outfit, history);
            const qualityScore = this.getQualityScore(outfit);
            const selectionScore = qualityScore + generatedFootwearAdjustment + wearSignal.adjustment + temperatureSignal.adjustment;

            outfit.selectionDebug = {
                qualityScore: Number(qualityScore.toFixed(1)),
                selectionScore: Number(selectionScore.toFixed(1)),
                generatedFootwearAdjustment,
                wearHistoryAdjustment: wearSignal.adjustment,
                wearHistoryReasons: wearSignal.reasons,
                temperaturePracticalityAdjustment: temperatureSignal.adjustment,
                temperaturePracticalityReasons: temperatureSignal.reasons,
                affectedItemTypes: temperatureSignal.affectedItemTypes,
                weatherContext
            };
        }

        if (finalists[0]?.selectionDebug) {
            console.log("[Wear History Selection]", {
                selectedOutfit: this.getFullId(finalists[0]),
                qualityScore: finalists[0].selectionDebug.qualityScore,
                selectionScore: finalists[0].selectionDebug.selectionScore,
                generatedFootwearAdjustment: finalists[0].selectionDebug.generatedFootwearAdjustment,
                wearHistoryAdjustment: finalists[0].selectionDebug.wearHistoryAdjustment,
                wearHistoryReasons: finalists[0].selectionDebug.wearHistoryReasons,
                temperaturePracticalityAdjustment: finalists[0].selectionDebug.temperaturePracticalityAdjustment,
                temperaturePracticalityReasons: finalists[0].selectionDebug.temperaturePracticalityReasons,
                affectedItemTypes: finalists[0].selectionDebug.affectedItemTypes,
                weatherContext: finalists[0].selectionDebug.weatherContext
            });
        }
    }

    private attachFootwearDebug(
        finalists: Outfit[],
        finalScoredCandidates: Outfit[],
        preferences: Preferences,
        history: OutfitHistory
    ) {
        if (finalists.length === 0) return;

        const candidatesByFootwear = new Map<string, FootwearCandidateDebug>();
        for (const candidate of finalScoredCandidates.slice(0, 80)) {
            const footwearDebug = this.getFootwearCandidateScore(candidate, preferences, history);
            const existing = candidatesByFootwear.get(footwearDebug.id);
            if (!existing || footwearDebug.selectionScore > existing.selectionScore) {
                candidatesByFootwear.set(footwearDebug.id, footwearDebug);
            }
        }

        const candidateOptions = Array.from(candidatesByFootwear.values())
            .sort((a, b) => b.selectionScore - a.selectionScore)
            .slice(0, 12);

        for (const finalist of finalists) {
            const selectedDebug = candidateOptions.find(candidate => candidate.id === finalist.footwear.id) ||
                this.getFootwearCandidateScore(finalist, preferences, history);
            const hasRecentPenalty = selectedDebug.recentUseAdjustment < 0;
            const strongAlternatives = candidateOptions.filter(candidate =>
                candidate.id !== finalist.footwear.id &&
                candidate.qualityScore >= selectedDebug.qualityScore - 5
            );
            const reasonSelected = hasRecentPenalty && strongAlternatives.length === 0
                ? "Selected despite recent use because alternatives were much weaker."
                : hasRecentPenalty
                    ? "Selected as the best close-quality option after a modest recent-use selection adjustment."
                    : "Selected for style, occasion, and color compatibility.";

            finalist.footwearDebug = {
                candidateOptions,
                selectedFootwearId: finalist.footwear.id,
                selectedFootwearName: finalist.footwear.name,
                reasonSelected
            };
        }

        const primary = finalists[0];
        console.log("[Footwear Diversity]", {
            candidates: candidateOptions.map(candidate => ({
                name: candidate.name,
                qualityScore: candidate.qualityScore,
                selectionScore: candidate.selectionScore,
                styleMatch: candidate.styleMatch,
                recentUseAdjustment: candidate.recentUseAdjustment,
                reasons: candidate.reasons
            })),
            selectedFootwear: primary.footwear.name,
            selectedReason: primary.footwearDebug?.reasonSelected
        });
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

    private getWearCombinationId(outfit: Outfit): string {
        return this.getOutfitItems(outfit)
            .map(item => item.id)
            .sort()
            .join("|");
    }

    private getWearHistorySelectionAdjustment(
        outfit: Outfit,
        wearHistory?: WearHistoryContext
    ): { adjustment: number; reasons: string[] } {
        if (!wearHistory) return { adjustment: 0, reasons: ["No worn outfit history available yet."] };

        let adjustment = 0;
        const reasons: string[] = [];
        const fullId = this.getWearCombinationId(outfit);
        const keyId = this.getKeyItemId(outfit);

        const fullPenalty = this.getRecentWearPenalty(wearHistory.recentFullOutfitIds, fullId, [-8, -6, -4, -2]);
        if (fullPenalty !== 0) {
            adjustment += fullPenalty;
            reasons.push(`Full outfit was worn recently (${fullPenalty}).`);
        }

        const keyPenalty = this.getRecentWearPenalty(wearHistory.recentTopIds, keyId, [-3, -2, -1]);
        if (keyPenalty !== 0) {
            adjustment += keyPenalty;
            reasons.push(`Key item was worn recently (${keyPenalty}).`);
        }

        if (outfit.type === "separates") {
            const bottomPenalty = this.getRecentWearPenalty(wearHistory.recentBottomIds, outfit.bottom.id, [-3, -2, -1]);
            if (bottomPenalty !== 0) {
                adjustment += bottomPenalty;
                reasons.push(`Bottom was worn recently (${bottomPenalty}).`);
            }
        }

        const footwearPenalty = this.getRecentWearPenalty(wearHistory.recentFootwearIds, outfit.footwear.id, [-4, -3, -2, -1]);
        if (footwearPenalty !== 0) {
            adjustment += footwearPenalty;
            reasons.push(`Footwear was worn recently (${footwearPenalty}).`);
        }

        if (outfit.outerwear) {
            const outerwearPenalty = this.getRecentWearPenalty(wearHistory.recentOuterwearIds, outfit.outerwear.id, [-2, -1]);
            if (outerwearPenalty !== 0) {
                adjustment += outerwearPenalty;
                reasons.push(`Outerwear was worn recently (${outerwearPenalty}).`);
            }
        }

        return {
            adjustment,
            reasons: reasons.length > 0
                ? reasons
                : ["This outfit introduces wardrobe variety from worn history."]
        };
    }

    private getRecentWearPenalty(recentIds: string[] | undefined, itemId: string, penalties: number[]): number {
        const recentIndex = (recentIds || []).indexOf(itemId);
        if (recentIndex === -1) return 0;
        return penalties[Math.min(recentIndex, penalties.length - 1)] || 0;
    }

    private getTemperaturePracticalityAdjustment(
        outfit: Outfit,
        weatherContext?: WeatherContext
    ): { adjustment: number; reasons: string[]; affectedItemTypes: string[] } {
        if (!weatherContext || weatherContext.source !== "live") {
            return {
                adjustment: 0,
                reasons: ["Manual weather override is active, so live temperature is not used."],
                affectedItemTypes: []
            };
        }

        const temp = weatherContext.temperatureF;
        const items = this.getOutfitItems(outfit);
        const affectedItemTypes = new Set<string>();
        const reasons: string[] = [];
        let adjustment = 0;

        const hasOuterwear = Boolean(outfit.outerwear);
        const hasWarmLayer = items.some(item => this.isWarmLayer(item));
        const hasLightweight = items.some(item => this.isLightweightItem(item));
        const hasShortOrSkirt = outfit.type === "separates" && this.isShortsOrSkirts(outfit.bottom);
        const hasFullLengthBottom = outfit.type === "dress" || (outfit.type === "separates" && !this.isShortsOrSkirts(outfit.bottom));
        const hasOpenFootwear = this.isOpenFootwear(outfit.footwear);
        const hasRainSupport = (outfit.outerwear && this.isRainGear(outfit.outerwear)) || this.isRainGear(outfit.footwear);
        const hasRainSensitiveFootwear = this.isRainSensitiveFootwear(outfit.footwear);

        if (temp >= 95) {
            if (hasOuterwear) {
                adjustment -= 6;
                affectedItemTypes.add("outerwear");
                reasons.push(`Live weather is ${Math.round(temp)}°F, so heavy layers are strongly deprioritized.`);
            }
            if (hasWarmLayer) {
                adjustment -= 4;
                affectedItemTypes.add("warm layers");
                reasons.push(`Live weather is ${Math.round(temp)}°F, so hoodies, sweaters, and heavy knits are less practical.`);
            }
            if (hasLightweight || hasShortOrSkirt || outfit.type === "dress") {
                adjustment += 4;
                affectedItemTypes.add("lightweight pieces");
                reasons.push(`Live weather is ${Math.round(temp)}°F, so lightweight pieces are prioritized.`);
            }
        } else if (temp >= 85) {
            if (hasOuterwear) {
                adjustment -= 4;
                affectedItemTypes.add("outerwear");
                reasons.push(`Live weather is ${Math.round(temp)}°F, so outerwear is deprioritized.`);
            }
            if (hasWarmLayer) {
                adjustment -= 3;
                affectedItemTypes.add("warm layers");
                reasons.push(`Live weather is ${Math.round(temp)}°F, so warm layers are less practical.`);
            }
            if (hasLightweight || hasShortOrSkirt || outfit.type === "dress") {
                adjustment += 3;
                affectedItemTypes.add("lightweight pieces");
                reasons.push(`Live weather is ${Math.round(temp)}°F, so lightweight tops, dresses, skirts, and shorts are prioritized.`);
            }
        } else if (temp >= 75) {
            if (hasOuterwear) {
                adjustment -= 2;
                affectedItemTypes.add("outerwear");
                reasons.push(`Live weather is ${Math.round(temp)}°F, so heavy outerwear is slightly deprioritized.`);
            }
            if (hasLightweight || hasShortOrSkirt || outfit.type === "dress") {
                adjustment += 2;
                affectedItemTypes.add("lightweight pieces");
                reasons.push(`Live weather is ${Math.round(temp)}°F, so lighter pieces get a small preference.`);
            }
        } else if (temp >= 60) {
            reasons.push(`Live weather is ${Math.round(temp)}°F, so no major temperature adjustment was needed.`);
        } else if (temp >= 45) {
            if (hasOuterwear || hasWarmLayer) {
                adjustment += 2;
                affectedItemTypes.add("warmer layers");
                reasons.push(`Live weather is ${Math.round(temp)}°F, so warmer layers get a small preference.`);
            }
            if (!hasOuterwear && hasLightweight) {
                adjustment -= 2;
                affectedItemTypes.add("lightweight pieces");
                reasons.push(`Live weather is ${Math.round(temp)}°F, so lightweight-only outfits are slightly deprioritized.`);
            }
        } else {
            if (hasOuterwear || hasWarmLayer) {
                adjustment += 4;
                affectedItemTypes.add("warmer layers");
                reasons.push(`Live weather is ${Math.round(temp)}°F, so warm layers are prioritized.`);
            }
            if (hasFullLengthBottom) {
                adjustment += 2;
                affectedItemTypes.add("full-length bottoms");
                reasons.push(`Live weather is ${Math.round(temp)}°F, so full-length coverage is preferred.`);
            }
            if (hasShortOrSkirt || (!hasOuterwear && hasLightweight)) {
                adjustment -= 4;
                affectedItemTypes.add("lightweight pieces");
                reasons.push(`Live weather is ${Math.round(temp)}°F, so shorts or lightweight-only pieces are less practical.`);
            }
            if (hasOpenFootwear) {
                adjustment -= 4;
                affectedItemTypes.add("open footwear");
                reasons.push(`Live weather is ${Math.round(temp)}°F, so sandals or open footwear are deprioritized.`);
            }
        }

        if (temp < 32 || weatherContext.mappedWeatherCategory === "Snowy") {
            if (hasOuterwear || hasWarmLayer) {
                adjustment += 3;
                affectedItemTypes.add("warm outerwear");
                reasons.push("Freezing or snowy weather prioritizes warm outerwear.");
            }
            if (hasOpenFootwear || hasLightweight) {
                adjustment -= 5;
                affectedItemTypes.add("lightweight/open items");
                reasons.push("Freezing or snowy weather deprioritizes sandals and lightweight outfits.");
            }
        }

        if (weatherContext.mappedWeatherCategory === "Rainy") {
            if (hasRainSupport) {
                adjustment += 3;
                affectedItemTypes.add("rain support");
                reasons.push("Rainy live weather prioritizes rain-friendly footwear or outerwear.");
            }
            if (hasOpenFootwear || hasRainSensitiveFootwear) {
                adjustment -= 3;
                affectedItemTypes.add("rain-sensitive footwear");
                reasons.push("Rainy live weather deprioritizes open or rain-sensitive footwear.");
            }
        }

        const boundedAdjustment = Math.max(-8, Math.min(8, adjustment));

        return {
            adjustment: boundedAdjustment,
            reasons: reasons.length > 0
                ? reasons
                : [`Live weather is ${Math.round(temp)}°F, so the outfit is treated as temperature-neutral.`],
            affectedItemTypes: Array.from(affectedItemTypes)
        };
    }

    private getTemperatureQualityAdjustment(outfit: Outfit, weatherContext?: WeatherContext): number {
        if (!weatherContext || weatherContext.source !== "live") return 0;

        const temp = weatherContext.temperatureF;
        const items = this.getOutfitItems(outfit);
        const hasOuterwear = Boolean(outfit.outerwear);
        const hasWarmLayer = items.some(item => this.isWarmLayer(item));
        const hasLightweight = items.some(item => this.isLightweightItem(item));
        const hasOpenFootwear = this.isOpenFootwear(outfit.footwear);
        const hasShortOrSkirt = outfit.type === "separates" && this.isShortsOrSkirts(outfit.bottom);
        const hasRainSensitiveFootwear = this.isRainSensitiveFootwear(outfit.footwear);

        let adjustment = 0;

        if (temp >= 95 && (hasOuterwear || hasWarmLayer)) {
            adjustment -= 3;
        }

        if (temp < 45 && !hasOuterwear && hasLightweight) {
            adjustment -= 3;
        }

        if ((temp < 32 || weatherContext.mappedWeatherCategory === "Snowy") && (hasOpenFootwear || hasShortOrSkirt)) {
            adjustment -= 4;
        }

        if (weatherContext.mappedWeatherCategory === "Rainy" && (hasOpenFootwear || hasRainSensitiveFootwear)) {
            adjustment -= 2;
        }

        return Math.max(-4, Math.min(0, adjustment));
    }

    private isWarmLayer(item: Item): boolean {
        const text = this.getItemSearchText(item);
        return ["hoodie", "sweater", "sweatshirt", "jacket", "coat", "parka", "fleece", "wool", "knit", "outerwear"].some(keyword => text.includes(keyword));
    }

    private isLightweightItem(item: Item): boolean {
        const text = this.getItemSearchText(item);
        return ["t-shirt", "tee", "tank", "sleeveless", "camisole", "cami", "shorts", "skirt", "dress", "linen", "lightweight", "lace"].some(keyword => text.includes(keyword));
    }

    private isOpenFootwear(item: Item): boolean {
        const text = this.getItemSearchText(item);
        return ["sandal", "slides", "flip flop", "open toe", "open-toe"].some(keyword => text.includes(keyword));
    }

    private isRainSensitiveFootwear(item: Item): boolean {
        const text = this.getItemSearchText(item);
        return ["suede", "canvas", "open toe", "open-toe"].some(keyword => text.includes(keyword));
    }

    private getItemSearchText(item: Item): string {
        return `${item.name || ""} ${item.category || ""} ${(item.tags || []).join(" ")} ${(item.styles || []).join(" ")} ${item.description || ""}`.toLowerCase();
    }

    private getOuterwearRotationPenalty(outerwear: Item | undefined, history: OutfitHistory): number {
        if (!outerwear) return 0;
        const recentIndex = (history.recentOuterwearIds || []).indexOf(outerwear.id);
        if (recentIndex === -1) return 0;
        if (recentIndex === 0) return -5;
        if (recentIndex <= 2) return -4;
        if (recentIndex <= 5) return -3;
        return -1;
    }

    private getFootwearRotationPenalty(footwear: Item | undefined, history: OutfitHistory): number {
        if (!footwear) return 0;
        const recentIndex = (history.recentFootwearIds || []).indexOf(footwear.id);
        if (recentIndex === -1) return 0;
        if (recentIndex === 0) return -5;
        if (recentIndex <= 2) return -4;
        if (recentIndex <= 5) return -3;
        return -1;
    }

    private getFootwearCandidateScore(
        outfit: Outfit,
        preferences: Preferences,
        history: OutfitHistory
    ): FootwearCandidateDebug {
        const footwear = outfit.footwear;
        const reasons: string[] = [];
        const qualityScore = this.getQualityScore(outfit);
        const styleMatch = this.matchesStyle(footwear, preferences.occasion);
        const text = `${footwear.name || ""} ${footwear.category || ""} ${(footwear.tags || []).join(" ")} ${(footwear.styles || []).join(" ")}`.toLowerCase();
        const recentUseAdjustment = this.getFootwearRotationPenalty(footwear, history);
        const selectionScore = qualityScore + recentUseAdjustment;
        const isCasualRequest = preferences.occasion === "Casual" || preferences.occasion === "Sporty / Athleisure";
        const isFormalRequest = preferences.occasion === "Formal" || preferences.occasion === "Party / Dressy";
        const casualFootwear = ["sneaker", "trainer", "flat", "sandal", "casual", "athleisure", "sporty"].some(keyword => text.includes(keyword));
        const formalFootwear = ["heel", "loafer", "oxford", "dress shoe", "formal", "pump", "boot"].some(keyword => text.includes(keyword));

        if (styleMatch) {
            reasons.push("style match");
        }
        if (isCasualRequest && casualFootwear) {
            reasons.push("casual/sporty footwear fit");
        }
        if (isFormalRequest && formalFootwear) {
            reasons.push("formal/dressy footwear fit");
        }
        if (isFormalRequest && casualFootwear && !formalFootwear) {
            reasons.push("casual footwear is weaker for formal/dressy request");
        }
        if (this.isValidColorCombination(outfit.type === 'separates' ? outfit.top.color : outfit.dress.color, footwear.color)) {
            reasons.push("color-compatible");
        }
        if (recentUseAdjustment !== 0) {
            reasons.push(`recent footwear selection adjustment ${recentUseAdjustment}`);
        }

        return {
            id: footwear.id,
            name: footwear.name,
            qualityScore: Number(qualityScore.toFixed(1)),
            selectionScore: Number(selectionScore.toFixed(1)),
            styleMatch,
            recentUseAdjustment,
            reasons
        };
    }

    private getOuterwearCandidateScore(
        outfit: Outfit,
        outer: Item,
        preferences: Preferences,
        history: OutfitHistory,
        eligibleCount: number
    ): { score: number; reasons: string[] } {
        const reasons: string[] = [];
        let score = 0;
        const targetStyle = preferences.occasion || (preferences as PreferencesWithLegacyStyle).style || "";
        const baseColor = outfit.type === 'separates' ? outfit.top.color : outfit.dress.color;
        const weatherTags = (outer.weather || []).map(w => w.trim().toLowerCase());
        const weatherMatch = !preferences.weather || weatherTags.length === 0 || weatherTags.includes(preferences.weather.toLowerCase());
        const rainGear = this.isRainGear(outer);

        if (this.matchesStyle(outer, targetStyle)) {
            score += 4;
            reasons.push("style-compatible");
        }
        if (weatherMatch) {
            score += 4;
            reasons.push("weather-compatible");
        }
        if (preferences.weather === "Rainy") {
            if (rainGear) {
                score += 5;
                reasons.push("rain-specific outerwear");
            } else if (weatherMatch) {
                score += 2;
                reasons.push("tagged for rainy weather");
            } else {
                score -= 8;
                reasons.push("not rain-compatible");
            }
        }
        if (this.isValidColorCombination(baseColor, outer.color)) {
            score += 3;
            reasons.push("color-compatible");
        } else {
            score -= 2;
            reasons.push("color less compatible");
        }

        const rotationPenalty = this.getOuterwearRotationPenalty(outer, history);
        if (rotationPenalty !== 0 && eligibleCount > 1) {
            score += rotationPenalty;
            reasons.push(`recent outerwear rotation ${rotationPenalty}`);
        }
        const recentUseCount = (history.recentOuterwearIds || []).slice(0, 10).filter(id => id === outer.id).length;
        if (recentUseCount > 1 && eligibleCount > 1) {
            const repeatPenalty = -Math.min(4, recentUseCount);
            score += repeatPenalty;
            reasons.push(`appeared ${recentUseCount} times recently ${repeatPenalty}`);
        }
        if (eligibleCount >= 3 && preferences.penalizedOuterwearIds?.includes(outer.id)) {
            score -= 6;
            reasons.push("previously disliked outerwear -6");
        }

        return { score, reasons };
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
        const isRainy = preferences.weather === "Rainy";
        const eligibleCount = eligibleOuterwear.length;
        const rainCompatibleOuterwear = eligibleOuterwear.filter(outer =>
            this.isRainGear(outer) ||
            (outer.weather || []).some(w => w.trim().toLowerCase() === "rainy")
        );
        const umbrellas = (this.lastPartitionedAccessories || []).filter(item =>
            item.name.toLowerCase().includes("umbrella") ||
            (item.tags && item.tags.some(t => t.toLowerCase().includes("umbrella")))
        );

        console.log(`[Bulletproof Outer] Starting Assignment for ${finalists.length} base outfits.`);
        console.log(`[Bulletproof Outer] Eligible Pool (${eligibleCount}): [${eligibleOuterwear.map(o => o.id).join(', ')}]`);
        console.log(`[Bulletproof Outer] Base Finalist IDs: [${finalists.map(f => this.getBaseId(f)).join(', ')}]`);
        if (isRainy && rainCompatibleOuterwear.length === 1) {
            console.log("Only one rain-compatible outerwear item available.", {
                id: rainCompatibleOuterwear[0].id,
                name: rainCompatibleOuterwear[0].name
            });
        } else if (isRainy && rainCompatibleOuterwear.length === 0 && umbrellas.length > 0) {
            console.log("[Outerwear Diversity] No strong rain-compatible outerwear found. Umbrella/accessory support can cover rainy weather.");
        }

        return finalists.map((outfit, idx) => {
            const accessories = this.lastPartitionedAccessories || [];

            const rankedOuter = eligibleOuterwear.map(outer => {
                const ranked = this.getOuterwearCandidateScore(outfit, outer, preferences, history, eligibleCount);
                return { outer, ...ranked };
            }).sort((a, b) => b.score - a.score);

            let chosenOuter: Item | undefined = undefined;
            let reasonSelected = "No outerwear selected.";
            const uniqueChoice = rankedOuter.find(r => !usedOuterwearIds.has(r.outer.id));
            const topScore = rankedOuter[0]?.score ?? 0;
            const topUniqueChoice = uniqueChoice && uniqueChoice.score >= topScore - 6 ? uniqueChoice : undefined;

            const penalizedCount = preferences.penalizedOuterwearIds?.length || 0;
            if (idx === 0) {
                console.log(`[Bulletproof Outer] Eligible IDs: [${eligibleOuterwear.map(o => o.id).join(', ')}]`);
                console.log(`[Bulletproof Outer] Penalized IDs Count: ${penalizedCount}`);
            }

            if (topUniqueChoice) {
                chosenOuter = topUniqueChoice.outer;
                usedOuterwearIds.add(chosenOuter.id);
                reasonSelected = topUniqueChoice === rankedOuter[0]
                    ? "Highest-scoring weather/style/color match."
                    : "Selected close-scoring unused outerwear to improve rotation.";
            } else if (eligibleCount > 0) {
                const canUseUmbrellaFallback = isRainy &&
                    umbrellas.length > 0 &&
                    rainCompatibleOuterwear.length === 0 &&
                    rankedOuter[0]?.score < 7;

                if (canUseUmbrellaFallback) {
                    reasonSelected = "No strong rain-compatible outerwear; relying on umbrella/accessory support.";
                    console.log(`[Bulletproof Outer]   #${idx + 1}: ${reasonSelected}`);
                } else {
                    chosenOuter = rankedOuter[0].outer;
                    reasonSelected = eligibleCount === 1
                        ? "Only one weather-valid outerwear item available."
                        : "Re-using the highest-scoring outerwear because alternatives were much weaker.";
                    console.log(`[Bulletproof Outer]   #${idx + 1}: Pool exhausted or alternatives too weak. ${reasonSelected}`);
                }
            }

            const outerwearDebug: OuterwearSelectionDebug = {
                candidateOptions: rankedOuter.map(candidate => ({
                    id: candidate.outer.id,
                    name: candidate.outer.name,
                    score: Number(candidate.score.toFixed(1)),
                    reasons: candidate.reasons
                })),
                selectedOuterwearId: chosenOuter?.id,
                selectedOuterwearName: chosenOuter?.name,
                reasonSelected
            };

            if (chosenOuter) {
                console.log(`[Outerwear Diversity] #${idx + 1}`, {
                    candidates: outerwearDebug.candidateOptions,
                    selectedOuterwear: `${chosenOuter.name} (${chosenOuter.id})`,
                    reasonSelected
                });
                outfit = { ...outfit, outerwear: chosenOuter, outerwearDebug };
            } else {
                outfit = { ...outfit, outerwearDebug };
            }

            if (!chosenOuter && isCold) {
                console.warn(`[Bulletproof Outer]   #${idx + 1}: MANDATORY outerwear missing for Cold/Snowy!`);
            }

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
        const targetStyle = (preferences.occasion || (preferences as PreferencesWithLegacyStyle).style || "").trim();
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
            const group = getCategoryGroup(rawCat);

            // CATEGORY MAPPING (Inclusive for synonyms)
            if (group === "top") partitioned.tops.push(item);
            else if (group === "bottom") partitioned.bottoms.push(item);
            else if (group === "dress") partitioned.dresses.push(item);
            else if (group === "footwear") partitioned.footwear.push(item);
            else if (group === "outerwear" || c === "jacket" || c === "coat" || c.includes("jacket") || c.includes("coat")) {
                partitioned.outerwear.push(item);
            }
            else if (group === "accessory" || item.name.toLowerCase().includes("umbrella") || (item.tags && item.tags.some(t => t.toLowerCase().includes("umbrella")))) {
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
        const isNeutral1 = this.isNeutralLikeColor(color1);
        const isNeutral2 = this.isNeutralLikeColor(color2);

        // If either is neutral, combination is fine
        if (isNeutral1 || isNeutral2) return true;

        // If both are non-neutral, they should be different
        return color1 !== color2;
    }

    private isNeutralLikeColor(color?: string, item?: Item): boolean {
        const normalizedColor = (color || "").toLowerCase();
        const neutralColors = ["black", "white", "grey", "gray", "beige", "navy", "denim", "brown", "cream", "tan", "ivory"];

        if (neutralColors.some(n => normalizedColor.includes(n))) return true;

        if (normalizedColor.includes("multicolor") || normalizedColor.includes("multi-color")) {
            const metadata = item
                ? `${item.name || ""} ${item.category || ""} ${(item.tags || []).join(" ")} ${(item.styles || []).join(" ")} ${item.description || ""}`.toLowerCase()
                : "";
            const footwearLike = ["footwear", "shoe", "sneaker", "trainer", "flat", "sandal", "boot"].some(keyword => metadata.includes(keyword));
            const neutralMetadata = neutralColors.some(n => metadata.includes(n));

            return footwearLike || neutralMetadata;
        }

        return false;
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
            const ruleEvaluation = this.evaluateRuleScore(outfit, preferences);
            const ruleScore = ruleEvaluation.pointsAwarded;
            const features = this.extractFeatures(outfit, { ...preferences, recentKeyItemIds: history.recentKeyItemIds });
            const mlScore = this.predictProbability(features);
            const mlScorePercent = clampPercent(mlScore * 100);
            const heuristicContributions = this.getHeuristicContributions(features);
            let rotationPenalty = 0;
            let weatherPenalty = 0;
            const feedbackAdjustment = 0;
            const preferenceSignal = this.calculatePreferenceAdjustment(outfit, preferences.preferenceProfile);
            const fullId = this.getFullId(outfit);
            const keyId = this.getKeyItemId(outfit);

            if (history.recentFullOutfitIds.includes(fullId)) {
                return { ...outfit, ruleScore, mlScore, score: -9999, features, ruleEvaluation };
            }

            if (history.recentKeyItemIds.includes(keyId)) {
                rotationPenalty -= 5;
            }

            if (preferences.weather === "Cold" && outfit.type === "separates" && this.isShortsOrSkirts(outfit.bottom)) {
                if (nonShortBottomsCount >= 3) {
                    weatherPenalty -= 5;
                    coldPenaltyAppliedCount++;
                }
            }
            weatherPenalty += this.getTemperatureQualityAdjustment(outfit, preferences.weatherContext);

            const randomAdjustment = 0;
            const scoringDetails = this.createScoringDetails(
                ruleScore,
                mlScorePercent,
                rotationPenalty,
                weatherPenalty,
                feedbackAdjustment,
                preferenceSignal.adjustment,
                preferenceSignal.reasons,
                randomAdjustment,
                heuristicContributions
            );

            return {
                ...outfit,
                ruleScore,
                mlScore,
                score: scoringDetails.finalScore / 100,
                scoringDetails,
                ruleEvaluation,
                features
            };
        }).sort((a, b) => b.score - a.score);

        if (coldPenaltyAppliedCount > 0) {
            console.log(`[Score] Applied Cold penalty to ${coldPenaltyAppliedCount} short/skirt outfits.`);
        }

        return results;
    }

    private createScoringDetails(
        ruleScoreRaw: number,
        mlScorePercent: number,
        rotationPenalty: number,
        weatherPenalty: number,
        feedbackAdjustment: number,
        preferenceAdjustment: number,
        preferenceReasons: string[],
        randomAdjustment: number,
        heuristicContributions: HeuristicContribution[] = []
    ): ScoringDetails {
        return calculateScoringDetails({
            ruleScoreRaw,
            rotationPenalty,
            weatherPenalty,
            feedbackAdjustment,
            preferenceAdjustment,
            preferenceReasons,
            mlScorePercent,
            randomAdjustment,
            heuristicContributions,
        });
    }

    private rescoreFinalOutfits(
        outfits: Outfit[],
        preferences: Preferences,
        history: OutfitHistory,
        nonShortBottomsCount: number
    ): Outfit[] {
        return outfits.map(outfit => this.rescoreFinalOutfit(outfit, preferences, history, nonShortBottomsCount));
    }

    private rescoreFinalOutfit(
        outfit: Outfit,
        preferences: Preferences,
        history: OutfitHistory,
        nonShortBottomsCount: number
    ): Outfit {
        const ruleEvaluation = this.evaluateRuleScore(outfit, preferences);
        const ruleScore = ruleEvaluation.pointsAwarded;
        const features = this.extractFeatures(outfit, { ...preferences, recentKeyItemIds: history.recentKeyItemIds });
        const mlScore = this.predictProbability(features);
        const mlScorePercent = clampPercent(mlScore * 100);
        const heuristicContributions = this.getHeuristicContributions(features);
        const previousDetails = outfit.scoringDetails;
        const rotationPenalty = (history.recentKeyItemIds.includes(this.getKeyItemId(outfit)) ? -5 : 0) +
            this.getOuterwearRotationPenalty(outfit.outerwear, history);
        let weatherPenalty = 0;
        const preferenceSignal = this.calculatePreferenceAdjustment(outfit, preferences.preferenceProfile);

        if (preferences.weather === "Cold" && outfit.type === "separates" && this.isShortsOrSkirts(outfit.bottom) && nonShortBottomsCount >= 3) {
            weatherPenalty = -5;
        }
        weatherPenalty += this.getTemperatureQualityAdjustment(outfit, preferences.weatherContext);

        const scoringDetails = this.createScoringDetails(
            ruleScore,
            mlScorePercent,
            rotationPenalty,
            weatherPenalty,
            previousDetails?.feedbackAdjustment ?? 0,
            preferenceSignal.adjustment,
            preferenceSignal.reasons,
            previousDetails?.randomAdjustment ?? 0,
            heuristicContributions
        );

        return {
            ...outfit,
            ruleScore,
            mlScore,
            score: scoringDetails.finalScore / 100,
            scoringDetails,
            ruleEvaluation,
            features
        };
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
        return this.evaluateRuleScore(outfit, preferences).pointsAwarded;
    }

    private evaluateRuleScore(outfit: Outfit, preferences: Preferences): RuleEvaluationDetails {
        const passedRules: PassedRule[] = [];
        const failedRules: FailedRule[] = [];
        const notApplicableRules: NotApplicableRule[] = [];
        let pointsAwarded = 0;
        let pointsPossible = 0;

        const addPassed = (name: string, points: number, explanation: string) => {
            passedRules.push({ name, points, explanation });
            pointsAwarded += points;
            pointsPossible += points;
        };
        const addFailed = (name: string, pointsLost: number, explanation: string) => {
            failedRules.push({ name, pointsLost, explanation });
            pointsPossible += pointsLost;
        };
        const addNotApplicable = (name: string, explanation: string) => {
            notApplicableRules.push({ name, explanation });
        };

        const styleScore = this.calculateStyleScore(outfit, preferences.occasion);
        if (styleScore > 0) addPassed("Style Match", styleScore, `${styleScore} style points from items matching ${preferences.occasion}.`);
        if (styleScore < 8) addFailed("Style Match", 8 - styleScore, "Some visible items do not strongly match the requested style.");

        const colorScore = this.calculateColorScore(outfit);
        if (colorScore > 0) addPassed("Color Harmony", colorScore, "Colors include neutrals, balanced accents, or compatible contrast.");
        if (colorScore < 6) addFailed("Color Harmony", 6 - colorScore, "Color pairing has limited harmony points.");

        const weatherScore = this.calculateWeatherScore(outfit, preferences.weather);
        if (weatherScore > 0) addPassed("Weather Match", weatherScore, this.getWeatherExplanation(outfit, preferences.weather));
        if (weatherScore < 3) addFailed("Weather Match", 3 - weatherScore, "Weather support is incomplete for the selected condition.");

        if (outfit.type === 'dress' && (preferences.occasion === "Party / Dressy" || preferences.occasion === "Formal")) {
            addPassed("Dress Context Bonus", 1, "Dress outfit fits a formal or dressy context.");
        } else {
            addNotApplicable("Dress Context Bonus", "Only applies to formal or dressy dress outfits.");
        }

        return {
            passedRules,
            failedRules,
            notApplicableRules,
            rulesPassed: passedRules.length,
            rulesFailed: failedRules.length,
            pointsAwarded,
            pointsPossible,
            pointsLost: Math.max(0, pointsPossible - pointsAwarded)
        };
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
        const neutralCount = items.filter(item => this.isNeutralLikeColor(item.color, item)).length;

        let score = 0;

        // +2 if at least one neutral (provides base)
        if (neutralCount >= 1) {
            score += 2;
        }

        // +2 if good color balance (1-2 accent colors with neutrals)
        const nonNeutralColors = items
            .filter(item => item.color && !this.isNeutralLikeColor(item.color, item))
            .map(item => item.color);
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

    private getWeatherExplanation(outfit: Outfit, weather: WeatherType): string {
        if (weather === "Cold" || weather === "Snowy") {
            return outfit.outerwear
                ? `Outerwear is included for ${weather} weather.`
                : `No outerwear was included for ${weather} weather.`;
        }
        if (weather === "Sunny" || weather === "Warm") {
            return outfit.outerwear
                ? `Outerwear is included, so warm-weather scoring is reduced.`
                : `No outerwear is included for ${weather} weather.`;
        }
        if (weather === "Rainy") {
            if (outfit.outerwear && this.isRainGear(outfit.outerwear)) return "Rain-appropriate outerwear is included.";
            if (outfit.accessory && outfit.accessory.name.toLowerCase().includes("umbrella")) return "Umbrella support is included.";
            if (outfit.footwear.category.includes("Boot") || this.isRainGear(outfit.footwear)) return "Footwear supports rainy weather.";
            return "Rainy weather receives only the base weather score for this outfit.";
        }
        return "Weather constraint is broadly satisfied.";
    }

    // ========================================================================
    // ML FEATURE EXTRACTION
    // ========================================================================

    /**
     * Extract deterministic heuristic features. This is not a trained ML model.
     */
    private extractFeatures(outfit: Outfit, preferences: Preferences): number[] {
        const items = this.getOutfitItems(outfit);
        const styleMatches = items.filter(item => this.itemHasStyle(item, preferences.occasion)).length;
        const styleCoverage = items.length > 0 ? styleMatches / items.length : 0;
        const neutralRatio = items.length > 0
            ? items.filter(item => this.isNeutralLikeColor(item.color, item)).length / items.length
            : 0;
        const hasContrast = outfit.type === 'separates' && outfit.top.color !== outfit.bottom.color ? 1 : 0;
        const weatherQuality = this.calculateWeatherScore(outfit, preferences.weather) / 3;
        const hasOuterwear = outfit.outerwear ? 1 : 0;
        const isDress = outfit.type === 'dress' ? 1 : 0;
        const categoryCompleteness = outfit.type === 'separates'
            ? Number(Boolean(outfit.top && outfit.bottom && outfit.footwear))
            : Number(Boolean(outfit.dress && outfit.footwear));
        const colorHarmonyQuality = this.calculateColorScore(outfit) / 6;
        let outerwearFit = 0.5;
        if ((preferences.weather === "Cold" || preferences.weather === "Snowy") && outfit.outerwear) {
            outerwearFit = 1;
        } else if ((preferences.weather === "Sunny" || preferences.weather === "Warm") && !outfit.outerwear) {
            outerwearFit = 1;
        } else if (preferences.weather === "Rainy") {
            outerwearFit = outfit.outerwear && this.isRainGear(outfit.outerwear) ? 1 : 0.5;
        } else if (outfit.outerwear) {
            outerwearFit = 0.6;
        }
        const weatherSpecificity = (preferences.weather === "Rainy" || preferences.weather === "Cold" || preferences.weather === "Snowy") ? 1 : 0.75;
        const keyId = this.getKeyItemId(outfit);
        const recentKeyPenalty = preferences.recentKeyItemIds?.includes(keyId) ? 1 : 0;
        const feedbackPenaltySignal = outfit.outerwear && preferences.penalizedOuterwearIds?.includes(outfit.outerwear.id) ? 1 : 0;
        const footwearStyleFit = this.calculateFootwearStyleFit(outfit.footwear, preferences.occasion);

        return [
            styleCoverage,
            neutralRatio,
            hasContrast,
            weatherQuality,
            hasOuterwear,
            isDress,
            categoryCompleteness,
            colorHarmonyQuality,
            outerwearFit,
            weatherSpecificity,
            recentKeyPenalty,
            feedbackPenaltySignal,
            footwearStyleFit
        ];
    }

    private calculateFootwearStyleFit(footwear: Item, targetStyle: string): number {
        if (this.matchesStyle(footwear, targetStyle)) return 1;

        const normalizedTarget = this.normalizeStyleKey(targetStyle);
        const text = `${footwear.name || ""} ${footwear.category || ""} ${(footwear.tags || []).join(" ")} ${(footwear.styles || []).join(" ")} ${footwear.description || ""}`.toLowerCase();
        const casualFootwear = ["sneaker", "trainer", "flat", "sandal", "casual", "athleisure", "sporty"].some(keyword => text.includes(keyword));
        const formalFootwear = ["heel", "loafer", "oxford", "dress shoe", "formal", "pump"].some(keyword => text.includes(keyword));

        if ((normalizedTarget === "casual" || normalizedTarget === "sporty/athleisure") && casualFootwear) return 1;
        if ((normalizedTarget === "formal" || normalizedTarget === "party/dressy") && formalFootwear) return 1;
        if ((normalizedTarget === "formal" || normalizedTarget === "party/dressy") && casualFootwear && !formalFootwear) return 0;

        return 0.5;
    }

    /**
     * Legacy logistic-style predictor kept unused for old audit comparisons.
     */
    private predictProbabilityLegacy(features: number[]): number {
        let z = this.bias;
        for (let i = 0; i < Math.min(features.length, this.weights.length); i++) {
            z += features[i] * this.weights[i];
        }

        // Small random jitter for variety (±0.05)
        z += (Math.random() - 0.5) * 0.1;

        return 1 / (1 + Math.exp(-z));
    }

    private getHeuristicContributions(features: number[]): HeuristicContribution[] {
        const [
            styleCoverage = 0,
            neutralRatio = 0,
            hasContrast = 0,
            weatherQuality = 0,
            hasOuterwear = 0,
            isDress = 0,
            categoryCompleteness = 0,
            colorHarmonyQuality = 0,
            outerwearFit = 0,
            weatherSpecificity = 0,
            recentKeyPenalty = 0,
            feedbackPenalty = 0,
            footwearStyleFit = 0
        ] = features;

        const outerwearValue = hasOuterwear ? outerwearFit * weatherSpecificity : 0;

        return [
            {
                component: "Base Confidence",
                value: 45,
                weight: 1,
                contribution: 45,
                explanation: "Starting point for a complete candidate outfit."
            },
            {
                component: "Style Match",
                value: styleCoverage,
                weight: this.heuristicWeights.styleCoverage,
                contribution: styleCoverage * this.heuristicWeights.styleCoverage,
                explanation: "Share of visible items matching the requested style."
            },
            {
                component: "Color Harmony",
                value: colorHarmonyQuality,
                weight: this.heuristicWeights.colorHarmonyQuality,
                contribution: colorHarmonyQuality * this.heuristicWeights.colorHarmonyQuality,
                explanation: "Neutral balance, accent control, and compatible color pairing."
            },
            {
                component: "Weather Match",
                value: weatherQuality * weatherSpecificity,
                weight: this.heuristicWeights.weatherQuality,
                contribution: weatherQuality * weatherSpecificity * this.heuristicWeights.weatherQuality,
                explanation: "How well the outfit supports the selected weather."
            },
            {
                component: "Category Completeness",
                value: categoryCompleteness,
                weight: this.heuristicWeights.categoryCompleteness,
                contribution: categoryCompleteness * this.heuristicWeights.categoryCompleteness,
                explanation: "Whether the outfit has the required clothing categories."
            },
            {
                component: "Neutral Color Support",
                value: neutralRatio,
                weight: this.heuristicWeights.neutralRatio,
                contribution: neutralRatio * this.heuristicWeights.neutralRatio,
                explanation: "Share of items with neutral or neutral-like colors."
            },
            {
                component: "Color Contrast",
                value: hasContrast,
                weight: this.heuristicWeights.hasContrast,
                contribution: hasContrast * this.heuristicWeights.hasContrast,
                explanation: "Separates get a boost when top and bottom colors are distinct."
            },
            {
                component: "Outerwear / Footwear Weather Support",
                value: outerwearValue,
                weight: this.heuristicWeights.outerwearFit,
                contribution: outerwearValue * this.heuristicWeights.outerwearFit,
                explanation: "Weather-specific support from outerwear when relevant."
            },
            {
                component: "Footwear Style Fit",
                value: footwearStyleFit,
                weight: this.heuristicWeights.footwearStyleFit,
                contribution: footwearStyleFit * this.heuristicWeights.footwearStyleFit,
                explanation: "Whether the selected footwear metadata fits the requested occasion."
            },
            {
                component: "Dress Calibration",
                value: isDress,
                weight: this.heuristicWeights.isDress,
                contribution: isDress * this.heuristicWeights.isDress,
                explanation: "Keeps dress outfits comparable with separates in the heuristic."
            },
            {
                component: "Recent Key Item Rotation",
                value: recentKeyPenalty,
                weight: this.heuristicWeights.recentKeyPenalty,
                contribution: recentKeyPenalty * this.heuristicWeights.recentKeyPenalty,
                explanation: "Small quality adjustment when the key clothing item was recently used."
            },
            {
                component: "Feedback Penalty Signal",
                value: feedbackPenalty,
                weight: this.heuristicWeights.feedbackPenalty,
                contribution: feedbackPenalty * this.heuristicWeights.feedbackPenalty,
                explanation: "Penalty when the outfit includes a specifically disliked outerwear signal."
            }
        ].map(contribution => ({
            ...contribution,
            value: Number(contribution.value.toFixed(3)),
            contribution: Number(contribution.contribution.toFixed(1))
        }));
    }

    private predictProbability(features: number[]): number {
        const score = this.getHeuristicContributions(features)
            .reduce((total, contribution) => total + contribution.contribution, 0);

        return clampPercent(score) / 100;
    }

    private calculatePreferenceAdjustment(outfit: Outfit, profile?: PreferenceProfile): { adjustment: number; reasons: string[] } {
        if (!profile) return { adjustment: 0, reasons: ["No learned preference profile available yet."] };

        const items = this.getOutfitItems(outfit);
        const colors = items.map(item => item.color).filter(Boolean);
        const categories = items.map(item => item.category).filter(Boolean);
        const styles = items.flatMap(item => item.styles && item.styles.length > 0 ? item.styles : [item.style]).filter(Boolean);
        const itemIds = items.map(item => item.id);
        const combinationKey = this.getCombinationKey(outfit);
        const reasons: string[] = [];
        let adjustment = 0;

        const likedColorMatches = this.countNetPreferenceMatches(colors, profile.likedColors, profile.dislikedColors, 1);
        if (likedColorMatches > 0) {
            const boost = Math.min(3, likedColorMatches);
            adjustment += boost;
            reasons.push(`Boosted +${boost} because this outfit uses colors you have liked before.`);
        }

        const dislikedColorMatches = this.countNetPreferenceMatches(colors, profile.likedColors, profile.dislikedColors, -1);
        if (dislikedColorMatches > 0) {
            const penalty = Math.min(5, dislikedColorMatches * 2);
            adjustment -= penalty;
            reasons.push(`Reduced -${penalty} because this outfit includes colors you have disliked before.`);
        }

        const likedStyleMatches = this.countNetPreferenceMatches(styles, profile.likedStyles, profile.dislikedStyles, 1);
        if (likedStyleMatches > 0) {
            const boost = Math.min(3, likedStyleMatches);
            adjustment += boost;
            reasons.push(`Boosted +${boost} because it matches styles you often like.`);
        }

        const dislikedCategoryMatches = this.countNetPreferenceMatches(categories, profile.likedCategories, profile.dislikedCategories, -1);
        if (dislikedCategoryMatches > 0) {
            const penalty = Math.min(5, dislikedCategoryMatches * 2);
            adjustment -= penalty;
            reasons.push(`Reduced -${penalty} because it includes categories you have disliked before.`);
        }

        const likedCategoryMatches = this.countNetPreferenceMatches(categories, profile.likedCategories, profile.dislikedCategories, 1);
        if (likedCategoryMatches > 0) {
            const boost = Math.min(2, likedCategoryMatches);
            adjustment += boost;
            reasons.push(`Boosted +${boost} because it includes categories you have liked before.`);
        }

        const dislikedItemMatches = itemIds.filter(id => this.getNetPreference(id, profile.likedItems || {}, profile.dislikedItems) < 0);
        if (dislikedItemMatches.length > 0) {
            const hasRepeatedDislike = dislikedItemMatches.some(id => Math.abs(this.getNetPreference(id, profile.likedItems || {}, profile.dislikedItems)) >= 2);
            const penalty = hasRepeatedDislike ? 5 : Math.min(5, dislikedItemMatches.length * 3);
            adjustment -= penalty;
            reasons.push(`Reduced -${penalty} because this includes an item you previously disliked.`);
        }

        const combinationPreference = this.getNetPreference(combinationKey, profile.likedCombinations, profile.dislikedCombinations);
        if (combinationPreference > 0) {
            adjustment += 3;
            reasons.push("Boosted +3 because this item combination has been liked before.");
        }
        if (combinationPreference < 0) {
            adjustment -= 5;
            reasons.push("Reduced -5 because this item combination has been disliked before.");
        }

        return {
            adjustment: Math.max(-8, Math.min(8, adjustment)),
            reasons: reasons.length > 0 ? reasons : ["No strong learned preference pattern matched this outfit."]
        };
    }

    private countNetPreferenceMatches(
        values: string[],
        likedCounts: Record<string, number>,
        dislikedCounts: Record<string, number>,
        direction: 1 | -1
    ): number {
        return values.reduce((count, value) => {
            const net = this.getNetPreference(value, likedCounts, dislikedCounts);
            if (direction === 1 && net > 0) return count + 1;
            if (direction === -1 && net < 0) return count + 1;
            return count;
        }, 0);
    }

    private getNetPreference(value: string, likedCounts: Record<string, number>, dislikedCounts: Record<string, number>): number {
        return (likedCounts[value] || 0) - (dislikedCounts[value] || 0);
    }

    private getCombinationKey(outfit: Outfit): string {
        const ids = this.getOutfitItems(outfit).map(item => item.id).sort();
        return ids.join("|");
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
