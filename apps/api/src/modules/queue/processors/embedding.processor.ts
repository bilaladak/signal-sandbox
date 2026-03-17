import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../../../database/database.module';

interface EmbeddingJobData {
  eventId: string;
  orgId: string;
  text: string;
}

@Processor('embedding-generation')
export class EmbeddingProcessor extends WorkerHost {
  private readonly logger = new Logger(EmbeddingProcessor.name);

  constructor(
    @Inject(DATABASE_POOL) private readonly pool: Pool,
  ) {
    super();
  }

  async process(job: Job<EmbeddingJobData>): Promise<void> {
    const { eventId, text } = job.data;
    this.logger.log(
      `Generating embedding for event ${eventId} (text length: ${text.length})`,
    );

    try {
      // TODO: Replace mock embedding with LlmService.embed() when integrated
      const embedding = this.generateMockEmbedding();

      // Format embedding as pgvector string: [0.1,0.2,...]
      const embeddingString = `[${embedding.join(',')}]`;

      // Update events table with the generated embedding
      await this.pool.query(
        `UPDATE events SET embedding = $2 WHERE id = $1`,
        [eventId, embeddingString],
      );

      this.logger.log(
        `Embedding generated and stored for event ${eventId} (${embedding.length} dimensions)`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to generate embedding for event ${eventId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error; // Re-throw to let BullMQ handle retries
    }
  }

  /**
   * Generate a mock embedding vector of 1536 dimensions.
   * Each value is a random float between -1 and 1.
   *
   * TODO: Replace mock embedding with LlmService.embed() when integrated
   */
  private generateMockEmbedding(): number[] {
    const dimensions = 1536;
    const embedding: number[] = new Array(dimensions);

    for (let i = 0; i < dimensions; i++) {
      // Generate random float between -1 and 1, rounded to 6 decimal places
      embedding[i] = Math.round((Math.random() * 2 - 1) * 1e6) / 1e6;
    }

    return embedding;
  }
}
