#!/usr/bin/env bash
set -eu
HOST_UID="$(id -u)"
HOST_GID="$(id -g)"
for DIR in "$HOME/.config" "$HOME/.config/opencode" "$HOME/.local" "$HOME/.local/share" "$HOME/.local/share/opencode" ".devcontainer-local" ".devcontainer-local/.local" ".devcontainer-local/.local/share" ".devcontainer-local/.local/state" ".devcontainer-local/.cache" ".opencode-state" ".opencode-state/share" ".opencode-state/cache" ".opencode-state/state"; do
  mkdir -p "$DIR"
  chown "$HOST_UID:$HOST_GID" "$DIR"
done
for FILE in "$HOME/.local/share/opencode/auth.json" "$HOME/.local/share/opencode/mcp-auth.json" ".env"; do
  touch "$FILE"
  chown "$HOST_UID:$HOST_GID" "$FILE"
done
