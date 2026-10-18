import mongoose, { Schema, Document, Model } from 'mongoose';

export type WorkOrderStatus =
  | 'Assigned'
  | 'InProgress'
  | 'AwaitingVerification'
  | 'Verified'
  | 'Rejected';

export interface IWorkOrder extends Document {
  workOrderId: string; // Unique human-readable ID e.g. WO-2026-000123
  incidentId: mongoose.Types.ObjectId;
  assignedDepartment: string;
  assignedTeam?: string;
  assignedWorkerIds: mongoose.Types.ObjectId[];
  status: WorkOrderStatus;
  assignedAt: Date;
  scheduledAt?: Date;
  deadline: Date;
  actionTaken?: string;
  resolutionNotes?: string;
  resolutionEvidencePhotoUrls: string[];
  submittedAt?: Date;
  reviewedAt?: Date;
  reviewingOfficerId?: mongoose.Types.ObjectId;
  reviewDecision?: 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WorkOrderSchema = new Schema<IWorkOrder>(
  {
    workOrderId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    incidentId: {
      type: Schema.Types.ObjectId,
      ref: 'Incident',
      required: true,
      index: true,
    },
    assignedDepartment: {
      type: String,
      required: true,
      index: true,
    },
    assignedTeam: {
      type: String,
    },
    assignedWorkerIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true,
      },
    ],
    status: {
      type: String,
      enum: ['Assigned', 'InProgress', 'AwaitingVerification', 'Verified', 'Rejected'],
      default: 'Assigned',
      index: true,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    scheduledAt: {
      type: Date,
    },
    deadline: {
      type: Date,
      required: true,
    },
    actionTaken: {
      type: String,
    },
    resolutionNotes: {
      type: String,
    },
    resolutionEvidencePhotoUrls: {
      type: [String],
      default: [],
    },
    submittedAt: {
      type: Date,
    },
    reviewedAt: {
      type: Date,
    },
    reviewingOfficerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewDecision: {
      type: String,
      enum: ['approved', 'rejected'],
    },
    rejectionReason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

WorkOrderSchema.index({ assignedWorkerIds: 1, status: 1 });
WorkOrderSchema.index({ incidentId: 1, createdAt: -1 });

export const WorkOrder: Model<IWorkOrder> =
  mongoose.models.WorkOrder || mongoose.model<IWorkOrder>('WorkOrder', WorkOrderSchema);
