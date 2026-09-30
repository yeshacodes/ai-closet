"use client"

import { useState, useRef } from "react"
import { Upload, X, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader } from "@/components/ui/loader"
import { predictItemDetails } from "@/utils/heuristics"
import { CLOSET_CATEGORIES } from "@/lib/categories"
import { useSessionMode } from "@/lib/sessionMode"
import { getScopedInsertData } from "@/lib/dataScope"
import { PageShell } from "@/components/ui/page-shell"

const categories = [...CLOSET_CATEGORIES]
const stylesList = ["Casual", "Smart Casual", "Formal", "Party / Dressy", "Sporty / Athleisure", "Streetwear"]
const weatherOptions = ["Sunny", "Rainy", "Cold", "Warm", "Snowy"]
const colors = ["Black", "White", "Blue", "Red", "Green", "Yellow", "Pink", "Purple", "Beige", "Grey", "Brown", "Orange", "Navy", "Maroon", "Teal", "Olive"]

type AiStyleSuggestion = {
    suggestedStyles: string[]
    styleReasoning: string
    styleConfidence: number
}

type PredictionLogData = {
    source?: string
    name?: string
    category?: string
    color?: string
    styles?: string[]
    confidence?: number
    vision_label?: string
    vision_confidence?: number
    heuristic_color?: string
    detected_color?: string
}

