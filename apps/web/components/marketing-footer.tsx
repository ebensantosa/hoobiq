import Link from "next/link";

/**
 * Marketing footer — multi-column with descriptive text, category links,
 * platform links, and social. The descriptive paragraph + meaningful anchor
 * text are intentional for SEO crawlability.
 */
export function MarketingFooter() {
  return (
    <footer className="border-t border-rule bg-panel/40">
      <div className="mx-auto max-w-[1280px] px-6 py-14 md:px-10 md:py-16">
        {/* Top: brand blurb + columns */}
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Brand & description */}
          <div className="max-w-sm">
            <p className="text-sm leading-relaxed text-fg-muted">
              Hoobiq adalah marketplace dan komunitas kolektor hobi Indonesia.
              Beli &amp; jual <strong className="text-fg">trading cards</strong>,{" "}
              <strong className="text-fg">action figure</strong>,{" "}
              <strong className="text-fg">blind box</strong>, merchandise, dan
              komik dengan pembayaran aman lewat Hoobiq Pay.
            </p>
            <SocialRow />
          </div>

          <Column title="Marketplace" links={[
            { href: "/marketplace",         label: "Semua listing" },
            { href: "/kategori/cards",      label: "Trading Cards" },
            { href: "/kategori/figure",     label: "Action Figure" },
            { href: "/kategori/blindbox",   label: "Blind Box" },
            { href: "/kategori/komik",      label: "Komik & Manga" },
            { href: "/upload",              label: "Mulai jualan" },
          ]} />

          <Column title="Komunitas" links={[
            { href: "/feeds",                  label: "Feed komunitas" },
            { href: "/u/adityacollects",       label: "Top kolektor" },
            { href: "/bantuan#reputasi",       label: "Sistem reputasi" },
            { href: "/bantuan#beli",           label: "Cara membeli" },
            { href: "/bantuan#jual",           label: "Cara menjual" },
            { href: "/bantuan#dispute",        label: "Cara dispute" },
          ]} />

          <Column title="Perusahaan" links={[
            { href: "/tentang",      label: "Tentang Hoobiq" },
            { href: "/ketentuan",    label: "Ketentuan Layanan" },
            { href: "/privasi",      label: "Kebijakan Privasi" },
            { href: "/bantuan",      label: "Pusat Bantuan" },
            { href: "mailto:halo@hoobiq.id", label: "halo@hoobiq.id" },
            { href: "mailto:trust@hoobiq.id", label: "Lapor penipuan" },
          ]} />
        </div>

        {/* Trust strip */}
        <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-rule bg-canvas px-5 py-4 text-xs text-fg-muted">
          <TrustItem icon="shield">Pembayaran aman lewat Hoobiq Pay</TrustItem>
          <TrustItem icon="check">Verified seller</TrustItem>
          <TrustItem icon="refresh">Refund dijamin</TrustItem>
          <TrustItem icon="lock">UU PDP No. 27/2022</TrustItem>
        </div>

        {/* Bottom row */}
        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-rule pt-6 md:flex-row md:items-center">
          <p className="text-xs text-fg-subtle">
            © 2026 PT Hoobiq Kolektor Indonesia · Jakarta Selatan, Indonesia
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-fg-muted">
            <Link href="/ketentuan" className="hover:text-fg">Ketentuan</Link>
            <Link href="/privasi"   className="hover:text-fg">Privasi</Link>
            <Link href="/bantuan"   className="hover:text-fg">Bantuan</Link>
            <a href="https://status.hoobiq.id" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-fg">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
              Sistem normal
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function Column({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-widest text-fg-subtle">{title}</h3>
      <ul className="mt-4 flex flex-col gap-3 text-sm">
        {links.map((l) => (
          <li key={l.href + l.label}>
            <Link href={l.href} className="text-fg-muted transition-colors hover:text-brand-500">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SocialRow() {
  const socials = [
    { href: "https://instagram.com/hoobiq.id", label: "Instagram", path: "M7 2C4.24 2 2 4.24 2 7v10c0 2.76 2.24 5 5 5h10c2.76 0 5-2.24 5-5V7c0-2.76-2.24-5-5-5H7zm0 2h10c1.66 0 3 1.34 3 3v10c0 1.66-1.34 3-3 3H7c-1.66 0-3-1.34-3-3V7c0-1.66 1.34-3 3-3zm10 1.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2zM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6z" },
    { href: "https://twitter.com/hoobiqid",    label: "Twitter / X",  path: "M18.244 3H21l-6.52 7.45L22 21h-6.84l-4.81-6.28L4.8 21H2l7.04-8.04L2 3h6.97l4.34 5.74L18.244 3zm-2.39 16.5h1.86L8.27 4.4H6.27l9.586 15.1z" },
    { href: "https://discord.gg/hoobiq",       label: "Discord",      path: "M20.32 4.78A18.5 18.5 0 0 0 15.91 3.4l-.2.4a16.6 16.6 0 0 0-4.66-.27c-.13-.23-.31-.55-.46-.82A18.5 18.5 0 0 0 6.18 4.1c-2.94 4.4-3.74 8.7-3.34 12.94a18.7 18.7 0 0 0 5.7 2.88c.46-.62.87-1.28 1.22-1.97-.67-.25-1.31-.56-1.92-.93.16-.12.32-.24.47-.37 3.7 1.7 7.7 1.7 11.36 0 .15.13.31.25.47.37-.61.37-1.25.68-1.92.93.35.7.76 1.36 1.22 1.97a18.7 18.7 0 0 0 5.7-2.88c.5-4.95-.81-9.21-3.84-12.16zM9.5 14.62c-1.13 0-2.05-1.04-2.05-2.32 0-1.27.9-2.32 2.05-2.32s2.07 1.05 2.05 2.32c0 1.28-.9 2.32-2.05 2.32zm5.55 0c-1.13 0-2.05-1.04-2.05-2.32 0-1.27.9-2.32 2.05-2.32s2.07 1.05 2.05 2.32c0 1.28-.9 2.32-2.05 2.32z" },
    { href: "https://tiktok.com/@hoobiq",      label: "TikTok",       path: "M19.6 7.4a6.5 6.5 0 0 1-3.8-1.2v8.5a5.6 5.6 0 1 1-5.6-5.6v3a2.6 2.6 0 1 0 2.6 2.6V2h3a4.6 4.6 0 0 0 3.8 4.4v1z" },
  ];
  return (
    <ul className="mt-6 flex items-center gap-2">
      {socials.map((s) => (
        <li key={s.label}>
          <a
            href={s.href}
            target="_blank"
            rel="noreferrer"
            aria-label={s.label}
            title={s.label}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rule bg-canvas text-fg-muted transition-all hover:-translate-y-0.5 hover:border-brand-400/50 hover:text-brand-500"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d={s.path}/></svg>
          </a>
        </li>
      ))}
    </ul>
  );
}

function TrustItem({ icon, children }: { icon: "shield" | "check" | "refresh" | "lock"; children: React.ReactNode }) {
  const paths = {
    shield:  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
    check:   <><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></>,
    refresh: <><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></>,
    lock:    <><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></>,
  };
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-500">
        {paths[icon]}
      </svg>
      {children}
    </span>
  );
}
