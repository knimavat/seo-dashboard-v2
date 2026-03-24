import mongoose, { Schema, Document } from 'mongoose';

export interface IReportLink extends Document {
  agencyId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  token: string;
  name: string;
  status: 'active' | 'revoked';
  passwordHash?: string;
  branding: { clientName: string; clientLogo?: string; primaryColor: string; accentColor: string };
  defaultStartDate?: Date;
  defaultEndDate?: Date;
  sectionVisibility: { analytics: boolean; keywords: boolean; tasks: boolean; audits: boolean; competitors: boolean };
  createdBy: mongoose.Types.ObjectId;
  revokedAt?: Date;
  viewCount: number;
  lastViewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const reportLinkSchema = new Schema<IReportLink>(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    token: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    status: { type: String, enum: ['active', 'revoked'], default: 'active' },
    passwordHash: String,
    branding: {
      clientName: { type: String, required: true },
      clientLogo: String,
      primaryColor: { type: String, default: '#1B2A4A' },
      accentColor: { type: String, default: '#2E75B6' },
    },
    defaultStartDate: Date,
    defaultEndDate: Date,
    sectionVisibility: {
      analytics: { type: Boolean, default: true },
      keywords: { type: Boolean, default: true },
      tasks: { type: Boolean, default: true },
      audits: { type: Boolean, default: true },
      competitors: { type: Boolean, default: true },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    revokedAt: Date,
    viewCount: { type: Number, default: 0 },
    lastViewedAt: Date,
  },
  { timestamps: true }
);

reportLinkSchema.index({ token: 1 }, { unique: true });
reportLinkSchema.index({ agencyId: 1, projectId: 1, createdAt: -1 });
reportLinkSchema.index({ status: 1, token: 1 });

export default (mongoose.models.ReportLink as mongoose.Model<IReportLink>) || mongoose.model<IReportLink>('ReportLink', reportLinkSchema);
