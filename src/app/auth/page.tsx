"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Chrome, ArrowRight } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useSessionMode } from "@/lib/sessionMode"

const AUTH_IMAGE = "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1100&h=1400&fit=crop&auto=format"

const benefits = [
  "Save your wardrobe",
  "Personalized outfit recommendations",
  "Learn from your likes and dislikes",
  "Access your closet anywhere",
]

export default function AuthPage() {
  const router = useRouter()
  const { useDemoMode } = useSessionMode()
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const isSignUp = authMode === "signup"

  const handleEmailAuth = async (mode: "signin" | "signup") => {
    if (mode === "signup" && password !== confirmPassword) {
      setMessage(null)
      setError("Passwords do not match.")
      return
    }

    setLoading(true)
    setMessage(null)
    setError(null)

    try {
      const result = mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })

      if (result.error) throw result.error

      if (mode === "signup" && !result.data.session) {
        setMessage("Check your email to confirm your account, then sign in.")
        return
      }

      router.push("/wardrobe")
    } catch (err: unknown) {
      const info = err as { message?: string }
      setError(formatAuthError(info.message))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin
      }
    })

    if (error) {
      setError(formatAuthError(error.message))
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] grid lg:grid-cols-[1fr_1fr]">

      {/* ── Left image panel ── */}
      <div className="relative hidden lg:block overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${AUTH_IMAGE})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20" />

        {/* Bottom copy */}
        <div className="absolute inset-x-0 bottom-0 p-10 space-y-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px w-10 bg-accent" />
            <span
              className="text-accent text-xs uppercase tracking-widest"
              style={{ letterSpacing: "0.25em" }}
            >
              AI Closet
            </span>
          </div>
          <h2
            className="text-white leading-[1.15] max-w-sm"
            style={{ fontSize: "clamp(1.6rem, 3vw, 2.25rem)", fontWeight: 600 }}
          >
            Wear more of what you already own.
          </h2>
          <p className="text-zinc-300 text-sm leading-relaxed max-w-xs">
            AI Closet helps organize your wardrobe, reduce outfit repetition, and recommend looks tailored to your style.
          </p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex items-center justify-center px-6 py-10 bg-background">
        <div className="w-full max-w-md space-y-6">

          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-10 bg-accent" />
              <span
                className="text-accent text-xs uppercase tracking-widest"
                style={{ letterSpacing: "0.25em" }}
              >
                AI Closet
              </span>
            </div>
            <h1
              className="text-foreground leading-tight"
              style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 600 }}
            >
              {isSignUp ? "Create your AI Closet" : "Welcome Back"}
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
              {isSignUp
                ? "Create your own wardrobe, save outfits, track favorites, and receive personalized recommendations."
                : "Sign in to continue managing your wardrobe, outfit history, and personalized recommendations."}
            </p>
          </div>

          {/* Form card */}
          <div className="border border-border bg-card/60 backdrop-blur-sm p-6 space-y-4">
            <div className="space-y-3">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-accent transition-colors"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-accent transition-colors"
              />
              {isSignUp && (
                <input
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-accent transition-colors"
                />
              )}
            </div>

            <button
              type="button"
              onClick={() => handleEmailAuth(authMode)}
              disabled={loading || !email || !password || (isSignUp && !confirmPassword)}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-[#D4A574] px-5 py-4 text-sm font-semibold tracking-wide text-black shadow-[0_16px_42px_rgba(212,165,116,0.34)] transition-all duration-200 hover:brightness-110 hover:shadow-[0_20px_56px_rgba(212,165,116,0.42)] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
            >
              {loading
                ? (isSignUp ? "Creating Account..." : "Signing In...")
                : (isSignUp ? "Create Account" : "Sign In")}
              {!loading && <ArrowRight className="h-3.5 w-3.5" />}
            </button>

            {error && (
              <p className="text-destructive text-xs leading-relaxed">{error}</p>
            )}
            {message && (
              <p className="text-muted-foreground text-xs leading-relaxed">{message}</p>
            )}

            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-muted-foreground text-xs tracking-widest uppercase">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-white text-black text-sm font-medium tracking-wide hover:bg-white/90 transition-all duration-200 disabled:opacity-50"
            >
              <Chrome className="h-4 w-4 shrink-0" />
              Continue with Google
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthMode(isSignUp ? "signin" : "signup")
                setError(null)
                setMessage(null)
              }}
              className="w-full text-center text-xs text-muted-foreground transition-colors hover:text-accent"
            >
              {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Create Account"}
            </button>
          </div>

          {/* Benefits checklist */}
          <div className="space-y-2.5">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-center gap-3">
                <span className="text-accent text-xs font-bold shrink-0">✓</span>
                <span className="text-muted-foreground text-xs">{benefit}</span>
              </div>
            ))}
          </div>

          {/* Demo fallback */}
          <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-muted-foreground text-xs leading-relaxed">
              Just browsing? No account needed.
            </p>
            <Link href="/wardrobe" onClick={useDemoMode}>
              <button
                type="button"
                className="text-xs text-accent hover:text-accent/80 underline underline-offset-4 transition-colors whitespace-nowrap"
              >
                Try Demo Closet →
              </button>
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}

function formatAuthError(message?: string) {
  if (!message) {
    return "Authentication is unavailable right now. Demo mode still works without signing in."
  }

  const normalized = message.toLowerCase()
  if (
    normalized.includes("provider") ||
    normalized.includes("oauth") ||
    normalized.includes("disabled") ||
    normalized.includes("not configured") ||
    normalized.includes("invalid login credentials")
  ) {
    return `${message} Demo mode still works while auth is being configured.`
  }

  return message
}
