import mongoose from 'mongoose';
import { Incident, IIncident, IncidentStatus, UrgencyLevel } from '../models/Incident';
import { CitizenReport } from '../models/CitizenReport';
import { WorkOrder } from '../models/WorkOrder';
import { AuditLog } from '../models/AuditLog';
import { NotFoundError, BadRequestError } from '../utils/errors';

export interface IIncidentFilters {
  status?: string;
  priority?: UrgencyLevel;
  department?: string;
  isOverdue?: boolean;
  search?: string;
}

export interface IPagination {
  page: number;
  limit: number;
}

export class MunicipalService {
  /**
   * Retrieves priority queue of incidents sorted deterministically:
   * 1. Effective priority rank descending (Critical=4 to Low=1)
   * 2. SLA deadline ascending (earliest deadline first)
   * 3. First reported timestamp ascending (FIFO within equivalent tier)
   */
  async getIncidentQueue(
    filters: IIncidentFilters,
    pagination: IPagination = { page: 1, limit: 15 }
  ) {
    const query: mongoose.FilterQuery<IIncident> = {};

    // 1. Status Filter
    if (filters.status) {
      if (filters.status === 'active') {
        query.status = {
          $in: ['Open', 'Assigned', 'InProgress', 'AwaitingVerification', 'Reopened'],
        };
      } else {
        query.status = filters.status;
      }
    }

    // 2. Priority Filter
    if (filters.priority) {
      query.effectivePriority = filters.priority;
    }

    // 3. Department Filter
    if (filters.department && filters.department !== 'ALL') {
      query.department = filters.department.toUpperCase();
    }

    // 4. SLA Overdue Filter
    if (filters.isOverdue) {
      query.slaDeadline = { $lt: new Date() };
      query.status = { $nin: ['Resolved', 'Closed'] };
    }

    // 5. Search Text Filter
    if (filters.search && filters.search.trim().length > 0) {
      const searchRegex = new RegExp(filters.search.trim(), 'i');
      query.$or = [
        { incidentId: searchRegex },
        { title: searchRegex },
        { standardizedDescription: searchRegex },
        { addressText: searchRegex },
      ];
    }

    const page = Math.max(1, pagination.page);
    const limit = Math.min(50, Math.max(1, pagination.limit));
    const skip = (page - 1) * limit;

    const [total, incidents] = await Promise.all([
      Incident.countDocuments(query),
      Incident.find(query)
        .sort({
          priorityRank: -1, // Critical (4) first, then High (3), Medium (2), Low (1)
          slaDeadline: 1,   // Earliest SLA target first
          firstReportedAt: 1, // Older incident first within equivalent conditions
        })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return {
      incidents,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Retrieves full incident details, associated citizen reports, work orders, and audit logs
   */
  async getIncidentDetails(incidentId: string) {
    const incident = await Incident.findOne({ incidentId }).lean();
    if (!incident) {
      throw new NotFoundError(`Incident '${incidentId}' not found`);
    }

    const [linkedReports, workOrders, auditLogs] = await Promise.all([
      CitizenReport.find({ incidentId: incident._id })
        .populate('reporterId', 'name phone email')
        .sort({ createdAt: 1 })
        .lean(),
      WorkOrder.find({ incidentId: incident._id })
        .populate('assignedWorkerIds', 'name phone')
        .populate('reviewingOfficerId', 'name')
        .sort({ createdAt: -1 })
        .lean(),
      AuditLog.find({
        entityType: 'Incident',
        entityId: incident.incidentId,
      })
        .populate('actorId', 'name role')
        .sort({ timestamp: -1 })
        .limit(20)
        .lean(),
    ]);

    return {
      incident,
      linkedReports,
      workOrders,
      auditLogs,
    };
  }

  /**
   * Updates an incident's operational status and creates an AuditLog record
   */
  async updateIncidentStatus(
    incidentId: string,
    newStatus: IncidentStatus,
    actorId: string,
    reason?: string
  ): Promise<IIncident> {
    const validStatuses: IncidentStatus[] = [
      'Open',
      'Assigned',
      'InProgress',
      'AwaitingVerification',
      'Resolved',
      'Closed',
      'Reopened',
    ];

    if (!validStatuses.includes(newStatus)) {
      throw new BadRequestError(`Invalid incident status '${newStatus}'`);
    }

    const incident = await Incident.findOne({ incidentId });
    if (!incident) {
      throw new NotFoundError(`Incident '${incidentId}' not found`);
    }

    const previousStatus = incident.status;
    incident.status = newStatus;

    if (newStatus === 'Resolved' || newStatus === 'Closed') {
      incident.resolvedAt = new Date();
    }

    await incident.save();

    // Create Audit Log
    await AuditLog.create({
      entityType: 'Incident',
      entityId: incident.incidentId,
      action: 'STATUS_TRANSITION',
      actorId: new mongoose.Types.ObjectId(actorId),
      actorRole: 'officer',
      previousValues: { status: previousStatus },
      newValues: { status: newStatus },
      reason: reason || `Status changed from ${previousStatus} to ${newStatus}`,
    });

    return incident;
  }
}

export const municipalService = new MunicipalService();
