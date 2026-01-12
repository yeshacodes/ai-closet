"use client"

import { useState, useRef } from "react"
import { motion } from "framer-motion"
import { Upload, X, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader } from "@/components/ui/loader"
import { predictItemDetails } from "@/utils/heuristics"

const categories = ["Top", "Bottom", "Dress", "Shorts/Skirts", "Footwear", "Outerwear", "Accessory"]
const stylesList = ["Casual", "Smart Casual", "Formal", "Party / Dressy", "Sporty / Athleisure", "Streetwear"]
const weatherOptions = ["Sunny", "Rainy", "Cold", "Warm", "Snowy"]
const colors = ["Black", "White", "Blue", "Red", "Green", "Yellow", "Pink", "Purple", "Beige", "Grey", "Brown", "Orange", "Navy", "Maroon", "Teal", "Olive"]

export default function UploadPage() {
    const router = useRouter()
    const [file, setFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [simulatingAI, setSimulatingAI] = useState(false)
    const [aiNote, setAiNote] = useState<string | null>(null)

    // Store prediction for logging
    const predictionRef = useRef<any>(null)

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
        }
    }

    const removeFile = () => {
        setFile(null)
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
        setUploadedPath(null)
        predictionRef.current = null
        setAiNote(null)
    }

    const handleSmartAI = async () => {
        if (!file) return
        setSimulatingAI(true)
        setAiNote("Analyzing image with OpenAI Vision...")

        try {
            // 1. Upload temporarily to get a URL for OpenAI
            let currentPath = uploadedPath
            if (!currentPath) {
                const fileExt = file.name.split('.').pop()
                currentPath = `${Math.random()}.${fileExt}`
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
                } catch (e) {
                    // Not JSON, keep text as msg
                }
                console.error("AI API error response:", msg);
                throw new Error(msg || "AI Predict failed");
            }

            let aiData;
            try {
                aiData = JSON.parse(text);
            } catch (e) {
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
                styles: [...new Set([...prev.styles, ...aiData.styles])],
                weather: [...new Set([...prev.weather, ...aiData.weather])]
            }))

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
                color: prev.color || heuristicResult.color || "",
                styles: [...new Set([...prev.styles, ...(heuristicResult.styles || [])])]
            }))

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!file) return

        setLoading(true)
        try {
            // 1. Finalize Image Upload
            let fileName = uploadedPath
            if (!fileName) {
                const fileExt = file.name.split('.').pop()
                fileName = `${Math.random()}.${fileExt}`
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
                .insert({
                    name: formData.name,
                    category: formData.category,
                    color: formData.color,
                    style: formData.styles[0] || "", // Deprecated field fallback
                    styles: formData.styles, // New field
                    weather: formData.weather,
                    description: formData.description,
                    image_url: publicUrl,
                    tags: [formData.category, ...formData.styles, ...formData.weather, formData.color]
                })
                .select()
                .single()

            if (dbError) {
                console.error('Supabase insert error:', {
                    message: dbError.message,
                    details: (dbError as any).details,
                    hint: (dbError as any).hint,
                    code: (dbError as any).code,
                });
                throw dbError;
            }

            // 4. Log Prediction vs Actual (if prediction was made)
            if (predictionRef.current && itemData) {
                const { error: logError } = await supabase.from('ai_prediction_logs').insert({
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
                })

                if (logError) {
                    console.error('Supabase logging error:', {
                        message: logError.message,
                        details: (logError as any).details,
                        hint: (logError as any).hint,
                        code: (logError as any).code,
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
        <div className="max-w-2xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Add New Item</CardTitle>
                    <CardDescription>Upload a photo of your clothing item to add it to your digital wardrobe.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Image Upload Area */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Item Image</label>
                            <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-accent/50 transition-colors relative min-h-[200px] flex flex-col items-center justify-center">
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
                                    disabled={simulatingAI || loading}
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

                        <Button type="submit" className="w-full" disabled={loading || !file || formData.styles.length === 0}>
                            {loading ? <Loader className="mr-2" /> : null}
                            {loading ? "Uploading..." : "Save to Wardrobe"}
                        </Button>

                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
