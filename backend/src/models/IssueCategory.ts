import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IIssueCategory extends Document {
  code: string;
  name: string;
  description?: string;
  defaultDepartmentCode: string;
  defaultUrgency: 'Critical' | 'High' | 'Medium' | 'Low';
  slaHours: number;
  iconName?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const IssueCategorySchema = new Schema<IIssueCategory>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
    },
    defaultDepartmentCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    defaultUrgency: {
      type: String,
      enum: ['Critical', 'High', 'Medium', 'Low'],
      default: 'Medium',
    },
    slaHours: {
      type: Number,
      default: 48, // 48 hours standard default
    },
    iconName: {
      type: String,
      default: 'AlertCircle',
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

export const IssueCategory: Model<IIssueCategory> =
  mongoose.models.IssueCategory ||
  mongoose.model<IIssueCategory>('IssueCategory', IssueCategorySchema);
