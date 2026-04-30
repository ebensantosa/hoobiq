import Link from "next/link";
import { BrandLogo } from "./brand-logo";
import { ThemeToggle } from "./theme-toggle";
import { getSessionUser } from "@/lib/server/session";
import { UserMenu } from "./user-menu";

export async function MarketingNav() {
  const user = await getSessionUser();
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-rule bg-canvas/85 backdrop-blur supports-[backdrop-filter]:bg-canvas/75">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-3 px-4 sm:h-16 sm:gap-4 sm:px-6 lg:px-10">
        <Link
          href={user ? "/marketplace" : "/"}
          className="flex shrink-0 items-center self-center"
          aria-label="Hoobiq"
        >
          <BrandLogo size="responsive" />
        </Link>

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
