"use client";
import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Top progress bar for client-side navigation. Detects same-origin link
 * clicks and `<button form>` submits, animates a thin gradient bar at the
 * top of the viewport, and completes when the path/search settles.
 *
 * Lighter than `nextjs-toploader` and matches the brand palette without
 * pulling another dep.
 */
export function NavProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = React.useState(0);
  const [visible,  setVisible]  = React.useState(false);
  const startTimeRef = React.useRef<number>(0);

  // Start: any same-origin nav click bumps the bar to a fast 30%.
  React.useEffect(() => {
    function start() {
      startTimeRef.current = Date.now();
      setVisible(true);
      setProgress((p) => (p < 30 ? 30 : p));
    }
    function onClick(e: MouseEvent) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a") as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || a.target === "_blank") return;
      if (a.hasAttribute("download")) return;
      try {
        const url = new URL(a.href, window.location.href);
        if (url.origin !== window.location.origin) return;
        // Same URL → no nav (avoid showing a fake bar)
        if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      } catch { return; }
      start();
    }
    function onPopState() { start(); }
    document.addEventListener("click", onClick, { capture: true });
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  // Trickle up to 90% while loading (so user sees progress).
  React.useEffect(() => {
    if (!visible) return;
    const id = window.setInterval(() => {
      setProgress((p) => (p < 90 ? p + (90 - p) * 0.08 + 0.5 : p));
    }, 180);
    return () => window.clearInterval(id);
  }, [visible]);

  // Complete when pathname/search settle. Guard with a min visible time so
  // very fast navs still show a brief bar instead of flashing.
  React.useEffect(() => {
    if (!visible) return;
    const elapsed = Date.now() - startTimeRef.current;
    const wait = Math.max(0, 220 - elapsed);
    const t1 = window.setTimeout(() => setProgress(100), wait);
    const t2 = window.setTimeout(() => { setVisible(false); setProgress(0); }, wait + 220);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  if (!visible && progress === 0) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[2px]"
    >
      <div
        className="h-full bg-gradient-to-r from-brand-500 via-flame-500 to-ultra-500 shadow-[0_0_10px_rgba(231,85,159,0.6)] transition-[width,opacity] duration-200 ease-out"
        style={{
          width: `${progress}%`,
          opacity: visible ? 1 : 0,
        }}
      />
    </div>
  );
}
