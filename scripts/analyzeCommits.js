const cp = require('child_process');
const fs = require('fs');

const commitsRaw = cp.execSync('git log --format="%h|%s" -n 30', { encoding: 'utf-8' }).trim().split('\n');
const results = [];

for (const line of commitsRaw) {
  if (!line.trim()) continue;
  const [hash, ...msgParts] = line.split('|');
  const msg = msgParts.join('|');
  const stat = cp.execSync(`git show --stat --oneline ${hash}`, { encoding: 'utf-8' }).trim();
  const filesChanged = cp.execSync(`git show --name-status --oneline ${hash}`, { encoding: 'utf-8' }).trim().split('\n').slice(1);
  results.push({ hash, msg, stat, filesChanged });
}

console.log(JSON.stringify(results, null, 2));
