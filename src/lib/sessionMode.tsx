"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import type { Session, User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { resolveStartupMode } from "@/lib/sessionModeCore"

export type AppMode = "visitor" | "demo" | "user"

export type ActiveUserScope = {
    mode: AppMode
    userId: string | null
    isDemo: boolean
    isAuthenticated: boolean
    isLoading: boolean
    isHydrated: boolean
    hasChosenDemo: boolean
    canReadData: boolean
    canWritePersonalData: boolean
}

type SessionModeContextValue = ActiveUserScope & {
    user: User | null
    session: Session | null
    useDemoMode: () => void
    useUserMode: () => void
    signOut: () => Promise<void>
}

const MODE_STORAGE_KEY = "aiCloset_appMode"

const SessionModeContext = createContext<SessionModeContextValue | null>(null)

export function SessionModeProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null)
    const [mode, setMode] = useState<AppMode>("visitor")
    const [isLoading, setIsLoading] = useState(true)
    const [isHydrated, setIsHydrated] = useState(false)

    useEffect(() => {
        let isMounted = true

        queueMicrotask(() => {
            if (!isMounted) return
            const storedMode = window.localStorage.getItem(MODE_STORAGE_KEY)
            if (storedMode === "demo" || storedMode === "visitor" || storedMode === "user") {
                setMode(storedMode)
            }
            setIsHydrated(true)
        })

        supabase.auth.getSession().then(({ data }) => {
            if (!isMounted) return
            const currentStoredMode = window.localStorage.getItem(MODE_STORAGE_KEY)
            setSession(data.session)
            const startupMode = resolveStartupMode(currentStoredMode, Boolean(data.session))
            setMode(startupMode)
            if (startupMode !== currentStoredMode) {
                window.localStorage.setItem(MODE_STORAGE_KEY, startupMode)
            }
            setIsLoading(false)
        })

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            setSession(nextSession)
            if (nextSession) {
                setMode("user")
                window.localStorage.setItem(MODE_STORAGE_KEY, "user")
            } else {
                const currentMode = window.localStorage.getItem(MODE_STORAGE_KEY)
                if (currentMode === "demo") {
                    setMode("demo")
                } else {
                    setMode("visitor")
                    window.localStorage.setItem(MODE_STORAGE_KEY, "visitor")
                }
            }
            setIsLoading(false)
        })

        return () => {
            isMounted = false
            authListener.subscription.unsubscribe()
        }
    }, [])

    const value = useMemo<SessionModeContextValue>(() => {
        const user = session?.user || null
        const effectiveMode: AppMode = mode === "user" && user ? "user" : mode === "demo" ? "demo" : "visitor"

        return {
            mode: effectiveMode,
            userId: effectiveMode === "user" ? user?.id || null : null,
            isDemo: effectiveMode === "demo",
            isAuthenticated: Boolean(user),
            isLoading,
            isHydrated,
            hasChosenDemo: effectiveMode === "demo",
            canReadData: effectiveMode === "demo" || (effectiveMode === "user" && Boolean(user?.id)),
            canWritePersonalData: effectiveMode === "user" && Boolean(user?.id),
            user,
            session,
            useDemoMode: () => {
                setMode("demo")
                window.localStorage.setItem(MODE_STORAGE_KEY, "demo")
            },
            useUserMode: () => {
                if (!user) return
                setMode("user")
                window.localStorage.setItem(MODE_STORAGE_KEY, "user")
            },
            signOut: async () => {
                await supabase.auth.signOut()
                setMode("visitor")
                window.localStorage.setItem(MODE_STORAGE_KEY, "visitor")
            }
        }
    }, [isHydrated, isLoading, mode, session])

    return (
        <SessionModeContext.Provider value={value}>
            {children}
        </SessionModeContext.Provider>
    )
}

export function useSessionMode() {
    const context = useContext(SessionModeContext)
    if (!context) {
        throw new Error("useSessionMode must be used inside SessionModeProvider")
    }
    return context
}

export function getCurrentAppMode(scope: ActiveUserScope): AppMode {
    return scope.mode
}

export function isDemoMode(scope: ActiveUserScope): boolean {
    return scope.isDemo
}

export function getActiveUserScope(scope: ActiveUserScope): ActiveUserScope {
    return scope
}
