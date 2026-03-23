import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditIssue extends Document {
  agencyId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  title: string;
  category: string;
  severity: string;
  affectedUrls: string[];
  affectedUrlCount: number;
  identifiedBy: mongoose.Types.ObjectId;
  identifiedAt: Date;
  status: string;
  resolvedAt?: Date;
  resolutionNotes?: string;
  impactEstimate?: string;
  auditSource: string;
  evidence?: Array<{ filename: string; url: string; uploadedAt: Date }>;
  statusHistory: Array<{ from: string; to: string; changedBy: mongoose.Types.ObjectId; changedAt: Date }>;
  deletedAt?: Date;
}

const auditIssueSchema = new Schema<IAuditIssue>(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    title: { type: String, required: true },
    category: { type: String, enum: ['crawlability', 'indexation', 'page_speed', 'mobile', 'structured_data', 'security', 'url_structure', 'redirects', 'duplicate_content', 'cwv', 'internal_linking', 'other'], required: true },
    severity: { type: String, enum: ['critical', 'high', 'medium', 'low', 'informational'], required: true },
    affectedUrls: [String],
    affectedUrlCount: { type: Number, default: 0 },
    identifiedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    identifiedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['open', 'in_progress', 'fixed', 'verified', 'wont_fix', 'deferred'], default: 'open' },
    resolvedAt: Date,
    resolutionNotes: String,
    impactEstimate: String,
    auditSource: { type: String, enum: ['manual', 'screaming_frog', 'lighthouse', 'gsc', 'pagespeed', 'other'], default: 'manual' },
    evidence: [{ filename: String, url: String, uploadedAt: Date }],
    statusHistory: [{ from: String, to: String, changedBy: Schema.Types.ObjectId, changedAt: { type: Date, default: Date.now } }],
    deletedAt: Date,
  },
  { timestamps: true }
);

auditIssueSchema.index({ agencyId: 1, projectId: 1, severity: 1, status: 1 });
auditIssueSchema.index({ agencyId: 1, projectId: 1, category: 1 });

export default mongoose.model<IAuditIssue>('AuditIssue', auditIssueSchema);
