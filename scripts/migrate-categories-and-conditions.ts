/**
 * One-shot prod migration: re-point existing listings to the new
 * 3-level taxonomy, and rewrite legacy condition strings to the new
 * canonical enum.
 *
 * Idempotent — safe to run multiple times. Old categories are preserved
 * (just orphaned) so we can roll back by re-pointing if anything looks
 * wrong; drop them in a follow-up once we're confident.
 *
 * Run from the VPS as the deploy user, after the seed has populated the
 * new categories:
 *   sudo -iu hoobiq
 *   cd /var/www/hoobiq/packages/db
 *   npx prisma db seed
 *   npx tsx ../../scripts/migrate-categories-and-conditions.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ---------------------------------------------------------------- mappings

/** Old slug → new slug. Picked for the closest semantic fit.
 *
 * Cards → Trading Cards. The legacy `cards` root collapsed into the new
 *   `trading-cards`; series-level slugs (pokemon, onepiece, etc) followed
 *   their parent rather than getting re-pointed to the new Merchandise →
 *   Official → <anime> tree (those are merch items, not cards).
 *
 * Figure → Action Figure. Old `figure` root + its kids (genshin lived
 *   under figure as a Genshin Impact action figure subset) all bucket
 *   into the new `action-figure` under Toys. Do NOT route them to
 *   `genshin-impact` under Merchandise → Official Goods — that's where
 *   posters/plush live, not figures.
 *
 * Blindbox / Pop Mart / Labubu → blind-box (Pop Mart and Labubu are
 *   blind-box brands; they re-merge into the single Toys → Blind Box).
 *
 * Komik / Manga → komik under Others.
 */
const CATEGORY_REMAP: Record<string, string> = {
  cards: "trading-cards",
  pokemon: "trading-cards",
  onepiece: "trading-cards",
  "crown-zenith": "trading-cards",
  "paldea-evolved": "trading-cards",
  op01: "trading-cards",
  figure: "action-figure",
  genshin: "action-figure",
  blindbox: "blind-box",
  popmart: "blind-box",
  labubu: "blind-box",
  merch: "merchandise",
  komik: "komik",
  manga: "komik",
};

/** Old condition → new canonical enum value. */
const CONDITION_REMAP: Record<string, string> = {
  MINT: "BRAND_NEW_SEALED",
  NEAR_MINT: "LIKE_NEW",
  // EXCELLENT/GOOD/FAIR/POOR carry over unchanged.
};

// ---------------------------------------------------------------- run

async function main() {
  // 1. Conditions ------------------------------------------------------
  let condUpdated = 0;
  for (const [oldVal, newVal] of Object.entries(CONDITION_REMAP)) {
    const r = await prisma.listing.updateMany({
      where: { condition: oldVal },
      data: { condition: newVal },
    });
    condUpdated += r.count;
    console.log(`  condition ${oldVal} → ${newVal}: ${r.count}`);
  }
  console.log(`✓ Conditions remapped: ${condUpdated}`);

  // 2. Categories ------------------------------------------------------
  // Build a slug→id map so we can update by id (the listings table holds
  // categoryId, not categorySlug).
  const cats = await prisma.category.findMany({ select: { id: true, slug: true } });
  const idBySlug = new Map(cats.map((c) => [c.slug, c.id]));

  let catUpdated = 0;
  for (const [oldSlug, newSlug] of Object.entries(CATEGORY_REMAP)) {
    const oldId = idBySlug.get(oldSlug);
    const newId = idBySlug.get(newSlug);
    if (!oldId) {
      console.log(`  skip: old slug "${oldSlug}" not found (already cleaned up?)`);
      continue;
    }
    if (!newId) {
      console.warn(`  ⚠ new slug "${newSlug}" missing — run seed first.`);
      continue;
    }
    const r = await prisma.listing.updateMany({
      where: { categoryId: oldId },
      data: { categoryId: newId },
    });
    catUpdated += r.count;
    console.log(`  ${oldSlug} → ${newSlug}: ${r.count} listings`);
  }
  console.log(`✓ Listings re-pointed: ${catUpdated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
