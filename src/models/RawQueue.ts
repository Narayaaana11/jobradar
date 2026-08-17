import mongoose, { Schema, Document } from 'mongoose';

export interface IRawQueue extends Document {
  platform: 'telegram' | 'whatsapp_manual' | 'career_page';
  channelName: string;
  rawMessageId: string;
  rawText: string;
  rawHtml?: string | null;
  receivedAt: Date;
  processed: boolean;
  retryCount: number;
  classifierResult?: {
    is_job_post: boolean;
    confidence: number;
    reason: string;
  } | null;
  processingError?: string | null;
  expiresAt: Date;
}

const RawQueueSchema: Schema = new Schema(
  {
    platform: { type: String, required: true, enum: ['telegram', 'whatsapp_manual', 'career_page'], default: 'telegram' },
    channelName: { type: String, required: true },
    rawMessageId: { type: String, required: true },
    rawText: { type: String, required: true },
    rawHtml: { type: String, default: null },
    receivedAt: { type: Date, default: Date.now },
    processed: { type: Boolean, default: false, index: true },
    retryCount: { type: Number, default: 0 },
    classifierResult: {
      is_job_post: { type: Boolean },
      confidence: { type: Number },
      reason: { type: String },
    },
    processingError: { type: String, default: null },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), expires: 0 },
  },
  { timestamps: true }
);

RawQueueSchema.index({ platform: 1, channelName: 1, rawMessageId: 1 }, { unique: true });

export const RawQueue = mongoose.models.RawQueue || mongoose.model<IRawQueue>('RawQueue', RawQueueSchema);
