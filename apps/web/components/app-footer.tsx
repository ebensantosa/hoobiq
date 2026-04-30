import Link from "next/link";
import { getSiteSettings } from "@/lib/site-settings";

/**
 * Compact footer for in-app pages (logged-in shell). The marketing site uses
 * MarketingFooter — this one is intentionally smaller because in-app users
 * don't need the SEO blurb or full nav re-listing.
 */
export async function AppFooter() {
  const settings = await getSiteSettings();
  return (
    <footer className="mt-8 border-t border-rule bg-panel/30 md:mt-12">
      <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 md:py-10 lg:px-10">
        {/* Mobile reads as a 2-col grid for the link columns with the
            brand description spanning both rows above (col-span-2).
            Desktop drops back to the 4-col layout. */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="col-span-2 md:col-span-1">
            <p className="text-sm font-bold text-fg">{settings.brandName}</p>
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-fg-muted">
              Marketplace & komunitas kolektor hobi Indonesia. Trading cards, action figure, blind box, merch, komik — pembayaran aman lewat {settings.brandName} Pay.
            </p>
          </div>

          <FooterCol title="Jelajah">
            <FooterLink href="/feeds">Feeds</FooterLink>
            <FooterLink href="/marketplace">Marketplace</FooterLink>
            <FooterLink href="/trades">Meet Match</FooterLink>
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
          <p className="text-xs text-fg-subtle">{settings.footerText}</p>
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
