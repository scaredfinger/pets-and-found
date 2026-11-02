#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { install, pack, retrieve } from './distribution.mjs';

const [command, requestedVersion, ...options] = process.argv.slice(2);
const version = requestedVersion || (command === 'pack' ? process.env.CINDERLING_VERSION || 'v0.0.0' : null);
try {
  if (!version) throw new Error('usage: cinderling pack|install|init|upgrade <explicit version> [--archive path] [--sha256 digest] [--review path] [--dir path] [--dry-run] [--keep-overrides]');
  if (command === 'pack') {
    console.log(pack(process.cwd(), version, path.resolve(options[0] || `dist/cinderling-${version}.tar.gz`)));
  } else if (command === 'install' || command === 'init' || command === 'upgrade') {
    const value = flag => { const index = options.indexOf(flag); if (index !== -1 && (!options[index + 1] || options[index + 1].startsWith('--'))) throw new Error(`${flag} requires a value`); return index === -1 ? null : options[index + 1]; };
    const root = path.resolve(value('--dir') || process.cwd());
    if (command !== 'install' && !value('--review') && (fs.existsSync(path.join(root, 'docs/architecture')) || fs.existsSync(path.join(root, 'docs/decisions')) || fs.existsSync(path.join(root, '.cinderling/managed.json')))) throw new Error('governed or initialized consumers require install <version> --review <path>; legacy init/upgrade cannot bypass review');
    if (command === 'upgrade' && !fs.existsSync(path.join(root, '.cinderling/managed.json'))) throw new Error('not an initialized consumer');
    if (command === 'init' && fs.existsSync(path.join(root, '.cinderling/managed.json'))) throw new Error('consumer already initialized');
    const archive = value('--archive') ? fs.readFileSync(path.resolve(value('--archive'))) : await retrieve(version);
    const sha256 = value('--sha256');
    if (sha256 !== null && (!/^[a-f0-9]{64}$/.test(sha256) || crypto.createHash('sha256').update(archive).digest('hex') !== sha256)) throw new Error('release archive SHA-256 mismatch');
    if (command === 'install' || value('--review')) {
      const valued = ['--archive', '--dir', '--sha256', '--review', '--legacy-backup'];
      const seen = new Set();
      for (let index = 0; index < options.length; index++) {
        const option = options[index];
        if (seen.has(option) || option !== '--dry-run' && !valued.includes(option)) throw new Error(`unsupported or duplicate reviewed-install option: ${option}; record migration choices in the review manifest`);
        seen.add(option);
        if (valued.includes(option)) { value(option); index++; }
      }
      const { installReviewed, reviewInstallation } = await import('./installation.mjs');
      const reviewPath = value('--review') ? path.resolve(value('--review')) : undefined;
      const settings = { sha256: sha256 ?? undefined, dryRun: options.includes('--dry-run'), reviewPath, legacyBackup: value('--legacy-backup') ? path.resolve(value('--legacy-backup')) : undefined };
      const input = reviewPath ? JSON.parse(fs.readFileSync(reviewPath, 'utf8')) : null;
      const review = input?.reviewRequired === true ? input.review : input;
      console.log(JSON.stringify(review ? installReviewed(root, archive, version, review, settings) : { reviewRequired: true, review: reviewInstallation(root, archive, version, settings) }, null, 2));
    } else {
      const definitionDecisions = {};
      for (let i = 0; i < options.length; i++) if (options[i] === '--definition') {
        const match = /^(retain|retire):(.+)$/.exec(options[++i] || '');
        if (!match || Object.hasOwn(definitionDecisions, match[2])) throw new Error('--definition requires a unique retain:path or retire:path');
        definitionDecisions[match[2]] = match[1];
      }
      const backup = value('--legacy-backup');
      console.log(JSON.stringify(install(root, archive, version, { dryRun: options.includes('--dry-run'), keepOverrides: options.includes('--keep-overrides'), definitions: value('--definitions'), definitionDecisions, reconcile: options.includes('--reconcile'), legacyBackup: backup ? path.resolve(backup) : undefined }), null, 2));
    }
  } else throw new Error('unknown command');
} catch (error) { console.error(error.message); process.exitCode = 1; }
