import { env } from '../config/env';

export class EmbeddingService {
  private pipelineInstance: any = null;
  private isInitializing: boolean = false;
  private modelName: string;

  constructor() {
    this.modelName = env.EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2';
  }

  /**
   * Lazily loads the Xenova embedding model pipeline
   */
  private async getPipeline(): Promise<any> {
    if (this.pipelineInstance) {
      return this.pipelineInstance;
    }

    if (this.isInitializing) {
      // Wait for ongoing initialization
      while (this.isInitializing) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return this.pipelineInstance;
    }

    this.isInitializing = true;
    try {
      // Dynamic import to keep startup fast and resilient
      const { pipeline } = await import('@xenova/transformers');
      this.pipelineInstance = await pipeline('feature-extraction', this.modelName, {
        quantized: true,
      });
      console.log(`🧠 Loaded sentence embedding model: ${this.modelName}`);
      return this.pipelineInstance;
    } catch (error) {
      console.error('❌ Failed to load embedding model:', error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Generates a 384-dimensional dense vector embedding from text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty for embedding generation');
    }

    const extractor = await this.getPipeline();
    const output = await extractor(text.trim(), {
      pooling: 'mean',
      normalize: true,
    });

    // Convert Float32Array to standard JavaScript array of numbers
    return Array.from(output.data as Float32Array);
  }

  /**
   * Calculates cosine similarity between two normalized embedding vectors
   * Range: -1.0 to 1.0 (for normalized vectors, dot product = cosine similarity)
   */
  cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length !== vecB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;

    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    return Number(similarity.toFixed(4));
  }
}

export const embeddingService = new EmbeddingService();
