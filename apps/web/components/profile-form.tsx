"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Avatar, Badge, Button, Card, Input, Label, Textarea } from "@hoobiq/ui";
import { usersApi } from "@/lib/api/users";
import { uploadImage } from "@/lib/api/uploads";
import { ApiError } from "@/lib/api/client";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];

export function ProfileForm({
  defaults,
}: {
  defaults: { username: string; name: string; bio: string; city: string; phone: string; avatarUrl: string | null };
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [err, setErr] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(defaults.avatarUrl);
  const [avatarDirty, setAvatarDirty] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  function pickFile() {
    setErr(null);
    fileRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting same file
    if (!file) return;
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      setErr("Format harus PNG, JPG, atau WebP.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setErr("Ukuran maksimum 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarUrl(typeof reader.result === "string" ? reader.result : null);
      setAvatarDirty(true);
      setSaved(false);
    };
    reader.onerror = () => setErr("Gagal membaca file.");
    reader.readAsDataURL(file);
  }

  function removeAvatar() {
    setAvatarUrl(null);
    setAvatarDirty(true);
    setSaved(false);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null); setSaved(false);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try {
        // Push fresh avatar (if it's a data: URL) to storage first.
        let avatarPayload: Partial<{ avatarUrl: string | null }> = {};
        if (avatarDirty) {
          if (avatarUrl && avatarUrl.startsWith("data:")) {
            avatarPayload = { avatarUrl: await uploadImage(avatarUrl) };
          } else {
            avatarPayload = { avatarUrl };
          }
        }
        const phoneRaw = String(fd.get("phone") ?? "").trim();
        if (phoneRaw && !/^[+\d\s-]{8,32}$/.test(phoneRaw)) {
          setErr("Nomor HP minimal 8 digit, hanya angka, spasi, +, atau -.");
          return;
        }
        await usersApi.updateMe({
          name: String(fd.get("name") ?? "").trim() || null,
          bio:  String(fd.get("bio")  ?? "").trim() || null,
          city: String(fd.get("city") ?? "").trim() || null,
          phone: phoneRaw || null,
          ...avatarPayload,
        });
        setSaved(true);
        setAvatarDirty(false);
        router.refresh();
      } catch (e) {
        setErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Gagal menyimpan.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-8">
      <Card>
        <div className="flex items-center gap-5 p-6">
          <Avatar
            letter={defaults.username[0]?.toUpperCase() ?? "U"}
            size="xl"
            ring
            src={avatarUrl}
            alt="Foto profil"
          />
          <div className="flex-1">
            <p className="font-medium text-fg">Foto profil</p>
            <p className="mt-1 text-xs text-fg-muted">PNG/JPG/WebP, minimum 400×400px, maks 2MB.</p>
            <div className="mt-3 flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={pickFile}>
                Unggah foto
              </Button>
              {avatarUrl && (
                <Button type="button" variant="ghost" size="sm" onClick={removeAvatar}>
                  Hapus
                </Button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept={ALLOWED_AVATAR_TYPES.join(",")}
              onChange={onFileChange}
              className="hidden"
            />
            {avatarDirty && (
              <p className="mt-2 text-[11px] text-brand-500">Klik “Simpan perubahan” untuk menerapkan.</p>
            )}
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-5">
        <Field label="Nama tampilan">
          <Input name="name" defaultValue={defaults.name} maxLength={120} />
        </Field>
        <Field
          label="Username"
          hint={
            <span className="flex items-center gap-2">
              @{defaults.username}
              <Badge tone="ghost" size="xs">Belum bisa diubah</Badge>
            </span>
          }
        >
          <Input defaultValue={defaults.username} disabled />
        </Field>
        <Field label="Bio" hint="Maks 240 karakter">
          <Textarea name="bio" rows={3} maxLength={240} defaultValue={defaults.bio} />
        </Field>
        <Field label="Kota">
          <Input name="city" defaultValue={defaults.city} maxLength={64} />
        </Field>
        <Field
          label="Nomor HP"
          hint="Wajib diisi untuk checkout — dipakai kurir & invoice pembayaran."
        >
          <Input
            name="phone"
            type="tel"
            inputMode="tel"
            defaultValue={defaults.phone}
            placeholder="+62…"
            minLength={8}
            maxLength={32}
            pattern="[+\d\s-]+"
          />
        </Field>
      </div>

      {err && (
        <div role="alert" className="rounded-xl border border-flame-400/30 bg-flame-400/10 px-4 py-3 text-sm text-flame-600">
          {err}
        </div>
      )}
      {saved && (
        <div role="status" className="rounded-xl border border-brand-400/30 bg-brand-400/10 px-4 py-3 text-sm text-brand-500">
          Tersimpan ✓
        </div>
      )}

      <div className="flex justify-end gap-3 border-t border-rule pt-6">
        <Button type="button" variant="ghost" size="md">Batal</Button>
        <Button type="submit" variant="primary" size="md" disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan perubahan"}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-fg-subtle">{hint}</p>}
    </div>
  );
}
