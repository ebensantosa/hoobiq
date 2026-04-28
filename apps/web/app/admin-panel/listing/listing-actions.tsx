"use client";
import * as React from "react";
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

  async function toggleModeration() {
    setBusy("toggle");
    try {
      const next = NEXT_MOD[moderation] ?? "active";
      await api(`/admin/listings/${id}`, { method: "PATCH", body: { moderation: next, isPublished: next === "active" } });
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gagal mengubah moderasi");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!confirm("Hapus listing ini? Kalau ada order historis, akan di-soft-disable; kalau tidak, dihapus permanen.")) return;
    setBusy("delete");
    try {
      await api(`/admin/listings/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gagal menghapus");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex justify-end gap-2">
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
  );
}
