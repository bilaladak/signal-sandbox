import { Controller, Get, Logger } from '@nestjs/common';
import { QueueService } from './queue.service';

@Controller('queue')
export class QueueController {
  private readonly logger = new Logger(QueueController.name);

  constructor(private readonly queueService: QueueService) {}

  /**
   * GET /queue/stats
   * Returns waiting/active/completed/failed/delayed counts for all queues.
   * Protected by JWT (global guard applied via AuthModule).
   */
  @Get('stats')
  async getStats() {
    this.logger.log('Fetching queue statistics');
    const stats = await this.queueService.getQueueStats();
    return { queues: stats };
  }
}
