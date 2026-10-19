import mongoose from 'mongoose';
import { Incident } from '../models/Incident';
import { WorkOrder, IWorkOrder } from '../models/WorkOrder';
import { AuditLog } from '../models/AuditLog';
import { Notification } from '../models/Notification';
import { CitizenReport } from '../models/CitizenReport';
import { User } from '../models/User';
import { NotFoundError, BadRequestError } from '../utils/errors';

/** Generate a sequential work-order ID: WO-YYYY-NNNNNN */
async function generateWorkOrderId(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await WorkOrder.countDocuments();
  const seq = String(count + 1).padStart(6, '0');
  return `WO-${year}-${seq}`;
}

export class WorkOrderService {
  /**
   * Assign field workers to an incident and create a WorkOrder.
   * Transitions incident from Open/Reopened → Assigned.
   */
  async assignWorkers(
    incidentId: string,
    workerIds: string[],
    officerId: string,
    scheduledAt?: Date
  ): Promise<IWorkOrder> {
    if (!workerIds || workerIds.length === 0) {
      throw new BadRequestError('At least one worker ID is required');
    }

    const incident = await Incident.findOne({ incidentId });
    if (!incident) {
      throw new NotFoundError(`Incident '${incidentId}' not found`);
    }

    // Validate worker IDs exist and have field_worker role
    const workerObjectIds = workerIds.map((id) => new mongoose.Types.ObjectId(id));
    const workers = await User.find({
      _id: { $in: workerObjectIds },
      role: { $in: ['field_worker', 'officer', 'admin'] },
      isActive: true,
    }).lean();

    if (workers.length === 0) {
      throw new BadRequestError('No valid active field workers found for provided IDs');
    }

    const workOrderId = await generateWorkOrderId();

    // Deadline = incident SLA deadline (already set at incident creation)
    const workOrder = await WorkOrder.create({
      workOrderId,
      incidentId: incident._id,
      assignedDepartment: incident.assignedDepartment,
      assignedWorkerIds: workerObjectIds,
      status: 'Assigned',
      assignedAt: new Date(),
      scheduledAt: scheduledAt || undefined,
      deadline: incident.slaDeadline,
    });

    // Link work order to incident and transition status
    incident.currentWorkOrderId = workOrder._id as mongoose.Types.ObjectId;
    incident.status = 'Assigned';
    await incident.save();

    // Audit log
    await AuditLog.create({
      entityType: 'Incident',
      entityId: incident.incidentId,
      action: 'ASSIGNED',
      actorId: new mongoose.Types.ObjectId(officerId),
      actorRole: 'officer',
      previousValues: { status: incident.status },
      newValues: {
        status: 'Assigned',
        workOrderId,
        assignedWorkerIds: workerIds,
      },
      reason: `Assigned to ${workers.map((w) => w.name).join(', ')}`,
    });

    // Notify assigned workers
    const notifDocs = workerObjectIds.map((wid) => ({
      userId: wid,
      incidentId: incident.incidentId,
      type: 'WORK_ASSIGNED' as const,
      title: 'New Work Order Assigned',
      message: `You have been assigned work order ${workOrderId} for incident ${incident.incidentId}: ${incident.title}`,
    }));
    await Notification.insertMany(notifDocs);

    return workOrder;
  }

  /**
   * Field worker: start work on an assigned work order (Assigned → InProgress)
   */
  async startWorkOrder(workOrderId: string, workerId: string): Promise<IWorkOrder> {
    const workOrder = await WorkOrder.findOne({ workOrderId });
    if (!workOrder) {
      throw new NotFoundError(`Work order '${workOrderId}' not found`);
    }

    const workerOid = new mongoose.Types.ObjectId(workerId);
    const isAssigned = workOrder.assignedWorkerIds.some((id) => id.equals(workerOid));
    if (!isAssigned) {
      throw new BadRequestError('You are not assigned to this work order');
    }

    if (workOrder.status !== 'Assigned') {
      throw new BadRequestError(`Cannot start a work order with status '${workOrder.status}'`);
    }

    workOrder.status = 'InProgress';
    await workOrder.save();

    // Transition parent incident
    await Incident.findByIdAndUpdate(workOrder.incidentId, { status: 'InProgress' });

    await AuditLog.create({
      entityType: 'WorkOrder',
      entityId: workOrderId,
      action: 'STATUS_TRANSITION',
      actorId: workerOid,
      actorRole: 'field_worker',
      previousValues: { status: 'Assigned' },
      newValues: { status: 'InProgress' },
      reason: 'Worker started work',
    });

    return workOrder;
  }

