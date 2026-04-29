import { BadRequestException, Body, Controller, Get, HttpCode, NotFoundException, Param, Patch, Post, Query } from "@nestjs/common";
import { z } from "zod";
import { UpdateProfileInput, type SessionUser } from "@hoobiq/types";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { EmailService } from "../email/email.service";

const ImageUrl = z.string().refine(
  (s) => /^https?:\/\//i.test(s) || /^data:image\//i.test(s),
  { message: "Harus URL http(s) atau data:image" },
);

const KtpSubmitInput = z.object({
  frontUrl: ImageUrl,
  selfieUrl: ImageUrl,
});

@Controller("users")
export class UsersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  /**
   * Authenticated read of the current user's *private* profile fields
   * (phone, etc) for the settings page. Public profile lives at
   * `GET /users/:username`. Declared before the dynamic `:username` route
   * so Nest's router matches "me" exactly instead of treating it as a
   * username lookup.
   */
  @Get("me")
  async getMe(@CurrentUser() current: SessionUser) {
    const u = await this.prisma.user.findUnique({
      where: { id: current.id },
      select: {
        id: true, username: true, name: true, avatarUrl: true,
        bio: true, city: true, phone: true,
      },
    });
    if (!u) throw new NotFoundException({ code: "not_found", message: "Pengguna tidak ditemukan." });
    return { user: u };
  }

  /**
   * KTP verification status. Used by /pengaturan/rekening to gate the
   * payout-account form: rekening can only be added once status is
   * "verified" (or the legacy ktpVerified boolean is true for users
   * grandfathered before the workflow existed).
   */
  @Get("me/ktp")
  async getKtp(@CurrentUser() current: SessionUser) {
    const u = await this.prisma.user.findUnique({
      where: { id: current.id },
      select: {
        ktpStatus: true, ktpVerified: true, ktpRejectNote: true,
        ktpSubmittedAt: true, ktpVerifiedAt: true,
      },
    });
    if (!u) throw new NotFoundException({ code: "not_found", message: "Pengguna tidak ditemukan." });
    const status = u.ktpStatus as "none" | "pending" | "verified" | "rejected";
    return {
      status,
      // Treat the legacy `ktpVerified` boolean as authoritative for users
      // that existed before the granular flow — we don't want to lock
      // them out of payout just because their `ktpStatus` defaults to
      // "none".
      verified: status === "verified" || u.ktpVerified,
      rejectNote: u.ktpRejectNote,
      submittedAt: u.ktpSubmittedAt?.toISOString() ?? null,
      verifiedAt:  u.ktpVerifiedAt?.toISOString() ?? null,
    };
  }

  /**
   * Admin: list KTP submissions for review. Filter by status; default
   * "pending" so the queue surfaces new submissions first.
   */
  @Get("kyc")
  async listKyc(
    @CurrentUser() admin: SessionUser,
    @Query("status") statusQ?: string,
  ) {
    if (admin.role !== "admin" && admin.role !== "superadmin" && admin.role !== "ops") {
      throw new BadRequestException({ code: "forbidden", message: "Khusus admin." });
    }
    const status = statusQ === "verified" || statusQ === "rejected" ? statusQ : "pending";
    const rows = await this.prisma.user.findMany({
      where: { ktpStatus: status },
      orderBy: { ktpSubmittedAt: "desc" },
      take: 100,
      select: {
        id: true, username: true, name: true, email: true, avatarUrl: true, city: true,
        ktpStatus: true, ktpSubmittedAt: true, ktpVerifiedAt: true, ktpRejectNote: true,
        ktpFrontUrl: true, ktpSelfieUrl: true,
      },
    });
    return {
      items: rows.map((u) => ({
        id: u.id,
        username: u.username,
        name: u.name,
        email: u.email,
        avatarUrl: u.avatarUrl,
        city: u.city,
        status: u.ktpStatus,
        submittedAt: u.ktpSubmittedAt?.toISOString() ?? null,
        verifiedAt:  u.ktpVerifiedAt?.toISOString() ?? null,
        rejectNote: u.ktpRejectNote,
        frontUrl: u.ktpFrontUrl,
        selfieUrl: u.ktpSelfieUrl,
      })),
    };
  }

  @Post("kyc/:userId/approve")
  @HttpCode(200)
  async approveKyc(
    @CurrentUser() admin: SessionUser,
    @Param("userId") userId: string,
  ) {
    if (admin.role !== "admin" && admin.role !== "superadmin") {
      throw new BadRequestException({ code: "forbidden", message: "Khusus admin/superadmin." });
    }
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { ktpStatus: true, email: true, name: true, username: true },
    });
    if (!u) throw new NotFoundException({ code: "not_found", message: "User tidak ditemukan." });
    if (u.ktpStatus === "verified") {
      throw new BadRequestException({ code: "already_verified", message: "Sudah terverifikasi." });
    }
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          ktpStatus: "verified",
          ktpVerified: true,
          ktpVerifiedAt: now,
          ktpRejectNote: null,
        },
      }),
      this.prisma.auditEntry.create({
        data: {
          actorId: admin.id,
          action: "kyc.approve",
          targetRef: `user:${userId}`,
          metaJson: JSON.stringify({}),
        },
      }),
    ]);
    if (u.email) {
      const name = u.name ?? u.username;
      await this.email.send(
        u.email,
        "[Hoobiq] KTP terverifikasi",
        `<div style="font-family:'Nunito',Arial,sans-serif;color:#0F172A;max-width:560px;margin:0 auto;padding:24px">
          <h1 style="font-size:22px;margin:0 0 12px">KTP kamu sudah terverifikasi ✅</h1>
          <p style="font-size:14px;line-height:1.6">Halo ${escapeHtml(name)}, KTP kamu lolos review. Sekarang kamu bisa nambah rekening &amp; tarik saldo.</p>
        </div>`,
      );
    }
    return { ok: true };
  }

  @Post("kyc/:userId/reject")
  @HttpCode(200)
  async rejectKyc(
    @CurrentUser() admin: SessionUser,
    @Param("userId") userId: string,
    @Body(new ZodPipe(z.object({ note: z.string().trim().min(2).max(500) }))) body: { note: string },
  ) {
    if (admin.role !== "admin" && admin.role !== "superadmin") {
      throw new BadRequestException({ code: "forbidden", message: "Khusus admin/superadmin." });
    }
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { ktpStatus: true, email: true, name: true, username: true },
    });
    if (!u) throw new NotFoundException({ code: "not_found", message: "User tidak ditemukan." });
    if (u.ktpStatus !== "pending") {
      throw new BadRequestException({ code: "not_pending", message: "Status bukan pending." });
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          ktpStatus: "rejected",
          ktpRejectNote: body.note.trim(),
          ktpFrontUrl: null,
          ktpSelfieUrl: null,
        },
      }),
      this.prisma.auditEntry.create({
        data: {
          actorId: admin.id,
          action: "kyc.reject",
          targetRef: `user:${userId}`,
          metaJson: JSON.stringify({ note: body.note }),
        },
      }),
    ]);
    if (u.email) {
      const name = u.name ?? u.username;
      await this.email.send(
        u.email,
        "[Hoobiq] KTP perlu diperbaiki",
        `<div style="font-family:'Nunito',Arial,sans-serif;color:#0F172A;max-width:560px;margin:0 auto;padding:24px">
          <h1 style="font-size:22px;margin:0 0 12px">KTP belum lolos review</h1>
          <p style="font-size:14px;line-height:1.6">Halo ${escapeHtml(name)},</p>
          <p style="font-size:14px;line-height:1.6">Catatan reviewer: <strong>${escapeHtml(body.note)}</strong></p>
          <p style="font-size:14px;line-height:1.6">Silakan submit ulang di Pengaturan → Verifikasi KTP.</p>
        </div>`,
      );
    }
    return { ok: true };
  }

  /**
   * Buyer submits KTP photos for review. Status flips pending → verified
   * (or rejected) by an ops admin. Re-submitting after a rejection is
   * allowed; submitting while already pending is blocked so admins
   * aren't reviewing duplicates.
   */
  @Post("me/ktp")
  @HttpCode(202)
  async submitKtp(
    @CurrentUser() current: SessionUser,
    @Body(new ZodPipe(KtpSubmitInput)) body: z.infer<typeof KtpSubmitInput>,
  ) {
    const u = await this.prisma.user.findUnique({
      where: { id: current.id },
      select: { ktpStatus: true, ktpVerified: true },
    });
    if (!u) throw new NotFoundException({ code: "not_found", message: "Pengguna tidak ditemukan." });

    if (u.ktpStatus === "pending") {
      throw new BadRequestException({
        code: "already_pending",
        message: "KTP kamu sedang direview. Tunggu hasilnya dulu.",
      });
    }
    if (u.ktpStatus === "verified" || u.ktpVerified) {
      throw new BadRequestException({
        code: "already_verified",
        message: "Akun kamu sudah terverifikasi.",
      });
    }

    await this.prisma.user.update({
      where: { id: current.id },
      data: {
        ktpStatus: "pending",
        ktpFrontUrl: body.frontUrl,
        ktpSelfieUrl: body.selfieUrl,
        ktpSubmittedAt: new Date(),
        ktpRejectNote: null,
      },
    });
    return { ok: true, status: "pending" };
  }

  @Public()
  @Get(":username")
  async getByUsername(@Param("username") username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true, username: true, name: true, avatarUrl: true, bio: true,
        city: true, role: true, level: true, exp: true, trustScore: true,
        createdAt: true,
      },
    });
    if (!user || user.username !== username) throw new NotFoundException({ code: "not_found", message: "Pengguna tidak ditemukan." });

    // Passport stats — collection value, trades, post count, top categories,
    // and seller rating from real ListingReview rows on listings this user
    // sold (not the user's trustScore proxy used previously).
    const [valueAgg, listingsCount, postsCount, tradesCount, byCategory, reviewAgg, recentReviews] = await Promise.all([
      this.prisma.listing.aggregate({
        where: { sellerId: user.id, deletedAt: null, isPublished: true, moderation: "active", stock: { gt: 0 } },
        _sum: { priceCents: true },
      }),
      this.prisma.listing.count({
        where: { sellerId: user.id, deletedAt: null, isPublished: true, moderation: "active", stock: { gt: 0 } },
      }),
      this.prisma.post.count({ where: { authorId: user.id } }).catch(() => 0),
      this.prisma.tradeProposal.count({
        where: { OR: [{ fromUserId: user.id }, { toUserId: user.id }], status: "accepted" },
      }).catch(() => 0),
      this.prisma.listing.groupBy({
        by: ["categoryId"],
        where: { sellerId: user.id, deletedAt: null, isPublished: true, moderation: "active" },
        _count: { _all: true },
      }),
      // Real seller rating: avg of every ListingReview on a listing this
      // user sold. `_count.rating` gives total review count for the
      // "ratings on N reviews" display.
      this.prisma.listingReview.aggregate({
        where: { listing: { sellerId: user.id } },
        _avg: { rating: true },
        _count: { rating: true },
      }).catch(() => ({ _avg: { rating: null }, _count: { rating: 0 } } as { _avg: { rating: number | null }; _count: { rating: number } })),
      // 5 most recent reviews to display under the badge strip.
      this.prisma.listingReview.findMany({
        where: { listing: { sellerId: user.id } },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          buyer:   { select: { username: true, name: true, avatarUrl: true } },
          listing: { select: { slug: true, title: true } },
        },
      }).catch(() => [] as Array<{ id: string; rating: number; body: string | null; createdAt: Date; buyer: { username: string; name: string | null; avatarUrl: string | null }; listing: { slug: string; title: string } }>),
    ]);

    // Resolve category slugs for the top 3 categories
    const topCatIds = byCategory
      .sort((a, b) => b._count._all - a._count._all)
      .slice(0, 3)
      .map((c) => c.categoryId);
    const cats = topCatIds.length
      ? await this.prisma.category.findMany({
          where: { id: { in: topCatIds } },
          select: { id: true, slug: true, name: true },
        })
      : [];
    const catBySlug = new Map(cats.map((c) => [c.id, c]));

    const reviewAvg = reviewAgg._avg.rating;
    const reviewCount = reviewAgg._count.rating;
    const passport = {
      collectionValueIdr: valueAgg._sum.priceCents
        ? Number(valueAgg._sum.priceCents / 100n)
        : 0,
      collectionCount: listingsCount,
      postsCount,
      tradesCompleted: tradesCount,
      // Real average of buyer reviews when ≥1 review exists; falls back
      // to trustScore so freshly-onboarded sellers still display
      // something rather than a stark 0.0.
      tradeRating: reviewCount > 0 ? Number(reviewAvg ?? 0) : Number(user.trustScore),
      reviewCount,
      reviews: recentReviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        body: r.body,
        createdAt: r.createdAt.toISOString(),
        buyer: { username: r.buyer.username, name: r.buyer.name, avatarUrl: r.buyer.avatarUrl },
        listing: { slug: r.listing.slug, title: r.listing.title },
      })),
      badges: deriveBadges({
        listingsCount,
        postsCount,
        tradesCount,
        ageDays: Math.floor((Date.now() - user.createdAt.getTime()) / 86_400_000),
        byCategory: byCategory.map((c) => ({
          slug: catBySlug.get(c.categoryId)?.slug ?? "",
          count: c._count._all,
        })),
      }),
    };

    return {
      user: { ...user, trustScore: Number(user.trustScore), createdAt: user.createdAt.toISOString() },
      passport,
    };
  }

  /** Collection grid — published listings, optionally filtered by root category. */
  @Public()
  @Get(":username/collection")
  async collection(
    @Param("username") username: string,
    @Query("category") category?: string
  ) {
    const u = await this.prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (!u) throw new NotFoundException({ code: "not_found", message: "Pengguna tidak ditemukan." });

    let categoryIds: string[] | undefined;
    if (category) {
      const root = await this.prisma.category.findUnique({ where: { slug: category }, select: { id: true } });
      if (!root) return { items: [] };
      const all = await this.prisma.category.findMany({ select: { id: true, parentId: true } });
      const childrenOf = new Map<string, string[]>();
      for (const c of all) {
        if (c.parentId) {
          const arr = childrenOf.get(c.parentId) ?? [];
          arr.push(c.id);
          childrenOf.set(c.parentId, arr);
        }
      }
      const out: string[] = [];
      const queue = [root.id];
      while (queue.length) {
        const id = queue.shift()!;
        out.push(id);
        const kids = childrenOf.get(id);
        if (kids) queue.push(...kids);
      }
      categoryIds = out;
    }

    const rows = await this.prisma.listing.findMany({
      where: {
        sellerId: u.id,
        deletedAt: null,
        isPublished: true,
        moderation: "active",
        ...(categoryIds && { categoryId: { in: categoryIds } }),
      },
      orderBy: [{ boostedUntil: "desc" }, { createdAt: "desc" }],
      take: 60,
      include: { category: { select: { slug: true, name: true } } },
    });

    return {
      items: rows.map((l) => {
        let cover: string | null = null;
        try {
          const v = JSON.parse(l.imagesJson);
          if (Array.isArray(v) && typeof v[0] === "string") cover = v[0];
        } catch { /* ignore */ }
        return {
          id: l.id,
          slug: l.slug,
          title: l.title,
          priceIdr: Number(l.priceCents / 100n),
          cover,
          condition: l.condition,
          category: l.category ? { slug: l.category.slug, name: l.category.name } : null,
        };
      }),
    };
  }

  /** Recent posts authored by this user. */
  @Public()
  @Get(":username/activity")
  async activity(@Param("username") username: string) {
    const u = await this.prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (!u) throw new NotFoundException({ code: "not_found", message: "Pengguna tidak ditemukan." });

    const posts = await this.prisma.post.findMany({
      where: { authorId: u.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true, body: true, imagesJson: true,
        likesCount: true, commentsCount: true, viewsCount: true, createdAt: true,
      },
    }).catch(() => [] as Array<{ id: string; body: string; imagesJson: string; likesCount: number; commentsCount: number; viewsCount: number; createdAt: Date }>);

    return {
      items: posts.map((p) => {
        let cover: string | null = null;
        try {
          const v = JSON.parse(p.imagesJson);
          if (Array.isArray(v) && typeof v[0] === "string") cover = v[0];
        } catch { /* ignore */ }
        return {
          id: p.id,
          body: p.body,
          cover,
          likes: p.likesCount,
          comments: p.commentsCount,
          views: p.viewsCount,
          createdAt: p.createdAt.toISOString(),
        };
      }),
    };
  }

  /** Public trade history — only accepted trades, anonymized counterparty. */
  @Public()
  @Get(":username/trades")
  async tradeHistory(@Param("username") username: string) {
    const u = await this.prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (!u) throw new NotFoundException({ code: "not_found", message: "Pengguna tidak ditemukan." });

    const rows = await this.prisma.tradeProposal.findMany({
      where: { OR: [{ fromUserId: u.id }, { toUserId: u.id }], status: "accepted" },
      orderBy: { respondedAt: "desc" },
      take: 30,
    }).catch(() => []);

    // Hydrate listing titles + counterparty username in batches
    const listingIds = Array.from(new Set(rows.flatMap((r) => [r.fromListingId, r.toListingId])));
    const otherIds = Array.from(new Set(rows.map((r) => (r.fromUserId === u.id ? r.toUserId : r.fromUserId))));
    const [listings, others] = await Promise.all([
      listingIds.length
        ? this.prisma.listing.findMany({ where: { id: { in: listingIds } }, select: { id: true, title: true } })
        : [],
      otherIds.length
        ? this.prisma.user.findMany({ where: { id: { in: otherIds } }, select: { id: true, username: true } })
        : [],
    ]);
    const titleById = new Map(listings.map((l) => [l.id, l.title]));
    const userById  = new Map(others.map((u2) => [u2.id, u2.username]));

    return {
      items: rows.map((r) => {
        const youGave = r.fromUserId === u.id ? titleById.get(r.fromListingId) : titleById.get(r.toListingId);
        const youGot  = r.fromUserId === u.id ? titleById.get(r.toListingId)   : titleById.get(r.fromListingId);
        const counterId = r.fromUserId === u.id ? r.toUserId : r.fromUserId;
        return {
          id: r.id,
          gave: youGave ?? "—",
          got:  youGot ?? "—",
          counterparty: userById.get(counterId) ?? "—",
          completedAt: r.respondedAt?.toISOString() ?? r.createdAt.toISOString(),
        };
      }),
    };
  }

  @Patch("me")
  async updateMe(
    @CurrentUser() current: SessionUser,
    @Body(new ZodPipe(UpdateProfileInput)) body: UpdateProfileInput
  ) {
    // `interested` is the onboarding interest picker (sub-category slugs).
    // Stored serialized in the `interestedJson` text column.
    const { interested, interestedCategoryIds: _ignored, ...rest } = body;
    const data: Record<string, unknown> = { ...rest };
    if (interested !== undefined) {
      data.interestedJson = JSON.stringify(interested);
    }

    const user = await this.prisma.user.update({
      where: { id: current.id },
      data,
      select: { id: true, username: true, name: true, bio: true, city: true, phone: true, avatarUrl: true, interestedJson: true },
    });
    let interestedOut: string[] = [];
    try { const v = JSON.parse(user.interestedJson); if (Array.isArray(v)) interestedOut = v; } catch { /* ignore */ }
    return { user: { ...user, interested: interestedOut } };
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/* ---------------------------------------------------------------- badges */

type BadgeInput = {
  listingsCount: number;
  postsCount: number;
  tradesCount: number;
  ageDays: number;
  byCategory: Array<{ slug: string; count: number }>;
};

export type Badge = {
  key: string;
  label: string;
  /** Emoji glyph fits the trainer-card aesthetic without an asset pipeline */
  glyph: string;
  /** Tone hint for the frontend palette */
  tone: "tcg" | "popmart" | "manga" | "figure" | "merch" | "trader" | "creator" | "veteran";
};

/**
 * Pick up to 3 specialty badges from real data. Category-based badges win
 * ties so the passport reflects what the user actually collects most.
 */
function deriveBadges(x: BadgeInput): Badge[] {
  const badges: Array<Badge & { weight: number }> = [];

  const totalCat = x.byCategory.reduce((s, c) => s + c.count, 0);
  for (const c of x.byCategory) {
    const share = totalCat > 0 ? c.count / totalCat : 0;
    if (share < 0.25 || c.count < 3) continue;
    if (c.slug === "cards" || c.slug.startsWith("pokemon")) {
      badges.push({ key: "tcg",      label: "TCG Master",      glyph: "🃏", tone: "tcg",     weight: 100 + share * 100 });
    } else if (c.slug === "blindbox" || c.slug.includes("blind") || c.slug.includes("popmart")) {
      badges.push({ key: "popmart",  label: "Pop Mart Hunter", glyph: "📦", tone: "popmart", weight: 100 + share * 100 });
    } else if (c.slug === "figure" || c.slug.includes("figure")) {
      badges.push({ key: "figure",   label: "Figure Curator",  glyph: "🗿", tone: "figure",  weight: 100 + share * 100 });
    } else if (c.slug === "komik"  || c.slug.includes("manga")) {
      badges.push({ key: "manga",    label: "Manga Otaku",     glyph: "📚", tone: "manga",   weight: 100 + share * 100 });
    } else if (c.slug === "merch") {
      badges.push({ key: "merch",    label: "Merch Maven",     glyph: "👕", tone: "merch",   weight: 100 + share * 100 });
    }
  }

  if (x.tradesCount >= 10) {
    badges.push({ key: "trader", label: "Veteran Trader",  glyph: "🤝", tone: "trader",  weight: 80 + Math.min(20, x.tradesCount) });
  } else if (x.tradesCount >= 3) {
    badges.push({ key: "trader", label: "Trader Aktif",    glyph: "🤝", tone: "trader",  weight: 60 });
  }

  if (x.postsCount >= 20) {
    badges.push({ key: "creator", label: "Konten Kreator", glyph: "📝", tone: "creator", weight: 70 });
  }

  if (x.ageDays >= 365) {
    badges.push({ key: "veteran", label: "OG Collector",    glyph: "🏛️", tone: "veteran", weight: 50 + Math.min(50, x.ageDays / 30) });
  }

  // Top 3 by weight, dedupe by key
  const seen = new Set<string>();
  return badges
    .sort((a, b) => b.weight - a.weight)
    .filter((b) => { if (seen.has(b.key)) return false; seen.add(b.key); return true; })
    .slice(0, 3)
    .map(({ weight, ...rest }) => rest);
}
