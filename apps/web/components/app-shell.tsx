import { TopNav } from "./top-nav";
import { MobileNav } from "./mobile-nav";
import { AppFooter } from "./app-footer";
import { getSessionUser } from "@/lib/server/session";

/**
 * Public app shell — fixed header on top, full-width content below,
 * mobile bottom nav for tablet/phone. Per the redesign: no sidebar on
 * any public surface. Categories, search, wishlist, cart, account etc.
 * all live in the header now (see TopNav). The Sidebar component is
 * still around but is reserved for the admin panel via AdminShell.
 *
 * `withSidebar` is preserved as an opt-in escape hatch so a callsite
 * could re-enable a future contextual sidebar without rewriting every
 * page, but defaults to `false` and is unused at the moment.
 */
export async function AppShell({
  active,
  withSidebar = false,
  withFooter = true,
  children,
}: {
  active?: string;
  withSidebar?: boolean;
  withFooter?: boolean;
  children: React.ReactNode;
}) {
  void withSidebar;
  const user = await getSessionUser();
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav active={active} />
      {/* Header height: 56px on mobile (h-14) and 64px on sm+ (h-16).
          The spacer matches both so content never tucks under the bar.
          When logged in, the topnav adds a 28px "Dikirim ke" strip on top,
          so the spacer grows to match. */}
      <div className={user ? "pt-[84px] sm:pt-[92px]" : "pt-14 sm:pt-16"} />
      {/* Public marketplace layout — full width up to 1440px, no
          sidebar. Pages own their own horizontal padding so wide
          listings (marketplace grid) and narrow forms (checkout) can
          each pick the right gutter. `pb-20 lg:pb-0` reserves space
          for the mobile bottom nav. */}
      {/* 1280px is the canonical content frame across the public site;
          TopNav uses the same value so the header's left/right edges
          line up with the page content. Pages should NOT add their
          own `mx-auto max-w-*` wrappers — they'd produce visible
          double-centering inside this frame. Use only horizontal
          padding (px-4 sm:px-6 lg:px-8) inside pages. */}
      <div className="mx-auto flex w-full max-w-[1280px]">
        <main className="min-w-0 flex-1 pt-4 pb-20 sm:pt-6 lg:pb-0">{children}</main>
      </div>
      {withFooter && <AppFooter />}
      {user && <MobileNav username={user.username} />}
    </div>
  );
}
