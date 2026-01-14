export default function Footer() {
  return (
    <footer className="w-full border-t border-gray-200 mt-20 py-6 text-center text-sm text-gray-500">
      <p>
        AI Closet — Built by{" "}
        <span className="font-medium text-gray-700">
          Yesha Bhavsar
        </span>{" "}
        © {new Date().getFullYear()}
      </p>

      <div className="mt-2 flex justify-center gap-4">
        <a
          href="https://github.com/yeshacodes/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          GitHub
        </a>
        <a
          href="https://www.linkedin.com/in/yeshabhavsar/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          LinkedIn
        </a>
        
      </div>
    </footer>
  );
}
