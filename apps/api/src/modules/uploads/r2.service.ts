import { Injectable, Logger } from "@nestjs/common";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "../../config/env";

/**
 * R2 (Cloudflare's S3-compatible storage). When R2 env vars are present we
 * upload there; otherwise we fall back to local-disk storage (dev mode).
 *
 * Key prefix structure (matches the Hoobiq folder convention):
 *   listings/{listingId}/{filename}
 *   avatars/{userId}/{filename}
 *   evidence/{orderId}/{filename}
 *   posts/{postId}/{filename}
 *   misc/{filename}
 *
 * Public URL is built from R2_PUBLIC_URL (custom domain like cdn.hoobiq.com)
 * — we do NOT use the internal r2.cloudflarestorage.com URL because that's
 * the auth-required S3 endpoint, not a public CDN URL.
 */
@Injectable()
export class R2Service {
  private readonly log = new Logger("R2Service");
  private readonly client: S3Client | null;

  constructor() {
    if (this.isConfigured()) {
      this.client = new S3Client({
        region: "auto",
        endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: env.R2_ACCESS_KEY!,
          secretAccessKey: env.R2_SECRET_KEY!,
        },
      });
      this.log.log(`R2 enabled — bucket=${env.R2_BUCKET}, public=${env.R2_PUBLIC_URL}`);
    } else {
      this.client = null;
      this.log.warn("R2 not configured — uploads will fall back to local disk");
    }
  }

  isConfigured(): boolean {
    return Boolean(
      env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY && env.R2_SECRET_KEY && env.R2_BUCKET && env.R2_PUBLIC_URL
    );
  }

  /**
   * Upload a buffer to R2 under the given key. Returns the public URL.
   * Caller is responsible for choosing the key prefix (listings/, avatars/, ...).
   */
  async putObject(key: string, body: Buffer, contentType: string): Promise<string> {
    if (!this.client) throw new Error("R2 client not configured");
    const safeKey = key.replace(/^\/+/, "");
    await this.client.send(
      new PutObjectCommand({
        Bucket: env.R2_BUCKET!,
        Key: safeKey,
        Body: body,
        ContentType: contentType,
        // R2 honors CacheControl. 30 days is fine for user-generated images
        // since key uniqueness (random suffix) makes versioning trivial.
        CacheControl: "public, max-age=2592000, immutable",
      })
    );
    return `${env.R2_PUBLIC_URL!.replace(/\/$/, "")}/${safeKey}`;
  }
}
