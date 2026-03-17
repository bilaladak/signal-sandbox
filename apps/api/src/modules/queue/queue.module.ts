import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventProcessor } from './processors/event.processor';
import { EmbeddingProcessor } from './processors/embedding.processor';
import { AssetLinkingProcessor } from './processors/asset-linking.processor';
import { GraphUpdateProcessor } from './processors/graph-update.processor';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';
import { PipelineModule } from '../../ai/pipelines/pipeline.module';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [
    PipelineModule,
    LlmModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD', ''),
        },
      }),
    }),
    BullModule.registerQueue(
      { name: 'event-processing' },
      { name: 'embedding-generation' },
      { name: 'asset-linking' },
      { name: 'graph-update' },
    ),
  ],
  controllers: [QueueController],
  providers: [
    EventProcessor,
    EmbeddingProcessor,
    AssetLinkingProcessor,
    GraphUpdateProcessor,
    QueueService,
  ],
  exports: [QueueService],
})
export class QueueModule {}
