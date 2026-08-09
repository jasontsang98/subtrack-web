# Changelog

All notable changes to Subtrack Web are documented here. Versions follow [Semantic Versioning](https://semver.org/).

## [0.2.1] - Unreleased

### Added

- Per-client and global login failure rate limits with temporary lockouts
- Same-origin validation for every state-changing request
- Strict per-request nonce Content Security Policy
- Frame, MIME-sniffing, referrer, permissions, opener and HTTPS transport headers
- Automated authentication, rate-limit, origin and security-header tests
- Health validation for missing, placeholder or weak authentication secrets

### Changed

- Admin passwords must contain at least 12 characters
- Authenticated pages render dynamically so Next.js can attach one-time CSP nonces

## [0.2.0] - 2026-08-09

### Added

- Single-admin authentication for pages and API routes
- Signed, HTTP-only sessions and sign-out support
- Persistence and backup verification script
- Shared iOS and web application icon set
- Installable web app manifest
- Multi-architecture GHCR publishing with SBOM and provenance attestations

### Changed

- Self-hosting documentation now covers required authentication secrets
- Container releases include separate web and reminder-worker images

### Fixed

- Logout now preserves the browser hostname instead of redirecting to the container address
