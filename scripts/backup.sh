#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# backup.sh — dump PostgreSQL → gzip → upload to Cloudflare R2
#
# Required env vars (load from .env or pass via cron environment):
#   POSTGRES_HOST, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD
#   R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, BACKUP_R2_BUCKET
#
# Optional:
#   BACKUP_KEEP_DAYS  — delete R2 objects older than N days (default: 30)
#
# Cron example (daily at 03:00 UTC):
#   0 3 * * * /opt/tomjerrydom/scripts/backup.sh >> /var/log/tomjerrydom-backup.log 2>&1
# ---------------------------------------------------------------------------

BACKUP_KEEP_DAYS="${BACKUP_KEEP_DAYS:-30}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILENAME="backup-${TIMESTAMP}.sql.gz"
TMPFILE="/tmp/${FILENAME}"

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }

require_var() {
  [[ -n "${!1:-}" ]] || { log "ERROR: $1 is not set"; exit 1; }
}

require_var POSTGRES_HOST
require_var POSTGRES_DB
require_var POSTGRES_USER
require_var POSTGRES_PASSWORD
require_var R2_ACCESS_KEY_ID
require_var R2_SECRET_ACCESS_KEY
require_var R2_ENDPOINT
require_var BACKUP_R2_BUCKET

log "Starting backup → s3://${BACKUP_R2_BUCKET}/${FILENAME}"

# Dump and compress in one pipe — no uncompressed file on disk
PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
  --host="${POSTGRES_HOST}" \
  --username="${POSTGRES_USER}" \
  --dbname="${POSTGRES_DB}" \
  --no-password \
  --format=plain \
  --no-owner \
  --no-acl \
  | gzip -9 > "${TMPFILE}"

DUMP_SIZE="$(du -sh "${TMPFILE}" | cut -f1)"
log "Dump complete: ${DUMP_SIZE}"

# Upload to R2
AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" \
AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" \
  aws s3 cp "${TMPFILE}" \
    "s3://${BACKUP_R2_BUCKET}/${FILENAME}" \
    --endpoint-url="${R2_ENDPOINT}" \
    --region=auto \
    --no-progress

log "Upload complete: s3://${BACKUP_R2_BUCKET}/${FILENAME}"

rm -f "${TMPFILE}"

# ---------------------------------------------------------------------------
# Prune backups older than BACKUP_KEEP_DAYS
# ---------------------------------------------------------------------------
CUTOFF="$(date -u -d "-${BACKUP_KEEP_DAYS} days" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null \
  || date -u -v "-${BACKUP_KEEP_DAYS}d" +%Y-%m-%dT%H:%M:%SZ)"  # macOS fallback

log "Pruning objects older than ${BACKUP_KEEP_DAYS} days (cutoff: ${CUTOFF})"

AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" \
AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" \
  aws s3api list-objects-v2 \
    --bucket="${BACKUP_R2_BUCKET}" \
    --endpoint-url="${R2_ENDPOINT}" \
    --region=auto \
    --query "Contents[?LastModified<='${CUTOFF}'].Key" \
    --output=text \
| tr '\t' '\n' \
| grep -v '^$' \
| while read -r key; do
    log "Deleting old backup: ${key}"
    AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" \
    AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" \
      aws s3 rm "s3://${BACKUP_R2_BUCKET}/${key}" \
        --endpoint-url="${R2_ENDPOINT}" \
        --region=auto
  done

log "Backup finished successfully"
