import Anthropic from '@anthropic-ai/sdk';
import { ENV } from '../config/env';

// Stable known-working free models on OpenRouter (Aug 2026)
// These are tried first. If they 404, we fetch the live free models list.
const SEED_FREE_MODELS = [
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'nvidia/nemotron-3.5-lightning:free',
  'nvidia/nemotron-3-nano-30b-a3b:free',
  'nvidia/nemotron-nano-12b-v2-vl:free',
  'nvidia/nemotron-nano-9b-v2:free',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
  'openai/gpt-oss-20b:free',
  'deepseek/deepseek-r1-distill-llama-70b:free',
  'qwen/qwen3-8b:free',
  'qwen/qwen3-14b:free',
  'qwen/qwen3-30b-a3b:free',
  'google/gemma-4-26b-a4b-it:free',
  'google/gemma-4-31b-it:free',
  'mistralai/mistral-small-3.1-24b-instruct:free',
  'microsoft/phi-4:free',
  'meta-llama/llama-3.1-8b-instruct:free',
  'liquid/lfm-7b:free',
  'cohere/north-mini-code:free',
  'inclusionai/ling-3.0-tiny:free',
  'poolside/laguna-s-2.1:free',
  'poolside/laguna-xs-2.1:free',
];

// Cache of live free models fetched from the OpenRouter API
let cachedFreeModels: string[] | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export class LLMService {
  private anthropicClient: Anthropic | null = null;

  constructor() {
    if (ENV.ANTHROPIC_API_KEY) {
      this.anthropicClient = new Anthropic({ apiKey: ENV.ANTHROPIC_API_KEY });
    }
  }

  /**
   * Fetch the live list of free models from OpenRouter API.
   * Results are cached for 1 hour to avoid excess API calls.
   */
  private async fetchLiveFreeModels(): Promise<string[]> {
    if (cachedFreeModels && Date.now() < cacheExpiry) {
      return cachedFreeModels;
    }

    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          Authorization: `Bearer ${ENV.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data: any = await response.json();
        const freeModels = (data.data || [])
          .filter((m: any) => {
            const pricing = m.pricing;
            if (!pricing) return false;
            const promptCost = parseFloat(pricing.prompt || '999');
            const completionCost = parseFloat(pricing.completion || '999');
            return promptCost === 0 && completionCost === 0;
          })
          .map((m: any) => m.id)
          .filter(Boolean);

        if (freeModels.length > 0) {
          cachedFreeModels = freeModels;
          cacheExpiry = Date.now() + CACHE_TTL_MS;
          console.log(`[LLMService] Fetched ${freeModels.length} live free models from OpenRouter.`);
          return freeModels;
        }
      }
    } catch (err: any) {
      console.warn('[LLMService] Failed to fetch live free models:', err.message);
    }

    // Fallback to seed list
    return SEED_FREE_MODELS;
  }

  public async completion(prompt: string, options: { model?: string; maxTokens?: number } = {}): Promise<string> {
    const maxTokens = options.maxTokens || 1500;

    // 1. OpenRouter API — try free models dynamically fetched from OpenRouter
    if (ENV.OPENROUTER_API_KEY) {
      // Get the live list of free models
      const liveFreeModels = await this.fetchLiveFreeModels();

      // Combine: seed models first (for quick wins), then live models
      const allModels = [...new Set([...SEED_FREE_MODELS, ...liveFreeModels])];

      for (const openRouterModel of allModels) {
        try {
          console.log(`[LLMService] Attempting model: ${openRouterModel}`);

          const fetchWithTimeout = async () => {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 8000);
            try {
              const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${ENV.OPENROUTER_API_KEY}`,
                  'HTTP-Referer': 'http://localhost:3000',
                  'X-Title': 'JobRadar Autonomous Job Search Engine',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: openRouterModel,
                  messages: [{ role: 'user', content: prompt }],
                  max_tokens: maxTokens,
                  temperature: 0.3,
                }),
                signal: controller.signal,
              });

              if (!response.ok) return null;
              const data: any = await response.json();
              let content = data.choices?.[0]?.message?.content || '';
              content = content
                .replace(/^User Safety:\s*safe\s*/i, '')
                .replace(/^Safety:\s*safe\s*/i, '')
                .trim();
              return content && content.length > 10 ? content : null;
            } finally {
              clearTimeout(timer);
            }
          };

          const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000));
          const content = await Promise.race([fetchWithTimeout(), timeoutPromise]);

          if (content) {
            console.log(`[LLMService] ✅ Completion via OpenRouter model: ${openRouterModel}`);
            return content;
          }
        } catch (err: any) {
          continue;
        }
      }

      // If all free models failed, try the auto-router
      try {
        const autoResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${ENV.OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'JobRadar',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'openrouter/auto',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: maxTokens,
          }),
        });

        if (autoResponse.ok) {
          const data: any = await autoResponse.json();
          const content = (data.choices?.[0]?.message?.content || '').trim();
          if (content) {
            console.log('[LLMService] ✅ Completion via openrouter/auto');
            return content;
          }
        }
      } catch {}
    }

    // 2. Fallback to Direct Anthropic SDK
    if (ENV.ANTHROPIC_API_KEY) {
      try {
        if (!this.anthropicClient) {
          this.anthropicClient = new Anthropic({ apiKey: ENV.ANTHROPIC_API_KEY });
        }

        const response = await this.anthropicClient.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: maxTokens,
          messages: [{ role: 'user', content: prompt }],
        });

        const content = response.content[0].type === 'text' ? response.content[0].text : '';
        if (content) {
          console.log('[LLMService] ✅ Completion via Direct Anthropic claude-3-haiku');
          return content.trim();
        }
      } catch (e: any) {
        console.warn('[LLMService] Direct Anthropic SDK failed:', e.message);
      }
    }

    throw new Error('[LLMService] All LLM endpoints failed. Check API keys and model availability on OpenRouter.');
  }
}

export const llmService = new LLMService();
