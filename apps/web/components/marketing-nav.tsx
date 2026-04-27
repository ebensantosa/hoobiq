import Link from "next/link";
import { Logo } from "@hoobiq/ui";
import { ThemeToggle } from "./theme-toggle";
import { getSessionUser } from "@/lib/server/session";
import { UserMenu } from "./user-menu";

export async function MarketingNav() {
  const user = await getSessionUser();
  return (
    <header className="header-glow fixed inset-x-0 top-0 z-40 border-b border-rule bg-canvas/85 backdrop-blur supports-[backdrop-filter]:bg-canvas/75">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-5 px-6 md:px-10">
        <Link href={user ? "/marketplace" : "/"} className="shrink-0 inline-flex items-center" aria-label="Hoobiq">
          <Logo size="sm" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {([
            { href: "/marketplace", label: "Marketplace", color: "ultra" as const },
            { href: "/kategori",    label: "Kategori",    color: "flame" as const },
            { href: "/feeds",       label: "Komunitas",   color: "brand" as const },
          ]).map((l) => (
            <Link
              key={l.href}
              href={l.href}
              data-color={l.color}
              className="nav-underline rounded-lg px-3 py-1.5 text-sm font-semibold text-fg-muted transition-colors hover:text-fg"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          {user ? (
            <UserMenu user={user} />
          ) : (
            <>
              <Link href="/masuk" className="rounded-lg px-3 py-2 text-sm font-semibold text-fg-muted hover:text-fg">
                Masuk
              </Link>
              <Link
                href="/daftar"
                className="inline-flex h-9 items-center justify-center rounded-lg bg-brand-400 px-4 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-500 hover:shadow-md"
              >
                Daftar
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
