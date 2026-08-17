import { llmClient } from '../src/app-core/llmClient';
import { extractJobDetails } from '../src/app-core/extractor';
import { defaultProfile } from '../src/app-core/store';

async function test15ModelRotation() {
  console.log('================================================================');
  console.log('🔄 TESTING OPENROUTER FREE-MODEL ROTATION ACROSS 15 CALLS');
  console.log('================================================================\n');

  const apiKey = process.env.OPENROUTER_API_KEY || defaultProfile.apiKey || '';
  if (!apiKey) {
    console.error('❌ No API key found in env or store.');
    process.exit(1);
  }

  // 1. Fetch and log live free models
  const liveFreeModels = await llmClient.getLiveFreeModels();
  console.log(`📡 Live Free Models Fetched from OpenRouter (${liveFreeModels.length} models available):`);
  liveFreeModels.forEach((m, idx) => console.log(`   [${idx + 1}] ${m}`));
  console.log('\n----------------------------------------------------------------\n');

  const amazonJob = extractJobDetails(`Amazon SDE Hiring
Graduation Year: 2024/2025 / 2026
Location: Bengaluru / Hyderabad / Chennai / Delhi
Apply Link: https://www.amazon.jobs/en/jobs/10454435/software-dev-engineer-i-amazon-university-talent-acquisition`);

  const results: Array<{
    callNumber: number;
    actionType: string;
    modelServed: string;
    latencyMs: number;
    status: string;
  }> = [];

  const callTypes = [
    'AI Cover Letter',
    'AI Interview Prep',
    'AI Re-Score',
    'AI Cover Letter',
    'AI Interview Prep',
    'AI Re-Score',
    'AI Cover Letter',
    'AI Interview Prep',
    'AI Re-Score',
    'AI Cover Letter',
    'AI Interview Prep',
    'AI Re-Score',
    'AI Cover Letter',
    'AI Interview Prep',
    'AI Re-Score',
  ];

  for (let i = 0; i < 15; i++) {
    const action = callTypes[i];
    const startTime = Date.now();
    let modelServed = 'unknown';
    let status = 'SUCCESS';

    try {
      if (action === 'AI Cover Letter') {
        const res = await llmClient.generateAiCoverLetter(amazonJob, defaultProfile, apiKey);
        if (res.success && res.data) {
          modelServed = res.modelUsed || 'unknown';
        } else {
          status = `FAILED (${res.error})`;
        }
      } else if (action === 'AI Interview Prep') {
        const res = await llmClient.generateAiInterviewPrep(amazonJob, defaultProfile, apiKey);
        if (res.success && res.data) {
          modelServed = res.modelUsed || 'unknown';
        } else {
          status = `FAILED (${res.error})`;
        }
      } else {
        const res = await llmClient.scoreJobWithLlm(amazonJob, defaultProfile, apiKey);
        if (res.success && res.data) {
          modelServed = res.modelUsed || 'unknown';
        } else {
          status = `FAILED (${res.error})`;
        }
      }
    } catch (err: any) {
      status = `ERROR (${err.message})`;
    }

    const latencyMs = Date.now() - startTime;
    results.push({
      callNumber: i + 1,
      actionType: action,
      modelServed,
      latencyMs,
      status,
    });

    console.log(
      `[Call #${(i + 1).toString().padStart(2, '0')}/15] ${action.padEnd(18)} ➔ Model: ${modelServed.padEnd(45)} | ⏱️ ${latencyMs}ms | ${status}`
    );
  }

  console.log('\n================================================================');
  console.log('📊 MODEL ROTATION DISTRIBUTION SUMMARY');
  console.log('================================================================');

  const distribution: Record<string, number> = {};
  for (const r of results) {
    distribution[r.modelServed] = (distribution[r.modelServed] || 0) + 1;
  }

  for (const [model, count] of Object.entries(distribution)) {
    const pct = ((count / 15) * 100).toFixed(1);
    console.log(`• ${model}: ${count}/15 calls (${pct}%)`);
  }
}

test15ModelRotation();
