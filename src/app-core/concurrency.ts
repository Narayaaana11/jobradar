/**
 * JobRadar Concurrency & Rate-Budgeting Gate
 * 
 * Prevents flooding free-tier AI APIs (Groq, Gemini, OpenRouter, Ollama) and
 * caps simultaneous Playwright headless browser instances on the user's machine.
 */

export class ConcurrencyLimiter {
  private activeCount = 0;
  private queue: Array<() => void> = [];

  constructor(public readonly maxConcurrency: number) {}

  public get activeJobs(): number {
    return this.activeCount;
  }

  public get queuedJobs(): number {
    return this.queue.length;
  }

  public async run<T>(fn: () => Promise<T>): Promise<T> {
    while (this.activeCount >= this.maxConcurrency) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }

    this.activeCount++;
    try {
      return await fn();
    } finally {
      this.activeCount--;
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        if (next) next();
      }
    }
  }
}

// Global concurrency gates
export const aiConcurrencyLimiter = new ConcurrencyLimiter(3);
export const playwrightConcurrencyLimiter = new ConcurrencyLimiter(2);
