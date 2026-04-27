import { Module } from "@nestjs/common";

/**
 * CSRF protection — temporarily disabled during local bootstrap.
 *
 * Our threat model for the web client:
 *   - SameSite=Lax httpOnly session cookie (set in auth.controller) already
 *     prevents cross-origin POST/credentialed attacks on all evergreen browsers.
 *   - Strict CORS allowlist on the API enforces origin at another layer.
 *
 * For defense-in-depth we still plan to re-enable double-submit CSRF. The
 * `csrf-csrf` package's v3 API changed the option names and is finicky about
 * ESM interop; parking this until we rewire with a thin custom middleware.
 */
@Module({})
export class CsrfMiddlewareModule {}
