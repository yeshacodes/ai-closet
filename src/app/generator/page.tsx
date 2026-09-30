"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { CheckCircle2, Sparkles, ThumbsUp, ThumbsDown, AlertCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Item } from "@/types"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Loader } from "@/components/ui/loader"
import { HybridRecommender, Outfit, PreferenceProfile, Preferences, WearHistoryContext, WeatherContext } from "@/lib/recommender"
import {
    buildOutfitHistoryPayload,
    buildWearHistoryContext,
    fetchOutfitHistory,
    getOutfitCombinationId,
    OutfitHistoryRow,
    saveOutfitHistory
} from "@/lib/outfitHistory"
import { getDisplayColor, getDisplayItemName } from "@/lib/itemDisplay"
import { fetchCurrentWeather, CurrentWeatherResult } from "@/lib/weather"
import { getWeatherBadgeIcon } from "@/lib/weatherMapping"
import { useSessionMode } from "@/lib/sessionMode"
import { getScopedInsertData, getScopeLabel, scopedSelect } from "@/lib/dataScope"
import { EmptyState, PageShell } from "@/components/ui/page-shell"

const weathers = ["Sunny", "Rainy", "Cold", "Warm", "Snowy"]
const occasions = ["Casual", "Smart Casual", "Formal", "Party / Dressy", "Sporty / Athleisure", "Streetwear"]
const WEATHER_DETECTION_ERROR = "Unable to detect weather. Please choose manually."

