import crypto from 'crypto';
import mongoose from 'mongoose';
import { Incident, IIncident, UrgencyLevel, IncidentStatus } from '../models/Incident';
import { CitizenReport, ICitizenReport } from '../models/CitizenReport';
import { AuditLog } from '../models/AuditLog';
import { IssueCategory } from '../models/IssueCategory';
import { groqService, IGroqExtraction } from './groq.service';
import { duplicateService } from './duplicate.service';
import { createGeoJsonPoint } from '../utils/geo';
import { env } from '../config/env';

export class IncidentService {
  /**
   * Generates a collision-safe, human-readable Complaint ID: CP-YYYY-XXXXXX
   */
  generateComplaintId(): string {
    const year = new Date().getFullYear();
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 chars
    return `CP-${year}-${randomHex}`;
  }

  /**
   * Generates a collision-safe, human-readable Incident ID: INC-YYYY-XXXXXX
   */
  generateIncidentId(): string {
    const year = new Date().getFullYear();
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 chars
    return `INC-${year}-${randomHex}`;
  }

  /**
   * Maps urgency text to numerical priority rank
   */
  getPriorityRank(urgency: UrgencyLevel): number {
    switch (urgency) {
      case 'Critical':
        return 4;
      case 'High':
        return 3;
      case 'Medium':
        return 2;
      case 'Low':
        return 1;
      default:
        return 2;
    }
  }

  /**
   * Calculates SLA deadline based on urgency and category SLA hours
   */
  calculateSlaDeadline(urgency: UrgencyLevel, customSlaHours?: number): Date {
    const now = new Date();
    let hoursToAdd = 48; // default

    if (customSlaHours && customSlaHours > 0) {
      hoursToAdd = customSlaHours;
    } else {
      switch (urgency) {
        case 'Critical':
          hoursToAdd = 12;
          break;
        case 'High':
          hoursToAdd = 24;
          break;
        case 'Medium':
          hoursToAdd = 48;
          break;
        case 'Low':
          hoursToAdd = 72;
          break;
      }
    }

    return new Date(now.getTime() + hoursToAdd * 60 * 60 * 1000);
  }

