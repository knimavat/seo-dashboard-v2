import mongoose, { Schema, Document } from 'mongoose';

export interface IReview extends Document {
  agencyId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  taskId: mongoose.Types.ObjectId;
  type: string;
  reviewerId: mongoose.Types.ObjectId;
  reviewedAt: Date;
  rating: string;
  feedback: string;
  checklistScores: Map<string, number>;
  resolutionStatus: string;
}

const reviewSchema = new Schema<IReview>(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
    type: { type: String, enum: ['peer', 'technical', 'strategic'], required: true },
    reviewerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reviewedAt: { type: Date, default: Date.now },
    rating: { type: String, enum: ['pass', 'pass_with_notes', 'needs_revision', 'fail'], required: true },
    feedback: { type: String, required: true },
    checklistScores: { type: Map, of: Number, default: {} },
    resolutionStatus: { type: String, enum: ['open', 'addressed', 'dismissed'], default: 'open' },
  },
  { timestamps: true }
);

reviewSchema.index({ agencyId: 1, projectId: 1, taskId: 1 });
reviewSchema.index({ agencyId: 1, reviewerId: 1 });

export default mongoose.model<IReview>('Review', reviewSchema);
