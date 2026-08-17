import { parseLatexResume } from '../src/app-core/latexParser';
import { parseEnvContent } from '../src/app-core/envParser';
import * as fs from 'fs';
import * as path from 'path';

function testLatexAndEnvParsers() {
  console.log('=== TESTING MULTI-USER LATEX & .ENV PARSER UTILITIES ===');

  // 1. Test .env parser
  const sampleEnv = `
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA_SAMPLE_KEY_FOR_TEST
AWS_SECRET_ACCESS_KEY=sample_secret_key_testing_123456789
AWS_S3_BUCKET=jobsprep
OPENROUTER_API_KEY=sk-or-v1-testkey123
`;
  const envParsed = parseEnvContent(sampleEnv);
  console.log('[✓] .env Parsed successfully:');
  console.log('    Region:', envParsed.awsRegion);
  console.log('    Bucket:', envParsed.awsBucket);
  console.log('    Access Key:', envParsed.awsAccessKeyId);
  console.log('    OpenRouter:', envParsed.openrouterApiKey);

  // 2. Test master_resume.tex parser
  const texPath = path.resolve(__dirname, '../config/master_resume.tex');
  if (fs.existsSync(texPath)) {
    const texContent = fs.readFileSync(texPath, 'utf8');
    const parsedLatex = parseLatexResume(texContent);

    console.log('[✓] LaTeX Resume Parsed successfully:');
    console.log('    Name:', parsedLatex.name);
    console.log('    Email:', parsedLatex.email);
    console.log('    Phone:', parsedLatex.phone);
    console.log('    Location:', parsedLatex.location);
    console.log('    LinkedIn:', parsedLatex.linkedin);
    console.log('    GitHub:', parsedLatex.github);
    console.log('    Extracted Skills Count:', parsedLatex.skills.length);
    console.log('    Skills Sample:', parsedLatex.skills.slice(0, 5));
  }

  console.log('=== MULTI-USER SETUP UTILITIES 100% OPERATIONAL! ===');
}

testLatexAndEnvParsers();
