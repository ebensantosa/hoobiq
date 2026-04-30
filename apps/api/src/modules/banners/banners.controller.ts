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
} from "@nestjs/common";
import { z } from "zod";
import type { SessionUser } from "@hoobiq/types";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";

/** Shared serializer so admin + public endpoints return the same shape. */
function toBanner(b: {
  id: string; title: string; subtitle: string | null; kicker: string | null;
  ctaLabel: string; ctaHref: string; imageUrl: string;
  sortOrder: number; active: boolean;
  createdAt: Date; updatedAt: Date;
}) {
  return {
    id: b.id,
    title: b.title,
    subtitle: b.subtitle,
    kicker: b.kicker,
    ctaLabel: b.ctaLabel,
    ctaHref: b.ctaHref,
    imageUrl: b.imageUrl,
    sortOrder: b.sortOrder,
    active: b.active,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}

const BannerInput = z.object({
  title:    z.string().trim().min(2).max(120),
  subtitle: z.string().trim().max(240).nullable().optional(),
  kicker:   z.string().trim().max(40).nullable().optional(),
  ctaLabel: z.string().trim().min(1).max(40).default("Jelajahi Sekarang"),
  ctaHref:  z.string().trim().min(1).max(240).default("/marketplace"),
  imageUrl: z.string().trim().min(1).max(1000),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  active:    z.boolean().default(true),
});
const BannerPatch = BannerInput.partial();

/**
 * Hero slider banners shown at the top of the logged-in home page.
 * Public GET /banners is what the frontend slider consumes (cached
 * 60s on the client). Admin endpoints are gated by role check inline
 * — same pattern as /categories/requests so the routes stay scoped.
 */
@Controller("banners")
export class BannersController {
  constructor(private readonly prisma: PrismaService) {}

  /** Public — feeds the home slider. Active rows only, sorted by
   *  sortOrder asc, then newest first as a tiebreaker so admins can
   *  pin a hero to the top with sortOrder=0 without manually
   *  reshuffling everything else. */
  @Public()
  @Get()
  async list() {
    const rows = await this.prisma.homepageBanner.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: 12,
    });
    return { items: rows.map(toBanner) };
  }

  /* -------------------- Admin CMS -------------------- */

  private requireAdmin(u: SessionUser) {
    if (u.role !== "admin" && u.role !== "superadmin" && u.role !== "ops") {
      throw new ForbiddenException({ code: "forbidden", message: "Khusus admin." });
    }
  }

  /** Admin list — includes inactive rows for the management table. */
  @Get("admin")
  async adminList(@CurrentUser() user: SessionUser) {
    this.requireAdmin(user);
    const rows = await this.prisma.homepageBanner.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return { items: rows.map(toBanner) };
  }

  @Post("admin")
  @HttpCode(201)
  async create(
    @CurrentUser() user: SessionUser,
    @Body(new ZodPipe(BannerInput)) body: z.infer<typeof BannerInput>,
  ) {
    this.requireAdmin(user);
    const row = await this.prisma.homepageBanner.create({
      data: {
        title:     body.title,
        subtitle:  body.subtitle ?? null,
        kicker:    body.kicker ?? null,
        ctaLabel:  body.ctaLabel,
        ctaHref:   body.ctaHref,
        imageUrl:  body.imageUrl,
        sortOrder: body.sortOrder,
        active:    body.active,
      },
    });
    return toBanner(row);
  }

  @Patch("admin/:id")
  async patch(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
    @Body(new ZodPipe(BannerPatch)) body: z.infer<typeof BannerPatch>,
  ) {
    this.requireAdmin(user);
    const exists = await this.prisma.homepageBanner.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException({ code: "not_found", message: "Banner tidak ditemukan." });
    if (Object.keys(body).length === 0) {
      throw new BadRequestException({ code: "empty", message: "Tidak ada field yang diubah." });
    }
    const row = await this.prisma.homepageBanner.update({
      where: { id },
      data: {
        ...(body.title    !== undefined && { title:    body.title }),
        ...(body.subtitle !== undefined && { subtitle: body.subtitle ?? null }),
        ...(body.kicker   !== undefined && { kicker:   body.kicker ?? null }),
        ...(body.ctaLabel !== undefined && { ctaLabel: body.ctaLabel }),
        ...(body.ctaHref  !== undefined && { ctaHref:  body.ctaHref }),
        ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
        ...(body.active    !== undefined && { active:    body.active }),
      },
    });
    return toBanner(row);
  }

  @Delete("admin/:id")
  @HttpCode(204)
  async remove(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    this.requireAdmin(user);
    await this.prisma.homepageBanner.delete({ where: { id } }).catch(() => undefined);
  }
}
