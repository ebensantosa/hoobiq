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
  /* ---------- Categories ----------------------------------------------
   * 3-level taxonomy aligned with the Hoobiq spec:
   *   1. Collection Cards
   *   2. Trading Cards
   *   3. Merchandise
   *      ├── Official Goods (sub-sub: anime titles)
   *      └── Art & Fan Goods (plush, keychain, fanart)
   *   4. Toys
   *      ├── Action Figure
   *      ├── Blind Box
   *      └── Hot Wheels
   *   5. Others
   *      ├── Komik
   *      ├── Novel
   *      └── Cosplay
   * Old slugs (cards/figure/blindbox/merch/komik + their level-2 kids) are
   * intentionally NOT removed here so existing listings keep their
   * categoryId until scripts/migrate-categories.ts re-points them.
   * ----------------------------------------------------------------- */
  const collection = await upsertCat("collection-cards", "Collection Cards", 1, undefined, 1);
  const trading    = await upsertCat("trading-cards",    "Trading Cards",    1, undefined, 2);
  const merchRoot  = await upsertCat("merchandise",      "Merchandise",      1, undefined, 3);
  const toysRoot   = await upsertCat("toys",             "Toys",             1, undefined, 4);
  const others     = await upsertCat("others",           "Others",           1, undefined, 5);

  // Merchandise sub-categories
  const official     = await upsertCat("official-goods",   "Official Goods",   2, merchRoot.id, 1);
  const artFan       = await upsertCat("art-fan-goods",    "Art & Fan Goods",  2, merchRoot.id, 2);

  // Official Goods → series/anime titles (sub-sub).
  const animeTitles: Array<[string, string, number]> = [
    ["one-piece",       "One Piece",        1],
    ["naruto",          "Naruto",           2],
    ["demon-slayer",    "Demon Slayer",     3],
    ["jujutsu-kaisen",  "Jujutsu Kaisen",   4],
    ["attack-on-titan", "Attack on Titan",  5],
    ["chainsaw-man",    "Chainsaw Man",     6],
    ["dragon-ball",     "Dragon Ball",      7],
    ["my-hero-academia","My Hero Academia", 8],
    ["spy-x-family",    "Spy x Family",     9],
    ["frieren",         "Frieren",         10],
    ["genshin-impact",  "Genshin Impact",  11],
    ["honkai-star-rail","Honkai Star Rail",12],
  ];
  for (const [slug, name, order] of animeTitles) {
    await upsertCat(slug, name, 3, official.id, order);
  }

  // Art & Fan Goods sub-sub
  await upsertCat("plush",     "Plush Karakter", 3, artFan.id, 1);
  await upsertCat("keychain",  "Keychain",       3, artFan.id, 2);
  await upsertCat("fanart",    "Fanart",         3, artFan.id, 3);

  // Toys sub-categories
  const actionFigure = await upsertCat("action-figure", "Action Figure", 2, toysRoot.id, 1);
  const blindBoxCat  = await upsertCat("blind-box",     "Blind Box",     2, toysRoot.id, 2);
  await upsertCat("hot-wheels",    "Hot Wheels",    2, toysRoot.id, 3);

  // Others sub-categories
  const komikCat = await upsertCat("komik", "Komik", 2, others.id, 1);
  await upsertCat("novel",   "Novel",   2, others.id, 2);
  await upsertCat("cosplay", "Cosplay", 2, others.id, 3);

  /* Map legacy seed-listing category names onto the current taxonomy so
   * the sample listings still upsert without dangling categoryIds. Each
   * alias points to the closest valid Category row created above. */
  const pokemon  = trading;       // Pokémon TCG          → Trading Cards
  const onepiece = trading;       // One Piece TCG         → Trading Cards
  const genshin  = actionFigure;  // Genshin Impact figure → Action Figure
  const popmart  = blindBoxCat;   // Pop Mart blind box    → Blind Box
  const manga    = komikCat;      // Manga                 → Komik
  const figure   = actionFigure;  // Generic figures       → Action Figure

  // Silence unused-warnings — `collection` is referenced via children only.
  void collection;

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
  // Image files live in apps/api/public/uploads/ and are served absolute via
  // PUBLIC_API_BASE (e.g. https://api.hoobiq.com/uploads/x.jpg in prod, or
  // http://localhost:4000/uploads/x.jpg in dev). Same files in both envs.
  const apiBase = (process.env.PUBLIC_API_BASE ?? `http://localhost:${process.env.PORT ?? 4000}`).replace(/\/$/, "");
  const img = (file: string) => `${apiBase}/uploads/${file}`;
  const samples: Array<{ slug: string; title: string; price: number; cond: string; cat: string; desc: string; image: string }> = [
    { slug: "charizard-vmax-rainbow-rare-psa-10", title: "Charizard VMAX Rainbow Rare · PSA 10", price: 4_250_000, cond: "MINT",      cat: pokemon.id,  image: "charizard-vmax.jpg",   desc: "Kartu original dari booster box Crown Zenith. PSA slab tersegel, grading 10. Packaging double box + bubble." },
    { slug: "pikachu-illustrator-reprint-promo",  title: "Pikachu Illustrator Reprint Promo",     price: 2_800_000, cond: "MINT",      cat: pokemon.id,  image: "pikachu-promo.jpg",    desc: "Reprint resmi Pokémon Center. Sealed dari booster, langsung sleeve + top loader." },
    { slug: "mew-ex-full-art-151",                title: "Mew ex Full Art · 151",                  price:   520_000, cond: "NEAR_MINT", cat: pokemon.id,  image: "mew-ex.jpg",           desc: "Pulled minggu lalu, langsung di-sleeve. Centering bagus, edge clean." },
    { slug: "luffy-leader-parallel-op01",         title: "One Piece OP01 Luffy Leader Parallel",   price:   850_000, cond: "NEAR_MINT", cat: onepiece.id, image: "luffy-leader.jpg",     desc: "Parallel art rare dari OP01. Ada minor scratch di sisi belakang, foto detail by request." },
    { slug: "raiden-shogun-apex-1-7",             title: "Genshin Raiden Shogun Apex 1/7",          price: 1_250_000, cond: "MINT",      cat: genshin.id,  image: "hutao-figure.jpg",     desc: "Box mint, figure belum dikeluarkan. Inner box + plastik utuh. COA included." },
    { slug: "labubu-monsters-s3-chase",           title: "Pop Mart Labubu Monsters S3 · Chase",     price:   680_000, cond: "NEAR_MINT", cat: popmart.id,  image: "labubu-s3-chase.jpg",  desc: "Chase variant, blind box opened tapi figure mint. Bag inner masih ada." },
    { slug: "chainsaw-man-vol-1-first-print",     title: "Chainsaw Man Vol. 1 First Print JP",      price:   450_000, cond: "NEAR_MINT", cat: manga.id,    image: "chainsaw-vol1.jpg",    desc: "First print Jepang 2018. Spine clean, no creases. Susah ketemu. Kirim aman + plastik." },
    { slug: "lugia-v-alt-art-silver-tempest",     title: "Lugia V Alt Art · Silver Tempest",        price: 1_250_000, cond: "MINT",      cat: pokemon.id,  image: "lugia-altart.jpg",     desc: "Pull from box sendiri, langsung sleeve. Centering OK, no whitening." },
    { slug: "hsr-acheron-lightcone-set",          title: "HSR Acheron Lightcone Full Set",          price:   320_000, cond: "NEAR_MINT", cat: figure.id,   image: "hsr-acheron.jpg",      desc: "Acrylic + lightcone replica. Full set, no missing pieces. Shipping safe." },
    { slug: "nendoroid-nakano-miku",              title: "Nendoroid Nakano Miku Full Box",          price:   980_000, cond: "NEAR_MINT", cat: figure.id,   image: "miku-nendoroid.jpg",   desc: "Box opened sekali, inside mint. Semua face plate + accessory complete." },
  ];
  for (const s of samples) {
    const imagesJson = JSON.stringify([img(s.image)]);
    await prisma.listing.upsert({
      where: { slug: s.slug },
      // update too — re-seeding heals listings whose image URLs were stale
      // (e.g. if PUBLIC_API_BASE changed between envs).
      update: { imagesJson },
      create: {
        slug: s.slug, sellerId: aditya.id, categoryId: s.cat,
        title: s.title, description: s.desc,
        priceCents: BigInt(s.price) * 100n,
        condition: s.cond, imagesJson,
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

  /* ---------- Extra buyer personas for review seeding ----------------
   * Distinct usernames + cities so the listing-detail review section
   * doesn't look like a single-person fake. Each buyer gets a primary
   * address (required to create orders below).
   * ----------------------------------------------------------------- */
  const extraBuyers: Array<{
    email: string; username: string; name: string; city: string; province: string; postal: string;
    line: string; phone: string; trustScore: number; level: number;
  }> = [
    { email: "intan@hoobiq.id",  username: "intanloves",   name: "Intan Pratiwi",    city: "Yogyakarta",     province: "DI Yogyakarta", postal: "55281", line: "Jl. Kaliurang KM 5 No. 21", phone: "+62 813-7788-1010", trustScore: 4.8, level: 7 },
    { email: "dimas@hoobiq.id",  username: "dimaspulls",   name: "Dimas Aryanto",    city: "Surabaya",       province: "Jawa Timur",    postal: "60111", line: "Jl. Manyar Kertoarjo III No. 9", phone: "+62 812-9988-2020", trustScore: 4.6, level: 6 },
    { email: "ayu@hoobiq.id",    username: "ayucollects",  name: "Ayu Lestari",      city: "Denpasar",       province: "Bali",          postal: "80113", line: "Jl. Hayam Wuruk No. 88", phone: "+62 811-4455-3030", trustScore: 4.9, level: 9 },
    { email: "fariz@hoobiq.id",  username: "farizshelf",   name: "Fariz Maulana",    city: "Bandung",        province: "Jawa Barat",    postal: "40115", line: "Jl. Riau No. 12", phone: "+62 812-3344-4040", trustScore: 4.5, level: 4 },
  ];
  const extraBuyerHash = await bcrypt.hash("Buyer1234!" + PEPPER, 12);
  const extraBuyerRecords: Array<{ id: string; addressId: string }> = [];
  for (const b of extraBuyers) {
    const u = await prisma.user.upsert({
      where: { email: b.email },
      update: { passwordHash: extraBuyerHash },
      create: {
        username: b.username, email: b.email,
        passwordHash: extraBuyerHash,
        name: b.name, city: b.city, phone: b.phone,
        role: "user", emailVerified: new Date(),
        trustScore: b.trustScore, exp: 200 + b.level * 60, level: b.level,
      },
    });
    let addr = await prisma.address.findFirst({ where: { userId: u.id, primary: true } });
    if (!addr) {
      addr = await prisma.address.create({
        data: {
          userId: u.id, label: "Rumah", name: u.name ?? b.name,
          phone: u.phone ?? b.phone, line: b.line,
          city: b.city, province: b.province, postal: b.postal, primary: true,
        },
      });
    }
    extraBuyerRecords.push({ id: u.id, addressId: addr.id });
  }

  /* ---------- Completed orders + reviews per listing -----------------
   * Every seeded listing gets one completed order + one review so the
   * detail page never looks empty. Buyer rotates across the personas
   * above to make the review feed feel populated rather than
   * single-author. Idempotent via humanId — re-seeds skip existing.
   * ----------------------------------------------------------------- */
  const reviewPool: Array<{ rating: number; body: string }> = [
    { rating: 5, body: "Packing premium banget, bubble wrap tebal + box karton keras. Barang sampai mulus, sesuai foto. Recommended seller!" },
    { rating: 5, body: "Komunikasi enak, fast response. Item dikirim H+1 setelah pembayaran. Kondisi mint, top loader langsung dipasang." },
    { rating: 4, body: "Barang oke, sesuai deskripsi. Pengiriman agak lama tapi packing aman. Overall puas sih." },
    { rating: 5, body: "Dari ratusan seller di Hoobiq, ini salah satu yang paling rapi. Nego sopan, packing pro. Bakal repeat order." },
    { rating: 5, body: "Sumpah deg-degan beli kartu mahal online, tapi seller ini reliable. Slab utuh, no scratch. Mantap." },
    { rating: 4, body: "Kondisi sesuai janji. Sleeve + top loader langsung dipasang. Cuma minor defect kecil di edge tapi udah disclose dari awal jadi gpp." },
    { rating: 5, body: "Figure datang dengan box mint, segel inner masih ada. Worth setiap rupiah. Thanks min!" },
    { rating: 5, body: "Beli lebih murah dari marketplace sebelah, dapet packing lebih bagus. Hoobiq Pay juga bikin tenang." },
    { rating: 4, body: "Manga first print susah dicari, akhirnya ketemu di sini. Spine clean, page yellowing minor (wajar untuk first print). Senang banget." },
    { rating: 5, body: "Chase dapet beneran chase 😆 packing aman, bag inner masih utuh. Trusted seller!" },
  ];

  const allListings = await prisma.listing.findMany({
    where: { sellerId: aditya.id },
    select: { id: true, slug: true, priceCents: true },
    orderBy: { createdAt: "asc" },
  });

  const candidates: Array<{ id: string; addressId: string }> = [
    { id: buyer.id, addressId: (await prisma.address.findFirst({ where: { userId: buyer.id, primary: true } }))!.id },
    ...extraBuyerRecords,
  ];

  const startSeq = 4_800_001;
  for (let i = 0; i < allListings.length; i++) {
    const l = allListings[i]!;
    const buyerCtx = candidates[i % candidates.length]!;
    const review = reviewPool[i % reviewPool.length]!;
    const humanId = `HBQ-2026-${String(startSeq + i).padStart(8, "0")}`;
    // Stagger paid/delivered/completed dates so the review timeline
    // looks natural — newest reviews on top, oldest on bottom.
    const ageDays = (i + 1) * 3;
    const order = await prisma.order.upsert({
      where: { humanId },
      update: {},
      create: {
        humanId,
        buyerId: buyerCtx.id, sellerId: aditya.id, listingId: l.id,
        addressId: buyerCtx.addressId,
        qty: 1,
        priceCents: l.priceCents,
        shippingCents: 18_000n * 100n,
        platformFeeCents: 17_000n * 100n,
        payFeeCents: 8_500n * 100n,
        insuranceCents: 0n,
        totalCents: l.priceCents + 18_000n * 100n + 17_000n * 100n + 8_500n * 100n,
        courierCode: "jne-reg",
        trackingNumber: `JNE${String(40000000 + i * 1234).padStart(10, "0")}`,
        status: "completed",
        paidAt: new Date(Date.now() - (ageDays + 5) * 86_400_000),
        shippedAt: new Date(Date.now() - (ageDays + 3) * 86_400_000),
        deliveredAt: new Date(Date.now() - (ageDays + 1) * 86_400_000),
        completedAt: new Date(Date.now() - ageDays * 86_400_000),
      },
    });
    // Idempotent: ListingReview is keyed by orderId (unique).
    await prisma.listingReview.upsert({
      where: { orderId: order.id },
      update: {},
      create: {
        listingId: l.id,
        buyerId: buyerCtx.id,
        orderId: order.id,
        rating: review.rating,
        body: review.body,
        createdAt: new Date(Date.now() - ageDays * 86_400_000),
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
  console.log("   aditya@hoobiq.id   Demo1234!  ← seller demo (10 listings + 1 review per listing)");
  console.log("   rangga@hoobiq.id   Buyer1234! ← buyer demo");
  console.log("   intan@hoobiq.id    Buyer1234!");
  console.log("   dimas@hoobiq.id    Buyer1234!");
  console.log("   ayu@hoobiq.id      Buyer1234!");
  console.log("   fariz@hoobiq.id    Buyer1234!");
}

async function upsertCat(
  slug: string,
  name: string,
  level: number,
  parentId?: string,
  order?: number,
) {
  return prisma.category.upsert({
    where: { slug },
    // Re-running the seed should refresh the display order and parent
    // wiring so reorders/renames in the seed propagate to the running
    // dev DB without a manual reset. Slug stays the immutable key.
    update: {
      name,
      level,
      parentId: parentId ?? null,
      ...(typeof order === "number" ? { order } : {}),
    },
    create: {
      slug,
      name,
      level,
      parentId: parentId ?? null,
      ...(typeof order === "number" ? { order } : {}),
    },
  });
}

main().finally(() => prisma.$disconnect());
