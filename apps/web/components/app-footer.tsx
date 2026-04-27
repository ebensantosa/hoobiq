import Link from "next/link";
import { Logo } from "@hoobiq/ui";

/**
 * Compact footer for in-app pages (logged-in shell). The marketing site uses
 * MarketingFooter — this one is intentionally smaller because in-app users
 * don't need the SEO blurb or full nav re-listing.
 */
export function AppFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t border-rule bg-panel/30">
      <div className="mx-auto max-w-[1280px] px-6 py-10 md:px-10">
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo size="sm" />
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-fg-muted">
              Marketplace & komunitas kolektor hobi Indonesia. Trading cards, action figure, blind box, merch, komik — aman dengan escrow Hoobiq Pay.
            </p>
          </div>

          <FooterCol title="Jelajah">
            <FooterLink href="/feeds">Feeds</FooterLink>
            <FooterLink href="/marketplace">Marketplace</FooterLink>
            <FooterLink href="/drops">Drops</FooterLink>
            <FooterLink href="/trades">Trades</FooterLink>
          </FooterCol>

          <FooterCol title="Akun">
            <FooterLink href="/jual">Jual</FooterLink>
            <FooterLink href="/saldo">Saldo</FooterLink>
            <FooterLink href="/pesanan">Pesanan</FooterLink>
            <FooterLink href="/wishlist">Wishlist</FooterLink>
            <FooterLink href="/pengaturan">Pengaturan</FooterLink>
          </FooterCol>

          <FooterCol title="Bantuan">
            <FooterLink href="/bantuan">Pusat bantuan</FooterLink>
            <FooterLink href="/bantuan#dispute">Dispute</FooterLink>
            <FooterLink href="/ketentuan">Ketentuan</FooterLink>
            <FooterLink href="/privasi">Privasi</FooterLink>
            <FooterLink href="/tentang">Tentang</FooterLink>
          </FooterCol>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-rule pt-6 md:flex-row">
          <p className="text-xs text-fg-subtle">© {year} Hoobiq · Marketplace kolektor hobi Indonesia</p>
          <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">
            Made for collectors, by collectors
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-wider text-fg-subtle">{title}</p>
      <ul className="mt-3 flex flex-col gap-2 text-sm">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-fg-muted transition-colors hover:text-fg">
        {children}
      </Link>
    </li>
  );
}
