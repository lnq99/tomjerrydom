# Runbook — TomJerryDom Production

Oracle Cloud Always Free VM · ARM64 · Docker Compose  
SSH key: `~/.ssh/oracle-tjd.key`  
**This doc assumes you are SSH'd into the VM unless stated otherwise.**

```bash
# Set once in your shell session for convenience:
export VM_IP=<your-vm-ip>
export SSH_KEY=~/.ssh/oracle-tjd.key
```

---

## SSH Access

```bash
ssh -i $SSH_KEY ubuntu@$VM_IP
cd ~/app
```

---

## First-Time Deployment

### 1. Run the VM bootstrap script

From your local machine:

```bash
scp -i $SSH_KEY scripts/vm-setup.sh ubuntu@$VM_IP:~/vm-setup.sh
ssh -i $SSH_KEY ubuntu@$VM_IP "bash ~/vm-setup.sh"
```

Installs Docker, opens firewall ports 80/443, clones the repo to `~/app`.

> **Known issue:** `ufw` conflicts with `iptables-persistent` on Ubuntu 24.04 — it has been removed from vm-setup.sh. The script uses `iptables` directly, so `ufw` is not needed.

Log out and back in after the script finishes so Docker group membership takes effect.

### 2. Set up GitHub deploy key (private repo)

On your local machine:

```bash
ssh-keygen -t ed25519 -C "oracle-vm-deploy" -f ~/.ssh/github-deploy -N ""
cat ~/.ssh/github-deploy.pub   # copy this
```

Add the public key to GitHub: repo → **Settings → Deploy keys → Add deploy key** (read-only is fine).

Copy the private key to the VM:

```bash
scp -i $SSH_KEY ~/.ssh/github-deploy ubuntu@$VM_IP:~/.ssh/github-deploy
ssh -i $SSH_KEY ubuntu@$VM_IP "chmod 600 ~/.ssh/github-deploy"
```

On the VM, configure SSH to always use it for GitHub:

```bash
cat >> ~/.ssh/config << 'EOF'
Host github.com
  IdentityFile ~/.ssh/github-deploy
  IdentitiesOnly yes
EOF
```

Then clone:

```bash
eval "$(ssh-agent -s)" && ssh-add ~/.ssh/github-deploy
git clone git@github.com:yourname/yourrepo.git ~/app
```

### 3. Create and fill `.env`

From your local machine:

```bash
scp -i $SSH_KEY .env.example ubuntu@$VM_IP:~/app/.env
ssh -i $SSH_KEY ubuntu@$VM_IP "nano ~/app/.env"
```

Required fields:

| Variable | Value |
|---|---|
| `DOMAIN` | your API domain, e.g. `api.tomjerrydom.com` |
| `MANAGER_DOMAIN` | e.g. `manager.tomjerrydom.com` |
| `POSTGRES_PASSWORD` | `openssl rand -hex 32` |
| `JWT_SECRET` | `openssl rand -hex 32` |
| `COOKIE_SECRET` | `openssl rand -hex 32` |
| `R2_ACCESS_KEY_ID/SECRET` | from Cloudflare R2 dashboard |
| `R2_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` |
| `YOOKASSA_SHOP_ID/SECRET_KEY` | from YooKassa dashboard |
| CORS vars | replace `localhost` with your real domains |

### 4. Point DNS before starting

Add two A records at your DNS provider:

```
api.yourdomain.com     → <VM_IP>
manager.yourdomain.com → <VM_IP>
```

Caddy auto-provisions TLS certs — it fails if DNS isn't pointing yet.

### 5. Build and start

```bash
cd ~/app
docker compose up -d --build
docker compose logs -f medusa   # watch for startup/migration errors
```

First boot takes 2–5 minutes. Medusa runs DB migrations automatically on start.

### 6. Verify

```bash
docker compose ps
curl -sf https://api.yourdomain.com/health && echo OK
```

### 7. Set up backup cron

```bash
sudo apt-get install -y awscli   # install AWS CLI for R2 uploads

crontab -e
# Add:
0 3 * * * cd ~/app && set -a && source .env && set +a && bash scripts/backup.sh >> /var/log/tjd-backup.log 2>&1
```

---

## Running Without a Domain (IP-only / dev mode)

Caddy cannot provision TLS certs for a raw IP. Use HTTP-only mode temporarily.

Edit `infra/caddy/Caddyfile` on the VM:

```
http://<VM_IP> {
    reverse_proxy medusa:9000
}

http://<VM_IP>:3100 {
    reverse_proxy manager:3100
}
```

In `.env`:

```
DOMAIN=<VM_IP>
MANAGER_DOMAIN=<VM_IP>
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://<VM_IP>
STORE_CORS=http://<VM_IP>:3000
ADMIN_CORS=http://<VM_IP>:7001,http://<VM_IP>:3100
AUTH_CORS=http://<VM_IP>,http://<VM_IP>:3100
```

Open port 3100 on the VM firewall so the manager is reachable:

```bash
sudo iptables -I INPUT 6 -p tcp --dport 3100 -j ACCEPT
sudo netfilter-persistent save
```

**Switching to a real domain later:**

1. Point DNS to `<VM_IP>`
2. Restore the original Caddyfile: `git checkout infra/caddy/Caddyfile`
3. Update `DOMAIN`, `MANAGER_DOMAIN`, and CORS vars in `.env`
4. `docker compose restart proxy` — Caddy auto-provisions the TLS cert

---

## Deploy an Update

```bash
git pull origin main
docker compose build medusa manager        # rebuild changed services
docker compose up -d --no-deps medusa manager   # restart only what changed
docker compose logs -f medusa              # watch for errors
```

If dependencies changed (new npm packages):

```bash
docker compose build --no-cache medusa
docker compose up -d --no-deps medusa
```

Storefront deploys automatically via Cloudflare Pages on `git push` — no VM action needed.

---

## Health Check

```bash
docker compose ps
docker compose logs --tail=50
curl -sf https://api.yourdomain.com/health && echo OK
```

Expected healthy output:

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
docker compose logs -f medusa
docker compose logs -f postgres
docker compose logs -f proxy
docker compose logs --tail=200 medusa
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
df -h /
docker system df
free -h
docker stats
```

If disk is filling up:

```bash
docker system prune -f
du -sh /var/lib/docker/containers/*/*-json.log | sort -h | tail -20
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

```bash
nano .env
docker compose restart medusa
```

**After rotating `JWT_SECRET` or `COOKIE_SECRET`:** all existing sessions are invalidated — users must log in again.

**After rotating YooKassa keys:** update both `.env` and the YooKassa dashboard webhook settings.

---

## Telegram Bot (Cloudflare Worker)

Runs on Cloudflare Workers — not on this VM. Manage from your local machine:

```bash
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
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<worker>.workers.dev&secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

---

## Storefront (Cloudflare Pages)

Served from Cloudflare Pages — not on this VM. Deployments trigger automatically on `git push`.

To force a redeploy without a code change:
Cloudflare Dashboard → Pages → TomJerryDom → Deployments → Retry deployment

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
| `vm-setup.sh` fails on `ufw` | Conflicts with iptables-persistent | Already fixed in script — `ufw` removed |

---

## Cron Schedule

| Job | Schedule | Command |
|-----|----------|---------|
| Database backup | Daily at 03:00 UTC | `0 3 * * * cd ~/app && set -a && source .env && set +a && bash scripts/backup.sh >> /var/log/tjd-backup.log 2>&1` |

Add via `crontab -e` on the VM.
