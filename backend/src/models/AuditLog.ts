import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAuditLog extends Document {
  entityType: 'Incident' | 'WorkOrder' | 'CitizenReport' | 'User';
  entityId: string;
  action: string; // e.g. CREATED, DUPLICATE_LINKED, STATUS_CHANGE, ASSIGNED, RESOLUTION_SUBMITTED, VERIFIED, REJECTED
  actorId?: mongoose.Types.ObjectId;
  actorRole: string; // 'citizen' | 'officer' | 'field_worker' | 'system'
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
  reason?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    entityType: {
      type: String,
      required: true,
      index: true,
    },
    entityId: {
      type: String,
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    actorRole: {
      type: String,
      required: true,
      default: 'system',
    },
    previousValues: {
      type: Schema.Types.Mixed,
    },
    newValues: {
      type: Schema.Types.Mixed,
    },
    reason: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

AuditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
