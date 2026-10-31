#!/usr/bin/env node
import path from 'node:path';
import { evaluate } from './architecture.mjs';
import { promote } from './decisions.mjs';
import { impact } from './graph.mjs';

const root = process.cwd();
const [command, ...args] = process.argv.slice(2);
const baseIndex = args.indexOf('--base');
if (baseIndex !== -1 && !args[baseIndex + 1]) {
  console.error('--base requires a branch');
  process.exit(1);
}
const base = baseIndex < 0 ? (process.env.ARCH_BASE || 'main') : args.splice(baseIndex, 2)[1];
const arg = args.find(value => !value.startsWith('--'));
try {
  if (command === 'check') {
    const errors = evaluate(root, { base });
    if (errors.length) throw new Error(errors.join('\n'));
    console.log('Architecture evaluations passed');
  } else if (command === 'impact') {
    console.log(JSON.stringify(impact(root, arg || base), null, 2));
  } else if (command === 'promote') {
    if (!arg) throw new Error('provide a draft path');
    console.log(path.relative(root, promote(root, arg, { base, reviewed: args.includes('--reviewed') })));
  } else throw new Error('usage: cli.mjs check | impact [base] | promote <draft> --reviewed [--base branch]');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
