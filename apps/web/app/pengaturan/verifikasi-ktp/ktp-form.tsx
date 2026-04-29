"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@hoobiq/ui";
import { api, ApiError } from "@/lib/api/client";
import { uploadImage } from "@/lib/api/uploads";
import { useToast } from "@/components/toast-provider";

type Status = {
  status: "none" | "pending" | "verified" | "rejected";
  verified: boolean;
  rejectNote: string | null;
  submittedAt: string | null;
  verifiedAt: string | null;
};

const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 4 * 1024 * 1024; // 4MB — KTP photos are denser than feed posts

export function KtpForm({ initialStatus }: { initialStatus: Status }) {
  const router = useRouter();
  const toast = useToast();
  const [front, setFront] = React.useState<string | null>(null);
  const [selfie, setSelfie] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();

  if (initialStatus.verified) {
    return (
      <Card>
        <div className="flex items-start gap-3 p-5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-600">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          <div>
            <p className="font-bold text-fg">KTP terverifikasi</p>
            <p className="mt-1 text-xs text-fg-muted">
              Kamu sudah bisa tambah rekening payout dan menerima pencairan dana.
              {initialStatus.verifiedAt && ` Diverifikasi ${new Date(initialStatus.verifiedAt).toLocaleDateString("id-ID")}.`}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (initialStatus.status === "pending") {
    return (
      <Card>
        <div className="flex items-start gap-3 p-5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-400/20 text-amber-700 dark:text-amber-300">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </span>
          <div>
            <p className="font-bold text-fg">Sedang direview</p>
            <p className="mt-1 text-xs text-fg-muted">
              Tim Hoobiq biasanya review dalam 1×24 jam. Notif masuk ke email
              kamu begitu selesai.
              {initialStatus.submittedAt && ` Dikirim ${new Date(initialStatus.submittedAt).toLocaleString("id-ID")}.`}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  function pick(setter: (v: string | null) => void) {
    return async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      if (!ACCEPTED.includes(file.type)) {
        toast.error("Format tidak didukung", "Pakai PNG, JPG, atau WebP.");
        return;
      }
      if (file.size > MAX_BYTES) {
        toast.error("File terlalu besar", "Maksimum 4 MB per foto.");
        return;
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      setter(dataUrl);
    };
  }

  function submit() {
    if (!front || !selfie) {
      toast.error("Foto belum lengkap", "Upload KTP dan selfie sambil pegang KTP.");
      return;
    }
    start(async () => {
      try {
        const [frontUrl, selfieUrl] = await Promise.all([
          uploadImage(front, "evidence"),
          uploadImage(selfie, "evidence"),
        ]);
        await api("/users/me/ktp", {
          method: "POST",
          body: { frontUrl, selfieUrl },
        });
        toast.success("KTP terkirim", "Tim Hoobiq akan review dalam 1×24 jam.");
        router.refresh();
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Gagal kirim verifikasi.";
        toast.error("Gagal kirim", msg);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {initialStatus.status === "rejected" && initialStatus.rejectNote && (
        <div className="rounded-md border border-flame-400/40 bg-flame-400/10 p-4 text-sm text-flame-700 dark:text-flame-400">
          <p className="font-semibold">Verifikasi sebelumnya ditolak</p>
          <p className="mt-1 text-xs">{initialStatus.rejectNote}</p>
          <p className="mt-2 text-xs">Submit ulang dengan foto yang lebih jelas.</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <UploadSlot
          label="Foto KTP"
          hint="NIK, nama, foto kelihatan jelas. Tanpa filter, tanpa cover."
          value={front}
          onPick={pick(setFront)}
          onClear={() => setFront(null)}
        />
        <UploadSlot
          label="Selfie + KTP"
          hint="Selfie sambil pegang KTP yang sama. Wajah & teks KTP terbaca."
          value={selfie}
          onPick={pick(setSelfie)}
          onClear={() => setSelfie(null)}
        />
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={submit}
          disabled={pending || !front || !selfie}
        >
          {pending ? "Mengunggah…" : "Kirim untuk verifikasi"}
        </Button>
      </div>
    </div>
  );
}

function UploadSlot({
  label, hint, value, onPick, onClear,
}: {
  label: string;
  hint: string;
  value: string | null;
  onPick: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold text-fg">{label}</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative aspect-[4/3] w-full overflow-hidden rounded-md border-2 border-dashed border-rule bg-panel-2/40 transition-colors hover:border-brand-400/60 hover:bg-panel-2"
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={label} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-fg-subtle">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span className="text-xs font-semibold text-fg">Klik untuk upload</span>
          </div>
        )}
      </button>
      {value && (
        <button type="button" onClick={onClear} className="text-xs font-medium text-flame-600 hover:underline">
          Ganti foto
        </button>
      )}
      <p className="text-[11px] text-fg-subtle">{hint}</p>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        hidden
        onChange={onPick}
      />
    </div>
  );
}
