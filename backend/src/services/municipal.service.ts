import mongoose from 'mongoose';
import { Incident, IIncident, IncidentStatus, UrgencyLevel } from '../models/Incident';
import { CitizenReport } from '../models/CitizenReport';
import { WorkOrder } from '../models/WorkOrder';
import { AuditLog } from '../models/AuditLog';
import { User } from '../models/User';
import { NotFoundError, BadRequestError } from '../utils/errors';

export interface IIncidentFilters {
  status?: string;
  priority?: UrgencyLevel;
  department?: string;
  isOverdue?: boolean;
  search?: string;
  duplicateReview?: boolean;
  isDuplicate?: boolean;
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

    // 6. Duplicate / Merged Incidents Filter
    if (filters.duplicateReview) {
      query.duplicateReviewState = 'pending_review';
    } else if (filters.isDuplicate) {
      query.$or = [{ reportCount: { $gt: 1 } }, { duplicateReviewState: 'pending_review' }];
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

  /**
   * Aggregated dashboard statistics for municipal officers.
   * All counts derived from real MongoDB aggregations.
   */
  async getDashboardStats() {
    const now = new Date();

    const [
      totalOpen,
      priorityBreakdown,
      slaOverdue,
      awaitingVerification,
      resolvedToday,
      pendingDuplicateReviews,
      recentActivity,
    ] = await Promise.all([
      // Active (non-closed, non-resolved) incidents
      Incident.countDocuments({
        status: { $nin: ['Resolved', 'Closed'] },
      }),

      // Priority breakdown (non-resolved)
      Incident.aggregate([
        { $match: { status: { $nin: ['Resolved', 'Closed'] } } },
        { $group: { _id: '$effectivePriority', count: { $sum: 1 } } },
      ]),

      // SLA overdue
      Incident.countDocuments({
        status: { $nin: ['Resolved', 'Closed'] },
        slaDeadline: { $lt: now },
      }),

      // Awaiting verification
      Incident.countDocuments({ status: 'AwaitingVerification' }),

      // Resolved today
      Incident.countDocuments({
        status: { $in: ['Resolved', 'Closed'] },
        resolvedAt: {
          $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        },
      }),

      // Suspected duplicates pending review
      Incident.countDocuments({
        duplicateReviewState: 'pending_review',
        status: { $nin: ['Resolved', 'Closed'] },
      }),

      // Recent audit activity (last 10 entries)
      AuditLog.find()
        .populate('actorId', 'name role')
        .sort({ timestamp: -1 })
        .limit(10)
        .lean(),
    ]);

    // Build priority map
    const priorityMap: Record<string, number> = {
      Critical: 0,
      High: 0,
      Medium: 0,
      Low: 0,
    };
    for (const p of priorityBreakdown) {
      if (p._id && priorityMap[p._id] !== undefined) {
        priorityMap[p._id] = p.count;
      }
    }

    return {
      totalOpen,
      priorityBreakdown: priorityMap,
      slaOverdue,
      awaitingVerification,
      resolvedToday,
      pendingDuplicateReviews,
      recentActivity,
    };
  }

  /**
   * Returns GeoJSON FeatureCollection of active incident locations.
   * Used to render priority-colored markers on Leaflet maps.
   */
  async getIncidentMap() {
    const incidents = await Incident.find({
      status: { $nin: ['Resolved', 'Closed'] },
    })
      .select(
        'incidentId title effectivePriority status addressText canonicalLocation reportCount slaDeadline'
      )
      .lean();

    const priorityColor: Record<string, string> = {
      Critical: '#DC2626',
      High: '#EA580C',
      Medium: '#CA8A04',
      Low: '#16A34A',
    };

    const features = incidents.map((inc) => ({
      type: 'Feature' as const,
      geometry: inc.canonicalLocation,
      properties: {
        incidentId: inc.incidentId,
        title: inc.title,
        priority: inc.effectivePriority,
        status: inc.status,
        address: inc.addressText || '',
        reportCount: inc.reportCount,
        slaDeadline: inc.slaDeadline,
        color: priorityColor[inc.effectivePriority] || '#64748B',
      },
    }));

    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }

  /**
   * Lists active field workers (and operational staff), optionally filtered by department code.
   */
  async getFieldWorkers(departmentCode?: string) {
    const query: Record<string, unknown> = {
      role: { $in: ['field_worker', 'officer'] },
      isActive: true,
    };
    if (departmentCode && departmentCode !== 'ALL' && departmentCode.trim().length > 0) {
      query.departmentName = new RegExp(departmentCode.trim(), 'i');
    }

    const workers = await User.find(query)
      .select('_id name phone departmentName ward role')
      .sort({ name: 1 })
      .lean();

    return workers;
  }

  /**
   * Officer confirms or dismisses a suspected duplicate incident.
   * If confirm_merge: transfers citizen reports into target incident and closes duplicate.
   * If dismiss: marks duplicateReviewState = 'dismissed' and keeps as distinct incident.
   */
  async reviewDuplicateIncident(
    incidentId: string,
    decision: 'confirm_merge' | 'dismiss',
    officerId: string,
    targetIncidentId?: string,
    notes?: string
  ) {
    const incident = mongoose.Types.ObjectId.isValid(incidentId)
      ? await Incident.findOne({ $or: [{ incidentId }, { _id: incidentId }] })
      : await Incident.findOne({ incidentId });

    if (!incident) {
      throw new NotFoundError(`Incident '${incidentId}' not found`);
    }

    if (decision === 'dismiss') {
      incident.duplicateReviewState = 'dismissed';
      incident.isProvisional = false;
      await incident.save();

      await AuditLog.create({
        entityType: 'Incident',
        entityId: incident.incidentId,
        action: 'DUPLICATE_REVIEW_DISMISSED',
        actorId: new mongoose.Types.ObjectId(officerId),
        actorRole: 'officer',
        reason: notes || 'Officer confirmed issue is distinct and separate',
      });

      return {
        incident,
        message: `Duplicate review dismissed. Incident ${incident.incidentId} is retained as independent.`,
      };
    }

    // Merge decision
    let targetIncident: IIncident | null = null;
    if (targetIncidentId) {
      targetIncident = mongoose.Types.ObjectId.isValid(targetIncidentId)
        ? await Incident.findOne({ $or: [{ incidentId: targetIncidentId }, { _id: targetIncidentId }] })
        : await Incident.findOne({ incidentId: targetIncidentId });
    }

    if (!targetIncident) {
      // Find nearest active incident in same department
      targetIncident = await Incident.findOne({
        _id: { $ne: incident._id },
        department: incident.department,
        status: { $nin: ['Resolved', 'Closed'] },
      }).sort({ lastReportedAt: -1 });
    }

    if (!targetIncident) {
      throw new BadRequestError('Could not find an active master incident to merge into');
    }

    // Transfer citizen reports to target incident
    await CitizenReport.updateMany(
      { incidentId: incident._id },
      { $set: { incidentId: targetIncident._id } }
    );

    // Update target incident counts
    targetIncident.reportCount = (targetIncident.reportCount || 1) + (incident.reportCount || 1);
    targetIncident.lastReportedAt = new Date();
    await targetIncident.save();

    // Mark duplicate incident as closed & confirmed duplicate
    incident.status = 'Closed';
    incident.duplicateReviewState = 'confirmed_duplicate';
    incident.isProvisional = false;
    await incident.save();

    await AuditLog.create({
      entityType: 'Incident',
      entityId: incident.incidentId,
      action: 'DUPLICATE_MERGED',
      actorId: new mongoose.Types.ObjectId(officerId),
      actorRole: 'officer',
      newValues: { mergedInto: targetIncident.incidentId },
      reason: notes || `Merged into ${targetIncident.incidentId}`,
    });

    return {
      incident,
      targetIncident,
      message: `Incident ${incident.incidentId} merged into ${targetIncident.incidentId} successfully.`,
    };
  }

  /**
   * Returns incidents with AwaitingVerification status plus their pending work orders.
   */
  async getVerificationQueue() {
    const incidents = await Incident.find({ status: 'AwaitingVerification' })
      .sort({ slaDeadline: 1, firstReportedAt: 1 })
      .lean();

    const incidentIds = incidents.map((i) => i._id);

    const workOrders = await WorkOrder.find({
      incidentId: { $in: incidentIds },
      status: 'AwaitingVerification',
    })
      .populate('assignedWorkerIds', 'name phone')
      .sort({ submittedAt: 1 })
      .lean();

    // Map work orders by incidentId for easy join
    const woByIncident: Record<string, typeof workOrders> = {};
    for (const wo of workOrders) {
      const key = String(wo.incidentId);
      if (!woByIncident[key]) woByIncident[key] = [];
      woByIncident[key].push(wo);
    }

    return incidents.map((inc) => ({
      incident: inc,
      workOrders: woByIncident[String(inc._id)] || [],
    }));
  }
}

export const municipalService = new MunicipalService();