  /**
   * Submits and processes a citizen complaint end-to-end
   */
  async submitCitizenReport(data: {
    reporterId: string;
    inputType: 'text' | 'voice' | 'both';
    nativeTranscript?: string;
    originalLanguageCode?: string;
    description: string;
    photoUrls: string[];
    coordinates: [number, number]; // [longitude, latitude]
    addressText?: string;
    rawExifLocation?: { latitude: number; longitude: number; altitude?: number };
    rawDeviceLocation?: { latitude: number; longitude: number; accuracy?: number };
    locationSource: 'device' | 'exif' | 'manual';
  }): Promise<{
    report: ICitizenReport;
    incident: IIncident;
    isDuplicate: boolean;
    complaintId: string;
    incidentId: string;
  }> {
    const complaintId = this.generateComplaintId();
    const geoPoint = createGeoJsonPoint(data.coordinates[0], data.coordinates[1]);

    // 1. AI Analysis & Metadata Extraction via Groq
    const aiAssessment = await groqService.analyzeComplaint(data.description);

    // 2. Duplicate Detection Evaluation
    const duplicateEvaluation = await duplicateService.evaluateReport(
      aiAssessment.standardizedSummary || data.description,
      data.coordinates,
      aiAssessment.complaintType
    );

    let resolvedIncident: IIncident;
    let isDuplicate = false;

    if (duplicateEvaluation.outcome === 'linked_auto' && duplicateEvaluation.matchedIncident) {
      // LINK TO EXISTING INCIDENT
      isDuplicate = true;
      resolvedIncident = duplicateEvaluation.matchedIncident;

      resolvedIncident.reportCount += 1;
      resolvedIncident.lastReportedAt = new Date();

      // Check if new report increases urgency
      const newRank = this.getPriorityRank(aiAssessment.suggestedUrgency);
      if (newRank > resolvedIncident.priorityRank) {
        resolvedIncident.effectivePriority = aiAssessment.suggestedUrgency;
        resolvedIncident.priorityRank = newRank;
        resolvedIncident.priorityExplanation = `Escalated to ${aiAssessment.suggestedUrgency} due to duplicate report ${complaintId}: ${aiAssessment.reasonForUrgency}`;
      }

      await resolvedIncident.save();

      // Audit Log for duplicate linking
      await AuditLog.create({
        entityType: 'Incident',
        entityId: resolvedIncident.incidentId,
        action: 'DUPLICATE_LINKED',
        actorId: new mongoose.Types.ObjectId(data.reporterId),
        actorRole: 'citizen',
        newValues: {
          linkedComplaintId: complaintId,
          similarityScore: duplicateEvaluation.similarityScore,
          distanceMeters: duplicateEvaluation.distanceMeters,
        },
        reason: `Auto-linked complaint (${Math.round(duplicateEvaluation.similarityScore * 100)}% match at ${duplicateEvaluation.distanceMeters}m)`,
      });
    } else {
      // CREATE NEW INCIDENT
      const incidentId = this.generateIncidentId();
      const priorityRank = this.getPriorityRank(aiAssessment.suggestedUrgency);
      const slaDeadline = this.calculateSlaDeadline(aiAssessment.suggestedUrgency);

      resolvedIncident = await Incident.create({
        incidentId,
        title: `${aiAssessment.complaintType.replace(/_/g, ' ')} at ${data.addressText || 'Reported Location'}`,
        standardizedDescription: aiAssessment.standardizedSummary || data.description,
        complaintType: aiAssessment.complaintType,
        department: aiAssessment.department,
        assignedDepartment: aiAssessment.department,
        canonicalLocation: geoPoint,
        addressText: data.addressText,
        descriptionEmbedding: duplicateEvaluation.embedding,
        embeddingModel: env.EMBEDDING_MODEL,
        effectivePriority: aiAssessment.suggestedUrgency,
        priorityRank,
        aiSuggestedUrgency: aiAssessment.suggestedUrgency,
        priorityExplanation: aiAssessment.reasonForUrgency,
        status: 'Open',
        reportCount: 1,
        distinctReporterCount: 1,
        firstReportedAt: new Date(),
        lastReportedAt: new Date(),
        slaDeadline,
        duplicateReviewState: duplicateEvaluation.outcome === 'under_review' ? 'pending_review' : 'none',
        isProvisional: duplicateEvaluation.outcome === 'under_review',
      });

      // Audit Log for incident creation
      await AuditLog.create({
        entityType: 'Incident',
        entityId: incidentId,
        action: 'CREATED',
        actorId: new mongoose.Types.ObjectId(data.reporterId),
        actorRole: 'citizen',
        newValues: {
          complaintType: aiAssessment.complaintType,
          department: aiAssessment.department,
          urgency: aiAssessment.suggestedUrgency,
        },
        reason: 'New civic incident reported by citizen',
      });
    }

    // 3. Create and Save CitizenReport
    const citizenReport = await CitizenReport.create({
      complaintId,
      reporterId: new mongoose.Types.ObjectId(data.reporterId),
      incidentId: resolvedIncident._id,
      inputType: data.inputType,
      nativeTranscript: data.nativeTranscript,
      originalLanguageCode: data.originalLanguageCode || 'en',
      standardizedEnglishDescription: aiAssessment.standardizedSummary || data.description,
      photoUrls: data.photoUrls,
      confirmedLocation: geoPoint,
      addressText: data.addressText,
      rawExifLocation: data.rawExifLocation,
      rawDeviceLocation: data.rawDeviceLocation,
      locationSource: data.locationSource,
      aiAssessment: {
        complaintType: aiAssessment.complaintType,
        department: aiAssessment.department,
        suggestedUrgency: aiAssessment.suggestedUrgency,
        safetyRisk: aiAssessment.safetyRisk,
        explanation: aiAssessment.reasonForUrgency,
        confidence: aiAssessment.confidence,
        modelIdentifier: aiAssessment.modelIdentifier,
      },
      duplicateMatching: {
        outcome: duplicateEvaluation.outcome,
        similarityScore: duplicateEvaluation.similarityScore,
        matchedIncidentId: resolvedIncident._id as any,
        distanceMeters: duplicateEvaluation.distanceMeters,
      },
      processingStatus: 'completed',
    });

    return {
      report: citizenReport,
      incident: resolvedIncident,
      isDuplicate,
      complaintId,
      incidentId: resolvedIncident.incidentId,
    };
  }
}

export const incidentService = new IncidentService();
