import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../../../database/database.module';
import { QueueService } from '../queue.service';

interface EventProcessingJobData {
  eventId: string;
  orgId: string;
}

@Processor('event-processing')
export class EventProcessor extends WorkerHost {
  private readonly logger = new Logger(EventProcessor.name);

  constructor(
    @Inject(DATABASE_POOL) private readonly pool: Pool,
    private readonly queueService: QueueService,
  ) {
    super();
  }

  async process(job: Job<EventProcessingJobData>): Promise<void> {
    const { eventId, orgId } = job.data;
    this.logger.log(`Processing event ${eventId} for org ${orgId}`);

    try {
      // 1. Fetch event from DB
      const eventResult = await this.pool.query(
        `SELECT id, title, summary, category, severity, embedding, published_at
         FROM events
         WHERE id = $1`,
        [eventId],
      );

      if (eventResult.rows.length === 0) {
        this.logger.warn(`Event ${eventId} not found, skipping`);
        return;
      }

      const event = eventResult.rows[0];
      const eventText = `${event.title} ${event.summary || ''}`.trim();

      // 2. If event has no embedding, add embedding job
      if (!event.embedding) {
        this.logger.log(`Event ${eventId} has no embedding, queueing generation`);
        await this.queueService.addEmbeddingJob(eventId, orgId, eventText);
      }

      // 3. Add asset-linking job with event title + summary
      this.logger.log(`Queueing asset-linking for event ${eventId}`);
      await this.queueService.addAssetLinkingJob(eventId, orgId, eventText);

      // 4. Add graph-update job
      this.logger.log(`Queueing graph-update for event ${eventId}`);
      await this.queueService.addGraphUpdateJob(eventId, orgId);

      this.logger.log(`Event ${eventId} processing pipeline initiated`);
    } catch (error) {
      this.logger.error(
        `Failed to process event ${eventId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error; // Re-throw to let BullMQ handle retries
    }
  }
}
