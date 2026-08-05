"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  // Start as null so we don't render a specific state until we've read
  // the actual current class (set by the inline script in layout.tsx),
  // avoiding a flash of the wrong icon.
  const [isLight, setIsLight] = useState<boolean | null>(null);

  useEffect(() => {
    // One-time read of the theme class set by the inline script in
    // layout.tsx before hydration — not a state-sync loop, so the
    // cascading-render concern this rule normally guards against
    // doesn't apply here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLight(document.documentElement.classList.contains("light"));
  }, []);

  const toggleTheme = () => {
    const next = !document.documentElement.classList.contains("light");
    document.documentElement.classList.toggle("light", next);
    window.localStorage.setItem("theme", next ? "light" : "dark");
    setIsLight(next);
  };

  return (
    <button
      onClick={toggleTheme}
      className="fixed top-4 right-4 z-50 inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/5 light:bg-black/5 border border-white/10 light:border-black/10 text-gray-300 light:text-gray-600 hover:bg-white/10 light:hover:bg-black/10 hover:text-white light:hover:text-black backdrop-blur-xl transition-all duration-200"
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
      title={isLight ? "Switch to dark mode" : "Switch to light mode"}
    >
      {isLight ? (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )}
    </button>
  );
}