  /**
   * Field worker: submit resolution evidence (InProgress → AwaitingVerification)
   */
  async submitResolution(
    workOrderId: string,
    workerId: string,
    resolutionNotes: string,
    evidencePhotoUrls: string[]
  ): Promise<IWorkOrder> {
    const workOrder = await WorkOrder.findOne({ workOrderId });
    if (!workOrder) {
      throw new NotFoundError(`Work order '${workOrderId}' not found`);
    }

    const workerOid = new mongoose.Types.ObjectId(workerId);
    const isAssigned = workOrder.assignedWorkerIds.some((id) => id.equals(workerOid));
    if (!isAssigned) {
      throw new BadRequestError('You are not assigned to this work order');
    }

    if (!['Assigned', 'InProgress'].includes(workOrder.status)) {
      throw new BadRequestError(
        `Cannot submit resolution for work order with status '${workOrder.status}'`
      );
    }

    workOrder.status = 'AwaitingVerification';
    workOrder.resolutionNotes = resolutionNotes;
    workOrder.resolutionEvidencePhotoUrls = evidencePhotoUrls;
    workOrder.submittedAt = new Date();
    workOrder.actionTaken = 'Field resolution submitted';
    await workOrder.save();

    // Transition parent incident
    await Incident.findByIdAndUpdate(workOrder.incidentId, {
      status: 'AwaitingVerification',
    });

    await AuditLog.create({
      entityType: 'WorkOrder',
      entityId: workOrderId,
      action: 'RESOLUTION_SUBMITTED',
      actorId: workerOid,
      actorRole: 'field_worker',
      previousValues: { status: 'InProgress' },
      newValues: { status: 'AwaitingVerification' },
      reason: resolutionNotes || 'Resolution submitted for officer review',
    });

    return workOrder;
  }

  /**
   * Officer: verify (approve) a submitted resolution (AwaitingVerification → Verified/Resolved)
   */
  async verifyResolution(workOrderId: string, officerId: string): Promise<IWorkOrder> {
    const workOrder = await WorkOrder.findOne({ workOrderId });
    if (!workOrder) {
      throw new NotFoundError(`Work order '${workOrderId}' not found`);
    }

    if (workOrder.status !== 'AwaitingVerification') {
      throw new BadRequestError(
        `Cannot verify a work order with status '${workOrder.status}'`
      );
    }

    const officerOid = new mongoose.Types.ObjectId(officerId);
    workOrder.status = 'Verified';
    workOrder.reviewDecision = 'approved';
    workOrder.reviewedAt = new Date();
    workOrder.reviewingOfficerId = officerOid;
    await workOrder.save();

    // Resolve parent incident
    const incident = await Incident.findByIdAndUpdate(
      workOrder.incidentId,
      { status: 'Resolved', resolvedAt: new Date() },
      { new: true }
    );

    await AuditLog.create({
      entityType: 'WorkOrder',
      entityId: workOrderId,
      action: 'RESOLUTION_VERIFIED',
      actorId: officerOid,
      actorRole: 'officer',
      previousValues: { status: 'AwaitingVerification' },
      newValues: { status: 'Verified', reviewDecision: 'approved' },
      reason: 'Resolution approved by officer',
    });

    // Notify all citizens who reported on this incident
    if (incident) {
      const linkedReports = await CitizenReport.find({
        incidentId: incident._id,
      }).lean();

      const reporterIds = [...new Set(linkedReports.map((r) => String(r.reporterId)))];
      if (reporterIds.length > 0) {
        const notifDocs = reporterIds.map((uid) => ({
          userId: new mongoose.Types.ObjectId(uid),
          incidentId: incident.incidentId,
          type: 'RESOLVED' as const,
          title: 'Issue Resolved ✓',
          message: `Your reported issue "${incident.title}" has been resolved and verified by a municipal officer.`,
        }));
        await Notification.insertMany(notifDocs);
      }
    }

    return workOrder;
  }

