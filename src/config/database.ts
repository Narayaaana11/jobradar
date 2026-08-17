import mongoose from 'mongoose';
import { ENV } from './env';

export async function connectDB(): Promise<typeof mongoose> {
  try {
    const conn = await mongoose.connect(ENV.MONGODB_URI);
    console.log(`[MongoDB] Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('[MongoDB] Connection Error:', error);
    process.exit(1);
  }
}
