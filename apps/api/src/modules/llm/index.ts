// ── LLM Module — Barrel Export ──

export { LlmModule } from './llm.module';
export { LlmService } from './llm.service';
export { ModelRunService } from './model-run.service';
export { ModelRunRepository } from './model-run.repository';

export type {
  LlmProvider,
  LlmMessage,
  LlmCompletionOptions,
  LlmCompletionResult,
  LlmEmbeddingOptions,
  LlmEmbeddingResult,
  LlmProviderConfig,
  ModelPricing,
  ILlmProvider,
} from './interfaces';

export { MODEL_PRICING, calculateCost, calculateEmbeddingCost } from './pricing';
