"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Single sidebar row. Highlights when the current route starts with `href`,
 * so `/u/aditya/koleksi` still shows Profil active. Optional `accent` paints
 * the icon in a brand color (pink for wishlist, orange for wallet, etc.) so
 * users can scan visually instead of reading every label.
 */
export function SidebarItem({
  href,
  label,
  icon,
  accent,
  rightSlot,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  accent?: "brand" | "flame" | "ultra" | "sky";
  rightSlot?: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = isActive(pathname, href);

  const accentText =
    accent === "brand" ? "text-brand-500" :
    accent === "flame" ? "text-flame-500" :
    accent === "ultra" ? "text-ultra-500" :
    accent === "sky"   ? "text-sky-500" :
    "text-fg-subtle";

  return (
    <Link
      href={href}
      className={
        "group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors " +
        (active
          ? "bg-brand-400/10 text-fg"
          : "text-fg-muted hover:bg-panel hover:text-fg")
      }
    >
      <span
        className={
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors " +
          (active
            ? "bg-brand-400/20 text-brand-500"
            : `${accentText} group-hover:bg-panel-2`)
        }
      >
        {icon}
      </span>
      <span className="flex-1 font-medium">{label}</span>
      {rightSlot}
    </Link>
  );
}

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  // Match `/pesanan` for `/pesanan/HBQ-...`, but not `/pesanan-extra`
  return pathname === href || pathname.startsWith(href + "/") || pathname.startsWith(href + "?");
}
