import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Nunito, JetBrains_Mono } from "next/font/google";
import { themeInitScript } from "@/components/theme-toggle";
import { NavProgress } from "@/components/nav-progress";
import { getSiteSettings } from "@/lib/site-settings";
import "./globals.css";

// Nunito — rounded, friendly, high-readability sans. Pairs nicely with the
// playful "hoobiq" wordmark while still feeling premium at heavier weights.
const sans = Nunito({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

// themeColor moved to its own `viewport` export — Next.js 15 split this out
// of `metadata` and now warns (but still works) when it's left in metadata.
export const viewport: Viewport = {
  themeColor: "#E7559F",
};

export const metadata: Metadata = {
  title: {
    default: "Hoobiq — Collect · Connect · Trade",
    template: "%s · Hoobiq",
  },
  description:
    "Marketplace & komunitas kolektor hobi Indonesia. Trading cards, action figure, blind box, merchandise, komik. Transaksi aman via Hoobiq Pay.",
  applicationName: "Hoobiq",
  openGraph: {
    title: "Hoobiq — Collect · Connect · Trade",
    description: "Marketplace & komunitas kolektor hobi Indonesia.",
    siteName: "Hoobiq",
    locale: "id_ID",
    type: "website",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();
  // Inject the admin-set primary color as a CSS variable so any element
  // can opt in via `var(--brand-color)`. The Tailwind brand-* palette is
  // still wired to its build-time scale; the variable is for one-off
  // overrides (custom buttons, accents in admin-edited pages).
  return (
    <html
      lang="id"
      className={`${sans.variable} ${mono.variable}`}
      // The pre-hydration theme script flips html.classList before React boots,
      // so the html element legitimately differs between SSR and client.
      // suppressHydrationWarning only silences the warning on <html> itself —
      // it does NOT cascade to children, so other mismatches still surface.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {settings.faviconUrl && <link rel="icon" href={settings.faviconUrl} />}
      </head>
      {/* Inject the admin-set primary color on body (not html) — the theme
          init script mutates html before hydration which can race with React
          reconciling style attributes. body is untouched until hydration. */}
      <body style={{ ["--brand-color" as string]: settings.primaryColor }}>
        {/* Suspense wrap so NavProgress's useSearchParams doesn't bail out
            the whole tree to client-side rendering. */}
        <Suspense fallback={null}>
          <NavProgress />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
