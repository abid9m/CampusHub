const path = require('path');
const { spawn } = require('child_process');
const net = require('net');
const fs = require('fs');

const root = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(root, '.env') });
const node = process.execPath;
const processes = [];
let stopping = false;
let nextExitCode = 0;

function assertPortIsAvailable(port, label) {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        reject(new Error(`${label} port ${port} is already in use. Stop the other server before running npm run dev:all.`));
      } else {
        reject(error);
      }
    });
    probe.listen(port, () => probe.close(resolve));
  });
}

function start(label, script, args, cwd) {
  const child = spawn(node, [script, ...args], {
    cwd,
    env: process.env,
    stdio: 'inherit',
    windowsHide: true,
  });
  processes.push({ label, child });
  child.once('error', (error) => {
    console.error(`${label} failed to start: ${error.message}`);
    shutdown(1);
  });
  child.once('exit', (code, signal) => {
    if (!stopping) {
      const portConflict = code === 1 && label === 'Backend';
      console.error(portConflict
        ? `Backend failed to start. Check that port ${Number(process.env.PORT) || 5000} is free.`
        : `${label} stopped${signal ? ` (${signal})` : ` (exit ${code})`}. Stopping the other development server.`);
      shutdown(code || 1);
    }
  });
}

function shutdown(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  nextExitCode = exitCode;
  for (const { child } of processes) {
    if (!child.killed && child.exitCode === null) child.kill('SIGINT');
  }
  const pending = processes.filter(({ child }) => child.exitCode === null);
  if (!pending.length) {
    process.exit(exitCode);
  }
  const timeout = setTimeout(() => {
    for (const { child } of pending) {
      if (child.exitCode === null) child.kill();
    }
    process.exit(nextExitCode);
  }, 5000);
  timeout.unref();
  let remaining = pending.length;
  for (const { child } of pending) {
    child.once('exit', () => {
      remaining -= 1;
      if (!remaining) {
        clearTimeout(timeout);
        process.exit(nextExitCode);
      }
    });
  }
}

const backend = path.join(root, 'src', 'index.js');
const vite = path.join(root, 'frontend', 'node_modules', 'vite', 'bin', 'vite.js');

for (const executable of [backend, vite]) {
  if (!fs.existsSync(executable)) {
    console.error(`Missing development executable: ${executable}. Run npm install and npm --prefix frontend install.`);
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
if (process.platform === 'win32') process.on('SIGBREAK', () => shutdown(0));

async function main() {
  const backendPort = Number(process.env.PORT) || 5000;
  const frontendPort = 5173;
  await assertPortIsAvailable(backendPort, 'Backend');
  await assertPortIsAvailable(frontendPort, 'Frontend');
  console.log('Starting CampusHub API and frontend. Press Ctrl+C to stop both.');
  start('Backend', backend, [], root);
  start('Frontend', vite, ['--strictPort'], path.join(root, 'frontend'));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
