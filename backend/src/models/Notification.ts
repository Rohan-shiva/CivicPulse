import mongoose, { Schema, Document, Model } from 'mongoose';

export type NotificationType =
  | 'STATUS_CHANGE'
  | 'WORK_ASSIGNED'
  | 'VERIFICATION_REQUIRED'
  | 'RESOLVED'
  | 'SYSTEM';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  complaintId?: string;
  incidentId?: string;
  type: NotificationType;
  title: string;
  message: string;
  readAt?: Date;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    complaintId: {
      type: String,
    },
    incidentId: {
      type: String,
    },
    type: {
      type: String,
      enum: ['STATUS_CHANGE', 'WORK_ASSIGNED', 'VERIFICATION_REQUIRED', 'RESOLVED', 'SYSTEM'],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

NotificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });

export const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>('Notification', NotificationSchema);
