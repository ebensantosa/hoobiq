import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Card } from "@hoobiq/ui";
import { serverApi } from "@/lib/server/api";

type Badge = {
  key: string;
  label: string;
  glyph: string;
  tone: string;
};

type PassportUser = {
  id: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
};

type Passport = {
  collectionCount: number;
  collectionValueIdr: number;
  postsCount: number;
  tradesCompleted: number;
  tradeRating: number;
  badges: Badge[];
};

export const dynamic = "force-dynamic";

/**
 * "Koleksi badge" page — landing for the CTA on the profile passport.
 * Shows the user's earned badges as a grid card and lists the catalog
 * of badges still available to unlock so visitors understand what each
 * one means and what's left to chase.
 */
export default async function BadgesPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await serverApi<{ user: PassportUser; passport: Passport }>(
    `/users/${encodeURIComponent(username)}`,
  );
  if (!profile?.user) notFound();

  const earned = profile.passport.badges;
  const earnedKeys = new Set(earned.map((b) => b.key));
  const locked = CATALOG.filter((c) => !earnedKeys.has(c.key));

  return (
    <AppShell active="Profile">
      <div className="px-6 pb-12 lg:px-10">
        <nav className="text-xs text-fg-subtle">
          <Link href={`/u/${encodeURIComponent(username)}`} className="hover:text-fg">
            @{username}
          </Link>
          <span className="mx-2">/</span>
          <span>Badges</span>
        </nav>

        <header className="mt-3 border-b border-rule pb-6">
          <h1 className="text-3xl font-bold text-fg md:text-4xl">Koleksi badge</h1>
          <p className="mt-2 max-w-2xl text-sm text-fg-muted">
            {earned.length === 0
              ? "Belum ada badge. Mulai listing, post, atau trade untuk unlock yang pertama."
              : `${earned.length} badge sudah terkumpul · ${CATALOG.length - earned.length} lagi tersedia.`}
          </p>
        </header>

        {earned.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xl font-bold text-fg">Sudah didapat</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {earned.map((b) => (
                <Card key={b.key}>
                  <div className="flex items-start gap-4 p-5">
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-400/15 text-3xl">
                      {b.glyph}
                    </span>
                    <div>
                      <p className="font-bold text-fg">{b.label}</p>
                      <p className="mt-1 text-xs text-fg-muted">{describeBadge(b.key)}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {locked.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-bold text-fg">Belum unlock</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {locked.map((b) => (
                <Card key={b.key} className="opacity-70">
                  <div className="flex items-start gap-4 p-5">
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-panel-2 text-3xl grayscale">
                      {b.glyph}
                    </span>
                    <div>
                      <p className="font-bold text-fg">{b.label}</p>
                      <p className="mt-1 text-xs text-fg-muted">{b.requirement}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}

const CATALOG: Array<{ key: string; label: string; glyph: string; requirement: string }> = [
  { key: "tcg",      label: "TCG Master",      glyph: "🃏", requirement: "≥25% listing aktif kamu adalah trading cards." },
  { key: "popmart",  label: "Pop Mart Hunter", glyph: "📦", requirement: "≥25% listing kamu blind box / Pop Mart series." },
  { key: "figure",   label: "Figure Curator",  glyph: "🗿", requirement: "≥25% listing kamu adalah action figure." },
  { key: "manga",    label: "Manga Otaku",     glyph: "📚", requirement: "≥25% listing kamu komik atau manga." },
  { key: "merch",    label: "Merch Maven",     glyph: "👕", requirement: "≥25% listing kamu merchandise." },
  { key: "trader",   label: "Trader Aktif",    glyph: "🤝", requirement: "Selesaikan ≥3 trade." },
  { key: "creator",  label: "Konten Kreator",  glyph: "📝", requirement: "Post ≥20 di feeds." },
  { key: "veteran",  label: "OG Collector",    glyph: "🏛️", requirement: "Akun ≥1 tahun." },
];

function describeBadge(key: string): string {
  return CATALOG.find((c) => c.key === key)?.requirement ?? "—";
}
