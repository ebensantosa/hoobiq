import { AppShell } from "@/components/app-shell";
import { UploadForm } from "@/components/upload-form";
import { serverApi } from "@/lib/server/api";

export const dynamic = "force-dynamic";

type Node = {
  id: string;
  slug: string;
  name: string;
  level: number;
  children: Node[];
};

export default async function UploadPage() {
  const tree = await serverApi<Node[]>("/categories", { revalidate: 60 });
  return (
    <AppShell active="Marketplace">
      <div className="mx-auto max-w-4xl px-6 pb-8 lg:px-10">
        <header className="border-b border-rule pb-6">
          <h1 className="text-3xl font-bold text-fg">Pasang listing baru</h1>
          <p className="mt-2 text-sm text-fg-muted">
            Foto jelas + deskripsi jujur = listing terjual lebih cepat. Listing
            masuk antrian moderasi sebelum tayang publik (biasanya &lt; 5 menit).
          </p>
        </header>
        <UploadForm tree={tree ?? []} />
      </div>
    </AppShell>
  );
}
