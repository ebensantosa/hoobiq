import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { z } from "zod";
import {
  CreateListingInput,
  ListingSearchInput,
  UpdateListingInput,
  type SessionUser,
} from "@hoobiq/types";
import { Public } from "../../common/decorators/public.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { ListingsService } from "./listings.service";
import { ExpService, EXP_KIND } from "../exp/exp.service";

const ReviewInput = z.object({
  orderId: z.string().cuid(),
  rating: z.number().int().min(1).max(5),
  body: z.string().max(1000).optional(),
});

const ReviewReplyInput = z.object({
  body: z.string().trim().min(1).max(1000),
});

@Controller("listings")
export class ListingsController {
  constructor(
    private readonly listings: ListingsService,
    private readonly prisma: PrismaService,
    private readonly exp: ExpService,
  ) {}

  @Public()
  @Get()
  search(@Query(new ZodPipe(ListingSearchInput)) query: ListingSearchInput) {
    return this.listings.search(query);
  }

  /**
   * Aggregate facets for the filter panel: price histogram (matching the
   * current category/query so the bars reflect what the user is shopping
   * in) and top cities. Returned together to save a round-trip.
   */
  @Public()
  @Get("facets/all")
  facets(
    @Query("q") q?: string,
    @Query("categorySlug") categorySlug?: string,
    @Query("buckets") buckets?: string
  ) {
    const n = Math.min(40, Math.max(8, Number(buckets) || 24));
    return this.listings.facets({ q, categorySlug, buckets: n });
  }

  /**
   * Listings owned by the current user (seller dashboard view). Includes
   * unpublished + draft + sold-out listings — anything they uploaded —
   * because the dashboard needs to manage all states, not just live ones.
   *
   * NOTE: must be declared BEFORE `@Get(":slug")` — NestJS matches routes in
   * declaration order, and "mine" would otherwise be captured as a slug.
   */
  @Get("mine")
  async mine(@CurrentUser() user: SessionUser) {
    const rows = await this.prisma.listing.findMany({
      where: { sellerId: user.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true, slug: true, title: true,
        priceCents: true, condition: true,
        imagesJson: true, stock: true,
        isPublished: true, moderation: true,
        views: true, createdAt: true,
      },
    });
    return {
      items: rows.map((r) => {
        let cover: string | null = null;
        try { const imgs = JSON.parse(r.imagesJson); if (Array.isArray(imgs)) cover = imgs[0] ?? null; } catch { /* ignore */ }
        return {
          id: r.id,
          slug: r.slug,
          title: r.title,
          priceIdr: Number(r.priceCents / 100n),
          condition: r.condition,
          cover,
          stock: r.stock,
          isPublished: r.isPublished,
          moderation: r.moderation,
          views: r.views,
          createdAt: r.createdAt.toISOString(),
        };
      }),
    };
  }

  @Public()
  @Get(":slug")
  byId(@Param("slug") slug: string) {
    return this.listings.getBySlug(slug);
  }

  @Post()
  @HttpCode(201)
  create(
    @CurrentUser() user: SessionUser,
    @Body(new ZodPipe(CreateListingInput)) body: CreateListingInput
  ) {
    return this.listings.create(user.id, body);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
    @Body(new ZodPipe(UpdateListingInput)) body: UpdateListingInput
  ) {
    return this.listings.update(user.id, id, body);
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    await this.listings.softDelete(user.id, id);
  }

