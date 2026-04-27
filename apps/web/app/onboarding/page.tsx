"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Button, Logo, Progress } from "@hoobiq/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { api } from "@/lib/api/client";

type Node = {
  id: string;
  slug: string;
  name: string;
  level: number;
  parentId: string | null;
  listingCount: number;
  children: Node[];
};

const MAX_INTERESTS = 5;

export default function OnboardingPage() {
  const router = useRouter();
  const [tree, setTree] = React.useState<Node[]>([]);
  const [picked, setPicked] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const data = await api<Node[]>("/categories");
        setTree(data ?? []);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Gagal memuat kategori.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Flatten level-2 (sub-kategori) seperti pokemon, genshin, popmart, manga, dll.
  // Itu yang dimaksud "interest" di spec — bukan kategori utama level-1.
  const subcategories = React.useMemo(() => {
    const subs: Array<Node & { parentName: string }> = [];
    for (const root of tree) {
      for (const child of root.children) {
        if (child.level === 2) subs.push({ ...child, parentName: root.name });
      }
    }
    return subs;
  }, [tree]);

  const toggle = (slug: string) => {
    setErr(null);
    setPicked((p) => {
      if (p.includes(slug)) return p.filter((x) => x !== slug);
      if (p.length >= MAX_INTERESTS) {
        setErr(`Max ${MAX_INTERESTS} pilihan. Hapus salah satu dulu untuk tambah baru.`);
        return p;
      }
      return [...p, slug];
    });
  };

  async function save() {
    if (picked.length === 0 || saving) return;
    setSaving(true);
    setErr(null);
    try {
      await api("/users/me", { method: "PATCH", body: { interested: picked } });
      router.push("/marketplace");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menyimpan.");
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-6 md:px-10">
        <Logo />
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4].map((s) => (
              <span
                key={s}
                className={"h-1.5 w-6 rounded-full " + (s <= 2 ? "bg-brand-400" : "bg-panel-2")}
              />
            ))}
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-subtle">Step 2 / 4</span>
          <ThemeToggle />
          <Link href="/marketplace" className="text-sm text-fg-muted hover:text-fg">Lewati</Link>
        </div>
      </header>

      <section className="mx-auto max-w-[1120px] px-6 pb-16 pt-10 md:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <span className="font-mono text-eyebrow uppercase text-brand-400">Minat kamu</span>
          <h1 className="mt-4 font-display text-display-md text-fg">Apa yang kamu koleksi?</h1>
          <p className="mt-4 text-fg-muted">
            Pilih max <strong className="text-fg">{MAX_INTERESTS}</strong> minat. Kita pakai ini untuk atur feeds & rekomendasi listing. Bisa diubah kapan aja di pengaturan.
          </p>
        </div>

        {loading ? (
          <div className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-card bg-panel/60" />
            ))}
          </div>
        ) : subcategories.length === 0 ? (
          <p className="mt-12 text-center text-sm text-fg-muted">Belum ada sub-kategori. Hubungi admin untuk seeding.</p>
        ) : (
          <div className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
            {subcategories.map((c) => {
              const active = picked.includes(c.slug);
              const disabled = !active && picked.length >= MAX_INTERESTS;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggle(c.slug)}
                  disabled={disabled}
                  className={
                    "group flex flex-col items-start gap-1.5 rounded-card border p-4 text-left transition-all " +
                    (active
                      ? "border-brand-400 bg-brand-400/5 shadow-glow"
                      : disabled
                      ? "border-rule bg-panel/30 opacity-50 cursor-not-allowed"
                      : "border-rule bg-panel/60 hover:border-brand-400/40")
                  }
                >
                  <span className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">{c.parentName}</span>
                  <p className="font-display text-lg text-fg">{c.name}</p>
                  <p className="text-[11px] text-fg-muted">{c.listingCount} listing</p>
                  {active && <Badge tone="solid" size="xs" className="mt-1">Dipilih</Badge>}
                </button>
              );
            })}
          </div>
        )}

        {err && (
          <p role="alert" className="mt-6 text-center text-sm text-flame-400">{err}</p>
        )}

        <div className="mt-10 flex items-center justify-between border-t border-rule pt-6">
          <span className="font-mono text-xs text-fg-muted">
            {picked.length} / {MAX_INTERESTS} dipilih
          </span>
          <div className="flex items-center gap-3">
            <Link href="/marketplace" className="inline-flex h-10 items-center rounded-lg px-4 text-sm text-fg-muted hover:text-fg">
              Lewati
            </Link>
            <Button
              variant="primary"
              size="md"
              onClick={save}
              disabled={picked.length === 0 || saving}
            >
              {saving ? "Menyimpan…" : "Lanjut ke marketplace"}
            </Button>
          </div>
        </div>

        <div className="mt-12 mx-auto max-w-md">
          <Progress value={50} />
        </div>
      </section>
    </div>
  );
}
