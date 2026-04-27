import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";

// Pull PASSWORD_PEPPER from apps/api/.env so seeded credentials match what
// the auth service applies during password verify.
loadDotenv({ path: resolve(__dirname, "../../../apps/api/.env") });

const PEPPER = process.env.PASSWORD_PEPPER ?? "";
if (!PEPPER) {
  console.warn("⚠ PASSWORD_PEPPER not set — seeded users won't be able to log in.");
}

const prisma = new PrismaClient();

async function main() {
  /* ---------- Categories ---------- */
  const cards    = await upsertCat("cards",    "Trading Cards",  1);
  const figure   = await upsertCat("figure",   "Action Figure",  1);
  const blindbox = await upsertCat("blindbox", "Blind Box",      1);
  const merch    = await upsertCat("merch",    "Merchandise",    1);
  const komik    = await upsertCat("komik",    "Komik",          1);

  const pokemon  = await upsertCat("pokemon",  "Pokémon",         2, cards.id);
  const onepiece = await upsertCat("onepiece", "One Piece",       2, cards.id);
  const genshin  = await upsertCat("genshin",  "Genshin Impact",  2, figure.id);
  const popmart  = await upsertCat("popmart",  "Pop Mart",        2, blindbox.id);
  const manga    = await upsertCat("manga",    "Manga",           2, komik.id);

  await upsertCat("crown-zenith",   "Crown Zenith",   3, pokemon.id);
  await upsertCat("paldea-evolved", "Paldea Evolved", 3, pokemon.id);
  await upsertCat("op01",           "OP01",           3, onepiece.id);
  await upsertCat("labubu",         "Labubu",         3, popmart.id);
  // Silence unused-warnings — we want these in the tree even if no listing yet.
  void merch;

  /* ---------- Users ---------- */
  const adminHash  = await bcrypt.hash("Admin123!"  + PEPPER, 12);
  const sellerHash = await bcrypt.hash("Demo1234!"  + PEPPER, 12);
  const buyerHash  = await bcrypt.hash("Buyer1234!" + PEPPER, 12);

  await prisma.user.upsert({
    where: { email: "admin@hoobiq.id" },
    update: { passwordHash: adminHash },
    create: {
      username: "admin", email: "admin@hoobiq.id",
      passwordHash: adminHash, name: "Admin Hoobiq",
      role: "admin", emailVerified: new Date(), ktpVerified: true,
    },
  });

  const aditya = await prisma.user.upsert({
    where: { email: "aditya@hoobiq.id" },
    update: { passwordHash: sellerHash },
    create: {
      username: "adityacollects", email: "aditya@hoobiq.id",
      passwordHash: sellerHash,
      name: "Aditya Kurniawan", city: "Jakarta",
      bio: "Pokémon TCG since 2016. Focus rainbow rares & PSA 10 slabs. DM untuk trade — meet-up Jaksel atau kirim packing premium.",
      phone: "+62 812-3456-7890",
      role: "verified", emailVerified: new Date(), ktpVerified: true,
      trustScore: 4.9, exp: 2480, level: 14,
    },
  });

  const buyer = await prisma.user.upsert({
    where: { email: "rangga@hoobiq.id" },
    update: { passwordHash: buyerHash },
    create: {
      username: "ranggabuys", email: "rangga@hoobiq.id",
      passwordHash: buyerHash,
      name: "Rangga Saputra", city: "Bandung",
      role: "user", emailVerified: new Date(),
      trustScore: 4.7, exp: 480, level: 5,
    },
  });

  /* ---------- Address & bank account for aditya ---------- */
  const adityaAddrExisting = await prisma.address.findFirst({ where: { userId: aditya.id, primary: true } });
  if (!adityaAddrExisting) {
    await prisma.address.create({
      data: {
        userId: aditya.id, label: "Rumah",
        name: aditya.name ?? "Aditya Kurniawan",
        phone: aditya.phone ?? "+62 812-3456-7890",
        line: "Jl. Kemang Raya No. 42B, Mampang Prapatan",
        city: "Jakarta Selatan", province: "DKI Jakarta", postal: "12730",
        primary: true,
      },
    });
  }

  const buyerAddrExisting = await prisma.address.findFirst({ where: { userId: buyer.id, primary: true } });
  if (!buyerAddrExisting) {
    await prisma.address.create({
      data: {
        userId: buyer.id, label: "Rumah",
        name: buyer.name ?? "Rangga Saputra",
        phone: "+62 813-2222-1111",
        line: "Jl. Asia Afrika No. 8",
        city: "Bandung", province: "Jawa Barat", postal: "40112",
        primary: true,
      },
    });
  }

  const bankExisting = await prisma.bankAccount.findFirst({ where: { userId: aditya.id, primary: true } });
  if (!bankExisting) {
    await prisma.bankAccount.create({
      data: {
        userId: aditya.id, bank: "BCA",
        numberEnc: "enc:0000000000006789",
        numberLast4: "6789", holderName: aditya.name ?? "Aditya Kurniawan",
        primary: true, verified: true,
      },
    });
  }

  /* ---------- Listings ---------- */
  const samples: Array<{ slug: string; title: string; price: number; cond: string; cat: string; desc: string }> = [
    { slug: "charizard-vmax-rainbow-rare-psa-10", title: "Charizard VMAX Rainbow Rare · PSA 10", price: 4_250_000, cond: "MINT",      cat: pokemon.id,  desc: "Kartu original dari booster box Crown Zenith. PSA slab tersegel, grading 10. Packaging double box + bubble." },
    { slug: "pikachu-illustrator-reprint-promo",  title: "Pikachu Illustrator Reprint Promo",     price: 2_800_000, cond: "MINT",      cat: pokemon.id,  desc: "Reprint resmi Pokémon Center. Sealed dari booster, langsung sleeve + top loader." },
    { slug: "mew-ex-full-art-151",                title: "Mew ex Full Art · 151",                  price:   520_000, cond: "NEAR_MINT", cat: pokemon.id,  desc: "Pulled minggu lalu, langsung di-sleeve. Centering bagus, edge clean." },
    { slug: "luffy-leader-parallel-op01",         title: "One Piece OP01 Luffy Leader Parallel",   price:   850_000, cond: "NEAR_MINT", cat: onepiece.id, desc: "Parallel art rare dari OP01. Ada minor scratch di sisi belakang, foto detail by request." },
    { slug: "raiden-shogun-apex-1-7",             title: "Genshin Raiden Shogun Apex 1/7",          price: 1_250_000, cond: "MINT",      cat: genshin.id,  desc: "Box mint, figure belum dikeluarkan. Inner box + plastik utuh. COA included." },
    { slug: "labubu-monsters-s3-chase",           title: "Pop Mart Labubu Monsters S3 · Chase",     price:   680_000, cond: "NEAR_MINT", cat: popmart.id,  desc: "Chase variant, blind box opened tapi figure mint. Bag inner masih ada." },
    { slug: "chainsaw-man-vol-1-first-print",     title: "Chainsaw Man Vol. 1 First Print JP",      price:   450_000, cond: "NEAR_MINT", cat: manga.id,    desc: "First print Jepang 2018. Spine clean, no creases. Susah ketemu. Kirim aman + plastik." },
    { slug: "lugia-v-alt-art-silver-tempest",     title: "Lugia V Alt Art · Silver Tempest",        price: 1_250_000, cond: "MINT",      cat: pokemon.id,  desc: "Pull from box sendiri, langsung sleeve. Centering OK, no whitening." },
    { slug: "hsr-acheron-lightcone-set",          title: "HSR Acheron Lightcone Full Set",          price:   320_000, cond: "NEAR_MINT", cat: figure.id,   desc: "Acrylic + lightcone replica. Full set, no missing pieces. Shipping safe." },
    { slug: "nendoroid-nakano-miku",              title: "Nendoroid Nakano Miku Full Box",          price:   980_000, cond: "NEAR_MINT", cat: figure.id,   desc: "Box opened sekali, inside mint. Semua face plate + accessory complete." },
  ];
  for (const s of samples) {
    await prisma.listing.upsert({
      where: { slug: s.slug },
      update: {},
      create: {
        slug: s.slug, sellerId: aditya.id, categoryId: s.cat,
        title: s.title, description: s.desc,
        priceCents: BigInt(s.price) * 100n,
        condition: s.cond, imagesJson: "[]",
        isPublished: true, moderation: "active",
        views: Math.floor(Math.random() * 600) + 50,
      },
    });
  }

  /* ---------- Posts ---------- */
  // Counters start at zero and grow from real interactions — no fake numbers
  // that would diverge from the underlying PostLike / PostComment tables.
  const posts = [
    { author: aditya.id, body: "Finally! Charizard VMAX Rainbow Rare-ku sampai dari grading. PSA 10 setelah nunggu 6 bulan. Worth it banget ✨" },
    { author: aditya.id, body: "Pull rate weekend kemarin — 3 chase dari 1 case Labubu Monsters Series 3. Hot streak banget. Yang lagi nyari, DM aja, ada beberapa yang available untuk trade." },
    { author: aditya.id, body: "Rak Pokémon update — Crown Zenith udah lengkap semua secret rares. Next target: Silver Tempest gold cards. Anyone tahu yang lagi clearance?" },
    { author: buyer.id,  body: "Beli Chainsaw Man first print dari @adityacollects. Packing premium, bubble wrap tebel + box keras. Spine masih mulus banget. 10/10 seller." },
  ];
  for (const p of posts) {
    const existing = await prisma.post.findFirst({ where: { authorId: p.author, body: p.body } });
    if (!existing) {
      await prisma.post.create({
        data: {
          authorId: p.author, body: p.body,
          imagesJson: "[]",
          likesCount: 0, commentsCount: 0, viewsCount: 0,
          moderation: "active",
        },
      });
    } else {
      // Heal old seeds that wrote inflated counters with no backing rows.
      const realLikes    = await prisma.postLike.count({ where: { postId: existing.id } });
      const realComments = await prisma.postComment.count({ where: { postId: existing.id } });
      if (existing.likesCount !== realLikes || existing.commentsCount !== realComments) {
        await prisma.post.update({
          where: { id: existing.id },
          data: { likesCount: realLikes, commentsCount: realComments, viewsCount: 0 },
        });
      }
    }
  }

  /* ---------- A completed order ---------- */
  const luffy = await prisma.listing.findUnique({ where: { slug: "luffy-leader-parallel-op01" } });
  const buyerAddr = await prisma.address.findFirst({ where: { userId: buyer.id, primary: true } });
  if (luffy && buyerAddr) {
    const humanId = "HBQ-2026-04800001";
    await prisma.order.upsert({
      where: { humanId },
      update: {},
      create: {
        humanId,
        buyerId: buyer.id, sellerId: aditya.id, listingId: luffy.id,
        addressId: buyerAddr.id,
        qty: 1,
        priceCents: luffy.priceCents,
        shippingCents: 18_000n * 100n,
        platformFeeCents: 17_000n * 100n,
        payFeeCents: 8_500n * 100n,
        insuranceCents: 0n,
        totalCents: luffy.priceCents + 18_000n * 100n + 17_000n * 100n + 8_500n * 100n,
        courierCode: "jne-reg",
        trackingNumber: "JNE0042876123",
        status: "completed",
        paidAt: new Date(Date.now() - 7 * 86_400_000),
        shippedAt: new Date(Date.now() - 5 * 86_400_000),
        deliveredAt: new Date(Date.now() - 2 * 86_400_000),
        completedAt: new Date(Date.now() - 1 * 86_400_000),
      },
    });
  }

  /* ---------- Notifications for aditya ---------- */
  const notifs = [
    { kind: "trans",  title: "Pembayaran masuk Hoobiq Pay",          body: "@ranggabuys bayar Luffy Leader Parallel · Rp 893.500" },
    { kind: "social", title: "Post kamu disukai 12 orang",            body: "Charizard VMAX — Finally sampai dari grading" },
    { kind: "system", title: "Trade ke-50 selesai · +100 EXP",        body: "Badge Trusted Seller diraih!" },
    { kind: "trans",  title: "@figurehunt kirim penawaran",            body: "Raiden Shogun 1/7 · Rp 1.100.000" },
  ];
  for (const n of notifs) {
    const exists = await prisma.notification.findFirst({ where: { userId: aditya.id, title: n.title } });
    if (!exists) {
      await prisma.notification.create({
        data: { userId: aditya.id, kind: n.kind, title: n.title, body: n.body },
      });
    }
  }

  /* ---------- Wishlist for buyer ---------- */
  const wishItems = await prisma.listing.findMany({
    where: { slug: { in: ["pikachu-illustrator-reprint-promo", "mew-ex-full-art-151"] } },
    select: { id: true },
  });
  for (const w of wishItems) {
    await prisma.wishlistItem.upsert({
      where: { userId_listingId: { userId: buyer.id, listingId: w.id } },
      update: {},
      create: { userId: buyer.id, listingId: w.id },
    });
  }

  /* ---------- Feature flags ---------- */
  await prisma.featureFlag.upsert({
    where: { key: "registration_open" },
    update: {},
    create: { key: "registration_open", enabled: true },
  });

  console.log("✅ seed done — accounts:");
  console.log("   admin@hoobiq.id    Admin123!");
  console.log("   aditya@hoobiq.id   Demo1234!  ← seller demo (10 listings, 3 posts, 4 notifs, 1 completed order)");
  console.log("   rangga@hoobiq.id   Buyer1234! ← buyer demo (wishlist, completed order)");
}

async function upsertCat(slug: string, name: string, level: number, parentId?: string) {
  return prisma.category.upsert({
    where: { slug },
    update: {},
    create: { slug, name, level, parentId: parentId ?? null },
  });
}

main().finally(() => prisma.$disconnect());
