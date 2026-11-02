import fs from 'node:fs';
import { spawn } from 'node:child_process';

const fail = message => { throw new Error(message); };
const args = process.argv.slice(2);
if (args.some(arg => arg !== '--seed') || args.filter(arg => arg === '--seed').length > 1) fail('usage: pnpm dev:stack [--seed]');

let config;
try { config = JSON.parse(fs.readFileSync('dev-stack.json', 'utf8')); }
catch (error) { fail(`cannot read dev-stack.json: ${error.message}`); }
if (!config || typeof config !== 'object' || Array.isArray(config)) fail('dev-stack.json must be an object');
const parse = (key, required = false) => {
  const commands = Object.hasOwn(config, key) ? config[key] : (required ? null : []);
  if (!Array.isArray(commands) || (required && commands.length === 0) || commands.some(command => !Array.isArray(command) || !command.length || command.some(part => typeof part !== 'string' || !part.length || part.includes('\0')))) fail(`${key} must be ${required ? 'a non-empty' : 'an'} array of non-empty command arrays without NUL characters`);
  return commands;
};
const migrations = parse('migrations');
const seeds = parse('seeds');
const apps = parse('apps', true);
if (args.includes('--seed') && !seeds.length) fail('--seed requires at least one configured seed command');

const children = new Set();
const groups = new Set();
let stopping = false;
let stopSignal;
let shutdown;
const signalChild = (child, signal) => {
  try { if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, signal); else child.kill(signal); }
  catch (error) { if (error.code !== 'ESRCH') console.error(`could not signal child: ${error.message}`); }
};
const pruneGroups = () => {
  for (const child of groups) {
    try { process.kill(-child.pid, 0); }
    catch (error) { if (error.code === 'ESRCH') groups.delete(child); }
  }
};
const stop = signal => {
  if (stopping) return;
  stopping = true;
  stopSignal = signal;
  const targets = process.platform === 'win32' ? children : groups;
  for (const child of targets) signalChild(child, signal);
  shutdown = new Promise(resolve => {
    const check = () => {
      if (process.platform !== 'win32') pruneGroups();
      if (!targets.size) { clearInterval(interval); clearTimeout(timer); resolve(); }
    };
    const interval = setInterval(check, 50);
    const timer = setTimeout(() => {
      for (const child of targets) signalChild(child, 'SIGKILL');
      clearInterval(interval);
      resolve();
    }, 3000);
    check();
  });
};
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => stop(signal));
const run = command => new Promise(resolve => {
  if (stopping) return resolve({ code: null, signal: stopSignal });
  let child;
  try { child = spawn(command[0], command.slice(1), { stdio: 'inherit', detached: process.platform !== 'win32' }); }
  catch (error) { console.error(`failed to start ${command[0]}: ${error.message}`); return resolve({ code: null, error }); }
  children.add(child);
  if (child.pid && process.platform !== 'win32') groups.add(child);
  let error;
  child.on('error', cause => { error = cause; });
  child.on('close', (code, signal) => {
    children.delete(child);
    if (error) console.error(`failed to start ${command[0]}: ${error.message}`);
    resolve({ code, signal, error, child });
  });
});
const describe = (command, result) => `${command[0]} ${result.error ? 'could not start' : result.signal ? `terminated by ${result.signal}` : `exited with code ${result.code}`}`;
let exitCode = 0;
for (const command of [...migrations, ...(args.includes('--seed') ? seeds : [])]) {
  const result = await run(command);
  if (stopping) break;
  if (result.code !== 0 || result.error) { console.error(describe(command, result)); exitCode = 1; stop('SIGTERM'); break; }
  pruneGroups();
}
if (!stopping && !exitCode) {
  await Promise.all(apps.map(async command => {
    const result = await run(command);
    if (!stopping) {
      console.error(`app ${describe(command, result)}; stopping stack`);
      exitCode = 1;
      stop('SIGTERM');
    }
  }));
}
if (shutdown) await shutdown;
if (stopSignal === 'SIGINT') exitCode = 130;
else if (stopSignal === 'SIGTERM' && !exitCode) exitCode = 143;
process.exitCode = exitCode;
