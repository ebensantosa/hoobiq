"use client";
import * as React from "react";
import { Button, Input, Label } from "@hoobiq/ui";
import { api, ApiError } from "@/lib/api/client";
import { useToast } from "./toast-provider";

/**
 * Real password-change form. Calls POST /auth/me/password and surfaces
 * outcomes via the global toast. Locks itself for 60s after a successful
 * change to mirror the API cooldown — the user sees a live countdown so
 * the disabled state is explained rather than silent.
 */
const COOLDOWN_SEC = 60;

export function ChangePasswordForm() {
  const toast = useToast();
  const [oldPw, setOldPw] = React.useState("");
  const [newPw, setNewPw] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [pending, start] = React.useTransition();
  const [cooldown, setCooldown] = React.useState(0);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  function reset() { setOldPw(""); setNewPw(""); setConfirm(""); }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (cooldown > 0) {
      toast.error("Tunggu sebentar", `Bisa ganti lagi dalam ${cooldown} detik.`);
      return;
    }
    if (newPw.length < 8) {
      toast.error("Password baru terlalu pendek", "Minimal 8 karakter.");
      return;
    }
    if (newPw !== confirm) {
      toast.error("Konfirmasi tidak cocok", "Password baru dan konfirmasi harus sama.");
      return;
    }
    if (newPw === oldPw) {
      toast.error("Password sama", "Password baru harus beda dari password lama.");
      return;
    }
    start(async () => {
      try {
        await api("/auth/me/password", {
          method: "POST",
          body: { currentPassword: oldPw, newPassword: newPw },
        });
        toast.success("Password berhasil diganti", "Sesi-sesi lain mungkin perlu login ulang.");
        reset();
        setCooldown(COOLDOWN_SEC);
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Gagal ganti password.";
        toast.error("Gagal ganti password", msg);
      }
    });
  }

  const disabled = pending || cooldown > 0;

  return (
    <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label>Password lama</Label>
        <Input type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} autoComplete="current-password" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Password baru</Label>
        <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} autoComplete="new-password" required minLength={8} />
        <p className="text-[11px] text-fg-subtle">
          Minimal 8 karakter, ada huruf besar, huruf kecil, dan angka.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label>Konfirmasi password baru</Label>
        <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-fg-subtle">
          {cooldown > 0
            ? `Bisa ganti lagi dalam ${cooldown}s`
            : "Maks 1 perubahan per menit untuk keamanan akun."}
        </p>
        <Button type="submit" variant="primary" size="md" disabled={disabled}>
          {pending ? "Menyimpan…" : cooldown > 0 ? `Tunggu ${cooldown}s` : "Simpan password"}
        </Button>
      </div>
    </form>
  );
}
