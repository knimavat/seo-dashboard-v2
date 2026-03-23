import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  agencyId: mongoose.Types.ObjectId;
  email: string;
  name: string;
  avatarUrl?: string;
  role: 'admin' | 'specialist';
  assignedProjects: mongoose.Types.ObjectId[];
  status: 'active' | 'deactivated';
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    agencyId: { type: Schema.Types.ObjectId, ref: 'Agency', required: true, index: true },
    email: { type: String, required: true, lowercase: true },
    name: { type: String, required: true },
    avatarUrl: String,
    role: { type: String, enum: ['admin', 'specialist'], default: 'specialist' },
    assignedProjects: [{ type: Schema.Types.ObjectId, ref: 'Project' }],
    status: { type: String, enum: ['active', 'deactivated'], default: 'active' },
    lastLoginAt: Date,
  },
  { timestamps: true }
);

userSchema.index({ agencyId: 1, email: 1 }, { unique: true });
userSchema.index({ agencyId: 1, status: 1 });

export default mongoose.model<IUser>('User', userSchema);
