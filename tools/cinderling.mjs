#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { install, pack, retrieve } from './distribution.mjs';

const [command, requestedVersion, ...options] = process.argv.slice(2);
const version = requestedVersion || (command === 'pack' ? process.env.CINDERLING_VERSION || 'v0.0.0' : null);
try {
  if (!version) throw new Error('usage: cinderling pack|init|upgrade <explicit version> [--archive path] [--dir path] [--dry-run] [--keep-overrides]');
  if (command === 'pack') {
    console.log(pack(process.cwd(), version, path.resolve(options[0] || `dist/cinderling-${version}.tar.gz`)));
  } else if (command === 'init' || command === 'upgrade') {
    const value = flag => { const index = options.indexOf(flag); if (index !== -1 && !options[index + 1]) throw new Error(`${flag} requires a value`); return index === -1 ? null : options[index + 1]; };
    const root = path.resolve(value('--dir') || process.cwd());
    if (command === 'upgrade' && !fs.existsSync(path.join(root, '.cinderling/managed.json'))) throw new Error('not an initialized consumer');
    if (command === 'init' && fs.existsSync(path.join(root, '.cinderling/managed.json'))) throw new Error('consumer already initialized');
    const archive = value('--archive') ? fs.readFileSync(path.resolve(value('--archive'))) : await retrieve(version);
    const definitionDecisions = {};
    for (let i = 0; i < options.length; i++) if (options[i] === '--definition') {
      const match = /^(retain|retire):(.+)$/.exec(options[++i] || '');
      if (!match || Object.hasOwn(definitionDecisions, match[2])) throw new Error('--definition requires a unique retain:path or retire:path');
      definitionDecisions[match[2]] = match[1];
    }
    const backup = value('--legacy-backup');
    console.log(JSON.stringify(install(root, archive, version, { dryRun: options.includes('--dry-run'), keepOverrides: options.includes('--keep-overrides'), definitions: value('--definitions'), definitionDecisions, reconcile: options.includes('--reconcile'), legacyBackup: backup ? path.resolve(backup) : undefined }), null, 2));
  } else throw new Error('unknown command');
} catch (error) { console.error(error.message); process.exitCode = 1; }
