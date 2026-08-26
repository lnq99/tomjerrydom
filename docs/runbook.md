# Runbook — TomJerryDom Production

Oracle Cloud Always Free VM · ARM64 · Docker Compose  
**This doc assumes you are SSH'd into the VM unless stated otherwise.**

---

## SSH Access

```bash
ssh -i ~/.ssh/oracle_key ubuntu@<VM_PUBLIC_IP>
cd /opt/tomjerrydom
```

---

## Health Check

Quick sanity check for all services:

```bash
# Service status
docker compose ps

# Tail all logs (last 50 lines each)
docker compose logs --tail=50

# HTTP health
curl -sf https://api.example.com/health && echo OK
```

Expected healthy output from `docker compose ps`:
```
NAME       STATUS          PORTS
postgres   Up (healthy)
redis      Up (healthy)
medusa     Up
proxy      Up              0.0.0.0:80->80, 0.0.0.0:443->443
```

---

## Restart a Service

```bash
docker compose restart medusa
docker compose restart postgres
docker compose restart redis
docker compose restart proxy
```

Full stack restart:
```bash
docker compose down && docker compose up -d
```

---

## View Logs

```bash
# Follow logs for one service
docker compose logs -f medusa
docker compose logs -f postgres
docker compose logs -f proxy

# Last N lines
docker compose logs --tail=200 medusa
```

---

## Deploy an Update

```bash
git pull origin main
docker compose build medusa        # rebuild Medusa image
docker compose up -d --no-deps medusa   # restart only Medusa (migrations run on start)
docker compose logs -f medusa      # watch for errors
```

If dependencies changed (new npm packages):
```bash
docker compose build --no-cache medusa
docker compose up -d --no-deps medusa
```

---

## Database

### Connect to Postgres

```bash
docker compose exec postgres psql -U medusa -d medusa
```

### Run migrations manually

```bash
docker compose exec medusa node_modules/.bin/medusa db:migrate
```

### Manual backup (outside of cron)

```bash
# Load env vars (backup.sh reads them from environment)
set -a && source .env && set +a
bash scripts/backup.sh
```

### Restore from backup

```bash
set -a && source .env && set +a

# Restore latest
bash scripts/restore.sh

# Restore specific file
bash scripts/restore.sh backup-20240101T030000Z.sql.gz
```

> **Warning:** restore drops and recreates the database. Run only during a maintenance window.

### List backups in R2

```bash
set -a && source .env && set +a

AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" \
AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" \
  aws s3 ls "s3://${BACKUP_R2_BUCKET}/" \
    --endpoint-url="${R2_ENDPOINT}" \
    --region=auto \
  | sort
```

---

## TLS / Caddy

Caddy handles TLS automatically via Let's Encrypt. No manual cert management needed.

```bash
# Check Caddy logs for TLS errors
docker compose logs proxy | grep -i tls

# Reload Caddy config without restart (after editing Caddyfile)
docker compose exec proxy caddy reload --config /etc/caddy/Caddyfile

# Check cert status
docker compose exec proxy caddy trust
```

If port 80 is blocked, ACME HTTP challenge fails — verify Oracle Cloud security list allows TCP 80 inbound.

---

## Disk & Memory

```bash
# Disk usage
df -h /

# Docker volumes
docker system df

# Memory
free -h

# Per-container resource usage (live)
docker stats
```

If disk is filling up:
```bash
# Remove unused images and stopped containers
docker system prune -f

# Check log sizes
du -sh /var/lib/docker/containers/*/*-json.log | sort -h | tail -20

# Truncate a runaway log (replace with actual container ID)
truncate -s 0 /var/lib/docker/containers/<id>/<id>-json.log
```

---

## Drop Redis Under Memory Pressure

If the VM is RAM-constrained and Redis needs to go:

1. In `docker-compose.yml`, comment out the `redis:` service block and `redis_data` volume.
2. In `backend/medusa-config.ts`, switch `eventBus` and `cache` modules to in-memory variants.
3. Remove `redis` from `medusa` `depends_on`.
4. `docker compose up -d`

---

## Rotate Secrets

Edit `.env` on the VM:
```bash
nano .env
```

Then restart the affected service:
```bash
docker compose restart medusa
```

**After rotating `JWT_SECRET` or `COOKIE_SECRET`:** all existing user sessions are invalidated — admin users must log in again.

**After rotating YooKassa keys:** update both `.env` (backend) and the YooKassa dashboard webhook settings.

---

## Telegram Bot (Cloudflare Worker)

The bot runs on Cloudflare Workers — not on this VM. To manage it:

```bash
# From your local machine (not the VM)
cd telegram-bot
wrangler tail           # stream live logs
wrangler deploy         # deploy new version
wrangler rollback       # roll back to previous version
```

Rotate Worker secrets:
```bash
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put MEDUSA_API_KEY
```

Re-register webhook (e.g. after token rotation):
```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook\
?url=https://<worker>.workers.dev\
&secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

---

## Storefront (Cloudflare Pages)

Served from Cloudflare Pages — not on this VM. Deployments trigger automatically on `git push` via Cloudflare Pages CI.

To force a redeploy without a code change:
- Cloudflare Dashboard → Pages → TomJerryDom → Deployments → Retry deployment

---

## Common Failure Modes

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `502 Bad Gateway` from Caddy | Medusa is down | `docker compose restart medusa`, check logs |
| Admin login fails | JWT/cookie secret rotated | Sessions invalidated — just log in again |
| Medusa won't start | Migration failed or DB unreachable | Check `docker compose logs medusa`; ensure postgres is healthy |
| Postgres `Out of shared memory` | Too many connections | Restart Medusa to reset connection pool |
| Backup cron silent | `.env` not loaded in cron environment | Ensure cron line sources `.env` (see `scripts/backup.sh` header) |
| Caddy TLS renewal fails | Port 80 blocked | Allow TCP 80 in Oracle Cloud security list |
| Redis 8 OOM | `maxmemory 256mb` too low | Increase in `docker-compose.yml` or drop Redis entirely |
| Worker 500 errors | KV namespace deleted or secret missing | Check `wrangler tail`, verify secrets with `wrangler secret list` |

---

## Cron Schedule

| Job | Schedule | Command |
|-----|----------|---------|
| Database backup | Daily at 03:00 UTC | `0 3 * * * /opt/tomjerrydom/scripts/backup.sh >> /var/log/tomjerrydom-backup.log 2>&1` |

Add via `crontab -e` on the VM.
