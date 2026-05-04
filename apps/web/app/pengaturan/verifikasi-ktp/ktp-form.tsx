"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label } from "@hoobiq/ui";
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
  const [fullName, setFullName] = React.useState("");
  const [nik, setNik] = React.useState("");
  const [dob, setDob] = React.useState("");
  const [address, setAddress] = React.useState("");
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
    if (fullName.trim().length < 2) {
      toast.error("Nama belum diisi", "Tulis nama lengkap sesuai KTP.");
      return;
    }
    if (!/^\d{16}$/.test(nik.trim())) {
      toast.error("NIK tidak valid", "NIK harus 16 digit angka.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob.trim())) {
      toast.error("Tanggal lahir kosong", "Pilih tanggal lahir sesuai KTP.");
      return;
    }
    if (address.trim().length < 10) {
      toast.error("Alamat belum lengkap", "Tulis alamat sesuai KTP (min 10 karakter).");
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
          body: {
            frontUrl, selfieUrl,
            fullName: fullName.trim(),
            nik: nik.trim(),
            dob: dob.trim(),
            address: address.trim(),
          },
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

      <Card>
        <div className="flex flex-col gap-4 p-5">
          <div>
            <p className="text-sm font-bold text-fg">Data identitas</p>
            <p className="mt-0.5 text-xs text-fg-muted">
              Isi sesuai yang tertulis di KTP. Admin pakai data ini buat cross-check
              foto kamu — pastikan persis sama biar gak ditolak.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <Label>Nama lengkap (sesuai KTP)</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="EBENTERA SANTOSA"
                maxLength={120}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>NIK (16 digit)</Label>
              <Input
                value={nik}
                onChange={(e) => setNik(e.target.value.replace(/\D/g, "").slice(0, 16))}
                placeholder="3300000000000000"
                inputMode="numeric"
                maxLength={16}
                className="font-mono"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Tanggal lahir</Label>
              <Input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <Label>Alamat (sesuai KTP)</Label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                maxLength={400}
                placeholder="Jl. ___ No. __, RT/RW, Kel. ___, Kec. ___, Kota/Kabupaten ___, Provinsi ___, Kode Pos."
                className="w-full resize-none rounded-md border border-rule bg-panel px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-brand-400/60 focus:outline-none focus:ring-2 focus:ring-brand-400/15"
              />
            </div>
          </div>
          <p className="text-[10px] leading-relaxed text-fg-subtle">
            Data ini disimpan terenkripsi & tidak ditampilkan publik. Cuma admin
            review yang bisa lihat — sesuai Kebijakan Privasi.
          </p>
        </div>
      </Card>

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
        <button type="button" onClick={onClear} className="text-xs font-medium text-flame-600">
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
