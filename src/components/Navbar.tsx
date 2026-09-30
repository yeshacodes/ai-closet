"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Shirt, Upload, Sparkles, Menu, X, History, LogOut, UserCircle } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useSessionMode } from "@/lib/sessionMode"

const appNavItems = [
    { name: "My Wardrobe", href: "/wardrobe", icon: Shirt },
    { name: "Upload Item", href: "/upload", icon: Upload },
    { name: "Outfit Generator", href: "/generator", icon: Sparkles },
    { name: "History", href: "/history", icon: History },
]

const appRoutes = new Set(["/wardrobe", "/upload", "/generator", "/history", "/evaluation"])
const landingNavItems = [
  { name: "About", href: "/#about" },
  { name: "Tech Stack", href: "/#tech" },
  { name: "Features", href: "/#features" },
]

export function Navbar() {
    const pathname = usePathname()
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false)
    const { isDemo, hasChosenDemo, isAuthenticated, isHydrated, user, signOut, isLoading, useDemoMode: activateDemoMode } = useSessionMode()
    const isAppRoute = appRoutes.has(pathname)
    const isLandingPage = pathname === "/"
    const showAppNav = isHydrated && isAppRoute && (isAuthenticated || hasChosenDemo)
    const visibleNavItems = showAppNav ? appNavItems : landingNavItems
    const showSignedInControls = isHydrated && isAuthenticated
    const showDemoControls = isHydrated && isDemo
    const handleSignOut = async () => {
        await signOut()
        setIsOpen(false)
        router.replace("/")
    }

    return (
        <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/75 text-white backdrop-blur-xl supports-[backdrop-filter]:bg-black/65">
            <div className="flex h-16 w-full items-center justify-between px-6 md:px-10">
                <Link href="/" className="flex items-center gap-3 text-xl font-semibold tracking-tight">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/35 bg-primary/15 text-primary shadow-[0_0_30px_rgba(214,161,95,0.18)]">
                        <Shirt className="h-5 w-5" />
                    </div>
                    <span>AI Closet</span>
                </Link>

                <div className="hidden items-center gap-4 lg:flex">
                    {visibleNavItems.map((item) => {
                        const Icon = (item as { icon?: React.ElementType }).icon
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "relative flex items-center gap-1.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                                    isActive ? "text-primary" : "text-muted-foreground"
                                )}
                            >
                                {Icon && <Icon className="h-4 w-4" />}
                                {item.name}
                                {isActive && (
                                    <motion.div
                                        layoutId="navbar-indicator"
                                        className="absolute bottom-0 h-0.5 w-full bg-primary"
                                        initial={false}
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    />
                                )}
                            </Link>
                        )
                    })}
                    {showSignedInControls ? (
                        <>
                            {isLandingPage && (
                                <>
                                    <Link href="/wardrobe">
                                        <Button size="sm">My Wardrobe</Button>
                                    </Link>
                                    <Link href="/wardrobe" onClick={activateDemoMode}>
                                        <Button size="sm" variant="outline">Try Demo</Button>
                                    </Link>
                                </>
                            )}
                            <div className="hidden max-w-[220px] items-center gap-2 truncate rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-muted-foreground xl:flex">
                                <UserCircle className="h-4 w-4 shrink-0" />
                                <span className="truncate">{user?.email}</span>
                            </div>
                            <Button size="sm" variant="outline" onClick={handleSignOut} disabled={isLoading}>
                                <LogOut className="mr-2 h-4 w-4" />
                                Sign Out
                            </Button>
                        </>
                    ) : showDemoControls ? (
                        <>
                            <span className="rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                                Demo Closet
                            </span>
                            <Link href="/auth">
                                <Button size="sm" variant="outline">Sign In</Button>
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link href="/wardrobe" onClick={activateDemoMode}>
                                <Button size="sm">Try Demo</Button>
                            </Link>
                            <Link href="/auth">
                                <Button size="sm" variant="outline">Sign In</Button>
                            </Link>
                        </>
                    )}
                </div>

                <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsOpen(!isOpen)}>
                    {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
            </div>

            {/* Mobile Nav */}
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="border-t border-white/10 bg-black/95 p-4 shadow-2xl backdrop-blur-xl lg:hidden"
                >
                    <div className="flex flex-col gap-4">
                        {visibleNavItems.map((item) => {
                            const Icon = (item as { icon?: React.ElementType }).icon
                            const isActive = pathname === item.href
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsOpen(false)}
                                    className={cn(
                                        "flex items-center gap-2 rounded-md p-2 text-sm font-medium transition-colors hover:bg-accent",
                                        isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                                    )}
                                >
                                    {Icon && <Icon className="h-4 w-4" />}
                                    {item.name}
                                </Link>
                            )
                        })}
                        <div className="border-t border-white/10 pt-3">
                            {showSignedInControls ? (
                                <div className="space-y-3 text-sm">
                                    <p className="truncate text-muted-foreground">{user?.email}</p>
                                    {isLandingPage && (
                                        <>
                                            <Link href="/wardrobe" onClick={() => setIsOpen(false)}>
                                                <Button size="sm" className="w-full">My Wardrobe</Button>
                                            </Link>
                                            <Link href="/wardrobe" onClick={() => { activateDemoMode(); setIsOpen(false) }}>
                                                <Button size="sm" variant="outline" className="w-full">Try Demo</Button>
                                            </Link>
                                        </>
                                    )}
                                    <Button size="sm" variant="outline" className="w-full" onClick={handleSignOut}>
                                        Sign Out
                                    </Button>
                                </div>
                            ) : showDemoControls ? (
                                <div className="space-y-3">
                                    <span className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                                        Demo Closet
                                    </span>
                                    <Link href="/auth" onClick={() => setIsOpen(false)}>
                                        <Button size="sm" variant="outline" className="w-full">Sign In</Button>
                                    </Link>
                                </div>
                            ) : (
                                <div className="grid gap-2">
                                    <Link href="/wardrobe" onClick={() => { activateDemoMode(); setIsOpen(false) }}>
                                        <Button size="sm" className="w-full">Try Demo</Button>
                                    </Link>
                                    <Link href="/auth" onClick={() => setIsOpen(false)}>
                                        <Button size="sm" variant="outline" className="w-full">Sign In</Button>
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
        </nav>
    )
}
