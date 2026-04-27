/**
 * Downloads real photos from public CDNs into the API's local storage,
 * then updates seeded listings/posts/avatars to reference those stored
 * URLs. Replaces the picsum.photos hotlinks the demo seed wrote so the
 * app shows actual images served from our own backend.
 *
 * Run after `seed-demo-users.ts`:
 *   npx tsx scripts/seed-product-images.ts
 *
 * Idempotent: if the file already exists on disk we reuse it.
 */
import { prisma } from "@hoobiq/db";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { config as loadDotenv } from "dotenv";
import { resolve as pathResolve } from "node:path";

loadDotenv({ path: pathResolve(__dirname, "../apps/api/.env") });

const API_PORT = process.env.PORT ?? "4000";
const PUBLIC_BASE = (process.env.PUBLIC_API_BASE ?? `http://localhost:${API_PORT}`).replace(/\/$/, "");
const UPLOADS_DIR = join(process.cwd(), "apps", "api", "public", "uploads");

/**
 * Curated photo set — sourced from LoremFlickr which returns real Creative-
 * Commons-licensed Flickr photos matching tag queries. The `lock` param
 * makes the result deterministic so re-running the seed gives the same
 * picture each time.
 *
 * Picsum (falsely promising "real photos") returns landscape stock that
 * doesn't match product context — too generic for a demo of a collectibles
 * app. LoremFlickr lets us search by tag so a "Pokemon TCG" listing
 * actually shows a card photo.
 */
const PHOTOS: Record<string, { tags: string; lock: number; w: number; h: number; ext: string }> = {
  // ---------- Listings (1000×1000 square) ----------
  "iono-trainer":     { tags: "pokemon,card",          lock: 11, w: 1000, h: 1000, ext: "jpg" },
  "hutao-figure":     { tags: "anime,figure",          lock: 12, w: 1000, h: 1000, ext: "jpg" },
  "labubu-macarons":  { tags: "vinyl,toy",             lock: 13, w: 1000, h: 1000, ext: "jpg" },
  "jjk-manga":        { tags: "manga,book",            lock: 14, w: 1000, h: 1000, ext: "jpg" },
  "zoro-card":        { tags: "trading,card",          lock: 15, w: 1000, h: 1000, ext: "jpg" },

  // Original aditya seed — populates marketplace with relevant covers
  "charizard-vmax":   { tags: "pokemon,card",          lock: 21, w: 1000, h: 1000, ext: "jpg" },
  "pikachu-promo":    { tags: "pokemon",               lock: 22, w: 1000, h: 1000, ext: "jpg" },
  "mew-ex":           { tags: "pokemon,card",          lock: 23, w: 1000, h: 1000, ext: "jpg" },
  "luffy-leader":     { tags: "anime,collectible",     lock: 24, w: 1000, h: 1000, ext: "jpg" },
  "raiden-apex":      { tags: "anime,figurine",        lock: 25, w: 1000, h: 1000, ext: "jpg" },
  "labubu-s3-chase":  { tags: "vinyl,toy",             lock: 26, w: 1000, h: 1000, ext: "jpg" },
  "chainsaw-vol1":    { tags: "manga,book",            lock: 27, w: 1000, h: 1000, ext: "jpg" },
  "lugia-altart":     { tags: "pokemon,card",          lock: 28, w: 1000, h: 1000, ext: "jpg" },
  "hsr-acheron":      { tags: "anime,collectible",     lock: 29, w: 1000, h: 1000, ext: "jpg" },
  "miku-nendoroid":   { tags: "anime,figurine",        lock: 30, w: 1000, h: 1000, ext: "jpg" },

  // ---------- Avatars (256×256) ----------
  "avatar-selvian": { tags: "portrait,woman",       lock: 41, w: 256, h: 256, ext: "jpg" },
  "avatar-koh":     { tags: "portrait,man",         lock: 42, w: 256, h: 256, ext: "jpg" },
  "avatar-mira":    { tags: "portrait,smile",       lock: 43, w: 256, h: 256, ext: "jpg" },
  "avatar-takao":   { tags: "portrait,glasses",     lock: 44, w: 256, h: 256, ext: "jpg" },
  "avatar-widi":    { tags: "portrait,asian",       lock: 45, w: 256, h: 256, ext: "jpg" },

  // ---------- Feed post backdrops (1200×800) ----------
  "post-binder-paldea":  { tags: "trading,card,collection", lock: 51, w: 1200, h: 800, ext: "jpg" },
  "post-labubu-display": { tags: "toy,shelf,display",       lock: 52, w: 1200, h: 800, ext: "jpg" },
  "post-opcg-deck":      { tags: "cards,table,game",        lock: 53, w: 1200, h: 800, ext: "jpg" },
};

/**
 * Force re-download every photo even if it's already on disk. Set when
 * the seed catalog source changes (e.g. swapping picsum for LoremFlickr)
 * so old cached files don't keep showing up.
 */
const FORCE = process.argv.includes("--force");

const MIN_BYTES = 4 * 1024; // photos under 4KB are usually error pages

async function fetchToBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength < MIN_BYTES) return null;
    return buf;
  } catch { return null; }
}

