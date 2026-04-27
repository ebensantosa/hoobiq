import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { IS_PUBLIC_KEY } from "../../common/decorators/public.decorator";
import { ROLES_KEY, type Role } from "../../common/decorators/roles.decorator";
import { env } from "../../config/env";
import { AuthService } from "./auth.service";

/**
 * Global-mountable auth guard. Resolves session from the signed httpOnly
 * cookie, attaches `req.user`, enforces @Roles if present. Routes marked
 * @Public() skip everything.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    const req = ctx.switchToHttp().getRequest<Request & { user?: unknown }>();
    const rawToken = req.signedCookies?.[env.SESSION_COOKIE_NAME];

    if (rawToken) {
      const user = await this.auth.resolveSession(rawToken);
      if (user) req.user = user;
    }

    if (isPublic) return true;
    if (!req.user) {
      throw new UnauthorizedException({ code: "not_authenticated", message: "Silakan masuk dulu." });
    }

    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (requiredRoles?.length) {
      const userRole = (req.user as { role: Role }).role;
      if (!requiredRoles.includes(userRole)) {
        throw new ForbiddenException({ code: "forbidden", message: "Kamu tidak berhak mengakses ini." });
      }
    }
    return true;
  }
}
