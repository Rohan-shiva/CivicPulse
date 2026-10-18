import mongoose, { Schema, Document, Model } from 'mongoose';

export type InputType = 'text' | 'voice' | 'both';
export type LocationSource = 'device' | 'exif' | 'manual';
export type DuplicateOutcome = 'new_incident' | 'linked_auto' | 'linked_manual' | 'under_review';
export type ProcessingStatus = 'pending' | 'analyzed' | 'completed' | 'failed';

export interface ICitizenReport extends Document {
  complaintId: string; // Unique human-readable ID e.g. CP-2026-000123
  reporterId: mongoose.Types.ObjectId;
  incidentId?: mongoose.Types.ObjectId;
  inputType: InputType;
  nativeTranscript?: string;
  originalLanguageCode?: string;
  standardizedEnglishDescription: string;
  photoUrls: string[];
  confirmedLocation: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  addressText?: string;
  rawExifLocation?: {
    latitude: number;
    longitude: number;
    altitude?: number;
  };
  rawDeviceLocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  locationSource: LocationSource;
  aiAssessment?: {
    complaintType: string;
    department: string;
    suggestedUrgency: 'Critical' | 'High' | 'Medium' | 'Low';
    safetyRisk: string;
    explanation: string;
    confidence?: number;
    modelIdentifier: string;
  };
  duplicateMatching?: {
    outcome: DuplicateOutcome;
    similarityScore?: number;
    matchedIncidentId?: mongoose.Types.ObjectId;
    distanceMeters?: number;
  };
  processingStatus: ProcessingStatus;
  createdAt: Date;
  updatedAt: Date;
}

const CitizenReportSchema = new Schema<ICitizenReport>(
  {
    complaintId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    reporterId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    incidentId: {
      type: Schema.Types.ObjectId,
      ref: 'Incident',
      index: true,
    },
    inputType: {
      type: String,
      enum: ['text', 'voice', 'both'],
      default: 'text',
    },
    nativeTranscript: {
      type: String,
    },
    originalLanguageCode: {
      type: String,
      default: 'en',
    },
    standardizedEnglishDescription: {
      type: String,
      required: true,
      trim: true,
    },
    photoUrls: {
      type: [String],
      default: [],
    },
    confirmedLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    addressText: {
      type: String,
    },
    rawExifLocation: {
      latitude: Number,
      longitude: Number,
      altitude: Number,
    },
    rawDeviceLocation: {
      latitude: Number,
      longitude: Number,
      accuracy: Number,
    },
    locationSource: {
      type: String,
      enum: ['device', 'exif', 'manual'],
      default: 'manual',
    },
    aiAssessment: {
      complaintType: String,
      department: String,
      suggestedUrgency: {
        type: String,
        enum: ['Critical', 'High', 'Medium', 'Low'],
      },
      safetyRisk: String,
      explanation: String,
      confidence: Number,
      modelIdentifier: String,
    },
    duplicateMatching: {
      outcome: {
        type: String,
        enum: ['new_incident', 'linked_auto', 'linked_manual', 'under_review'],
      },
      similarityScore: Number,
      matchedIncidentId: {
        type: Schema.Types.ObjectId,
        ref: 'Incident',
      },
      distanceMeters: Number,
    },
    processingStatus: {
      type: String,
      enum: ['pending', 'analyzed', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

CitizenReportSchema.index({ confirmedLocation: '2dsphere' });
CitizenReportSchema.index({ reporterId: 1, createdAt: -1 });

export const CitizenReport: Model<ICitizenReport> =
  mongoose.models.CitizenReport ||
  mongoose.model<ICitizenReport>('CitizenReport', CitizenReportSchema);
