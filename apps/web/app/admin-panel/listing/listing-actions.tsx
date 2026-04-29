"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";

const NEXT_MOD: Record<string, string> = {
  active:   "hidden",
  pending:  "active",
  hidden:   "active",
  rejected: "active",
};

export function ListingActions({ id, moderation }: { id: string; moderation: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<"toggle" | "delete" | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!err) return;
    const t = setTimeout(() => setErr(null), 4000);
    return () => clearTimeout(t);
  }, [err]);

  async function toggleModeration() {
    setBusy("toggle"); setErr(null);
    try {
      const next = NEXT_MOD[moderation] ?? "active";
      await api(`/admin/listings/${id}`, { method: "PATCH", body: { moderation: next, isPublished: next === "active" } });
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal mengubah moderasi");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!confirm("Hapus listing ini? Kalau ada order historis, akan di-soft-disable; kalau tidak, dihapus permanen.")) return;
    setBusy("delete"); setErr(null);
    try {
      await api(`/admin/listings/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menghapus");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Link
          href={`/admin-panel/listing/${id}/edit`}
          className="text-xs text-fg-muted hover:text-brand-400"
        >
          Edit
        </Link>
        <button
          onClick={toggleModeration}
          disabled={busy !== null}
          className="text-xs text-fg-muted hover:text-brand-400 disabled:opacity-50"
          title={`Ubah ke "${NEXT_MOD[moderation] ?? "active"}"`}
        >
          {busy === "toggle" ? "…" : moderation === "active" ? "Sembunyikan" : "Aktifkan"}
        </button>
        <button
          onClick={remove}
          disabled={busy !== null}
          className="text-xs text-fg-muted hover:text-crim-400 disabled:opacity-50"
        >
          {busy === "delete" ? "…" : "Hapus"}
        </button>
      </div>
      {err && <span className="text-[10px] text-flame-600">{err}</span>}
    </div>
  );
}
