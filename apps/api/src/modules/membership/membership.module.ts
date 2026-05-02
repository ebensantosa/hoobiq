import { Global, Module } from "@nestjs/common";
import { MembershipController } from "./membership.controller";
import { MembershipService } from "./membership.service";

/** Global so trades / orders / boost can ask for a user's perks
 *  without listing this module everywhere. */
@Global()
@Module({
  controllers: [MembershipController],
  providers: [MembershipService],
  exports: [MembershipService],
})
export class MembershipModule {}
