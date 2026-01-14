import Link from "next/link";

const features = [
  {
    title: "Upload & Digitize",
    desc: "Add items with photos and metadata (category, color, style) stored in Supabase.",
    icon: "⬆️",
  },
  {
    title: "Organize Wardrobe",
    desc: "Browse and filter your closet by attributes like color, category, and style.",
    icon: "👕",
  },
  {
    title: "Outfit Generator",
    desc: "Generate outfits with rule-based scoring + rotation to reduce repetition.",
    icon: "✨",
  },
];

const tech = [
  "Next.js + TypeScript",
  "Tailwind CSS",
  "Supabase (Postgres) for persistent storage",
  "Vercel for hosting and deployment",
];

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-14">
      {/* Hero */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-sm">
        <p className="text-sm font-medium text-white/70">About</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white">
          AI Closet
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/70">
          AI Closet is a digital wardrobe and outfit recommendation app. Upload items,
          organize your closet, and generate outfits based on style preferences.
          Wardrobe data is stored in Supabase so it persists across sessions.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black hover:opacity-90"
          >
            Back to Home
          </Link>
          <Link
            href="/wardrobe"
            className="rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
          >
            View Wardrobe
          </Link>
        </div>
      </div>

      {/* Feature cards */}
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-2xl border border-white/10 bg-black/30 p-5 hover:bg-white/5 transition"
          >
            <div className="text-2xl">{f.icon}</div>
            <h3 className="mt-3 text-lg font-semibold text-white">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/65">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Details grid */}
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold text-white">Tech stack</h2>
          <ul className="mt-4 space-y-2 text-sm text-white/70">
            {tech.map((t) => (
              <li key={t} className="flex items-start gap-2">
                <span className="mt-1 inline-block h-2 w-2 rounded-full bg-white/40" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold text-white">Privacy & Data</h2>
          <p className="mt-4 text-sm leading-relaxed text-white/70">
            Wardrobe item data is stored in Supabase (hosted Postgres). Images and item
            metadata you submit are saved to the project’s Supabase backend to support
            persistence and retrieval.
          </p>
        </div>
      </div>

      {/* Attribution */}
      <div className="mt-10 rounded-2xl border border-white/10 bg-black/30 p-6">
        <h2 className="text-lg font-semibold text-white">Built by</h2>
        <p className="mt-2 text-sm text-white/70">Yesha Bhavsar</p>

        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <a
            className="rounded-xl border border-white/15 px-4 py-2 text-white hover:bg-white/10"
            href="https://github.com/yeshacodes"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <a
            className="rounded-xl border border-white/15 px-4 py-2 text-white hover:bg-white/10"
            href="https://www.linkedin.com/in/yeshabhavsar/"
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn
          </a>
        </div>
      </div>
    </div>
  );
}
