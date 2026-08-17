import mongoose, { Schema, Document } from 'mongoose';

export interface IProcessingError extends Document {
  rawQueueId: mongoose.Types.ObjectId;
  stage: 'classifier' | 'extractor' | 'dedup' | 'scorer' | 'referral' | 'resume_tailor';
  error: string;
  retryCount: number;
  permanentFailure: boolean;
  createdAt: Date;
}

const ProcessingErrorSchema: Schema = new Schema(
  {
    rawQueueId: { type: Schema.Types.ObjectId, ref: 'RawQueue', required: true },
    stage: {
      type: String,
      enum: ['classifier', 'extractor', 'dedup', 'scorer', 'referral', 'resume_tailor'],
      required: true,
    },
    error: { type: String, required: true },
    retryCount: { type: Number, required: true },
    permanentFailure: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const ProcessingError =
  mongoose.models.ProcessingError || mongoose.model<IProcessingError>('ProcessingError', ProcessingErrorSchema);
