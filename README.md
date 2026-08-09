# Subtrack Web

A private-by-default, self-hosted subscription manager backed by PostgreSQL.

Subtrack Web helps you track recurring payments, understand projected and historical spending, schedule weekly email digests, and keep portable backupswithout sending subscription data to a hosted Subtrack service.

## Features

- Active and inactive subscription management
- Weekly, fortnightly, monthly and yearly billing cycles
- Sorting, search, categories and configurable icon colours
- Annual, monthly and seven-day spending summaries
- Insights by month and category
- Historical payment tracking
- Weekly email reminder digest
- Automatic and manual PostgreSQL backups
- Full JSON export/import
- Responsive light/dark interface
- Docker-first local deployment

## Security model

Subtrack Web is a **single-user self-hosted application**. A server-side admin password protects every page and API route except the health check and login endpoint. Passwords must contain at least 12 characters.

By default, the application and Mailpit bind only to `127.0.0.1`, PostgreSQL is not published to the host, and no subscription data is sent to a Subtrack-operated service.

The login is appropriate for localhost and a trusted private LAN. Failed sign-ins are rate limited, state-changing requests require a same-origin browser context, and pages use a strict nonce-based Content Security Policy. The in-memory limiter resets when the app restarts and is not a replacement for reverse-proxy protection on an internet-facing deployment. Public internet access still requires HTTPS, network restrictions, abuse protection and managed secrets. See [SECURITY.md](SECURITY.md).

## Quick start

```sh
git clone https://github.com/jasontsang98/subtrack-web.git
cd subtrack-web
cp .env.example .env
# Set AUTH_PASSWORD, replace both PostgreSQL password values,
# and generate AUTH_SECRET with: openssl rand -hex 32
docker compose pull
docker compose up -d
```

Open:

- Subtrack: http://localhost:3000
- Local Mailpit inbox: http://localhost:8025
- Health check: http://localhost:3000/api/health

Check service status:

```sh
docker compose ps
docker compose logs -f app worker backup
```

Stop without deleting data:

```sh
docker compose down
```

Permanently delete containers and the PostgreSQL volume:

```sh
docker compose down --volumes
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for secure setup, upgrades, rollback, backup restoration and troubleshooting.

## Configuration

Copy `.env.example` to `.env`. Important settings:

| Variable | Default | Purpose |
| --- | --- | --- |
| `BIND_ADDRESS` | `127.0.0.1` | Host interface for web and Mailpit ports |
| `APP_PORT` | `3000` | Web application port |
| `MAILPIT_PORT` | `8025` | Local email inbox port |
| `POSTGRES_PASSWORD` | local-only default | PostgreSQL password inside the Docker network |
| `AUTH_PASSWORD` | required | Single-admin login password |
| `AUTH_SECRET` | required | Random secret of at least 32 characters used to sign sessions |
| `COOKIE_SECURE` | `false` | Set to `true` only when serving the app over HTTPS |
| `BACKUP_TIMEZONE` | `Australia/Sydney` | IANA timezone for backups |
| `BACKUP_HOUR` | `2` | Daily backup hour, 0-23 |
| `SUBTRACK_VERSION` | current release | Published application image version |
| `SMTP_HOST` | `mailpit` | SMTP host |
| `EMAIL_FROM` | `Subtrack <subtrack@localhost>` | Reminder sender |

If you change `POSTGRES_PASSWORD`, update `DATABASE_URL` to match. Never commit your `.env` file.

## Prebuilt containers

Versioned images are published to GitHub Container Registry for AMD64 and ARM64:

- `ghcr.io/jasontsang98/subtrack-web:0.2.1`
- `ghcr.io/jasontsang98/subtrack-web-worker:0.2.1`

Set `SUBTRACK_VERSION=0.2.1` in `.env` to pin a release. Pull and start the published images without rebuilding:

```sh
docker compose pull app worker
docker compose up -d --no-build
```

For reproducible deployments, pin a numbered version rather than `latest`. Release images include an SBOM and signed GitHub build provenance. Verify an image with:

```sh
gh attestation verify oci://ghcr.io/jasontsang98/subtrack-web:0.2.1 \
  --repo jasontsang98/subtrack-web
```

Local development uses `docker compose -f compose.yaml -f compose.dev.yaml up --build`, which builds the same Dockerfile targets on your machine.

## Data, backups and restore

PostgreSQL data is stored in the Compose volume `subtrack-web_postgres_data`.

The backup worker creates a validated PostgreSQL archive each day. Scheduled backups are retained for 7 days and manual backups for 30 days. Backups are written to `backups/`, which is excluded from Git.

Create an emergency backup:

```sh
./scripts/backup.sh
```

Restore a backup:

```sh
./scripts/restore.sh backups/subtrack-YYYYMMDDTHHMMSSZ.dump
```

Restore requires typing `RESTORE`, stops the app and workers, replaces the database in one transaction, reapplies migrations, and restarts services.

A backup on the same disk is not sufficient protection against disk failure. Copy important archives to another device or encrypted storage location.

Verify that the database survives container recreation and that PostgreSQL can read a fresh backup archive:

```sh
./scripts/verify-persistence.sh
```

The check uses an isolated marker table, removes it afterward, and does not replace subscription data.

## Email reminders

Open **Reminders** to configure the recipient, timezone, Monday delivery hour, and send a test message.

Local mail is captured by Mailpit. For a private online deployment behind authentication, replace the `SMTP_*` values with a trusted SMTP provider and use a verified sender address.

## Database upgrades

Migrations live in `db/migrations/` and run automatically in filename order. Applied versions are recorded in `schema_migrations`.

Before upgrading:

```sh
./scripts/backup.sh
git pull --ff-only
docker compose pull
docker compose up -d
```

## Development

Requires Node.js 22.13 or newer and a PostgreSQL database.

```sh
npm ci
npm run lint
npm run build
npm run dev
```

The production Docker image uses Next.js standalone output and runs as a non-root user.

## Architecture

```text
Browser -> Next.js app/API -> PostgreSQL
                      |----> SMTP or local Mailpit
Backup worker --------> PostgreSQL archive files
Reminder worker ------> PostgreSQL + SMTP
```

PostgreSQL has no published host port. The app, reminder worker and backup worker share the internal Compose network.

## Project status

This is the open-source self-hosted edition of Subtrack. The iOS application is developed separately.

See [ROADMAP.md](ROADMAP.md), [CONTRIBUTING.md](CONTRIBUTING.md), and the public [privacy/support site](https://jasontsang98.github.io/subtrack-support/).

## Licence

[MIT](LICENSE)
