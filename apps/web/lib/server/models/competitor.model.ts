import mongoose, { Schema, Document } from 'mongoose';

export interface ICompetitor extends Document {
  agencyId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  name: string;
  domain: string;
  snapshots: Array<{ month: string; backlinks: number; organicTraffic: number; totalKeywords: number; domainRating: number; recordedAt: Date }>;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const competitorSchema = new Schema<ICompetitor>(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    name: { type: String, required: true },
    domain: { type: String, required: true },
    snapshots: [{
      month: { type: String, required: true },
      backlinks: { type: Number, default: 0 },
      organicTraffic: { type: Number, default: 0 },
      totalKeywords: { type: Number, default: 0 },
      domainRating: { type: Number, default: 0 },
      recordedAt: { type: Date, default: Date.now },
    }],
    notes: String,
    deletedAt: Date,
  },
  { timestamps: true }
);

competitorSchema.index({ agencyId: 1, projectId: 1 });
competitorSchema.index({ agencyId: 1, projectId: 1, domain: 1 }, { unique: true });

export default (mongoose.models.Competitor as mongoose.Model<ICompetitor>) || mongoose.model<ICompetitor>('Competitor', competitorSchema);
