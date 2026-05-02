import { Global, Module } from "@nestjs/common";
import { MembershipController } from "./membership.controller";
import { MembershipService } from "./membership.service";
import { PaymentsModule } from "../payments/payments.module";

/** Global so trades / orders / boost can ask for a user's perks
 *  without listing this module everywhere. */
@Global()
@Module({
  imports: [PaymentsModule],
  controllers: [MembershipController],
  providers: [MembershipService],
  exports: [MembershipService],
})
export class MembershipModule {}
