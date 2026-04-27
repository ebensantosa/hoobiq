import { Module } from "@nestjs/common";
import { FloorService } from "./floor.service";
import { FloorController } from "./floor.controller";
import { FloorGateway } from "./floor.gateway";

@Module({
  controllers: [FloorController],
  providers: [FloorService, FloorGateway],
})
export class FloorModule {}
