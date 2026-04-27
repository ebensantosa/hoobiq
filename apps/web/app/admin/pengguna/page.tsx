import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { Avatar, Badge, Card } from "@hoobiq/ui";
import { serverApi } from "@/lib/server/api";

export const metadata = { title: "Pengguna · Admin Hoobiq", robots: { index: false } };
export const dynamic = "force-dynamic";

type AdminUser = {
  id: string;
  username: string;
  email: string;
  name: string | null;
  city: string | null;
  role: string;
  status: string;
  trustScore: number;
  level: number;
  createdAt: string;
};

const statusTone: Record<string, "mint" | "crim" | "ghost"> = {
  active: "mint",
  flagged: "crim",
  suspended: "ghost",
  deleted: "ghost",
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  if (sp.status) params.set("status", sp.status);
  if (sp.q)      params.set("q", sp.q);
  const data = await serverApi<{ items: AdminUser[] }>(`/admin/users?${params}`);
  const items = data?.items ?? [];

  return (
    <AdminShell active="Pengguna">
      <div className="px-8 py-8">
        <header className="border-b border-rule pb-6">
          <h1 className="text-3xl font-bold text-fg">Pengguna</h1>
          <p className="mt-2 text-sm text-fg-muted">{items.length} pengguna ditampilkan</p>
        </header>

        {items.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-rule bg-panel/40 p-10 text-center text-sm text-fg-muted">
            Belum ada pengguna terdaftar.
          </div>
        ) : (
          <Card className="mt-6">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_100px] gap-4 border-b border-rule px-5 py-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">
              <span>Pengguna</span>
              <span>Status</span>
              <span className="text-right">Level</span>
              <span className="text-right">Trust</span>
              <span className="text-right">Aksi</span>
            </div>
            {items.map((u, i) => (
              <div key={u.id} className={"grid grid-cols-[2fr_1fr_1fr_1fr_100px] items-center gap-4 px-5 py-3 text-sm " + (i < items.length - 1 ? "border-b border-rule/60" : "")}>
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar letter={u.username[0]} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-fg">@{u.username}</p>
                    <p className="truncate text-xs text-fg-subtle">{u.name ?? "—"} · {u.email}{u.city ? ` · ${u.city}` : ""}</p>
                  </div>
                </div>
                <span><Badge tone={statusTone[u.status] ?? "ghost"} size="xs">{u.status}</Badge></span>
                <span className="text-right font-mono text-fg">{u.level}</span>
                <span className={"text-right font-mono " + (u.trustScore < 3.5 ? "text-flame-500" : "text-fg")}>
                  {u.trustScore.toFixed(1)}
                </span>
                <span className="text-right">
                  <Link href={`/admin/pengguna/${u.username}`} className="text-xs text-brand-500 hover:underline">Detail →</Link>
                </span>
              </div>
            ))}
          </Card>
        )}
      </div>
    </AdminShell>
  );
}
