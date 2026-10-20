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
      console.warn('⚠️ Could not load remote sentence embedding model, using semantic fallback vector:', (error as any)?.message);
      return null;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Generates a 384-dimensional dense vector embedding from text.
   * If the neural pipeline is unavailable, falls back to deterministic term-hash vector.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty for embedding generation');
    }

    try {
      const extractor = await this.getPipeline();
      if (extractor) {
        const output = await extractor(text.trim(), {
          pooling: 'mean',
          normalize: true,
        });

        // Convert Float32Array to standard JavaScript array of numbers
        return Array.from(output.data as Float32Array);
      }
    } catch (err) {
      console.warn('⚠️ Transformer extraction failed, falling back to deterministic vector:', err);
    }

    return this.generateFallbackVector(text.trim());
  }

  /**
   * Deterministic 384-dimensional semantic term-hash vector
   * Preserves cosine similarity for identical or overlapping vocabulary
   */
  private generateFallbackVector(text: string): number[] {
    const vector = new Array<number>(384).fill(0);
    const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      // 1-gram hash
      let h1 = 5381;
      for (let j = 0; j < word.length; j++) {
        h1 = ((h1 << 5) + h1 + word.charCodeAt(j)) >>> 0;
      }
      vector[h1 % 384] += 1.0;

      // 2-gram bigram hash
      if (i < words.length - 1) {
        const bigram = `${word}_${words[i + 1]}`;
        let h2 = 5381;
        for (let j = 0; j < bigram.length; j++) {
          h2 = ((h2 << 5) + h2 + bigram.charCodeAt(j)) >>> 0;
        }
        vector[h2 % 384] += 1.5;
      }
    }

    // Normalize to unit vector
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (norm > 0) {
      for (let i = 0; i < 384; i++) {
        vector[i] = Number((vector[i] / norm).toFixed(6));
      }
    }
    return vector;
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
