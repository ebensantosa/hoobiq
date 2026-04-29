import { BadRequestException, Body, Controller, ForbiddenException, Get, HttpCode, NotFoundException, Param, Patch, Post } from "@nestjs/common";
import { z } from "zod";
import type { SessionUser } from "@hoobiq/types";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { DmGateway } from "./dm.gateway";

const StartConvo = z.object({
  withUsername: z.string().min(3).max(40),
});

const PostMessage = z.object({
  body: z.string().min(1).max(4000),
  attachmentUrl: z.string().url().optional(),
});

const OfferInput = z.object({
  listingId: z.string().cuid(),
  /** Buyer's proposed price in rupiah. Min 1k, max 1B (matches listing). */
  priceIdr: z.number().int().min(1000).max(1_000_000_000),
  /** Optional note alongside the offer ("nego ya kak", etc). */
  note: z.string().max(500).optional(),
});

@Controller("dm")
export class DmController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: DmGateway
  ) {}

  /**
   * GET /dm — list conversations for the current user, sorted by most recent
   * activity (newest message first), with last-message snippet + unread count.
   */
  @Get()
  async list(@CurrentUser() me: SessionUser) {
    const memberships = await this.prisma.conversationMember.findMany({
      where: { userId: me.id },
      include: {
        conversation: {
          include: {
            members: { include: { /* member rows have userId only */ } },
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    // Hydrate counterpart users in one query
    const counterpartIds = new Set<string>();
    for (const m of memberships) {
      for (const cm of m.conversation.members) {
        if (cm.userId !== me.id) counterpartIds.add(cm.userId);
      }
    }
    const users = await this.prisma.user.findMany({
      where: { id: { in: [...counterpartIds] } },
      select: { id: true, username: true, name: true, avatarUrl: true, city: true },
    });
    const userById = new Map(users.map((u) => [u.id, u]));

    const items = memberships
      .map((m) => {
        const counterpart = m.conversation.members.find((cm) => cm.userId !== me.id);
        const last = m.conversation.messages[0];
        const unread =
          last && (!m.lastReadAt || last.createdAt > m.lastReadAt) && last.senderId !== me.id ? 1 : 0;
        return {
          id: m.conversation.id,
          counterpart: counterpart ? userById.get(counterpart.userId) ?? null : null,
          lastMessage: last
            ? {
                body: last.body.slice(0, 120),
                fromMe: last.senderId === me.id,
                at: last.createdAt.toISOString(),
              }
            : null,
          unread,
          updatedAt: (last?.createdAt ?? m.conversation.createdAt).toISOString(),
        };
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    return { items };
  }

  /**
   * POST /dm — start (or resume) a conversation with another user identified
   * by username. Idempotent: returns the existing thread if already open.
   */
  @Post()
  @HttpCode(200)
  async startWith(@CurrentUser() me: SessionUser, @Body(new ZodPipe(StartConvo)) body: z.infer<typeof StartConvo>) {
    const other = await this.prisma.user.findUnique({
      where: { username: body.withUsername },
      select: { id: true, username: true },
    });
    if (!other) throw new NotFoundException({ code: "user_not_found", message: "User tidak ditemukan." });
    if (other.id === me.id) throw new BadRequestException({ code: "self_dm", message: "Tidak bisa DM diri sendiri." });

    // Find existing 1:1 conversation
    const mine = await this.prisma.conversationMember.findMany({
      where: { userId: me.id },
      select: { conversationId: true },
    });
    if (mine.length > 0) {
      const shared = await this.prisma.conversationMember.findFirst({
        where: { userId: other.id, conversationId: { in: mine.map((m) => m.conversationId) } },
        select: { conversationId: true },
      });
      if (shared) return { id: shared.conversationId };
    }

    // Otherwise create new
    const created = await this.prisma.conversation.create({
      data: {
        members: { create: [{ userId: me.id }, { userId: other.id }] },
      },
    });
    return { id: created.id };
  }

  @Get(":id/messages")
  async messages(@CurrentUser() me: SessionUser, @Param("id") conversationId: string) {
    await this.requireMembership(me.id, conversationId);
    const rows = await this.prisma.message.findMany({
      where: { conversationId, deletedAt: null },
      orderBy: { createdAt: "asc" },
      take: 100,
    });
    // Mark as read for me
    await this.prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId: me.id } },
      data: { lastReadAt: new Date() },
    });
    // Hydrate any offer messages with current listing info so the
    // chat bubble can show product title, cover, and original price.
    const offerListingIds = Array.from(
      new Set(rows.map((r) => r.offerListingId).filter((x): x is string => !!x)),
    );
    const offerListings = offerListingIds.length
      ? await this.prisma.listing.findMany({
          where: { id: { in: offerListingIds } },
          select: {
            id: true, slug: true, title: true, priceCents: true,
            sellerId: true, imagesJson: true, stock: true, deletedAt: true,
          },
        })
      : [];
    const listingById = new Map(offerListings.map((l) => [l.id, l]));

    return {
      items: rows.map((m) => {
        let offer: {
          listingId: string; listingSlug: string; listingTitle: string; listingCover: string | null;
          originalPriceIdr: number; offeredPriceIdr: number;
          status: "pending" | "accepted" | "rejected" | "cancelled";
          isSeller: boolean;
          decidedAt: string | null;
        } | null = null;
        if (m.kind === "offer" && m.offerListingId) {
          const l = listingById.get(m.offerListingId);
          if (l) {
            let cover: string | null = null;
            try { const v = JSON.parse(l.imagesJson); if (Array.isArray(v) && typeof v[0] === "string") cover = v[0]; } catch { /* ignore */ }
            offer = {
              listingId: l.id,
              listingSlug: l.slug,
              listingTitle: l.title,
              listingCover: cover,
              originalPriceIdr: Number(l.priceCents / 100n),
              offeredPriceIdr: m.offerPriceCents ? Number(m.offerPriceCents / 100n) : 0,
              status: (m.offerStatus ?? "pending") as "pending" | "accepted" | "rejected" | "cancelled",
              // Seller is the listing owner — they're the one who
              // decides accept/reject. Buyer (sender) can also cancel
              // a pending offer.
              isSeller: l.sellerId === me.id,
              decidedAt: m.decidedAt?.toISOString() ?? null,
            };
          }
        }
        return {
          id: m.id,
          body: m.body,
          attachmentUrl: m.attachmentUrl,
          senderId: m.senderId,
          fromMe: m.senderId === me.id,
          kind: m.kind,
          offer,
          createdAt: m.createdAt.toISOString(),
        };
      }),
    };
  }

  @Post(":id/messages")
  @HttpCode(201)
  async sendMessage(
    @CurrentUser() me: SessionUser,
    @Param("id") conversationId: string,
    @Body(new ZodPipe(PostMessage)) body: z.infer<typeof PostMessage>
  ) {
    await this.requireMembership(me.id, conversationId);
    const msg = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: me.id,
        body: body.body,
        attachmentUrl: body.attachmentUrl ?? null,
      },
    });
    // Broadcast to anyone listening on this thread.
    this.gateway.broadcastNewMessage(conversationId, {
      id: msg.id,
      body: msg.body,
      attachmentUrl: msg.attachmentUrl,
      senderId: msg.senderId,
      createdAt: msg.createdAt.toISOString(),
    });
    return { id: msg.id, createdAt: msg.createdAt.toISOString() };
  }

  /**
   * Buyer sends a price offer for one of the seller's listings inside
   * an existing chat thread. Stored as a Message with kind="offer";
   * the seller-side UI renders Accept / Reject buttons that hit the
   * routes below.
   */
  @Post(":id/offer")
  @HttpCode(201)
  async sendOffer(
    @CurrentUser() me: SessionUser,
    @Param("id") conversationId: string,
    @Body(new ZodPipe(OfferInput)) body: z.infer<typeof OfferInput>,
  ) {
    await this.requireMembership(me.id, conversationId);

    const listing = await this.prisma.listing.findUnique({
      where: { id: body.listingId },
      select: { id: true, sellerId: true, priceCents: true, deletedAt: true, isPublished: true, moderation: true, stock: true, title: true },
    });
    if (!listing || listing.deletedAt) {
      throw new NotFoundException({ code: "not_found", message: "Listing tidak ditemukan." });
    }
    if (!listing.isPublished || listing.moderation !== "active" || listing.stock <= 0) {
      throw new BadRequestException({ code: "unavailable", message: "Listing tidak tersedia." });
    }
    if (listing.sellerId === me.id) {
      throw new BadRequestException({ code: "self_offer", message: "Tidak bisa nego ke listing sendiri." });
    }

    // Make sure the buyer is in a conversation that includes the seller —
    // otherwise the offer would dead-end. The simplest check: another
    // conversation member must be the listing's seller.
    const counterpart = await this.prisma.conversationMember.findFirst({
      where: { conversationId, userId: { not: me.id } },
      select: { userId: true },
    });
    if (!counterpart || counterpart.userId !== listing.sellerId) {
      throw new BadRequestException({
        code: "wrong_thread",
        message: "Nego hanya bisa di chat dengan seller listing tersebut.",
      });
    }

    const priceCents = BigInt(body.priceIdr) * 100n;
    const note = body.note?.trim() ?? "";
    const summary = `Tawaran Rp ${body.priceIdr.toLocaleString("id-ID")} untuk "${listing.title}"`;

    const msg = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: me.id,
        body: note ? `${summary}\n\n${note}` : summary,
        kind: "offer",
        offerListingId: listing.id,
        offerPriceCents: priceCents,
        offerStatus: "pending",
      },
    });
    this.gateway.broadcastNewMessage(conversationId, {
      id: msg.id,
      body: msg.body,
      attachmentUrl: null,
      senderId: msg.senderId,
      createdAt: msg.createdAt.toISOString(),
    });
    return { id: msg.id };
  }

  /**
   * Seller accepts / rejects / cancels an offer. Buyer can cancel their
   * own pending offer. On accept, we return a checkout URL with the
   * negotiated price baked in — frontend redirects there.
   */
  @Patch(":conversationId/offer/:messageId")
  async respondOffer(
    @CurrentUser() me: SessionUser,
    @Param("conversationId") conversationId: string,
    @Param("messageId") messageId: string,
    @Body(new ZodPipe(z.object({ action: z.enum(["accept", "reject", "cancel"]) }))) body: { action: "accept" | "reject" | "cancel" },
  ) {
    await this.requireMembership(me.id, conversationId);
    const msg = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { offerListing: { select: { id: true, slug: true, sellerId: true } } },
    });
    if (!msg || msg.conversationId !== conversationId) {
      throw new NotFoundException({ code: "not_found", message: "Pesan tidak ditemukan." });
    }
    if (msg.kind !== "offer" || !msg.offerListing) {
      throw new BadRequestException({ code: "not_offer", message: "Pesan ini bukan tawaran." });
    }
    if (msg.offerStatus !== "pending") {
      throw new BadRequestException({ code: "already_decided", message: "Tawaran sudah diproses." });
    }

    const isSeller = msg.offerListing.sellerId === me.id;
    const isBuyer  = msg.senderId === me.id;

    if (body.action === "cancel") {
      if (!isBuyer) {
        throw new ForbiddenException({ code: "forbidden", message: "Cuma pengirim yang bisa cancel tawaran." });
      }
    } else {
      // accept | reject
      if (!isSeller) {
        throw new ForbiddenException({ code: "forbidden", message: "Cuma seller yang bisa accept/reject tawaran." });
      }
    }

    const newStatus =
      body.action === "accept" ? "accepted" :
      body.action === "reject" ? "rejected" :
                                  "cancelled";

    await this.prisma.message.update({
      where: { id: msg.id },
      data: { offerStatus: newStatus, decidedAt: new Date() },
    });

    if (body.action === "accept") {
      // Buyer (the sender of the offer) follows this URL to land on
      // checkout with the negotiated price. The checkout page will
      // accept ?listing=<slug>&offerPrice=<idr> — see /checkout for
      // how it picks up the override.
      const priceIdr = msg.offerPriceCents ? Number(msg.offerPriceCents / 100n) : 0;
      return {
        status: "accepted",
        checkoutUrl: `/checkout?listing=${encodeURIComponent(msg.offerListing.slug)}&offerPrice=${priceIdr}`,
      };
    }
    return { status: newStatus };
  }

  private async requireMembership(userId: string, conversationId: string) {
    const member = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!member) throw new NotFoundException({ code: "not_a_member", message: "Kamu bukan anggota percakapan ini." });
  }
}
