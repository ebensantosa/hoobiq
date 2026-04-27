#!/usr/bin/env bash
# ===========================================================================
# Hoobiq — one-shot VPS bootstrap script
# Run ONCE on a fresh Ubuntu 22.04 / 24.04 VPS as root.
#
# Usage:
#   ssh root@VPS_IP
#   curl -fsSL https://raw.githubusercontent.com/ebensantosa/hoobiq/main/scripts/setup-vps.sh | bash
# OR (if repo is private — recommended):
#   scp scripts/setup-vps.sh root@VPS_IP:/root/
#   ssh root@VPS_IP "bash /root/setup-vps.sh"
#
# What it does:
#   1. apt update + install curl, git, ufw, fail2ban, build deps
#   2. Install Node 20 (NodeSource), npm, pnpm
#   3. Install Postgres 16 + create db `hoobiq` + user `hoobiq`
#   4. Install Redis 7
#   5. Install Meilisearch as a systemd service
#   6. Install pm2 globally (run as deploy user)
#   7. Install Caddy (reverse proxy + auto-TLS from Let's Encrypt)
#   8. Configure ufw firewall (allow 22, 80, 443; deny rest)
#   9. Create deploy user `hoobiq` with the same authorized_keys as root
#  10. Create /var/www/hoobiq directory owned by `hoobiq`
#  11. Clone the repo (anon clone — repo must be public OR use deploy key)
#  12. Print credentials + next steps
#
# Idempotent — safe to re-run; it skips work that's already done.
# ===========================================================================
set -euo pipefail

# ----- 0. Sanity checks ----------------------------------------------------
if [[ $EUID -ne 0 ]]; then
  echo "❌ Run as root: sudo bash setup-vps.sh"
  exit 1
fi

. /etc/os-release
if [[ "$ID" != "ubuntu" ]]; then
  echo "⚠️  This script targets Ubuntu. Your distro: $ID — proceeding anyway."
fi

REPO_URL="${REPO_URL:-https://github.com/ebensantosa/hoobiq.git}"
DEPLOY_USER="hoobiq"
APP_DIR="/var/www/hoobiq"
DB_NAME="hoobiq"
DB_USER="hoobiq"
DB_PASS="$(openssl rand -base64 24 | tr -d '=+/' | head -c 24)"
MEILI_KEY="$(openssl rand -base64 32 | tr -d '=+/' | head -c 32)"

echo "==========================================================================="
echo "Hoobiq VPS Setup"
echo "Repo: $REPO_URL"
echo "App dir: $APP_DIR"
echo "==========================================================================="

# ----- 1. System packages --------------------------------------------------
echo "▶ apt update + base packages…"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq \
  curl wget git ca-certificates gnupg lsb-release \
  build-essential software-properties-common \
  ufw fail2ban unzip rsync jq

# ----- 2. Node 20 ----------------------------------------------------------
if ! command -v node >/dev/null || [[ "$(node --version)" != v20* ]]; then
  echo "▶ Installing Node 20…"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
fi
echo "  Node: $(node --version), npm: $(npm --version)"

# ----- 3. Postgres 16 ------------------------------------------------------
if ! command -v psql >/dev/null; then
  echo "▶ Installing Postgres 16…"
  install -d /usr/share/postgresql-common/pgdg
  curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc
  echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
    > /etc/apt/sources.list.d/pgdg.list
  apt-get update -qq
  apt-get install -y -qq postgresql-16 postgresql-client-16
  systemctl enable --now postgresql
fi

# Create db + user (idempotent)
echo "▶ Postgres: creating db/user…"
sudo -u postgres psql <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$DB_USER') THEN
    CREATE ROLE $DB_USER WITH LOGIN PASSWORD '$DB_PASS';
  ELSE
    ALTER ROLE $DB_USER WITH LOGIN PASSWORD '$DB_PASS';
  END IF;
END
\$\$;
SQL
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 \
  || sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"

# ----- 4. Redis ------------------------------------------------------------
if ! command -v redis-server >/dev/null; then
  echo "▶ Installing Redis…"
  apt-get install -y -qq redis-server
  systemctl enable --now redis-server
fi

# ----- 5. Meilisearch ------------------------------------------------------
if ! command -v meilisearch >/dev/null; then
  echo "▶ Installing Meilisearch…"
  curl -fsSL https://install.meilisearch.com | sh
  mv ./meilisearch /usr/local/bin/

  # Run as a dedicated user without shell access
  id meili &>/dev/null || useradd -r -s /bin/false -d /var/lib/meilisearch meili
  install -d -o meili -g meili /var/lib/meilisearch /var/log/meilisearch

  cat >/etc/systemd/system/meilisearch.service <<UNIT
[Unit]
Description=Meilisearch
After=network.target

[Service]
Type=simple
User=meili
Group=meili
ExecStart=/usr/local/bin/meilisearch \\
  --db-path /var/lib/meilisearch/data \\
  --http-addr 127.0.0.1:7700 \\
  --env production \\
  --master-key "$MEILI_KEY"
