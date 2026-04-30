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
      {/* Match the topbar gutter (px-4 sm:px-6 lg:px-10 within the
          shared 1440 frame) so the heading sits flush under the logo
          instead of the wider center-and-clamp max-w-5xl band, which
          produced an off-axis indent on wide viewports. */}
      <div className="px-4 pb-12 sm:px-6 lg:px-10">
        <header className="border-b border-rule pb-8">
          <h1 className="text-3xl font-bold text-fg md:text-4xl">Pasang listing baru</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-fg-muted md:text-base">
            Foto jelas + deskripsi jujur = listing terjual lebih cepat. Listing
            masuk antrian moderasi sebelum tayang publik (biasanya &lt; 5 menit).
          </p>
        </header>
        <UploadForm tree={tree ?? []} />
      </div>
    </AppShell>
  );
}
