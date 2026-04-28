import { Body, Controller, Get, Patch } from "@nestjs/common";
import { z } from "zod";
import { Public } from "../../common/decorators/public.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { RedisService } from "../../infrastructure/redis/redis.service";
import type { SessionUser } from "@hoobiq/types";

const SINGLETON_ID = "singleton";
const CACHE_KEY = "site-settings:v1";
const CACHE_TTL = 60;

const PatchInput = z.object({
  brandName:    z.string().min(1).max(60).optional(),
  logoUrl:      z.string().url().nullable().optional(),
  faviconUrl:   z.string().url().nullable().optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  footerText:   z.string().max(280).optional(),
  // Flat key->value map. Keys are validated client-side against a known
  // allowlist (apps/web/lib/copy/keys.ts); we only enforce shape here.
  copy:         z.record(z.string(), z.string().max(500)).optional(),
});
type PatchInput = z.infer<typeof PatchInput>;

type SettingsDto = {
  brandName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  footerText: string;
  copy: Record<string, string>;
};

@Controller("site-settings")
export class SiteSettingsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get()
  async get(): Promise<SettingsDto> {
    return this.redis.cached(CACHE_KEY, CACHE_TTL, async () => this.load());
  }

  @Patch()
  @Roles("admin", "ops", "superadmin")
  async update(
    @CurrentUser() user: SessionUser,
    @Body(new ZodPipe(PatchInput)) input: PatchInput,
  ): Promise<SettingsDto> {
    const current = await this.load();
    const mergedCopy = input.copy ? { ...current.copy, ...input.copy } : undefined;

    await this.prisma.siteSettings.upsert({
      where: { id: SINGLETON_ID },
      update: {
        ...(input.brandName    !== undefined && { brandName:    input.brandName }),
        ...(input.logoUrl      !== undefined && { logoUrl:      input.logoUrl }),
        ...(input.faviconUrl   !== undefined && { faviconUrl:   input.faviconUrl }),
        ...(input.primaryColor !== undefined && { primaryColor: input.primaryColor }),
        ...(input.footerText   !== undefined && { footerText:   input.footerText }),
        ...(mergedCopy         !== undefined && { copyJson:     JSON.stringify(mergedCopy) }),
        updatedById: user.id,
      },
      create: {
        id: SINGLETON_ID,
        brandName:    input.brandName    ?? "Hoobiq",
        logoUrl:      input.logoUrl      ?? null,
        faviconUrl:   input.faviconUrl   ?? null,
        primaryColor: input.primaryColor ?? "#FFA552",
        footerText:   input.footerText   ?? "© Hoobiq · Marketplace kolektor Indonesia",
        copyJson:     JSON.stringify(mergedCopy ?? {}),
        updatedById:  user.id,
      },
    });

    await this.prisma.auditEntry.create({
      data: {
        actorId: user.id,
        action: "site_settings.update",
        targetRef: SINGLETON_ID,
        metaJson: JSON.stringify({ keys: Object.keys(input) }),
      },
    });

    await this.redis.del(CACHE_KEY);
    return this.load();
  }

  private async load(): Promise<SettingsDto> {
    const row = await this.prisma.siteSettings.findUnique({ where: { id: SINGLETON_ID } });
    if (!row) {
      return {
        brandName: "Hoobiq",
        logoUrl: null,
        faviconUrl: null,
        primaryColor: "#FFA552",
        footerText: "© Hoobiq · Marketplace kolektor Indonesia",
        copy: {},
      };
    }
    let copy: Record<string, string> = {};
    try { const parsed = JSON.parse(row.copyJson); if (parsed && typeof parsed === "object") copy = parsed; } catch { /* fall through */ }
    return {
      brandName:    row.brandName,
      logoUrl:      row.logoUrl,
      faviconUrl:   row.faviconUrl,
      primaryColor: row.primaryColor,
      footerText:   row.footerText,
      copy,
    };
  }
}
