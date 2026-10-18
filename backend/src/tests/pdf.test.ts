import { describe, it, expect } from 'vitest';
import { pdfService } from '../services/pdf.service';
import mongoose from 'mongoose';

describe('PDF Acknowledgement Generation Service', () => {
  it('should generate a valid PDF binary buffer containing PDF header', async () => {
    const mockReport: any = {
      complaintId: 'CP-2026-A1B2C3',
      createdAt: new Date(),
      confirmedLocation: {
        type: 'Point',
        coordinates: [77.5946, 12.9716],
      },
      locationSource: 'device',
      addressText: 'MG Road, Ward 12, Bengaluru',
      standardizedEnglishDescription: 'Large crater pothole in the middle lane causing severe two-wheeler skid risk.',
      nativeTranscript: 'ರಸ್ತೆಯಲ್ಲಿ ದೊಡ್ಡ ಗುಂಡಿ ಬಿದ್ದಿದೆ',
    };

    const mockIncident: any = {
      incidentId: 'INC-2026-F9E8D7',
      status: 'Open',
      department: 'ROADS',
      complaintType: 'POTHOLE',
      effectivePriority: 'High',
      slaDeadline: new Date(Date.now() + 24 * 3600000),
    };

    const mockUser: any = {
      name: 'Rohan Sharma',
      phone: '+919876543210',
    };

    const pdfBuffer = await pdfService.generateAcknowledgementPdf(
      mockReport,
      mockIncident,
      mockUser
    );

    expect(pdfBuffer).toBeDefined();
    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(1000);

    // Verify PDF magic bytes '%PDF-' at start
    const headerString = pdfBuffer.subarray(0, 5).toString('ascii');
    expect(headerString).toBe('%PDF-');
  });
});
