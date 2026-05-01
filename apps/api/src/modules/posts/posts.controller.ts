import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, HttpCode, NotFoundException, Param, Patch, Post, Query } from "@nestjs/common";
import { z } from "zod";
import type { SessionUser } from "@hoobiq/types";
import { Public } from "../../common/decorators/public.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";

// Mirror CreateListingInput.images: accept http(s) URLs *or* data:image
// URIs. The web composer hands us raw data: URIs in dev (no R2 configured)
// and either form in prod, so a strict .url() rejected the dev path and
// posting silently failed with a 400. The minimum is also bumped to allow
// posts with multiple photos per spec — same upper bound as before.
const ImageStr = z.string().refine(
  (s) => /^https?:\/\//i.test(s) || /^data:image\//i.test(s),
  { message: "Harus berupa URL http(s) atau data:image URI" },
);

const CreatePost = z.object({
  // Caption is optional now per spec ("IG-like: foto wajib + caption").
  // Default empty string keeps DB column NOT NULL happy.
  body: z.string().max(2000).default(""),
  // At least one photo per post — text-only posts are out of scope for
  // the new feed surface.
  images: z.array(ImageStr).min(1, "Minimal 1 foto.").max(8),
  categoryId: z.string().cuid().optional(),
});

const CreateComment = z.object({
  body: z.string().min(1).max(1000),
});

const UpdatePost = z.object({
  body: z.string().min(2).max(2000).optional(),
  images: z.array(ImageStr).max(8).optional(),
});

const ReportPost = z.object({
  reason: z.string().min(3).max(500),
});

@Controller("posts")
export class PostsController {
  constructor(private readonly prisma: PrismaService) {}

