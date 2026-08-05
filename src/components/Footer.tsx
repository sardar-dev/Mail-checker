"use client";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-white/5 light:border-black/5">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Gmail Checker
            </span>
          </div>

          <nav className="flex items-center gap-6 text-sm text-gray-500 light:text-slate-500" aria-label="Footer navigation">
            <a
              href="#"
              className="hover:text-gray-300 light:text-slate-600 transition-colors"
              onClick={(e) => e.preventDefault()}
            >
              Privacy Policy
            </a>
            <a
              href="#"
              className="hover:text-gray-300 light:text-slate-600 transition-colors"
              onClick={(e) => e.preventDefault()}
            >
              Terms of Service
            </a>
          </nav>

          <p className="text-sm text-gray-600">
            &copy; {currentYear} Gmail Checker. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
