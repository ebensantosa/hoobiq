import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Liveness probe. Used by the reverse proxy and the deploy script to confirm
 * the web process boots correctly after `pm2 reload`. Stays cheap — no DB,
 * no API call. Just confirms Node + Next are answering.
 */
export function GET() {
  return NextResponse.json(
    { status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() },
    { headers: { "cache-control": "no-store" } }
  );
}
