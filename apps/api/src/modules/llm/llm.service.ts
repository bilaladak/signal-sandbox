// ── LLM Service — Provider-agnostic routing with fallback ──

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  ILlmProvider,
  LlmProvider,
  LlmCompletionOptions,
  LlmCompletionResult,
  LlmEmbeddingOptions,
  LlmEmbeddingResult,
} from './interfaces';
import { OpenAiProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { ModelRunService } from './model-run.service';

/** Default provider for cost-efficient completions */
const DEFAULT_COMPLETION_PROVIDER: LlmProvider = 'openai';

/** Fallback order: if the primary provider fails, try the other */
const FALLBACK_ORDER: Record<LlmProvider, LlmProvider> = {
  openai: 'anthropic',
  anthropic: 'openai',
};

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  /** Lazy-initialized provider instances */
  private providers: Partial<Record<LlmProvider, ILlmProvider>> = {};

  constructor(
    private readonly config: ConfigService,
    private readonly modelRunService: ModelRunService,
  ) {}

  // ── Completions ──

  async complete(options: LlmCompletionOptions): Promise<LlmCompletionResult> {
    const primaryProvider = options.provider ?? DEFAULT_COMPLETION_PROVIDER;
    const fallbackProvider = FALLBACK_ORDER[primaryProvider];

    // Try primary provider
    try {
      const provider = this.getProvider(primaryProvider);
      const result = await provider.complete(options);

      // Record run asynchronously (fire-and-forget, non-blocking)
      this.recordCompletionRun(result, 'completion').catch(() => {});

      return result;
    } catch (primaryError) {
      const primaryMessage =
        primaryError instanceof Error
          ? primaryError.message
          : 'Unknown error';
      this.logger.warn(
        `Primary provider "${primaryProvider}" failed: ${primaryMessage}. Attempting fallback to "${fallbackProvider}"...`,
      );

      // Try fallback provider
      try {
        const fallback = this.getProvider(fallbackProvider);
        const result = await fallback.complete({
          ...options,
          // Clear model override so fallback uses its own default
          model: undefined,
        });

        this.recordCompletionRun(result, 'completion-fallback').catch(
          () => {},
        );

        this.logger.log(
          `Fallback to "${fallbackProvider}" succeeded for completion`,
        );
        return result;
      } catch (fallbackError) {
        const fallbackMessage =
          fallbackError instanceof Error
            ? fallbackError.message
            : 'Unknown error';
        this.logger.error(
          `Both providers failed. Primary: ${primaryMessage}. Fallback: ${fallbackMessage}`,
        );

        // Re-throw the original primary error since both failed
        throw primaryError;
      }
    }
  }

  // ── Embeddings ──

  async embed(options: LlmEmbeddingOptions): Promise<LlmEmbeddingResult> {
    // Always use OpenAI for embeddings — best quality/cost ratio
    const provider = this.getProvider('openai');

    const result = await provider.embed(options);

    this.recordEmbeddingRun(result).catch(() => {});

    return result;
  }

  // ── Provider Info ──

  /**
   * Returns providers that have API keys configured.
   */
  getAvailableProviders(): LlmProvider[] {
    const available: LlmProvider[] = [];

    if (this.config.get<string>('OPENAI_API_KEY')) {
      available.push('openai');
    }
    if (this.config.get<string>('ANTHROPIC_API_KEY')) {
      available.push('anthropic');
    }

    return available;
  }

  // ── Private Helpers ──

  /**
   * Lazy-initialize a provider. Only creates the instance on first use.
   * Throws if the required API key is not configured.
   */
  private getProvider(name: LlmProvider): ILlmProvider {
    if (this.providers[name]) {
      return this.providers[name]!;
    }

    switch (name) {
      case 'openai': {
        const apiKey = this.config.get<string>('OPENAI_API_KEY');
        if (!apiKey) {
          throw new Error(
            'OPENAI_API_KEY is not configured. Cannot initialize OpenAI provider.',
          );
        }
        const provider = new OpenAiProvider({
          apiKey,
          baseUrl: this.config.get<string>('OPENAI_BASE_URL'),
          defaultModel: this.config.get<string>('OPENAI_DEFAULT_MODEL'),
          defaultEmbeddingModel: this.config.get<string>(
            'OPENAI_DEFAULT_EMBEDDING_MODEL',
          ),
        });
        this.providers.openai = provider;
        this.logger.log('OpenAI provider initialized');
        return provider;
      }

      case 'anthropic': {
        const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
        if (!apiKey) {
          throw new Error(
            'ANTHROPIC_API_KEY is not configured. Cannot initialize Anthropic provider.',
          );
        }
        const provider = new AnthropicProvider({
          apiKey,
          baseUrl: this.config.get<string>('ANTHROPIC_BASE_URL'),
          defaultModel: this.config.get<string>('ANTHROPIC_DEFAULT_MODEL'),
        });
        this.providers.anthropic = provider;
        this.logger.log('Anthropic provider initialized');
        return provider;
      }

      default:
        throw new Error(`Unknown LLM provider: ${name}`);
    }
  }

  /**
   * Fire-and-forget recording of a completion run.
   * The orgId is not available at the LlmService level,
   * so we use a placeholder that callers can override by
   * calling modelRunService directly.
   */
  private async recordCompletionRun(
    result: LlmCompletionResult,
    stage: string,
  ): Promise<void> {
    try {
      await this.modelRunService.recordSuccess('system', {
        pipelineStage: stage,
        model: result.model,
        inputTokens: result.usage.promptTokens,
        outputTokens: result.usage.completionTokens,
        totalCost: result.cost,
        latencyMs: result.latencyMs,
      });
    } catch {
      // Non-critical — already logged in ModelRunService
    }
  }

  private async recordEmbeddingRun(
    result: LlmEmbeddingResult,
  ): Promise<void> {
    try {
      await this.modelRunService.recordSuccess('system', {
        pipelineStage: 'embedding',
        model: result.model,
        inputTokens: result.usage.totalTokens,
        outputTokens: 0,
        totalCost: result.cost,
        latencyMs: 0,
      });
    } catch {
      // Non-critical — already logged in ModelRunService
    }
  }
}
