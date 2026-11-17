const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const frontend = path.join(root, 'frontend');
const npmCli = process.env.npm_execpath;

if (!npmCli || !fs.existsSync(npmCli)) {
  console.error('Run setup with `npm run setup` from the CampusHub project root.');
  process.exit(1);
}

function randomSecret() {
  return crypto.randomBytes(36).toString('base64url');
}

function setValue(content, key, value) {
  const line = `${key}="${value}"`;
  const expression = new RegExp(`^${key}=.*$`, 'm');
  return expression.test(content) ? content.replace(expression, line) : `${content.trimEnd()}\n${line}\n`;
}

function readValue(content, key) {
  const match = content.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : '';
}

function ensureEnvFile(target, template) {
  if (!fs.existsSync(target)) {
    fs.copyFileSync(template, target);
    console.log(`Created ${path.relative(root, target)} from its example.`);
  }
}

ensureEnvFile(path.join(root, '.env'), path.join(root, '.env.example'));
ensureEnvFile(path.join(frontend, '.env'), path.join(frontend, '.env.example'));

const envPath = path.join(root, '.env');
let env = fs.readFileSync(envPath, 'utf8');
const updates = {};
if (readValue(env, 'DATABASE_URL').startsWith('file:')) {
  updates.DATABASE_URL = 'file:./dev.db';
}
const jwtSecret = readValue(env, 'JWT_SECRET');
if (!jwtSecret || jwtSecret.startsWith('replace-with-') || jwtSecret.length < 32) {
  updates.JWT_SECRET = randomSecret();
}

let generatedAdminPassword;
if (!readValue(env, 'ADMIN_EMAIL')) {
  updates.ADMIN_EMAIL = 'admin@campushub.local';
}
if (!readValue(env, 'ADMIN_PASSWORD') || readValue(env, 'ADMIN_PASSWORD').startsWith('replace-with-')) {
  generatedAdminPassword = randomSecret();
  updates.ADMIN_PASSWORD = generatedAdminPassword;
}
for (const [key, value] of Object.entries(updates)) {
  env = setValue(env, key, value);
}
if (Object.keys(updates).length) {
  fs.writeFileSync(envPath, env, { encoding: 'utf8', mode: 0o600 });
}

function runNpm(args, label) {
  console.log(`\n> ${label}`);
  const result = spawnSync(process.execPath, [npmCli, ...args], {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${label} failed${result.status === null ? '' : ` with exit code ${result.status}`}`);
  }
}

try {
  if (!fs.existsSync(path.join(root, 'node_modules', '@prisma', 'client'))) {
    runNpm(['install'], 'Install backend dependencies');
  }
  if (!fs.existsSync(path.join(frontend, 'node_modules', 'vite'))) {
    runNpm(['--prefix', 'frontend', 'install'], 'Install frontend dependencies');
  }
  runNpm(['run', 'generate'], 'Generate Prisma client');
  runNpm(['run', 'db:push:local'], 'Create/update local SQLite database');
  runNpm(['run', 'seed'], 'Seed administrator and shared resources');
  console.log('\nSetup complete.');
  console.log('Frontend: http://localhost:5173');
  console.log('Backend:  http://localhost:5000/api/health');
  console.log(`Admin:    ${readValue(env, 'ADMIN_EMAIL')}`);
  if (generatedAdminPassword) {
    console.log(`Temporary admin password (save it now): ${generatedAdminPassword}`);
  } else {
    console.log('Admin password is already configured in the root .env file.');
  }
} catch (error) {
  console.error(`\nSetup failed: ${error.message}`);
  process.exitCode = 1;
}
