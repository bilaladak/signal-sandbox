// ── LLM Module — Global, provider-agnostic LLM abstraction ──

import { Module, Global } from '@nestjs/common';
import { LlmService } from './llm.service';
import { ModelRunService } from './model-run.service';
import { ModelRunRepository } from './model-run.repository';

@Global()
@Module({
  providers: [LlmService, ModelRunService, ModelRunRepository],
  exports: [LlmService, ModelRunService],
})
export class LlmModule {}
