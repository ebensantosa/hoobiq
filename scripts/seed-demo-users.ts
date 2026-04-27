/**
 * Seeds 5 demo collector accounts so the feed/marketplace look populated.
 * Each user gets:
 *   - 1 marketplace listing in their niche category
 *   - 1 feed post
 *
 * Idempotent: re-running won't create duplicates (looks up by email/slug/body).
 *
 * Run:  npx tsx scripts/seed-demo-users.ts
 */
import { prisma } from "@hoobiq/db";
import bcrypt from "bcryptjs";
import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";

loadDotenv({ path: resolve(__dirname, "../apps/api/.env") });

const PEPPER = process.env.PASSWORD_PEPPER ?? "";
if (!PEPPER) {
  console.warn("⚠ PASSWORD_PEPPER tidak terbaca dari apps/api/.env — login user demo akan gagal sampai pepper diset.");
}

type DemoUser = {
  username: string;
  email: string;
  name: string;
  city: string;
  bio: string;
  trustScore: number;
  level: number;
  exp: number;
  avatarSeed: string;
  categorySlug: string;
  listing: {
    slug: string;
    title: string;
    priceIdr: number;
    condition: "MINT" | "NEAR_MINT" | "EXCELLENT";
    description: string;
    imageSeed: string;
  };
  post: {
    body: string;
    imageSeed?: string;
  };
};

// Picsum with stable seeds — always returns a valid 800x800 image.
const img = (seed: string, w = 800, h = 800) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

const DEMO_USERS: DemoUser[] = [
  {
    username: "selvianatcg",
    email:    "selvian@hoobiq.demo",
    name:     "Selvian Anata",
    city:     "Surabaya",
    bio:      "Pokémon TCG since gen 3. Fokus full art trainer & alt-art. Trade welcome — Surabaya area boleh meet-up.",
    trustScore: 4.8, level: 11, exp: 1820,
    avatarSeed: "selvian",
    categorySlug: "pokemon",
    listing: {
      slug: "iono-full-art-paldea-evolved",
      title: "Iono Full Art Trainer · Paldea Evolved",
      priceIdr: 1_450_000,
      condition: "MINT",
      description: "Pulled langsung dari booster box. Centering bagus, edge clean tanpa whitening. Sleeve + top loader sejak hari pertama. Bubble wrap + box keras pas kirim.",
      imageSeed: "iono-trainer",
    },
    post: {
      body: "Hari ini kelar atur binder Paldea Evolved — 6 trainer alt-art lengkap. Iono masih jadi favoritku ✨ Yang lagi koleksi trainer art, share binder kalian dong!",
      imageSeed: "binder-paldea",
    },
  },
  {
    username: "koh.collects",
    email:    "koh@hoobiq.demo",
    name:     "Koh Setiawan",
    city:     "Bandung",
    bio:      "Anime figure 1/7 & 1/8 scale. Genshin · HSR · Fate. Box-mint kondisi only.",
    trustScore: 4.9, level: 9, exp: 1240,
    avatarSeed: "koh",
    categorySlug: "genshin",
    listing: {
      slug: "hutao-1-7-mihoyo-official",
      title: "Hu Tao 1/7 Scale · miHoYo Official",
      priceIdr: 2_650_000,
      condition: "MINT",
      description: "Sealed dari miHoYo official. Box mint, plastik wrap utuh, COA included. Belum pernah dibuka. Lokasi Bandung, COD welcome atau kirim safe wrap.",
      imageSeed: "hutao-figure",
    },
    post: {
      body: "Akhirnya rak Genshin scale figure penuh! Dari Raiden, Hu Tao, sampai Yelan semua udah sampai. Next pre-order: Furina 1/7 Apex. Spec sheet udah keluar dan posingnya gilaa 🔥",
    },
  },
  {
    username: "labubu.mira",
    email:    "mira@hoobiq.demo",
    name:     "Mira Hartono",
    city:     "Tangerang",
    bio:      "Pop Mart · Labubu · Skullpanda. Chase hunter sejak 2022. Trade & meet-up Jakarta-Tangerang.",
    trustScore: 4.7, level: 7, exp: 720,
    avatarSeed: "mira",
    categorySlug: "labubu",
    listing: {
      slug: "labubu-tasty-macarons-chase",
      title: "Labubu Tasty Macarons · Chase Variant",
      priceIdr: 1_120_000,
      condition: "MINT",
      description: "Chase variant dari series Tasty Macarons. Box opened buat verifikasi figure, tapi figurenya mint, inner bag masih lengkap. Authenticity card included. Kirim packing extra bubble.",
      imageSeed: "labubu-macarons",
    },
    post: {
      body: "Pull rate update — 1 chase dari 6 box Tasty Macarons! 🎉 Macaron favoritku tetep yang strawberry. Kalian dapet variant apa yang paling sering?",
      imageSeed: "labubu-display",
    },
  },
  {
    username: "shounen.takao",
    email:    "takao@hoobiq.demo",
    name:     "Takao Wijaya",
    city:     "Yogyakarta",
    bio:      "Manga first print collector — JP & ID edition. Chainsaw Man, JJK, Frieren era.",
    trustScore: 4.6, level: 6, exp: 580,
    avatarSeed: "takao",
    categorySlug: "manga",
    listing: {
      slug: "jjk-vol-0-first-print-jp",
      title: "Jujutsu Kaisen Vol. 0 · First Print JP",
      priceIdr: 380_000,
      condition: "NEAR_MINT",
      description: "First print 2018 dari Shueisha. Spine masih clean, ada slight shelf-wear di pojok atas (foto detail by request). Plastik original masih ada. Cocok buat collector serius.",
      imageSeed: "jjk-manga",
    },
    post: {
      body: "Update rak manga: Frieren JP udah sampai vol 12. Art-nya sayang banget kalau cuma dibaca digital. Ada yang udah sampai vol 14? Spoiler-free thoughts boleh share di komen 📚",
    },
  },
  {
    username: "opcg.widi",
    email:    "widi@hoobiq.demo",
    name:     "Widi Pranoto",
    city:     "Semarang",
    bio:      "One Piece TCG kompetitif & alt-art collector. OP01–OP06 lengkap. Trade & meta talk welcome.",
    trustScore: 4.8, level: 8, exp: 980,
    avatarSeed: "widi",
    categorySlug: "op01",
    listing: {
      slug: "zoro-leader-alt-art-op01",
      title: "Zoro Leader Alt Art · OP01",
      priceIdr: 1_750_000,
      condition: "MINT",
      description: "Alt art Zoro leader dari OP01. Pulled sendiri, langsung sleeve premium + top loader. Centering top tier, edge tanpa whitening. Foto loose by request.",
      imageSeed: "zoro-card",
    },
    post: {
      body: "Tier list OP06 terbaru menurut top 8 regional Jakarta kemarin: Black Smoker masih top tier, tapi Green Doffy jadi sleeper hit. Ada yang sempat coba Yellow Enel? Pengen denger pengalamannya 🏴‍☠️",
      imageSeed: "opcg-deck",
    },
  },
];

