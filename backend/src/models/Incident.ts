import mongoose, { Schema, Document, Model } from 'mongoose';

export type UrgencyLevel = 'Critical' | 'High' | 'Medium' | 'Low';
export type IncidentStatus =
  | 'Open'
  | 'Assigned'
  | 'InProgress'
  | 'AwaitingVerification'
  | 'Resolved'
  | 'Closed'
  | 'Reopened';

export interface IIncident extends Document {
  incidentId: string; // Unique human-readable ID e.g. INC-2026-000123
  title: string;
  standardizedDescription: string;
  complaintType: string;
  department: string;
  canonicalLocation: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  addressText?: string;
  descriptionEmbedding?: number[];
  embeddingModel?: string;
  effectivePriority: UrgencyLevel;
  priorityRank: number; // Critical=4, High=3, Medium=2, Low=1
  aiSuggestedUrgency: UrgencyLevel;
  priorityExplanation: string;
  status: IncidentStatus;
  reportCount: number;
  distinctReporterCount: number;
  assignedDepartment: string;
  currentWorkOrderId?: mongoose.Types.ObjectId;
  firstReportedAt: Date;
  lastReportedAt: Date;
  slaDeadline: Date;
  duplicateReviewState: 'none' | 'pending_review' | 'confirmed_duplicate' | 'dismissed';
  isProvisional: boolean;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const IncidentSchema = new Schema<IIncident>(
  {
    incidentId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    standardizedDescription: {
      type: String,
      required: true,
      trim: true,
    },
    complaintType: {
      type: String,
      required: true,
      index: true,
    },
    department: {
      type: String,
      required: true,
      index: true,
    },
    canonicalLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        validate: {
          validator: (coords: number[]) =>
            Array.isArray(coords) &&
            coords.length === 2 &&
            coords[0] >= -180 &&
            coords[0] <= 180 && // longitude
            coords[1] >= -90 &&
            coords[1] <= 90, // latitude
          message: 'Invalid GeoJSON coordinates [longitude, latitude]',
        },
      },
    },
    addressText: {
      type: String,
    },
    descriptionEmbedding: {
      type: [Number],
      select: false, // Omit vector from normal queries for performance
    },
    embeddingModel: {
      type: String,
      default: 'Xenova/all-MiniLM-L6-v2',
    },
    effectivePriority: {
      type: String,
      enum: ['Critical', 'High', 'Medium', 'Low'],
      default: 'Medium',
      index: true,
    },
    priorityRank: {
      type: Number,
      default: 2, // 1 to 4
      index: true,
    },
    aiSuggestedUrgency: {
      type: String,
      enum: ['Critical', 'High', 'Medium', 'Low'],
      default: 'Medium',
    },
    priorityExplanation: {
      type: String,
      default: 'Initial assessment',
    },
    status: {
      type: String,
      enum: [
        'Open',
        'Assigned',
        'InProgress',
        'AwaitingVerification',
        'Resolved',
        'Closed',
        'Reopened',
      ],
      default: 'Open',
      index: true,
    },
    reportCount: {
      type: Number,
      default: 1,
    },
    distinctReporterCount: {
      type: Number,
      default: 1,
    },
    assignedDepartment: {
      type: String,
      required: true,
      index: true,
    },
    currentWorkOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'WorkOrder',
    },
    firstReportedAt: {
      type: Date,
      default: Date.now,
    },
    lastReportedAt: {
      type: Date,
      default: Date.now,
    },
    slaDeadline: {
      type: Date,
      required: true,
      index: true,
    },
    duplicateReviewState: {
      type: String,
      enum: ['none', 'pending_review', 'confirmed_duplicate', 'dismissed'],
      default: 'none',
      index: true,
    },
    isProvisional: {
      type: Boolean,
      default: false,
    },
    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// MongoDB 2dsphere index for geospatial proximity search
IncidentSchema.index({ canonicalLocation: '2dsphere' });

// Compound indexes for municipal officer priority queue
IncidentSchema.index({ status: 1, priorityRank: -1, slaDeadline: 1, createdAt: 1 });
IncidentSchema.index({ department: 1, status: 1 });

export const Incident: Model<IIncident> =
  mongoose.models.Incident || mongoose.model<IIncident>('Incident', IncidentSchema);
