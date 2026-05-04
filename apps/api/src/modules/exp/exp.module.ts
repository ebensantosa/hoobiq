import { Global, Module } from "@nestjs/common";
import { ExpService } from "./exp.service";
import { ExpController } from "./exp.controller";

/**
 * Global so any module that wants to award EXP can inject ExpService
 * without listing it in every imports array. EXP is cross-cutting
 * (posts, listings, orders, reviews, swipes all grant it) so a global
 * provider beats the boilerplate of explicit cross-module imports.
 */
@Global()
@Module({
  controllers: [ExpController],
  providers: [ExpService],
  exports: [ExpService],
})
export class ExpModule {}
