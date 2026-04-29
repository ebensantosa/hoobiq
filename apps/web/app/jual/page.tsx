import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Badge, Card, Stat } from "@hoobiq/ui";
import { ListingOwnerMenu } from "@/components/listing-owner-menu";
import { serverApi } from "@/lib/server/api";
import { getSessionUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";

type OrderRow = {
  id: string;
  humanId: string;
  status: string;
  totalIdr: number;
  courier: string;
  createdAt: string;
  listing: { title: string; cover: string | null };
};

type MyListing = {
  id: string;
  slug: string;
  title: string;
  priceIdr: number;
  condition: string;
  cover: string | null;
  stock: number;
  isPublished: boolean;
  moderation: string;
  views: number;
  createdAt: string;
};

export default async function SellerDashboardPage() {
  const me = await getSessionUser();
  if (!me) redirect("/masuk?next=/jual");

  const [orders, listings] = await Promise.all([
    serverApi<{ items: OrderRow[] }>("/orders?role=seller"),
    serverApi<{ items: MyListing[] }>("/listings/mine"),
  ]);
  const orderItems = orders?.items ?? [];
  const myListings = listings?.items ?? [];

  const escrow         = orderItems.filter((o) => o.status === "paid" || o.status === "shipped");
  const completed      = orderItems.filter((o) => o.status === "completed");
  const escrowTotal    = escrow.reduce((sum, o) => sum + o.totalIdr, 0);
  const completedTotal = completed.reduce((sum, o) => sum + o.totalIdr, 0);
  const toShip         = orderItems.filter((o) => o.status === "paid" || o.status === "awaiting_pickup");
  const liveListings   = myListings.filter((l) => l.isPublished && l.moderation === "active");

  return (
    <AppShell active="Marketplace">
      <div className="px-4 pb-8 sm:px-6 lg:px-10">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-6">
          <div>
            <h1 className="text-3xl font-bold text-fg">Jual · Dashboard</h1>
            <p className="mt-2 text-sm text-fg-muted">
              Kelola listing kamu, cek pesanan masuk, tarik saldo. Butuh bantuan?{" "}
              <Link href="/bantuan#jual" className="text-brand-400">Panduan seller</Link>.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/saldo" className="inline-flex h-9 items-center rounded-lg border border-rule bg-panel px-3 text-sm text-fg hover:border-brand-400/60">
              Kelola saldo
            </Link>
            <Link href="/upload" className="inline-flex h-9 items-center rounded-lg bg-brand-400 px-4 text-sm font-semibold text-white hover:bg-brand-500">
              + Listing baru
            </Link>
          </div>
        </header>

        {/* Stats */}
        <section className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card><div className="p-5"><Stat value={String(liveListings.length)} label="Listing aktif" accent="gold" /></div></Card>
          <Card><div className="p-5"><Stat value={`Rp ${completedTotal.toLocaleString("id-ID")}`} label="Pendapatan selesai" /></div></Card>
          <Card><div className="p-5"><Stat value={`Rp ${escrowTotal.toLocaleString("id-ID")}`} label="Dalam escrow" /></div></Card>
          <Card><div className="p-5"><Stat value={String(toShip.length)} label="Perlu dikirim" /></div></Card>
        </section>

        {/* My listings */}
        <section className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-fg">Listing-mu</h2>
              <p className="mt-1 text-xs text-fg-muted">
                {myListings.length === 0
                  ? "Belum ada listing. Pasang yang pertama untuk mulai jualan."
                  : `${liveListings.length} aktif · ${myListings.length} total`}
              </p>
            </div>
            {myListings.length > 0 && (
              <Link
                href={`/u/${encodeURIComponent(me.username)}`}
                className="text-xs font-semibold text-brand-500"
              >
                Lihat dari sudut pembeli
              </Link>
            )}
          </div>

          {myListings.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-rule bg-panel/40 p-10 text-center text-sm text-fg-muted">
              <p className="font-medium text-fg">Belum ada listing.</p>
              <p className="mt-1">Foto bagus + deskripsi jujur = listing terjual lebih cepat.</p>
              <Link
                href="/upload"
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-400 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500"
              >
                + Pasang listing pertama
              </Link>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {myListings.map((l) => (
                <SellerListingCard key={l.id} l={l} />
              ))}
            </div>
          )}
        </section>

        {/* Orders to ship */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold text-fg">Pesanan masuk</h2>
          {toShip.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-rule bg-panel/40 p-10 text-center text-sm text-fg-muted">
              Belum ada pesanan yang perlu dikirim.
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {toShip.map((o) => (
                <Link
                  key={o.id}
                  href={`/pesanan/${o.humanId}`}
                  className="flex items-center gap-4 rounded-2xl border border-rule bg-panel p-4 transition-colors hover:border-brand-400/50"
                >
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-panel-2">
                    {o.listing.cover && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={o.listing.cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-fg">{o.listing.title}</p>
                    <p className="mt-1 truncate text-xs text-fg-muted">
                      {o.humanId} · {o.courier.toUpperCase()} · Rp {o.totalIdr.toLocaleString("id-ID")}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-brand-500"></span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function SellerListingCard({ l }: { l: MyListing }) {
  const status =
    l.moderation === "pending"  ? { text: "Review",   tone: "ghost" as const } :
    l.moderation === "rejected" ? { text: "Ditolak",  tone: "crim"  as const } :
    !l.isPublished              ? { text: "Draft",    tone: "ghost" as const } :
    l.stock <= 0                ? { text: "Habis",    tone: "crim"  as const } :
                                  { text: "Aktif",    tone: "mint"  as const };

  return (
    <div className="group relative">
      <ListingOwnerMenu listingId={l.id} slug={l.slug} />
      <Link
        href={`/listing/${l.slug}`}
        className="block overflow-hidden rounded-2xl border border-rule bg-panel transition-all hover:-translate-y-0.5 hover:border-brand-400/50 hover:shadow-md"
      >
        <div className="relative aspect-square overflow-hidden bg-panel-2">
          {l.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={l.cover}
              alt={l.title}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-brand-400/15 via-transparent to-flame-400/10" />
          )}
          <span className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/30 to-transparent" />
          <div className="absolute left-3 top-3">
            <Badge tone={status.tone} size="xs">{status.text}</Badge>
          </div>
        </div>
        <div className="p-3">
          <p className="line-clamp-2 min-h-[2.4rem] text-sm font-semibold text-fg">{l.title}</p>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-sm font-extrabold text-fg">Rp {l.priceIdr.toLocaleString("id-ID")}</p>
            <span className="font-mono text-[10px] text-fg-subtle">{l.views} dilihat</span>
          </div>
        </div>
      </Link>
    </div>
  );
}
