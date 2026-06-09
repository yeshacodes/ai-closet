"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Sparkles, ThumbsUp, ThumbsDown, AlertCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Item } from "@/types"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Loader } from "@/components/ui/loader"
import { HybridRecommender, Outfit, PreferenceProfile, Preferences } from "@/lib/recommender"

const weathers = ["Sunny", "Rainy", "Cold", "Warm", "Snowy"]
const occasions = ["Casual", "Smart Casual", "Formal", "Party / Dressy", "Sporty / Athleisure", "Streetwear"]

export default function GeneratorPage() {
    const [items, setItems] = useState<Item[]>([])
    const [loading, setLoading] = useState(true)
    const [generating, setGenerating] = useState(false)
    const [outfit, setOutfit] = useState<Outfit | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [feedbackGiven, setFeedbackGiven] = useState(false)

    const [dislikedItemIds, setDislikedItemIds] = useState<Set<string>>(new Set())
    const [preferenceProfile, setPreferenceProfile] = useState<PreferenceProfile | undefined>(undefined)

    const [preferences, setPreferences] = useState({
        weather: "Sunny",
        occasion: "Casual"
    })
    const whyThisOutfit = outfit
        ? buildWhyThisOutfit(outfit, preferences, preferenceProfile, dislikedItemIds)
        : []

    const recommender = new HybridRecommender()

    useEffect(() => {
        fetchItems()
    }, [])

    const fetchItems = async () => {
        try {
            const { data, error } = await supabase.from('items').select('*')
            if (error) throw error
            const wardrobeItems = data || []
            setItems(wardrobeItems)
            await fetchFeedbackProfile(wardrobeItems)
        } catch (error) {
            console.error('Error fetching items:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchFeedbackProfile = async (wardrobeItems = items) => {
        try {
            const { data, error } = await supabase
                .from('outfit_feedback')
                .select('*')

            if (error) throw error

            if (data) {
                const profile: PreferenceProfile = {
                    likedColors: {},
                    dislikedColors: {},
                    likedStyles: {},
                    dislikedStyles: {},
                    likedCategories: {},
                    dislikedCategories: {},
                    likedItems: {},
                    dislikedItems: {},
                    likedCombinations: {},
                    dislikedCombinations: {}
                }
                const dislikedOuterwear = new Set<string>()
                const itemMap = new Map(wardrobeItems.map(item => [item.id, item]))
                const add = (bucket: Record<string, number>, key?: string | null) => {
                    if (!key) return
                    bucket[key] = (bucket[key] || 0) + 1
                }

                for (const row of data) {
                    if (typeof row.liked !== "boolean") continue
                    const ids = [row.top_id, row.bottom_id, row.dress_id, row.footwear_id, row.outerwear_id].filter(Boolean) as string[]
                    const rowItems = ids.map(id => itemMap.get(id)).filter(Boolean) as Item[]
                    const liked = row.liked
                    const buckets = liked
                        ? { colors: profile.likedColors, styles: profile.likedStyles, categories: profile.likedCategories, items: profile.likedItems!, combinations: profile.likedCombinations }
                        : { colors: profile.dislikedColors, styles: profile.dislikedStyles, categories: profile.dislikedCategories, items: profile.dislikedItems, combinations: profile.dislikedCombinations }

                    for (const item of rowItems) {
                        add(buckets.colors, item.color)
                        add(buckets.categories, item.category)
                        ;(item.styles?.length ? item.styles : [item.style]).forEach(style => add(buckets.styles, style))
                        add(buckets.items, item.id)
                    }
                    if (row.requested_style) add(buckets.styles, row.requested_style)
                    if (ids.length > 0) add(buckets.combinations, [...ids].sort().join("|"))
                    if (!liked && row.outerwear_id) dislikedOuterwear.add(row.outerwear_id)
                }

                setPreferenceProfile(profile)
                setDislikedItemIds(dislikedOuterwear)
            }
        } catch (error) {
            console.error('Error fetching feedback profile:', error)
        }
    }

    const generateOutfit = () => {
        setGenerating(true)
        setError(null)
        setOutfit(null)
        setFeedbackGiven(false)

        setTimeout(() => {
            try {
                const prefs: Preferences = {
                    weather: preferences.weather as Preferences["weather"],
                    occasion: preferences.occasion as Preferences["occasion"],
                    penalizedOuterwearIds: Array.from(dislikedItemIds),
                    preferenceProfile
                }
                const result = recommender.generateOutfit(items, prefs)

                if (!result.success) {
                    setError(result.error || "Failed to generate outfit.")
                } else if (result.outfit) {
                    setOutfit(result.outfit)
                }
            } catch (err) {
                console.error(err)
                setError("An unexpected error occurred while generating the outfit.")
            } finally {
                setGenerating(false)
            }
        }, 600)
    }

    const handleFeedback = async (liked: boolean) => {
        if (!outfit) return

        try {
            // If disliked, add outerwear to disliked list immediately
            if (!liked && outfit.outerwear) {
                setDislikedItemIds(prev => {
                    const next = new Set(prev)
                    next.add(outfit.outerwear!.id)
                    return next
                })
            }

            // Prepare feedback data based on outfit type
            const personalizationFields: Record<string, unknown> = {
                base_score_before_preferences: outfit.scoringDetails?.baseScoreBeforePreferences !== undefined ? outfit.scoringDetails.baseScoreBeforePreferences / 100 : null,
                preference_adjustment: outfit.scoringDetails?.preferenceAdjustment ?? null,
                final_score_after_preferences: outfit.scoringDetails?.finalScoreAfterPreferences !== undefined ? outfit.scoringDetails.finalScoreAfterPreferences / 100 : outfit.score
            }

            const feedbackData: Record<string, unknown> = {
                footwear_id: outfit.footwear.id,
                outerwear_id: outfit.outerwear?.id || null,
                requested_style: preferences.occasion,
                weather: preferences.weather,
                liked: liked,
                features: outfit.features,
                rule_score: outfit.ruleScore,
                ml_score: outfit.mlScore,
                final_score: outfit.score,
                ...personalizationFields
            }

            if (outfit.type === 'separates') {
                feedbackData.top_id = outfit.top.id
                feedbackData.bottom_id = outfit.bottom.id
                feedbackData.outfit_type = 'separates'
            } else {
                feedbackData.dress_id = outfit.dress.id
                feedbackData.outfit_type = 'dress'
            }

            const { error } = await supabase.from('outfit_feedback').insert(feedbackData)

            if (error) {
                const message = error.message || ""
                const isSchemaMismatch = message.includes("base_score_before_preferences") ||
                    message.includes("preference_adjustment") ||
                    message.includes("final_score_after_preferences") ||
                    message.includes("schema cache")

                if (!isSchemaMismatch) throw error

                const fallbackFeedbackData = { ...feedbackData }
                delete fallbackFeedbackData.base_score_before_preferences
                delete fallbackFeedbackData.preference_adjustment
                delete fallbackFeedbackData.final_score_after_preferences

                const { error: fallbackError } = await supabase.from('outfit_feedback').insert(fallbackFeedbackData)
                if (fallbackError) throw fallbackError
            }
            setFeedbackGiven(true)
            await fetchFeedbackProfile()
        } catch (err: unknown) {
            const errorInfo = err as { message?: string; details?: string; hint?: string; code?: string }
            console.error("Error saving feedback:", {
                message: errorInfo.message,
                details: errorInfo.details,
                hint: errorInfo.hint,
                code: errorInfo.code
            })
            alert(`Failed to save feedback: ${errorInfo.message || "Unknown error"}`)
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold">Outfit Generator</h1>
                <p className="text-muted-foreground">AI-powered recommendations based on your style and weather.</p>
            </div>

            {/* Controls */}
            <Card>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Weather</label>
                            <Select
                                value={preferences.weather}
                                onChange={e => setPreferences({ ...preferences, weather: e.target.value })}
                            >
                                {weathers.map(w => <option key={w} value={w}>{w}</option>)}
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Occasion / Style</label>
                            <Select
                                value={preferences.occasion}
                                onChange={e => setPreferences({ ...preferences, occasion: e.target.value })}
                            >
                                {occasions.map(o => <option key={o} value={o}>{o}</option>)}
                            </Select>
                        </div>
                        <Button
                            size="lg"
                            onClick={generateOutfit}
                            disabled={loading || generating}
                            className="w-full"
                        >
                            {generating ? <Loader className="mr-2" /> : <Sparkles className="mr-2 h-4 w-4" />}
                            Generate Outfit
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Results */}
            <div className="min-h-[400px]">
                {generating ? (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                        <Loader className="h-8 w-8 mb-4" />
                        <p>Running ML Ranker...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-64 text-destructive">
                        <AlertCircle className="h-10 w-10 mb-2" />
                        <p>{error}</p>
                        <Button variant="link" onClick={() => window.location.href = '/upload'}>Upload more items</Button>
                    </div>
                ) : outfit ? (
                    <div className="space-y-8">
                        <div className={`grid grid-cols-1 gap-8 ${outfit.type === 'separates'
                            ? (outfit.outerwear || outfit.accessory ? 'md:grid-cols-4' : 'md:grid-cols-3')
                            : (outfit.outerwear || outfit.accessory ? 'md:grid-cols-3' : 'md:grid-cols-2')
                            }`}>
                            {outfit.type === 'separates' ? (
                                <>
                                    <OutfitCard item={outfit.top} label="Top" />
                                    <OutfitCard item={outfit.bottom} label="Bottom" />
                                    <OutfitCard item={outfit.footwear} label="Footwear" />
                                    {outfit.outerwear && <OutfitCard item={outfit.outerwear} label="Outerwear" />}
                                    {outfit.accessory && <OutfitCard item={outfit.accessory} label="Accessory" />}
                                </>
                            ) : (
                                <>
                                    <OutfitCard item={outfit.dress} label="Dress" />
                                    <OutfitCard item={outfit.footwear} label="Footwear" />
                                    {outfit.outerwear && <OutfitCard item={outfit.outerwear} label="Outerwear" />}
                                    {outfit.accessory && <OutfitCard item={outfit.accessory} label="Accessory" />}
                                </>
                            )}
                        </div>

                        {/* Feedback Section */}
                        <div className="flex flex-col items-center gap-4 p-6 bg-secondary/20 rounded-xl">
                            <p className="font-medium">How do you like this outfit?</p>
                            <div className="flex gap-4 text-xs text-muted-foreground">
                                <span>Final Score: {(outfit.score * 100).toFixed(1)}%</span>
                                <span>•</span>
                                <span>Rule Score: {outfit.ruleScore}/17</span>
                                {outfit.mlScore && (
                                    <>
                                        <span>•</span>
                                        <span>ML Score: {(outfit.mlScore * 100).toFixed(1)}%</span>
                                    </>
                                )}
                            </div>

                            <div className="w-full max-w-2xl rounded-lg border border-white/10 bg-background/70 p-4 text-sm">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                                    <p className="font-medium">Why this outfit?</p>
                                </div>
                                <ul className="mt-3 space-y-2 text-xs leading-relaxed text-muted-foreground">
                                    {whyThisOutfit.map(reason => (
                                        <li key={reason} className="flex gap-2">
                                            <span className="text-foreground">-</span>
                                            <span>{reason}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {outfit.scoringDetails && (
                                <div className="w-full max-w-2xl rounded-lg border border-white/10 bg-background/60 p-4 text-sm">
                                    <p className="font-medium">Score Breakdown</p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Scores are recommendation confidence indicators, not absolute fashion ratings.
                                    </p>
                                    <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                                        <span>Rule Score: {outfit.scoringDetails.ruleScorePercent.toFixed(1)}%</span>
                                        <span>Heuristic Match Confidence: {outfit.scoringDetails.mlScorePercent.toFixed(1)}%</span>
                                        <span>Base Before Preferences: {outfit.scoringDetails.baseScoreBeforePreferences.toFixed(1)}%</span>
                                        <span>Preference Adjustment: {outfit.scoringDetails.preferenceAdjustment >= 0 ? "+" : ""}{outfit.scoringDetails.preferenceAdjustment.toFixed(1)}</span>
                                    </div>
                                    <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                                        {outfit.scoringDetails.preferenceReasons.map(reason => (
                                            <p key={reason}>{reason}</p>
                                        ))}
                                    </div>
                                    {outfit.scoringDetails.heuristicContributions && outfit.scoringDetails.heuristicContributions.length > 0 && (
                                        <div className="mt-4 space-y-2 border-t border-white/10 pt-3 text-xs text-muted-foreground">
                                            <p className="font-medium text-foreground">Heuristic Components</p>
                                            {outfit.scoringDetails.heuristicContributions.map(component => (
                                                <div key={component.component} className="grid grid-cols-[1fr_auto] gap-3">
                                                    <span>{component.component}: {component.explanation}</span>
                                                    <span>{component.contribution >= 0 ? "+" : ""}{component.contribution.toFixed(1)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            {outfit.ruleEvaluation && (
                                <div className="w-full max-w-2xl rounded-lg border border-white/10 bg-background/60 p-4 text-sm">
                                    <p className="font-medium">Rule Evaluation</p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Points Awarded: {outfit.ruleEvaluation.pointsAwarded} / {outfit.ruleEvaluation.pointsPossible}
                                    </p>
                                    <div className="mt-3 grid grid-cols-1 gap-4 text-xs text-muted-foreground md:grid-cols-2">
                                        <div>
                                            <p className="font-medium text-foreground">Passed Rules</p>
                                            {outfit.ruleEvaluation.passedRules.map(rule => (
                                                <p key={rule.name}>+{rule.points} {rule.name}: {rule.explanation}</p>
                                            ))}
                                        </div>
                                        <div>
                                            <p className="font-medium text-foreground">Failed Rules</p>
                                            {outfit.ruleEvaluation.failedRules.length > 0 ? outfit.ruleEvaluation.failedRules.map(rule => (
                                                <p key={rule.name}>-{rule.pointsLost} {rule.name}: {rule.explanation}</p>
                                            )) : <p>No failed scoring rules.</p>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!feedbackGiven ? (
                                <div className="flex gap-4">
                                    <Button
                                        variant="outline"
                                        className="gap-2 hover:bg-green-100 hover:text-green-700 hover:border-green-200"
                                        onClick={() => handleFeedback(true)}
                                    >
                                        <ThumbsUp className="h-4 w-4" /> Like
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="gap-2 hover:bg-red-100 hover:text-red-700 hover:border-red-200"
                                        onClick={() => handleFeedback(false)}
                                    >
                                        <ThumbsDown className="h-4 w-4" /> Dislike
                                    </Button>
                                </div>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="text-green-600 font-medium"
                                >
                                    Thanks for your feedback! We&apos;ll learn from this.
                                </motion.div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border-2 border-dashed rounded-xl">
                        <Sparkles className="h-10 w-10 mb-2 opacity-20" />
                        <p>Select preferences and click Generate to see your outfit.</p>
                    </div>
                )}
            </div>
        </div>
    )
}

function buildWhyThisOutfit(
    outfit: Outfit,
    preferences: { weather: string; occasion: string },
    profile: PreferenceProfile | undefined,
    dislikedItemIds: Set<string>
) {
    const items = getOutfitItems(outfit)
    const bullets: string[] = []

    const matchingStyleCount = items.filter(item => itemMatchesStyle(item, preferences.occasion)).length
    if (matchingStyleCount > 0) {
        bullets.push(`Matches your selected ${preferences.occasion} style across the main outfit pieces.`)
    }

    const weatherReason = getWeatherReason(outfit, preferences.weather)
    if (weatherReason) bullets.push(weatherReason)

    const colorReason = getColorReason(items)
    if (colorReason) bullets.push(colorReason)

    const preferenceReason = getPreferenceReason(items, profile)
    if (preferenceReason) bullets.push(preferenceReason)

    const outfitIds = new Set(items.map(item => item.id))
    const avoidsDislikedItems = dislikedItemIds.size > 0 && !Array.from(dislikedItemIds).some(id => outfitIds.has(id))
    if (avoidsDislikedItems) {
        bullets.push("Avoids outerwear you previously disliked.")
    }

    if (outfit.type === "separates") {
        bullets.push("Builds a complete outfit with a top, bottom, and footwear.")
    } else {
        bullets.push("Builds a complete outfit with a dress and footwear.")
    }

    bullets.push("Ranked highest among the generated outfit candidates.")

    return bullets.slice(0, 5)
}

function getOutfitItems(outfit: Outfit) {
    const items: Item[] = [outfit.footwear]
    if (outfit.type === "separates") {
        items.push(outfit.top, outfit.bottom)
    } else {
        items.push(outfit.dress)
    }
    if (outfit.outerwear) items.push(outfit.outerwear)
    if (outfit.accessory) items.push(outfit.accessory)
    return items
}

function itemMatchesStyle(item: Item, selectedStyle: string) {
    const styles = item.styles?.length ? item.styles : [item.style]
    return styles.some(style => normalizeLabel(style) === normalizeLabel(selectedStyle) || normalizeLabel(style) === "all styles")
}

function getWeatherReason(outfit: Outfit, weather: string) {
    if (weather === "Rainy") {
        if (outfit.outerwear && isRainFriendly(outfit.outerwear)) {
            return "Suitable for Rainy weather because it includes weather-friendly outerwear."
        }
        if (outfit.accessory && normalizeLabel(outfit.accessory.name).includes("umbrella")) {
            return "Suitable for Rainy weather because it includes umbrella support."
        }
        return "Selected with your Rainy weather preference in mind."
    }

    if ((weather === "Cold" || weather === "Snowy") && outfit.outerwear) {
        return `Suitable for ${weather} weather because it includes an outer layer.`
    }

    if ((weather === "Warm" || weather === "Sunny") && !outfit.outerwear) {
        return `Suitable for ${weather} weather because it keeps the outfit lightweight.`
    }

    return `Selected for your ${weather} weather preference.`
}

function getColorReason(items: Item[]) {
    const colors = Array.from(new Set(items.map(item => item.color).filter(Boolean)))
    if (colors.length === 0) return null

    const neutralColors = ["black", "white", "grey", "gray", "beige", "navy", "denim", "brown"]
    const neutralMatches = colors.filter(color => neutralColors.some(neutral => normalizeLabel(color).includes(neutral)))
    if (neutralMatches.length >= 2) {
        return `Uses ${neutralMatches.slice(0, 2).join(" and ")}, a balanced neutral color pairing.`
    }
    if (colors.length >= 2) {
        return `Pairs ${colors.slice(0, 2).join(" and ")} for clear color contrast.`
    }
    return `Keeps the color palette focused around ${colors[0]}.`
}

function getPreferenceReason(items: Item[], profile: PreferenceProfile | undefined) {
    if (!profile) return null

    const likedColors = getPositiveNetMatches(items.map(item => item.color), profile.likedColors, profile.dislikedColors)
    if (likedColors.length > 0) {
        return `Uses ${likedColors.slice(0, 2).join(" and ")}, colors you have liked before.`
    }

    const styles = items.flatMap(item => item.styles?.length ? item.styles : [item.style]).filter(Boolean)
    const likedStyles = getPositiveNetMatches(styles, profile.likedStyles, profile.dislikedStyles)
    if (likedStyles.length > 0) {
        return `Reflects ${likedStyles[0]}, a style pattern you have liked before.`
    }

    return null
}

function getPositiveNetMatches(values: Array<string | undefined>, liked: Record<string, number>, disliked: Record<string, number>) {
    const uniqueValues = Array.from(new Set(values.filter(Boolean))) as string[]
    return uniqueValues.filter(value => (liked[value] || 0) - (disliked[value] || 0) > 0)
}

function isRainFriendly(item: Item) {
    const text = normalizeLabel(`${item.name} ${item.category} ${(item.tags || []).join(" ")}`)
    return ["rain", "waterproof", "windcheater", "trench", "parka", "anorak", "hoodie", "nylon", "boot"].some(keyword => text.includes(keyword))
}

function normalizeLabel(value?: string) {
    return (value || "").trim().toLowerCase()
}

function OutfitCard({ item, label }: { item: Item | null, label: string }) {
    if (!item) return null

    // Display logic: Join styles if array, else fallback to style
    const displayStyle = (item.styles && item.styles.length > 0) ? item.styles.join(" • ") : item.style

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
        >
            <div className="text-center font-medium text-muted-foreground uppercase tracking-wider text-xs">{label}</div>
            <Card className="overflow-hidden h-full">
                <div className="h-64 md:h-72 relative bg-muted/60 flex items-center justify-center">
                    <img src={item.image_url} alt={item.name} className="object-contain w-full h-full p-3" />
                </div>
                <CardContent className="p-4">
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-sm text-muted-foreground">{item.color}</p>
                    <p className="text-xs text-muted-foreground mt-1">{displayStyle}</p>
                </CardContent>
            </Card>
        </motion.div>
    )
}
