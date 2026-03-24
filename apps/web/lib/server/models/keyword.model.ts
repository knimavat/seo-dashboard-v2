import mongoose, { Schema, Document } from 'mongoose';

const snapshotSchema = new Schema({
  rank: { type: Number, required: true },
  searchVolume: { type: Number, default: 0 },
  difficulty: { type: Number, default: 0 },
  cpc: { type: Number, default: 0 },
  serpFeatures: [String],
  ownsSerpFeature: { type: Boolean, default: false },
  trafficEstimate: { type: Number, default: 0 },
  recordedAt: { type: Date, required: true, default: Date.now },
}, { _id: false });

export interface IKeyword extends Document {
  agencyId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  keyword: string;
  searchIntent: string;
  targetUrl: string;
  group: string;
  priorityTier: string;
  current: any;
  previous?: { rank: number; recordedAt: Date };
  bestRank: number;
  snapshots: any[];
  notes?: string;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const keywordSchema = new Schema<IKeyword>(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    keyword: { type: String, required: true },
    searchIntent: { type: String, enum: ['informational', 'navigational', 'commercial', 'transactional'], required: true },
    targetUrl: { type: String, required: true },
    group: { type: String, required: true },
    priorityTier: { type: String, enum: ['tier1', 'tier2', 'tier3'], default: 'tier2' },
    current: snapshotSchema,
    previous: { rank: Number, recordedAt: Date },
    bestRank: { type: Number, default: 0 },
    snapshots: [snapshotSchema],
    notes: String,
    deletedAt: Date,
  },
  { timestamps: true }
);

keywordSchema.index({ agencyId: 1, projectId: 1, keyword: 1 }, { unique: true });
keywordSchema.index({ agencyId: 1, projectId: 1, group: 1 });
keywordSchema.index({ agencyId: 1, projectId: 1, 'current.rank': 1 });
keywordSchema.index({ agencyId: 1, projectId: 1, priorityTier: 1 });

export default (mongoose.models.Keyword as mongoose.Model<IKeyword>) || mongoose.model<IKeyword>('Keyword', keywordSchema);
