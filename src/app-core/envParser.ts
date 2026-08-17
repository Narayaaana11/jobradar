/**
 * Utility to parse standard .env file contents
 */
export interface IParsedEnvConfig {
  awsRegion?: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsBucket?: string;
  openrouterApiKey?: string;
  anthropicApiKey?: string;
  telegramBotToken?: string;
  raw: Record<string, string>;
}

export function parseEnvContent(envText: string): IParsedEnvConfig {
  const result: Record<string, string> = {};
  const lines = (envText || '').split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      // Strip surrounding quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      result[key] = val;
    }
  }

  return {
    awsRegion: result['AWS_REGION'] || result['REGION'],
    awsAccessKeyId: result['AWS_ACCESS_KEY_ID'] || result['AWS_KEY'],
    awsSecretAccessKey: result['AWS_SECRET_ACCESS_KEY'] || result['AWS_SECRET'],
    awsBucket: result['AWS_S3_BUCKET'] || result['S3_BUCKET'] || result['BUCKET'],
    openrouterApiKey: result['OPENROUTER_API_KEY'],
    anthropicApiKey: result['ANTHROPIC_API_KEY'],
    telegramBotToken: result['TELEGRAM_BOT_TOKEN'],
    raw: result,
  };
}
