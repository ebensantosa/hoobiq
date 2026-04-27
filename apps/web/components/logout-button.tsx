"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authApi } from "@/lib/api/auth";

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    if (pending) return;
    setPending(true);
    try { await authApi.logout(); } catch { /* ignore */ }
    router.replace("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={pending}
      className={
        className ??
        "flex w-full items-center justify-center rounded-2xl border border-flame-400/30 bg-flame-400/5 p-4 text-sm font-semibold text-flame-500 transition-colors hover:bg-flame-400/10 disabled:opacity-50"
      }
    >
      {pending ? "Keluar…" : "Keluar"}
    </button>
  );
}
