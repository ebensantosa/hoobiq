import { serverApi } from "@/lib/server/api";
import { getSessionUser } from "@/lib/server/session";
import { SidebarItem } from "./sidebar-item";

type Node = {
  id: string;
  slug: string;
  name: string;
  level: number;
  listingCount: number;
  children: Node[];
};

const fmt = (n: number) => n.toLocaleString("id-ID");

/* ------------- Icons (inline SVG, lucide-style 16×16) ------------- */

const ic = {
  cards:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="14" height="16" rx="2"/><path d="M6 6V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2"/></svg>,
  figure:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 1 4 4v2H8V6a4 4 0 0 1 4-4z"/><path d="M5 22h14l-1.5-9h-11z"/><path d="M9 13v9M15 13v9"/></svg>,
  blindbox: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21 16-9 5-9-5V8l9-5 9 5z"/><path d="M3.3 8 12 13l8.7-5"/><path d="M12 13v8"/></svg>,
  merch:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.4 7.5 16 4l-2 2-2-2-2 2-2-2-4.4 3.5L5 12h2v8h10v-8h2z"/></svg>,
  komik:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4a2 2 0 0 1 2-2h6v18H4a2 2 0 0 1-2-2z"/><path d="M22 4a2 2 0 0 0-2-2h-6v18h6a2 2 0 0 0 2-2z"/></svg>,
  category: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  user:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>,
  package:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16.5 9.4 7.5 4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96 12 12.01l8.73-5.05"/><path d="M12 22.08V12"/></svg>,
  trade:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10l5-5 5 5M7 14l5 5 5-5"/></svg>,
  home:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9.5 9-7 9 7"/><path d="M5 8v13h14V8"/><path d="M9 21v-7h6v7"/></svg>,
  cart:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1.5"/><circle cx="18" cy="21" r="1.5"/><path d="M3 3h2l3.6 11.59a2 2 0 0 0 2 1.41h7.7a2 2 0 0 0 2-1.59L23 6H6"/></svg>,
  feeds:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1.5"/></svg>,
  shop:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
  grid:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  heart:    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  store:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 7 1.5-4h17L22 7"/><path d="M2 7v3a2 2 0 0 0 2 2 2 2 0 0 0 2-2 2 2 0 0 0 2 2 2 2 0 0 0 2-2 2 2 0 0 0 2 2 2 2 0 0 0 2-2 2 2 0 0 0 2 2 2 2 0 0 0 2-2 2 2 0 0 0 2 2V7"/><path d="M4 12v9h16v-9"/></svg>,
  wallet:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></svg>,
  settings: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>,
};

/** Map category slug → icon. Falls back to a generic grid icon. */
function iconFor(slug: string): React.ReactNode {
  if (slug === "cards" || slug.startsWith("pokemon")) return ic.cards;
  if (slug === "figure" || slug.includes("figure"))   return ic.figure;
  if (slug === "blindbox" || slug.includes("blind"))  return ic.blindbox;
  if (slug === "merch")                                return ic.merch;
  if (slug === "komik" || slug.includes("manga"))     return ic.komik;
  return ic.category;
}

export async function Sidebar() {
  const [tree, user] = await Promise.all([
    // Categories rarely change — cache for 60s so the sidebar doesn't refetch
    // on every navigation. The category list is the same for everyone.
    serverApi<Node[]>("/categories", { revalidate: 60 }),
    getSessionUser(),
  ]);
  const explore = (tree ?? []).filter((n) => n.level === 1);

  return (
    <aside className="sticky top-20 hidden h-[calc(100vh-5rem)] w-64 shrink-0 flex-col gap-6 overflow-y-auto border-r border-rule bg-canvas/50 px-4 pt-4 pb-8 lg:flex">
      <Section title="Navigasi">
        <ul className="flex flex-col gap-0.5">
          <li><SidebarItem href="/"            label="Home"        icon={ic.home}  accent="flame" /></li>
          <li><SidebarItem href="/feeds"       label="Feeds"       icon={ic.feeds} accent="brand" /></li>
          <li><SidebarItem href="/marketplace" label="Marketplace" icon={ic.shop}  accent="ultra" /></li>
          <li><SidebarItem href="/trades"      label="Meet Match"  icon={ic.trade} accent="brand" /></li>
        </ul>
      </Section>

      <Section title="Kategori">
        {explore.length === 0 ? (
          <p className="px-2 text-xs text-fg-subtle">Belum ada kategori.</p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {explore.map((c) => (
              <li key={c.id}>
                <SidebarItem
                  href={`/kategori/${c.slug}`}
                  label={c.name}
                  icon={iconFor(c.slug)}
                  rightSlot={
                    <span className="font-mono text-[11px] text-fg-subtle">
                      {fmt(c.listingCount)}
                    </span>
                  }
                />
              </li>
            ))}
          </ul>
        )}
        {/* Proper button rather than the cramped "SEMUA" header pill —
            sits below the list so the eye flows top-to-bottom and the
            visual weight matches a real CTA. */}
        <a
          href="/kategori"
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md border border-rule bg-panel px-3 py-2 text-xs font-semibold text-fg-muted transition-colors hover:border-brand-400/60 hover:bg-brand-400/5 hover:text-brand-500"
        >
          Lihat semua kategori
        </a>
        {user && (
          <a
            href="/pengaturan/kategori-baru"
            className="mt-1.5 inline-flex w-full items-center justify-center gap-1 rounded-md px-3 py-1.5 text-[11px] font-medium text-fg-subtle transition-colors hover:text-brand-500"
          >
            Belum ada? Request kategori baru
          </a>
        )}
      </Section>

      {user && (
        <Section title="Milikku">
          <ul className="flex flex-col gap-0.5">
            <li><SidebarItem href={`/u/${user.username}`} label="Profil"           icon={ic.user}     accent="ultra" /></li>
            <li><SidebarItem href="/pesanan"               label="Pesanan saya"     icon={ic.package}  accent="sky"   /></li>
            <li><SidebarItem href="/wishlist"              label="Wishlist"         icon={ic.heart}    accent="brand" /></li>
            <li><SidebarItem href="/keranjang"             label="Keranjang"        icon={ic.cart}     accent="brand" /></li>
            <li><SidebarItem href="/jual"                  label="Jual · dashboard" icon={ic.store}    accent="ultra" /></li>
            <li><SidebarItem href="/saldo"                 label="Hoobiq Pay"       icon={ic.wallet}   accent="flame" /></li>
            <li><SidebarItem href="/pengaturan"            label="Pengaturan"       icon={ic.settings} /></li>
          </ul>
        </Section>
      )}
    </aside>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2 px-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-subtle">{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}
