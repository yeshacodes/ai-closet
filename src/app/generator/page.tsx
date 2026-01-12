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
import { HybridRecommender, Outfit } from "@/lib/recommender"

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

    const [preferences, setPreferences] = useState({
        weather: "Sunny",
        occasion: "Casual"
    })

    const recommender = new HybridRecommender()

    useEffect(() => {
        fetchItems()
        fetchDislikedItems()
    }, [])

    const fetchItems = async () => {
        try {
            const { data, error } = await supabase.from('items').select('*')
            if (error) throw error
            setItems(data || [])
        } catch (error) {
            console.error('Error fetching items:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchDislikedItems = async () => {
        try {
            // Fetch items that were explicitly disliked (liked = false)
            const { data, error } = await supabase
                .from('outfit_feedback')
                .select('outerwear_id')
                .eq('liked', false)
                .not('outerwear_id', 'is', null)

            if (error) throw error

            if (data) {
                const ids = new Set(data.map(item => item.outerwear_id))
                setDislikedItemIds(ids)
            }
        } catch (error) {
            console.error('Error fetching disliked items:', error)
        }
    }

    const generateOutfit = () => {
        setGenerating(true)
        setError(null)
        setOutfit(null)
        setFeedbackGiven(false)

        setTimeout(() => {
            try {
                const prefs = {
                    weather: preferences.weather,
                    occasion: preferences.occasion,
                    penalizedOuterwearIds: Array.from(dislikedItemIds)
                }
                const result = recommender.generateOutfit(items, prefs as any)

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
            const feedbackData: any = {
                footwear_id: outfit.footwear.id,
                outerwear_id: outfit.outerwear?.id || null,
                requested_style: preferences.occasion,
                weather: preferences.weather,
                liked: liked,
                features: outfit.features,
                rule_score: outfit.ruleScore,
                ml_score: outfit.mlScore,
                final_score: outfit.score
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

            if (error) throw error
            setFeedbackGiven(true)
        } catch (err: any) {
            console.error("Error saving feedback:", {
                message: err.message,
                details: err.details,
                hint: err.hint,
                code: err.code
            })
            alert(`Failed to save feedback: ${err.message || "Unknown error"}`)
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
                                    Thanks for your feedback! We'll learn from this.
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
                <div className="aspect-[3/4] relative bg-muted">
                    <img src={item.image_url} alt={item.name} className="object-cover w-full h-full" />
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