  /**
   * Public reviews list. Returns up to 20 most recent reviews + an aggregate
   * (avg rating, total count, distribution). Used by the listing detail page.
   */
  @Public()
  @Get(":idOrSlug/reviews")
  async listReviews(@Param("idOrSlug") idOrSlug: string) {
    const listing = await this.prisma.listing.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }], deletedAt: null },
      select: { id: true },
    });
    if (!listing) throw new NotFoundException({ code: "not_found", message: "Listing tidak ditemukan." });

    const [rows, agg] = await Promise.all([
      this.prisma.listingReview.findMany({
        where: { listingId: listing.id },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          buyer: { select: { username: true, name: true, avatarUrl: true, city: true } },
        },
      }),
      this.prisma.listingReview.aggregate({
        where: { listingId: listing.id },
        _avg: { rating: true },
        _count: { _all: true },
      }),
    ]);

    // Per-star distribution (5 → 1) for histogram UI.
    const dist = await this.prisma.listingReview.groupBy({
      by: ["rating"],
      where: { listingId: listing.id },
      _count: { _all: true },
    });
    const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const d of dist) distribution[d.rating as 1 | 2 | 3 | 4 | 5] = d._count._all;

    return {
      summary: {
        avg: agg._avg.rating ?? null,
        total: agg._count._all,
        distribution,
      },
      items: rows.map((r) => ({
        id: r.id,
        rating: r.rating,
        body: r.body,
        createdAt: r.createdAt.toISOString(),
        buyer: r.buyer,
        sellerReply: r.sellerReply,
        sellerReplyAt: r.sellerReplyAt ? r.sellerReplyAt.toISOString() : null,
      })),
    };
  }

  /**
   * Whether the current user is eligible to leave (or has already left) a
   * review for this listing. Returns the matching completed order id so
   * the client can include it in the review POST.
   */
  @Get(":idOrSlug/my-review-status")
  async myReviewStatus(
    @CurrentUser() user: SessionUser,
    @Param("idOrSlug") idOrSlug: string
  ) {
    const listing = await this.prisma.listing.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      select: { id: true },
    });
    if (!listing) throw new NotFoundException({ code: "not_found", message: "Listing tidak ditemukan." });

    const order = await this.prisma.order.findFirst({
      where: { listingId: listing.id, buyerId: user.id, status: "completed" },
      orderBy: { completedAt: "desc" },
      select: { id: true, completedAt: true },
    });
    if (!order) {
      return { canReview: false, orderId: null, existingReview: null };
    }
    const review = await this.prisma.listingReview.findUnique({
      where: { orderId: order.id },
      select: { id: true, rating: true, body: true, createdAt: true },
    });
    return {
      canReview: !review,
      orderId: order.id,
      existingReview: review
        ? { id: review.id, rating: review.rating, body: review.body, createdAt: review.createdAt.toISOString() }
        : null,
    };
  }

  /**
   * Buyer review submission. Tied to a completed order — server enforces
   * that the order belongs to the user, the listing matches, and the order
   * is in `completed` status. One review per order (unique constraint).
   */
  @Post(":id/reviews")
  @HttpCode(201)
  async createReview(
    @CurrentUser() user: SessionUser,
    @Param("id") listingId: string,
    @Body(new ZodPipe(ReviewInput)) body: z.infer<typeof ReviewInput>
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: body.orderId },
      select: { id: true, buyerId: true, listingId: true, status: true },
    });
    if (!order) throw new NotFoundException({ code: "not_found", message: "Pesanan tidak ditemukan." });
    if (order.buyerId !== user.id) throw new ForbiddenException({ code: "forbidden", message: "Bukan pesanan kamu." });
    if (order.listingId !== listingId) throw new BadRequestException({ code: "mismatch", message: "Pesanan ini bukan untuk listing tersebut." });
    if (order.status !== "completed") throw new BadRequestException({ code: "not_completed", message: "Hanya pesanan selesai yang bisa direview." });

    const existing = await this.prisma.listingReview.findUnique({ where: { orderId: order.id } });
    if (existing) {
      const updated = await this.prisma.listingReview.update({
        where: { id: existing.id },
        data: { rating: body.rating, body: body.body ?? null },
      });
      return { id: updated.id, updated: true };
    }
    const created = await this.prisma.listingReview.create({
      data: {
        listingId,
        buyerId: user.id,
        orderId: order.id,
        rating: body.rating,
        body: body.body ?? null,
      },
    });
    // EXP awards on review creation:
    //   buyer  → +20 per review submitted (review_seller).
    //   seller → +10 if rating >= 4 (rating_received_45).
    void this.exp.award(user.id, EXP_KIND.reviewSeller, 20);
    if (body.rating >= 4) {
      const listing = await this.prisma.listing.findUnique({
        where: { id: listingId }, select: { sellerId: true },
      });
      if (listing) void this.exp.award(listing.sellerId, EXP_KIND.ratingReceived45, 10);
    }
    return { id: created.id, updated: false };
  }

  /**
   * Seller reply to a buyer review. Only the listing owner can reply.
   * One reply per review (PUT semantics — subsequent calls overwrite).
   * Pass body="" to clear via DELETE — not implemented here yet.
   */
  @Post(":id/reviews/:reviewId/reply")
  @HttpCode(200)
  async replyToReview(
    @CurrentUser() user: SessionUser,
    @Param("id") listingId: string,
    @Param("reviewId") reviewId: string,
    @Body(new ZodPipe(ReviewReplyInput)) body: z.infer<typeof ReviewReplyInput>,
  ) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { sellerId: true },
    });
    if (!listing) throw new NotFoundException({ code: "not_found", message: "Listing tidak ditemukan." });
    if (listing.sellerId !== user.id) {
      throw new ForbiddenException({ code: "forbidden", message: "Hanya seller listing ini yang bisa balas." });
    }
    const review = await this.prisma.listingReview.findUnique({
      where: { id: reviewId },
      select: { id: true, listingId: true },
    });
    if (!review || review.listingId !== listingId) {
      throw new NotFoundException({ code: "not_found", message: "Review tidak ditemukan." });
    }
    const updated = await this.prisma.listingReview.update({
      where: { id: reviewId },
      data: { sellerReply: body.body, sellerReplyAt: new Date() },
      select: { id: true, sellerReply: true, sellerReplyAt: true },
    });
    return {
      id: updated.id,
      sellerReply: updated.sellerReply,
      sellerReplyAt: updated.sellerReplyAt ? updated.sellerReplyAt.toISOString() : null,
    };
  }
}
