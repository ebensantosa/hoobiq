import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/server/session";

const ADMIN_ROLES = new Set(["admin", "ops", "superadmin"]);

/**
 * Auth gate for the entire /admin tree.
 *
 * Resolved server-side per-request (the inner page may be cached, but this
 * layout is recomputed because it touches cookies via getSessionUser).
 *
 *   - No session → redirect to /masuk?next=/admin/...
 *   - Session but role not admin/ops/superadmin → render an explicit
 *     "tidak punya akses" page (NOT the admin shell with empty data —
 *     that was the source of the ambiguous "Rina A. + tidak bisa memuat"
 *     state we used to show).
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/masuk?next=/admin-panel");
  }

  if (!ADMIN_ROLES.has(user.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-6">
        <div className="max-w-md rounded-2xl border border-rule bg-panel p-8 text-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle">403 · Forbidden</p>
          <h1 className="mt-3 text-2xl font-bold text-fg">Tidak punya akses admin</h1>
          <p className="mt-3 text-sm text-fg-muted">
            Akun <b>@{user.username}</b> ada dengan role <code className="font-mono">{user.role}</code>, tapi panel admin
            hanya untuk role <code className="font-mono">admin</code>, <code className="font-mono">ops</code>, atau{" "}
            <code className="font-mono">superadmin</code>.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/marketplace" className="rounded-lg bg-brand-400 px-4 py-2 text-sm font-bold text-white hover:bg-brand-500">
              Ke marketplace
            </Link>
            <Link href="/" className="rounded-lg border border-rule px-4 py-2 text-sm font-medium text-fg-muted hover:text-fg">
              Beranda
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
