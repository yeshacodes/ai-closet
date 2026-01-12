"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Filter, Search, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Item } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Loader } from "@/components/ui/loader"
import { Card, CardContent, CardFooter } from "@/components/ui/card"

const categories = ["All", "Top", "Bottom", "Dress", "Shorts/Skirts", "Footwear", "Outerwear", "Accessory"]
const styles = ["All", "Casual", "Smart Casual", "Formal", "Party / Dressy", "Sporty / Athleisure", "Streetwear"]

export default function WardrobePage() {
    const [items, setItems] = useState<Item[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [categoryFilter, setCategoryFilter] = useState("All")
    const [styleFilter, setStyleFilter] = useState("All")

    useEffect(() => {
        fetchItems()
    }, [])

    const fetchItems = async () => {
        try {
            const { data, error } = await supabase
                .from('items')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error
            setItems(data || [])
        } catch (error) {
            console.error('Error fetching items:', error)
        } finally {
            setLoading(false)
        }
    }

    const deleteItem = async (id: string, imageUrl: string) => {
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
            await supabase.from('outfit_feedback').delete().or(`top_id.eq.${id},bottom_id.eq.${id},footwear_id.eq.${id}`)
            await supabase.from('ai_prediction_logs').delete().eq('item_id', id)

            // 3. Delete Item
            const { error: deleteError } = await supabase.from('items').delete().eq('id', id)

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

    const filteredItems = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase())
        const matchesCategory = categoryFilter === "All" || item.category === categoryFilter
        // Check both the legacy 'style' field and the new 'styles' array
        const matchesStyle = styleFilter === "All" ||
            item.style === styleFilter ||
            (item.styles && item.styles.includes(styleFilter))

        return matchesSearch && matchesCategory && matchesStyle
    })

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">My Wardrobe</h1>
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
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
            <div className="flex gap-4 overflow-x-auto pb-2">
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
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
                                <Card className="overflow-hidden group h-full flex flex-col">
                                    <div className="aspect-square relative bg-muted">
                                        <img
                                            src={item.image_url}
                                            alt={item.name}
                                            className="object-cover w-full h-full transition-transform group-hover:scale-105"
                                        />
                                    </div>
                                    <CardContent className="p-4 flex-1">
                                        <h3 className="font-semibold truncate">{item.name}</h3>
                                        <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                                            <span className="bg-secondary px-2 py-0.5 rounded-full">{item.category}</span>
                                            <span className="bg-secondary px-2 py-0.5 rounded-full">{item.style}</span>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="p-4 pt-0">
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
        </div>
    )
}
