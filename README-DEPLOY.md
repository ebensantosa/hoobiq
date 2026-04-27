# Hoobiq — Deployment Runbook

Single VPS, bare metal, GitHub Actions auto-deploy.

```
GitHub  →  GitHub Actions  →  ssh hoobiq@VPS  →  /var/www/hoobiq/scripts/deploy.sh
                                                       │
                                                       ├─ git pull
                                                       ├─ npm install / build
                                                       ├─ prisma migrate deploy
                                                       └─ pm2 reload (zero-downtime)

VPS internals
─────────────
Caddy  :443 ─── reverse proxy ───┬──► pm2 hoobiq-web  :3000  (Next.js standalone)
                                  └──► pm2 hoobiq-api  :4000  (NestJS)
                                          ↓
                                       Postgres :5432
                                       Redis    :6379
                                       Meili    :7700
```

## First-time setup (one-shot, ~30 minutes)

### 0. DNS — Cloudflare

In Cloudflare dashboard for `hoobiq.com`, add:

| Type | Name | Content | Proxy |
|---|---|---|---|
| A | `@` | `178.238.226.212` | ✅ Proxied |
| A | `api` | `178.238.226.212` | ✅ Proxied |
| A | `www` | `178.238.226.212` | ✅ Proxied |
| CNAME | `cdn` | (auto-set by R2 Connect Domain) | ✅ Proxied |

In SSL/TLS settings: **Full (strict)** — ✅ required, otherwise Caddy ↔ Cloudflare gets a redirect loop.

### 1. R2 — Connect custom domain

Cloudflare → R2 → bucket `hoobiq-prod` → Settings → **Public Access** → **Connect Domain** → enter `cdn.hoobiq.com`.

### 2. Bootstrap VPS

From your laptop:

```bash
scp scripts/setup-vps.sh root@178.238.226.212:/root/
ssh root@178.238.226.212 "bash /root/setup-vps.sh"
```

The script installs everything (Postgres, Redis, Meili, Node, pm2, Caddy, ufw, fail2ban) and creates the deploy user `hoobiq`. It saves auto-generated DB password and Meili master key to `/root/hoobiq-credentials.txt`.

### 3. Configure secrets on VPS

```bash
ssh root@178.238.226.212

# View generated credentials
cat /root/hoobiq-credentials.txt

# Generate session secrets
echo "SESSION_SECRET=$(openssl rand -base64 48)"
echo "CSRF_SECRET=$(openssl rand -base64 48)"
echo "PASSWORD_PEPPER=$(openssl rand -base64 24)"
```

Switch to deploy user and edit env files:

```bash
sudo -iu hoobiq
cd /var/www/hoobiq

cp apps/api/.env.production.example apps/api/.env
cp apps/web/.env.production.example apps/web/.env

nano apps/api/.env  # paste the values above + R2 keys + Midtrans/Komerce
nano apps/web/.env  # usually fine as-is
```

### 4. Caddy config

Still as root:

```bash
cp /var/www/hoobiq/Caddyfile /etc/caddy/Caddyfile
systemctl restart caddy
journalctl -u caddy -f  # watch TLS cert request
```

Caddy will auto-issue Let's Encrypt cert in ~30 seconds. Test:

```bash
curl https://hoobiq.com/healthz       # should return Caddy 502 — Next not running yet
curl https://api.hoobiq.com/healthz   # should return Caddy 502 — API not running yet
```

502 is fine — means TLS works, just no upstream yet.

### 5. First deploy

```bash
sudo -iu hoobiq
bash /var/www/hoobiq/scripts/deploy.sh
```

This pulls main, builds everything, runs migrations, starts pm2.

After this:

```bash
curl https://hoobiq.com/healthz       # → {"status":"ok",...}
curl https://api.hoobiq.com/healthz   # → {"status":"ok",...}
```

🎉 **Site live.**

### 6. pm2 — auto-start on reboot

```bash
sudo pm2 startup systemd -u hoobiq --hp /home/hoobiq
# Run the command it prints, then:
sudo -iu hoobiq pm2 save
```

### 7. Set up GitHub Actions (auto-deploy)

