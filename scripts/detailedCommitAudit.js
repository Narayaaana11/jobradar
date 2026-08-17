const cp = require('child_process');

const commitsRaw = cp.execSync('git log --format="%h|%s" -n 30', { encoding: 'utf-8' }).trim().split('\n');

for (const line of commitsRaw) {
  if (!line.trim()) continue;
  const [hash, ...msgParts] = line.split('|');
  const msg = msgParts.join('|');
  const files = cp.execSync(`git diff-tree --no-commit-id --name-status -r ${hash}`, { encoding: 'utf-8' }).trim().split('\n');
  const shortStat = cp.execSync(`git show --shortstat --oneline ${hash}`, { encoding: 'utf-8' }).trim();
  console.log(`\n=== COMMIT: ${hash} ===\nMessage: ${msg}\nShortStat: ${shortStat}\nFiles (${files.length}):`);
  files.forEach(f => console.log(`  ${f}`));
}