export default function GeneratorPage() {
    const scope = useSessionMode()
    const [items, setItems] = useState<Item[]>([])
    const [loading, setLoading] = useState(true)
    const [generating, setGenerating] = useState(false)
    const [outfit, setOutfit] = useState<Outfit | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [feedbackGiven, setFeedbackGiven] = useState(false)
    const [wornSaving, setWornSaving] = useState(false)
    const [wornMessage, setWornMessage] = useState<string | null>(null)
    const [detectingWeather, setDetectingWeather] = useState(false)
    const [liveWeather, setLiveWeather] = useState<CurrentWeatherResult | null>(null)
    const [weatherMessage, setWeatherMessage] = useState<string | null>(null)
    const [weatherMessageType, setWeatherMessageType] = useState<"success" | "error" | "loading" | null>(null)

    const [dislikedItemIds, setDislikedItemIds] = useState<Set<string>>(new Set())
    const [preferenceProfile, setPreferenceProfile] = useState<PreferenceProfile | undefined>(undefined)
    const [outfitHistory, setOutfitHistory] = useState<OutfitHistoryRow[]>([])
    const [wearHistory, setWearHistory] = useState<WearHistoryContext | undefined>(undefined)

    const [preferences, setPreferences] = useState({
        weather: "Sunny",
        occasion: "Casual"
    })
    const activeWeatherContext: WeatherContext | undefined = liveWeather
        ? {
            temperatureF: liveWeather.temperatureF,
            temperatureC: liveWeather.temperatureC,
            weatherCode: liveWeather.weatherCode,
            mappedWeatherCategory: liveWeather.mappedWeatherCategory,
            source: liveWeather.source,
            detectedAt: liveWeather.detectedAt
        }
        : undefined
    const whyThisOutfit = outfit
        ? buildWhyThisOutfit(outfit, preferences, preferenceProfile, dislikedItemIds, activeWeatherContext, scope.isDemo)
        : []
    const personalizationReasons = outfit && !scope.isDemo
        ? buildPersonalizationReasons(outfit, preferenceProfile, dislikedItemIds)
        : []

    const recommender = new HybridRecommender()

    useEffect(() => {
        if (!scope.isLoading) fetchItems()
    }, [scope.isLoading, scope.mode, scope.userId])

    const fetchItems = async () => {
        try {
            const { data, error } = await scopedSelect('items', scope)
            if (error) throw error
            const wardrobeItems = (data || []) as Item[]
            setItems(wardrobeItems)
            await fetchFeedbackProfile(wardrobeItems)
            await refreshWearHistory()
        } catch (error: unknown) {
            console.error('Error fetching items:', error)
        } finally {
            setLoading(false)
        }
    }

    const refreshWearHistory = async () => {
        try {
            const rows = await fetchOutfitHistory(100, scope)
            setOutfitHistory(rows)
            setWearHistory(buildWearHistoryContext(rows))
        } catch (error) {
            console.error('Error fetching outfit history:', error)
        }
    }

    const fetchFeedbackProfile = async (wardrobeItems = items) => {
        try {
            const { data, error } = await scopedSelect('outfit_feedback', scope)

            if (error) throw error

            const feedbackRows = (data || []) as Array<{
                liked?: boolean;
                top_id?: string | null;
                bottom_id?: string | null;
                dress_id?: string | null;
                footwear_id?: string | null;
                outerwear_id?: string | null;
                requested_style?: string | null;
            }>

            if (feedbackRows.length > 0) {
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

                for (const row of feedbackRows) {
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
        setWornMessage(null)

        setTimeout(() => {
            try {
                const prefs: Preferences = {
                    weather: preferences.weather as Preferences["weather"],
                    occasion: preferences.occasion as Preferences["occasion"],
                    penalizedOuterwearIds: Array.from(dislikedItemIds),
                    preferenceProfile,
                    wearHistory,
                    weatherContext: activeWeatherContext
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
        if (scope.isDemo) {
            alert("Demo mode is read-only. Sign in to save your own changes.")
            return
        }

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

            const feedbackData: Record<string, unknown> = getScopedInsertData({
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
            }, scope)

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

    const handleMarkAsWorn = async () => {
        if (!outfit) return
        if (scope.isDemo) {
            setWornMessage("Demo mode is read-only. Sign in to save your own changes.")
            return
        }

        const outfitId = getOutfitCombinationId(outfit)
        const duplicateWindowMs = 2 * 60 * 1000
        const recentDuplicate = outfitHistory.some(row =>
            row.outfit_id === outfitId &&
            Date.now() - new Date(row.worn_at).getTime() < duplicateWindowMs
        )

        if (recentDuplicate) {
            setWornMessage("This outfit was just marked as worn.")
            return
        }

        try {
            setWornSaving(true)
            const payload = buildOutfitHistoryPayload(outfit, {
                weather: preferences.weather as Preferences["weather"],
                occasion: preferences.occasion as Preferences["occasion"]
            })
            await saveOutfitHistory(payload, scope)
            setWornMessage("Marked as worn. Future recommendations will rotate from this history.")
            await refreshWearHistory()
        } catch (err: unknown) {
            const errorInfo = err as { message?: string }
            console.error("Error saving outfit history:", err)
            setWornMessage(errorInfo.message || "Unable to mark outfit as worn.")
        } finally {
            setWornSaving(false)
        }
    }

    const handleUseCurrentWeather = async () => {
        try {
            setDetectingWeather(true)
            setWeatherMessage("Detecting weather...")
            setWeatherMessageType("loading")

            const currentWeather = await fetchCurrentWeather()
            if (!weathers.includes(currentWeather.category)) {
                throw new Error("Live weather mapped to an unsupported category. Please choose weather manually.")
            }

            console.info("Live weather applied to generator", {
                previousWeather: preferences.weather,
                detectedWeather: currentWeather.category,
                temperatureF: currentWeather.temperatureF,
                weatherCode: currentWeather.weatherCode,
                rainChanceNext3Hours: currentWeather.rainChanceNext3Hours
            })
            setLiveWeather(currentWeather)
            setPreferences(prev => ({
                ...prev,
                weather: currentWeather.category
            }))
            setWeatherMessage(`${Math.round(currentWeather.temperatureF)} degrees F - ${currentWeather.mappedWeatherCategory} - Live weather`)
            setWeatherMessageType("success")
        } catch (error: unknown) {
            console.error("Unable to detect weather:", error)
            const errorInfo = error as { message?: string }
            setLiveWeather(null)
            setWeatherMessage(errorInfo.message || WEATHER_DETECTION_ERROR)
            setWeatherMessageType("error")
        } finally {
            setDetectingWeather(false)
        }
    }

    return (
        <PageShell size="default" className="space-y-8">
            <div className="mx-auto max-w-3xl space-y-3 text-center">
                <p className="fashion-eyebrow">Recommendation studio</p>
                <h1 className="text-4xl font-semibold tracking-tight">Outfit Generator</h1>
                <p className="text-muted-foreground">Generate a scored outfit using style, weather, wardrobe history, and learned preferences.</p>
                <span className="inline-flex rounded-full border border-white/10 bg-secondary/30 px-3 py-1 text-xs text-muted-foreground">
                    {getScopeLabel(scope)}
                </span>
            </div>

            {/* Controls */}
            <Card className="bg-white/[0.035]">
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 items-end gap-4 lg:grid-cols-[1fr_auto_1fr_auto]">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Weather</label>
                            <Select
                                value={preferences.weather}
                                className="h-11"
                                onChange={e => {
                                    setPreferences({ ...preferences, weather: e.target.value })
                                    if (liveWeather && e.target.value !== liveWeather.category) {
                                        setLiveWeather(null)
                                        setWeatherMessage(null)
                                        setWeatherMessageType(null)
                                    }
                                }}
                            >
                                {weathers.map(w => <option key={w} value={w}>{w}</option>)}
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <span className="hidden text-sm font-medium text-transparent lg:block">Live Weather</span>
                            <Button
                                type="button"
                                variant="outline"
                                className="h-11 w-full justify-center border-white/10 bg-background/70 px-4 text-sm lg:w-auto"
                                onClick={handleUseCurrentWeather}
                                disabled={detectingWeather}
                            >
                                {detectingWeather ? "Detecting..." : "Use Current Weather"}
                            </Button>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Occasion / Style</label>
                            <Select
                                value={preferences.occasion}
                                className="h-11"
                                onChange={e => setPreferences({ ...preferences, occasion: e.target.value })}
                            >
                                {occasions.map(o => <option key={o} value={o}>{o}</option>)}
                            </Select>
                        </div>
                        <Button
                            size="lg"
                            onClick={generateOutfit}
                            disabled={loading || generating}
                            className="h-11 w-full lg:w-auto"
                        >
                            {generating ? <Loader className="mr-2" /> : <Sparkles className="mr-2 h-4 w-4" />}
                            Generate Outfit
                        </Button>
                    </div>
                    {weatherMessage && (
                        <div className="mt-4 space-y-1">
                            <div className={`inline-flex max-w-full items-center rounded-full border px-3 py-1 text-xs ${weatherMessageType === "error"
                                ? "border-destructive/30 bg-destructive/10 text-destructive"
                                : weatherMessageType === "loading"
                                    ? "border-white/10 bg-secondary/40 text-muted-foreground"
                                    : "border-white/10 bg-secondary/50 text-muted-foreground"
                                }`}>
                                {weatherMessageType === "success" && liveWeather && (
                                    <span className="mr-1.5">{getWeatherBadgeIcon(liveWeather.category)}</span>
                                )}
                                <span className="truncate">{weatherMessage}</span>
                                {weatherMessageType === "success" && (
                                    <button
                                        type="button"
                                        className="ml-2 border-l border-white/10 pl-2 text-foreground/80 hover:text-foreground"
                                        onClick={handleUseCurrentWeather}
                                        disabled={detectingWeather}
                                    >
                                        Refresh
                                    </button>
                                )}
                            </div>
                            {weatherMessageType === "success" && liveWeather?.forecastOverrideApplied && (
                                <p className="text-[11px] text-muted-foreground">
                                    Rain expected within the next few hours
                                </p>
                            )}
                            {weatherMessageType === "success" && !liveWeather?.forecastOverrideApplied && liveWeather?.rainChanceNext3Hours !== undefined && (
                                <p className="text-[11px] text-muted-foreground">
                                    Rain chance next 3h: {Math.round(liveWeather.rainChanceNext3Hours)}%
                                </p>
                            )}
                        </div>
                    )}
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

                        {/* User-facing explanation section */}
                        <div className="flex flex-col items-center gap-4 rounded-lg border border-white/10 bg-white/[0.035] p-6">
                            <div className="w-full max-w-2xl rounded-lg border border-white/10 bg-background/70 p-5 text-sm shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-primary" />
                                    <p className="font-medium text-foreground">Why this outfit?</p>
                                </div>
                                <ul className="mt-4 space-y-2 text-sm leading-relaxed text-muted-foreground">
                                    {whyThisOutfit.map(reason => (
                                        <li key={reason} className="flex gap-2">
                                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                                            <span>{reason}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {personalizationReasons.length > 0 && (
                                <div className="w-full max-w-2xl rounded-lg border border-white/10 bg-background/60 p-5 text-sm shadow-[0_18px_60px_rgba(0,0,0,0.16)]">
                                    <p className="font-medium text-foreground">Personalized for You</p>
                                    <ul className="mt-4 space-y-2 text-sm leading-relaxed text-muted-foreground">
                                        {personalizationReasons.map(reason => (
                                            <li key={reason} className="flex gap-2">
                                                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                                                <span>{reason}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="flex flex-col items-center gap-2">
                                <Button
                                    variant="secondary"
                                    className="gap-2"
                                    onClick={handleMarkAsWorn}
                                    disabled={wornSaving}
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                    {wornSaving ? "Saving..." : "Mark as Worn"}
                                </Button>
                                {wornMessage && (
                                    <p className="max-w-md text-center text-xs text-muted-foreground">{wornMessage}</p>
                                )}
                            </div>

                            {!scope.isDemo && (
                                <p className="font-medium">How do you like this outfit?</p>
                            )}

                            {!scope.isDemo && !feedbackGiven ? (
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
                            ) : !scope.isDemo && (
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
                    <EmptyState
                        icon={<Sparkles className="h-9 w-9" />}
                        title="Ready to style your closet"
                        description="Choose weather and occasion, then generate the strongest available outfit from your wardrobe."
                    />
                )}
            </div>
        </PageShell>
    )
}

function buildWhyThisOutfit(
    outfit: Outfit,
    preferences: { weather: string; occasion: string },
    _profile: PreferenceProfile | undefined,
    _dislikedItemIds: Set<string>,
    weatherContext?: WeatherContext,
    isDemo = false
) {
    if (isDemo) {
        return [
            "Selected for the current weather.",
            "Matches the chosen occasion.",
            "Uses a balanced color combination.",
            "Demonstrates how AI Closet creates recommendations."
        ]
    }

    const items = getOutfitItems(outfit)
    const bullets: string[] = []

    const matchingStyleCount = items.filter(item => itemMatchesStyle(item, preferences.occasion)).length
    if (matchingStyleCount > 0) {
        bullets.push(`Matches your chosen ${preferences.occasion} style.`)
    }

    const weatherReason = getWeatherReason(outfit, preferences.weather)
    if (weatherReason) bullets.push(weatherReason)

    const liveWeatherReason = getLiveWeatherReason(outfit, weatherContext)
    if (liveWeatherReason) bullets.push(liveWeatherReason)

    const colorReason = getColorReason(items)
    if (colorReason) bullets.push(colorReason)

    if (isLightweightWeather(preferences.weather, outfit)) {
        bullets.push("Includes lightweight pieces for comfort.")
    }

    if (outfit.type === "separates") {
        bullets.push("Creates a complete look with a top, bottom, and footwear.")
    } else {
        bullets.push("Creates a complete look with a dress and footwear.")
    }

    bullets.push("Creates a balanced and versatile look.")

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

function buildPersonalizationReasons(
    outfit: Outfit,
    profile: PreferenceProfile | undefined,
    dislikedItemIds: Set<string>
) {
    if (!profile) return []

    const items = getOutfitItems(outfit)
    const reasons: string[] = []

    const likedStyles = getPositiveNetMatches(
        items.flatMap(item => item.styles?.length ? item.styles : [item.style]).filter(Boolean),
        profile.likedStyles,
        profile.dislikedStyles
    )
    if (likedStyles.length > 0) {
        reasons.push(`You often like ${likedStyles[0]} outfits.`)
    }

    const likedColors = getPositiveNetMatches(
        items.map(item => item.color),
        profile.likedColors,
        profile.dislikedColors
    )
    if (likedColors.length > 0) {
        reasons.push(`${likedColors.slice(0, 2).join(" and ")} appears frequently in outfits you have liked.`)
    }

    const outfitIds = new Set(items.map(item => item.id))
    const avoidsDislikedItems = dislikedItemIds.size > 0 && !Array.from(dislikedItemIds).some(id => outfitIds.has(id))
    if (avoidsDislikedItems) {
        reasons.push("This outfit avoids items you previously disliked.")
    }

    const combinationReason = getPositiveCombinationReason(outfit, profile)
    if (combinationReason) reasons.push(combinationReason)

    return reasons.slice(0, 4)
}

function getPositiveCombinationReason(outfit: Outfit, profile: PreferenceProfile) {
    const ids = getOutfitItems(outfit).map(item => item.id)
    const likedCombinationKeys = Object.keys(profile.likedCombinations || {})
    const dislikedCombinationKeys = Object.keys(profile.dislikedCombinations || {})
    const overlapsLiked = likedCombinationKeys.some(key => ids.some(id => key.includes(id)))
    const overlapsDisliked = dislikedCombinationKeys.some(key => ids.some(id => key.includes(id)))

    return overlapsLiked && !overlapsDisliked
        ? "Similar outfit combinations have received positive feedback."
        : null
}

function itemMatchesStyle(item: Item, selectedStyle: string) {
    const styles = item.styles?.length ? item.styles : [item.style]
    return styles.some(style => normalizeLabel(style) === normalizeLabel(selectedStyle) || normalizeLabel(style) === "all styles")
}

function getWeatherReason(outfit: Outfit, weather: string) {
    if (weather === "Rainy") {
        if (outfit.outerwear && isRainFriendly(outfit.outerwear)) {
            return "Selected for rainy weather with weather-friendly outerwear."
        }
        if (outfit.accessory && normalizeLabel(outfit.accessory.name).includes("umbrella")) {
            return "Selected for rainy weather with umbrella support."
        }
        return "Selected for rainy weather."
    }

    if ((weather === "Cold" || weather === "Snowy") && outfit.outerwear) {
        return `Selected for ${weather} weather with an outer layer.`
    }

    if ((weather === "Warm" || weather === "Sunny") && !outfit.outerwear) {
        return `Selected for ${weather} weather with lightweight pieces.`
    }

    return `Selected for ${weather} weather.`
}

function getLiveWeatherReason(outfit: Outfit, weatherContext?: WeatherContext) {
    if (!weatherContext || weatherContext.source !== "live") return null
    const temp = Math.round(weatherContext.temperatureF)

    if (weatherContext.mappedWeatherCategory === "Rainy") {
        return "Keeps the outfit practical for rainy weather."
    }

    if (temp >= 85) {
        if (outfit.outerwear) return "Balances today's warm weather with your selected style."
        return "Chosen for today's warm weather with lighter pieces."
    }

    if (temp < 50) {
        if (outfit.outerwear) return "Includes warmer layers for today's weather."
        return "Selected with today's cooler weather in mind."
    }

    return "Selected for today's live weather."
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

function isLightweightWeather(weather: string, outfit: Outfit) {
    return (weather === "Warm" || weather === "Sunny") && !outfit.outerwear
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
            <Card className="h-full overflow-hidden">
                <div className="relative flex h-64 items-center justify-center bg-zinc-950/70 md:h-72">
                    <img src={item.image_url} alt={getDisplayItemName(item)} className="object-contain w-full h-full p-3" />
                </div>
                <CardContent className="p-4">
                    <h3 className="font-semibold">{getDisplayItemName(item)}</h3>
                    <p className="text-sm text-muted-foreground">{getDisplayColor(item.color)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{displayStyle}</p>
                </CardContent>
            </Card>
        </motion.div>
    )
}
