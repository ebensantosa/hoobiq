import { Injectable, Logger } from "@nestjs/common";
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../../config/env";

/**
 * Gmail SMTP delivery for transactional emails (order updates, KTP
 * results, password change, dispute decisions, etc).
 *
 * Auth: Google App Password — generate at
 *   myaccount.google.com → Security → 2-Step Verification → App passwords.
 * Plain account password no longer works for SMTP since 2022.
 *
 * Env required for sending:
 *   SMTP_USER  = sender@gmail.com
 *   SMTP_PASS  = 16-char app password
 *   EMAIL_FROM = "Hoobiq <notif@hoobiq.id>"   (optional, defaults to SMTP_USER)
 *
 * If SMTP_USER / SMTP_PASS are unset (dev), the service logs the email
 * to stdout instead of throwing. Production deploys must set them.
 */
@Injectable()
export class EmailService {
  private readonly log = new Logger(EmailService.name);
  private transporter: Transporter | null = null;

  private get isConfigured(): boolean {
    return !!(env.SMTP_USER && env.SMTP_PASS);
  }

  private getTransporter(): Transporter | null {
    if (!this.isConfigured) return null;
    if (this.transporter) return this.transporter;
    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
    return this.transporter;
  }

  /**
   * Send an HTML email. Best-effort: SMTP failures are logged but never
   * thrown to callers. Caller code (Notification creation, KTP flip) is
   * authoritative; email is a nice-to-have on top.
   */
  async send(to: string, subject: string, html: string, text?: string): Promise<void> {
    const t = this.getTransporter();
    if (!t) {
      this.log.warn(`[email-stub] To: ${to} | ${subject}`);
      return;
    }
    try {
      await t.sendMail({
        from: env.EMAIL_FROM ?? env.SMTP_USER,
        to,
        subject,
        html,
        text: text ?? stripHtml(html),
      });
    } catch (e) {
      this.log.error(`Email send failed (${to}): ${(e as Error).message}`);
    }
  }
}

/** Naive HTML → text fallback for clients that prefer plain text. */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
