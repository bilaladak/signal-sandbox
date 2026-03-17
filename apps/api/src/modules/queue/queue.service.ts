import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

interface QueueJobOptions {
  attempts: number;
  backoff: {
    type: 'exponential';
    delay: number;
  };
  removeOnComplete: number;
  removeOnFail: number;
}

export interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  private readonly defaultJobOptions: QueueJobOptions = {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  };

  constructor(
    @InjectQueue('event-processing')
    private readonly eventProcessingQueue: Queue,
    @InjectQueue('embedding-generation')
    private readonly embeddingGenerationQueue: Queue,
    @InjectQueue('asset-linking')
    private readonly assetLinkingQueue: Queue,
    @InjectQueue('graph-update')
    private readonly graphUpdateQueue: Queue,
  ) {}

  async addEventProcessingJob(
    eventId: string,
    orgId: string,
  ): Promise<void> {
    const job = await this.eventProcessingQueue.add(
      'process-event',
      { eventId, orgId },
      this.defaultJobOptions,
    );
    this.logger.log(
      `Added event-processing job ${job.id} for event ${eventId}`,
    );
  }

  async addEmbeddingJob(
    eventId: string,
    orgId: string,
    text: string,
  ): Promise<void> {
    const job = await this.embeddingGenerationQueue.add(
      'generate-embedding',
      { eventId, orgId, text },
      this.defaultJobOptions,
    );
    this.logger.log(
      `Added embedding-generation job ${job.id} for event ${eventId}`,
    );
  }

  async addAssetLinkingJob(
    eventId: string,
    orgId: string,
    text: string,
  ): Promise<void> {
    const job = await this.assetLinkingQueue.add(
      'link-assets',
      { eventId, orgId, text },
      this.defaultJobOptions,
    );
    this.logger.log(
      `Added asset-linking job ${job.id} for event ${eventId}`,
    );
  }

  async addGraphUpdateJob(
    eventId: string,
    orgId: string,
  ): Promise<void> {
    const job = await this.graphUpdateQueue.add(
      'update-graph',
      { eventId, orgId },
      this.defaultJobOptions,
    );
    this.logger.log(
      `Added graph-update job ${job.id} for event ${eventId}`,
    );
  }

  async getQueueStats(): Promise<QueueStats[]> {
    const queues: { name: string; queue: Queue }[] = [
      { name: 'event-processing', queue: this.eventProcessingQueue },
      { name: 'embedding-generation', queue: this.embeddingGenerationQueue },
      { name: 'asset-linking', queue: this.assetLinkingQueue },
      { name: 'graph-update', queue: this.graphUpdateQueue },
    ];

    const stats: QueueStats[] = [];

    for (const { name, queue } of queues) {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
      ]);

      stats.push({ name, waiting, active, completed, failed, delayed });
    }

    return stats;
  }
}