On your laptop, generate a separate SSH key for GitHub Actions (don't reuse personal one):

```bash
ssh-keygen -t ed25519 -f ~/.ssh/hoobiq_actions -C "github-actions-hoobiq" -N ""
cat ~/.ssh/hoobiq_actions.pub
```

Add the public key to the **deploy user** on VPS (not root):

```bash
ssh root@178.238.226.212
sudo -u hoobiq tee -a /home/hoobiq/.ssh/authorized_keys < <(echo 'PASTE_PUBLIC_KEY_HERE')
```

In GitHub repo → **Settings → Secrets and variables → Actions → New secret**:

| Name | Value |
|---|---|
| `VPS_HOST` | `178.238.226.212` |
| `VPS_SSH_KEY` | content of `~/.ssh/hoobiq_actions` (the **private** key, full file) |

Test: push a small change to main:

```bash
git commit --allow-empty -m "chore: trigger deploy"
git push origin main
```

Watch progress: GitHub repo → **Actions** tab.

### 8. Daily backup — cron

```bash
# Install AWS CLI for R2 upload
sudo apt install -y awscli

# Set up backup cron as the deploy user
sudo -iu hoobiq crontab -e
```

Append:

```
30 3 * * * bash /var/www/hoobiq/scripts/backup.sh >> /var/log/hoobiq/backup.log 2>&1
```

Backups land in R2 at `hoobiq-prod/backups/postgres/{YYYY-MM-DD_HHMM}.sql.gz`.

### 9. SSH hardening (optional but recommended)

After confirming SSH key login works from laptop:

```bash
ssh root@178.238.226.212
bash /var/www/hoobiq/scripts/secure-vps.sh
```

Disables password login. **Test in a NEW terminal before closing the current SSH session.**

---

## Daily operation

### Deploy a new version

```bash
git push origin main      # GitHub Actions handles the rest
```

Watch the deploy at https://github.com/ebensantosa/hoobiq/actions.

### Check logs

```bash
ssh hoobiq@178.238.226.212

pm2 logs hoobiq-api --lines 100
pm2 logs hoobiq-web --lines 100
pm2 monit                  # live CPU/RAM dashboard

# Caddy access logs
sudo tail -f /var/log/caddy/web.log
sudo tail -f /var/log/caddy/api.log
```

### Manual rollback

```bash
ssh hoobiq@178.238.226.212
cd /var/www/hoobiq
git log --oneline -10                # find good commit
git reset --hard <commit-sha>
bash scripts/deploy.sh               # redeploys at that sha
```

### Restore DB from backup

```bash
ssh root@178.238.226.212

# Download backup
aws s3 cp s3://hoobiq-prod/backups/postgres/2026-04-27_0330.sql.gz . \
  --endpoint-url https://00b583bc99796f4001eb6233340c5787.r2.cloudflarestorage.com \
  --region auto

gunzip -c 2026-04-27_0330.sql.gz | sudo -u postgres psql hoobiq
```

### Update Node, Postgres, etc.

```bash
ssh root@178.238.226.212
apt update && apt upgrade -y
# Restart only what's needed:
systemctl restart postgresql redis-server meilisearch caddy
sudo -u hoobiq pm2 reload all
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| 502 on hoobiq.com | pm2 process down | `pm2 status`, `pm2 logs hoobiq-web` |
| 502 on api.hoobiq.com | API crashed at boot | `pm2 logs hoobiq-api`, often missing env var |
| TLS cert error | DNS not propagated, or Cloudflare SSL not "Full (strict)" | Check Cloudflare SSL/TLS settings |
| Deploy fails on `prisma migrate` | Pending migration conflict | `sudo -iu hoobiq && cd /var/www/hoobiq/packages/db && npx prisma migrate status` |
| Image upload returns local URL in prod | R2 env vars not set | Check `apps/api/.env` has `R2_*` filled |
| Out of memory on VPS | Build process spike | Build is one-shot — temp swap can help: `fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile` |

---

## File map

```
scripts/
  setup-vps.sh         — one-shot VPS bootstrap (run as root, once)
  secure-vps.sh        — disable SSH password auth (run after SSH key works)
  deploy.sh            — pull + build + migrate + reload (called by Actions)
  backup.sh            — pg_dump → R2 (called by cron)

ecosystem.config.js    — pm2 process definitions
Caddyfile              — Caddy reverse proxy config

.github/workflows/
  deploy.yml           — auto-deploy on push to main

apps/api/.env.production.example
apps/web/.env.production.example
```

## Architecture decisions

- **Bare metal, no Docker.** Saves ~600MB RAM, simpler debugging, faster reload. Trade-off: less portable. Acceptable for solo dev / MVP stage.
- **Postgres 16, not 14.** Newer JSONB indexing, better query planner.
- **pm2 cluster mode for web (2 instances), fork mode for api (1 instance).** Web is stateless; api has Socket.IO connections that don't survive cluster handoff cleanly.
- **Caddy over Nginx.** Auto-TLS in 1 line. No certbot cron needed.
- **Health-checked rolling deploy with auto-rollback.** Safer than blind reload — if `/healthz` fails 5× after deploy, we revert to previous commit.
- **R2 over S3.** Already in stack (Cloudflare account), free egress, edge-cached.
