import { Global, Module } from "@nestjs/common";
import { EmailService } from "./email.service";

/**
 * Globally available email transport — any module can `@Inject` the
 * service without re-importing the module. Marked @Global so order/dm/
 * users modules don't all need EmailModule in their imports.
 */
@Global()
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
