import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const ENV = {
  PORT: process.env.PORT || '5000',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/jobradar',
  
  // MSSQL Configuration
  MSSQL_HOST: process.env.MSSQL_HOST || 'localhost',
  MSSQL_USER: process.env.MSSQL_USER || 'sa',
  MSSQL_PASSWORD: process.env.MSSQL_PASSWORD || '',
  MSSQL_DATABASE: process.env.MSSQL_DATABASE || 'jobradar',
  MSSQL_PORT: parseInt(process.env.MSSQL_PORT || '1433', 10),

  // AWS S3 Configuration
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || '',
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || '',
  AWS_S3_BUCKET: process.env.AWS_S3_BUCKET || 'jobsprep',

  // LLM & Telegram
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  TELEGRAM_CHANNEL_IDS: (process.env.TELEGRAM_CHANNEL_IDS || '').split(',').map((id) => id.trim()).filter(Boolean),
};
