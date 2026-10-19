import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

// All notification endpoints require authenticated user
router.use(requireAuth);

router.get('/', (req, res, next) => notificationController.getMyNotifications(req, res, next));
router.patch('/read-all', (req, res, next) =>
  notificationController.markAllAsRead(req, res, next)
);
router.patch('/:id/read', (req, res, next) =>
  notificationController.markAsRead(req, res, next)
);

export default router;
