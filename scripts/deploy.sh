#!/usr/bin/env bash
# ===========================================================================
# Hoobiq deploy script — runs on the VPS, called by GitHub Actions.
# Idempotent: every run does pull → install → build → migrate → reload.
#
# Run as the deploy user (`hoobiq`), NOT root:
#   sudo -iu hoobiq bash /var/www/hoobiq/scripts/deploy.sh
# ===========================================================================
set -euo pipefail

APP_DIR="/var/www/hoobiq"
LOG_DIR="/var/log/hoobiq"
HEALTH_API="http://127.0.0.1:4000/healthz"
HEALTH_WEB="http://127.0.0.1:3000/healthz"

# Colors for the deploy log — easier to scan when SSH'd in
G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; N='\033[0m'

log() { echo -e "${G}▶${N} $*"; }
warn() { echo -e "${Y}⚠${N} $*"; }
die() { echo -e "${R}✗${N} $*" >&2; exit 1; }

mkdir -p "$LOG_DIR"

cd "$APP_DIR" || die "App dir $APP_DIR not found — run setup-vps.sh first."

# Save current commit so we can roll back if health check fails ------------
PREV_SHA="$(git rev-parse HEAD 2>/dev/null || echo '')"
log "Current commit: ${PREV_SHA:0:7}"

# 1. Pull latest -----------------------------------------------------------
log "git pull origin main"
git fetch origin --prune
git reset --hard origin/main
NEW_SHA="$(git rev-parse HEAD)"
log "Deploying commit: ${NEW_SHA:0:7}"

# 2. Pre-deploy backup of DB (cheap insurance, ~few seconds for small DB).
# Skipped on fresh installs where pg_dump auth isn't wired yet — set
# SKIP_BACKUP=1 in the environment if you want to skip explicitly.
if command -v pg_dump >/dev/null && [[ -z "${SKIP_BACKUP:-}" ]]; then
  log "Backing up DB before migrate…"
  BACKUP_PATH="$LOG_DIR/predeploy-$(date +%Y%m%d-%H%M%S).sql.gz"
  bash "$APP_DIR/scripts/backup.sh" --no-upload --output "$BACKUP_PATH" || warn "Backup failed, continuing"
fi

# 3. Install + build -------------------------------------------------------
log "npm install (root + workspaces)…"
# --include=dev to ensure typescript / nest CLI are present for the build —
# pm2 will run the compiled dist/ output so we don't ship devDeps to runtime.
npm install --no-audit --no-fund --include=dev

log "Build types package…"
npm --workspace @hoobiq/types run build

log "Generate Prisma client…"
npm --workspace @hoobiq/db run db:generate

log "Build db package (compile @hoobiq/db src/ → dist/)…"
npm --workspace @hoobiq/db run build

log "Build api…"
npm --workspace @hoobiq/api run build

log "Build web…"
npm --workspace @hoobiq/web run build

# Next standalone needs static + public copied alongside the bundled server.
# Without these the asset paths 404 in production.
log "Stage Next standalone assets…"
WEB_STANDALONE="$APP_DIR/apps/web/.next/standalone/apps/web"
if [[ -d "$WEB_STANDALONE" ]]; then
  cp -r "$APP_DIR/apps/web/.next/static" "$WEB_STANDALONE/.next/static"
  cp -r "$APP_DIR/apps/web/public" "$WEB_STANDALONE/public" 2>/dev/null || true
fi

# 4. Run migrations --------------------------------------------------------
# Prisma reads DATABASE_URL from process env. The api .env file holds the
# canonical value — source it for this step so we don't need to duplicate
# the URL in packages/db/.env.
log "Apply Prisma migrations (deploy mode)…"
set -a
. "$APP_DIR/apps/api/.env"
set +a
cd "$APP_DIR/packages/db"
# On a fresh DB with no migrations folder yet, fall back to `db push` to sync
# the schema — migrate deploy would fail because there are no migration files.
if [[ -d migrations ]] && ls migrations/*/migration.sql >/dev/null 2>&1; then
  npx prisma migrate deploy
else
  warn "No migrations folder yet — running 'prisma db push' to sync schema."
  npx prisma db push --skip-generate --accept-data-loss
fi
cd "$APP_DIR"

# 5. Reload pm2 ------------------------------------------------------------
log "pm2 startOrReload ecosystem.config.js"
pm2 startOrReload "$APP_DIR/ecosystem.config.js" --update-env
pm2 save

# 6. Health check + auto-rollback -----------------------------------------
log "Health checks…"
sleep 3
api_ok=0; web_ok=0
for i in 1 2 3 4 5; do
  if curl -fsS --max-time 5 "$HEALTH_API" >/dev/null; then api_ok=1; fi
  if curl -fsS --max-time 5 "$HEALTH_WEB" >/dev/null; then web_ok=1; fi
  [[ $api_ok -eq 1 && $web_ok -eq 1 ]] && break
  warn "Attempt $i — api=$api_ok web=$web_ok, retrying in 3s…"
  sleep 3
done

if [[ $api_ok -eq 0 || $web_ok -eq 0 ]]; then
  warn "Health check failed — rolling back to ${PREV_SHA:0:7}"
  if [[ -n "$PREV_SHA" ]]; then
    git reset --hard "$PREV_SHA"
    # Use --include=dev so devDeps (typescript, nest CLI) are present —
    # otherwise rollback's tsc/nest invocations fail with "command not found".
    npm install --no-audit --no-fund --include=dev
    npm --workspace @hoobiq/types run build
    npm --workspace @hoobiq/db run db:generate
    npm --workspace @hoobiq/db run build || true
    npm --workspace @hoobiq/api run build
    npm --workspace @hoobiq/web run build
    pm2 startOrReload "$APP_DIR/ecosystem.config.js" --update-env
    pm2 save
    die "Rolled back to previous commit. Check pm2 logs hoobiq-api / hoobiq-web for the cause."
  else
    die "No previous commit to roll back to. Manual intervention needed."
  fi
fi

log "Deploy ${NEW_SHA:0:7} live (api ✓ web ✓)"
