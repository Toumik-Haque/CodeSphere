#!/usr/bin/env node
/**
 * CodeSphere one-step setup.
 *
 * Usage (from the project root):
 *   node setup.js
 *
 * What it does:
 *   1. Checks your Node.js version
 *   2. Installs dependencies for server/ and client/
 *   3. Creates server/.env and client/.env from the .env.example files
 *      (existing .env files are never overwritten, only missing keys are added)
 *   4. Generates JWT_SECRET and OTP_HASH_SECRET if they are empty
 *   5. Lists any values you still need to fill in
 *
 * Safe to run again at any time, for example after pulling new changes.
 */

const { execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const MIN_NODE_MAJOR = 20;
const APPS = ['server', 'client'];
const AUTO_SECRETS = ['JWT_SECRET', 'OTP_HASH_SECRET'];

const color = (code) => (text) => `\x1b[${code}m${text}\x1b[0m`;
const green = color(32);
const yellow = color(33);
const red = color(31);
const bold = color(1);

const step = (msg) => console.log(`\n${bold('▶ ' + msg)}`);
const ok = (msg) => console.log(`  ${green('✔')} ${msg}`);
const warn = (msg) => console.log(`  ${yellow('!')} ${msg}`);

function fail(msg) {
  console.error(`\n${red('✖ ' + msg)}`);
  process.exit(1);
}

function checkNode() {
  step('Checking Node.js');
  const major = Number(process.versions.node.split('.')[0]);
  if (major < MIN_NODE_MAJOR) {
    fail(`Node.js ${MIN_NODE_MAJOR}+ is required, you have ${process.version}. Get it from https://nodejs.org`);
  }
  ok(`Node.js ${process.version}`);
}

function installDependencies(app) {
  step(`Installing ${app} dependencies (this can take a minute)`);
  try {
    execSync('npm install', { cwd: path.join(ROOT, app), stdio: 'inherit' });
    ok(`${app} dependencies installed`);
  } catch {
    fail(`npm install failed in ${app}/. Fix the error above and run "node setup.js" again.`);
  }
}

// Parses KEY=value lines, ignoring comments and blank lines.
function parseEnv(text) {
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/);
    if (match) values[match[1]] = match[2].trim();
  }
  return values;
}

// Returns the keys that are still empty after setup.
function setupEnv(app) {
  step(`Setting up ${app}/.env`);
  const examplePath = path.join(ROOT, app, '.env.example');
  const envPath = path.join(ROOT, app, '.env');

  if (!fs.existsSync(examplePath)) {
    warn(`${app}/.env.example not found, skipping`);
    return [];
  }

  const exampleText = fs.readFileSync(examplePath, 'utf8');
  let envText;

  if (fs.existsSync(envPath)) {
    envText = fs.readFileSync(envPath, 'utf8');
    const existing = parseEnv(envText);
    const missing = Object.entries(parseEnv(exampleText)).filter(([key]) => !(key in existing));
    if (missing.length) {
      if (!envText.endsWith('\n')) envText += '\n';
      envText += missing.map(([key, value]) => `${key}=${value}`).join('\n') + '\n';
      ok(`Added new keys to existing .env: ${missing.map(([key]) => key).join(', ')}`);
    } else {
      ok('.env already exists and has every key');
    }
  } else {
    envText = exampleText;
    ok('Created .env from .env.example');
  }

  for (const key of AUTO_SECRETS) {
    const pattern = new RegExp(`^(${key}=)\\s*$`, 'm');
    if (pattern.test(envText)) {
      envText = envText.replace(pattern, `$1${crypto.randomBytes(48).toString('hex')}`);
      ok(`Generated ${key}`);
    }
  }

  fs.writeFileSync(envPath, envText);

  return Object.entries(parseEnv(envText))
    .filter(([, value]) => value === '')
    .map(([key]) => `${app}/.env → ${key}`);
}

function main() {
  console.log(bold('\nCodeSphere setup\n================'));
  checkNode();

  for (const app of APPS) installDependencies(app);

  const emptyKeys = APPS.flatMap(setupEnv);

  step('Done');
  if (emptyKeys.length) {
    warn('Fill in these values before starting (see README → Environment variables):');
    for (const key of emptyKeys) console.log(`      ${key}`);
  } else {
    ok('All environment values are set');
  }

  console.log(`
  Start the project in two terminals:

    ${bold('cd server && npm run dev')}    # API on http://localhost:5000
    ${bold('cd client && npm run dev')}    # App on http://localhost:5173

  Optional, create an admin account:

    ${bold('cd server && node scripts/createAdmin.js')}
`);
}

main();
