"use client";
import * as React from "react";

type Theme = "light" | "dark";
const STORAGE_KEY = "hoobiq-theme";

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = React.useState<Theme>("light");

  React.useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const t: Theme = stored ?? (document.documentElement.classList.contains("dark") ? "dark" : "light");
    setTheme(t);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* private mode */ }
  };

  return (
    <button
      type="button"
      aria-label={theme === "dark" ? "Pakai mode terang" : "Pakai mode gelap"}
      title={theme === "dark" ? "Mode terang" : "Mode gelap"}
      onClick={toggle}
      className={
        "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rule bg-panel text-fg-muted transition-colors hover:border-brand-400/50 hover:text-brand-500 " +
        (className ?? "")
      }
    >
      {theme === "dark" ? (
        // sun — clicking switches to light
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
      ) : (
        // moon — clicking switches to dark
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      )}
    </button>
  );
}

/**
 * Inline script — runs before paint to apply persisted theme so we don't
 * flash the wrong colors. Source key matches `STORAGE_KEY` above.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`;
