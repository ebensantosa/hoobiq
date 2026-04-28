import { BadRequestException, Body, Controller, HttpCode, Param, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { z } from "zod";
import { promises as fs } from "node:fs";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import type { SessionUser } from "@hoobiq/types";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { env } from "../../config/env";
import { R2Service } from "./r2.service";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB cap per upload — matches client validators.

const ALLOWED_MIME: Record<string, string> = {
  "image/png":  "png",
  "image/jpeg": "jpg",
  "image/jpg":  "jpg",
  "image/webp": "webp",
  "image/gif":  "gif",
};

const UploadInput = z.object({
  /** data:image URI from FileReader.readAsDataURL — same format the form already produces. */
  dataUrl: z
    .string()
    .regex(/^data:image\/(png|jpe?g|webp|gif);base64,/i, "Harus data:image/* base64."),
});

const ALLOWED_KINDS = ["listings", "avatars", "evidence", "posts", "branding", "misc"] as const;
type UploadKind = (typeof ALLOWED_KINDS)[number];

/**
 * Two storage backends, picked at runtime:
 *
 *  - Production: R2 (when R2_ACCOUNT_ID etc. are set in env). Files go to
 *    cdn.hoobiq.com behind Cloudflare's edge cache. Key prefix matches the
 *    upload "kind" (listings, avatars, evidence, posts, misc).
 *
 *  - Dev: local disk under apps/api/public/uploads/ — same as before, served
 *    by the static-asset middleware in main.ts.
 *
 * The wire contract stays the same — `{ url, bytes, mime }` — so the web
 * client doesn't care which backend served it.
 */
@Controller("uploads")
export class UploadsController {
  constructor(private readonly r2: R2Service) {}

  /**
   * Backwards-compatible endpoint — defaults to "misc" prefix in R2 / flat
   * directory on disk. Existing callers (web image-upload component) hit
   * this; they can migrate to the kinded variant below at their own pace.
   */
  @Post("image")
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @HttpCode(201)
  upload(@CurrentUser() user: SessionUser, @Body(new ZodPipe(UploadInput)) body: z.infer<typeof UploadInput>) {
    return this.handle(user, "misc", body);
  }

  /**
   * New kinded endpoint — POST /uploads/image/:kind where kind ∈
   * listings | avatars | evidence | posts | misc. Same payload as above.
   * Used so we can apply per-kind retention/cleanup later (e.g., evidence
   * retained 90 days, listings forever).
   */
  @Post("image/:kind")
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @HttpCode(201)
  uploadKind(
    @CurrentUser() user: SessionUser,
    @Param("kind") kind: string,
    @Body(new ZodPipe(UploadInput)) body: z.infer<typeof UploadInput>
  ) {
    if (!(ALLOWED_KINDS as readonly string[]).includes(kind)) {
      throw new BadRequestException({ code: "bad_kind", message: "kind tidak valid." });
    }
    return this.handle(user, kind as UploadKind, body);
  }

  private async handle(user: SessionUser, kind: UploadKind, body: { dataUrl: string }) {
    const match = body.dataUrl.match(/^data:(image\/[a-z]+);base64,(.+)$/i);
    if (!match) throw new BadRequestException({ code: "bad_data_url", message: "Format data URL tidak valid." });
    const mime = match[1]!.toLowerCase();
    const ext = ALLOWED_MIME[mime];
    if (!ext) throw new BadRequestException({ code: "unsupported_type", message: "Format gambar tidak didukung." });

    const buf = Buffer.from(match[2]!, "base64");
    if (buf.byteLength === 0) throw new BadRequestException({ code: "empty_file", message: "File kosong." });
    if (buf.byteLength > MAX_BYTES) throw new BadRequestException({ code: "too_large", message: "Maks 5MB per file." });

    const filename = `${randomBytes(12).toString("hex")}.${ext}`;

    if (this.r2.isConfigured()) {
      // For R2 we still namespace by user id so it's easy to clean orphans
      // by user later (e.g., GDPR delete). Final key looks like:
      //   listings/{userId}/{filename}
      const key = `${kind}/${user.id}/${filename}`;
      const url = await this.r2.putObject(key, buf, mime);
      return { url, bytes: buf.byteLength, mime };
    }

    // Dev fallback: local disk — same dir the static middleware in main.ts serves.
    const dir = join(__dirname, "..", "..", "..", "public", "uploads");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(join(dir, filename), buf);
    const base = (env.PUBLIC_API_BASE ?? `http://localhost:${env.PORT}`).replace(/\/$/, "");
    return { url: `${base}/uploads/${filename}`, bytes: buf.byteLength, mime };
  }
}
