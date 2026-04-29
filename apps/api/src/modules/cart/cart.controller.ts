import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { z } from "zod";
import type { SessionUser } from "@hoobiq/types";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";

const CENTS_PER_RUPIAH = 100n;

const AddInput = z.object({
  listingId: z.string().cuid(),
  qty: z.number().int().min(1).max(99).optional(),
});

const UpdateInput = z.object({
  qty: z.number().int().min(1).max(99),
});

/**
 * Persistent shopping cart. Buyer-only — one user, one cart. The cart
 * survives across sessions because that's what every collector expects:
 * adding to cart on the laptop and finishing checkout on the phone.
 *
 * Mutations are idempotent on (user, listing) — adding the same listing
 * twice bumps qty rather than creating duplicate rows. Self-listings
 * are blocked (you can't add your own item to your cart).
 */
@Controller("cart")
export class CartController {
  constructor(private readonly prisma: PrismaService) {}

  /** Just the count — used by the nav badge. Cheap; only reads count. */
  @Get("count")
  async count(@CurrentUser() user: SessionUser) {
    const c = await this.prisma.cartItem.aggregate({
      where: { userId: user.id },
      _sum: { qty: true },
      _count: { _all: true },
    });
    return { items: c._count._all, totalQty: c._sum.qty ?? 0 };
  }

  /** Hydrated cart for the /keranjang page. */
  @Get()
  async list(@CurrentUser() user: SessionUser) {
    const rows = await this.prisma.cartItem.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        listing: {
          select: {
            id: true, slug: true, title: true, priceCents: true, stock: true,
            isPublished: true, moderation: true, deletedAt: true,
            imagesJson: true, condition: true,
            seller: { select: { username: true, name: true, city: true } },
          },
        },
      },
    });

    const items = rows.map((r) => {
      let cover: string | null = null;
      try {
        const v = JSON.parse(r.listing.imagesJson);
        if (Array.isArray(v) && typeof v[0] === "string") cover = v[0];
      } catch { /* ignore */ }
      const available =
        !r.listing.deletedAt &&
        r.listing.isPublished &&
        r.listing.moderation === "active" &&
        r.listing.stock > 0;
      return {
        id: r.id,
        qty: r.qty,
        addedAt: r.createdAt.toISOString(),
        available,
        listing: {
          id: r.listing.id,
          slug: r.listing.slug,
          title: r.listing.title,
          priceIdr: Number(r.listing.priceCents / CENTS_PER_RUPIAH),
          condition: r.listing.condition,
          cover,
          stock: r.listing.stock,
          seller: r.listing.seller,
        },
      };
    });

    const subtotalIdr = items
      .filter((i) => i.available)
      .reduce((acc, i) => acc + i.listing.priceIdr * i.qty, 0);

    return { items, subtotalIdr };
  }

  @Post()
  @HttpCode(201)
  async add(
    @CurrentUser() user: SessionUser,
    @Body(new ZodPipe(AddInput)) body: z.infer<typeof AddInput>,
  ) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: body.listingId },
      select: { id: true, sellerId: true, stock: true, isPublished: true, moderation: true, deletedAt: true },
    });
    if (!listing || listing.deletedAt) {
      throw new NotFoundException({ code: "not_found", message: "Listing tidak ditemukan." });
    }
    if (listing.sellerId === user.id) {
      throw new BadRequestException({ code: "own_listing", message: "Tidak bisa tambah listing sendiri ke keranjang." });
    }
    if (!listing.isPublished || listing.moderation !== "active" || listing.stock <= 0) {
      throw new BadRequestException({ code: "unavailable", message: "Listing tidak tersedia." });
    }

    const qty = Math.min(body.qty ?? 1, listing.stock);
    // Upsert keyed on (userId, listingId) — prevents duplicate rows;
    // re-adding bumps qty up to the listing's available stock.
    const existing = await this.prisma.cartItem.findUnique({
      where: { userId_listingId: { userId: user.id, listingId: listing.id } },
    });
    if (existing) {
      const nextQty = Math.min(existing.qty + qty, listing.stock);
      const updated = await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { qty: nextQty },
      });
      return { id: updated.id, qty: updated.qty };
    }
    const created = await this.prisma.cartItem.create({
      data: { userId: user.id, listingId: listing.id, qty },
    });
    return { id: created.id, qty: created.qty };
  }

  @Patch(":id")
  async update(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
    @Body(new ZodPipe(UpdateInput)) body: z.infer<typeof UpdateInput>,
  ) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id },
      include: { listing: { select: { stock: true } } },
    });
    if (!item || item.userId !== user.id) {
      throw new NotFoundException({ code: "not_found", message: "Item keranjang tidak ditemukan." });
    }
    const qty = Math.min(body.qty, Math.max(1, item.listing.stock));
    const updated = await this.prisma.cartItem.update({
      where: { id },
      data: { qty },
    });
    return { id: updated.id, qty: updated.qty };
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    const item = await this.prisma.cartItem.findUnique({ where: { id } });
    if (!item || item.userId !== user.id) {
      throw new NotFoundException({ code: "not_found", message: "Item keranjang tidak ditemukan." });
    }
    await this.prisma.cartItem.delete({ where: { id } });
  }
}
