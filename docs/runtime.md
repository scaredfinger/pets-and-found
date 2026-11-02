# Pets and Found runtime

Use Node 24 and pnpm 10.32.1 inside the devcontainer. Load the devcontainer-runtime skill before service-dependent work. Run commands from the workspace root.

## Database and browser preflight

The project uses the PostgreSQL development database defined in `compose.yaml`, with the project-owned development credentials and database `scaffold`. Do not point migrations or acceptance tests at production databases. Tests create isolated schemas and exercise connection failure and recovery.

`pnpm db:up` starts the database and waits for its healthcheck. Preserve existing volumes and service bindings. A healthy host-side database does not establish runner connectivity. For a host runner with the default loopback binding, the default database URL uses localhost port 55432. In the current Docker-outside-of-Docker devcontainer, localhost is a different namespace: the observed reachable database endpoint is `host.docker.internal:55432`. Verify the route and published binding when the environment changes. Set `DATABASE_URL` in the command environment to the project development URL with that hostname, retaining the intended database and credentials; do not print secret environment values. Do not broaden a database binding automatically.

Run `pnpm setup:browser` to install the matching Playwright Chromium and operating-system dependencies. With the intended development database endpoint configured, run `pnpm runtime:preflight`. It applies non-destructive project migrations, checks authentication and expected migration/schema readiness from this runner, and launches Chromium. It does not reset data or start a second database. A failure is actionable and must be resolved before service-dependent tests.

## Commands and ports

- `pnpm test` / `pnpm test:all`: all application and library unit tests; no database or browser required.
- `pnpm test:arch`: architecture and project language policies.
- `pnpm test:cinderling`: portable tool validation.
- `pnpm e2e` / `pnpm e2e:all`: project acceptance scenarios followed by desktop and mobile Chromium coverage. Database and browser preflight are required.
- `pnpm dev:stack`: ordered database migration followed by the backend and website development servers. `dev-stack.json` is project-owned. There are no seed commands configured.

Preserve existing development assignments: backend uses `BACKEND_PORT` (default 3000); website uses `WEBSITE_PORT` (default 5173). The website uses `BACKEND_URL` to reach the backend from its own namespace. Browser tests use `E2E_WEBSITE_PORT` 4317 and `E2E_BACKEND_PORT` 4318 by default, with test-owned process startup and cleanup. Use devcontainer forwarding for browser access to application ports and preserve the database service route.

The Clerk skill is available on demand; this migration does not select or configure Clerk.
