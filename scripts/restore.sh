#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 backups/subtrack-YYYYMMDDTHHMMSSZ.dump" >&2
  exit 1
fi

project_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
case "$1" in
  /*) backup_file=$1 ;;
  *) backup_file="$project_root/$1" ;;
esac

if [ ! -f "$backup_file" ]; then
  echo "Backup not found: $backup_file" >&2
  exit 1
fi

echo "This replaces all Subtrack data with: $backup_file"
printf "Type RESTORE to continue: "
read -r confirmation
[ "$confirmation" = "RESTORE" ] || { echo "Restore cancelled"; exit 1; }

docker compose -f "$project_root/compose.yaml" stop app worker backup
docker compose -f "$project_root/compose.yaml" exec -T db \
  pg_restore -U subtrack -d subtrack --clean --if-exists --single-transaction < "$backup_file"
docker compose -f "$project_root/compose.yaml" up -d migrate app worker backup

echo "Restore completed"
