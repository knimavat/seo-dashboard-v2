import mongoose, { Schema, Document } from 'mongoose';

export interface IAnalytics extends Document {
  agencyId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  month: string; // Format: "2026-03" (YYYY-MM)
  clicks: number;
  impressions: number;
  organicTraffic: number;
  engagementRate: number; // Stored as decimal, e.g., 0.6532 = 65.32%
  pageViews: number;
  averagePosition: number;
  totalUsers: number;
  newUsers: number;
  returningUsers: number;
  activeUsers: number;
  engagementTime: number; // Stored in seconds
  notes?: string;
  enteredBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const analyticsSchema = new Schema<IAnalytics>(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    month: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
    clicks: { type: Number, required: true, default: 0 },
    impressions: { type: Number, required: true, default: 0 },
    organicTraffic: { type: Number, required: true, default: 0 },
    engagementRate: { type: Number, required: true, default: 0 }, // 0.0 to 1.0
    pageViews: { type: Number, required: true, default: 0 },
    averagePosition: { type: Number, required: true, default: 0 },
    totalUsers: { type: Number, required: true, default: 0 },
    newUsers: { type: Number, required: true, default: 0 },
    returningUsers: { type: Number, required: true, default: 0 },
    activeUsers: { type: Number, required: true, default: 0 },
    engagementTime: { type: Number, required: true, default: 0 }, // seconds
    notes: String,
    enteredBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// One record per project per month
analyticsSchema.index({ agencyId: 1, projectId: 1, month: 1 }, { unique: true });
analyticsSchema.index({ agencyId: 1, projectId: 1, createdAt: -1 });

export default mongoose.model<IAnalytics>('Analytics', analyticsSchema);
