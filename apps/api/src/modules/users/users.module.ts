import { Module, forwardRef } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { EmailModule } from "../email/email.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [EmailModule, forwardRef(() => AuthModule)],
  controllers: [UsersController],
})
export class UsersModule {}
