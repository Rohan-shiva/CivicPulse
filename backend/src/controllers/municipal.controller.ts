import { Request, Response, NextFunction } from 'express';
import { municipalService } from '../services/municipal.service';
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
}

export const municipalController = new MunicipalController();