  /** Suggested kolektor untuk follow — top engagement 30 hari terakhir
   *  yang belum di-follow oleh viewer. Sengaja di-declare di atas
   *  @Get(":id") biar router-nya nge-match path yang lebih spesifik
   *  duluan. */
  @Get("suggested-collectors")
  async suggestedCollectors(@CurrentUser() user: SessionUser) {
    const since = new Date(Date.now() - 30 * 86_400_000);
    // Activity score: jumlah post 30 hari × 1 + total likes × 1. Bukan
    // ranking eksak — cuma seed kolektor aktif. ORDER manual di JS biar
    // gak perlu raw SQL.
    const [postsAgg, follows] = await Promise.all([
      this.prisma.post.groupBy({
        by: ["authorId"],
        where: { createdAt: { gte: since }, deletedAt: null, moderation: { in: ["pending", "active"] } },
        _count: { _all: true },
        _sum: { likesCount: true },
      }),
      this.prisma.userFollow.findMany({
        where: { followerId: user.id },
        select: { followedId: true },
      }),
    ]);
    const blocked = new Set([user.id, ...follows.map((f) => f.followedId)]);
    const ranked = postsAgg
      .filter((a) => !blocked.has(a.authorId))
      .map((a) => ({
        authorId: a.authorId,
        score: (a._count._all ?? 0) + (a._sum.likesCount ?? 0),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((a) => a.authorId);

    if (ranked.length === 0) return { items: [] };

    const users = await this.prisma.user.findMany({
      where: { id: { in: ranked }, status: "active" },
      select: { username: true, name: true, avatarUrl: true, level: true, id: true },
    });
    // Preserve ranking order from `ranked`.
    const byId = new Map(users.map((u) => [u.id, u]));
    const items = ranked
      .map((id) => byId.get(id))
      .filter((u): u is NonNullable<typeof u> => !!u)
      .map(({ id: _id, ...rest }) => rest);
    return { items };
  }

  @Public()
  @Get()
  async list(
    @CurrentUser() user: SessionUser | undefined,
    @Query("limit") limitParam?: string,
    @Query("scope") scope?: string,
  ) {
    const limit = Math.min(60, Math.max(1, Number(limitParam ?? 20)));

    // Following-only scope filters posts down to authors the current user
    // follows. Anonymous viewers asking for `scope=following` get an
    // empty list — there's no graph to filter against.
    let authorFilter: { authorId: { in: string[] } } | undefined;
    if (scope === "following") {
      if (!user) return { items: [] };
      const follows = await this.prisma.userFollow.findMany({
        where: { followerId: user.id },
        select: { followedId: true },
      });
      const ids = follows.map((f) => f.followedId);
      if (ids.length === 0) return { items: [] };
      authorFilter = { authorId: { in: ids } };
    }

    const rows = await this.prisma.post.findMany({
      where: { deletedAt: null, moderation: { in: ["pending", "active"] }, ...(authorFilter ?? {}) },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        author: { select: { username: true, name: true, level: true, city: true, avatarUrl: true } },
      },
    });

    // Determine which of these the current user has liked, in one query.
    let likedSet = new Set<string>();
    if (user && rows.length > 0) {
      const liked = await this.prisma.postLike.findMany({
        where: { userId: user.id, postId: { in: rows.map((p) => p.id) } },
        select: { postId: true },
      });
      likedSet = new Set(liked.map((l) => l.postId));
    }

    return {
      items: rows.map((p) => {
        let images: string[] = [];
        try { const v = JSON.parse(p.imagesJson); if (Array.isArray(v)) images = v; } catch { /* ignore */ }
        return {
          id: p.id,
          body: p.body,
          images,
          cover: images[0] ?? null,
          likes: p.likesCount,
          comments: p.commentsCount,
          views: p.viewsCount,
          liked: likedSet.has(p.id),
          createdAt: p.createdAt.toISOString(),
          author: {
            username: p.author.username,
            name: p.author.name,
            level: p.author.level,
            city: p.author.city,
            avatarUrl: p.author.avatarUrl,
          },
        };
      }),
    };
  }

  @Post()
  @HttpCode(201)
  async create(
    @CurrentUser() user: SessionUser,
    @Body(new ZodPipe(CreatePost)) body: z.infer<typeof CreatePost>
  ) {
    // Daily post cap. Per-rolling-24h to discourage burst spam. 10 is
    // generous for active users (1 post per 2.4h) but blocks the
    // notification-spamming patterns we'd otherwise see.
    const since = new Date(Date.now() - 24 * 3600 * 1000);
    const todays = await this.prisma.post.count({
      where: { authorId: user.id, createdAt: { gte: since }, deletedAt: null },
    });
    const DAILY_POST_LIMIT = 10;
    if (todays >= DAILY_POST_LIMIT) {
      throw new BadRequestException({
        code: "rate_limit_post",
        message: `Batas ${DAILY_POST_LIMIT} post per hari. Coba lagi besok.`,
      });
    }
    const post = await this.prisma.post.create({
      data: {
        authorId: user.id,
        body: body.body,
        imagesJson: JSON.stringify(body.images),
        categoryId: body.categoryId ?? null,
        moderation: "active",
      },
    });
    return { id: post.id };
  }

  @Patch(":id")
  async update(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
    @Body(new ZodPipe(UpdatePost)) body: z.infer<typeof UpdatePost>
  ) {
    const existing = await this.prisma.post.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException({ code: "not_found", message: "Postingan tidak ditemukan." });
    }
    if (existing.authorId !== user.id && user.role !== "admin") {
      throw new ForbiddenException({ code: "forbidden", message: "Kamu bukan penulis postingan ini." });
    }
    const data: Record<string, unknown> = {};
    if (body.body !== undefined) data.body = body.body;
    if (body.images !== undefined) data.imagesJson = JSON.stringify(body.images);
    const updated = await this.prisma.post.update({ where: { id }, data });
    let images: string[] = [];
    try { const v = JSON.parse(updated.imagesJson); if (Array.isArray(v)) images = v; } catch { /* ignore */ }
    return { id: updated.id, body: updated.body, images, cover: images[0] ?? null };
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    const existing = await this.prisma.post.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException({ code: "not_found", message: "Postingan tidak ditemukan." });
    }
    if (existing.authorId !== user.id && user.role !== "admin") {
      throw new ForbiddenException({ code: "forbidden", message: "Kamu bukan penulis postingan ini." });
    }
    await this.prisma.post.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  /** Toggle like — atomic so the count and the join row stay consistent. */
  @Post(":id/like")
  @HttpCode(200)
  async toggleLike(@CurrentUser() user: SessionUser, @Param("id") postId: string) {
    const existing = await this.prisma.postLike.findUnique({
      where: { postId_userId: { postId, userId: user.id } },
    });

    if (existing) {
      await this.prisma.$transaction([
        this.prisma.postLike.delete({ where: { postId_userId: { postId, userId: user.id } } }),
        this.prisma.post.update({ where: { id: postId }, data: { likesCount: { decrement: 1 } } }),
      ]);
      return { liked: false };
    }
    await this.prisma.$transaction([
      this.prisma.postLike.create({ data: { postId, userId: user.id } }),
      this.prisma.post.update({ where: { id: postId }, data: { likesCount: { increment: 1 } } }),
    ]);
    return { liked: true };
  }

  /** Public: list comments. We cap to 50 newest — for MVP that's plenty. */
  @Public()
  @Get(":id/comments")
  async listComments(@Param("id") postId: string) {
    const rows = await this.prisma.postComment.findMany({
      where: { postId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    // Hydrate author lazily to avoid heavy joins for cold reads
    const ids = [...new Set(rows.map((r) => r.authorId))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, username: true, name: true, avatarUrl: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    return {
      items: rows.map((c) => ({
        id: c.id,
        body: c.body,
        createdAt: c.createdAt.toISOString(),
        author: byId.get(c.authorId) ?? { username: "—", name: null, avatarUrl: null },
      })),
    };
  }

  @Post(":id/comments")
  @HttpCode(201)
  async addComment(
    @CurrentUser() user: SessionUser,
    @Param("id") postId: string,
    @Body(new ZodPipe(CreateComment)) body: z.infer<typeof CreateComment>
  ) {
    const [comment] = await this.prisma.$transaction([
      this.prisma.postComment.create({
        data: { postId, authorId: user.id, body: body.body },
      }),
      this.prisma.post.update({
        where: { id: postId },
        data: { commentsCount: { increment: 1 } },
      }),
    ]);
    return { id: comment.id };
  }

  @Delete(":id/comments/:commentId")
  @HttpCode(204)
  async deleteComment(
    @CurrentUser() user: SessionUser,
    @Param("id") postId: string,
    @Param("commentId") commentId: string
  ) {
    const c = await this.prisma.postComment.findUnique({ where: { id: commentId } });
    if (!c || c.postId !== postId) return;
    if (c.authorId !== user.id && user.role !== "admin") return;
    await this.prisma.$transaction([
      this.prisma.postComment.delete({ where: { id: commentId } }),
      this.prisma.post.update({
        where: { id: postId },
        data: { commentsCount: { decrement: 1 } },
      }),
    ]);
  }

  /** Track view — fire-and-forget, idempotent per request, cheap. */
  @Public()
  @Post(":id/view")
  @HttpCode(204)
  async view(@Param("id") postId: string) {
    await this.prisma.post
      .update({ where: { id: postId }, data: { viewsCount: { increment: 1 } } })
      .catch(() => undefined);
  }

  /**
   * User-submitted moderation report. Inserts a Report row that admin
   * tooling consumes. Idempotent per (reporter, post): re-reporting the
   * same post just touches the existing row's reason.
   */
  @Post(":id/report")
  @HttpCode(202)
  async report(
    @CurrentUser() user: SessionUser,
    @Param("id") postId: string,
    @Body(new ZodPipe(ReportPost)) body: z.infer<typeof ReportPost>
  ) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.deletedAt) {
      throw new NotFoundException({ code: "not_found", message: "Postingan tidak ditemukan." });
    }
    if (post.authorId === user.id) {
      throw new ForbiddenException({ code: "self_report", message: "Tidak bisa lapor postingan sendiri." });
    }
    const existing = await this.prisma.report.findFirst({
      where: { reporterId: user.id, targetType: "post", targetId: postId },
    });
    if (existing) {
      await this.prisma.report.update({
        where: { id: existing.id },
        data: { reason: body.reason },
      });
    } else {
      await this.prisma.report.create({
        data: {
          reporterId: user.id,
          targetType: "post",
          targetId: postId,
          reason: body.reason,
        },
      });
    }
    return { ok: true };
  }
}
