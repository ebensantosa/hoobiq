#!/usr/bin/env node
/**
 * One-shot dev bootstrap, idempotent. Runs on `npm run dev` before the
 * servers start:
 *   1. Ensures apps/api/.env and apps/web/.env.local exist (with auto secrets)
 *   2. Runs `prisma db push` so the SQLite file is always in sync with schema
 *   3. Seeds baseline data if the DB is empty
 *
 * Safe to re-run anytime — never overwrites existing files or data.
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const cyan   = (s) => `\x1b[36m${s}\x1b[0m`;
const green  = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const bold   = (s) => `\x1b[1m${s}\x1b[0m`;

function rand(bytes = 48) {
  return randomBytes(bytes).toString("base64");
}

function ensureFile(path, contents) {
  if (existsSync(path)) return false;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
  return true;
}

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: "inherit", cwd: ROOT, ...opts });
}

console.log(bold(cyan("\n→ Hoobiq dev setup\n")));

/* ---------- 1. .env files ---------- */

const dbDir = join(ROOT, "packages/db/prisma");
mkdirSync(dbDir, { recursive: true });
const sqlitePath = join(dbDir, "dev.db").replace(/\\/g, "/");

const apiEnv = `NODE_ENV=development
PORT=4000

DATABASE_URL="file:${sqlitePath}"
REDIS_URL="redis://localhost:6379"

SESSION_COOKIE_NAME=hbq_session
SESSION_SECRET=${rand(48)}
SESSION_TTL_DAYS=30
PASSWORD_PEPPER=${rand(24)}
CSRF_SECRET=${rand(48)}

WEB_ORIGIN=http://localhost:3000
ADMIN_ORIGIN=http://localhost:3001
`;

if (ensureFile(join(ROOT, "apps/api/.env"), apiEnv)) {
  console.log(green("  ✓") + " generated apps/api/.env with random secrets");
} else {
  console.log("  · apps/api/.env exists, leaving alone");
}

// Also put DATABASE_URL in the db package env so `prisma db push` picks it up
const dbEnv = `DATABASE_URL="file:${sqlitePath}"\n`;
if (ensureFile(join(ROOT, "packages/db/.env"), dbEnv)) {
  console.log(green("  ✓") + " generated packages/db/.env");
}

const webEnv = `NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1\n`;
if (ensureFile(join(ROOT, "apps/web/.env.local"), webEnv)) {
  console.log(green("  ✓") + " generated apps/web/.env.local");
}

/* ---------- 2. Prisma generate + push ---------- */

console.log(cyan("\n→ Syncing database schema"));
try {
  run("npx --workspace @hoobiq/db prisma generate", { cwd: ROOT });
  run("npx --workspace @hoobiq/db prisma db push --skip-generate --accept-data-loss", { cwd: ROOT });
  console.log(green("  ✓") + " prisma schema in sync");
} catch (e) {
  console.error(yellow("  ! prisma failed — continuing, API may not start"));
  console.error(e.message);
}

/* ---------- 3. Seed if empty ---------- */

console.log(cyan("\n→ Seeding baseline data (if empty)"));
try {
  // Always attempt seed. Seed script itself is idempotent (upsert).
  run("npx tsx packages/db/prisma/seed.ts");
  console.log(green("  ✓") + " seed applied");
  console.log("    " + yellow("demo admin:")  + "  admin@hoobiq.com   / Admin123!");
  console.log("    " + yellow("demo seller:") + " aditya@hoobiq.com / Demo1234!");
} catch (e) {
  console.error(yellow("  ! seed failed: ") + e.message);
}

console.log(bold(green("\n✓ Setup complete\n")));
