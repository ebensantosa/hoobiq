"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { useActionDialog } from "@/components/action-dialog";

const NEXT_STATUS: Record<string, "active" | "suspended"> = {
  active:    "suspended",
  suspended: "active",
  flagged:   "suspended",
};

export function UserActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const dialog = useActionDialog();
  const [busy, setBusy] = React.useState<"toggle" | "delete" | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!err) return;
    const t = setTimeout(() => setErr(null), 4000);
    return () => clearTimeout(t);
  }, [err]);

  async function toggleStatus() {
    setBusy("toggle"); setErr(null);
    try {
      const next = NEXT_STATUS[status] ?? "active";
      await api(`/admin/users/${id}`, { method: "PATCH", body: { status: next } });
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal");
    } finally {
      setBusy(null);
    }
  }

  function remove() {
    dialog.open({
      title: "Hapus user permanen?",
      description: "Semua data user (listing, post, wishlist, cart, sesi, payout, dll) akan dihapus dari database. Tidak bisa di-undo. Akan ditolak jika user punya riwayat order — gunakan suspend untuk akun lama.",
      tone: "danger",
      confirmLabel: "Hapus permanen",
      onConfirm: async () => {
        setBusy("delete"); setErr(null);
        try {
          await api(`/admin/users/${id}`, { method: "DELETE" });
          router.refresh();
        } catch (e) {
          setBusy(null);
          return e instanceof Error ? e.message : "Gagal";
        }
        setBusy(null);
      },
    });
  }

  return (
    <div className="flex flex-col items-end gap-1 text-xs">
      <div className="flex gap-2">
        <button onClick={toggleStatus} disabled={busy !== null} className="text-fg-muted hover:text-brand-400 disabled:opacity-50">
          {busy === "toggle" ? "…" : status === "active" ? "Suspend" : "Aktifkan"}
        </button>
        <button onClick={remove} disabled={busy !== null} className="text-fg-muted hover:text-crim-400 disabled:opacity-50">
          {busy === "delete" ? "…" : "Hapus"}
        </button>
      </div>
      {err && <span className="text-[10px] text-flame-600">{err}</span>}
    </div>
  );
}
