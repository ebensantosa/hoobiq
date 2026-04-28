import { Module } from "@nestjs/common";
import { RedisModule } from "../../infrastructure/redis/redis.module";
import { OrdersModule } from "../orders/orders.module";
import { AdminController } from "./admin.controller";

@Module({
  imports: [OrdersModule, RedisModule],
  controllers: [AdminController],
})
export class AdminModule {}
