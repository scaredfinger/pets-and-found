#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const bootstrap = async (args) => {
  const [version, ...options] = args;
  const value = flag => {
    const index = options.indexOf(flag);
    if (index === -1) return null;
    if (!options[index + 1] || options[index + 1].startsWith('--')) throw new Error(`${flag} requires a value`);
    return options[index + 1];
  };
  if (!/^v\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(version || '')) throw new Error('explicit v-prefixed release version required');
  const expected = value('--sha256');
  if (!/^[a-f0-9]{64}$/.test(expected || '')) throw new Error('--sha256 requires the trusted release archive digest');
  const supplied = value('--archive');
  let archive;
  if (supplied) archive = fs.readFileSync(path.resolve(supplied));
  else {
    if (!process.env.GH_TOKEN) throw new Error('GH_TOKEN authorized for scaredfinger/cinderling is required, or supply --archive');
    const headers = { Authorization: `Bearer ${process.env.GH_TOKEN}`, Accept: 'application/vnd.github+json' };
    const lookup = await fetch(new URL(`/repos/scaredfinger/cinderling/releases/tags/${version}`, 'https://api.github.com'), { headers });
    if (!lookup.ok) throw new Error(`private release lookup failed (${lookup.status})`);
    const release = await lookup.json();
    const asset = release.assets?.find(item => item.name === `cinderling-${version}.tar.gz`);
    if (release.tag_name !== version || !asset || !asset.url.startsWith('https://api.github.com/repos/scaredfinger/cinderling/releases/assets/')) throw new Error('exact release asset unavailable');
    const response = await fetch(asset.url, { headers: { ...headers, Accept: 'application/octet-stream' } });
    if (!response.ok || !response.headers.get('content-type')?.includes('application/octet-stream')) throw new Error(`private release download failed (${response.status})`);
    archive = Buffer.from(await response.arrayBuffer());
  }
  const hash = data => crypto.createHash('sha256').update(data).digest('hex');
  if (hash(archive) !== expected) throw new Error('release archive SHA-256 mismatch');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'cinderling-bootstrap-'));
  try {
    const file = path.join(temp, 'release.tar.gz');
    const kit = path.join(temp, 'kit');
    fs.writeFileSync(file, archive, { mode: 0o600 });
    fs.mkdirSync(kit);
    const tar = flags => execFileSync('tar', [...flags, file], { encoding: 'utf8' });
    const entries = tar(['-tzf']).trim().split('\n');
    if (new Set(entries).size !== entries.length || entries.some(name => !name.startsWith('./') || name.includes('\\') || name.split('/').includes('..') || name.startsWith('./.git/'))) throw new Error('unsafe release archive paths');
    if (tar(['-tvzf']).trim().split('\n').some(line => !['-', 'd'].includes(line[0]))) throw new Error('unsafe release archive types');
    execFileSync('tar', ['-xzf', file, '-C', kit, '--no-same-owner']);
    const release = JSON.parse(fs.readFileSync(path.join(kit, 'release.json')));
    if (release.version !== version || !release.files || !Object.keys(release.files).length) throw new Error('release manifest version mismatch');
    for (const name of entries.filter(name => !name.endsWith('/') && name !== './release.json')) if (!Object.hasOwn(release.files, name.slice(2))) throw new Error('unlisted release asset');
    for (const [name, digest] of Object.entries(release.files)) {
      if (path.posix.normalize(name) !== name || path.isAbsolute(name) || name.split('/').includes('..') || !/^[a-f0-9]{64}$/.test(digest) || hash(fs.readFileSync(path.join(kit, name))) !== digest) throw new Error('invalid release manifest asset');
    }
    if (!release.files['tools/installation.mjs'] || !release.files['tools/cinderling.mjs']) throw new Error('target release does not support reviewed installation');
    if (value('--review')) execFileSync('pnpm', ['install', '--frozen-lockfile', '--ignore-scripts'], { cwd: kit, stdio: ['ignore', 'ignore', 'pipe'] });
    execFileSync(process.execPath, [path.join(kit, 'tools/cinderling.mjs'), 'install', version, ...options.filter((_, index) => !(options[index] === '--archive' || index > 0 && options[index - 1] === '--archive')), '--archive', file], { stdio: 'inherit' });
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { await bootstrap(process.argv.slice(2)); } catch (error) { console.error(error.stderr ? `bootstrap command failed (${error.status}): ${error.stderr.toString()}` : error.message); process.exitCode = 1; }
}
