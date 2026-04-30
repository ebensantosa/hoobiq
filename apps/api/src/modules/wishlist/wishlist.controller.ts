import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Post } from "@nestjs/common";
import type { SessionUser } from "@hoobiq/types";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";

/** Per-user daily cap on new wishlist additions. Anti-spam guard so a
 *  hijacked session can't bulk-pile a buyer's wishlist with thousands
 *  of rows. 50/day is generous for a real collector — the previous
 *  ceiling of 25 felt restrictive when buyers were prepping bid lists.
 */
const WISHLIST_DAILY_CAP = 50;

@Controller("wishlist")
export class WishlistController {
  constructor(private readonly prisma: PrismaService) {}

  /** GET /wishlist — items saved by the current user. */
  @Get()
  async list(@CurrentUser() user: SessionUser) {
    const rows = await this.prisma.wishlistItem.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        listing: {
          include: { seller: { select: { username: true, city: true, trustScore: true } } },
        },
      },
    });
    return {
      items: rows.map((w) => {
        const l = w.listing;
        let cover: string | null = null;
        try { const imgs = JSON.parse(l.imagesJson); if (Array.isArray(imgs)) cover = imgs[0] ?? null; } catch { /* ignore */ }
        return {
          id: w.id,
          listing: {
            id: l.id,
            slug: l.slug,
            title: l.title,
            priceIdr: Number(l.priceCents / 100n),
            condition: l.condition,
            cover,
            seller: { username: l.seller.username, city: l.seller.city, trustScore: Number(l.seller.trustScore) },
          },
        };
      }),
    };
  }

  /** POST /wishlist — add a listing. Idempotent via unique(userId, listingId).
   *  Capped at WISHLIST_DAILY_CAP (50) new rows per rolling 24h. */
  @Post()
  @HttpCode(201)
  async add(
    @CurrentUser() user: SessionUser,
    @Body() body: { listingId: string }
  ) {
    // Re-add of an existing wishlist row doesn't count against the cap
    // (upsert is a no-op for the dupe). New rows do — count those in
    // the last 24h and refuse beyond the cap.
    const dupe = await this.prisma.wishlistItem.findUnique({
      where: { userId_listingId: { userId: user.id, listingId: body.listingId } },
      select: { id: true },
    });
    if (!dupe) {
      const since = new Date(Date.now() - 24 * 3600 * 1000);
      const recent = await this.prisma.wishlistItem.count({
        where: { userId: user.id, createdAt: { gte: since } },
      });
      if (recent >= WISHLIST_DAILY_CAP) {
        throw new BadRequestException({
          code: "wishlist_daily_cap",
          message: `Sehari maksimal ${WISHLIST_DAILY_CAP} item baru ke wishlist. Coba lagi besok.`,
        });
      }
    }

    const item = await this.prisma.wishlistItem.upsert({
      where: { userId_listingId: { userId: user.id, listingId: body.listingId } },
      update: {},
      create: { userId: user.id, listingId: body.listingId },
    });
    return { id: item.id };
  }

  /** DELETE /wishlist/:listingId — remove. */
  @Delete(":listingId")
  @HttpCode(204)
  async remove(@CurrentUser() user: SessionUser, @Param("listingId") listingId: string) {
    await this.prisma.wishlistItem.deleteMany({ where: { userId: user.id, listingId } });
  }
}
