import { Request, Response, NextFunction } from 'express';
import { Notification } from '../models/Notification';
import { UnauthorizedError, NotFoundError } from '../utils/errors';
import mongoose from 'mongoose';

export class NotificationController {
  /**
   * GET /api/notifications
   * Retrieves notifications for current user with unread count
   */
  async getMyNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');

      const userOid = new mongoose.Types.ObjectId(req.user.userId);

      const [notifications, unreadCount] = await Promise.all([
        Notification.find({ userId: userOid })
          .sort({ createdAt: -1 })
          .limit(30)
          .lean(),
        Notification.countDocuments({ userId: userOid, readAt: { $exists: false } }),
      ]);

      res.status(200).json({
        success: true,
        count: notifications.length,
        unreadCount,
        notifications,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/notifications/:id/read
   * Marks a single notification as read
   */
  async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');

      const { id } = req.params;
      const userOid = new mongoose.Types.ObjectId(req.user.userId);

      const notif = await Notification.findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(id), userId: userOid },
        { readAt: new Date() },
        { new: true }
      );

      if (!notif) {
        throw new NotFoundError('Notification not found');
      }

      res.status(200).json({
        success: true,
        notification: notif,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/notifications/read-all
   * Marks all notifications for current user as read
   */
  async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');

      const userOid = new mongoose.Types.ObjectId(req.user.userId);

      await Notification.updateMany(
        { userId: userOid, readAt: { $exists: false } },
        { readAt: new Date() }
      );

      res.status(200).json({
        success: true,
        message: 'All notifications marked as read',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const notificationController = new NotificationController();
