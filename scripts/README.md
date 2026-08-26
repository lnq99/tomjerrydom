# scripts

Operational scripts for backup, deployment, and maintenance.

## What lives here

- `backup.sh` — nightly `pg_dump` compressed and uploaded to Cloudflare R2
- `deploy.sh` — pull latest images, run migrations, restart services via `docker compose`
- `restore.sh` — download a backup from R2 and restore PostgreSQL (for disaster recovery)

## backup.sh

Intended to run via cron on the VM (e.g. `0 3 * * * /opt/tomjerrydom/scripts/backup.sh`).

Flow:
1. `pg_dump` → gzip-compressed `.sql.gz`
2. Upload to R2 using `aws s3 cp` (AWS CLI configured with R2 credentials)
3. Prune backups older than N days from R2

Required env vars: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `BACKUP_R2_BUCKET`, `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`.

## deploy.sh

Safe rolling deploy sequence:
1. `git pull`
2. `docker compose pull`
3. `docker compose run --rm medusa npx medusa migrations run`
4. `docker compose up -d`
