import { spawnSync } from 'node:child_process';

const prefix = ['AI', 'za'].join('');
const result = spawnSync('grep', [
  '-R', '-n',
  '--exclude-dir=.git',
  '--exclude=.env.local',
  '--exclude=.env',
  prefix,
  '.',
], { encoding: 'utf8' });

if (result.status === 0 && result.stdout.trim()) {
  console.error('Potential Gemini API key found in repository:\n' + result.stdout);
  process.exit(1);
}

console.log('No Gemini API key prefix found in repository files.');
