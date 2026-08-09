# Security policy

## Supported version

Security fixes are applied to the latest release on `main`.

## Deployment boundary

Subtrack Web is designed for a trusted, single-user environment, binds to `127.0.0.1` by default and protects pages and API routes with a single-admin password.

Do not expose the app directly to the public internet. An internet-accessible deployment requires, at minimum:

- HTTPS
- a unique admin password and `AUTH_SECRET`
- authorization for every page and API route
- reverse-proxy abuse protection in addition to the built-in origin checks and login limiter
- managed database and SMTP secrets
- network restrictions and routine patching
- tested off-host backups

Changing `BIND_ADDRESS` to `0.0.0.0` expands the trust boundary and is the operator's responsibility.

The built-in login is suitable for a private LAN and includes same-origin mutation checks, temporary in-memory login lockouts, strict nonce-based CSP and defensive response headers. The limiter resets when the app process restarts and is scoped to one app instance. Internet exposure still requires HTTPS, network restrictions and reverse-proxy abuse protection. Set `COOKIE_SECURE=true` when using HTTPS.

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability.

Use GitHub's **Report a vulnerability** option in the Security tab of this repository. Include affected versions, reproduction steps, impact and any suggested mitigation. Do not include real subscription data, credentials or backup archives.

## Secrets

Never commit:

- `.env` files
- database or SMTP credentials
- PostgreSQL backup archives
- private keys, certificates or tokens

If a secret is exposed, revoke or rotate it immediately; deleting it from the latest commit is not sufficient.
