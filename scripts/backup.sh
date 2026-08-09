#!/bin/sh
set -eu

project_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
backup_dir="$project_root/backups"
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
backup_file="$backup_dir/subtrack-$timestamp.dump"

mkdir -p "$backup_dir"
docker compose -f "$project_root/compose.yaml" exec -T db \
  pg_dump -U subtrack -d subtrack -Fc > "$backup_file"

echo "Backup created: $backup_file"
