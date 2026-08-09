# Self-hosting guide

This guide covers a single-user installation on a trusted computer or private server. The default configuration listens only on localhost and pulls versioned images from GitHub Container Registry.

## Install

Requirements:

- Docker Engine with Docker Compose v2, or Docker Desktop
- At least 1 GB of free memory
- Ports 3000 and 8025 available on localhost

```sh
git clone https://github.com/jasontsang98/subtrack-web.git
cd subtrack-web
cp .env.example .env
```

Edit `.env` before starting:

1. Set `AUTH_PASSWORD` to a unique password of at least 12 characters.
2. Generate `AUTH_SECRET` with `openssl rand -hex 32` and paste the result.
3. Replace the default `POSTGRES_PASSWORD` in both `POSTGRES_PASSWORD` and `DATABASE_URL`.
4. Keep `SUBTRACK_VERSION` pinned to a numbered release.

Start Subtrack without building source code:

```sh
docker compose pull
docker compose up -d
docker compose ps
```

Open <http://localhost:3000>. Local reminder messages appear at <http://localhost:8025>.

## Upgrade

Create a backup first, then update the deployment files and images:

```sh
./scripts/backup.sh
git pull --ff-only
docker compose pull
docker compose up -d
docker compose ps
```

Review the release notes before changing `SUBTRACK_VERSION` in `.env`. Database migrations run automatically and are recorded in `schema_migrations`.

Changing `AUTH_PASSWORD` does not require changing `AUTH_SECRET`. Changing `AUTH_SECRET` signs out every existing browser session.

## Roll back

Do not roll back across a database migration unless the release notes explicitly say it is safe. Restore the backup created before the upgrade when a schema rollback is required.

For an image-only rollback, set `SUBTRACK_VERSION` to the previous version and run:

```sh
docker compose pull app worker
docker compose up -d app worker
```

## Backup and restore

The `backup` service creates a validated archive every day. Scheduled backups are retained for 7 days and manual backups for 30 days in `backups/`.

Create and validate a manual backup:

```sh
./scripts/backup.sh
./scripts/verify-persistence.sh
```

Restore an archive:

```sh
./scripts/restore.sh backups/subtrack-manual-YYYYMMDDTHHMMSSZ.dump
```

Restoration replaces the database. The script requires typing `RESTORE`, reapplies migrations, and restarts the application services. Keep another copy of important backups on a separate device or encrypted storage location.

## Local source builds

The default Compose file is for published images. Contributors can add the development override to build the web and worker images locally:

```sh
docker compose -f compose.yaml -f compose.dev.yaml up --build -d
```

## Troubleshooting

```sh
curl --fail http://localhost:3000/api/health
docker compose ps
docker compose logs --tail=200 app worker migrate backup db
```

- **Login rejects the password:** `AUTH_PASSWORD` must contain at least 12 characters. Restart `app` after editing `.env`.
- **A port is already in use:** change `APP_PORT` or `MAILPIT_PORT` in `.env`.
- **Database authentication fails:** ensure the password embedded in `DATABASE_URL` matches `POSTGRES_PASSWORD`. Changing it does not alter an initialized volume.
- **The browser opens `0.0.0.0`:** use `http://localhost:3000`; keep `BIND_ADDRESS=127.0.0.1` for local-only use.
- **An image cannot be pulled:** confirm `SUBTRACK_VERSION` exists in the repository packages and run `docker compose pull` again.

For internet-facing deployment requirements, read [SECURITY.md](SECURITY.md).
