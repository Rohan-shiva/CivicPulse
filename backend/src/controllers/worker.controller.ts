import { Request, Response, NextFunction } from 'express';
import { workOrderService } from '../services/workorder.service';
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
}

export const workerController = new WorkerController();
