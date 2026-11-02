# project

## Development stack launcher

Source: [00018](../decisions/00018-development-stack-launcher.md)

Prepare and verify PostgreSQL separately, preserving existing bindings and configuring a route reachable from the runner. Then use `pnpm dev:stack` to migrate the database and supervise the backend on port `3000` and website on port `5173`.