  /**
   * Officer: reject a submitted resolution (AwaitingVerification → Assigned for rework)
   */
  async rejectResolution(
    workOrderId: string,
    officerId: string,
    reason: string
  ): Promise<IWorkOrder> {
    if (!reason || reason.trim().length < 5) {
      throw new BadRequestError('A rejection reason of at least 5 characters is required');
    }

    const workOrder = await WorkOrder.findOne({ workOrderId });
    if (!workOrder) {
      throw new NotFoundError(`Work order '${workOrderId}' not found`);
    }

    if (workOrder.status !== 'AwaitingVerification') {
      throw new BadRequestError(
        `Cannot reject a work order with status '${workOrder.status}'`
      );
    }

    const officerOid = new mongoose.Types.ObjectId(officerId);
    workOrder.status = 'Assigned'; // Return to assigned for rework (photos preserved)
    workOrder.reviewDecision = 'rejected';
    workOrder.reviewedAt = new Date();
    workOrder.reviewingOfficerId = officerOid;
    workOrder.rejectionReason = reason.trim();
    await workOrder.save();

    // Return incident to Assigned
    await Incident.findByIdAndUpdate(workOrder.incidentId, { status: 'Assigned' });

    await AuditLog.create({
      entityType: 'WorkOrder',
      entityId: workOrderId,
      action: 'RESOLUTION_REJECTED',
      actorId: officerOid,
      actorRole: 'officer',
      previousValues: { status: 'AwaitingVerification' },
      newValues: { status: 'Assigned', reviewDecision: 'rejected' },
      reason: reason.trim(),
    });

    // Notify assigned workers of rejection
    const notifDocs = workOrder.assignedWorkerIds.map((wid) => ({
      userId: wid,
      incidentId: String(workOrder.incidentId),
      type: 'STATUS_CHANGE' as const,
      title: 'Resolution Rejected — Rework Required',
      message: `Your resolution for work order ${workOrderId} was rejected. Reason: ${reason.trim()}`,
    }));
    if (notifDocs.length > 0) {
      await Notification.insertMany(notifDocs);
    }

    return workOrder;
  }

  /**
   * Get work orders assigned to a specific field worker
   */
  async getWorkerWorkOrders(workerId: string, status?: string) {
    const query: Record<string, unknown> = {
      assignedWorkerIds: new mongoose.Types.ObjectId(workerId),
    };
    if (status) {
      query.status = status;
    }

    const workOrders = await WorkOrder.find(query)
      .populate({
        path: 'incidentId',
        select:
          'incidentId title standardizedDescription complaintType effectivePriority status addressText canonicalLocation slaDeadline',
      })
      .sort({ assignedAt: -1 })
      .lean();

    return workOrders;
  }

  /**
   * Get a single work order by ID (for field worker — validates assignment)
   */
  async getWorkerWorkOrderById(workOrderId: string, workerId: string) {
    const workOrder = await WorkOrder.findOne({ workOrderId })
      .populate({
        path: 'incidentId',
        select:
          'incidentId title standardizedDescription complaintType effectivePriority status addressText canonicalLocation slaDeadline reportCount',
      })
      .populate('assignedWorkerIds', 'name phone')
      .lean();

    if (!workOrder) {
      throw new NotFoundError(`Work order '${workOrderId}' not found`);
    }

    const workerOid = new mongoose.Types.ObjectId(workerId);
    const isAssigned = workOrder.assignedWorkerIds.some((id: mongoose.Types.ObjectId) =>
      id.equals(workerOid)
    );
    if (!isAssigned) {
      throw new BadRequestError('You are not assigned to this work order');
    }

    // Fetch linked citizen reports for context
    const incidentDoc = workOrder.incidentId as any;
    const linkedReports = incidentDoc?._id
      ? await CitizenReport.find({ incidentId: incidentDoc._id })
          .select('complaintId description photoUrls createdAt')
          .sort({ createdAt: 1 })
          .lean()
      : [];

    return { workOrder, linkedReports };
  }
}

export const workOrderService = new WorkOrderService();
