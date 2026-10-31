#!/usr/bin/env bash
set -eu
sudo apt-get update
sudo apt-get install -y ripgrep
corepack enable || true
pnpm install
curl -fsSL https://opencode.ai/install | bash -s -- --version "${OPENCODE_VERSION:-1.19.3}"
