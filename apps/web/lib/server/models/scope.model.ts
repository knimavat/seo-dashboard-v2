import mongoose, { Schema, Document } from 'mongoose';

export interface IScopeItem {
  activity: string;
  label: string;
  quantity: number;
  unit: string;
  notes?: string;
}

export interface IHoursItem {
  task: string;
  label: string;
  team: 'seo' | 'content';
  hours: number;
  notes?: string;
}

export interface IMonthSummary {
  seoTeamHours: number;
  contentTeamHours: number;
  extraTime: number;
  totalHours: number;
}

export interface IScopeMonth {
  month: string;
  scopeItems: IScopeItem[];
  hoursAllocation: IHoursItem[];
  summary: IMonthSummary;
}

export interface IScope extends Document {
  agencyId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  months: IScopeMonth[];
  notes?: string;
  deletedAt?: Date;
}

const scopeItemSchema = new Schema<IScopeItem>(
  {
    activity: { type: String, required: true },
    label: { type: String, required: true },
    quantity: { type: Number, default: 0 },
    unit: { type: String, default: '' },
    notes: String,
  },
  { _id: false }
);

const hoursItemSchema = new Schema<IHoursItem>(
  {
    task: { type: String, required: true },
    label: { type: String, required: true },
    team: { type: String, enum: ['seo', 'content'], required: true },
    hours: { type: Number, default: 0 },
    notes: String,
  },
  { _id: false }
);

const monthSummarySchema = new Schema<IMonthSummary>(
  {
    seoTeamHours: { type: Number, default: 0 },
    contentTeamHours: { type: Number, default: 0 },
    extraTime: { type: Number, default: 0 },
    totalHours: { type: Number, default: 0 },
  },
  { _id: false }
);

const scopeMonthSchema = new Schema<IScopeMonth>(
  {
    month: { type: String, required: true },
    scopeItems: [scopeItemSchema],
    hoursAllocation: [hoursItemSchema],
    summary: { type: monthSummarySchema, default: () => ({}) },
  },
  { _id: false }
);

const scopeSchema = new Schema<IScope>(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    months: [scopeMonthSchema],
    notes: String,
    deletedAt: Date,
  },
  { timestamps: true }
);

scopeSchema.index({ agencyId: 1, projectId: 1 }, { unique: true });

export default (mongoose.models.Scope as mongoose.Model<IScope>) || mongoose.model<IScope>('Scope', scopeSchema);
