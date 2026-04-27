import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/** Opt-out of the global auth guard. Use sparingly (login, public listings, health). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
