import { Module } from "@nestjs/common";
import { BoostController } from "./boost.controller";
import { BoostService } from "./boost.service";
import { PaymentsModule } from "../payments/payments.module";

@Module({
  imports: [PaymentsModule],
  controllers: [BoostController],
  providers: [BoostService],
  exports: [BoostService],
})
export class BoostModule {}
