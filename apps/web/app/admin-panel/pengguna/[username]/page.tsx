import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { Avatar, Badge, Card } from "@hoobiq/ui";
import { serverApi } from "@/lib/server/api";

export const metadata = { title: "Detail pengguna · Admin Hoobiq", robots: { index: false } };
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

export default async function AdminUserDetailPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const data = await serverApi<{ items: AdminUser[] }>(`/admin/users?q=${encodeURIComponent(username)}`);
  const u = data?.items.find((x) => x.username === username) ?? null;

  if (!u) {
    return (
      <AdminShell active="Pengguna">
        <div className="px-8 py-12 text-center">
          <p className="text-sm text-fg-muted">User @{username} tidak ditemukan.</p>
          <Link href="/admin-panel/pengguna" className="mt-4 inline-block text-sm text-brand-400 hover:underline">
            ← Kembali ke daftar pengguna
          </Link>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell active="Pengguna">
      <div className="px-8 py-8">
        <nav className="mb-6 text-xs text-fg-subtle">
          <Link href="/admin-panel/pengguna" className="hover:text-fg">Pengguna</Link>
          <span className="mx-2">/</span>
          <span>@{u.username}</span>
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-rule pb-6">
          <div className="flex items-start gap-4">
            <Avatar letter={u.username[0]?.toUpperCase() ?? "?"} size="xl" ring />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-fg">{u.name ?? `@${u.username}`}</h1>
                <Badge tone={u.status === "active" ? "mint" : "crim"} size="sm">{u.status}</Badge>
                <Badge tone="ghost" size="sm">{u.role}</Badge>
              </div>
              <p className="mt-1 text-sm text-fg-muted">
                @{u.username} · gabung {new Date(u.createdAt).toLocaleDateString("id-ID")}
                {u.city ? ` · ${u.city}` : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.4fr]">
          <aside className="flex flex-col gap-5">
            <Card>
              <div className="p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                  Identitas
                </h3>
                <dl className="mt-4 flex flex-col gap-3 text-sm">
                  <Kv k="Email" v={u.email} />
                  <Kv k="Username" v={`@${u.username}`} />
                  <Kv k="Role" v={<Badge tone="ghost" size="xs">{u.role}</Badge>} />
                  <Kv k="Status" v={<Badge tone={u.status === "active" ? "mint" : "crim"} size="xs">{u.status}</Badge>} />
                </dl>
              </div>
            </Card>

            <Card>
              <div className="p-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">
                  Reputasi
                </h3>
                <dl className="mt-4 flex flex-col gap-3 text-sm">
                  <Kv k="Trust Score" v={<span className={"font-mono " + (u.trustScore < 3.5 ? "text-flame-500" : "text-fg")}>{u.trustScore.toFixed(1)} / 5</span>} />
                  <Kv k="Level" v={<span className="font-mono text-fg">{u.level}</span>} />
                </dl>
              </div>
            </Card>

            <Card className="border-rule">
              <div className="p-5 text-xs text-fg-muted">
                Aksi (suspend/role/hapus) ada di kolom <Link href="/admin-panel/pengguna" className="text-brand-400 hover:underline">daftar pengguna</Link>.
                Detail risk signal (dispute rate, multi-akun, IP) belum di-track — akan muncul setelah modul fraud detection di-wire.
              </div>
            </Card>
          </aside>

          <section>
            <h2 className="text-xl font-semibold text-fg">Riwayat tindakan admin</h2>
            <p className="mt-1 text-sm text-fg-muted">
              Lihat di <Link href={`/admin-panel/audit`} className="text-brand-400 hover:underline">audit log</Link> dan filter berdasarkan target <code className="font-mono">user:{u.id}</code>.
            </p>
          </section>
        </div>
      </div>
    </AdminShell>
  );
}

function Kv({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-fg-muted">{k}</dt>
      <dd className="text-fg">{v}</dd>
    </div>
  );
}
