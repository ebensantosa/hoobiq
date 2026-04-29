import { Logo } from "@hoobiq/ui";
import { getSiteSettings } from "@/lib/site-settings";

const sizes = { sm: 64, md: 112, lg: 144 } as const;

/**
 * Brand logo that respects admin-uploaded overrides.
 *
 * If SiteSettings.logoUrl is set, render that image (with the same vertical
 * trimming the default Logo uses). Otherwise fall back to the bundled Logo
 * component (which loads /logo.PNG).
 *
 * Pass `size="responsive"` to render small on mobile + medium from sm:
 * breakpoint up — what every nav surface should use so the logo doesn't
 * blow out the 64-px-tall mobile header.
 *
 * Server component — pulls from the cached site-settings fetch.
 */
export async function BrandLogo({ size = "md" }: { size?: "sm" | "md" | "lg" | "responsive" }) {
  const settings = await getSiteSettings();
  if (size === "responsive") {
    return (
      <>
        <span className="inline-flex sm:hidden"><BrandLogoInner size="sm" url={settings.logoUrl} brand={settings.brandName} /></span>
        <span className="hidden sm:inline-flex"><BrandLogoInner size="md" url={settings.logoUrl} brand={settings.brandName} /></span>
      </>
    );
  }
  return <BrandLogoInner size={size} url={settings.logoUrl ?? null} brand={settings.brandName} />;
}

function BrandLogoInner({
  size, url, brand,
}: {
  size: "sm" | "md" | "lg";
  url: string | null;
  brand: string;
}) {
  if (!url) return <Logo size={size} />;
  const h = sizes[size];
  return (
    <span className="inline-flex items-center">
      <img
        src={url}
        alt={brand}
        height={h}
        style={{ height: h, width: "auto", marginTop: -h / 12, marginBottom: -h / 4 }}
        className="select-none object-contain transition-transform duration-300 ease-out hover:scale-[1.03]"
        draggable={false}
      />
    </span>
  );
}
