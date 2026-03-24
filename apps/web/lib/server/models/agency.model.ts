import mongoose, { Schema, Document } from 'mongoose';

export interface IAgency extends Document {
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'enterprise';
  settings: {
    defaultBranding: { logoUrl?: string; primaryColor: string; accentColor: string };
    allowedDomains: string[];
  };
  billingCustomerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const agencySchema = new Schema<IAgency>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    plan: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
    settings: {
      defaultBranding: {
        logoUrl: String,
        primaryColor: { type: String, default: '#1B2A4A' },
        accentColor: { type: String, default: '#2E75B6' },
      },
      allowedDomains: [String],
    },
    billingCustomerId: String,
  },
  { timestamps: true }
);

export default (mongoose.models.Agency as mongoose.Model<IAgency>) || mongoose.model<IAgency>('Agency', agencySchema);
