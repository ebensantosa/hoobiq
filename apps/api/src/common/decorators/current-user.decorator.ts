import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import type { SessionUser } from "@hoobiq/types";

export type AuthedRequest = Request & { user?: SessionUser };

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SessionUser | undefined => {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    return req.user;
  }
);
