"use client"

import { useEffect, useState, type ReactNode } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, Edit, ImagePlus, Search, Trash2, X } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Item } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Loader } from "@/components/ui/loader"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { CLOSET_CATEGORIES } from "@/lib/categories"
import { getBroadCategoryLabel, getDisplayCategory, getDisplayColor, getDisplayItemName, formatStyleLabel, formatWeatherLabel } from "@/lib/itemDisplay"
import { cn } from "@/lib/utils"
import { useSessionMode } from "@/lib/sessionMode"
import { getScopeLabel, scopedDelete, scopedSelect, scopedUpdate } from "@/lib/dataScope"
import { PageShell } from "@/components/ui/page-shell"

const categories = ["All", ...CLOSET_CATEGORIES]
const STYLE_OPTIONS = ["Casual", "Smart Casual", "Formal", "Party / Dressy", "Sporty / Athleisure", "Streetwear"]
const styles = ["All", ...STYLE_OPTIONS]
const WEATHER_OPTIONS = ["Sunny", "Rainy", "Cold", "Warm", "Snowy"]
const BROAD_CATEGORY_OPTIONS = [
    { label: "Upper Body", categories: ["T-Shirt", "Hoodie", "Sweater", "Top"] },
    { label: "Bottoms", categories: ["Jeans", "Pants", "Leggings", "Shorts/Skirts"] },
    { label: "Dress", categories: ["Dress"] },
    { label: "Footwear", categories: ["Footwear"] },
    { label: "Outerwear", categories: ["Outerwear"] },
    { label: "Accessory", categories: ["Accessory"] }
]

const DEMO_ITEM_MANAGEMENT_MESSAGE = "Demo Mode: Item management is disabled in the demo closet. Create your own closet to add, edit, and remove items."

type EditForm = {
    name: string;
    category: string;
    color: string;
    styles: string[];
    weather: string[];
    tags: string;
    description: string;
}

