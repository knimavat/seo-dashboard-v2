import mongoose, { Schema, Document } from 'mongoose';

export interface ITask extends Document {
  agencyId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  category: string;
  assignedTo: mongoose.Types.ObjectId;
  status: string;
  priority: string;
  dueDate: Date;
  completedAt?: Date;
  estimatedHours?: number;
  actualHours?: number;
  targetUrl?: string;
  targetKeywords?: mongoose.Types.ObjectId[];
  attachments?: Array<{ filename: string; url: string; uploadedBy: mongoose.Types.ObjectId; uploadedAt: Date }>;
  internalNotes?: string;
  clientVisibleSummary?: string;
  statusHistory: Array<{ from: string; to: string; changedBy: mongoose.Types.ObjectId; changedAt: Date; reason?: string }>;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    title: { type: String, required: true, maxlength: 200 },
    description: String,
    category: { type: String, enum: ['on_page', 'off_page', 'technical', 'content', 'local_seo', 'strategy', 'reporting'], required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['not_started', 'in_progress', 'in_review', 'approved', 'published', 'blocked', 'cancelled'], default: 'not_started' },
    priority: { type: String, enum: ['critical', 'high', 'medium', 'low'], default: 'medium' },
    dueDate: { type: Date, required: true },
    completedAt: Date,
    estimatedHours: Number,
    actualHours: Number,
    targetUrl: String,
    targetKeywords: [{ type: Schema.Types.ObjectId, ref: 'Keyword' }],
    attachments: [{ filename: String, url: String, uploadedBy: Schema.Types.ObjectId, uploadedAt: Date }],
    internalNotes: String,
    clientVisibleSummary: String,
    statusHistory: [{ from: String, to: String, changedBy: Schema.Types.ObjectId, changedAt: { type: Date, default: Date.now }, reason: String }],
    deletedAt: Date,
  },
  { timestamps: true }
);

taskSchema.index({ agencyId: 1, projectId: 1, status: 1 });
taskSchema.index({ agencyId: 1, projectId: 1, assignedTo: 1 });
taskSchema.index({ agencyId: 1, projectId: 1, dueDate: 1 });
taskSchema.index({ agencyId: 1, projectId: 1, category: 1 });

export default (mongoose.models.Task as mongoose.Model<ITask>) || mongoose.model<ITask>('Task', taskSchema);
