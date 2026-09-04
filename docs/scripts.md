# Scripts Reference

All scripts live in `scripts/`. Run from the repo root unless noted otherwise.

---

## vm-setup.sh

One-time VM bootstrap. Run once on a fresh Oracle Cloud Ubuntu ARM64 instance.

- Installs Docker
- Opens firewall ports 80 and 443
- Clones the repo to `~/app`

```bash
# From your local machine:
scp -i ~/.ssh/oracle-tjd.key scripts/vm-setup.sh ubuntu@<VM_IP>:~/vm-setup.sh
ssh -i ~/.ssh/oracle-tjd.key ubuntu@<VM_IP> "bash ~/vm-setup.sh"
```

Log out and back in after it finishes so Docker group membership takes effect.

---

## backup.sh

Dumps PostgreSQL → gzip → uploads to Cloudflare R2. Auto-deletes backups older than 30 days (configurable via `BACKUP_KEEP_DAYS`).

Requires: `POSTGRES_HOST`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, `BACKUP_R2_BUCKET` in `.env`.

```bash
# Manual run:
set -a && source .env && set +a
bash scripts/backup.sh

# Cron (daily at 03:00 UTC) — add via crontab -e on the VM:
0 3 * * * cd ~/app && set -a && source .env && set +a && bash scripts/backup.sh >> /var/log/tjd-backup.log 2>&1
```

---

## restore.sh

Downloads a backup from R2 and restores it into PostgreSQL. **Destructive — drops and recreates the database.** Run only during a maintenance window or on a fresh VM.

```bash
set -a && source .env && set +a

# Restore latest backup:
bash scripts/restore.sh

# Restore a specific file:
bash scripts/restore.sh backup-20240101T030000Z.sql.gz
```

---

## seed-dev.ts

Configures a fresh Medusa backend for this project:

1. Deletes all existing regions
2. Creates the Russia / RUB region
3. Creates (or reuses) the default sales channel
4. Creates a fresh publishable API key and links it to the sales channel
5. Links all existing products to the sales channel

Run after first boot or after wiping the database. Prints the `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` value to copy into `storefront/.env`.

```bash
# Run from backend/:
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=yourpass npm run seed:dev
```

---

## preprocess-catalog.py

One-time catalog import helper. Reads CSVs from `old_raw_data/`, normalizes brand name variants (e.g. "ELF BAR" → "ELFBAR", "Adaliya" → "Adalya"), and writes `scripts/catalog-data.json` for import into Medusa.

Already done — only re-run if the source CSVs change.

```bash
python3 scripts/preprocess-catalog.py
```

---

## catalog-data.json

Not a script — the pre-processed product catalog output from `preprocess-catalog.py`. Used by the catalog import flow in the manager app.
