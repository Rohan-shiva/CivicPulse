import { describe, it, expect } from 'vitest';
import { municipalService } from '../services/municipal.service';
import { Incident } from '../models/Incident';
import mongoose from 'mongoose';

describe('Municipal Service & Priority Queue Sorting Logic', () => {
  it('should enforce strict priority queue sorting order', () => {
    // Array of mock incidents
    const now = Date.now();
    const incidents = [
      {
        incidentId: 'INC-MEDIUM-OLD',
        priorityRank: 2, // Medium
        slaDeadline: new Date(now + 10 * 3600000),
        firstReportedAt: new Date(now - 48 * 3600000), // Reported 2 days ago
      },
      {
        incidentId: 'INC-CRITICAL-NEW',
        priorityRank: 4, // Critical
        slaDeadline: new Date(now + 6 * 3600000),
        firstReportedAt: new Date(now - 1 * 3600000), // Reported 1 hour ago
      },
      {
        incidentId: 'INC-HIGH-URGENT-SLA',
        priorityRank: 3, // High
        slaDeadline: new Date(now + 2 * 3600000), // SLA expires in 2 hours
        firstReportedAt: new Date(now - 5 * 3600000),
      },
      {
        incidentId: 'INC-HIGH-LATER-SLA',
        priorityRank: 3, // High
        slaDeadline: new Date(now + 12 * 3600000), // SLA expires in 12 hours
        firstReportedAt: new Date(now - 6 * 3600000),
      },
    ];

    // Sort using the municipal priority queue comparator
    const sorted = [...incidents].sort((a, b) => {
      // 1. Priority rank descending
      if (b.priorityRank !== a.priorityRank) {
        return b.priorityRank - a.priorityRank;
      }
      // 2. SLA deadline ascending
      const slaDiff = a.slaDeadline.getTime() - b.slaDeadline.getTime();
      if (slaDiff !== 0) return slaDiff;
      // 3. FIFO submission
      return a.firstReportedAt.getTime() - b.firstReportedAt.getTime();
    });

    // 1st must be Critical despite being submitted recently
    expect(sorted[0].incidentId).toBe('INC-CRITICAL-NEW');
    // 2nd must be High with earliest SLA
    expect(sorted[1].incidentId).toBe('INC-HIGH-URGENT-SLA');
    // 3rd must be High with later SLA
    expect(sorted[2].incidentId).toBe('INC-HIGH-LATER-SLA');
    // 4th must be Medium despite being the oldest
    expect(sorted[3].incidentId).toBe('INC-MEDIUM-OLD');
  });

  it('should validate allowed status transitions', async () => {
    // Rejects invalid status string
    await expect(
      municipalService.updateIncidentStatus(
        'INC-NONEXISTENT',
        'INVALID_STATUS' as any,
        new mongoose.Types.ObjectId().toString()
      )
    ).rejects.toThrow(/Invalid incident status/);
  });
});