async function main() {
  const passwordHash = await bcrypt.hash("Demo1234!" + PEPPER, 12);

  for (const u of DEMO_USERS) {
    const cat = await prisma.category.findUnique({ where: { slug: u.categorySlug } });
    if (!cat) {
      console.warn(`  skip ${u.username} — category "${u.categorySlug}" tidak ada (jalankan seed utama dulu).`);
      continue;
    }

    /* User */
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        username: u.username, name: u.name, city: u.city, bio: u.bio,
        trustScore: u.trustScore, level: u.level, exp: u.exp,
        avatarUrl: img(`avatar-${u.avatarSeed}`, 256, 256),
        passwordHash,
      },
      create: {
        username: u.username, email: u.email, passwordHash,
        name: u.name, city: u.city, bio: u.bio,
        trustScore: u.trustScore, level: u.level, exp: u.exp,
        role: "verified",
        emailVerified: new Date(), ktpVerified: true,
        avatarUrl: img(`avatar-${u.avatarSeed}`, 256, 256),
      },
    });

    /* Listing */
    const listingImage = img(`listing-${u.listing.imageSeed}`, 1000, 1000);
    await prisma.listing.upsert({
      where: { slug: u.listing.slug },
      update: {
        title: u.listing.title, description: u.listing.description,
        priceCents: BigInt(u.listing.priceIdr) * 100n,
        condition: u.listing.condition,
        imagesJson: JSON.stringify([listingImage]),
        categoryId: cat.id,
      },
      create: {
        slug: u.listing.slug,
        sellerId: user.id, categoryId: cat.id,
        title: u.listing.title, description: u.listing.description,
        priceCents: BigInt(u.listing.priceIdr) * 100n,
        condition: u.listing.condition,
        imagesJson: JSON.stringify([listingImage]),
        isPublished: true, moderation: "active",
        views: Math.floor(Math.random() * 400) + 60,
      },
    });

    /* Post */
    const postImages = u.post.imageSeed
      ? [img(`post-${u.post.imageSeed}`, 1200, 800)]
      : [];
    const existingPost = await prisma.post.findFirst({
      where: { authorId: user.id, body: u.post.body },
    });
    if (!existingPost) {
      await prisma.post.create({
        data: {
          authorId: user.id, body: u.post.body,
          imagesJson: JSON.stringify(postImages),
          moderation: "active",
        },
      });
    } else if (existingPost.imagesJson !== JSON.stringify(postImages)) {
      await prisma.post.update({
        where: { id: existingPost.id },
        data: { imagesJson: JSON.stringify(postImages) },
      });
    }

    console.log(`✓ ${u.username.padEnd(16)}  listing=${u.listing.slug}`);
  }

  console.log("\nLogin demo: password = Demo1234! · email mana saja di atas (ex: selvian@hoobiq.demo)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
