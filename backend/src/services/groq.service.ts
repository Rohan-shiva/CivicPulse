import Groq from 'groq-sdk';
import { z } from 'zod';
import { env } from '../config/env';
import { Department, IssueCategory } from '../models';

export const groqExtractionSchema = z.object({
  complaintType: z.string(),
  department: z.string(),
  suggestedUrgency: z.enum(['Critical', 'High', 'Medium', 'Low']),
  safetyRisk: z.string(),
  standardizedSummary: z.string(),
  reasonForUrgency: z.string(),
  recommendedAction: z.string(),
  confidence: z.number().min(0).max(1).default(0.85),
});

export type IGroqExtraction = z.infer<typeof groqExtractionSchema> & {
  modelIdentifier: string;
};

export class GroqService {
  private groqClient: Groq | null = null;
  private model: string;

  constructor() {
    this.model = env.GROQ_MODEL || 'openai/gpt-oss-120b';
    if (env.GROQ_API_KEY && env.GROQ_API_KEY.trim().length > 0) {
      this.groqClient = new Groq({ apiKey: env.GROQ_API_KEY });
    } else {
      console.warn('⚠️ GROQ_API_KEY not configured. Falling back to deterministic taxonomy classification for unconfigured environment.');
    }
  }

  isConfigured(): boolean {
    return Boolean(this.groqClient && env.GROQ_API_KEY);
  }

  /**
   * Analyzes complaint description using Groq LLM or deterministic fallback
   */
  async analyzeComplaint(
    description: string,
    existingTaxonomy?: { departments: string[]; categories: string[] }
  ): Promise<IGroqExtraction> {
    if (!description || description.trim().length === 0) {
      throw new Error('Complaint description cannot be empty for analysis');
    }

    // 1. If Groq API Key is present, call Groq API
    if (this.isConfigured() && this.groqClient) {
      try {
        return await this.callGroqLlm(description, existingTaxonomy);
      } catch (error) {
        console.error('❌ Groq LLM call failed. Falling back to rule-based classifier:', error);
      }
    }

    // 2. Deterministic Rule-Based Classifier Fallback
    return this.ruleBasedClassifier(description);
  }

