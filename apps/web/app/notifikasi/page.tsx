import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { serverApi } from "@/lib/server/api";
import type { NotificationItem } from "@/lib/api/notifications";

export const dynamic = "force-dynamic";

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  return d === 1 ? "kemarin" : `${d} hari lalu`;
}

export default async function NotifikasiPage() {
  const data = await serverApi<{ unread: number; items: NotificationItem[] }>("/notifications");
  const items = data?.items ?? [];

  return (
    <AppShell active="Feeds">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <header className="flex items-end justify-between border-b border-rule pb-6">
          <div>
            <h1 className="text-3xl font-bold text-fg">Notifikasi</h1>
            <p className="mt-2 text-sm text-fg-muted">
              {data && data.unread > 0
                ? `${data.unread} belum dibaca`
                : "Semua notifikasi sudah dibaca"}
            </p>
          </div>
          <Link href="/pengaturan/notifikasi" className="text-sm text-brand-400 hover:underline">
            Preferensi →
          </Link>
        </header>

        {items.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-rule bg-panel/40 p-10 text-center">
            <p className="text-base font-medium text-fg">Belum ada notifikasi</p>
            <p className="mt-1 text-sm text-fg-muted">
              Aktivitas penting akan muncul di sini begitu transaksi atau interaksi terjadi.
            </p>
          </div>
        ) : (
          <ul className="mt-6 flex flex-col gap-2">
            {items.map((n) => (
              <li
                key={n.id}
                className={
                  "rounded-xl border border-rule p-4 transition-colors " +
                  (n.readAt ? "bg-panel/40" : "border-brand-400/30 bg-brand-400/5")
                }
              >
                <p className="flex items-center gap-2 text-sm font-medium text-fg">
                  {!n.readAt && <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />}
                  {n.title}
                </p>
                <p className="mt-1 text-sm text-fg-muted">{n.body}</p>
                <p className="mt-2 text-xs text-fg-subtle">{timeAgo(n.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
