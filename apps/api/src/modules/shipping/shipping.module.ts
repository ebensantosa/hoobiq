import { Module } from "@nestjs/common";
import { RedisModule } from "../../infrastructure/redis/redis.module";
import { ShippingController } from "./shipping.controller";
import { ShippingService } from "./shipping.service";

@Module({
  imports: [RedisModule],
  controllers: [ShippingController],
  providers: [ShippingService],
  exports: [ShippingService],
})
export class ShippingModule {}