async function downloadOnce(
  slug: string,
  spec: { tags: string; lock: number; w: number; h: number; ext: string }
): Promise<string> {
  const filename = `${slug}.${spec.ext}`;
  const filepath = join(UPLOADS_DIR, filename);
  if (!FORCE) {
    try {
      const stat = await fs.stat(filepath);
      if (stat.size >= MIN_BYTES) return filename; // healthy file already cached
    } catch { /* fall through */ }
  }

  // 1) LoremFlickr — tag-matched real Flickr photos. Deterministic via lock.
  const flickrUrl = `https://loremflickr.com/${spec.w}/${spec.h}/${encodeURIComponent(spec.tags)}?lock=${spec.lock}`;
  let buf = await fetchToBuffer(flickrUrl);

  // 2) Fallback: Picsum keyed by the same tags. Won't be topic-matched but
  //    at least we get a real photograph instead of a broken image.
  if (!buf) {
    const fallback = `https://picsum.photos/seed/${encodeURIComponent(`${spec.tags}-${spec.lock}`)}/${spec.w}/${spec.h}`;
    buf = await fetchToBuffer(fallback);
  }

  if (!buf) throw new Error(`both sources failed for ${slug} (${spec.tags})`);

  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  await fs.writeFile(filepath, buf);
  return filename;
}

async function main() {
  console.log(`→ Downloading ${Object.keys(PHOTOS).length} photos to ${UPLOADS_DIR}${FORCE ? " (force)" : ""}`);
  const filenameByKey: Record<string, string> = {};
  for (const [key, spec] of Object.entries(PHOTOS)) {
    try {
      filenameByKey[key] = await downloadOnce(key, spec);
      process.stdout.write(".");
    } catch (e) {
      console.warn(`\n  ⚠ ${key}: ${(e as Error).message}`);
    }
  }
  console.log("\n");

  const urlOf = (key: string) => filenameByKey[key] ? `${PUBLIC_BASE}/uploads/${filenameByKey[key]}` : null;

  /* ---------- 1. Map listings (by slug) → photo ---------- */
  const listingPhotoMap: Record<string, string | null> = {
    // Demo users (seed-demo-users.ts)
    "iono-full-art-paldea-evolved":     urlOf("iono-trainer"),
    "hutao-1-7-mihoyo-official":        urlOf("hutao-figure"),
    "labubu-tasty-macarons-chase":      urlOf("labubu-macarons"),
    "jjk-vol-0-first-print-jp":         urlOf("jjk-manga"),
    "zoro-leader-alt-art-op01":         urlOf("zoro-card"),
    // Original seed listings (aditya)
    "charizard-vmax-rainbow-rare-psa-10":   urlOf("charizard-vmax"),
    "pikachu-illustrator-reprint-promo":    urlOf("pikachu-promo"),
    "mew-ex-full-art-151":                  urlOf("mew-ex"),
    "luffy-leader-parallel-op01":           urlOf("luffy-leader"),
    "raiden-shogun-apex-1-7":               urlOf("raiden-apex"),
    "labubu-monsters-s3-chase":             urlOf("labubu-s3-chase"),
    "chainsaw-man-vol-1-first-print":       urlOf("chainsaw-vol1"),
    "lugia-v-alt-art-silver-tempest":       urlOf("lugia-altart"),
    "hsr-acheron-lightcone-set":            urlOf("hsr-acheron"),
    "nendoroid-nakano-miku":                urlOf("miku-nendoroid"),
  };

  let listingsTouched = 0;
  for (const [slug, url] of Object.entries(listingPhotoMap)) {
    if (!url) continue;
    const updated = await prisma.listing.updateMany({
      where: { slug },
      data: { imagesJson: JSON.stringify([url]) },
    });
    listingsTouched += updated.count;
  }
  console.log(`✓ ${listingsTouched} listings updated`);

  /* ---------- 2. Map demo users → avatar ---------- */
  const avatarMap: Record<string, string | null> = {
    "selvian@hoobiq.demo": urlOf("avatar-selvian"),
    "koh@hoobiq.demo":     urlOf("avatar-koh"),
    "mira@hoobiq.demo":    urlOf("avatar-mira"),
    "takao@hoobiq.demo":   urlOf("avatar-takao"),
    "widi@hoobiq.demo":    urlOf("avatar-widi"),
  };
  let avatarsTouched = 0;
  for (const [email, url] of Object.entries(avatarMap)) {
    if (!url) continue;
    const u = await prisma.user.updateMany({
      where: { email },
      data: { avatarUrl: url },
    });
    avatarsTouched += u.count;
  }
  console.log(`✓ ${avatarsTouched} avatars updated`);

  /* ---------- 3. Map demo posts (by author email + body match) ---------- */
  const postPhotoMap: Array<{ email: string; bodyContains: string; urlKey: string }> = [
    { email: "selvian@hoobiq.demo", bodyContains: "Paldea Evolved", urlKey: "post-binder-paldea" },
    { email: "mira@hoobiq.demo",    bodyContains: "Tasty Macarons", urlKey: "post-labubu-display" },
    { email: "widi@hoobiq.demo",    bodyContains: "OP06",           urlKey: "post-opcg-deck" },
  ];
  let postsTouched = 0;
  for (const p of postPhotoMap) {
    const url = urlOf(p.urlKey);
    if (!url) continue;
    const user = await prisma.user.findUnique({ where: { email: p.email } });
    if (!user) continue;
    const post = await prisma.post.findFirst({
      where: { authorId: user.id, body: { contains: p.bodyContains } },
    });
    if (!post) continue;
    await prisma.post.update({
      where: { id: post.id },
      data: { imagesJson: JSON.stringify([url]) },
    });
    postsTouched++;
  }
  console.log(`✓ ${postsTouched} feed posts updated`);

  console.log("\nDone. Images served from:", `${PUBLIC_BASE}/uploads/<filename>`);
  console.log("Make sure the API dev server is running so the URLs resolve.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
