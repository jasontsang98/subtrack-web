#!/bin/sh
set -eu

backup_dir=/backups
timezone=${BACKUP_TIMEZONE:-Australia/Sydney}
backup_hour=${BACKUP_HOUR:-2}
poll_seconds=${BACKUP_POLL_SECONDS:-60}

mkdir -p "$backup_dir"

queue_scheduled_backup() {
  local_date=$(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -Atc \
    "SELECT to_char(now() AT TIME ZONE '$timezone', 'YYYY-MM-DD')")
  local_hour=$(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -Atc \
    "SELECT extract(hour FROM now() AT TIME ZONE '$timezone')::integer")

  if [ "$local_hour" = "$backup_hour" ]; then
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c \
      "INSERT INTO backup_runs (backup_key, trigger)
       VALUES ('daily:$local_date', 'scheduled')
       ON CONFLICT (backup_key) DO NOTHING" >/dev/null
  fi
}

claim_backup() {
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -Atq -F '|' -c \
    "UPDATE backup_runs
     SET status = 'running', started_at = now(), error_message = NULL
     WHERE id = (
       SELECT id FROM backup_runs
       WHERE status = 'pending'
       ORDER BY requested_at
       FOR UPDATE SKIP LOCKED
       LIMIT 1
     )
     RETURNING id::text, trigger"
}

complete_backup() {
  run_id=$1
  trigger=$2
  timestamp=$(date -u +%Y%m%dT%H%M%SZ)
  filename="subtrack-${trigger}-${timestamp}.dump"
  temporary="$backup_dir/.${filename}.tmp"
  destination="$backup_dir/$filename"

  if pg_dump "$DATABASE_URL" -Fc -f "$temporary" &&
     pg_restore -l "$temporary" >/dev/null; then
    mv "$temporary" "$destination"
    size=$(wc -c < "$destination" | tr -d ' ')
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c \
      "UPDATE backup_runs
       SET status = 'completed',
           filename = '$filename',
           size_bytes = $size,
           completed_at = now()
       WHERE id = '$run_id'" >/dev/null
  else
    rm -f "$temporary"
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c \
      "UPDATE backup_runs
       SET status = 'failed',
           error_message = 'pg_dump or archive validation failed',
           completed_at = now()
       WHERE id = '$run_id'" >/dev/null
  fi
}

apply_retention() {
  find "$backup_dir" -maxdepth 1 -type f -name 'subtrack-scheduled-*.dump' -mtime +7 -delete
  find "$backup_dir" -maxdepth 1 -type f -name 'subtrack-manual-*.dump' -mtime +30 -delete
}

echo "Subtrack backup worker started; daily backup hour is $backup_hour in $timezone"

while true; do
  queue_scheduled_backup || echo "Could not queue scheduled backup" >&2
  claim=$(claim_backup || true)
  if [ -n "$claim" ]; then
    run_id=${claim%%|*}
    trigger=${claim#*|}
    complete_backup "$run_id" "$trigger"
    apply_retention
  fi
  sleep "$poll_seconds"
done
