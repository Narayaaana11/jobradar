const fs = require('fs');
const path = require('path');
const cp = require('child_process');

console.log('================================================================');
console.log('🔒 DEEP FULL-REPOSITORY CREDENTIAL & SECRET AUDIT');
console.log('================================================================\n');

const trackedFiles = cp.execSync('git ls-files', { encoding: 'utf-8' }).trim().split('\n');

const SECRET_PATTERNS = [
  { name: 'OpenRouter Live Key', regex: /sk-or-v1-[a-f0-9]{64}/g },
  { name: 'OpenAI API Key', regex: /sk-[a-zA-Z0-9]{32,}/g },
  { name: 'Anthropic API Key', regex: /sk-ant-[a-zA-Z0-9_-]{32,}/g },
  { name: 'AWS Access Key ID', regex: /AKIA[0-9A-Z]{16}/g },
  { name: 'AWS Secret Access Key', regex: /(?:aws_secret_access_key|AWS_SECRET_ACCESS_KEY)\s*=\s*[A-Za-z0-9/+=]{40}/g },
  { name: 'Telegram Bot Token', regex: /\b\d{9,10}:[A-Za-z0-9_-]{35}\b/g },
  { name: 'Private Key Block', regex: /-----BEGIN (?:RSA )?PRIVATE KEY-----/g },
];

let totalFilesScanned = 0;
let findings = [];

for (const file of trackedFiles) {
  if (!file || file.startsWith('.git/')) continue;
  if (!fs.existsSync(file)) continue;

  // Skip binary files
  if (file.endsWith('.ico') || file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.webp') || file.endsWith('.pdf')) {
    continue;
  }

  totalFilesScanned++;
  try {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      for (const pattern of SECRET_PATTERNS) {
        if (pattern.regex.test(line)) {
          // Allow .env.example with dummy placeholders
          if (file === '.env.example' || file.includes('preCommitSecretCheck') || file.includes('deepSecretScan')) {
            continue;
          }
          findings.push({
            file,
            lineNum: lineIdx + 1,
            pattern: pattern.name,
            snippet: line.trim().substring(0, 80),
          });
        }
      }
    }
  } catch (e) {
    // Ignore binary/unreadable
  }
}

console.log(`Total Tracked Source Files Scanned: ${totalFilesScanned}`);
console.log(`Potential Secret Findings in Git Tracked Tree: ${findings.length}\n`);

if (findings.length === 0) {
  console.log('✅ CLEAN: Zero hardcoded API keys or AWS credentials found in tracked repository files.');
} else {
  console.log('⚠️ FINDINGS DETECTED:');
  findings.forEach((f) => {
    console.log(`  - [${f.pattern}] in ${f.file}:${f.lineNum} -> "${f.snippet}"`);
  });
}
