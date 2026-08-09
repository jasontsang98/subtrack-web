#!/bin/sh
set -eu

project_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$project_root"

if [ ! -f .env ]; then
  echo "Create .env from .env.example before running this check." >&2
  exit 1
fi

marker="verify-$(date -u +%Y%m%dT%H%M%SZ)-$$"
archive="$project_root/backups/persistence-$marker.dump"

cleanup() {
  docker compose exec -T db psql -U subtrack -d subtrack -c "DROP TABLE IF EXISTS subtrack_persistence_check" >/dev/null 2>&1 || true
  rm -f "$archive"
}
trap cleanup EXIT INT TERM

docker compose up -d db migrate
docker compose exec -T db psql -U subtrack -d subtrack -v ON_ERROR_STOP=1 -c "CREATE TABLE IF NOT EXISTS subtrack_persistence_check (marker text PRIMARY KEY)" >/dev/null
docker compose exec -T db psql -U subtrack -d subtrack -v ON_ERROR_STOP=1 -c "INSERT INTO subtrack_persistence_check(marker) VALUES ('$marker')" >/dev/null

docker compose up -d --force-recreate db
attempt=0
until docker compose exec -T db pg_isready -U subtrack -d subtrack >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  [ "$attempt" -lt 30 ] || { echo "PostgreSQL did not become ready." >&2; exit 1; }
  sleep 1
done

persisted=$(docker compose exec -T db psql -U subtrack -d subtrack -Atc "SELECT marker FROM subtrack_persistence_check WHERE marker = '$marker'")
[ "$persisted" = "$marker" ] || { echo "Persistence check failed." >&2; exit 1; }

mkdir -p "$project_root/backups"
docker compose exec -T db pg_dump -U subtrack -d subtrack -Fc > "$archive"
docker compose exec -T db pg_restore --list < "$archive" >/dev/null

echo "Persistence verified: the database survived container recreation and its backup archive is readable."
