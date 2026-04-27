import { AdminShell } from "@/components/admin-shell";
import { Badge, Button, Card, Input, TextTabs } from "@hoobiq/ui";

export const metadata = { title: "Kategori · Admin Hoobiq", robots: { index: false } };

type Node = { name: string; count?: number; children?: Node[] };

const tree: Node[] = [
  {
    name: "Trading Cards",
    count: 3420,
    children: [
      {
        name: "Pokémon",
        count: 2140,
        children: [
          { name: "Crown Zenith", count: 284 },
          { name: "Silver Tempest", count: 212 },
          { name: "Paldea Evolved", count: 198 },
          { name: "151", count: 158 },
          { name: "Obsidian Flames", count: 132 },
          { name: "Base Set", count: 54 },
        ],
      },
      { name: "One Piece", count: 642, children: [{ name: "OP01", count: 98 }, { name: "OP02", count: 72 }, { name: "OP03", count: 54 }] },
      { name: "Genshin Impact", count: 284 },
      { name: "Honkai: Star Rail", count: 192 },
      { name: "Yu-Gi-Oh!", count: 162 },
    ],
  },
  {
    name: "Action Figure",
    count: 1120,
    children: [
      { name: "Nendoroid", count: 412 },
      { name: "Scale 1/7", count: 298 },
      { name: "Figma", count: 184 },
      { name: "PVC", count: 142 },
      { name: "Gunpla", count: 84 },
    ],
  },
  {
    name: "Blind Box",
    count: 680,
    children: [
      { name: "Pop Mart · Labubu", count: 248 },
      { name: "Pop Mart · Skullpanda", count: 128 },
      { name: "Pop Mart · Dimoo", count: 98 },
      { name: "Sonny Angel", count: 82 },
      { name: "Kemelife", count: 54 },
    ],
  },
  { name: "Merchandise", count: 420, children: [{ name: "Apparel", count: 148 }, { name: "Acrylic Stand", count: 112 }, { name: "Plush", count: 84 }] },
  { name: "Komik", count: 310, children: [{ name: "Manga JP", count: 142 }, { name: "Manga ID", count: 98 }, { name: "Comics US/EU", count: 42 }, { name: "Doujinshi", count: 28 }] },
];

const pending = [
  { requester: "hsrfan",     path: "Trading Cards › HSR › Jade",        when: "2 jam lalu" },
  { requester: "blindboxid", path: "Blind Box › Kemelife › Seastrology", when: "1 hari lalu" },
  { requester: "gunplahead", path: "Action Figure › Gunpla › MGEX",     when: "3 hari lalu" },
];

export default function AdminKategoriPage() {
  return (
    <AdminShell active="Kategori">
      <div className="px-8 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-6">
          <div>
            <h1 className="text-3xl font-bold text-fg">Kategori</h1>
            <p className="mt-2 text-sm text-fg-muted">
              Struktur 3-level. Admin kategori (kolektor terverifikasi) dapat mengajukan sub-seri baru.
            </p>
          </div>
          <Button variant="primary" size="sm">+ Tambah kategori</Button>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-fg">Pohon kategori</h2>
              <Input placeholder="Cari kategori…" className="w-60" />
            </div>
            <Card>
              <div className="p-2">
                {tree.map((n) => (
                  <TreeNode key={n.name} node={n} depth={0} />
                ))}
              </div>
            </Card>
          </section>

          <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
            <div>
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <h2 id="request" className="text-xl font-semibold text-fg">Request baru</h2>
                  <p className="mt-1 text-sm text-fg-muted">{pending.length} menunggu review</p>
                </div>
                <TextTabs options={["Pending", "Disetujui", "Ditolak"]} />
              </div>
              <Card>
                {pending.map((p, i) => (
                  <div
                    key={i}
                    className={
                      "p-4 " + (i < pending.length - 1 ? "border-b border-rule/60" : "")
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-fg">{p.path}</p>
                        <p className="mt-0.5 text-xs text-fg-subtle">
                          oleh @{p.requester} · {p.when}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button className="rounded-lg border border-brand-400/50 bg-brand-400/10 px-2 py-1 text-[10px] font-semibold text-brand-400 hover:bg-brand-400/20">
                          Setujui
                        </button>
                        <button className="rounded-lg border border-rule px-2 py-1 text-[10px] text-fg-muted hover:border-crim-400/50 hover:text-crim-400">
                          Tolak
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </Card>
            </div>

            <Card>
              <div className="p-5">
                <h3 className="text-sm font-semibold text-fg">Admin kategori aktif</h3>
                <p className="mt-1 text-xs text-fg-muted">
                  Kolektor yang kami delegasikan untuk mengelola sub-seri di kategori spesifik.
                </p>
                <ul className="mt-4 space-y-3 text-sm">
                  <li className="flex items-center justify-between">
                    <span>@adityacollects</span>
                    <Badge tone="ghost" size="xs">Pokémon</Badge>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>@figurehunt</span>
                    <Badge tone="ghost" size="xs">Figure</Badge>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>@blindboxid</span>
                    <Badge tone="ghost" size="xs">Blind Box</Badge>
                  </li>
                </ul>
                <button className="mt-4 text-xs text-brand-400 hover:underline">
                  Kelola admin kategori →
                </button>
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </AdminShell>
  );
}

function TreeNode({ node, depth }: { node: Node; depth: number }) {
  const hasChildren = node.children && node.children.length > 0;
  return (
    <>
      <div
        className="group flex items-center justify-between rounded-lg px-3 py-2 hover:bg-panel/60"
        style={{ paddingLeft: 12 + depth * 20 }}
      >
        <div className="flex items-center gap-2">
          <span className={depth === 0 ? "font-semibold text-fg" : "text-fg-muted"}>
            {hasChildren ? "▸ " : "• "}
            {node.name}
          </span>
          {node.count != null && (
            <span className="font-mono text-[10px] text-fg-subtle">({node.count})</span>
          )}
        </div>
        <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          <button className="text-xs text-fg-muted hover:text-brand-400">Edit</button>
          <button className="text-xs text-fg-muted hover:text-brand-400">+ Sub</button>
          <button className="text-xs text-fg-muted hover:text-crim-400">Hapus</button>
        </div>
      </div>
      {hasChildren &&
        node.children!.map((c) => <TreeNode key={c.name} node={c} depth={depth + 1} />)}
    </>
  );
}
