#!/usr/bin/env bash
# ===========================================================================
# Manual deploy trigger — run from your laptop to deploy current `main` to
# the VPS without going through GitHub Actions. Useful when:
#   - Actions queue is slow and you want to ship immediately
#   - Actions is broken and you need to bypass CI
#   - You just pushed and don't want to wait for the workflow to pick up
#
# Normal flow is still: `git push origin main` → GitHub Actions auto-deploys.
# This script is the manual escape hatch.
# ===========================================================================
set -euo pipefail

VPS_USER="${VPS_USER:-root}"
VPS_HOST="${VPS_HOST:-178.238.226.212}"
APP_DIR="/var/www/hoobiq"
DEPLOY_USER="${DEPLOY_USER:-hoobiq}"

G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; N='\033[0m'
log()  { echo -e "${G}▶${N} $*"; }
warn() { echo -e "${Y}⚠${N} $*"; }
die()  { echo -e "${R}✗${N} $*" >&2; exit 1; }

# Refuse to deploy with uncommitted/unpushed work — surprises in prod are
# almost always "I forgot I had local changes".
if ! git diff --quiet || ! git diff --cached --quiet; then
  die "You have uncommitted changes. Commit or stash first."
fi

LOCAL_SHA="$(git rev-parse HEAD)"
REMOTE_SHA="$(git rev-parse '@{u}' 2>/dev/null || echo '')"
if [[ -z "$REMOTE_SHA" ]]; then
  die "Current branch has no upstream. Run: git push -u origin main"
fi
if [[ "$LOCAL_SHA" != "$REMOTE_SHA" ]]; then
  die "Local HEAD differs from origin. Push first: git push origin main"
fi

log "Deploying ${LOCAL_SHA:0:7} to ${VPS_USER}@${VPS_HOST} (runs as ${DEPLOY_USER})"
# SSH as root, drop to deploy user with `sudo -iu` so HOME/PATH/env match a
# real interactive login (otherwise pm2/npm look in the wrong $HOME and break).
ssh -o StrictHostKeyChecking=accept-new "${VPS_USER}@${VPS_HOST}" \
  "sudo -iu ${DEPLOY_USER} bash -c 'cd ${APP_DIR} && git pull && bash scripts/deploy.sh'"

log "Verifying health…"
curl -fsS --max-time 10 https://hoobiq.com/healthz     >/dev/null && log "web  ✓" || warn "web  ✗"
curl -fsS --max-time 10 https://api.hoobiq.com/healthz >/dev/null && log "api  ✓" || warn "api  ✗"

log "Done."
