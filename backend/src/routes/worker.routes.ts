import { Router } from 'express';
import { workerController } from '../controllers/worker.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

// Field workers, officers, and admins can access worker routes
router.use(requireAuth, requireRole(['field_worker', 'officer', 'admin']));

// List my assigned work orders
router.get('/work-orders', (req, res, next) =>
  workerController.getMyWorkOrders(req, res, next)
);

// Work order details
router.get('/work-orders/:workOrderId', (req, res, next) =>
  workerController.getWorkOrderDetails(req, res, next)
);

// Start work order (Assigned -> InProgress)
router.patch('/work-orders/:workOrderId/start', (req, res, next) =>
  workerController.startWork(req, res, next)
);

// Submit resolution evidence photos & notes (InProgress -> AwaitingVerification)
router.post(
  '/work-orders/:workOrderId/submit-resolution',
  upload.array('photos', 3),
  (req, res, next) => workerController.submitResolution(req, res, next)
);

export default router;
