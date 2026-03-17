// ── Pipeline Module ──
// Registers all AI processing pipeline services for injection throughout the app.
// Exported so QueueModule and other consumers can inject individual pipelines.

import { Module } from '@nestjs/common';
import { LlmModule } from '../../modules/llm/llm.module';
import { ClassificationPipeline } from './classification.pipeline';
import { EventExtractionPipeline } from './event-extraction.pipeline';
import { EntityLinkingPipeline } from './entity-linking.pipeline';
import { DuplicateDetectionService } from './duplicate-detection.service';

@Module({
  imports: [LlmModule],
  providers: [
    ClassificationPipeline,
    EventExtractionPipeline,
    EntityLinkingPipeline,
    DuplicateDetectionService,
  ],
  exports: [
    ClassificationPipeline,
    EventExtractionPipeline,
    EntityLinkingPipeline,
    DuplicateDetectionService,
  ],
})
export class PipelineModule {}