Restart=on-failure

[Install]
WantedBy=multi-user.target
UNIT

  systemctl daemon-reload
  systemctl enable --now meilisearch
fi

# ----- 6. Caddy ------------------------------------------------------------
if ! command -v caddy >/dev/null; then
  echo "▶ Installing Caddy…"
  install -d /usr/share/keyrings
  curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq
  apt-get install -y -qq caddy
  systemctl enable caddy
fi

# ----- 7. pm2 (global) -----------------------------------------------------
if ! command -v pm2 >/dev/null; then
  echo "▶ Installing pm2 globally…"
  npm install -g pm2@latest
fi

# ----- 8. Deploy user ------------------------------------------------------
if ! id "$DEPLOY_USER" &>/dev/null; then
  echo "▶ Creating deploy user '$DEPLOY_USER'…"
  useradd -m -s /bin/bash "$DEPLOY_USER"
  # Mirror root's authorized_keys so the same SSH key works
  install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" -m 700 "/home/$DEPLOY_USER/.ssh"
  if [[ -f /root/.ssh/authorized_keys ]]; then
    cp /root/.ssh/authorized_keys "/home/$DEPLOY_USER/.ssh/authorized_keys"
    chown "$DEPLOY_USER:$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh/authorized_keys"
    chmod 600 "/home/$DEPLOY_USER/.ssh/authorized_keys"
  fi
  # Allow sudo for systemctl restart caddy etc. without password — narrow scope.
  cat >/etc/sudoers.d/hoobiq <<SUDO
$DEPLOY_USER ALL=(ALL) NOPASSWD: /bin/systemctl reload caddy, /bin/systemctl restart caddy, /bin/systemctl status caddy
SUDO
  chmod 440 /etc/sudoers.d/hoobiq
fi

# ----- 9. App directory ----------------------------------------------------
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APP_DIR"
if [[ ! -d "$APP_DIR/.git" ]]; then
  echo "▶ Cloning repo…"
  sudo -u "$DEPLOY_USER" git clone "$REPO_URL" "$APP_DIR"
fi

# ----- 10. Firewall --------------------------------------------------------
echo "▶ Configuring ufw firewall…"
ufw --force reset >/dev/null
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw allow OpenSSH >/dev/null
ufw allow 80/tcp comment "HTTP for Caddy" >/dev/null
ufw allow 443/tcp comment "HTTPS for Caddy" >/dev/null
ufw --force enable

# ----- 11. fail2ban (basic SSH protection) ---------------------------------
echo "▶ Configuring fail2ban…"
cat >/etc/fail2ban/jail.local <<'JAIL'
[sshd]
enabled = true
port    = ssh
filter  = sshd
logpath = %(sshd_log)s
backend = systemd
maxretry = 5
bantime = 1h
findtime = 10m
JAIL
systemctl enable --now fail2ban
systemctl restart fail2ban

# ----- 12. Save credentials to a root-only file ----------------------------
CRED_FILE="/root/hoobiq-credentials.txt"
cat >"$CRED_FILE" <<CRED
=== Hoobiq VPS credentials — generated $(date -Is) ===

DATABASE_URL="postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME?schema=public"

MEILI_MASTER_KEY=$MEILI_KEY
MEILI_HTTP_ADDR=127.0.0.1:7700

App dir:      $APP_DIR
Deploy user:  $DEPLOY_USER (sudo: caddy reload only)
Repo:         $REPO_URL
CRED
chmod 600 "$CRED_FILE"

echo
echo "==========================================================================="
echo "✅ VPS bootstrap complete"
echo "==========================================================================="
echo
echo "📋 Credentials saved to: $CRED_FILE  (chmod 600, root-only)"
echo
echo "▶ Next steps (run these manually):"
echo "  1. Copy production env templates:"
echo "       sudo -u $DEPLOY_USER cp $APP_DIR/apps/api/.env.production.example $APP_DIR/apps/api/.env"
echo "       sudo -u $DEPLOY_USER cp $APP_DIR/apps/web/.env.production.example $APP_DIR/apps/web/.env"
echo
echo "  2. Edit them with real values (especially R2_ACCESS_KEY/SECRET, DB_URL from above):"
echo "       sudo -u $DEPLOY_USER nano $APP_DIR/apps/api/.env"
echo
echo "  3. Generate secrets:"
echo "       openssl rand -base64 48     # for SESSION_SECRET, CSRF_SECRET"
echo "       openssl rand -base64 24     # for PASSWORD_PEPPER"
echo
echo "  4. Configure Caddy:"
echo "       cp $APP_DIR/Caddyfile /etc/caddy/Caddyfile"
echo "       systemctl restart caddy"
echo
echo "  5. First deploy:"
echo "       sudo -iu $DEPLOY_USER bash $APP_DIR/scripts/deploy.sh"
echo
echo "  6. (Optional) Lock down SSH (disable password auth):"
echo "       bash $APP_DIR/scripts/secure-vps.sh"
echo
echo "==========================================================================="
