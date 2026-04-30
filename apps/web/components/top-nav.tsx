import Link from "next/link";
import { UserMenu } from "./user-menu";
import { NotificationsBell } from "./notifications-bell";
import { CartNavIcon } from "./cart-nav-icon";
import { BrandLogo } from "./brand-logo";
import {
  HeaderCategoriesMenu,
  type MenuCategory,
} from "./header-categories-menu";
import { HeaderMobileDrawer } from "./header-mobile-drawer";
import { HeaderSearchPopup } from "./header-search-popup";
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

  // "Is this user a seller?" — UserMenu uses this to switch the bottom
  // CTA between "Mulai Jualan" (no listings yet) and "Dashboard Seller"
  // (already has at least one). Cheap probe via the existing /listings/mine
  // endpoint; null result for guests is fine since the menu is hidden.
  const sellerProbe = user
    ? await serverApi<{ items: unknown[] }>("/listings/mine").catch(() => null)
    : null;
  const isSeller = !!sellerProbe && sellerProbe.items.length > 0;

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
      {/* Inner container is the canonical 1280px content frame and
          uses the same horizontal padding most public pages do
          (px-4 sm:px-6 lg:px-10), so the header's logo / search /
          icons line up exactly with the page content's left and
          right edges below. Pages should NOT add their own
          mx-auto max-w-* — they'd produce visible double-centering. */}
      <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-2 px-4 sm:h-16 sm:gap-3 sm:px-6 lg:px-10">
        {/* Hamburger — desktop-tablet only. Mobile (sm-) gets a
            simpler header because the bottom tab bar already covers
            primary navigation, so a duplicate kategori menu in the
            header would just be noise. Kategori still reachable via
            /kategori from search results / footer. */}
        <div className="hidden sm:flex lg:hidden">
          <HeaderMobileDrawer
            categories={menuCategories}
            user={user ? { username: user.username, name: user.name ?? null } : null}
          />
        </div>

        <Link
          href="/"
          className="flex shrink-0 items-center self-center"
          aria-label={settings.brandName}
        >
          <BrandLogo size="responsive" />
        </Link>

        {/* Desktop nav cluster — categories + primary destinations. */}
        <nav className="ml-2 hidden items-center gap-0.5 lg:flex">
          <HeaderCategoriesMenu categories={menuCategories} />
          <NavPill href="/marketplace">Marketplace</NavPill>
          <NavPill href="/feeds">Feeds</NavPill>
          <NavPill href="/trades">Meet Match</NavPill>
        </nav>

        {/* Search — inline pill on desktop, icon trigger on mobile/
            tablet that opens a fullscreen popup. Both submit q to
            /marketplace which searches title + seller username +
            name + city in one query. */}
        <form
          action="/marketplace"
          className="ml-auto hidden h-10 min-w-0 flex-1 max-w-xl lg:flex"
          role="search"
        >
          <label className="group flex h-full w-full items-center gap-2.5 rounded-full border border-rule bg-panel px-4 text-sm transition-colors focus-within:border-brand-400/70 focus-within:bg-canvas focus-within:ring-2 focus-within:ring-brand-400/20">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-fg-subtle">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.3-4.3"/>
            </svg>
            <input
              name="q"
              type="search"
              autoComplete="off"
              placeholder="Cari produk, toko, atau kota…"
              aria-label="Cari produk, toko, atau kota"
              className="min-w-0 flex-1 bg-transparent text-fg placeholder:text-fg-subtle focus:outline-none"
            />
            <kbd className="hidden rounded border border-rule bg-canvas px-1.5 py-0.5 font-mono text-[10px] text-fg-muted lg:inline">↵</kbd>
          </label>
        </form>
        <div className="ml-auto lg:hidden">
          <HeaderSearchPopup />
        </div>

        {/* Action cluster — buyer-first per the redesign spec. The
            "Jual" CTA was removed from this row; selling now lives
            inside UserMenu (Mulai Jualan / Dashboard Seller) so the
            header stays focused on search + browse + cart. */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          {/* Theme toggle moved into UserMenu (avatar dropdown) so the
              header stays focused on browse + cart + account. */}
          {user ? (
            <>
              {/* Wishlist + DM hidden on mobile — both already
                  reachable from the avatar dropdown / mobile drawer
                  / bottom tab bar (DM = "Pesan"). Keeps the mobile
                  header focused on search + cart + notif + avatar so
                  the row stops feeling cramped on phone widths. */}
              <IconButton href="/wishlist" label="Wishlist" hideOnMobile>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </IconButton>
              <IconButton href="/dm" label="Pesan" hideOnMobile>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </IconButton>
              <CartNavIcon />
              <NotificationsBell />
              <UserMenu user={user} isSeller={isSeller} />
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
  hideOnMobile = false,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
  /** When true, the button collapses on phone widths and only
   *  appears at sm+. Used for header chrome (Wishlist, DM) that has
   *  alternate access points on mobile (avatar dropdown / drawer /
   *  bottom nav) — keeps the mobile header from getting cramped. */
  hideOnMobile?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={
        "relative h-9 w-9 items-center justify-center rounded-lg text-fg-muted transition-all duration-200 hover:bg-panel hover:text-brand-500 " +
        (hideOnMobile ? "hidden sm:inline-flex" : "inline-flex")
      }
    >
      {children}
    </Link>
  );
}
