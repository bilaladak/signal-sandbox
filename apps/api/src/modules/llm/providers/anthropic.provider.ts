// ── Anthropic Provider — Raw HTTP via fetch() ──

import { Logger, HttpException, HttpStatus } from '@nestjs/common';
import type {
  ILlmProvider,
  LlmProviderConfig,
  LlmCompletionOptions,
  LlmCompletionResult,
  LlmEmbeddingOptions,
  LlmEmbeddingResult,
  LlmMessage,
} from '../interfaces';
import { calculateCost } from '../pricing';

const DEFAULT_BASE_URL = 'https://api.anthropic.com';
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const ANTHROPIC_VERSION = '2023-06-01';

interface AnthropicMessageResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{
    type: 'text';
    text: string;
  }>;
  model: string;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface AnthropicErrorResponse {
  type: 'error';
  error?: {
    type: string;
    message: string;
  };
}

export class AnthropicProvider implements ILlmProvider {
  private readonly logger = new Logger(AnthropicProvider.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string;

  constructor(config: LlmProviderConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.defaultModel = config.defaultModel ?? DEFAULT_MODEL;
  }

  async complete(options: LlmCompletionOptions): Promise<LlmCompletionResult> {
    const model = options.model ?? this.defaultModel;
    const startTime = Date.now();

    // Anthropic uses a separate `system` field, not in the messages array
    const { system, messages } = this.buildMessages(
      options.messages,
      options.systemPrompt,
    );

    const body: Record<string, unknown> = {
      model,
      messages,
      max_tokens: options.maxTokens ?? 2048,
      temperature: options.temperature ?? 0.7,
    };

    if (system) {
      body.system = system;
    }

    try {
      const response = await fetch(`${this.baseUrl}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as AnthropicErrorResponse;
        const errorMessage =
          errorBody.error?.message ??
          `Anthropic API error: ${response.status}`;
        this.logger.error(
          `Anthropic completion failed: ${response.status} — ${errorMessage}`,
        );
        throw new HttpException(
          `Anthropic completion failed: ${errorMessage}`,
          this.mapHttpStatus(response.status),
        );
      }

      const data = (await response.json()) as AnthropicMessageResponse;
      const latencyMs = Date.now() - startTime;

      // Extract text from content blocks
      const content = data.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('');

      const promptTokens = data.usage?.input_tokens ?? 0;
      const completionTokens = data.usage?.output_tokens ?? 0;
      const totalTokens = promptTokens + completionTokens;

      const cost = calculateCost(model, promptTokens, completionTokens);

      this.logger.debug(
        `Anthropic completion: model=${model} tokens=${totalTokens} cost=$${cost.toFixed(6)} latency=${latencyMs}ms`,
      );

      return {
        content,
        provider: 'anthropic',
        model,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens,
        },
        latencyMs,
        cost,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      const message =
        error instanceof Error ? error.message : 'Unknown Anthropic error';
      this.logger.error(`Anthropic completion error: ${message}`);
      throw new HttpException(
        `Anthropic provider error: ${message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async embed(_options: LlmEmbeddingOptions): Promise<LlmEmbeddingResult> {
    throw new HttpException(
      'Anthropic does not support embeddings directly, use OpenAI',
      HttpStatus.NOT_IMPLEMENTED,
    );
  }

  /**
   * Separates system messages from user/assistant messages.
   * Anthropic API requires system prompt in a separate `system` field.
   */
  private buildMessages(
    messages: LlmMessage[],
    systemPrompt?: string,
  ): {
    system: string | undefined;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  } {
    const systemParts: string[] = [];

    if (systemPrompt) {
      systemParts.push(systemPrompt);
    }

    const filtered: Array<{ role: 'user' | 'assistant'; content: string }> =
      [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemParts.push(msg.content);
      } else {
        filtered.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      }
    }

    return {
      system: systemParts.length > 0 ? systemParts.join('\n\n') : undefined,
      messages: filtered,
    };
  }

  private mapHttpStatus(status: number): HttpStatus {
    if (status === 401) return HttpStatus.UNAUTHORIZED;
    if (status === 429) return HttpStatus.TOO_MANY_REQUESTS;
    if (status >= 500) return HttpStatus.BAD_GATEWAY;
    return HttpStatus.BAD_REQUEST;
  }
}
