---
name: application-development-ports
description: Use when creating an application or configuring its development ports and inter-application URLs.
---

# Application development ports and URLs

When creating an application, inspect the project instructions, existing application configurations, environment examples, `dev-stack.json`, devcontainer forwarding and service ports before assigning a port. Preserve existing assignments. Allocate frontends from 5173 upward and backends from 3000 upward, choosing the first unassigned port that does not collide with another application or project service. Check the actual runtime environment for availability; diagnose a conflict rather than silently changing an existing assignment. Configure each application's development server explicitly, using the project's framework and environment conventions.

Map application base URLs and inter-application endpoints through documented environment variables. Use the URL reachable by the actual caller: a browser-facing URL can differ from an internal server-to-server URL in a devcontainer or container network. Configure each caller to consume the appropriate variable and document names, example non-secret values, prerequisites and ownership in the project's example configuration. Preserve project settings and never commit credentials. Do not assume that a container's localhost is the host or another container.

Use VS Code devcontainer port forwarding for application access from the host; do not publish or map application container ports with Docker or Compose `ports` or `-p`. Preserve existing project service routes and follow the runtime skill to determine how the runner reaches services in its actual network topology. Configure `dev-stack.json` with the project-owned migration and app commands, and optional seed commands where appropriate; see `docs/consumer-installation.md`. Migrations and optional seeding use the intended development database and project preflight. Load `devcontainer-runtime` before starting services or doing database-, browser-, or container-dependent work.

For example, if frontend `shop` already uses 5173, a new `admin` can use 5174; if backend `api` already uses 3000 and a database service uses 3001, a new backend can use 3002. Example browser variables might be `PUBLIC_API_URL=http://localhost:3000` and `PUBLIC_SHOP_URL=http://localhost:5173`, while a server-only `API_URL` uses the address reachable from that server's network. These names are examples, not a universal framework contract. Verify the chosen addresses and port forwarding for the project, and keep prior allocations stable.