export default function UploadPage() {
    const scope = useSessionMode()
    const router = useRouter()
    const [file, setFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [simulatingAI, setSimulatingAI] = useState(false)
    const [aiNote, setAiNote] = useState<string | null>(null)
    const [aiStyleSuggestion, setAiStyleSuggestion] = useState<AiStyleSuggestion | null>(null)
    const [weatherReasoning, setWeatherReasoning] = useState<string | null>(null)

    // Store prediction for logging
    const predictionRef = useRef<PredictionLogData | null>(null)

    const [formData, setFormData] = useState({
        name: "",
        category: "",
        color: "",
        styles: [] as string[],
        weather: [] as string[],
        description: ""
    })

    const [isCustomColor, setIsCustomColor] = useState(false)
    const [uploadedPath, setUploadedPath] = useState<string | null>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) {
            setFile(selectedFile)
            setPreviewUrl(URL.createObjectURL(selectedFile))
            // Reset prediction when file changes
            predictionRef.current = null
            setAiNote(null)
            setAiStyleSuggestion(null)
            setWeatherReasoning(null)
        }
    }

    const removeFile = () => {
        setFile(null)
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
        setUploadedPath(null)
        predictionRef.current = null
        setAiNote(null)
        setAiStyleSuggestion(null)
        setWeatherReasoning(null)
    }

    const handleSmartAI = async () => {
        if (!file) return
        if (scope.isDemo) {
            setAiNote("Demo mode is read-only. Sign in to save your own changes.")
            return
        }
        setSimulatingAI(true)
        setAiNote("Analyzing image with OpenAI Vision...")

        try {
            // 1. Upload temporarily to get a URL for OpenAI
            let currentPath = uploadedPath
            if (!currentPath) {
                const fileExt = file.name.split('.').pop()
                currentPath = `${scope.userId || "user"}/${Math.random()}.${fileExt}`
                const { error: uploadError } = await supabase.storage
                    .from('closet')
                    .upload(currentPath, file)

                if (uploadError) throw uploadError
                setUploadedPath(currentPath)
            }

            // 2. Generate Signed URL for OpenAI (it can't see private buckets)
            const { data: signedData, error: signedError } = await supabase.storage
                .from('closet')
                .createSignedUrl(currentPath, 600) // 10 mins

            if (signedError) throw signedError

            // 3. Call our server-side API
            const response = await fetch("/api/ai/predict-item", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    image_url: signedData.signedUrl,
                    hints: {
                        name: formData.name,
                        category: formData.category
                    }
                })
            })

            const text = await response.text();
            if (!response.ok) {
                let msg = text;
                try {
                    const data = JSON.parse(text);
                    msg = data.error || data.message || msg;
                } catch {
                    // Not JSON, keep text as msg
                }
                console.error("AI API error response:", msg);
                throw new Error(msg || "AI Predict failed");
            }

            let aiData;
            try {
                aiData = JSON.parse(text);
            } catch {
                console.error("Failed to parse AI successful response as JSON:", text);
                throw new Error("Invalid response from AI server (not JSON)");
            }
            console.log("[AI Prediction Success]:", aiData)

            // 4. Merge AI Results (Non-destructive)
            setFormData(prev => ({
                ...prev,
                name: prev.name || aiData.name,
                category: prev.category || aiData.category,
                color: prev.color || aiData.color,
                weather: [...new Set([...prev.weather, ...aiData.weather])]
            }))

            const styleSuggestionAvailable = Array.isArray(aiData.suggestedStyles) &&
                aiData.suggestedStyles.length > 0 &&
                typeof aiData.styleConfidence === "number" &&
                aiData.styleConfidence >= 0.45

            setAiStyleSuggestion(styleSuggestionAvailable
                ? {
                    suggestedStyles: aiData.suggestedStyles.slice(0, 3),
                    styleReasoning: aiData.styleReasoning || "Suggested from the garment's visible style and formality.",
                    styleConfidence: aiData.styleConfidence
                }
                : null)
            setWeatherReasoning(aiData.weatherReasoning || null)

            // Check if custom color needed
            if (aiData.color && !colors.includes(aiData.color)) {
                setIsCustomColor(true)
            }

            // 5. User Feedback
            if (aiData.confidence < 0.6) {
                setAiNote(`Low confidence (${(aiData.confidence * 100).toFixed(0)}%). Please confirm details. Tags: ${aiData.reasoning_tags.join(", ")}`)
            } else {
                setAiNote(`AI suggested: ${aiData.name} (${aiData.category}). Analysis: ${aiData.reasoning_tags.join(", ")}`)
            }

            // 6. Store for Logging
            predictionRef.current = {
                source: "openai-vision",
                ...aiData
            }

        } catch (error) {
            console.error("Smart AI analysis failed, falling back to heuristics:", error)

            // 7. Robust Fallback to Heuristics
            const heuristicResult = predictItemDetails(file.name, formData.name, formData.category)

            setFormData(prev => ({
                ...prev,
                name: prev.name || heuristicResult.name || "",
                category: prev.category || heuristicResult.category || "",
                color: prev.color || heuristicResult.color || ""
            }))
            setAiStyleSuggestion(null)
            setWeatherReasoning(null)

            if (heuristicResult.color && !colors.includes(heuristicResult.color)) {
                setIsCustomColor(true)
            }

            setAiNote("Vision API unavailable. Used local name-based heuristics as fallback.")

            predictionRef.current = {
                source: "heuristic-fallback",
                ...heuristicResult
            }
        } finally {
            setSimulatingAI(false)
        }
    }

    const toggleStyle = (style: string) => {
        setFormData(prev => {
            const newStyles = prev.styles.includes(style)
                ? prev.styles.filter(s => s !== style)
                : [...prev.styles, style]
            return { ...prev, styles: newStyles }
        })
    }

    const toggleWeather = (option: string) => {
        setFormData(prev => {
            const newWeather = prev.weather.includes(option)
                ? prev.weather.filter(w => w !== option)
                : [...prev.weather, option]
            return { ...prev, weather: newWeather }
        })
    }

    const applySuggestedStyles = () => {
        if (!aiStyleSuggestion) return
        setFormData(prev => ({
            ...prev,
            styles: [...new Set([...prev.styles, ...aiStyleSuggestion.suggestedStyles])]
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!file) return
        if (scope.isDemo) {
            alert("Demo mode is read-only. Sign in to save your own changes.")
            return
        }

        setLoading(true)
        try {
            // 1. Finalize Image Upload
            let fileName = uploadedPath
            if (!fileName) {
                const fileExt = file.name.split('.').pop()
                fileName = `${scope.userId || "user"}/${Math.random()}.${fileExt}`
                const { error: uploadError } = await supabase.storage
                    .from('closet')
                    .upload(fileName, file)

                if (uploadError) throw uploadError
            }

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('closet')
                .getPublicUrl(fileName)

            // 3. Save Metadata
            const { data: itemData, error: dbError } = await supabase
                .from('items')
                .insert(getScopedInsertData({
                    name: formData.name,
                    category: formData.category,
                    color: formData.color,
                    style: formData.styles[0] || "", // Deprecated field fallback
                    styles: formData.styles, // New field
                    weather: formData.weather,
                    description: formData.description,
                    image_url: publicUrl,
                    tags: [formData.category, ...formData.styles, ...formData.weather, formData.color]
                }, scope))
                .select()
                .single()

            if (dbError) {
                console.error('Supabase insert error:', {
                    message: dbError.message,
                    details: dbError.details,
                    hint: dbError.hint,
                    code: dbError.code,
                });
                throw dbError;
            }

            // 4. Log Prediction vs Actual (if prediction was made)
            if (predictionRef.current && itemData) {
                const { error: logError } = await supabase.from('ai_prediction_logs').insert(getScopedInsertData({
                    item_id: itemData.id,
                    predicted_category: predictionRef.current.category,
                    predicted_style: predictionRef.current.styles ? predictionRef.current.styles.join(", ") : null,
                    predicted_color: predictionRef.current.color,
                    predicted_name: predictionRef.current.name,
                    final_category: formData.category,
                    final_style: formData.styles.join(", "),
                    final_color: formData.color,
                    confidence_score: predictionRef.current.confidence,
                    input_hints: {
                        filename: file.name,
                        input_name: formData.name,
                        vision_label: predictionRef.current.vision_label,
                        vision_confidence: predictionRef.current.vision_confidence,
                        source: predictionRef.current.source,
                        heuristic_color: predictionRef.current.heuristic_color,
                        detected_color: predictionRef.current.detected_color
                    }
                }, scope))

                if (logError) {
                    console.error('Supabase logging error:', {
                        message: logError.message,
                        details: logError.details,
                        hint: logError.hint,
                        code: logError.code,
                    });
                }
            }

            router.push('/wardrobe')
        } catch (error) {
            console.error('Error uploading item:', error);
            if (error instanceof Error) {
                console.error('Error message:', error.message);
            }
            alert('Failed to upload item. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <PageShell size="narrow">
            <Card className="bg-white/[0.035]">
                <CardHeader>
                    <p className="fashion-eyebrow">Closet intake</p>
                    <CardTitle className="text-3xl font-semibold tracking-tight">Add New Item</CardTitle>
                    <CardDescription>
                        {scope.isDemo
                            ? "You're exploring the Demo Closet. Create an account to save your own wardrobe items."
                            : "Upload a photo of your clothing item to add it to your personal wardrobe."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Image Upload Area */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Item Image</label>
                            <div className="relative flex min-h-[240px] flex-col items-center justify-center rounded-lg border border-dashed border-white/15 bg-zinc-950/55 p-5 text-center transition-colors hover:border-primary/45 hover:bg-primary/5">
                                {previewUrl ? (
                                    <div className="relative w-full h-64">
                                        <img src={previewUrl} alt="Preview" className="w-full h-full object-contain rounded-md" />
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="icon"
                                            className="absolute top-2 right-2"
                                            onClick={removeFile}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                                        <p className="text-sm text-muted-foreground mb-2">Drag and drop or click to upload</p>
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            onChange={handleFileChange}
                                        />
                                    </>
                                )}
                            </div>
                        </div>

                        {/* AI Simulation Button */}
                        {file && (
                            <div className="space-y-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    className="w-full"
                                    onClick={handleSmartAI}
                                    disabled={simulatingAI || loading || scope.isDemo}
                                >
                                    {simulatingAI ? (
                                        <>
                                            <Loader className="mr-2" /> Analyzing...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="mr-2 h-4 w-4" /> Smart Fill with AI (Vision + Text)
                                        </>
                                    )}
                                </Button>
                                {aiNote && (
                                    <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                                        <Sparkles className="h-3 w-3" /> {aiNote}
                                    </p>
                                )}
                                {aiStyleSuggestion && (
                                    <div className="rounded-lg border border-white/10 bg-secondary/20 p-4 text-sm">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <p className="font-medium">AI Suggested Styles</p>
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    {aiStyleSuggestion.suggestedStyles.map(style => (
                                                        <span key={style} className="rounded-full bg-background px-3 py-1 text-xs text-muted-foreground">
                                                            {style}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <Button type="button" variant="outline" onClick={applySuggestedStyles}>
                                                Apply Suggested Styles
                                            </Button>
                                        </div>
                                        <p className="mt-3 text-xs text-muted-foreground">
                                            {aiStyleSuggestion.styleReasoning}
                                        </p>
                                    </div>
                                )}
                                {weatherReasoning && (
                                    <p className="text-xs text-center text-muted-foreground">
                                        {weatherReasoning}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Metadata Form */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Name</label>
                                <Input
                                    required
                                    placeholder="e.g. Blue Denim Jacket"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Category</label>
                                <Select
                                    required
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                >
                                    <option value="">Select Category</option>
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Color</label>
                                {isCustomColor ? (
                                    <div className="flex gap-2">
                                        <Input
                                            required
                                            placeholder="Type custom color..."
                                            value={formData.color}
                                            onChange={e => setFormData({ ...formData, color: e.target.value })}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                setIsCustomColor(false)
                                                setFormData({ ...formData, color: "" })
                                            }}
                                            title="Back to list"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <Select
                                        required
                                        value={formData.color}
                                        onChange={e => {
                                            if (e.target.value === "other") {
                                                setIsCustomColor(true)
                                                setFormData({ ...formData, color: "" })
                                            } else {
                                                setFormData({ ...formData, color: e.target.value })
                                            }
                                        }}
                                    >
                                        <option value="">Select Color</option>
                                        {colors.map(c => <option key={c} value={c}>{c}</option>)}
                                        <option value="other">Other... (Type custom)</option>
                                    </Select>
                                )}
                            </div>
                        </div>

                        {/* Styles */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Styles <span className="text-muted-foreground font-normal">(Select all that apply)</span></label>
                            <div className="flex flex-wrap gap-2">
                                {stylesList.map(style => {
                                    const isSelected = formData.styles.includes(style)
                                    return (
                                        <button
                                            key={style}
                                            type="button"
                                            onClick={() => toggleStyle(style)}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all duration-200 transform hover:scale-105 active:scale-95 ${isSelected
                                                ? "bg-primary text-primary-foreground border-primary shadow-lg"
                                                : "bg-background text-foreground border-input hover:border-primary/50 hover:bg-accent hover:text-accent-foreground"
                                                }`}
                                        >
                                            <span className="flex items-center gap-1.5">
                                                {isSelected && (
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                )}
                                                {style}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                            {formData.styles.length === 0 && (
                                <p className="text-xs text-destructive">Please select at least one style.</p>
                            )}
                        </div>

                        {/* Weather */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Weather <span className="text-muted-foreground font-normal">(Select all that apply)</span></label>
                            <div className="flex flex-wrap gap-2">
                                {weatherOptions.map(option => {
                                    const isSelected = formData.weather.includes(option)
                                    return (
                                        <button
                                            key={option}
                                            type="button"
                                            onClick={() => toggleWeather(option)}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all duration-200 transform hover:scale-105 active:scale-95 ${isSelected
                                                ? "bg-primary text-primary-foreground border-primary shadow-lg"
                                                : "bg-background text-foreground border-input hover:border-primary/50 hover:bg-accent hover:text-accent-foreground"
                                                }`}
                                        >
                                            <span className="flex items-center gap-1.5">
                                                {isSelected && (
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                )}
                                                {option}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description (Optional)</label>
                            <Input
                                placeholder="Add any extra notes..."
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={loading || !file || formData.styles.length === 0 || scope.isDemo}>
                            {loading ? <Loader className="mr-2" /> : null}
                            {scope.isDemo ? "Create account to save wardrobe items" : loading ? "Uploading..." : "Save to Wardrobe"}
                        </Button>

                    </form>
                </CardContent>
            </Card>
        </PageShell>
    )
}
