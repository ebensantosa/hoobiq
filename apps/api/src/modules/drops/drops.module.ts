import { Module } from "@nestjs/common";
import { DropsService } from "./drops.service";
import { DropsController } from "./drops.controller";

@Module({
  controllers: [DropsController],
  providers: [DropsService],
})
export class DropsModule {}
