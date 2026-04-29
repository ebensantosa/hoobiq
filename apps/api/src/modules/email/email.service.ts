import { Injectable, Logger } from "@nestjs/common";
import { Resend } from "resend";
import { env } from "../../config/env";

/**
 * Resend transactional email. Free tier is ~3k/month so we only send for
 * milestone events (paid, shipped, refunded, KTP decision, dispute
 * resolved, password changed, payout decision) — see OrdersService.notify
 * `important` flag and the explicit calls in users/auth/payouts.
 *
 * Setup:
 *   1. Sign up at resend.com → verify the sender domain (e.g. hoobiq.id).
 *   2. Generate API key at resend.com/api-keys.
 *   3. Set RESEND_API_KEY + EMAIL_FROM in apps/api/.env, then `pm2 reload`.
 *
 * If RESEND_API_KEY is unset (dev), the service logs the email instead of
 * throwing. Email failures are best-effort — never thrown to callers.
 */
@Injectable()
export class EmailService {
  private readonly log = new Logger(EmailService.name);
  private client: Resend | null = null;

  private getClient(): Resend | null {
    if (!env.RESEND_API_KEY) return null;
    if (this.client) return this.client;
    this.client = new Resend(env.RESEND_API_KEY);
    return this.client;
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    const c = this.getClient();
    if (!c) {
      this.log.warn(`[email-stub] To: ${to} | ${subject}`);
      return;
    }
    try {
      const result = await c.emails.send({
        from: env.EMAIL_FROM ?? "Hoobiq <notif@hoobiq.id>",
        to,
        subject,
        html,
      });
      if (result.error) {
        this.log.error(`Resend error to ${to}: ${result.error.message}`);
      }
    } catch (e) {
      this.log.error(`Resend send threw (${to}): ${(e as Error).message}`);
    }
  }
}
