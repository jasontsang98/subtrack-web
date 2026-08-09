# Contributing to Subtrack Web

Thanks for helping improve the self-hosted edition of Subtrack.

## Before opening a change

- Search existing issues and discussions.
- For substantial features, open an issue before implementation.
- Keep the single-user, private-by-default scope explicit.
- Do not add hosted analytics, advertising or telemetry without prior discussion.
- Never include real subscription data, credentials or backup files.

## Local checks

```sh
cp .env.example .env
npm ci
npm run lint
npm run build
docker compose config
```

For changes involving PostgreSQL, backups, restore or reminders, also test the relevant Docker Compose flow with fictional data.

## Pull requests

- Keep each pull request focused.
- Explain the user impact and any migration or security considerations.
- Add a migration for schema changes; never edit an already-released migration.
- Update documentation when configuration or behaviour changes.
- Confirm lint and production build pass.

By contributing, you agree that your contribution is licensed under the MIT Licence.
