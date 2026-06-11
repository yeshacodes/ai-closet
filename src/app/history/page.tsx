"use client"

import { useEffect, useMemo, useState } from "react"
import { BarChart3, CalendarDays, Trash2 } from "lucide-react"
import { Item } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader } from "@/components/ui/loader"
import {
    deleteOutfitHistoryEntry,
    fetchOutfitHistory,
    getHistoryItems,
    OutfitHistoryRow
} from "@/lib/outfitHistory"
import { buildWardrobeAnalytics, AnalyticsMetric } from "@/lib/wardrobeAnalytics"
import { getDisplayCategory, getDisplayColor, getDisplayItemName, formatStyleLabel } from "@/lib/itemDisplay"
import { useSessionMode } from "@/lib/sessionMode"
import { getScopeLabel, scopedSelect } from "@/lib/dataScope"
import { PageShell } from "@/components/ui/page-shell"

export default function OutfitHistoryPage() {
    const scope = useSessionMode()
    const [historyRows, setHistoryRows] = useState<OutfitHistoryRow[]>([])
    const [items, setItems] = useState<Item[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!scope.isLoading) loadHistory()
    }, [scope.isLoading, scope.mode, scope.userId])

    const loadHistory = async () => {
        try {
            setLoading(true)
            setError(null)
            const [{ data: wardrobeItems, error: itemsError }, rows] = await Promise.all([
                scopedSelect("items", scope),
                fetchOutfitHistory(100, scope)
            ])

            if (itemsError) throw itemsError
            setItems((wardrobeItems || []) as Item[])
            setHistoryRows(rows)
        } catch (err: unknown) {
            const errorInfo = err as { message?: string }
            console.error("Error loading outfit history:", err)
            setError(errorInfo.message || "Unable to load outfit history.")
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this worn outfit entry?")) return
        if (scope.isDemo) {
            alert("Demo mode is read-only. Sign in to save your own changes.")
            return
        }

        try {
            await deleteOutfitHistoryEntry(id, scope)
            setHistoryRows(prev => prev.filter(row => row.id !== id))
        } catch (err: unknown) {
            const errorInfo = err as { message?: string }
            console.error("Error deleting outfit history entry:", err)
            alert(errorInfo.message || "Unable to delete history entry.")
        }
    }

    const itemMap = useMemo(() => new Map(items.map(item => [item.id, item])), [items])
    const analytics = useMemo(() => buildWardrobeAnalytics(historyRows, items), [historyRows, items])
    const wornCounts = useMemo(() => buildWornCountMap(historyRows), [historyRows])

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader className="h-8 w-8" />
            </div>
        )
    }

    return (
        <PageShell size="default" className="space-y-8">
            <div className="space-y-2">
                <p className="fashion-eyebrow">Wear tracking</p>
                <h1 className="text-4xl font-semibold tracking-tight">Outfit History</h1>
                <p className="text-muted-foreground">
                    {scope.isDemo
                        ? "Demo outfit history shows how wear tracking improves recommendation variety."
                        : "Track what you actually wear so future recommendations can rotate your wardrobe with more intention."}
                </p>
                <span className="inline-flex rounded-full border border-white/10 bg-secondary/30 px-3 py-1 text-xs text-muted-foreground">
                    {getScopeLabel(scope)}
                </span>
            </div>

            {error && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                    {error}
                </div>
            )}

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <AnalyticsCard
                    title="Wardrobe Utilization"
                    value={`${analytics.wardrobeUtilizationPercent}%`}
                    detail={`${analytics.uniqueItemsWorn} of ${analytics.totalWardrobeItems} items worn`}
                />
                <MetricListCard title="Most Worn Colors" metrics={analytics.mostWornColors} />
                <MetricListCard title="Most Worn Categories" metrics={analytics.mostWornCategories} />
                <MetricListCard title="Most Worn Footwear" metrics={analytics.mostWornFootwear} />
                <MetricListCard title="Most Worn Styles" metrics={analytics.mostWornStyles} />
            </section>

            <section className="space-y-4">
                <div className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-muted-foreground" />
                    <h2 className="text-xl font-semibold">Worn Outfits</h2>
                </div>

                {historyRows.length === 0 ? (
                    <div className="rounded-lg border border-white/10 bg-secondary/20 p-10 text-center text-muted-foreground">
                        No worn outfits yet. Generate an outfit and use Mark as Worn to start tracking.
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {historyRows.map(row => {
                            const rowItems = getHistoryItems(row, itemMap)
                            return (
                                <Card key={row.id} className="fashion-card-hover overflow-hidden">
                                    <CardContent className="p-4">
                                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                            <div className="min-w-0 flex-1 space-y-3">
                                                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                                    <span>{formatDate(row.worn_at)}</span>
                                                    <span className="rounded-full bg-secondary px-2 py-0.5">{row.weather}</span>
                                                    <span className="rounded-full bg-secondary px-2 py-0.5">{formatStyleLabel(row.style)}</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                                                    {rowItems.map(item => (
                                                        <HistoryItemPreview key={item.id} item={item} wornCount={wornCounts.get(item.id) || 0} />
                                                    ))}
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="self-start text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                onClick={() => handleDelete(row.id)}
                                                disabled={scope.isDemo}
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </section>
        </PageShell>
    )
}

function AnalyticsCard({ title, value, detail }: { title: string; value: string; detail: string }) {
    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-2xl font-semibold">{value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
            </CardContent>
        </Card>
    )
}

function MetricListCard({ title, metrics }: { title: string; metrics: AnalyticsMetric[] }) {
    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm">{title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {metrics.length > 0 ? metrics.map(metric => (
                    <div key={metric.label} className="flex items-center justify-between gap-3 text-sm">
                        <span className="truncate text-muted-foreground">{metric.label}</span>
                        <span className="font-medium">{metric.count}</span>
                    </div>
                )) : (
                    <p className="text-sm text-muted-foreground">No wear data yet.</p>
                )}
            </CardContent>
        </Card>
    )
}

function HistoryItemPreview({ item, wornCount }: { item: Item; wornCount: number }) {
    return (
        <div className="min-w-0 rounded-lg border border-white/10 bg-background/60 p-2">
            <div className="flex h-28 items-center justify-center rounded-md bg-muted/50">
                <img src={item.image_url} alt={getDisplayItemName(item)} className="h-full w-full object-contain p-2" />
            </div>
            <p className="mt-2 truncate text-xs font-medium">{getDisplayItemName(item)}</p>
            <p className="truncate text-xs text-muted-foreground">{getDisplayCategory(item)}</p>
            <p className="truncate text-xs text-muted-foreground">{getDisplayColor(item.color)}</p>
            {wornCount > 0 && (
                <p className="mt-1 text-[11px] text-muted-foreground">Worn {wornCount}x</p>
            )}
        </div>
    )
}

function buildWornCountMap(rows: OutfitHistoryRow[]) {
    const counts = new Map<string, number>()

    for (const row of rows) {
        const ids = [row.top_id, row.bottom_id, row.dress_id, row.footwear_id, row.outerwear_id].filter(Boolean) as string[]
        for (const id of ids) {
            counts.set(id, (counts.get(id) || 0) + 1)
        }
    }

    return counts
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
    }).format(new Date(value))
}