export default function WardrobePage() {
    const scope = useSessionMode()
    const [items, setItems] = useState<Item[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [categoryFilter, setCategoryFilter] = useState("All")
    const [styleFilter, setStyleFilter] = useState("All")
    const [editingItem, setEditingItem] = useState<Item | null>(null)
    const [editForm, setEditForm] = useState<EditForm | null>(null)
    const [savingEdit, setSavingEdit] = useState(false)
    const [editError, setEditError] = useState<string | null>(null)
    const [editSuccess, setEditSuccess] = useState<string | null>(null)
    const [advancedOpen, setAdvancedOpen] = useState(false)

    useEffect(() => {
        if (!scope.isLoading) fetchItems()
    }, [scope.isLoading, scope.mode, scope.userId])

    useEffect(() => {
        if (!editingItem) return

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !savingEdit) {
                setEditingItem(null)
                setEditForm(null)
                setEditError(null)
                setEditSuccess(null)
            }
        }

        document.addEventListener("keydown", handleKeyDown)
        return () => document.removeEventListener("keydown", handleKeyDown)
    }, [editingItem, savingEdit])

    const fetchItems = async () => {
        try {
            const { data, error } = await scopedSelect('items', scope)
                .order('created_at', { ascending: false })

            if (error) throw error
            setItems((data || []) as Item[])
        } catch (error) {
            console.error('Error fetching items:', error)
        } finally {
            setLoading(false)
        }
    }

    const deleteItem = async (id: string, imageUrl: string) => {
        if (scope.isDemo) {
            alert(DEMO_ITEM_MANAGEMENT_MESSAGE)
            return
        }
        if (!confirm("Are you sure you want to delete this item?")) return

        try {
            // 1. Delete from Storage
            const fileName = imageUrl.split('/').pop()
            if (fileName) {
                const { error: storageError } = await supabase.storage.from('closet').remove([fileName])
                if (storageError) {
                    console.error('Storage delete error:', storageError)
                    // Continue to DB delete even if storage fails
                }
            }

            // 2. Delete from DB (Manual Cascade for safety)
            // We delete related records first to avoid foreign key constraint errors if ON DELETE CASCADE isn't set in DB
            await scopedDelete('outfit_feedback', scope).or(`top_id.eq.${id},bottom_id.eq.${id},footwear_id.eq.${id}`)
            await scopedDelete('outfit_history', scope).or(`top_id.eq.${id},bottom_id.eq.${id},dress_id.eq.${id},footwear_id.eq.${id},outerwear_id.eq.${id}`)
            await scopedDelete('ai_prediction_logs', scope).eq('item_id', id)

            // 3. Delete Item
            const { error: deleteError } = await scopedDelete('items', scope).eq('id', id)

            if (deleteError) {
                console.error('Supabase delete error (raw):', deleteError);
                console.error('Tried to delete item with id:', id);
                alert('Failed to delete item');
                return;
            }

            // 4. Update State (Only on success)
            setItems(prev => prev.filter(item => item.id !== id))

        } catch (error) {
            console.error('Unexpected error deleting item:', error)
            alert('Failed to delete item')
        }
    }

    const openEditModal = (item: Item) => {
        if (scope.isDemo) {
            alert(DEMO_ITEM_MANAGEMENT_MESSAGE)
            return
        }
        setEditingItem(item)
        setEditForm({
            name: item.name || "",
            category: item.category || "",
            color: item.color || "",
            styles: item.styles?.length ? item.styles : item.style ? [item.style] : [],
            weather: item.weather || [],
            tags: (item.tags || []).join(", "),
            description: item.description || ""
        })
        setEditError(null)
        setEditSuccess(null)
        setAdvancedOpen(false)
    }

    const closeEditModal = () => {
        if (savingEdit) return
        setEditingItem(null)
        setEditForm(null)
        setEditError(null)
        setEditSuccess(null)
    }

    const toggleFormValue = (field: "styles" | "weather", value: string) => {
        setEditForm(prev => {
            if (!prev) return prev
            const exists = prev[field].includes(value)
            return {
                ...prev,
                [field]: exists
                    ? prev[field].filter(item => item !== value)
                    : [...prev[field], value]
            }
        })
    }

    const setBroadCategory = (label: string) => {
        const option = BROAD_CATEGORY_OPTIONS.find(group => group.label === label)
        if (!option || !editForm) return

        const currentInGroup = option.categories.includes(editForm.category)
        setEditForm({
            ...editForm,
            category: currentInGroup ? editForm.category : option.categories[0]
        })
    }

    const saveEdit = async () => {
        if (!editingItem || !editForm) return
        if (scope.isDemo) {
            setEditError(DEMO_ITEM_MANAGEMENT_MESSAGE)
            return
        }

        const name = editForm.name.trim()
        const category = editForm.category.trim()
        const color = editForm.color.trim()

        if (!name || !category) {
            setEditError("Item name and category are required.")
            return
        }

        try {
            setSavingEdit(true)
            setEditError(null)
            setEditSuccess(null)

            const updateData: Partial<Item> = {
                name,
                category,
                color,
                style: editForm.styles[0] || "",
                styles: editForm.styles,
                weather: editForm.weather,
                tags: editForm.tags
                    .split(",")
                    .map(tag => tag.trim())
                    .filter(Boolean),
                description: editForm.description.trim()
            }

            const updateQuery = scopedUpdate("items", updateData as Record<string, unknown>, scope)
                .eq("id", editingItem.id)
                .select("*")
            const { data, error } = await updateQuery.single()

            if (error) throw error

            const updatedItem = data as Item
            setItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item))
            setEditingItem(updatedItem)
            setEditForm({
                name: updatedItem.name || "",
                category: updatedItem.category || "",
                color: updatedItem.color || "",
                styles: updatedItem.styles?.length ? updatedItem.styles : updatedItem.style ? [updatedItem.style] : [],
                weather: updatedItem.weather || [],
                tags: (updatedItem.tags || []).join(", "),
                description: updatedItem.description || ""
            })
            setEditSuccess("Item updated. Recommendations will use the new metadata.")
        } catch (err: unknown) {
            const errorInfo = err as { message?: string }
            console.error("Error updating wardrobe item:", err)
            setEditError(errorInfo.message || "Failed to update item.")
        } finally {
            setSavingEdit(false)
        }
    }

    const filteredItems = items.filter(item => {
        const matchesSearch = getDisplayItemName(item).toLowerCase().includes(search.toLowerCase())
        const matchesCategory = categoryFilter === "All" || item.category === categoryFilter
        // Check both the legacy 'style' field and the new 'styles' array
        const matchesStyle = styleFilter === "All" ||
            item.style === styleFilter ||
            (item.styles && item.styles.includes(styleFilter))

        return matchesSearch && matchesCategory && matchesStyle
    })

    return (
        <PageShell size="wide" className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-3xl font-semibold tracking-tight">My Wardrobe</h1>
                        <span className="rounded-full border border-white/10 bg-secondary/30 px-3 py-1 text-xs text-muted-foreground">
                            {getScopeLabel(scope)}
                        </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Browse, filter, and organize the closet used by the outfit generator.
                    </p>
                </div>
                <div className="flex gap-2 w-full lg:w-auto">
                    <div className="relative flex-1 lg:w-72">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search items..."
                            className="pl-8"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 pb-2">
                <Select
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                    className="w-[150px]"
                >
                    {categories.map(c => <option key={c} value={c}>{c === "All" ? "All Categories" : c}</option>)}
                </Select>
                <Select
                    value={styleFilter}
                    onChange={e => setStyleFilter(e.target.value)}
                    className="w-[150px]"
                >
                    {styles.map(s => <option key={s} value={s}>{s === "All" ? "All Styles" : s}</option>)}
                </Select>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader className="h-8 w-8" />
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                    <p>No items found. Upload some clothes to get started!</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 items-start auto-rows-auto">
                    <AnimatePresence>
                        {filteredItems.map((item) => (
                            <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Card className="fashion-card-hover group flex h-auto flex-col overflow-hidden">
                                    <div className="relative flex h-64 items-center justify-center bg-zinc-950/70 md:h-72">
                                        <img
                                            src={item.image_url}
                                            alt={getDisplayItemName(item)}
                                            className="object-contain w-full h-full p-3 transition-transform group-hover:scale-105"
                                        />
                                    </div>
                                    <CardContent className="p-4">
                                        <h3 className="font-semibold truncate">{getDisplayItemName(item)}</h3>
                                        <p className="mt-1 text-xs text-muted-foreground">{getDisplayColor(item.color)}</p>
                                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                            <span className="bg-secondary px-2 py-0.5 rounded-full">{getDisplayCategory(item)}</span>
                                            <span className="bg-secondary px-2 py-0.5 rounded-full">{getBroadCategoryLabel(item.category)}</span>
                                            <span className="bg-secondary px-2 py-0.5 rounded-full">{formatStyleLabel(item.styles?.[0] || item.style)}</span>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="grid grid-cols-1 gap-2 p-4 pt-0">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full"
                                            onClick={() => openEditModal(item)}
                                        >
                                            <Edit className="h-4 w-4 mr-2" /> Edit
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => deleteItem(item.id, item.image_url)}
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" /> Remove
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {editingItem && editForm && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6"
                    onMouseDown={event => {
                        if (event.target === event.currentTarget) closeEditModal()
                    }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="edit-wardrobe-title"
                        className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 text-white shadow-2xl ring-1 ring-white/10"
                    >
                        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-6">
                            <div className="min-w-0">
                                <h2 id="edit-wardrobe-title" className="text-xl font-semibold tracking-tight">Edit Wardrobe Item</h2>
                                <p className="mt-1 text-sm text-zinc-400">
                                    Correct the metadata used by search, filters, and recommendations.
                                </p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={closeEditModal} disabled={savingEdit} aria-label="Close edit modal">
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[320px_1fr]">
                            <aside className="border-b border-white/10 bg-zinc-900/80 p-5 lg:border-b-0 lg:border-r lg:p-6">
                                <div className="flex h-80 items-center justify-center rounded-xl border border-white/10 bg-black/40">
                                    <img
                                        src={editingItem.image_url}
                                        alt={editForm.name}
                                        className="h-full w-full object-contain p-4"
                                    />
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="mt-4 w-full gap-2 border-white/10 bg-zinc-950/60 text-zinc-300 hover:bg-zinc-900"
                                    disabled
                                    title="Image replacement can be added later without changing metadata editing."
                                >
                                    <ImagePlus className="h-4 w-4" />
                                    Replace Image
                                    <span className="text-xs text-zinc-500">(soon)</span>
                                </Button>
                                <div className="mt-5 space-y-2">
                                    <p className="truncate text-lg font-semibold">{editForm.name || "Untitled item"}</p>
                                    <p className="text-sm text-zinc-400">
                                        {getBroadCategoryLabel(editForm.category)} • {getDisplayCategory(editForm.category)}
                                    </p>
                                    <p className="text-sm text-zinc-400">{getDisplayColor(editForm.color)}</p>
                                </div>
                            </aside>

                            <div className="space-y-8 p-5 sm:p-6">
                                <section className="space-y-4">
                                    <SectionHeading title="Metadata" description="These details help AI Closet generate better outfit recommendations." />
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <label className="space-y-2 text-sm">
                                            <span className="font-medium text-zinc-200">Item Name</span>
                                            <Input
                                                value={editForm.name}
                                                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                                placeholder="White Sneakers"
                                                className="border-white/10 bg-zinc-900"
                                            />
                                        </label>
                                        <label className="space-y-2 text-sm">
                                            <span className="font-medium text-zinc-200">Color</span>
                                            <Input
                                                value={editForm.color}
                                                onChange={e => setEditForm({ ...editForm, color: e.target.value })}
                                                placeholder="Black, White, Multi-tone"
                                                className="border-white/10 bg-zinc-900"
                                            />
                                            <span className="block text-xs text-zinc-500">Displays as {getDisplayColor(editForm.color)}.</span>
                                        </label>
                                        <label className="space-y-2 text-sm">
                                            <span className="font-medium text-zinc-200">Broad Category</span>
                                            <Select
                                                value={getBroadCategoryLabel(editForm.category)}
                                                onChange={e => setBroadCategory(e.target.value)}
                                                className="border-white/10 bg-zinc-900"
                                            >
                                                {BROAD_CATEGORY_OPTIONS.map(group => (
                                                    <option key={group.label} value={group.label}>{group.label}</option>
                                                ))}
                                            </Select>
                                        </label>
                                        <label className="space-y-2 text-sm">
                                            <span className="font-medium text-zinc-200">Specific Category</span>
                                            <Select
                                                value={editForm.category}
                                                onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                                                className="border-white/10 bg-zinc-900"
                                            >
                                                {CLOSET_CATEGORIES.map(category => (
                                                    <option key={category} value={category}>{getDisplayCategory(category)}</option>
                                                ))}
                                            </Select>
                                        </label>
                                    </div>
                                </section>

                                <section className="space-y-4 border-t border-white/10 pt-6">
                                    <SectionHeading title="Styles" description="Choose all styles that fit this piece." />
                                    <ChipGrid>
                                        {STYLE_OPTIONS.map(style => (
                                            <ChipButton
                                                key={style}
                                                selected={editForm.styles.includes(style)}
                                                onClick={() => toggleFormValue("styles", style)}
                                            >
                                                {formatStyleLabel(style)}
                                            </ChipButton>
                                        ))}
                                    </ChipGrid>
                                </section>

                                <section className="space-y-4 border-t border-white/10 pt-6">
                                    <SectionHeading title="Weather Suitability" description="Select all weather conditions where you'd wear this." />
                                    <ChipGrid>
                                        {WEATHER_OPTIONS.map(weather => (
                                            <ChipButton
                                                key={weather}
                                                selected={editForm.weather.includes(weather)}
                                                onClick={() => toggleFormValue("weather", weather)}
                                            >
                                                {formatWeatherLabel(weather)}
                                            </ChipButton>
                                        ))}
                                    </ChipGrid>
                                </section>

                                <section className="space-y-4 border-t border-white/10 pt-6">
                                    <button
                                        type="button"
                                        onClick={() => setAdvancedOpen(open => !open)}
                                        className="flex w-full items-center justify-between gap-4 rounded-lg border border-white/10 bg-zinc-900/50 px-4 py-3 text-left transition-colors hover:bg-zinc-900"
                                        aria-expanded={advancedOpen}
                                    >
                                        <SectionHeading title="Advanced" description="Optional notes and organization details." />
                                        <ChevronDown
                                            className={cn(
                                                "h-4 w-4 shrink-0 text-zinc-400 transition-transform",
                                                advancedOpen && "rotate-180"
                                            )}
                                        />
                                    </button>

                                    {advancedOpen && (
                                        <div className="space-y-4 rounded-lg border border-white/10 bg-zinc-900/30 p-4">
                                            <label className="space-y-2 text-sm">
                                                <span className="font-medium text-zinc-200">Tags</span>
                                                <Input
                                                    value={editForm.tags}
                                                    onChange={e => setEditForm({ ...editForm, tags: e.target.value })}
                                                    placeholder="sneakers, casual, leather"
                                                    className="border-white/10 bg-zinc-900"
                                                />
                                                <span className="block text-xs text-zinc-500">Separate tags with commas.</span>
                                            </label>

                                            <label className="space-y-2 text-sm">
                                                <span className="font-medium text-zinc-200">Description / Notes</span>
                                                <textarea
                                                    value={editForm.description}
                                                    onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                                    className="min-h-28 w-full rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                                    placeholder="Fit, fabric, silhouette, or notes for recommendations."
                                                />
                                            </label>
                                        </div>
                                    )}
                                </section>
                            </div>
                        </div>

                        <div className="sticky bottom-0 flex flex-col gap-3 border-t border-white/10 bg-zinc-950/95 px-5 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6">
                            <div className="min-h-5 text-sm">
                                {editError && <p className="text-destructive">{editError}</p>}
                                {editSuccess && <p className="text-green-500">{editSuccess}</p>}
                            </div>
                            <div className="flex flex-col-reverse gap-2 sm:flex-row">
                                <Button variant="ghost" onClick={closeEditModal} disabled={savingEdit}>
                                    Cancel
                                </Button>
                                <Button onClick={saveEdit} disabled={savingEdit}>
                                    {savingEdit ? "Saving..." : "Save Changes"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </PageShell>
    )
}

function SectionHeading({ title, description }: { title: string; description: string }) {
    return (
        <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-200">{title}</h3>
            <p className="mt-1 text-sm text-zinc-500">{description}</p>
        </div>
    )
}

function ChipGrid({ children }: { children: ReactNode }) {
    return (
        <div className="flex flex-wrap gap-2">
            {children}
        </div>
    )
}

function ChipButton({
    selected,
    onClick,
    children
}: {
    selected: boolean;
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                selected
                    ? "border-primary/70 bg-primary/20 text-primary"
                    : "border-white/10 bg-zinc-900 text-zinc-300 hover:border-white/25 hover:bg-zinc-800"
            )}
            aria-pressed={selected}
        >
            {children}
        </button>
    )
}
