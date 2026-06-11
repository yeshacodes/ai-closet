import Link from "next/link"
import { ArrowRight, CloudSun, Database, Layers3, Shield, Sparkles, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageShell } from "@/components/ui/page-shell"

const features = [
  {
    title: "Upload & Digitize",
    desc: "Add clothing photos, review AI-filled metadata, and keep the wardrobe editable.",
    icon: Upload,
  },
  {
    title: "Organize Wardrobe",
    desc: "Browse and filter items by clothing category, color, style, and weather suitability.",
    icon: Layers3,
  },
  {
    title: "Outfit Generator",
    desc: "Generate outfits with rule-based scoring, heuristic confidence, feedback, and rotation signals.",
    icon: Sparkles,
  },
]

const tech = [
  "Next.js + TypeScript",
  "Tailwind CSS",
  "Supabase Postgres, Auth, and Storage",
  "WeatherAPI-powered live weather detection",
  "Vercel-ready deployment",
]

export default function AboutPage() {
  return (
    <PageShell size="wide" className="space-y-10">
      <section className="relative overflow-hidden rounded-lg border border-white/10 bg-white/[0.035] p-8 shadow-[0_24px_90px_rgba(0,0,0,0.28)] md:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(214,161,95,0.18),transparent_26rem)]" />
        <div className="relative max-w-4xl space-y-5">
          <p className="fashion-eyebrow">About the product</p>
          <h1 className="text-5xl font-semibold tracking-tight text-white md:text-6xl">AI Closet</h1>
          <p className="max-w-3xl text-base leading-8 text-muted-foreground">
            AI Closet is a digital wardrobe and outfit recommendation app. It helps users upload clothing,
            correct item details, track what they wear, and generate explainable outfit recommendations based on
            style, weather, wardrobe history, and learned preferences.
          </p>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Link href="/wardrobe">
              <Button className="w-full gap-2 sm:w-auto">
                View Wardrobe <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full sm:w-auto">Back to Home</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        {features.map((feature) => {
          const Icon = feature.icon
          return (
            <Card key={feature.title} className="fashion-card-hover bg-white/[0.035]">
              <CardHeader>
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted-foreground">{feature.desc}</p>
              </CardContent>
            </Card>
          )
        })}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <Card className="bg-white/[0.035]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Tech Stack
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {tech.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.035]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Privacy & Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
            <p>
              Wardrobe items, images, feedback, and worn history are stored in Supabase so the app can preserve
              personal context across sessions.
            </p>
            <p>
              Demo mode is separated from signed-in user data, letting reviewers explore the product without changing
              a personal closet.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="bg-primary/10 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CloudSun className="h-5 w-5 text-primary" />
              Recommendation Approach
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-muted-foreground">
            AI Closet combines wardrobe rules, deterministic heuristic confidence, live weather, feedback-based
            preferences, and wear-history rotation. The goal is not to replace user judgment, but to make outfit
            suggestions practical, explainable, and easy to control.
          </CardContent>
        </Card>

        <Card className="bg-white/[0.035]">
          <CardHeader>
            <CardTitle>Built By</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p className="text-base font-medium text-white">Yesha Bhavsar</p>
            <div className="flex flex-wrap gap-3">
              <a className="rounded-md border border-white/15 px-4 py-2 text-white transition-colors hover:border-primary/45 hover:text-primary" href="https://github.com/yeshacodes" target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
              <a className="rounded-md border border-white/15 px-4 py-2 text-white transition-colors hover:border-primary/45 hover:text-primary" href="https://www.linkedin.com/in/yeshabhavsar/" target="_blank" rel="noopener noreferrer">
                LinkedIn
              </a>
            </div>
          </CardContent>
        </Card>
      </section>
    </PageShell>
  )
}
