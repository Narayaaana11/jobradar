import * as fs from 'fs';
import * as path from 'path';

function loadEnvFile() {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        process.env[key] = val;
      }
    }
  }
}

loadEnvFile();

const GROQ_KEY = process.env.GROQ_API_KEY || '';
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';

async function listModels() {
  console.log('Querying Groq models...');
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${GROQ_KEY.trim()}` },
    });
    const data = await res.json();
    console.log('Groq models:', (data.data || []).map((m: any) => m.id));
  } catch (err) {
    console.error('Groq models error:', err);
  }

  console.log('\nQuerying Gemini models...');
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_KEY.trim()}`);
    const data = await res.json();
    console.log('Gemini models:', (data.models || []).map((m: any) => m.name));
  } catch (err) {
    console.error('Gemini models error:', err);
  }
}

listModels();
