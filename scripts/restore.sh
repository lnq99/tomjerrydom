#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# restore.sh — download a backup from Cloudflare R2 and restore into PostgreSQL
#
# Usage:
#   ./restore.sh                        # restore the latest backup
#   ./restore.sh backup-20240101T030000Z.sql.gz   # restore a specific file
#
# Required env vars (same as backup.sh):
#   POSTGRES_HOST, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD
#   R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, BACKUP_R2_BUCKET
#
# WARNING: This drops and recreates the target database. Run only on a
# maintenance window or a fresh VM.
# ---------------------------------------------------------------------------

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

s3() {
  AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}" \
  AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}" \
    aws "$@" \
      --endpoint-url="${R2_ENDPOINT}" \
      --region=auto
}

# ---------------------------------------------------------------------------
# Resolve which backup file to restore
# ---------------------------------------------------------------------------
if [[ -n "${1:-}" ]]; then
  FILENAME="$1"
  log "Using specified backup: ${FILENAME}"
else
  log "No filename given — finding latest backup in s3://${BACKUP_R2_BUCKET}/"
  FILENAME="$(
    s3 s3api list-objects-v2 \
      --bucket="${BACKUP_R2_BUCKET}" \
      --query "sort_by(Contents, &LastModified)[-1].Key" \
      --output=text
  )"
  [[ -n "${FILENAME}" && "${FILENAME}" != "None" ]] \
    || { log "ERROR: No backups found in s3://${BACKUP_R2_BUCKET}/"; exit 1; }
  log "Latest backup: ${FILENAME}"
fi

TMPFILE="/tmp/${FILENAME##*/}"

# ---------------------------------------------------------------------------
# Download
# ---------------------------------------------------------------------------
log "Downloading s3://${BACKUP_R2_BUCKET}/${FILENAME} → ${TMPFILE}"
s3 s3 cp "s3://${BACKUP_R2_BUCKET}/${FILENAME}" "${TMPFILE}" --no-progress

# ---------------------------------------------------------------------------
# Safety prompt — skip with RESTORE_NO_CONFIRM=1 for automation
# ---------------------------------------------------------------------------
if [[ "${RESTORE_NO_CONFIRM:-0}" != "1" ]]; then
  echo ""
  echo "  WARNING: This will DROP and recreate database '${POSTGRES_DB}' on ${POSTGRES_HOST}."
  echo "  All existing data will be lost."
  echo ""
  read -r -p "  Type YES to continue: " CONFIRM
  [[ "${CONFIRM}" == "YES" ]] || { log "Aborted."; rm -f "${TMPFILE}"; exit 0; }
fi

# ---------------------------------------------------------------------------
# Drop and recreate database, then restore
# ---------------------------------------------------------------------------
log "Dropping and recreating database '${POSTGRES_DB}'"

PGPASSWORD="${POSTGRES_PASSWORD}" psql \
  --host="${POSTGRES_HOST}" \
  --username="${POSTGRES_USER}" \
  --dbname=postgres \
  --no-password \
  -c "DROP DATABASE IF EXISTS \"${POSTGRES_DB}\";" \
  -c "CREATE DATABASE \"${POSTGRES_DB}\" OWNER \"${POSTGRES_USER}\";"

log "Restoring from ${TMPFILE}"

gunzip -c "${TMPFILE}" \
  | PGPASSWORD="${POSTGRES_PASSWORD}" psql \
      --host="${POSTGRES_HOST}" \
      --username="${POSTGRES_USER}" \
      --dbname="${POSTGRES_DB}" \
      --no-password \
      --quiet

rm -f "${TMPFILE}"

log "Restore complete. Database '${POSTGRES_DB}' is ready."
