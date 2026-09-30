"use client"

import Link from "next/link";
import { useSessionMode } from "@/lib/sessionMode";
import { ArrowRight, CloudSun, Sparkles, Shirt as ShirtIcon, Layers, Brain, Zap } from "lucide-react";

const HERO_IMAGE = "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=1400&h=900&fit=crop&auto=format";
const ABOUT_IMAGE = "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=700&h=500&fit=crop&auto=format";

const features = [
  {
    icon: ShirtIcon,
    title: "Smart Wardrobe",
    description: "Upload your clothing items once. Our AI catalogues every piece — fabric, color, cut, occasion.",
  },
  {
    icon: CloudSun,
    title: "Weather-Aware",
    description: "Real-time weather integration ensures your outfit suggestions are always seasonally appropriate.",
  },
  {
    icon: Sparkles,
    title: "Style Intelligence",
    description: "Whether you need boardroom-ready formal or weekend casual, the AI matches your intent perfectly.",
  },
  {
    icon: Layers,
    title: "Outfit Combinations",
    description: "Discover new combinations from clothes you already own. Never feel like you have nothing to wear.",
  },
];

const techStack = [
  { name: "React", role: "Frontend Framework", color: "text-blue-400" },
  { name: "TypeScript", role: "Type Safety", color: "text-blue-600" },
  { name: "Tailwind CSS", role: "Styling", color: "text-cyan-500" },
  { name: "OpenAI Vision", role: "Image Analysis", color: "text-emerald-500" },
  { name: "GPT-4o", role: "Outfit Suggestions", color: "text-purple-500" },
  { name: "Weather API", role: "Climate Data", color: "text-amber-500" },
  { name: "Supabase", role: "Database & Auth", color: "text-green-500" },
  { name: "Vercel", role: "Deployment", color: "text-foreground" },
];

