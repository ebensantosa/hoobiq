import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge, Button, Card, Logo } from "@hoobiq/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { MarketingFooter } from "@/components/marketing-footer";
import { CardArt, pickArt, type CardArtVariant } from "@/components/card-art";
import { getSessionUser } from "@/lib/server/session";

export default async function LandingPage() {
  // Authenticated users land on the marketplace, not the marketing page.
  const user = await getSessionUser();
  if (user) redirect("/marketplace");

  return (
    <main className="min-h-screen pt-16">
      <Nav />
      <Hero />
      <Marquee />
      <Trending />
      <CommunityPreview />
      <BottomCTA />
      <Footer />
    </main>
  );
}

/* ---------------- Nav ---------------- */

function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-rule bg-canvas/85 backdrop-blur supports-[backdrop-filter]:bg-canvas/75">
      <div className="mx-auto flex h-20 max-w-[1280px] items-center gap-8 px-6 md:px-10">
        <Link href="/" className="shrink-0">
          <Logo size="md" />
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-fg-muted md:flex">
          <Link href="/marketplace" className="hover:text-fg">Marketplace</Link>
          <Link href="/kategori" className="hover:text-fg">Kategori</Link>
          <Link href="/feeds" className="hover:text-fg">Komunitas</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Link href="/masuk" className="rounded-lg px-3 py-2 text-sm text-fg-muted hover:text-fg">
            Masuk
          </Link>
          <Link
            href="/daftar"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-brand-400 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-500"
          >
            Daftar
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ---------------- Hero ---------------- */

