# Cinderling scaffold

<img src="docs/logo.png" alt="Cinderling scaffold logo" width="240">

A TypeScript pnpm and Nx monorepo with a backend, website, greeting and database libraries, PostgreSQL migrations, unit tests and Gherkin acceptance tests.

## Start locally

Requires Node 24, pnpm 10 and Docker Compose. Run `pnpm install`, `pnpm db:up`, and `pnpm db:migrate`. Start the backend with `pnpm dev:backend` and the website with `pnpm dev:website`; open http://localhost:3000. The backend fails to start until the database is reachable, all bundled migrations have matching ledger checksums, and the required tables are accessible. `GET http://localhost:3001/ready` checks the same conditions; this is not a complete schema-drift check.

The local database defaults to `postgresql://scaffold:scaffold@localhost:55432/scaffold`. Set `DATABASE_URL` to override it, and set `DB_PORT` when starting Compose if a different host port is required. Set `BACKEND_PORT`, `WEBSITE_PORT` or `BACKEND_URL` to change application defaults. From a devcontainer using the host Docker socket, start Compose with `DB_BIND_ADDRESS=0.0.0.0 pnpm db:up` and set `DATABASE_URL=postgresql://scaffold:scaffold@host.docker.internal:55432/scaffold` for migration and application commands. This bind exposes the local development database on host network interfaces.

Run `pnpm db:down` to stop the database. Data is retained in a Compose volume. Migration files are applied in order once; changing an applied file causes migration to fail.

The initial migrations create greeting records, index them by creation time, and create a greeting-template table with a default template. These tables are schema examples; the greeting endpoint does not yet persist or read greetings.

## Checks

Run `pnpm test`, `pnpm type-check`, `pnpm test:arch`, and `pnpm test:cinderling`. Install Chromium and its system dependencies once with `pnpm setup:browser`. With PostgreSQL running, `pnpm e2e` runs the Gherkin acceptance scenario and Playwright browser tests on desktop and mobile Chromium against the real website and backend. `pnpm test:browser` runs just the browser suite; it applies migrations and starts and stops its own application processes. Set `E2E_WEBSITE_PORT` and `E2E_BACKEND_PORT` if the defaults (4317 and 4318) are in use. The browser suite uses the configured `DATABASE_URL`, so use a dedicated test database when isolation is required.

Cinderling `v0.1.0-beta.7` is installed. The architecture workflow and consumer installation guide are adapted; three release-managed issue evidence pages are retired under the scoped draft in `docs/decision-drafts/00017-retire-kit-evidence-from-consumer.md`. Review these adaptations during upgrades.
