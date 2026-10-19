import { describe, it, expect, vi, afterEach } from 'vitest';
import { workOrderService } from '../services/workorder.service';
import { WorkOrder } from '../models/WorkOrder';
import { Incident } from '../models/Incident';
import mongoose from 'mongoose';

describe('WorkOrder Service & Field Worker Assignment', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should reject assignment when workerIds array is empty', async () => {
    await expect(
      workOrderService.assignWorkers(
        'INC-2026-999999',
        [],
        new mongoose.Types.ObjectId().toString()
      )
    ).rejects.toThrow(/At least one worker ID is required/);
  });

  it('should throw NotFoundError if incident does not exist', async () => {
    vi.spyOn(Incident, 'findOne').mockResolvedValue(null as any);

    const fakeWorkerId = new mongoose.Types.ObjectId().toString();
    const fakeOfficerId = new mongoose.Types.ObjectId().toString();

    await expect(
      workOrderService.assignWorkers(
        'INC-NONEXISTENT',
        [fakeWorkerId],
        fakeOfficerId
      )
    ).rejects.toThrow(/not found/);
  });

  it('should validate WorkOrder schema definition and default status', () => {
    const testDoc = new WorkOrder({
      workOrderId: 'WO-2026-000001',
      incidentId: new mongoose.Types.ObjectId(),
      assignedDepartment: 'ROADS',
      assignedWorkerIds: [new mongoose.Types.ObjectId()],
      deadline: new Date(Date.now() + 24 * 3600000),
    });

    expect(testDoc.status).toBe('Assigned');
    expect(testDoc.workOrderId).toBe('WO-2026-000001');
    expect(testDoc.resolutionEvidencePhotoUrls).toEqual([]);
    expect(testDoc.assignedDepartment).toBe('ROADS');
  });

  it('should reject startWorkOrder if work order does not exist', async () => {
    vi.spyOn(WorkOrder, 'findOne').mockResolvedValue(null as any);

    await expect(
      workOrderService.startWorkOrder('WO-NONEXISTENT', new mongoose.Types.ObjectId().toString())
    ).rejects.toThrow(/not found/);
  });

  it('should reject submitResolution if work order does not exist', async () => {
    vi.spyOn(WorkOrder, 'findOne').mockResolvedValue(null as any);

    await expect(
      workOrderService.submitResolution(
        'WO-NONEXISTENT',
        new mongoose.Types.ObjectId().toString(),
        'Fixed potholes',
        []
      )
    ).rejects.toThrow(/not found/);
  });

  it('should reject rejection without mandatory reason', async () => {
    await expect(
      workOrderService.rejectResolution(
        'WO-NONEXISTENT',
        new mongoose.Types.ObjectId().toString(),
        ''
      )
    ).rejects.toThrow(/rejection reason of at least 5 characters is required/);
  });
});
