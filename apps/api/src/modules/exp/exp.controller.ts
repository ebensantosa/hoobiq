import { Controller, Get } from "@nestjs/common";
import type { SessionUser } from "@hoobiq/types";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ExpService } from "./exp.service";

@Controller("exp")
export class ExpController {
  constructor(private readonly exp: ExpService) {}

  /** Drain pending EXP-toast entries for the current user. Returns +
   *  clears the list atomically — the client poller fires this on a
   *  short interval and surfaces each entry as a toast once. */
  @Get("recent")
  async recent(@CurrentUser() user: SessionUser) {
    return { items: await this.exp.drainToasts(user.id) };
  }
}
