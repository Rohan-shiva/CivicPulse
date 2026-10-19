import { Request, Response, NextFunction } from 'express';
import { workOrderService } from '../services/workorder.service';
import { cloudinaryService } from '../services/cloudinary.service';
import { BadRequestError, UnauthorizedError } from '../utils/errors';

export class WorkerController {
  /**
   * GET /api/worker/work-orders
   * Lists all work orders assigned to the logged-in field worker
   */
  async getMyWorkOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');

      const status = req.query.status as string | undefined;
      const workOrders = await workOrderService.getWorkerWorkOrders(req.user.userId, status);

      res.status(200).json({
        success: true,
        count: workOrders.length,
        workOrders,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/worker/work-orders/:workOrderId
   * Retrieves single work order with linked incident and citizen reports
   */
  async getWorkOrderDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');

      const { workOrderId } = req.params;
      if (!workOrderId) throw new BadRequestError('Work order ID is required');

      const result = await workOrderService.getWorkerWorkOrderById(
        workOrderId,
        req.user.userId
      );

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/worker/work-orders/:workOrderId/start
   * Transitions work order status from Assigned to InProgress
   */
  async startWork(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');

      const { workOrderId } = req.params;
      if (!workOrderId) throw new BadRequestError('Work order ID is required');

      const workOrder = await workOrderService.startWorkOrder(
        workOrderId,
        req.user.userId
      );

      res.status(200).json({
        success: true,
        message: 'Work order started. Status updated to InProgress.',
        workOrder,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/worker/work-orders/:workOrderId/submit-resolution
   * Uploads resolution evidence photos and marks work order as AwaitingVerification
   */
  async submitResolution(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');

      const { workOrderId } = req.params;
      if (!workOrderId) throw new BadRequestError('Work order ID is required');

      const notes = (req.body.notes || req.body.resolutionNotes || '').trim();
      if (!notes) {
        throw new BadRequestError('Resolution notes describing the completed work are required');
      }

      // Collect uploaded photos
      const files = req.files as Express.Multer.File[] | undefined;
      const singleFile = req.file;
      const allFiles: Express.Multer.File[] = [];

      if (Array.isArray(files) && files.length > 0) {
        allFiles.push(...files);
      } else if (singleFile) {
        allFiles.push(singleFile);
      }

      const photoUrls: string[] = [];

      for (const file of allFiles) {
        if (cloudinaryService.isConfigured()) {
          const uploadRes = await cloudinaryService.uploadImage(file.buffer, {
            folder: 'civicpulse/resolutions',
            tags: ['resolution', 'field_worker', workOrderId],
          });
          photoUrls.push(uploadRes.secureUrl);
        } else {
          console.warn('⚠️ Cloudinary unconfigured: resolution photo stored with placeholder URL.');
          photoUrls.push(
            'https://images.unsplash.com/photo-1541888946425-d0fbb186156f?w=800&auto=format&fit=crop&q=60'
          );
        }
      }

      const workOrder = await workOrderService.submitResolution(
        workOrderId,
        req.user.userId,
        notes,
        photoUrls
      );

      res.status(200).json({
        success: true,
        message: 'Resolution evidence submitted successfully. Work order is now Awaiting Verification.',
        workOrder,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const workerController = new WorkerController();
