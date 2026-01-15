export default function Footer() {
  return (
    <footer className="w-full border-t border-white/10 mt-20 py-8 text-center text-sm text-white/50">
      <p>
        AI Closet — Built by{" "}
        <span className="font-medium text-white/80">
          Yesha Bhavsar
        </span>{" "}
        © {new Date().getFullYear()}
      </p>

      <div className="mt-4 flex justify-center gap-6">
        <a
          href="https://github.com/yeshacodes/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white transition-colors"
        >
          GitHub
        </a>
        <a
          href="https://www.linkedin.com/in/yeshabhavsar/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white transition-colors"
        >
          LinkedIn
        </a>

      </div>
    </footer>
  );
}
