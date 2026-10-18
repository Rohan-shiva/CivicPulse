import { Incident, IIncident } from '../models/Incident';
import { env } from '../config/env';
import { embeddingService } from './embedding.service';
import { calculateDistanceMeters } from '../utils/geo';

export interface IDuplicateEvaluationResult {
  outcome: 'new_incident' | 'linked_auto' | 'under_review';
  matchedIncident: IIncident | null;
  similarityScore: number;
  distanceMeters: number;
  embedding: number[];
  candidateCount: number;
}

export class DuplicateService {
  private searchRadiusMeters: number;
  private autoLinkThreshold: number;
  private reviewThreshold: number;

  constructor() {
    this.searchRadiusMeters = env.DUPLICATE_SEARCH_RADIUS_METERS || 75;
    this.autoLinkThreshold = env.DUPLICATE_AUTO_LINK_THRESHOLD || 0.88;
    this.reviewThreshold = env.DUPLICATE_REVIEW_THRESHOLD || 0.68;
  }

  /**
   * Evaluates whether a new complaint report is a duplicate of an existing unresolved incident
   */
  async evaluateReport(
    englishDescription: string,
    coordinates: [number, number], // [longitude, latitude]
    complaintType?: string
  ): Promise<IDuplicateEvaluationResult> {
    const [longitude, latitude] = coordinates;

    // 1. Generate dense embedding vector for the standardized description
    const newEmbedding = await embeddingService.generateEmbedding(englishDescription);

    // 2. Query MongoDB for active unresolved incidents within geographic radius
    let nearbyIncidents: IIncident[] = [];
    try {
      nearbyIncidents = await Incident.find({
        canonicalLocation: {
          $nearSphere: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude],
            },
            $maxDistance: this.searchRadiusMeters,
          },
        },
        status: {
          $in: ['Open', 'Assigned', 'InProgress', 'AwaitingVerification', 'Reopened'],
        },
      })
        .select('+descriptionEmbedding')
        .limit(10);
    } catch (err) {
      console.warn('⚠️ Geospatial duplicate query returned error (e.g. index building):', err);
      nearbyIncidents = [];
    }

    if (nearbyIncidents.length === 0) {
      return {
        outcome: 'new_incident',
        matchedIncident: null,
        similarityScore: 0,
        distanceMeters: 0,
        embedding: newEmbedding,
        candidateCount: 0,
      };
    }

    // 3. Compute cosine similarity against candidate incidents
    let bestMatch: IIncident | null = null;
    let highestSimilarity = 0;
    let bestDistance = 0;

    for (const incident of nearbyIncidents) {
      const incidentCoords = {
        latitude: incident.canonicalLocation.coordinates[1],
        longitude: incident.canonicalLocation.coordinates[0],
      };
      const distance = calculateDistanceMeters(
        { latitude, longitude },
        incidentCoords
      );

      let similarity = 0;
      if (incident.descriptionEmbedding && incident.descriptionEmbedding.length > 0) {
        similarity = embeddingService.cosineSimilarity(
          newEmbedding,
          incident.descriptionEmbedding
        );
      } else {
        // If incident embedding is missing, regenerate lazily
        try {
          const generated = await embeddingService.generateEmbedding(
            incident.standardizedDescription
          );
          incident.descriptionEmbedding = generated;
          await incident.save();
          similarity = embeddingService.cosineSimilarity(newEmbedding, generated);
        } catch {
          similarity = 0.5;
        }
      }

      // If category matches, slight boost; if different category, penalize
      if (complaintType && incident.complaintType) {
        if (complaintType === incident.complaintType) {
          similarity = Math.min(1.0, similarity + 0.05);
        } else {
          similarity = Math.max(0.0, similarity - 0.2);
        }
      }

      if (similarity > highestSimilarity) {
        highestSimilarity = similarity;
        bestMatch = incident;
        bestDistance = distance;
      }
    }

    // 4. Apply configurable thresholds
    let outcome: 'new_incident' | 'linked_auto' | 'under_review' = 'new_incident';

    if (highestSimilarity >= this.autoLinkThreshold) {
      outcome = 'linked_auto';
    } else if (highestSimilarity >= this.reviewThreshold) {
      outcome = 'under_review';
    } else {
      outcome = 'new_incident';
    }

    return {
      outcome,
      matchedIncident: outcome !== 'new_incident' ? bestMatch : null,
      similarityScore: highestSimilarity,
      distanceMeters: bestDistance,
      embedding: newEmbedding,
      candidateCount: nearbyIncidents.length,
    };
  }
}

export const duplicateService = new DuplicateService();
