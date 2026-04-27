import { Body, Controller, Get, HttpCode, NotFoundException, Param, Post } from "@nestjs/common";
import type { SessionUser } from "@hoobiq/types";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { TradesService } from "./trades.service";

@Controller("trades")
export class TradesController {
  constructor(private readonly svc: TradesService) {}

  /** Card deck for the swipe view. */
  @Get("matches")
  async matches(@CurrentUser() user: SessionUser) {
    const items = await this.svc.deck(user.id);
    return { items };
  }

  /** Swipe-left memory. */
  @Post("pass")
  @HttpCode(200)
  pass(
    @CurrentUser() user: SessionUser,
    @Body() body: { fromListingId: string; toListingId: string }
  ) {
    if (!body?.fromListingId || !body?.toListingId) {
      throw new NotFoundException({ code: "bad_input", message: "Listing pair tidak valid." });
    }
    return this.svc.pass(user.id, body.fromListingId, body.toListingId);
  }

  /** Swipe-right → create proposal. */
  @Post()
  @HttpCode(201)
  propose(
    @CurrentUser() user: SessionUser,
    @Body() body: { fromListingId: string; toListingId: string; message?: string }
  ) {
    return this.svc.propose(user.id, body);
  }

  @Get()
  list(@CurrentUser() user: SessionUser) {
    return this.svc.listMine(user.id);
  }

  @Post(":id/accept")
  @HttpCode(200)
  accept(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.svc.respond(user.id, id, "accept");
  }

  @Post(":id/decline")
  @HttpCode(200)
  decline(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.svc.respond(user.id, id, "decline");
  }

  @Post(":id/cancel")
  @HttpCode(200)
  cancel(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    return this.svc.respond(user.id, id, "cancel");
  }
}
