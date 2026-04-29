import { Body, Controller, Delete, Get, HttpCode, Param, Post } from "@nestjs/common";
import type { SessionUser } from "@hoobiq/types";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";

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

  /** POST /wishlist — add a listing. Idempotent via unique(userId, listingId). */
  @Post()
  @HttpCode(201)
  async add(
    @CurrentUser() user: SessionUser,
    @Body() body: { listingId: string }
  ) {
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
