import { Module } from "@nestjs/common";
import { PayoutsController } from "./payouts.controller";
import { EmailModule } from "../email/email.module";

@Module({
  imports: [EmailModule],
  controllers: [PayoutsController],
})
export class PayoutsModule {}
