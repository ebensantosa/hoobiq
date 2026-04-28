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

  /**
   * Tinder-style swipe. Right-swipes may auto-create a TradeProposal if
   * the target owner has previously right-swiped one of our tradeable
   * listings — see TradesService.swipe.
   */
  @Post("swipe")
  @HttpCode(200)
  swipe(
    @CurrentUser() user: SessionUser,
    @Body() body: { listingId: string; direction: "right" | "left" }
  ) {
    if (!body?.listingId || (body.direction !== "right" && body.direction !== "left")) {
      throw new NotFoundException({ code: "bad_input", message: "Swipe tidak valid." });
    }
    return this.svc.swipe(user.id, body.listingId, body.direction);
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
