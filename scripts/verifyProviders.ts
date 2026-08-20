/**
 * verifyProviders.ts
 * Real network calls to every configured AI provider.
 * Honest HTTP status reporting — no mocked results.
 */
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const GROQ_KEY = process.env.GROQ_API_KEY || "";
const GEMINI_KEY = process.env.GEMINI_API_KEY || "";
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || "";

interface ProviderResult {
  provider: string; model: string;
  status: "SUCCESS" | "RATE_LIMITED" | "ERROR" | "NO_KEY";
  httpStatus?: number; latencyMs?: number; rawText?: string; errorMessage?: string;
}

async function testGroq(): Promise<ProviderResult> {
  if (!GROQ_KEY) return { provider: "Groq", model: "n/a", status: "NO_KEY" };
  const model = "groq/compound";
  const t0 = Date.now();
  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({ model, messages: [{ role: "user", content: "Say: Groq live call verified." }], max_tokens: 20, temperature: 0 }),
      signal: AbortSignal.timeout(15000),
    });
    const j = await r.json(); const ms = Date.now() - t0;
    if (r.ok && j.choices?.[0]?.message?.content) return { provider: "Groq", model: j.model || model, status: "SUCCESS", httpStatus: 200, latencyMs: ms, rawText: j.choices[0].message.content.trim() };
    if (r.status === 429) return { provider: "Groq", model, status: "RATE_LIMITED", httpStatus: 429, latencyMs: ms, errorMessage: j.error?.message || "Rate limited" };
    return { provider: "Groq", model, status: "ERROR", httpStatus: r.status, latencyMs: ms, errorMessage: j.error?.message || JSON.stringify(j).substring(0, 200) };
  } catch (e: any) { return { provider: "Groq", model, status: "ERROR", errorMessage: e.message }; }
}

async function testGemini(): Promise<ProviderResult> {
  if (!GEMINI_KEY) return { provider: "Gemini", model: "n/a", status: "NO_KEY" };
  const model = "gemini-3.6-flash";
  const t0 = Date.now();
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: "Say: Gemini live call verified." }] }] }),
      signal: AbortSignal.timeout(20000),
    });
    const j = await r.json(); const ms = Date.now() - t0;
    if (r.ok && j.candidates?.[0]?.content?.parts?.[0]?.text) return { provider: "Gemini", model: `gemini/${model}`, status: "SUCCESS", httpStatus: 200, latencyMs: ms, rawText: j.candidates[0].content.parts[0].text.trim() };
    if (r.status === 429) return { provider: "Gemini", model, status: "RATE_LIMITED", httpStatus: 429, latencyMs: ms, errorMessage: j.error?.message || "Rate limited" };
    return { provider: "Gemini", model, status: "ERROR", httpStatus: r.status, latencyMs: ms, errorMessage: j.error?.message || JSON.stringify(j).substring(0, 200) };
  } catch (e: any) { return { provider: "Gemini", model, status: "ERROR", errorMessage: e.message }; }
}

async function testOpenRouter(): Promise<ProviderResult> {
  if (!OPENROUTER_KEY) return { provider: "OpenRouter", model: "n/a", status: "NO_KEY" };
  let freeModels: string[] = [];
  try {
    const r = await fetch("https://openrouter.ai/api/v1/models", { headers: { Authorization: `Bearer ${OPENROUTER_KEY}` }, signal: AbortSignal.timeout(8000) });
    if (r.ok) { const j = await r.json(); freeModels = (j.data || []).filter((m: any) => m.id?.endsWith(":free") && !m.id.includes("safety") && !m.id.includes("lyria")).map((m: any) => m.id as string); }
  } catch { /**/ }

  if (freeModels.length === 0) return { provider: "OpenRouter", model: "n/a", status: "ERROR", errorMessage: "Could not retrieve free model list from /api/v1/models" };

  for (const model of freeModels) {
    const t0 = Date.now();
    try {
      const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENROUTER_KEY}`, "HTTP-Referer": "https://jobradar.app", "X-Title": "JobRadar" },
        body: JSON.stringify({ model, messages: [{ role: "user", content: "Say: OpenRouter live call verified." }], max_tokens: 20 }),
        signal: AbortSignal.timeout(15000),
      });
      const j = await r.json(); const ms = Date.now() - t0;
      if (r.ok && j.choices?.[0]?.message?.content) return { provider: "OpenRouter", model, status: "SUCCESS", httpStatus: 200, latencyMs: ms, rawText: j.choices[0].message.content.trim() };
      if (r.status === 429) {
        const reset = j.error?.metadata?.headers?.["X-RateLimit-Reset"];
        const resetDate = reset ? new Date(Number(reset)).toISOString() : "unknown";
        return { provider: "OpenRouter", model, status: "RATE_LIMITED", httpStatus: 429, latencyMs: ms, errorMessage: `Free tier daily limit exhausted. Resets at ${resetDate}. (50 req/day cap).` };
      }
      console.log(`    [${model}] HTTP ${r.status}: ${(j.error?.message || "unknown").substring(0, 80)}`);
    } catch (e: any) { console.log(`    [${model}] Exception: ${e.message}`); }
  }
  return { provider: "OpenRouter", model: freeModels[0], status: "ERROR", errorMessage: "All free models attempted — all failed." };
}

function print(r: ProviderResult): void {
  const icon = r.status === "SUCCESS" ? "SUCCESS" : r.status === "RATE_LIMITED" ? "RATE_LIMITED" : r.status === "NO_KEY" ? "NO_KEY" : "ERROR";
  console.log(`\n[${icon}] ${r.provider}`);
  console.log(`  Model:   ${r.model}`);
  if (r.httpStatus !== undefined) console.log(`  HTTP:    ${r.httpStatus}`);
  if (r.latencyMs !== undefined) console.log(`  Latency: ${r.latencyMs}ms`);
  if (r.rawText) console.log(`  Output:  "${r.rawText.substring(0, 120)}"`);
  if (r.errorMessage) console.log(`  Error:   ${r.errorMessage}`);
}

async function main() {
  console.log("=== JobRadar Live Provider Verification ===");
  console.log("Timestamp:", new Date().toISOString());
  const results = await Promise.all([testGroq(), testGemini(), testOpenRouter()]);
  results.forEach(print);
  console.log("\n=== SUMMARY ===");
  const working = results.filter(r => r.status === "SUCCESS").length;
  const rl = results.filter(r => r.status === "RATE_LIMITED").length;
  console.log(`Working: ${working}/3  Rate-limited: ${rl}/3  Error: ${3 - working - rl}/3`);
  process.exit(working + rl > 0 ? 0 : 1);
}
main();
