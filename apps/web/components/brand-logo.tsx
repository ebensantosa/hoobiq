import { Logo } from "@hoobiq/ui";
import { getSiteSettings } from "@/lib/site-settings";

const frame = { sm: 44, md: 44, lg: 72 } as const;

/**
 * Brand logo that respects admin-uploaded overrides.
 *
 * If SiteSettings.logoUrl is set, render that image inside the same
 * fixed-height frame the bundled Logo uses, so it lines up vertically
 * with the rest of the header regardless of the asset's intrinsic
 * aspect ratio.
 *
 * `size="responsive"` renders one consistent size — keeps the header
 * looking the same on mobile and desktop, logged in or out.
 *
 * Server component — pulls from the cached site-settings fetch.
 */
export async function BrandLogo({ size = "md" }: { size?: "sm" | "md" | "lg" | "responsive" }) {
  const settings = await getSiteSettings();
  const resolved = size === "responsive" ? "sm" : size;
  return <BrandLogoInner size={resolved} url={settings.logoUrl ?? null} brand={settings.brandName} />;
}

function BrandLogoInner({
  size, url, brand,
}: {
  size: "sm" | "md" | "lg";
  url: string | null;
  brand: string;
}) {
  if (!url) return <Logo size={size} />;
  const h = frame[size];
  return (
    <span className="inline-flex items-center" style={{ height: h }}>
      <img
        src={url}
        alt={brand}
        height={h}
        style={{ height: h, width: "auto" }}
        className="max-w-none select-none object-contain transition-transform duration-300 ease-out hover:scale-[1.03]"
        draggable={false}
      />
    </span>
  );
}
