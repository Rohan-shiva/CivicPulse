import { describe, it, expect } from 'vitest';
import { groqService } from '../services/groq.service';
import { embeddingService } from '../services/embedding.service';
import { incidentService } from '../services/incident.service';

describe('AI Complaint Classification & Groq Service', () => {
  it('should accurately classify garbage complaints to SANITATION department', async () => {
    const res = await groqService.analyzeComplaint('There is a huge pile of overflowing garbage on the corner of the road smelling terrible.');
    expect(res.department).toBe('SANITATION');
    expect(res.complaintType).toBe('GARBAGE_DUMP');
    expect(['Medium', 'High']).toContain(res.suggestedUrgency);
    expect(res.safetyRisk).toBeDefined();
    expect(res.recommendedAction).toBeDefined();
  });

  it('should classify sewage / open manhole as Critical urgency to WATER or DRAINAGE department', async () => {
    const res = await groqService.analyzeComplaint('Deep open manhole without cover on the main road with black sewage spilling out.');
    expect(['WATER', 'DRAINAGE', 'SANITATION']).toContain(res.department);
    expect(res.complaintType).toBe('SEWAGE_OVERFLOW');
    expect(res.suggestedUrgency).toBe('Critical');
  });

  it('should classify broken streetlights to ELECTRICAL department', async () => {
    const res = await groqService.analyzeComplaint('Streetlights are completely dead for the past three days making the whole street pitch dark.');
    expect(res.department).toBe('ELECTRICAL');
    expect(res.complaintType).toBe('STREETLIGHT');
  });
});

describe('Vector Embeddings & Cosine Similarity', () => {
  it('cosineSimilarity should return 1.0 for identical vectors', () => {
    const vec1 = [0.1, 0.5, 0.8, -0.2];
    const vec2 = [0.1, 0.5, 0.8, -0.2];
    expect(embeddingService.cosineSimilarity(vec1, vec2)).toBe(1);
  });

  it('cosineSimilarity should return near 0 for orthogonal vectors', () => {
    const vec1 = [1, 0, 0];
    const vec2 = [0, 1, 0];
    expect(embeddingService.cosineSimilarity(vec1, vec2)).toBe(0);
  });
});

describe('Incident & Complaint ID Generation', () => {
  it('generateComplaintId should produce formatted CP-YYYY-XXXXXX string', () => {
    const id = incidentService.generateComplaintId();
    expect(id).toMatch(/^CP-\d{4}-[A-F0-9]{6}$/);
  });

  it('generateIncidentId should produce formatted INC-YYYY-XXXXXX string', () => {
    const id = incidentService.generateIncidentId();
    expect(id).toMatch(/^INC-\d{4}-[A-F0-9]{6}$/);
  });

  it('getPriorityRank should accurately return numerical tier 1 to 4', () => {
    expect(incidentService.getPriorityRank('Critical')).toBe(4);
    expect(incidentService.getPriorityRank('High')).toBe(3);
    expect(incidentService.getPriorityRank('Medium')).toBe(2);
    expect(incidentService.getPriorityRank('Low')).toBe(1);
  });
});
