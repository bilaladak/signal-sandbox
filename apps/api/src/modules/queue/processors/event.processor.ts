import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../../../database/database.module';
import { QueueService } from '../queue.service';
import { ClassificationPipeline } from '../../../ai/pipelines/classification.pipeline';
import { EventExtractionPipeline } from '../../../ai/pipelines/event-extraction.pipeline';
import type { PipelineContext } from '../../../ai/pipelines/pipeline.types';
import { v4 as uuidv4 } from 'uuid';

interface EventProcessingJobData {
  eventId: string;
  orgId: string;
}

interface DbEvent {
  id: string;
  title: string;
  summary: string | null;
  raw_content: string | null;
  category: string;
  severity: string;
  embedding: string | null;
}

@Processor('event-processing')
export class EventProcessor extends WorkerHost {
  private readonly logger = new Logger(EventProcessor.name);

  constructor(
    @Inject(DATABASE_POOL) private readonly pool: Pool,
    private readonly queueService: QueueService,
    private readonly classification: ClassificationPipeline,
    private readonly eventExtraction: EventExtractionPipeline,
  ) {
    super();
  }

  async process(job: Job<EventProcessingJobData>): Promise<void> {
    const { eventId, orgId } = job.data;
    this.logger.log(`Processing event ${eventId} for org ${orgId}`);

    const ctx: PipelineContext = {
      orgId,
      traceId: uuidv4(),
      stage: 'event-processing',
    };

    try {
      // 1. Fetch event from DB
      const { rows } = await this.pool.query<DbEvent>(
        `SELECT id, title, summary, raw_content, category, severity, embedding
         FROM events
         WHERE id = $1`,
        [eventId],
      );

      if (rows.length === 0) {
        this.logger.warn(`Event ${eventId} not found, skipping`);
        return;
      }

      const event = rows[0];

      // 2. Classification pipeline
      const classification = await this.classification.run(
        {
          title: event.title,
          summary: event.summary ?? undefined,
          body: event.raw_content ?? undefined,
        },
        ctx,
      );

      this.logger.debug(
        `Event ${eventId} classified: ${classification.category} / ${classification.macroMicro} / score=${classification.significanceScore}`,
      );

      // 3. Event extraction pipeline
      const extraction = await this.eventExtraction.run(
        {
          title: event.title,
          summary: event.summary ?? undefined,
          body: event.raw_content ?? undefined,
          category: classification.category,
          macroMicro: classification.macroMicro,
        },
        ctx,
      );

      this.logger.debug(
        `Event ${eventId} extraction: ${extraction.affectedAssets.length} assets, ${extraction.affectedSectors.length} sectors`,
      );

      // 4. Persist pipeline results into metadata JSONB + update category/severity
      const pipelineMetadata = {
        classification,
        extraction: {
          headline: extraction.headline,
          summary: extraction.summary,
          keyEntities: extraction.keyEntities,
          affectedAssets: extraction.affectedAssets,
          affectedSectors: extraction.affectedSectors,
          affectedRegions: extraction.affectedRegions,
          keyRisks: extraction.keyRisks,
          reasoning: extraction.reasoning,
          confidence: extraction.confidence,
        },
        processedAt: new Date().toISOString(),
        traceId: ctx.traceId,
      };

      // Map significance score to severity
      const severity = this.significanceToSeverity(
        classification.significanceScore,
      );

      await this.pool.query(
        `UPDATE events
         SET category = $2,
             severity = $3,
             metadata = metadata || $4::jsonb
         WHERE id = $1`,
        [
          eventId,
          classification.category,
          severity,
          JSON.stringify(pipelineMetadata),
        ],
      );

      // 5. Queue embedding generation if not already present
      const embeddingText = `${extraction.headline} ${extraction.summary}`.trim();
      if (!event.embedding) {
        await this.queueService.addEmbeddingJob(eventId, orgId, embeddingText);
      }

      // 6. Queue asset-linking with extracted asset tickers
      const assetContext = extraction.affectedAssets
        .map((a) => a.ticker)
        .join(' ');
      await this.queueService.addAssetLinkingJob(
        eventId,
        orgId,
        assetContext || `${event.title} ${event.summary || ''}`.trim(),
      );

      // 7. Queue graph update
      await this.queueService.addGraphUpdateJob(eventId, orgId);

      this.logger.log(
        `Event ${eventId} processing complete (trace: ${ctx.traceId})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process event ${eventId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  private significanceToSeverity(score: number): string {
    if (score >= 8) return 'critical';
    if (score >= 6) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  }
}
