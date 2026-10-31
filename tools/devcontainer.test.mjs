import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

const repo = path.resolve(import.meta.dirname, '..');

test('host initialization prepares empty env and overlapping bind mount sources with host ownership', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cinderling-host-'));
  try {
    const home = path.join(root, 'home');
    fs.mkdirSync(home);
    execFileSync('bash', [path.join(repo, '.devcontainer/initialize.sh')], { cwd: root, env: { ...process.env, HOME: home } });
    for (const file of ['.env', '.devcontainer-local/.local/share', '.devcontainer-local/.local/state', '.opencode-state/share', '.opencode-state/cache', '.opencode-state/state']) {
      assert.equal(fs.statSync(path.join(root, file)).uid, process.getuid());
    }
    for (const file of ['auth.json', 'mcp-auth.json']) {
      const target = path.join(home, '.local/share/opencode', file);
      assert.equal(fs.statSync(target).uid, process.getuid());
      assert.equal(fs.statSync(target).size, 0);
    }
    assert.equal(fs.statSync(path.join(root, '.env')).size, 0);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('devcontainer preserves nested state and independent host authentication mounts', () => {
  const config = JSON.parse(fs.readFileSync(path.join(repo, '.devcontainer/devcontainer.json'), 'utf8'));
  const mounts = config.mounts;
  const target = name => mounts.findIndex(item => item.includes(`target=${name},`));
  for (const name of ['/home/node/.local/share', '/home/node/.local/share/opencode', '/home/node/.local/share/opencode/auth.json', '/home/node/.local/share/opencode/mcp-auth.json', '/home/node/.cache/opencode', '/home/node/.local/state/opencode']) assert.notEqual(target(name), -1);
  assert.match(mounts[target('/home/node/.local/share/opencode/auth.json')], /\$\{localEnv:HOME\}/);
  assert.match(mounts[target('/home/node/.local/share/opencode/mcp-auth.json')], /\$\{localEnv:HOME\}/);
  assert.ok(config.runArgs.includes('.env'));
});
