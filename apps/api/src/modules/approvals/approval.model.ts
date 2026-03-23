import mongoose, { Schema, Document } from 'mongoose';

export interface IApproval extends Document {
  agencyId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  taskId: mongoose.Types.ObjectId;
  type: string;
  submittedBy: mongoose.Types.ObjectId;
  submittedAt: Date;
  assignedApprovers: mongoose.Types.ObjectId[];
  status: string;
  decisions: Array<{ approverId: mongoose.Types.ObjectId; decision: string; comments?: string; decidedAt: Date }>;
  revisionCount: number;
  finalApprovedVersion?: string;
}

const approvalSchema = new Schema<IApproval>(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
    type: { type: String, enum: ['content', 'strategy', 'technical_recommendation', 'client_signoff'], required: true },
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    submittedAt: { type: Date, default: Date.now },
    assignedApprovers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'revision_requested'], default: 'pending' },
    decisions: [{
      approverId: { type: Schema.Types.ObjectId, ref: 'User' },
      decision: { type: String, enum: ['approved', 'rejected', 'revision_requested'] },
      comments: String,
      decidedAt: { type: Date, default: Date.now },
    }],
    revisionCount: { type: Number, default: 0 },
    finalApprovedVersion: String,
  },
  { timestamps: true }
);

approvalSchema.index({ agencyId: 1, projectId: 1, status: 1 });
approvalSchema.index({ agencyId: 1, assignedApprovers: 1, status: 1 });

export default mongoose.model<IApproval>('Approval', approvalSchema);
