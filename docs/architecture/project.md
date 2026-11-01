# project

## Development stack launcher

Source: [00019](../decisions/00019-development-stack-launcher.md)

Use `pnpm dev:stack` to start the local development stack; it migrates the database, starts the backend on port `3000`, starts the website on port `5173`, and uses the devcontainer-safe database route.
