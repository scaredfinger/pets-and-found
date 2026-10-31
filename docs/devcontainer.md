# Devcontainer usage

Open the checkout in a devcontainer-capable editor. Host requirements: Docker with permission to access docker.sock, Git, Dev Containers support, host OpenCode configuration and authentication at paths used in .devcontainer/devcontainer.json.

**Security:** the container has Docker-socket access (effectively host-level privilege). Mounting host OpenCode authentication also grants processes in this trusted workspace credential access. Use only with trusted repository code. Credentials must never enter Git.

The Calimero-style nested mounts are intentional, to precreate the host paths with user ownership before Docker can generate root-owned directories. Do not remove them just because they overlap. initialize.sh precreates necessary paths and empty credential files.

Clone without preparing `.env` or `OPENCODE_VERSION`; the host initialization script creates an empty `.env` before Docker consumes it. `pnpm install` runs post-create/start. OpenCode is installed during post-create at 1.19.3 by default; OPENCODE_VERSION can select another release. The installer itself is fetched from opencode.ai at setup time.

On the running Linux devcontainer, Node 24.21.0, pnpm 10.32.1, OpenCode 1.19.3, Docker server access, UID/GID 1000 ownership, the separate auth.json and mcp-auth.json file mounts and the nested OpenCode state mount were observed. `pnpm install --frozen-lockfile` succeeded. Fixture tests run initialize.sh with an empty .env and check its nested paths and ownership. These checks do not establish that a fresh host clone, missing OPENCODE_VERSION, post-create install, or a devcontainer rebuild succeeds; exercise those on a real host before treating the full host acceptance as verified. Do not print credential contents.

Host verification: on a fresh clone, start with no .env and no OPENCODE_VERSION; rebuild the devcontainer twice. Confirm `node --version`, `pnpm --version`, `opencode --version` and `docker info` inside it; check UID ownership and mountpoints for `/home/node/.local/share/opencode`, `auth.json`, `mcp-auth.json`, `/home/node/.cache/opencode`, and `/home/node/.local/state/opencode`. Confirm host-owned auth files remain mounted separately over the project-local share state, that the state directories persist across rebuilds, and that .env can be empty. On macOS or Windows, `${localEnv:HOME}`, Linux UID mapping, the Docker socket path, and host-gateway support may differ; adapt and verify those host facilities rather than assuming Linux mounts work unchanged.

## Issue 14 verification status

The current Linux workspace reports Node 24.21.0, pnpm 10.32.1 and Docker server 29.1.3. It has no `devcontainer` executable, and it is not a fresh host clone. The existing fixture runs `initialize.sh` without `.env` and checks ownership and the intentional nested mounts; it does not execute `post-create.sh` or rebuild a devcontainer. No two-rebuild host check or host-owned credential/state persistence check was run for issue 14. Run the host verification above on a clean Linux host and record the actual environment, commands, versions and two rebuild outcomes before closing the issue. Do not print credential contents.
