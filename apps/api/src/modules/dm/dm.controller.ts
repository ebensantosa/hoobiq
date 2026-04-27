import { BadRequestException, Body, Controller, Get, HttpCode, NotFoundException, Param, Post } from "@nestjs/common";
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
    return {
      items: rows.map((m) => ({
        id: m.id,
        body: m.body,
        attachmentUrl: m.attachmentUrl,
        senderId: m.senderId,
        fromMe: m.senderId === me.id,
        createdAt: m.createdAt.toISOString(),
      })),
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

  private async requireMembership(userId: string, conversationId: string) {
    const member = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!member) throw new NotFoundException({ code: "not_a_member", message: "Kamu bukan anggota percakapan ini." });
  }
}
