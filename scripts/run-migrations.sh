#!/bin/sh
set -eu

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
SQL

for migration in /migrations/*.sql; do
  version=$(basename "$migration" .sql)
  applied=$(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -Atc \
    "SELECT 1 FROM schema_migrations WHERE version = '$version'")

  if [ "$applied" = "1" ]; then
    echo "Migration $version already applied"
    continue
  fi

  echo "Applying migration $version"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
    -v migration_version="$version" <<SQL
BEGIN;
\i $migration
INSERT INTO schema_migrations (version) VALUES (:'migration_version');
COMMIT;
SQL
done
