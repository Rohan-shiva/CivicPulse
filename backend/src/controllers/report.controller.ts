import { Request, Response, NextFunction } from 'express';
import { incidentService } from '../services/incident.service';
import { exifService } from '../services/exif.service';
import { cloudinaryService } from '../services/cloudinary.service';
import { pdfService } from '../services/pdf.service';
import { CitizenReport } from '../models/CitizenReport';
import { Incident } from '../models/Incident';
import { User } from '../models/User';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors';
import { checkLocationDiscrepancy, validateCoordinates } from '../utils/geo';

export class ReportController {
  /**
   * POST /api/reports
   * Submits a new citizen complaint with photo, location, and description
   */
  async submitReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required to submit complaint');
      }

      const {
        description,
        longitude,
        latitude,
        addressText,
        locationSource,
        nativeTranscript,
        originalLanguageCode,
        deviceAccuracy,
      } = req.body;

      if (!description || description.trim().length === 0) {
        throw new BadRequestError('Complaint description is required');
      }

      const numLng = parseFloat(longitude);
      const numLat = parseFloat(latitude);
      validateCoordinates(numLng, numLat);

      let photoUrls: string[] = [];
      let rawExifLocation: { latitude: number; longitude: number; altitude?: number } | undefined;

      // 1. Process uploaded photo buffer (if attached)
      if (req.file) {
        // Extract EXIF GPS from original buffer before any transformation
        const exifGps = await exifService.extractGps(req.file.buffer);
        if (exifGps) {
          rawExifLocation = exifGps;
        }

        // Upload to Cloudinary if configured
        if (cloudinaryService.isConfigured()) {
          const uploadRes = await cloudinaryService.uploadImage(req.file.buffer, {
            folder: 'civicpulse/complaints',
            tags: ['complaint', 'citizen_upload'],
          });
          photoUrls.push(uploadRes.secureUrl);
        } else {
          // If Cloudinary unconfigured in development, notify with data URL or placeholder note
          console.warn('⚠️ Cloudinary unconfigured: photo uploaded into memory but not persisted to Cloudinary.');
          photoUrls.push(`https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=60`);
        }
      }

      // 2. Check for discrepancy between EXIF GPS and confirmed map pin
      const discrepancyCheck = checkLocationDiscrepancy(
        rawExifLocation,
        { latitude: numLat, longitude: numLng },
        500
      );

      // 3. Submit report and link/create incident
      const result = await incidentService.submitCitizenReport({
        reporterId: req.user.userId,
        inputType: nativeTranscript ? 'both' : 'text',
        nativeTranscript: nativeTranscript || description,
        originalLanguageCode: originalLanguageCode || 'en',
        description: description.trim(),
        photoUrls,
        coordinates: [numLng, numLat],
        addressText: addressText ? addressText.trim() : undefined,
        rawExifLocation,
        rawDeviceLocation: deviceAccuracy
          ? { latitude: numLat, longitude: numLng, accuracy: parseFloat(deviceAccuracy) }
          : undefined,
        locationSource: locationSource || (rawExifLocation ? 'exif' : 'manual'),
      });

      res.status(201).json({
        success: true,
        message: result.isDuplicate
          ? 'Complaint received and linked to existing municipal incident'
          : 'Complaint registered and new incident created',
        complaintId: result.complaintId,
        incidentId: result.incidentId,
        isDuplicate: result.isDuplicate,
        discrepancyWarning: discrepancyCheck.hasDiscrepancy ? discrepancyCheck.warning : null,
        report: {
          id: result.report._id,
          complaintId: result.report.complaintId,
          description: result.report.standardizedEnglishDescription,
          photoUrls: result.report.photoUrls,
          status: result.incident.status,
          department: result.incident.department,
          urgency: result.incident.effectivePriority,
          createdAt: result.report.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/reports/my
   * Retrieves all complaints submitted by the authenticated citizen
   */
  async getMyReports(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }

      const reports = await CitizenReport.find({ reporterId: req.user.userId })
        .sort({ createdAt: -1 })
        .populate('incidentId')
        .lean();

      const sanitizedReports = reports.map((r: any) => ({
        id: r._id,
        complaintId: r.complaintId,
        description: r.standardizedEnglishDescription,
        nativeTranscript: r.nativeTranscript,
        photoUrls: r.photoUrls,
        location: {
          coordinates: r.confirmedLocation?.coordinates,
          addressText: r.addressText,
          source: r.locationSource,
        },
        department: r.aiAssessment?.department || r.incidentId?.department || 'Unassigned',
        urgency: r.aiAssessment?.suggestedUrgency || r.incidentId?.effectivePriority || 'Medium',
        incidentStatus: r.incidentId?.status || 'Open',
        incidentId: r.incidentId?.incidentId,
        createdAt: r.createdAt,
      }));

      res.status(200).json({
        success: true,
        count: sanitizedReports.length,
        reports: sanitizedReports,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/reports/:complaintId
   * Retrieves single complaint details with ownership enforcement
   */
  async getReportByComplaintId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new ForbiddenError('Authentication required');
      }

      const { complaintId } = req.params;
      const report = await CitizenReport.findOne({ complaintId }).populate('incidentId');

      if (!report) {
        throw new NotFoundError(`Complaint '${complaintId}' not found`);
      }

      // Check ownership (citizen can only access their own reports; officers/admins can inspect any)
      if (
        req.user.role === 'citizen' &&
        report.reporterId.toString() !== req.user.userId
      ) {
        throw new ForbiddenError('Access denied. You can only view your own complaints.');
      }

      const incident = report.incidentId as any;

      res.status(200).json({
        success: true,
        report: {
          complaintId: report.complaintId,
          description: report.standardizedEnglishDescription,
          nativeTranscript: report.nativeTranscript,
          photoUrls: report.photoUrls,
          coordinates: report.confirmedLocation.coordinates,
          addressText: report.addressText,
          locationSource: report.locationSource,
          aiAssessment: report.aiAssessment,
          createdAt: report.createdAt,
          incident: incident
            ? {
                incidentId: incident.incidentId,
                status: incident.status,
                department: incident.department,
                priority: incident.effectivePriority,
                slaDeadline: incident.slaDeadline,
                reportCount: incident.reportCount,
                firstReportedAt: incident.firstReportedAt,
              }
            : null,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/reports/:complaintId/pdf
   * Generates and downloads official acknowledgement receipt PDF
   */
  async downloadPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { complaintId } = req.params;
      const report = await CitizenReport.findOne({ complaintId });

      if (!report) {
        throw new NotFoundError(`Complaint '${complaintId}' not found`);
      }

      // Enforce ownership if citizen
      if (req.user && req.user.role === 'citizen' && report.reporterId.toString() !== req.user.userId) {
        throw new ForbiddenError('Access denied. You can only download receipts for your own complaints.');
      }

      const incident = await Incident.findById(report.incidentId);
      if (!incident) {
        throw new NotFoundError('Associated incident not found');
      }

      const user = await User.findById(report.reporterId);

      const pdfBuffer = await pdfService.generateAcknowledgementPdf(report, incident, user || undefined);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="CivicPulse-Ack-${complaintId}.pdf"`
      );
      res.setHeader('Content-Length', pdfBuffer.length);

      res.status(200).send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  }
}

export const reportController = new ReportController();
