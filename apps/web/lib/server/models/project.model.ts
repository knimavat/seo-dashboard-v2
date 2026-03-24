import mongoose, { Schema, Document } from 'mongoose';

export interface IProject extends Document {
  agencyId: mongoose.Types.ObjectId;
  clientName: string;
  clientEmail?: string;
  clientLogo?: string;
  projectName: string;
  domain: string;
  industry?: string;
  startDate: Date;
  status: string;
  healthStatus: string;
  healthNote?: string;
  branding?: { primaryColor?: string; accentColor?: string; logoUrl?: string };
  settings?: { defaultReportSections?: string[]; keywordGroups?: string[]; taskCategories?: string[] };
  metadata: { totalKeywords: number; totalTasks: number; openAuditIssues: number; lastReportDate?: Date };
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true, index: true },
    clientName: { type: String, required: true },
    clientEmail: String,
    clientLogo: String,
    projectName: { type: String, required: true },
    domain: { type: String, required: true },
    industry: String,
    startDate: { type: Date, required: true },
    status: { type: String, enum: ['active', 'paused', 'completed', 'archived'], default: 'active' },
    healthStatus: { type: String, enum: ['green', 'yellow', 'red'], default: 'green' },
    healthNote: String,
    branding: { primaryColor: String, accentColor: String, logoUrl: String },
    settings: { defaultReportSections: [String], keywordGroups: [String], taskCategories: [String] },
    metadata: {
      totalKeywords: { type: Number, default: 0 },
      totalTasks: { type: Number, default: 0 },
      openAuditIssues: { type: Number, default: 0 },
      lastReportDate: Date,
    },
    deletedAt: Date,
  },
  { timestamps: true }
);

projectSchema.index({ agencyId: 1, status: 1 });
projectSchema.index({ agencyId: 1, clientName: 1 });

export default (mongoose.models.Project as mongoose.Model<IProject>) || mongoose.model<IProject>('Project', projectSchema);
