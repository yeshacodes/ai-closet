"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader } from "@/components/ui/loader"
import { BarChart3, Brain, CheckCircle2, Database, Info, ThumbsUp, TrendingUp, type LucideIcon } from "lucide-react"
import { Item } from "@/types"
import { useSessionMode } from "@/lib/sessionMode"
import { getScopeLabel, scopedSelect } from "@/lib/dataScope"
import { PageShell } from "@/components/ui/page-shell"

type FeedbackRow = {
    created_at?: string | null
    top_id?: string | null
    bottom_id?: string | null
    dress_id?: string | null
    footwear_id?: string | null
    outerwear_id?: string | null
    requested_style?: string | null
    liked?: boolean | null
    rule_score?: number | string | null
    ml_score?: number | string | null
    final_score?: number | string | null
    base_score_before_preferences?: number | string | null
    preference_adjustment?: number | string | null
    final_score_after_preferences?: number | string | null
}

type Metrics = {
    totalRated: number
    allTimeLikeRate: number
    last30LikeRate: number | null
    last50LikeRate: number | null
    dislikeRate: number
    trendMessage: string
    trendLabel: string
    approvalLabel: string
    averageSelectedOutfitScore: number | null
    averageRuleScore: number | null
    averageHeuristicMatchConfidence: number | null
    averagePreferenceBoost: number | null
    averagePreferencePenalty: number | null
    averagePersonalizationImpact: number | null
    personalizationRows: number
    personalizationTrackingActive: boolean
    personalizationImpactReady: boolean
    hasEnoughRecent30: boolean
}

type NetSignal = {
    label: string
    liked: number
    disliked: number
    net: number
}

type PreferenceSummary = {
    preferredColors: string[]
    preferredStyles: string[]
    preferredItemTypes: string[]
    avoidedColors: string[]
    avoidedStyles: string[]
    avoidedItemTypes: string[]
    rawCounts: NetSignal[]
    summary: string
    signalsLearned: number
    strongPositiveSignals: number
    strongNegativeSignals: number
    topPreferredSignals: string[]
}

const emptyMetrics: Metrics = {
    totalRated: 0,
    allTimeLikeRate: 0,
    last30LikeRate: null,
    last50LikeRate: null,
    dislikeRate: 0,
    trendMessage: "Not enough recent feedback yet to compare recent approval against the all-time baseline.",
    trendLabel: "Collecting data",
    approvalLabel: "Collecting baseline",
    averageSelectedOutfitScore: null,
    averageRuleScore: null,
    averageHeuristicMatchConfidence: null,
    averagePreferenceBoost: null,
    averagePreferencePenalty: null,
    averagePersonalizationImpact: null,
    personalizationRows: 0,
    personalizationTrackingActive: false,
    personalizationImpactReady: false,
    hasEnoughRecent30: false
}

const emptyPreferences: PreferenceSummary = {
    preferredColors: [],
    preferredStyles: [],
    preferredItemTypes: [],
    avoidedColors: [],
    avoidedStyles: [],
    avoidedItemTypes: [],
    rawCounts: [],
    summary: "Not enough feedback yet to learn strong preferences.",
    signalsLearned: 0,
    strongPositiveSignals: 0,
    strongNegativeSignals: 0,
    topPreferredSignals: []
}

