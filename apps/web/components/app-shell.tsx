import { TopNav } from "./top-nav";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { AppFooter } from "./app-footer";
import { getSessionUser } from "@/lib/server/session";

/**
 * App shell — fixed header + offset content. Using `position: fixed` (not
 * sticky) for the header so it works regardless of whatever transforms,
 * filters, or overflow rules a child page might set. We compensate by
 * pushing the main content down with `pt-20` matching the header height.
 */
export async function AppShell({
  active,
  withSidebar = true,
  withFooter = true,
  children,
}: {
  active?: string;
  withSidebar?: boolean;
  withFooter?: boolean;
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav active={active} />
      {/* Header height: 56px on mobile (h-14) and 64px on sm+ (h-16).
          The spacer matches both so content never tucks under the bar. */}
      <div className="pt-14 sm:pt-16" />
      <div className="mx-auto flex w-full max-w-[1440px] flex-1">
        {withSidebar && <Sidebar />}
        {/* `pt-4 sm:pt-6` keeps tighter spacing on mobile, looser on
            desktop. Pages should NOT add their own `pt-*` — keep all
            top spacing centralized so the gap matches across the app.
            `pb-20 lg:pb-0` reserves space for the mobile bottom nav. */}
        <main className="flex-1 min-w-0 pt-4 pb-20 sm:pt-6 lg:pb-0">{children}</main>
      </div>
      {withFooter && <AppFooter />}
      {user && <MobileNav username={user.username} />}
    </div>
  );
}
