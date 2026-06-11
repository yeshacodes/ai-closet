"use client"

import { usePathname } from "next/navigation"

export default function Footer() {
  const pathname = usePathname()

  // The landing page has its own built-in footer section
  if (pathname === "/") return null

  return (
    <footer className="mt-14 w-full border-t border-white/10 bg-black/35 py-8 text-center text-sm text-white/50">
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <p>
          AI Closet - Built by{" "}
          <span className="font-medium text-white/80">Yesha Bhavsar</span>{" "}
          (c) {new Date().getFullYear()}
        </p>

        <div className="mt-4 flex justify-center gap-6">
          <a
            href="https://github.com/yeshacodes/"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-primary"
          >
            GitHub
          </a>
          <a
            href="https://www.linkedin.com/in/yeshabhavsar/"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-primary"
          >
            LinkedIn
          </a>
        </div>
      </div>
    </footer>
  )
}