function Hero() {
  const chips = ["Charizard", "Luffy Leader", "Labubu", "Nendoroid", "Genshin"];
  return (
    <section className="mx-auto grid max-w-[1280px] items-start gap-10 px-6 pb-8 pt-10 md:grid-cols-[1.05fr_1fr] md:gap-14 md:px-10 md:pb-12 md:pt-14">
      <div>
        <h1 className="text-3xl font-bold leading-[1.1] tracking-tight text-fg md:text-[44px] md:leading-[1.08]">
          Tempat jual-beli &amp; pamer
          <br className="hidden md:block" />
          koleksi hobi kamu, <span className="text-brand-400">aman.</span>
        </h1>
        <p className="mt-4 max-w-xl text-sm text-fg-muted md:text-base">
          Cari kartu langka, trade figure, pamer blind box. Transaksi aman lewat
          Hoobiq&nbsp;Pay.
        </p>

        <div className="mt-6">
          <SearchBar />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-fg-subtle">Populer:</span>
            {chips.map((c) => (
              <Link
                key={c}
                href={`/marketplace?q=${encodeURIComponent(c)}`}
                className="rounded-full border border-rule bg-panel px-2.5 py-0.5 text-xs text-fg-muted transition-colors hover:border-brand-400/50 hover:text-fg"
              >
                {c}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-fg-muted">
          <Trust icon="shield">Dana aman Hoobiq Pay</Trust>
          <Trust icon="check">Seller terverifikasi</Trust>
          <Trust icon="refund">Refund otomatis 72 jam</Trust>
        </div>
      </div>

      <HeroShowcase />
    </section>
  );
}

function HeroShowcase() {
  const cards: ShowcaseCardProps[] = [
    { t: "Dragon Foil v2",      sub: "TCG · Holo edition",   p: "Rp 4.250.000", cond: "mint", art: "flame",   float: "animate-float"   },
    { t: "Storm Bringer 1/7",   sub: "Scale figure",          p: "Rp 1.250.000", cond: "mint", art: "thunder", float: "animate-float-3" },
    { t: "Pirate Captain",      sub: "TCG · Parallel rare",   p: "Rp 850.000",   cond: "near", art: "ocean",   float: "animate-float-2" },
    { t: "Pop Monsters · Chase", sub: "Blind box · Series 3", p: "Rp 680.000",   cond: "near", art: "bubble",  float: "animate-float-4" },
  ];
  return (
    <div className="relative mx-auto w-full max-w-[360px]">
      <div className="pointer-events-none absolute inset-6 rounded-[48px] bg-brand-soft blur-3xl opacity-70" />
      <div className="relative grid grid-cols-2 gap-3">
        <div className="relative z-10 flex flex-col gap-3">
          <ShowcaseCard {...cards[0]} />
          <ShowcaseCard {...cards[1]} />
        </div>
        <div className="relative z-20 mt-6 flex -translate-x-5 flex-col gap-3">
          <ShowcaseCard {...cards[2]} />
          <ShowcaseCard {...cards[3]} />
        </div>
      </div>
    </div>
  );
}

type ShowcaseCardProps = {
  t: string;
  sub?: string;
  p: string;
  cond: "mint" | "near";
  art: CardArtVariant;
  float: string;
};

function ShowcaseCard({ t, p, cond, art, float }: ShowcaseCardProps) {
  return (
    <div
      className={
        "overflow-hidden rounded-xl border border-rule bg-panel shadow-gallery " + float
      }
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <CardArt variant={art} />
        <span
          className={
            "absolute left-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider backdrop-blur " +
            (cond === "mint"
              ? "bg-white/85 text-brand-500 border border-brand-400/40"
              : "bg-white/85 text-fg-muted border border-rule")
          }
        >
          {cond === "mint" ? "Mint" : "Near Mint"}
        </span>
        {/* corner shine — tiny premium touch */}
        <span className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-white/30 to-transparent mix-blend-overlay" />
      </div>
      <div className="px-2.5 py-2">
        <p className="truncate text-[11px] font-semibold text-fg">{t}</p>
        <p className="mt-0.5 text-[11px] font-bold text-brand-500">{p}</p>
      </div>
    </div>
  );
}

/* ---------------- Marquee strip ---------------- */

function Marquee() {
  const items = [
    { t: "Charizard VMAX Rainbow", p: "Rp 4.250.000" },
    { t: "Luffy Leader Parallel", p: "Rp 850.000" },
    { t: "Raiden Shogun 1/7", p: "Rp 1.250.000" },
    { t: "Labubu Monsters S3", p: "Rp 680.000" },
    { t: "Pikachu Illustrator", p: "Rp 2.800.000" },
    { t: "Nendoroid Nakano Miku", p: "Rp 980.000" },
    { t: "HSR Acheron Lightcone", p: "Rp 320.000" },
    { t: "Chainsaw Man Vol. 1", p: "Rp 450.000" },
  ];
  const loop = [...items, ...items];
  return (
    <section className="border-y border-rule bg-panel/40 py-8">
      <div className="mx-auto max-w-[1280px] px-6 md:px-10">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <span className="relative flex h-2 w-2 items-center justify-center">
              <span className="absolute h-2 w-2 animate-ping rounded-full bg-brand-400 opacity-75" />
              <span className="relative h-2 w-2 rounded-full bg-brand-400" />
            </span>
            <span className="font-semibold text-fg">Baru masuk</span>
            <span className="text-fg-subtle">refresh tiap jam</span>
          </div>
          <Link href="/marketplace" className="hidden text-sm text-fg-muted hover:text-fg md:inline">
            Semua listing →
          </Link>
        </div>

        <div className="mask-fade-x relative overflow-hidden">
          <div className="flex w-max gap-3 animate-marquee">
            {loop.map((it, i) => (
              <div
                key={i}
                className="flex w-60 shrink-0 items-center gap-3 rounded-xl border border-rule bg-panel px-3 py-2.5"
              >
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-panel-2">
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-400/25 via-ultra-400/20 to-flame-400/25" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-fg">{it.t}</p>
                  <p className="text-xs font-semibold text-brand-400">{it.p}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Trust({ icon, children }: { icon: "shield" | "check" | "refund"; children: React.ReactNode }) {
  const paths: Record<typeof icon, React.ReactNode> = {
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
    check: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    refund: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v5h5" />
      </>
    ),
  };
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-brand-400"
      >
        {paths[icon]}
      </svg>
      <span>{children}</span>
    </span>
  );
}

function SearchBar() {
  return (
    <form className="flex h-14 items-center gap-2 rounded-2xl border border-rule bg-panel px-3 shadow-gallery">
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="ml-2 text-fg-subtle"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        type="search"
        placeholder="Cari kartu, figure, blind box…"
        className="flex-1 bg-transparent px-2 text-base text-fg placeholder:text-fg-subtle focus:outline-none"
      />
      <button
        type="submit"
        className="h-10 rounded-lg bg-brand-400 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-500"
      >
        Cari
      </button>
    </form>
  );
}

/* ---------------- Category strip ---------------- */

function CategoryStrip() {
  const cats = [
    { name: "Trading Cards", count: "3.420 listing", href: "/kategori/cards" },
    { name: "Action Figure", count: "1.120 listing", href: "/kategori/figure" },
    { name: "Blind Box", count: "680 listing", href: "/kategori/blindbox" },
    { name: "Merchandise", count: "420 listing", href: "/kategori/merch" },
    { name: "Komik", count: "310 listing", href: "/kategori/komik" },
  ];
  return (
    <section className="mx-auto max-w-[1280px] px-6 pb-14 md:px-10">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {cats.map((c) => (
          <Link
            key={c.name}
            href={c.href}
            className="group flex items-center justify-between rounded-2xl border border-rule bg-panel/60 p-4 transition-colors hover:border-brand-400/50 hover:bg-panel"
          >
            <div>
              <p className="text-sm font-semibold text-fg">{c.name}</p>
              <p className="mt-0.5 text-xs text-fg-subtle">{c.count}</p>
            </div>
            <span className="text-fg-subtle transition-colors group-hover:text-brand-400">
              →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Trending listings ---------------- */

type Listing = {
  t: string;
  seller: string;
  city: string;
  price: string;
  rating: string;
  cond: "mint" | "near";
  boosted?: boolean;
};

const trending: Listing[] = [
  { t: "Charizard VMAX Rainbow Rare · PSA 10", seller: "adityacollects", city: "Jakarta", price: "Rp 4.250.000", rating: "4.9", cond: "mint" },
  { t: "One Piece OP01 Luffy Leader Parallel", seller: "opccollector", city: "Bandung", price: "Rp 850.000", rating: "4.8", cond: "near", boosted: true },
  { t: "Genshin Raiden Shogun Apex 1/7", seller: "figurehunt", city: "Surabaya", price: "Rp 1.250.000", rating: "4.9", cond: "mint" },
  { t: "Pop Mart Labubu Monsters Series 3", seller: "blindboxid", city: "Jakarta", price: "Rp 680.000", rating: "4.7", cond: "near" },
  { t: "Pikachu Illustrator Reprint Promo", seller: "pokemonid", city: "Jakarta", price: "Rp 2.800.000", rating: "5.0", cond: "mint", boosted: true },
  { t: "Nendoroid Nakano Miku Full Box", seller: "nendohunt", city: "Malang", price: "Rp 980.000", rating: "4.7", cond: "near" },
  { t: "HSR Acheron Lightcone Full Set", seller: "hsrfan", city: "Yogyakarta", price: "Rp 320.000", rating: "4.6", cond: "near" },
  { t: "Chainsaw Man Vol. 1 First Print JP", seller: "komikpop", city: "Bandung", price: "Rp 450.000", rating: "4.8", cond: "near" },
];

function Trending() {
  return (
    <section className="mx-auto max-w-[1280px] px-6 pb-16 pt-20 md:px-10">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-fg md:text-3xl">Lagi dicari minggu ini</h2>
          <p className="mt-1 text-sm text-fg-muted">
            Listing aktif dari kolektor terverifikasi. Bebas lihat-lihat — buat
            beli tinggal daftar.
          </p>
        </div>
        <Link
          href="/marketplace"
          className="hidden text-sm font-medium text-brand-400 hover:underline md:inline"
        >
          Lihat semua →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {trending.map((l) => (
          <ProductCard key={l.t} l={l} />
        ))}
      </div>

      <div className="mt-6 text-center md:hidden">
        <Link href="/marketplace" className="text-sm font-medium text-brand-400 hover:underline">
          Lihat semua →
        </Link>
      </div>
    </section>
  );
}

function ProductCard({ l }: { l: Listing }) {
  return (
    <Link
      href="/listing/abc"
      className="group block overflow-hidden rounded-2xl border border-rule bg-panel/70 transition-colors hover:border-brand-400/50"
    >
      <div className="relative aspect-square overflow-hidden bg-panel-2">
        <CardArt variant={pickArt(l.t)} />
        <span className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-white/20 to-transparent mix-blend-overlay" />
        <div className="absolute left-3 top-3 flex gap-2">
          <Badge tone={l.cond === "mint" ? "mint" : "near"} size="xs">
            {l.cond === "mint" ? "MINT" : "NEAR MINT"}
          </Badge>
          {l.boosted && <Badge tone="crim" size="xs">BOOSTED</Badge>}
        </div>
      </div>
      <div className="p-4">
        <p className="line-clamp-2 min-h-[2.5rem] text-sm font-medium text-fg">
          {l.t}
        </p>
        <p className="mt-1 text-xs text-fg-subtle">
          @{l.seller} · {l.city}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-base font-bold text-fg">{l.price}</p>
          <span className="text-xs text-fg-muted">★ {l.rating}</span>
        </div>
      </div>
    </Link>
  );
}

/* ---------------- Community preview ---------------- */

function CommunityPreview() {
  const posts = [
    { u: "adityacollects", lv: 14, body: "Finally! Charizard VMAX Rainbow Rare, PSA 10 sampe juga.", likes: 124 },
    { u: "figurehunt", lv: 22, body: "Raiden Shogun 1/7 scale Apex baru sampe. Packaging mint.", likes: 203 },
    { u: "blindboxid", lv: 11, body: "Pull rate weekend — 3 rare dari 1 case Labubu.", likes: 67 },
  ];
  return (
    <section className="border-t border-rule bg-panel/30">
      <div className="mx-auto max-w-[1280px] px-6 py-16 md:px-10">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:items-start">
          <div>
            <h2 className="text-2xl font-bold text-fg md:text-3xl">
              Komunitas yang beneran paham hobinya.
            </h2>
            <p className="mt-3 text-fg-muted">
              Bukan cuma jualan. Pamer pull rate, review grading, diskusi sub-seri
              — 1.420 kolektor aktif tiap minggu.
            </p>
            <div className="mt-6 space-y-4 text-sm">
              <Perk title="Aman via Hoobiq Pay" body="Dana ditahan 72 jam. Refund otomatis kalau barang nggak sesuai." />
              <Perk title="Display case" body="Badge dari trade & kontribusi. Reputasi kamu ikut ke mana aja." />
              <Perk title="Feeds terkurasi" body="Post terorganisir sampai level sub-seri, bukan timeline acak." />
            </div>
            <div className="mt-8 flex gap-3">
              <Link href="/feeds">
                <Button variant="primary" size="md">Buka feeds</Button>
              </Link>
              <Link href="/marketplace">
                <Button variant="outline" size="md">Lihat marketplace</Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <Card key={p.u} className="overflow-hidden">
                <div className="relative aspect-[4/3] overflow-hidden bg-panel-2">
                  <CardArt variant={pickArt(p.u)} />
                </div>
                <div className="p-4">
                  <p className="flex items-center gap-2 text-sm font-medium text-fg">
                    @{p.u}
                    <span className="rounded-full bg-flame-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-flame-400">
                      LV {p.lv}
                    </span>
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                    {p.body}
                  </p>
                  <p className="mt-3 text-xs text-fg-subtle">♥ {p.likes}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Perk({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
      <div>
        <p className="font-semibold text-fg">{title}</p>
        <p className="text-fg-muted">{body}</p>
      </div>
    </div>
  );
}

/* ---------------- Bottom CTA ---------------- */

function BottomCTA() {
  return (
    <section className="mx-auto max-w-[1280px] px-6 py-20 md:px-10">
      <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-rule bg-panel p-8 md:flex-row md:items-center md:p-12">
        <div className="max-w-xl">
          <h2 className="text-2xl font-bold text-fg md:text-3xl">
            Gabung gratis, mulai hari ini.
          </h2>
          <p className="mt-2 text-fg-muted">
            1.000 member pertama dapat Early Member badge + 100 EXP. Sudah 742
            yang klaim.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/daftar"
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-brand-400 px-6 text-base font-semibold text-white transition-colors hover:bg-brand-500"
          >
            Daftar gratis
          </Link>
          <Link
            href="/masuk"
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-rule bg-transparent px-6 text-base font-medium text-fg transition-colors hover:border-brand-400/60"
          >
            Masuk
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Footer ---------------- */

function Footer() { return <MarketingFooter />; }
