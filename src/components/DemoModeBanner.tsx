"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { X } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useSessionMode } from "@/lib/sessionMode"

const demoPagePaths = new Set(["/wardrobe", "/upload", "/generator", "/history", "/evaluation"])

export function DemoModeBanner() {
    const pathname = usePathname()
    const { isDemo, hasChosenDemo, isHydrated } = useSessionMode()
    const [dismissed, setDismissed] = useState(false)

    if (!isHydrated || !isDemo || !hasChosenDemo || dismissed || !demoPagePaths.has(pathname)) {
        return null
    }

    const dismiss = () => {
        setDismissed(true)
    }

    return (
        <div className="border-b border-white/10 bg-black/55 backdrop-blur-xl">
            <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-2 text-xs text-muted-foreground md:px-10 lg:flex-row lg:items-center lg:justify-between">
                <p className="leading-5">
                    You&apos;re exploring a preloaded demo closet. Sign in to create and save your own wardrobe.
                </p>
                <div className="flex shrink-0 items-center gap-2">
                    <Link href="/auth">
                        <Button size="sm" variant="outline" className="h-8 px-3 text-xs">Create Your Closet</Button>
                    </Link>
                    <button
                        type="button"
                        onClick={dismiss}
                        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
                        aria-label="Dismiss demo mode message"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}
