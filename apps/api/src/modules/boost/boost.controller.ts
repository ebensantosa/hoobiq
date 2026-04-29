import { Body, Controller, Get, NotFoundException, Param, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { z } from "zod";
import type { SessionUser } from "@hoobiq/types";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { BoostService } from "./boost.service";

const BuyInput = z.object({
  tierId: z.string().min(1).max(40),
});

@Controller("listings/:listingId/boost")
export class BoostController {
  constructor(
    private readonly boost: BoostService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Get()
  async info(@Param("listingId") listingId: string) {
    const status = await this.boost.statusFor(listingId);
    return { tiers: this.boost.tiers(), status };
  }

  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  async buy(
    @CurrentUser() user: SessionUser,
    @Param("listingId") listingId: string,
    @Body(new ZodPipe(BuyInput)) body: z.infer<typeof BuyInput>,
  ) {
    // Pull contact info from the user record — Snap requires it.
    const u = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true, name: true, username: true, phone: true },
    });
    if (!u) throw new NotFoundException({ code: "not_found", message: "User tidak ditemukan." });
    return this.boost.buy(user.id, listingId, body.tierId, {
      email: u.email,
      name: u.name ?? u.username,
      phone: u.phone ?? "",
    });
  }
}
