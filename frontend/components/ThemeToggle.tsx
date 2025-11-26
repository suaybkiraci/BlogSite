"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const initTheme = () => {
      try {
        const t = localStorage.getItem("theme");
        const isDark = t ? t === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
        setDark(isDark);
        if (isDark) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      } catch {}
      setMounted(true);
    };
    
    initTheme();
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    try {
      if (next) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
      }
    } catch {}
  };

  if (!mounted) return null;

  return (
    <button
      onClick={toggle}
      className="rounded-full p-1 hover:bg-primary/10 transition-colors"
      aria-label="Toggle theme"
    >
      {dark ? (
        <span className="text-l">🌙</span>
      ) : (
        <span className="text-l">☀️</span>
      )}
    </button>
  );
}
