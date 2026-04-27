import { AdminShell } from "@/components/admin-shell";
import { Avatar, Badge, Card, TextTabs } from "@hoobiq/ui";

export const metadata = { title: "Moderasi feed · Admin Hoobiq", robots: { index: false } };

type Post = {
  id: number;
  user: string;
  body: string;
  category: string;
  flags: number;
  reason: string;
  images: number;
};

const queue: Post[] = [
  { id: 2041, user: "rudewords",  body: "[konten disensor oleh sistem — kata kasar terhadap kelompok tertentu]", category: "Cards · Pokémon", flags: 5, reason: "Ujaran kebencian",  images: 1 },
  { id: 2035, user: "dropshipX",  body: "JUAL MURAH MURAH CEK BIO TELEGRAM WA XXXX TIPS BERGABUNG GRUP VIP TRADING",         category: "Blind Box",       flags: 7, reason: "Spam / promosi luar",  images: 0 },
  { id: 2030, user: "fakegrade",  body: "PSA 10 asli, 100% legit, nggak perlu verifikasi grade slab, DM aja",                     category: "Cards · Pokémon", flags: 3, reason: "Klaim grade palsu",    images: 4 },
  { id: 2012, user: "nsfwaccount",body: "[gambar tidak sesuai dengan tema kolektor — ditandai NSFW oleh auto-classifier]",         category: "—",               flags: 12, reason: "NSFW",                 images: 2 },
];

export default function AdminModerasiPage() {
  return (
    <AdminShell active="Moderasi feed">
      <div className="px-8 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-6">
          <div>
            <h1 className="text-3xl font-bold text-fg">Moderasi feed</h1>
            <p className="mt-2 text-sm text-fg-muted">
              Post komunitas yang di-flag auto-classifier atau laporan pengguna. Review manual sebelum dihapus.
            </p>
          </div>
          <TextTabs options={["Perlu review", "Dihapus", "Disetujui"]} />
        </div>

        <div className="mt-6 flex flex-col gap-4">
          {queue.map((p) => (
            <Card key={p.id}>
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <Avatar letter={p.user[0]} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-fg">@{p.user}</p>
                      <Badge tone="ghost" size="xs">{p.category}</Badge>
                      <Badge tone="crim" size="xs">{p.reason}</Badge>
                      <span className="font-mono text-[10px] text-fg-subtle">#{p.id}</span>
                    </div>
                    <p className="mt-3 rounded-lg border border-rule bg-panel/60 px-4 py-3 text-sm leading-relaxed text-fg-muted">
                      {p.body}
                    </p>
                    {p.images > 0 && (
                      <div className="mt-3 flex gap-2">
                        {Array.from({ length: p.images }).map((_, i) => (
                          <div key={i} className="h-16 w-16 overflow-hidden rounded-lg bg-panel-2">
                            <div className="h-full w-full bg-gradient-to-br from-brand-400/20 via-ultra-400/15 to-flame-400/20" />
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="mt-3 text-xs text-fg-subtle">
                      {p.flags} laporan dari pengguna · diterima auto-classifier
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    <button className="rounded-lg border border-crim-400/50 bg-crim-400/10 px-3 py-1.5 text-xs font-semibold text-crim-400 hover:bg-crim-400/20">
                      Hapus post
                    </button>
                    <button className="rounded-lg border border-rule px-3 py-1.5 text-xs text-fg-muted hover:border-fg/40">
                      Shadowban 7 hari
                    </button>
                    <button className="rounded-lg border border-rule px-3 py-1.5 text-xs text-fg-muted hover:border-fg/40">
                      Tandai aman
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
