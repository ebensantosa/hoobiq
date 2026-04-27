import { BadRequestException, Body, Controller, HttpCode, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { z } from "zod";
import { promises as fs } from "node:fs";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import type { SessionUser } from "@hoobiq/types";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { env } from "../../config/env";

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

/**
 * Local-disk storage. Files land in `apps/api/public/uploads/<random>.<ext>`
 * and are served statically via Express. When R2 lands, swap this controller
 * for one that issues signed PUT URLs and returns the CDN URL instead — the
 * client-side contract (`{ url }`) stays the same.
 */
@Controller("uploads")
export class UploadsController {
  @Post("image")
  @Throttle({ default: { ttl: 60_000, limit: 60 } }) // 60 uploads/min/user
  @HttpCode(201)
  async upload(
    @CurrentUser() user: SessionUser,
    @Body(new ZodPipe(UploadInput)) body: z.infer<typeof UploadInput>
  ) {
    void user;
    const match = body.dataUrl.match(/^data:(image\/[a-z]+);base64,(.+)$/i);
    if (!match) throw new BadRequestException({ code: "bad_data_url", message: "Format data URL tidak valid." });
    const mime = match[1]!.toLowerCase();
    const ext = ALLOWED_MIME[mime];
    if (!ext) throw new BadRequestException({ code: "unsupported_type", message: "Format gambar tidak didukung." });

    const buf = Buffer.from(match[2]!, "base64");
    if (buf.byteLength === 0) throw new BadRequestException({ code: "empty_file", message: "File kosong." });
    if (buf.byteLength > MAX_BYTES) throw new BadRequestException({ code: "too_large", message: "Maks 5MB per file." });

    const name = `${randomBytes(12).toString("hex")}.${ext}`;
    // Resolve relative to this controller file (src/modules/uploads/ → ../../../public/uploads).
    // Same dir the static-asset middleware in main.ts serves from.
    const dir = join(__dirname, "..", "..", "..", "public", "uploads");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(join(dir, name), buf);

    const base = (env.PUBLIC_API_BASE ?? `http://localhost:${env.PORT}`).replace(/\/$/, "");
    return { url: `${base}/uploads/${name}`, bytes: buf.byteLength, mime };
  }
}
