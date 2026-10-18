import mongoose, { Schema, Document, Model } from 'mongoose';

export type UserRole = 'citizen' | 'officer' | 'field_worker' | 'admin';

export interface IUser extends Document {
  name: string;
  phone: string;
  phoneVerifiedAt?: Date;
  email?: string;
  role: UserRole;
  preferredLanguage: string;
  departmentId?: mongoose.Types.ObjectId;
  departmentName?: string;
  ward?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    phoneVerifiedAt: {
      type: Date,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
    },
    role: {
      type: String,
      enum: ['citizen', 'officer', 'field_worker', 'admin'],
      default: 'citizen',
      required: true,
      index: true,
    },
    preferredLanguage: {
      type: String,
      default: 'en',
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
    },
    departmentName: {
      type: String,
    },
    ward: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Helpful index
UserSchema.index({ phone: 1, role: 1 });

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
