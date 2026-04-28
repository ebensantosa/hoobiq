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
 * Server component — pulls from the cached site-settings fetch.
 */
export async function BrandLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const settings = await getSiteSettings();
  if (!settings.logoUrl) return <Logo size={size} />;

  const h = sizes[size];
  return (
    <span className="inline-flex items-center">
      <img
        src={settings.logoUrl}
        alt={settings.brandName}
        height={h}
        style={{ height: h, width: "auto", marginTop: -h / 12, marginBottom: -h / 4 }}
        className="select-none object-contain transition-transform duration-300 ease-out hover:scale-[1.03]"
        draggable={false}
      />
    </span>
  );
}
