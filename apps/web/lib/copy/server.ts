import "server-only";
import { getSiteSettings } from "../site-settings";
import { resolveCopy, type CopyKey } from "./keys";

/**
 * Server-component copy helper.
 *   const t = await copyFor();
 *   <h1>{t("home.hero.title")}</h1>
 */
export async function copyFor(): Promise<(key: CopyKey) => string> {
  const s = await getSiteSettings();
  return resolveCopy(s.copy);
}
