import { Controller, Delete, Get, HttpCode, NotFoundException, Param, Post, Query, UnauthorizedException } from "@nestjs/common";
import type { SessionUser } from "@hoobiq/types";
import { Public } from "../../common/decorators/public.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { DropsService } from "./drops.service";

@Controller("drops")
export class DropsController {
  constructor(private readonly svc: DropsService) {}

  @Public()
  @Get("upcoming")
  upcoming(@CurrentUser() user: SessionUser | undefined) {
    return this.svc.upcoming(user?.id ?? null);
  }

  /** /drops/calendar?ym=2026-04 */
  @Public()
  @Get("calendar")
  async calendar(
    @CurrentUser() user: SessionUser | undefined,
    @Query("ym") ym?: string
  ) {
    const m = (ym ?? "").match(/^(\d{4})-(\d{2})$/);
    const now = new Date();
    const year  = m ? Number(m[1]) : now.getUTCFullYear();
    const month = m ? Number(m[2]) : now.getUTCMonth() + 1;
    if (month < 1 || month > 12) {
      throw new NotFoundException({ code: "bad_month", message: "Bulan tidak valid." });
    }
    return { year, month, items: await this.svc.month(user?.id ?? null, year, month) };
  }

  @Public()
  @Get(":slug")
  detail(@CurrentUser() user: SessionUser | undefined, @Param("slug") slug: string) {
    return this.svc.detail(user?.id ?? null, slug);
  }

  @Post(":id/remind")
  @HttpCode(200)
  remind(@CurrentUser() user: SessionUser | undefined, @Param("id") id: string) {
    if (!user) throw new UnauthorizedException({ code: "unauthorized", message: "Login dulu untuk pasang reminder." });
    return this.svc.setReminder(user.id, id);
  }

  @Delete(":id/remind")
  @HttpCode(200)
  unremind(@CurrentUser() user: SessionUser | undefined, @Param("id") id: string) {
    if (!user) throw new UnauthorizedException({ code: "unauthorized", message: "Login dulu." });
    return this.svc.clearReminder(user.id, id);
  }
}
