import { Controller, Get } from "@nestjs/common";
import { Public } from "../../common/decorators/public.decorator";
import { FloorService } from "./floor.service";

@Controller("floor")
export class FloorController {
  constructor(private readonly svc: FloorService) {}

  /** Initial snapshot for the ticker. Live updates flow over Socket.IO. */
  @Public()
  @Get()
  current() {
    return { pills: this.svc.current() };
  }
}
