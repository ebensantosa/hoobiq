import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import { NotificationsBell } from "./notifications-bell";
import { CartNavIcon } from "./cart-nav-icon";
import { BrandLogo } from "./brand-logo";
import {
  HeaderCategoriesMenu,
  type MenuCategory,
} from "./header-categories-menu";
import { HeaderMobileDrawer } from "./header-mobile-drawer";
import { getSessionUser } from "@/lib/server/session";
import { getSiteSettings } from "@/lib/site-settings";
import { resolveCopy } from "@/lib/copy/keys";
import { serverApi } from "@/lib/server/api";
import { pickPrimaryCategories } from "@/lib/primary-categories";

type CategoryNode = {
  id: string;
  slug: string;
  name: string;
  level: number;
  listingCount: number;
  children: CategoryNode[];
};

/**
 * Public-site top nav. Built like a marketplace header per the
 * redesign: logo · categories mega-menu · prominent search · account
 * cluster (wishlist / cart / notifications / DM / user). Mobile gets
 * a hamburger drawer that mirrors all of this in a slide-in panel.
 *
 * Sidebar is *not* used on public surfaces anymore — every entry
 * point that used to live there moved here.
 */
export async function TopNav({ active: _active }: { active?: string }) {
  void _active;
  const [user, settings, tree] = await Promise.all([
    getSessionUser(),
    getSiteSettings(),
    serverApi<CategoryNode[]>("/categories", { revalidate: 60 }).catch(() => null),
  ]);
  const t = resolveCopy(settings.copy);

  // Build the trimmed menu shape: 5 canonical primary categories,
  // each with their direct sub-categories. Limit to 12 children to
  // keep the panel reasonable when an admin adds many sub-cats.
  const primary = pickPrimaryCategories((tree ?? []).filter((n) => n.level === 1));
  const menuCategories: MenuCategory[] = primary.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    listingCount: c.listingCount,
    children: c.children.slice(0, 12).map((sub) => ({
      id: sub.id,
      slug: sub.slug,
      name: sub.name,
      listingCount: sub.listingCount,
    })),
  }));

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-rule bg-canvas/90 backdrop-blur supports-[backdrop-filter]:bg-canvas/80">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-2 px-3 sm:h-16 sm:gap-3 sm:px-6">
        {/* Mobile: hamburger first so the logo stays optically centred
            with the rest of the icons. */}
        <HeaderMobileDrawer
          categories={menuCategories}
          user={user ? { username: user.username, name: user.name ?? null } : null}
        />

        <Link
          href="/"
          className="flex shrink-0 items-center self-center"
          aria-label={settings.brandName}
        >
          <BrandLogo size="responsive" />
        </Link>

        {/* Desktop nav cluster — categories + primary destinations.
            Hidden on mobile (mobile drawer covers this). */}
        <nav className="ml-2 hidden items-center gap-0.5 lg:flex">
          <HeaderCategoriesMenu categories={menuCategories} />
          <NavPill href="/marketplace">Marketplace</NavPill>
          <NavPill href="/feeds">Feeds</NavPill>
          <NavPill href="/trades">Meet Match</NavPill>
        </nav>

        {/* Search — the centerpiece of a marketplace header. Takes
            the remaining space between the nav cluster and the
            account cluster. Hidden on small mobile (replaced by an
            icon-only button that scrolls to /marketplace search). */}
        <form action="/marketplace" className="ml-auto hidden h-10 flex-1 max-w-xl md:flex">
          <label className="group flex h-full w-full items-center gap-2.5 rounded-full border border-rule bg-panel px-4 text-sm transition-colors focus-within:border-brand-400/70 focus-within:bg-canvas focus-within:ring-2 focus-within:ring-brand-400/20">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-fg-subtle">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.3-4.3"/>
            </svg>
            <input
              name="q"
              placeholder={t("nav.search.placeholder")}
              className="flex-1 bg-transparent text-fg placeholder:text-fg-subtle focus:outline-none"
            />
            <kbd className="hidden rounded border border-rule bg-canvas px-1.5 py-0.5 font-mono text-[10px] text-fg-muted lg:inline">↵</kbd>
          </label>
        </form>

        {/* Mobile-only inline search → routes to marketplace with
            focus on the page-level search input. Keeps the most
            important affordance one tap away. */}
        <Link
          href="/marketplace"
          aria-label="Cari"
          className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg text-fg-muted hover:bg-panel hover:text-fg md:hidden"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.3-4.3"/>
          </svg>
        </Link>

        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          {user && (
            <Link
              href="/upload"
              className="hidden h-9 items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-600 hover:shadow-md sm:inline-flex"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Jual
            </Link>
          )}
          <ThemeToggle />
          {user ? (
            <>
              {/* Wishlist — a marketplace-essential surface that used
                  to live in the sidebar. Heart icon mirrors the in-card
                  WishlistButton so users connect them. */}
              <IconButton href="/wishlist" label="Wishlist">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </IconButton>
              <IconButton href="/dm" label="Pesan">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </IconButton>
              <CartNavIcon />
              <NotificationsBell />
              <UserMenu user={user} />
            </>
          ) : (
            <>
              <Link href="/masuk" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-fg-muted hover:text-fg sm:inline">
                {t("nav.cta.login")}
              </Link>
              <Link
                href="/daftar"
                className="inline-flex h-9 items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-600 hover:shadow-md"
              >
                {t("nav.cta.register")}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function NavPill({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-2 text-sm font-semibold text-fg-muted transition-colors hover:bg-panel hover:text-fg"
    >
      {children}
    </Link>
  );
}

function IconButton({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-fg-muted transition-all duration-200 hover:bg-panel hover:text-brand-500"
    >
      {children}
    </Link>
  );
}
