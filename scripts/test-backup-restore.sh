#!/bin/sh
set -eu

expected_database=${TEST_DATABASE_NAME:-}
actual_database=$(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -Atc "SELECT current_database()")

if [ "$expected_database" != "subtrack_test" ] || [ "$actual_database" != "$expected_database" ]; then
  echo "Refusing restore smoke test outside the isolated subtrack_test database" >&2
  exit 1
fi

restore_database="subtrack_restore_test"
archive=$(mktemp /tmp/subtrack-restore-smoke-XXXXXX)

cleanup() {
  dropdb --if-exists --force --maintenance-db=postgres "$restore_database" >/dev/null 2>&1 || true
  rm -f "$archive"
}
trap cleanup EXIT INT TERM

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS integration_restore_marker (
  id integer PRIMARY KEY,
  value text NOT NULL
);
TRUNCATE integration_restore_marker;
INSERT INTO integration_restore_marker (id, value)
VALUES (1, 'backup-restore-ok');
SQL

pg_dump --format=custom --file="$archive" "$DATABASE_URL"
pg_restore --list "$archive" >/dev/null

dropdb --if-exists --force --maintenance-db=postgres "$restore_database"
createdb --maintenance-db=postgres "$restore_database"
pg_restore --no-owner --no-privileges --dbname="$restore_database" "$archive"

marker=$(psql --dbname="$restore_database" -v ON_ERROR_STOP=1 -Atc   "SELECT value FROM integration_restore_marker WHERE id = 1")
migration_count=$(psql --dbname="$restore_database" -v ON_ERROR_STOP=1 -Atc   "SELECT count(*) FROM schema_migrations")

[ "$marker" = "backup-restore-ok" ] || {
  echo "Restored marker did not match" >&2
  exit 1
}
[ "$migration_count" = "3" ] || {
  echo "Expected 3 restored migrations, found $migration_count" >&2
  exit 1
}

echo "Backup archive validated and restored into a disposable database"
