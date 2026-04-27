import { Module } from "@nestjs/common";
import { DmController } from "./dm.controller";
import { DmGateway } from "./dm.gateway";

@Module({
  controllers: [DmController],
  providers: [DmGateway],
})
export class DmModule {}