  private async callGroqLlm(
    description: string,
    taxonomy?: { departments: string[]; categories: string[] }
  ): Promise<IGroqExtraction> {
    const deptList = taxonomy?.departments?.join(', ') || 'ROADS, SANITATION, ELECTRICAL, WATER, DRAINAGE, TRAFFIC';
    const catList = taxonomy?.categories?.join(', ') || 'POTHOLE, ROAD_DAMAGE, GARBAGE_DUMP, STREETLIGHT, WATER_LEAK, SEWAGE_OVERFLOW, BLOCKED_DRAIN, TRAFFIC_SIGNAL';

    const systemPrompt = `You are an expert municipal civic operations AI for CivicPulse.
Analyze the citizen's civic issue report and extract structured operational metadata.
You MUST output valid JSON matching this exact structure:
{
  "complaintType": "<Choose best matching category from: ${catList}>",
  "department": "<Choose responsible department code from: ${deptList}>",
  "suggestedUrgency": "<'Critical' | 'High' | 'Medium' | 'Low'>",
  "safetyRisk": "<Brief description of public safety hazard>",
  "standardizedSummary": "<Clear, concise English summary of the issue>",
  "reasonForUrgency": "<Detailed rationale for the chosen urgency level>",
  "recommendedAction": "<Immediate municipal field action required>",
  "confidence": <float between 0.0 and 1.0>
}
Urgency Guidelines:
- Critical: Imminent danger to human life (open deep manholes, active high-voltage wires, collapsed bridges, major gas/chemical hazard, dead signal at highway).
- High: Severe traffic hazard, bursting water main, flooded major arterial road, deep potholes on highway.
- Medium: Standard pothole, overflowing community garbage bin, broken streetlight on residential lane.
- Low: Cosmetic civic issues, fading road paint, minor garden waste.`;

    const completion = await this.groqClient!.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Citizen Complaint Description:\n"""${description}"""` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      throw new Error('Groq returned an empty response');
    }

    const parsedJson = JSON.parse(rawContent);
    const validated = groqExtractionSchema.parse(parsedJson);

    return {
      ...validated,
      modelIdentifier: this.model,
    };
  }

  /**
   * Deterministic keyword classifier used when Groq credentials are not yet entered
   */
  private ruleBasedClassifier(description: string): IGroqExtraction {
    const lower = description.toLowerCase();

    if (lower.includes('manhole') || lower.includes('sewer') || lower.includes('sewage')) {
      return {
        complaintType: 'SEWAGE_OVERFLOW',
        department: 'WATER',
        suggestedUrgency: 'Critical',
        safetyRisk: 'Hazardous biohazard and severe risk of fall injury',
        standardizedSummary: description,
        reasonForUrgency: 'Open or overflowing sewage poses severe biological and road hazard',
        recommendedAction: 'Dispatch emergency sewage clearance suction unit and cordoning team',
        confidence: 0.88,
        modelIdentifier: 'deterministic-taxonomy-engine (Groq unconfigured)',
      };
    }

    if (lower.includes('water') || lower.includes('pipe') || lower.includes('leak')) {
      return {
        complaintType: 'WATER_LEAK',
        department: 'WATER',
        suggestedUrgency: 'High',
        safetyRisk: 'Water wastage and pavement erosion',
        standardizedSummary: description,
        reasonForUrgency: 'Active pipeline burst requires immediate valve isolation',
        recommendedAction: 'Dispatch water pipeline repair crew with replacement couplings',
        confidence: 0.85,
        modelIdentifier: 'deterministic-taxonomy-engine (Groq unconfigured)',
      };
    }

    if (lower.includes('light') || lower.includes('dark') || lower.includes('lamp') || lower.includes('pole') || lower.includes('electric')) {
      return {
        complaintType: 'STREETLIGHT',
        department: 'ELECTRICAL',
        suggestedUrgency: 'Medium',
        safetyRisk: 'Poor night visibility increasing accident risk',
        standardizedSummary: description,
        reasonForUrgency: 'Residential darkness poses safety risk at night',
        recommendedAction: 'Dispatch electrical line technician to test circuit and replace luminaire',
        confidence: 0.84,
        modelIdentifier: 'deterministic-taxonomy-engine (Groq unconfigured)',
      };
    }

    if (lower.includes('garbage') || lower.includes('trash') || lower.includes('waste') || lower.includes('dump') || lower.includes('bin')) {
      return {
        complaintType: 'GARBAGE_DUMP',
        department: 'SANITATION',
        suggestedUrgency: 'Medium',
        safetyRisk: 'Pest infestation and foul odor',
        standardizedSummary: description,
        reasonForUrgency: 'Accumulated municipal waste attracts disease vectors',
        recommendedAction: 'Dispatch compacting garbage truck and sanitation sweepers',
        confidence: 0.9,
        modelIdentifier: 'deterministic-taxonomy-engine (Groq unconfigured)',
      };
    }

    if (lower.includes('signal') || lower.includes('traffic')) {
      return {
        complaintType: 'TRAFFIC_SIGNAL',
        department: 'TRAFFIC',
        suggestedUrgency: 'Critical',
        safetyRisk: 'High collision risk at intersection',
        standardizedSummary: description,
        reasonForUrgency: 'Non-operational traffic signal can cause vehicular collisions',
        recommendedAction: 'Deploy traffic police marshal and emergency signal technician',
        confidence: 0.89,
        modelIdentifier: 'deterministic-taxonomy-engine (Groq unconfigured)',
      };
    }

    if (lower.includes('drain') || lower.includes('flood') || lower.includes('clog')) {
      return {
        complaintType: 'BLOCKED_DRAIN',
        department: 'DRAINAGE',
        suggestedUrgency: 'High',
        safetyRisk: 'Waterlogging and road damage',
        standardizedSummary: description,
        reasonForUrgency: 'Blocked drain causes localized flooding during rainfall',
        recommendedAction: 'Dispatch drain desilting team and backhoe loader',
        confidence: 0.86,
        modelIdentifier: 'deterministic-taxonomy-engine (Groq unconfigured)',
      };
    }

    // Default to Pothole / Road damage
    return {
      complaintType: 'POTHOLE',
      department: 'ROADS',
      suggestedUrgency: lower.includes('deep') || lower.includes('accident') ? 'High' : 'Medium',
      safetyRisk: 'Vehicular damage and two-wheeler skid hazard',
      standardizedSummary: description,
      reasonForUrgency: 'Road defects cause damage to vehicles and danger to cyclists',
      recommendedAction: 'Dispatch asphalt cold-mix repair team to patch pothole',
      confidence: 0.82,
      modelIdentifier: 'deterministic-taxonomy-engine (Groq unconfigured)',
    };
  }
}

export const groqService = new GroqService();