export default function Home() {
  const { useDemoMode: activateDemoMode } = useSessionMode();

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* ─── HERO ─── */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background image with overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src={HERO_IMAGE}
            alt="Fashion wardrobe"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/25" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/72 via-black/34 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/35 via-transparent to-transparent" />
          {/* Subtle grain texture */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.15'/%3E%3C/svg%3E\")",
              backgroundSize: "200px",
            }}
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-20 grid md:grid-cols-2 gap-16 items-center w-full">
          <div>
            {/* Eyebrow */}
            <div className="flex items-center gap-3 mb-8">
              <div className="h-px w-12 bg-accent" />
              <span
                className="text-accent uppercase tracking-widest text-xs"
                style={{ fontFamily: "var(--font-body)", letterSpacing: "0.25em" }}
              >
                AI-Powered Fashion
              </span>
            </div>

            <h1
              className="text-foreground leading-[1.1] mb-6"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(2.8rem, 6vw, 5rem)",
                fontWeight: 600,
              }}
            >
              Your closet,{" "}
              <em style={{ color: "var(--accent)", fontStyle: "italic" }}>
                curated
              </em>{" "}
              by AI.
            </h1>

            <p
              className="text-muted-foreground leading-relaxed mb-10 max-w-md"
              style={{ fontFamily: "var(--font-body)", fontSize: "1.0625rem" }}
            >
              AI Closet learns your wardrobe, reads the weather, and suggests
              polished outfits tailored to your style — every single morning.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link href="/wardrobe" onClick={activateDemoMode}>
                <button
                  className="flex items-center gap-2 px-7 py-3.5 bg-accent text-black hover:bg-accent/90 transition-all duration-200 text-sm tracking-wide group"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  Try the Demo
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              <Link href="/auth">
                <button
                  className="flex items-center gap-2 px-7 py-3.5 border border-foreground text-foreground hover:bg-accent hover:border-accent hover:text-black transition-all duration-200 text-sm tracking-wide"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  Create Your Closet
                </button>
              </Link>
            </div>
          </div>

          {/* Today's Outfit Planning panel */}
          <div className="hidden md:flex flex-col gap-0 items-end">
            <div className="bg-card/80 backdrop-blur-md border border-border w-72">
              <div className="px-5 py-4 border-b border-border">
                <p
                  className="text-foreground text-sm font-semibold tracking-wide"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  Today&apos;s Outfit Planning
                </p>
              </div>
              <div className="divide-y divide-border">
                {[
                  {
                    label: "Weather considered",
                    detail: "Current conditions influence recommendations",
                  },
                  {
                    label: "Closet analyzed",
                    detail: "Items are matched against your wardrobe",
                  },
                  {
                    label: "Style selected",
                    detail: "Recommendations adapt to the occasion",
                  },
                  {
                    label: "Feedback applied",
                    detail: "Past likes and dislikes affect ranking",
                  },
                ].map((item) => (
                  <div key={item.label} className="px-5 py-3.5 flex items-start gap-3">
                    <span className="mt-0.5 text-accent text-xs font-bold shrink-0">✓</span>
                    <div>
                      <p
                        className="text-foreground text-xs font-medium"
                        style={{ fontFamily: "var(--font-body)" }}
                      >
                        {item.label}
                      </p>
                      <p
                        className="text-muted-foreground text-xs mt-0.5 leading-relaxed"
                        style={{ fontFamily: "var(--font-body)" }}
                      >
                        {item.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground">
          <span className="text-xs tracking-widest uppercase" style={{ fontFamily: "var(--font-body)", letterSpacing: "0.2em" }}>
            Scroll
          </span>
          <div className="w-px h-12 bg-gradient-to-b from-accent/60 to-transparent animate-pulse" />
        </div>
      </section>

      {/* ─── ABOUT ─── */}
      <section id="about" className="py-32 max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-20 items-center">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="h-px w-12 bg-accent" />
              <span
                className="text-accent uppercase tracking-widest text-xs"
                style={{ letterSpacing: "0.25em", fontFamily: "var(--font-body)" }}
              >
                About AI Closet
              </span>
            </div>
            <h2
              className="text-foreground leading-[1.15] mb-6"
              style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 600 }}
            >
              Fashion intelligence for the modern wardrobe.
            </h2>
            <p
              className="text-muted-foreground leading-relaxed mb-5"
              style={{ fontFamily: "var(--font-body)", fontSize: "0.9375rem" }}
            >
              AI Closet is a personal styling assistant powered by computer vision and
              large language models. Upload photos of your clothes — shirts, trousers,
              dresses, shoes, accessories — and our AI builds a digital twin of your
              wardrobe in seconds.
            </p>
            <p
              className="text-muted-foreground leading-relaxed mb-8"
              style={{ fontFamily: "var(--font-body)", fontSize: "0.9375rem" }}
            >
              Each morning, AI Closet checks the day&apos;s forecast and your calendar, then
              proposes complete, contextually appropriate outfits. Choose casual for
              weekends, semi-casual for creative offices, or impeccably formal for
              boardroom days — the AI adapts to you.
            </p>
            <div className="flex flex-wrap gap-3">
              {["Casual", "Semi-Casual", "Business Casual", "Formal", "Evening"].map((style) => (
                <span
                  key={style}
                  className="px-3 py-1.5 border border-border text-muted-foreground text-xs tracking-wide"
                  style={{ fontFamily: "var(--font-body)" }}
                >
                  {style}
                </span>
              ))}
            </div>
          </div>
          <div className="relative">
            <img
              src={ABOUT_IMAGE}
              alt="Organized wardrobe"
              className="w-full object-cover"
              style={{ aspectRatio: "4/3" }}
            />
            <div
              className="absolute -bottom-5 -left-5 bg-accent px-6 py-4"
            >
              <p
                className="text-background text-xs tracking-widest uppercase"
                style={{ fontFamily: "var(--font-body)", letterSpacing: "0.2em" }}
              >
                ✦ Style, simplified
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="py-24 bg-secondary">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="h-px w-12 bg-accent" />
              <span
                className="text-accent uppercase tracking-widest text-xs"
                style={{ letterSpacing: "0.25em", fontFamily: "var(--font-body)" }}
              >
                Features
              </span>
              <div className="h-px w-12 bg-accent" />
            </div>
            <h2
              className="text-foreground"
              style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", fontWeight: 600 }}
            >
              Everything your wardrobe needs.
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="bg-secondary p-8 group hover:bg-background transition-colors duration-300">
                  <div className="w-10 h-10 flex items-center justify-center border border-accent/30 group-hover:border-accent text-accent mb-6 transition-colors duration-300">
                    <Icon size={18} />
                  </div>
                  <h3
                    className="text-foreground mb-3"
                    style={{ fontFamily: "var(--font-display)", fontSize: "1.125rem", fontWeight: 600 }}
                  >
                    {f.title}
                  </h3>
                  <p
                    className="text-muted-foreground leading-relaxed text-sm"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    {f.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── TECH STACK ─── */}
      <section id="tech" className="py-32 max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-[1fr_2fr] gap-20 items-start">
          <div className="md:sticky md:top-24">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-px w-12 bg-accent" />
              <span
                className="text-accent uppercase tracking-widest text-xs"
                style={{ letterSpacing: "0.25em", fontFamily: "var(--font-body)" }}
              >
                Tech Stack
              </span>
            </div>
            <h2
              className="text-foreground leading-[1.15] mb-4"
              style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", fontWeight: 600 }}
            >
              Built on the frontier of AI.
            </h2>
            <p
              className="text-muted-foreground leading-relaxed text-sm"
              style={{ fontFamily: "var(--font-body)" }}
            >
              AI Closet combines state-of-the-art computer vision, natural language
              models, and real-time data pipelines to deliver outfit recommendations
              that feel genuinely personal.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-px bg-border">
            {techStack.map((tech) => (
              <div
                key={tech.name}
                className="bg-background p-6 flex items-center gap-4 group hover:bg-secondary transition-colors duration-200"
              >
                <div className="flex items-center justify-center w-8 h-8">
                  <Zap size={16} className={`${tech.color} group-hover:scale-110 transition-transform`} />
                </div>
                <div>
                  <p
                    className="text-foreground"
                    style={{ fontFamily: "var(--font-body)", fontWeight: 500, fontSize: "0.9375rem" }}
                  >
                    {tech.name}
                  </p>
                  <p
                    className="text-muted-foreground text-xs"
                    style={{ fontFamily: "var(--font-body)" }}
                  >
                    {tech.role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA BANNER ─── */}
      <section className="py-32 bg-foreground dark:bg-card border-t border-border">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="h-px w-12 bg-accent" />
            <Brain size={14} className="text-accent" />
            <div className="h-px w-12 bg-accent" />
          </div>
          <h2
            className="text-background dark:text-foreground leading-[1.1] mb-6"
            style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 4vw, 3.25rem)", fontWeight: 600 }}
          >
            Ready to dress{" "}
            <em className="text-accent" style={{ fontStyle: "italic" }}>
              smarter?
            </em>
          </h2>
          <p
            className="text-background/60 dark:text-muted-foreground leading-relaxed mb-10 max-w-lg mx-auto text-sm"
            style={{ fontFamily: "var(--font-body)" }}
          >
            Join thousands of people who&apos;ve stopped staring at their wardrobes every
            morning. AI Closet takes care of the thinking so you can focus on what
            matters.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/wardrobe" onClick={activateDemoMode}>
              <button
                className="flex items-center gap-2 px-7 py-3.5 border border-accent text-accent hover:bg-accent hover:text-background transition-all duration-200 text-sm tracking-wide group"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Try the Demo
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
            <Link href="/auth">
              <button
                className="flex items-center gap-2 px-7 py-3.5 bg-accent text-black hover:bg-accent/90 transition-all duration-200 text-sm tracking-wide"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Create Your Closet
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-12 border-t border-border">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-accent text-xs">✦</span>
            <span
              className="text-foreground"
              style={{ fontFamily: "var(--font-display)", fontSize: "1rem", fontWeight: 600 }}
            >
              AI Closet
            </span>
          </div>
          <p
            className="text-muted-foreground text-xs tracking-wide"
            style={{ fontFamily: "var(--font-body)" }}
          >
            © 2026 AI Closet. AI-powered personal styling.
          </p>
          <div className="flex gap-6">
            {["Privacy", "Terms", "Contact"].map((link) => (
              <a
                key={link}
                href="#"
                className="text-muted-foreground hover:text-foreground text-xs tracking-wide transition-colors"
                style={{ fontFamily: "var(--font-body)" }}
              >
                {link}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}
