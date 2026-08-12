import { spawnSync } from 'node:child_process';

const command = process.argv[2];
if (command !== 'build' && command !== 'promote') {
  throw new Error('usage: tsx scripts/runHeroDashboardAssets.ts build|promote');
}
const result = process.platform === 'win32'
  ? spawnSync('wsl.exe', ['-e', '.venv/bin/python', 'scripts/buildHeroDashboardAssets.py', command],
    { cwd: process.cwd(), stdio: 'inherit' })
  : spawnSync('.venv/bin/python', ['scripts/buildHeroDashboardAssets.py', command],
    { cwd: process.cwd(), stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
