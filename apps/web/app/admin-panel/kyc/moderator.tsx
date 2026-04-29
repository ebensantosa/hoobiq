"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, Button, Card, Input } from "@hoobiq/ui";
import { api, ApiError } from "@/lib/api/client";
import { useToast } from "@/components/toast-provider";

type KycItem = {
  id: string;
  username: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  city: string | null;
  status: "pending" | "verified" | "rejected";
  submittedAt: string | null;
  verifiedAt: string | null;
  rejectNote: string | null;
  frontUrl: string | null;
  selfieUrl: string | null;
};

/**
 * KTP review queue. Pending tab is the working surface — admin sees
 * the user's KTP photo + selfie side-by-side, can zoom either by
 * clicking, then approve (one-click) or reject (with required note).
 *
 * Approved/rejected tabs are read-only history.
 */
export function KycModerator({ initial, status }: { initial: KycItem[]; status: string }) {
  const router = useRouter();
  const [items, setItems] = React.useState(initial);

  React.useEffect(() => { setItems(initial); }, [initial]);

  const tabs = [
    { key: "pending",  label: "Menunggu" },
    { key: "verified", label: "Disetujui" },
    { key: "rejected", label: "Ditolak" },
  ];

  return (
    <div className="mt-6">
      <div className="flex items-center gap-1 border-b border-rule">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/admin-panel/kyc?status=${t.key}`}
            className={
              "border-b-2 px-3 py-2 text-sm font-semibold transition-colors " +
              (t.key === status
                ? "border-brand-400 text-brand-500"
                : "border-transparent text-fg-muted hover:text-fg")
            }
          >
            {t.label}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="mt-6 rounded-md border border-rule bg-panel/40 p-8 text-center text-sm text-fg-muted">
          Tidak ada submission {status === "pending" ? "menunggu review" : status === "verified" ? "yang disetujui" : "yang ditolak"}.
        </p>
      ) : (
        <div className="mt-6 grid gap-4">
          {items.map((it) => (
            <Row
              key={it.id}
              item={it}
              status={status}
              onChange={() => {
                setItems((prev) => prev.filter((i) => i.id !== it.id));
                router.refresh();
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ item, status, onChange }: { item: KycItem; status: string; onChange: () => void }) {
  const toast = useToast();
  const [mode, setMode] = React.useState<"idle" | "rejecting">("idle");
  const [note, setNote] = React.useState("");
  const [pending, start] = React.useTransition();
  const [zoom, setZoom] = React.useState<string | null>(null);

  function approve() {
    start(async () => {
      try {
        await api(`/users/kyc/${item.id}/approve`, { method: "POST" });
        toast.success("KTP disetujui", `${item.name ?? item.username} sekarang bisa tambah rekening.`);
        onChange();
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Gagal approve.";
        toast.error("Gagal approve", msg);
      }
    });
  }

  function reject() {
    if (note.trim().length < 2) {
      toast.error("Catatan kosong", "Tulis alasan penolakan biar user tahu.");
      return;
    }
    start(async () => {
      try {
        await api(`/users/kyc/${item.id}/reject`, { method: "POST", body: { note: note.trim() } });
        toast.success("KTP ditolak", "User akan lihat catatan kamu.");
        onChange();
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Gagal reject.";
        toast.error("Gagal reject", msg);
      }
    });
  }

  return (
    <>
      <Card>
        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_2fr]">
          {/* User card */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Avatar
                letter={(item.name ?? item.username)[0]?.toUpperCase() ?? "U"}
                size="md"
                src={item.avatarUrl}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold text-fg">{item.name ?? item.username}</p>
                <p className="truncate text-xs text-fg-muted">{item.email}</p>
                {item.city && <p className="truncate text-xs text-fg-subtle">{item.city}</p>}
              </div>
            </div>
            <div className="text-xs text-fg-subtle">
              {item.submittedAt && <p>Dikirim {new Date(item.submittedAt).toLocaleString("id-ID")}</p>}
              {item.verifiedAt && <p>Disetujui {new Date(item.verifiedAt).toLocaleString("id-ID")}</p>}
            </div>
            {status === "rejected" && item.rejectNote && (
              <div className="rounded-md border border-flame-400/30 bg-flame-400/5 p-3 text-xs text-flame-700 dark:text-flame-400">
                <span className="font-semibold">Catatan:</span> {item.rejectNote}
              </div>
            )}
          </div>

          {/* Photos */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Photo label="Foto KTP" url={item.frontUrl} onZoom={() => item.frontUrl && setZoom(item.frontUrl)} />
            <Photo label="Selfie + KTP" url={item.selfieUrl} onZoom={() => item.selfieUrl && setZoom(item.selfieUrl)} />
            {status === "pending" && (
              <div className="sm:col-span-2 flex flex-col gap-2">
                {mode === "idle" ? (
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setMode("rejecting")} disabled={pending}>
                      Tolak
                    </Button>
                    <Button type="button" variant="primary" size="sm" onClick={approve} disabled={pending}>
                      {pending ? "Approving…" : "Approve"}
                    </Button>
                  </div>
                ) : (
                  <>
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-fg-subtle">Catatan penolakan</label>
                    <Input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Foto buram / nama tidak match / dll"
                    />
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setMode("idle")} disabled={pending}>
                        Batal
                      </Button>
                      <Button type="button" variant="primary" size="sm" onClick={reject} disabled={pending}>
                        {pending ? "Rejecting…" : "Konfirmasi tolak"}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      {zoom && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setZoom(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom} alt="KTP" className="max-h-[90vh] max-w-[92vw] rounded-md object-contain" />
        </div>
      )}
    </>
  );
}

function Photo({ label, url, onZoom }: { label: string; url: string | null; onZoom: () => void }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-fg-subtle">{label}</p>
      {url ? (
        <button
          type="button"
          onClick={onZoom}
          className="relative aspect-[4/3] w-full overflow-hidden rounded-md border border-rule bg-panel-2 transition-transform hover:scale-[1.01]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={label} className="absolute inset-0 h-full w-full cursor-zoom-in object-cover" />
        </button>
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center rounded-md border border-dashed border-rule bg-panel-2 text-xs text-fg-subtle">
          Tidak ada foto
        </div>
      )}
    </div>
  );
}
