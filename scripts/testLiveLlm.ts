import { llmClient } from '../src/app-core/llmClient';
import { store } from '../src/app-core/store';

async function runLlmTest() {
  const apiKey = process.env.OPENROUTER_API_KEY || store.getProfile().apiKey || '';
  const prompt = 'Extract 3 key technical requirements for a Junior Full Stack Developer at Amazon. Return a bulleted list.';
  const systemPrompt = 'You are a technical recruitment assistant. Be concise.';

  console.log('================================================================');
  console.log('🧠 TESTING LIVE OPENROUTER LLM COMPLETION (3 CONSECUTIVE RUNS)');
  console.log('================================================================\n');

  for (let i = 1; i <= 3; i++) {
    console.log(`--- RUN #${i} ---`);
    const startTime = Date.now();
    try {
      const response = await llmClient.callLlm(prompt, systemPrompt, apiKey);
      const elapsed = Date.now() - startTime;
      console.log(`✓ Status: SUCCESS`);
      console.log(`⏱️ Latency: ${elapsed}ms (${(elapsed / 1000).toFixed(2)}s)`);
      console.log(`🤖 Model Served: ${response.model}`);
      console.log(`📄 Response Text:\n${response.text}\n`);
    } catch (err: any) {
      const elapsed = Date.now() - startTime;
      console.error(`❌ Status: FAILED after ${elapsed}ms`);
      console.error(`Error:`, err.message, '\n');
    }
  }
}

runLlmTest();
