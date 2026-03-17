import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../../../database/database.module';
import { LlmService } from '../../llm/llm.service';
import { DuplicateDetectionService } from '../../../ai/pipelines/duplicate-detection.service';

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
    private readonly llm: LlmService,
    private readonly duplicateDetection: DuplicateDetectionService,
  ) {
    super();
  }

  async process(job: Job<EmbeddingJobData>): Promise<void> {
    const { eventId, orgId, text } = job.data;
    this.logger.log(
      `Generating embedding for event ${eventId} (text length: ${text.length})`,
    );

    try {
      const result = await this.llm.embed({
        provider: 'openai',
        input: text,
      });

      const embedding = result.embeddings[0];
      const embeddingString = `[${embedding.join(',')}]`;

      await this.pool.query(
        `UPDATE events SET embedding = $2 WHERE id = $1`,
        [eventId, embeddingString],
      );

      this.logger.log(
        `Embedding generated and stored for event ${eventId} — ${embedding.length}d, cost: $${result.cost.toFixed(6)}, org: ${orgId}`,
      );

      // Run duplicate detection after embedding is stored
      const dupResult = await this.duplicateDetection.checkDuplicate(
        eventId,
        embedding,
      );

      if (dupResult.isDuplicate && dupResult.nearestEventId) {
        this.logger.warn(
          `Event ${eventId} flagged as near-duplicate of ${dupResult.nearestEventId} (similarity: ${dupResult.similarity?.toFixed(3)})`,
        );
        await this.duplicateDetection.markAsDuplicate(
          eventId,
          dupResult.nearestEventId,
          dupResult.similarity!,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to generate embedding for event ${eventId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
