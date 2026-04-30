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
  // Don't require strict cuid — listing ids are cuids in practice but
  // zod's `.cuid()` regex sometimes rejects production-seeded IDs and
  // other string id shapes (cuid2, custom prefixes). The `findUnique`
  // below is the real authority.
  listingId: z.string().min(1).max(64),
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
            // V2 multi-checkout needs weight + couriers + origin to
            // compute per-seller ongkir on the multi-item form.
            weightGrams: true, couriersJson: true, originSubdistrictId: true,
            seller: {
              select: {
                username: true, name: true, city: true,
                // sellerId surfaces so the form can group by user id
                // without leaking other users' details.
                id: true,
              },
            },
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
      let couriers: string[] = [];
      try {
        const v = JSON.parse(r.listing.couriersJson ?? "[]");
        if (Array.isArray(v)) couriers = v.filter((s) => typeof s === "string");
      } catch { /* ignore */ }
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
          weightGrams: r.listing.weightGrams,
          couriers,
          originSubdistrictId: r.listing.originSubdistrictId,
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

    const addQty = Math.min(body.qty ?? 1, listing.stock);
    // Atomic upsert keyed on (userId, listingId) — eliminates the
    // findUnique→create race window where two concurrent adds for the
    // same (user, listing) could both miss the existing row and trip
    // the unique constraint, surfacing as "gagal tambah ke keranjang".
    // We pass `increment` so re-adds bump qty in a single round-trip.
    const item = await this.prisma.cartItem.upsert({
      where: { userId_listingId: { userId: user.id, listingId: listing.id } },
      create: { userId: user.id, listingId: listing.id, qty: addQty },
      update: { qty: { increment: addQty } },
    });
    // Clamp post-upsert if the increment pushed us past available stock
    // (e.g. user spammed the +Keranjang button). Cheap separate update
    // — only hits when actually over-cap.
    if (item.qty > listing.stock) {
      const clamped = await this.prisma.cartItem.update({
        where: { id: item.id },
        data: { qty: listing.stock },
      });
      return { id: clamped.id, qty: clamped.qty };
    }
    return { id: item.id, qty: item.qty };
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
