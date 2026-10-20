import { Request, Response, NextFunction } from 'express';
import { municipalService } from '../services/municipal.service';
import { workOrderService } from '../services/workorder.service';
import { BadRequestError, UnauthorizedError } from '../utils/errors';
import { UrgencyLevel, IncidentStatus } from '../models/Incident';

export class MunicipalController {
  /**
   * GET /api/municipal/incidents
   * Retrieves paginated priority incident queue with deterministic sorting
   */
  async getIncidents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 15;
      const status = req.query.status as string | undefined;
      const priority = req.query.priority as UrgencyLevel | undefined;
      const department = req.query.department as string | undefined;
      const isOverdue = req.query.isOverdue === 'true';
      const search = req.query.search as string | undefined;

      const result = await municipalService.getIncidentQueue(
        { status, priority, department, isOverdue, search },
        { page, limit }
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
   * GET /api/municipal/incidents/:incidentId
   * Retrieves single incident with full details, linked reports, work orders and audit trail
   */
  async getIncidentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { incidentId } = req.params;
      if (!incidentId) {
        throw new BadRequestError('Incident ID is required');
      }

      const details = await municipalService.getIncidentDetails(incidentId);

      res.status(200).json({
        success: true,
        ...details,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/municipal/incidents/:incidentId/status
   * Updates incident operational status and records audit log
   */
  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const { incidentId } = req.params;
      const { status, reason } = req.body;

      if (!status) {
        throw new BadRequestError('New status is required');
      }

      const updatedIncident = await municipalService.updateIncidentStatus(
        incidentId,
        status as IncidentStatus,
        req.user.userId,
        reason
      );

      res.status(200).json({
        success: true,
        message: `Incident status updated to '${status}'`,
        incident: updatedIncident,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/municipal/dashboard
   * Aggregated stats for officer dashboard: counts, priority breakdown, recent activity
   */
  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await municipalService.getDashboardStats();
      res.status(200).json({ success: true, ...stats });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/municipal/incidents/map
   * Returns GeoJSON FeatureCollection of all active incidents for Leaflet map
   */
  async getIncidentMap(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const geojson = await municipalService.getIncidentMap();
      res.status(200).json({ success: true, geojson });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/municipal/incidents/:incidentId/assign
   * Assigns field workers to an incident and creates a WorkOrder
   */
  async assignWorkers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');

      const { incidentId } = req.params;
      const { workerIds, scheduledAt } = req.body;

      if (!Array.isArray(workerIds) || workerIds.length === 0) {
        throw new BadRequestError('workerIds array is required and must not be empty');
      }

      const workOrder = await workOrderService.assignWorkers(
        incidentId,
        workerIds,
        req.user.userId,
        scheduledAt ? new Date(scheduledAt) : undefined
      );

      res.status(201).json({
        success: true,
        message: 'Workers assigned successfully. Work order created.',
        workOrder,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/municipal/field-workers
   * Lists available field workers, optionally filtered by department
   */
  async getFieldWorkers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const department = req.query.department as string | undefined;
      const workers = await municipalService.getFieldWorkers(department);
      res.status(200).json({ success: true, count: workers.length, workers });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/municipal/verifications
   * Returns incidents awaiting verification
   */
  async getVerificationQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const queue = await municipalService.getVerificationQueue();
      res.status(200).json({ success: true, count: queue.length, queue });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/municipal/work-orders/:workOrderId/verify
   * Officer approves a resolution — marks incident Resolved and notifies reporters
   */
  async verifyResolution(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');

      const { workOrderId } = req.params;
      const workOrder = await workOrderService.verifyResolution(workOrderId, req.user.userId);

      res.status(200).json({
        success: true,
        message: 'Resolution verified. Incident marked as Resolved.',
        workOrder,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/municipal/work-orders/:workOrderId/reject
   * Officer rejects a resolution with mandatory reason — returns to Assigned for rework
   */
  async rejectResolution(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');

      const { workOrderId } = req.params;
      const { reason } = req.body;
      if (!reason) throw new BadRequestError('Rejection reason is required');

      const workOrder = await workOrderService.rejectResolution(
        workOrderId,
        req.user.userId,
        reason
      );

      res.status(200).json({
        success: true,
        message: 'Resolution rejected. Work order returned for rework.',
        workOrder,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/municipal/incidents/:incidentId/duplicate-review
   * Confirms merge or dismisses suspected duplicate incident
   */
  async reviewDuplicate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');

      const { incidentId } = req.params;
      const { decision, targetIncidentId, notes } = req.body;

      if (!['confirm_merge', 'dismiss'].includes(decision)) {
        throw new BadRequestError("decision must be either 'confirm_merge' or 'dismiss'");
      }

      const result = await municipalService.reviewDuplicateIncident(
        incidentId,
        decision as 'confirm_merge' | 'dismiss',
        req.user.userId,
        targetIncidentId,
        notes
      );

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const municipalController = new MunicipalController();