export default function EvaluationPage() {
    const scope = useSessionMode()
    const [metrics, setMetrics] = useState<Metrics>(emptyMetrics)
    const [preferences, setPreferences] = useState<PreferenceSummary>(emptyPreferences)
    const [showRawCounts, setShowRawCounts] = useState(false)
    const [showTechnicalDetails, setShowTechnicalDetails] = useState(false)
    const [loading, setLoading] = useState(true)

    const fetchEvaluationData = useCallback(async () => {
        try {
            const [{ data: feedbackData, error: feedbackError }, { data: itemData, error: itemError }] = await Promise.all([
                scopedSelect("outfit_feedback", scope),
                scopedSelect("items", scope)
            ])

            if (feedbackError) throw feedbackError
            if (itemError) throw itemError

            const feedbackRows = (feedbackData || []) as FeedbackRow[]
            const wardrobeItems = (itemData || []) as Item[]

            setMetrics(buildMetrics(feedbackRows))
            setPreferences(buildPreferenceSummary(feedbackRows, wardrobeItems))
        } catch (error) {
            console.error("Error fetching evaluation metrics:", error)
        } finally {
            setLoading(false)
        }
    }, [scope.mode, scope.userId])

    useEffect(() => {
        if (!scope.isLoading) fetchEvaluationData()
    }, [fetchEvaluationData, scope.isLoading])

    if (loading) {
        return <div className="flex justify-center p-20"><Loader className="h-8 w-8" /></div>
    }

    return (
        <PageShell size="default" className="space-y-8">
            <div className="mx-auto max-w-3xl space-y-3 text-center">
                <p className="fashion-eyebrow">Learning dashboard</p>
                <h1 className="text-4xl font-semibold tracking-tight">Recommender Evaluation</h1>
                <p className="text-muted-foreground">
                    This system evaluates recommendation quality using real feedback and learned preference signals.
                </p>
                <span className="inline-flex rounded-full border border-white/10 bg-secondary/30 px-3 py-1 text-xs text-muted-foreground">
                    {getScopeLabel(scope)}
                </span>
            </div>

            <Card>
                <CardHeader><CardTitle>How To Read This Dashboard</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 gap-3 text-sm text-muted-foreground md:grid-cols-2">
                    <ReadGuide label="User Approval Rate" value="Subjective like rate from rated generated outfits, not objective model accuracy." />
                    <ReadGuide label="Recent Approval Trend" value="Monitors whether newer recommendations are being liked more or less than the all-time baseline." />
                    <ReadGuide label="Preference Signals" value="Net learned patterns from feedback, such as preferred colors, styles, and specific item types." />
                    <ReadGuide label="Personalization Impact" value="How much learned feedback changes future ranking after tracking fields are stored." />
                    <ReadGuide label="Technical Details" value="Raw scoring internals for debugging." />
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <MetricCard title="User Approval Rate" value={`${metrics.allTimeLikeRate.toFixed(1)}%`} icon={ThumbsUp} status={metrics.approvalLabel} description="Percentage of rated generated outfits that users liked. This measures subjective user preference, not objective model accuracy." />
                <MetricCard title="Recent Approval Trend" value={formatOptionalPercent(metrics.last30LikeRate)} icon={TrendingUp} status={metrics.trendLabel} description={metrics.last30LikeRate === null ? "Collecting data. This becomes available after 30 rated outfits." : "Like rate across the 30 most recent ratings."} muted={metrics.last30LikeRate === null} />
                <MetricCard title="Feedback Samples" value={metrics.totalRated.toString()} icon={Database} status={metrics.totalRated >= 30 ? "Enough for trend monitoring" : "Early feedback set"} description="Rated outfits available for evaluation and preference learning." />
            </div>

            <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">{metrics.trendMessage}</p></CardContent></Card>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <MetricCard title="Preference Signals Learned" value={preferences.signalsLearned.toString()} icon={Brain} status={`${preferences.strongPositiveSignals} strong positive, ${preferences.strongNegativeSignals} strong negative`} description="Net non-zero learned signals from likes and dislikes." />
                <MetricCard title="Personalization Tracking" value={metrics.personalizationTrackingActive ? "Active" : "Collecting data"} icon={CheckCircle2} status={metrics.personalizationImpactReady ? `${metrics.personalizationRows} tracked ratings` : "Requires migration + new rated outfits"} description="Shows whether feedback rows include before/after preference scoring fields." muted={!metrics.personalizationTrackingActive} />
                <MetricCard title="Personalization Impact" value={formatSignedNumber(metrics.averagePersonalizationImpact, "Collecting data")} icon={BarChart3} status={metrics.personalizationImpactReady ? "Ready" : "Available after new tracked ratings"} description="Average score change from learned preferences." muted={!metrics.personalizationImpactReady} />
            </div>

            <Card>
                <CardHeader><CardTitle>Key Takeaways</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                    {buildKeyTakeaways(metrics, preferences).map(takeaway => (
                        <p key={takeaway} className="rounded-lg border border-white/10 bg-secondary/20 p-3">{takeaway}</p>
                    ))}
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Data Quality</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <StatusRow label="Feedback samples collected" value={`${metrics.totalRated}`} ready={metrics.totalRated > 0} />
                    <StatusRow label="Personalization tracking columns" value={metrics.personalizationTrackingActive ? "Active on saved feedback" : "Requires migration + new rated outfits"} ready={metrics.personalizationTrackingActive} />
                    <StatusRow label="Recent feedback window" value={metrics.hasEnoughRecent30 ? "Last 30 ratings available" : "Collecting until 30 rated outfits"} ready={metrics.hasEnoughRecent30} />
                    <StatusRow label="Personalization impact metrics" value={metrics.personalizationImpactReady ? "Ready" : "Collecting tracked feedback rows"} ready={metrics.personalizationImpactReady} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Learned Preferences</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <p className="rounded-lg border border-white/10 bg-secondary/20 p-4 text-sm text-muted-foreground">{preferences.summary}</p>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        <SignalBlock title="Preferred Colors" values={preferences.preferredColors} />
                        <SignalBlock title="Preferred Styles" values={preferences.preferredStyles} />
                        <SignalBlock title="Preferred Item Types" values={preferences.preferredItemTypes} />
                        <SignalBlock title="Avoided Colors" values={preferences.avoidedColors} />
                        <SignalBlock title="Avoided Styles" values={preferences.avoidedStyles} />
                        <SignalBlock title="Avoided Item Types" values={preferences.avoidedItemTypes} />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Current Recommender System</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <InfoRow label="Algorithm" value="Hybrid Rule-Based + Heuristic Confidence + Feedback Personalization" />
                    <InfoRow label="Candidate Ranking" value="Generates valid candidates, assembles final pieces, applies learned feedback signals, then returns the best available ranked outfit." />
                    <InfoRow label="Evaluation Source" value="Uses real rows from outfit_feedback. Metrics are not estimated or hardcoded." />
                    <InfoRow label="Constraint Satisfaction" value="Unavailable as a stored aggregate. The generator enforces weather/style/category constraints before feedback is saved." />
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Technical Details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <ToggleButton expanded={showTechnicalDetails} onClick={() => setShowTechnicalDetails(value => !value)}>
                        {showTechnicalDetails ? "Hide Technical Details" : "View Technical Details"}
                    </ToggleButton>
                    {showTechnicalDetails && (
                        <div className="space-y-4">
                            <InfoRow label="Average Selected Outfit Score" value={formatPercentMetric(metrics.averageSelectedOutfitScore)} />
                            <InfoRow label="Average Rule Score" value={metrics.averageRuleScore === null ? "Collecting data" : `${metrics.averageRuleScore.toFixed(1)}/17`} />
                            <InfoRow label="Average Heuristic Match Confidence" value={formatPercentMetric(metrics.averageHeuristicMatchConfidence)} />
                            <InfoRow label="Dislike Rate" value={`${metrics.dislikeRate.toFixed(1)}%`} />
                            <InfoRow label="Last 50 Ratings Like Rate" value={formatOptionalPercent(metrics.last50LikeRate, "Collecting until 50 ratings")} />
                            <InfoRow label="Average Preference Boost" value={formatSignedNumber(metrics.averagePreferenceBoost, "Collecting data")} />
                            <InfoRow label="Average Preference Penalty" value={formatSignedNumber(metrics.averagePreferencePenalty, "Collecting data")} />
                            <InfoRow label="Before / After Feedback" value={metrics.personalizationImpactReady ? "Available through stored base score, preference adjustment, and final score after preferences." : "Available after the migration is applied and new rated outfits are saved with personalization tracking."} />
                            <div className="space-y-3">
                                <ToggleButton expanded={showRawCounts} onClick={() => setShowRawCounts(value => !value)}>
                                    {showRawCounts ? "Hide Raw Preference Counts" : "View Raw Preference Counts"}
                                </ToggleButton>
                                {showRawCounts && <RawCounts rows={preferences.rawCounts} />}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </PageShell>
    )
}

function buildMetrics(feedbackRows: FeedbackRow[]): Metrics {
    const ratedRows = feedbackRows
        .filter(row => typeof row.liked === "boolean")
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    const totalRated = ratedRows.length
    const totalLikes = ratedRows.filter(row => row.liked).length
    const totalDislikes = ratedRows.filter(row => row.liked === false).length
    const allTimeLikeRate = totalRated > 0 ? (totalLikes / totalRated) * 100 : 0
    const last30LikeRate = totalRated >= 30 ? likeRate(ratedRows.slice(0, 30)) : null
    const last50LikeRate = totalRated >= 50 ? likeRate(ratedRows.slice(0, 50)) : null
    const preferenceAdjustments = feedbackRows.map(row => toNumber(row.preference_adjustment)).filter(isNumber)
    const boosts = preferenceAdjustments.filter(value => value > 0)
    const penalties = preferenceAdjustments.filter(value => value < 0)
    const personalizationRows = feedbackRows.filter(row =>
        toNumber(row.base_score_before_preferences) !== null ||
        toNumber(row.preference_adjustment) !== null ||
        toNumber(row.final_score_after_preferences) !== null
    ).length
    const trend = buildTrendContext(allTimeLikeRate, last30LikeRate, last50LikeRate)

    return {
        totalRated,
        allTimeLikeRate,
        last30LikeRate,
        last50LikeRate,
        dislikeRate: totalRated > 0 ? (totalDislikes / totalRated) * 100 : 0,
        trendMessage: trend.message,
        trendLabel: trend.label,
        approvalLabel: getApprovalLabel(allTimeLikeRate, totalRated),
        averageSelectedOutfitScore: averagePercent(feedbackRows.map(row => row.final_score_after_preferences ?? row.final_score)),
        averageRuleScore: averageNumber(feedbackRows.map(row => toNumber(row.rule_score))),
        averageHeuristicMatchConfidence: averagePercent(feedbackRows.map(row => row.ml_score)),
        averagePreferenceBoost: averageNumber(boosts),
        averagePreferencePenalty: averageNumber(penalties),
        averagePersonalizationImpact: averageNumber(preferenceAdjustments),
        personalizationRows,
        personalizationTrackingActive: personalizationRows > 0,
        personalizationImpactReady: preferenceAdjustments.length > 0,
        hasEnoughRecent30: totalRated >= 30
    }
}

function buildPreferenceSummary(feedbackRows: FeedbackRow[], wardrobeItems: Item[]): PreferenceSummary {
    const itemById = new Map(wardrobeItems.map(item => [item.id, item]))
    const colorSignals = createSignalBuckets()
    const styleSignals = createSignalBuckets()
    const itemTypeSignals = createSignalBuckets()

    for (const row of feedbackRows) {
        if (typeof row.liked !== "boolean") continue
        const ids = [row.top_id, row.bottom_id, row.dress_id, row.footwear_id, row.outerwear_id].filter(Boolean) as string[]
        const items = ids.map(id => itemById.get(id)).filter(Boolean) as Item[]
        for (const item of items) {
            incrementSignal(colorSignals, item.color, row.liked)
            ;(item.styles?.length ? item.styles : [item.style]).forEach(style => incrementSignal(styleSignals, style, row.liked!))
            incrementSignal(itemTypeSignals, getMeaningfulItemType(item), row.liked)
        }
        if (row.requested_style) incrementSignal(styleSignals, row.requested_style, row.liked)
    }

    const colorRows = buildNetRows(colorSignals)
    const styleRows = buildNetRows(styleSignals)
    const itemTypeRows = buildNetRows(itemTypeSignals)
    const displayItemTypeRows = itemTypeRows.filter(isRecruiterFacingItemType)
    const allRows = [...colorRows, ...styleRows, ...itemTypeRows]
    const nonZeroRows = allRows.filter(row => row.net !== 0)
    const topPreferredSignals = [...formatSignals(styleRows, 1, 2), ...formatSignals(colorRows, 1, 2), ...formatSignals(displayItemTypeRows, 1, 2)]

    return {
        preferredColors: formatSignals(colorRows, 1),
        preferredStyles: formatSignals(styleRows, 1),
        preferredItemTypes: formatSignals(displayItemTypeRows, 1),
        avoidedColors: formatSignals(colorRows, -1),
        avoidedStyles: formatSignals(styleRows, -1),
        avoidedItemTypes: formatSignals(displayItemTypeRows, -1),
        rawCounts: nonZeroRows.sort((a, b) => Math.abs(b.net) - Math.abs(a.net)),
        summary: buildPreferenceSentence(topPreferredSignals, [...formatSignals(styleRows, -1, 2), ...formatSignals(colorRows, -1, 2), ...formatSignals(displayItemTypeRows, -1, 2)]),
        signalsLearned: nonZeroRows.length,
        strongPositiveSignals: nonZeroRows.filter(row => row.net >= 3).length,
        strongNegativeSignals: nonZeroRows.filter(row => row.net <= -3).length,
        topPreferredSignals
    }
}

function createSignalBuckets() {
    return { liked: {} as Record<string, number>, disliked: {} as Record<string, number> }
}

function incrementSignal(target: { liked: Record<string, number>; disliked: Record<string, number> }, value: string | null | undefined, liked: boolean) {
    const key = value?.trim()
    if (!key) return
    const bucket = liked ? target.liked : target.disliked
    bucket[key] = (bucket[key] || 0) + 1
}

function buildNetRows(signals: { liked: Record<string, number>; disliked: Record<string, number> }): NetSignal[] {
    const labels = new Set([...Object.keys(signals.liked), ...Object.keys(signals.disliked)])
    return Array.from(labels).map(label => ({ label, liked: signals.liked[label] || 0, disliked: signals.disliked[label] || 0, net: (signals.liked[label] || 0) - (signals.disliked[label] || 0) }))
}

function formatSignals(rows: NetSignal[], direction: 1 | -1, limit = 5) {
    return rows.filter(row => direction === 1 ? row.net > 0 : row.net < 0).sort((a, b) => direction === 1 ? b.net - a.net : a.net - b.net).slice(0, limit).map(row => `${row.label} ${formatSigned(row.net)}`)
}

function isRecruiterFacingItemType(row: NetSignal) {
    const normalized = row.label.trim().toLowerCase()
    return !new Set(["top", "bottom", "footwear", "outerwear", "broad category: top", "broad category: bottom", "broad category: footwear", "broad category: outerwear"]).has(normalized)
}

function getMeaningfulItemType(item: Item): string | null {
    const text = `${item.name || ""} ${item.category || ""}`.toLowerCase()
    const checks: Array<[string, string]> = [["long coat", "Long Coat"], ["trench", "Trench Coat"], ["coat", "Coat"], ["jacket", "Jacket"], ["blazer", "Blazer"], ["cardigan", "Cardigan"], ["hoodie", "Hoodie"], ["sweater", "Sweater"], ["dress", "Dress"], ["heel", "Heels"], ["boot", "Boots"], ["sneaker", "Sneakers"], ["sandal", "Sandals"], ["jean", "Jeans"], ["legging", "Leggings"], ["short", "Shorts/Skirts"], ["skirt", "Shorts/Skirts"], ["t-shirt", "T-Shirt"], ["tee", "T-Shirt"], ["lace", "Lace Top"], ["crop", "Crop Top"]]
    const match = checks.find(([keyword]) => text.includes(keyword))
    if (match) return match[1]
    const category = item.category?.trim()
    if (!category) return null
    if (["top", "bottom", "footwear", "outerwear"].includes(category.toLowerCase())) return `Broad category: ${category}`
    return category
}

function buildPreferenceSentence(preferred: string[], avoided: string[]) {
    if (preferred.length === 0 && avoided.length === 0) return "Not enough feedback yet to learn strong preferences."
    const preferredText = preferred.map(stripScore).slice(0, 3).join(", ")
    const avoidedText = avoided.map(stripScore).slice(0, 3).join(", ")
    if (preferredText && avoidedText) return `The system has learned that you tend to prefer ${preferredText}, while avoiding ${avoidedText}.`
    if (preferredText) return `The system has learned that you tend to prefer ${preferredText}.`
    return `The system has learned that you tend to avoid ${avoidedText}.`
}

function stripScore(value: string) { return value.replace(/\s[+-]\d+$/, "") }
function getApprovalLabel(rate: number, totalRated: number) {
    if (totalRated === 0) return "Collecting baseline"
    if (totalRated < 30) return "Early-stage signal"
    if (rate >= 70) return "Strong user preference signal"
    if (rate >= 60) return "Good early-stage signal"
    if (rate >= 50) return "Mixed but useful feedback"
    return "Needs more preference signal"
}
function buildTrendContext(allTimeLikeRate: number, last30LikeRate: number | null, last50LikeRate: number | null) {
    const recentRate = last30LikeRate ?? last50LikeRate
    if (recentRate === null) return { label: "Collecting data", message: "Not enough recent feedback yet to compare recent approval against the all-time baseline." }
    if (recentRate > allTimeLikeRate) return { label: "Recent approval above baseline", message: "Recent approval is above the all-time average. This is a positive personalization signal, but should be monitored as more ratings are collected." }
    if (recentRate < allTimeLikeRate) return { label: "Monitoring recent trend", message: "Recent approval is below the all-time average. The system is collecting more feedback before confirming personalization lift." }
    return { label: "Recent approval aligned", message: "Recent approval is currently aligned with the all-time average." }
}
function buildKeyTakeaways(metrics: Metrics, preferences: PreferenceSummary) {
    const takeaways = [`${metrics.totalRated} rated outfits are available for evaluation and learning.`, `${preferences.signalsLearned} net preference signals have been learned from user feedback.`]
    takeaways.push(preferences.topPreferredSignals.length > 0 ? `The strongest current preference signals include ${preferences.topPreferredSignals.map(stripScore).slice(0, 4).join(", ")}.` : "The system is still collecting enough feedback to identify strong preference patterns.")
    takeaways.push(metrics.trendMessage)
    takeaways.push(metrics.personalizationImpactReady ? `Feedback personalization is actively changing ranking by an average of ${formatSignedNumber(metrics.averagePersonalizationImpact, "0.0")} points.` : "Personalization impact will become measurable after the migration is applied and new rated outfits are saved with tracking fields.")
    return takeaways
}
function likeRate(rows: FeedbackRow[]) { return rows.length === 0 ? 0 : (rows.filter(row => row.liked).length / rows.length) * 100 }
function averageNumber(values: Array<number | null>) { const valid = values.filter(isNumber); return valid.length === 0 ? null : valid.reduce((sum, value) => sum + value, 0) / valid.length }
function averagePercent(values: Array<number | string | null | undefined>) { const average = averageNumber(values.map(toNumber).filter(isNumber)); return average === null ? null : average <= 1 ? average * 100 : average }
function toNumber(value: number | string | null | undefined) { if (typeof value === "number") return Number.isFinite(value) ? value : null; if (typeof value === "string") { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null } return null }
function isNumber(value: number | null): value is number { return typeof value === "number" && Number.isFinite(value) }
function formatOptionalPercent(value: number | null, fallback = "Collecting data") { return value === null ? fallback : `${value.toFixed(1)}%` }
function formatPercentMetric(value: number | null) { return value === null ? "Collecting data" : `${value.toFixed(1)}%` }
function formatSignedNumber(value: number | null, fallback = "Collecting data") { return value === null ? fallback : `${value >= 0 ? "+" : ""}${value.toFixed(1)}` }
function formatSigned(value: number) { return `${value > 0 ? "+" : ""}${value}` }

function MetricCard({ title, value, icon: Icon, description, status, muted = false }: { title: string; value: string; icon: LucideIcon; description: string; status: string; muted?: boolean }) {
    return <Card className={muted ? "border-white/10 opacity-85" : undefined}><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">{title}</CardTitle><Icon className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent className="space-y-2"><div className={muted ? "text-2xl font-bold text-muted-foreground" : "text-2xl font-bold"}>{value}</div><span className="inline-flex rounded-full border border-white/10 bg-secondary/30 px-2 py-1 text-xs text-muted-foreground">{status}</span><p className="text-xs leading-relaxed text-muted-foreground">{description}</p></CardContent></Card>
}
function ReadGuide({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-white/10 bg-secondary/20 p-3"><div className="flex items-start gap-2"><Info className="mt-0.5 h-4 w-4 shrink-0" /><div><p className="font-medium text-foreground">{label}</p><p className="mt-1 text-xs leading-relaxed">{value}</p></div></div></div> }
function StatusRow({ label, value, ready }: { label: string; value: string; ready: boolean }) { return <div className="rounded-lg border border-white/10 bg-secondary/20 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium">{label}</p><p className="mt-1 text-xs text-muted-foreground">{value}</p></div><span className={ready ? "rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-300" : "rounded-full bg-secondary px-2 py-1 text-xs text-muted-foreground"}>{ready ? "Ready" : "Collecting"}</span></div></div> }
function InfoRow({ label, value }: { label: string; value: string }) { return <div className="flex flex-col gap-1 border-b border-white/10 pb-3 sm:flex-row sm:items-start sm:justify-between"><span className="font-medium">{label}</span><span className="max-w-2xl text-left text-sm text-muted-foreground sm:text-right">{value}</span></div> }
function SignalBlock({ title, values }: { title: string; values: string[] }) { return <div className="rounded-lg border border-white/10 bg-secondary/20 p-4"><h3 className="text-sm font-semibold">{title}</h3>{values.length > 0 ? <div className="mt-3 flex flex-wrap gap-2">{values.map(value => <span key={value} className="rounded-full bg-background px-2 py-1 text-xs text-muted-foreground">{value}</span>)}</div> : <p className="mt-2 text-xs text-muted-foreground">Not enough feedback yet to learn strong preferences.</p>}</div> }
function RawCounts({ rows }: { rows: NetSignal[] }) { return <div className="rounded-lg border border-white/10 bg-secondary/20 p-4"><h3 className="text-sm font-semibold">Raw Preference Counts</h3>{rows.length > 0 ? <div className="mt-3 space-y-2">{rows.slice(0, 18).map(row => <div key={row.label} className="flex flex-col gap-1 border-b border-white/10 pb-2 text-xs sm:flex-row sm:items-center sm:justify-between"><span>{row.label}</span><span className="text-muted-foreground">liked {row.liked} | disliked {row.disliked} | net {formatSigned(row.net)}</span></div>)}</div> : <p className="mt-2 text-xs text-muted-foreground">No raw preference counts available yet.</p>}</div> }
function ToggleButton({ expanded, onClick, children }: { expanded: boolean; onClick: () => void; children: React.ReactNode }) { return <button type="button" aria-expanded={expanded} onClick={onClick} className="rounded-md border border-white/10 bg-secondary/20 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/40 hover:text-foreground">{children}</button> }
