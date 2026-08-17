const { execSync } = require('child_process');

function scanStagedForSecrets() {
  console.log('🔍 [Security Hook] Scanning staged changes for credentials & API keys...');
  try {
    const diff = execSync('git diff --cached', { encoding: 'utf-8' });
    const addedLines = diff
      .split('\n')
      .filter((line) => line.startsWith('+') && !line.startsWith('+++'));

    const secretRegexes = [
      /sk-or-v1-[a-zA-Z0-9]{30,}/i,
      /sk-ant-api[a-zA-Z0-9_\-]{30,}/i,
      /AKIA[0-9A-Z]{16}/,
      /ghp_[a-zA-Z0-9]{36}/,
      /github_pat_[a-zA-Z0-9_]{40,}/,
    ];

    const allowedMocks = [
      'sk-or-v1-testkey',
      'sk-or-v1-...',
      'sk-ant-...',
      'AKIA_SAMPLE',
      'AKIA_DUMMY',
    ];

    const violations = [];

    for (const line of addedLines) {
      if (allowedMocks.some((mock) => line.includes(mock))) continue;

      for (const regex of secretRegexes) {
        if (regex.test(line)) {
          violations.push(line.trim());
        }
      }
    }

    if (violations.length > 0) {
      console.error('\n❌ [Security Hook] COMMIT BLOCKED: Detected live secret patterns in staged files:');
      violations.forEach((v) => console.error(`  --> ${v}`));
      console.error('\n⚠️ Please store keys in .env or settings, not in version-controlled files.\n');
      process.exit(1);
    }

    console.log('✅ [Security Hook] Clean: No credentials detected in staged commit.\n');
    process.exit(0);
  } catch (err) {
    // If not a git repo or no staged files, continue safely
    process.exit(0);
  }
}

scanStagedForSecrets();
