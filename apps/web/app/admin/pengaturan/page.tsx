import { AdminShell } from "@/components/admin-shell";
import { SettingsForm } from "./settings-form";
import { serverApi } from "@/lib/server/api";
import { COPY_KEYS, type CopyKey } from "@/lib/copy/keys";

export const metadata = { title: "Pengaturan platform · Admin Hoobiq", robots: { index: false } };
export const dynamic = "force-dynamic";

type Settings = {
  brandName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  footerText: string;
  copy: Record<string, string>;
};

export default async function AdminSettingsPage() {
  const data = await serverApi<Settings>("/site-settings");

  // Merge defaults with overrides so the form always has all keys.
  const initialCopy: Record<CopyKey, string> = {} as Record<CopyKey, string>;
  for (const key of Object.keys(COPY_KEYS) as CopyKey[]) {
    initialCopy[key] = data?.copy?.[key] ?? COPY_KEYS[key];
  }

  return (
    <AdminShell active="Pengaturan">
      <div className="px-8 py-8">
        <div className="border-b border-rule pb-6">
          <h1 className="text-3xl font-bold text-fg">Pengaturan platform</h1>
          <p className="mt-2 text-sm text-fg-muted">
            Branding dan teks utama yang dilihat user. Perubahan terbit dalam ~60 detik dan dicatat di audit log.
          </p>
        </div>

        <SettingsForm
          initial={{
            brandName: data?.brandName ?? "Hoobiq",
            logoUrl: data?.logoUrl ?? null,
            faviconUrl: data?.faviconUrl ?? null,
            primaryColor: data?.primaryColor ?? "#FFA552",
            footerText: data?.footerText ?? "© Hoobiq · Marketplace kolektor Indonesia",
            copy: initialCopy,
          }}
          defaults={COPY_KEYS}
        />
      </div>
    </AdminShell>
  );
}
