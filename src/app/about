import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">About AI Closet</h1>

      <p className="mt-4 text-gray-600 leading-relaxed">
        AI Closet is a personal wardrobe organizer and outfit recommendation app.
        Upload your clothing items, tag details like category and color, and generate
        outfits based on your style preferences.
      </p>

      <div className="mt-10 space-y-8">
        <section>
          <h2 className="text-lg font-semibold">What it does</h2>
          <ul className="mt-3 list-disc pl-5 text-gray-600 space-y-2">
            <li>Stores your wardrobe items with details like category, color, and style.</li>
            <li>Generates outfit combinations while avoiding repetitive suggestions.</li>
            <li>Supports smart tagging (including AI-assisted autofill if enabled).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Tech stack</h2>
          <ul className="mt-3 list-disc pl-5 text-gray-600 space-y-2">
            <li>Next.js + TypeScript</li>
            <li>Tailwind CSS UI components</li>
            <li>Outfit recommendation logic (rule-based scoring + rotation)</li>
            <li>Supabase (Postgres) for persistent backend storage</li>
            <li>Vercel for hosting and deployment</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Privacy</h2>
          <p className="mt-3 text-gray-600 leading-relaxed">
            AI Closet stores wardrobe item data in Supabase (a hosted Postgres database) so your
            wardrobe persists across sessions and devices. Images and item metadata you submit
            are saved to the project’s Supabase backend. This project is built for learning and
            portfolio purposes.
          </p>
        </section>

        <section className="rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-semibold">Built by</h2>
          <p className="mt-2 text-gray-600">
            Yesha Bhavsar
          </p>
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <a
              className="hover:underline"
              href="https://github.com/yeshacodes"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            <a
              className="hover:underline"
              href="https://www.linkedin.com/in/yeshabhavsar/"
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn
            </a>
          </div>
        </section>
      </div>

      <div className="mt-10">
        <Link href="/" className="text-sm text-gray-600 hover:underline">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
