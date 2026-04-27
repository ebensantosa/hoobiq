#!/usr/bin/env bash
# ===========================================================================
# Hoobiq DB backup → R2
# pg_dump → gzip → upload to R2 hoobiq-prod/backups/postgres/{YYYY-MM-DD}.sql.gz
#
# Modes:
#   bash backup.sh                    — full pipeline: dump + gzip + upload
#   bash backup.sh --no-upload        — dump + gzip only (used by deploy.sh
#                                        for pre-deploy snapshot)
#   bash backup.sh --output FILE      — dump to specific path
#
# Cron: daily at 03:30 (low-traffic) — set up by setup-vps.sh? No — install
# the cron line yourself once:
#   sudo -u hoobiq crontab -e
#   30 3 * * * bash /var/www/hoobiq/scripts/backup.sh >> /var/log/hoobiq/backup.log 2>&1
# ===========================================================================
set -euo pipefail

# Load env from .env so we get DATABASE_URL + R2 credentials
ENV_FILE="/var/www/hoobiq/apps/api/.env"
if [[ -f "$ENV_FILE" ]]; then
  set -a; . "$ENV_FILE"; set +a
fi

DATE="$(date +%Y-%m-%d_%H%M)"
DEFAULT_OUT="/var/log/hoobiq/backup-${DATE}.sql.gz"
OUTPUT="$DEFAULT_OUT"
UPLOAD=1

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-upload) UPLOAD=0; shift ;;
    --output) OUTPUT="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

mkdir -p "$(dirname "$OUTPUT")"

# 1. Dump + gzip ------------------------------------------------------------
# Strip Prisma-style query params (?schema=public) — pg_dump doesn't accept
# them in the connection URI even though the Prisma client does.
DUMP_URL="${DATABASE_URL%%\?*}"
echo "▶ pg_dump → $OUTPUT"
pg_dump --dbname="${DUMP_URL}" --no-owner --no-privileges --format=plain \
  | gzip -9 > "$OUTPUT"
SIZE="$(du -h "$OUTPUT" | cut -f1)"
echo "  size: $SIZE"

if [[ "$UPLOAD" -eq 0 ]]; then
  echo "✓ Dump saved to $OUTPUT (no upload)"
  exit 0
fi

# 2. Upload to R2 -----------------------------------------------------------
# Using AWS CLI with R2-compatible config. Install once:
#   apt install awscli
#   aws configure --profile r2
#     Access Key:  $R2_ACCESS_KEY
#     Secret Key:  $R2_SECRET_KEY
#     Region:      auto
#     Output:      json
# Then this script picks it up via --profile r2 + --endpoint-url.
if ! command -v aws >/dev/null; then
  echo "✗ aws cli not installed — apt install awscli"
  exit 1
fi

R2_ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
KEY="backups/postgres/${DATE}.sql.gz"

echo "▶ Upload to R2 ${R2_BUCKET}/${KEY}"
AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY" \
AWS_SECRET_ACCESS_KEY="$R2_SECRET_KEY" \
aws s3 cp "$OUTPUT" "s3://${R2_BUCKET}/${KEY}" \
  --endpoint-url "$R2_ENDPOINT" \
  --region auto

# 3. Retention — keep last 30 daily backups, delete older -------------------
# We use a sliding window keyed by date prefix. R2 has lifecycle rules in the
# dashboard too — feel free to use those instead and remove this block.
echo "▶ Pruning local backups older than 7 days…"
find /var/log/hoobiq -name "backup-*.sql.gz" -mtime +7 -delete 2>/dev/null || true

echo "✓ Backup uploaded: ${R2_BUCKET}/${KEY} ($SIZE)"
