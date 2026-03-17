// ── OpenAI Provider — Raw HTTP via fetch() ──

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
import { calculateCost, calculateEmbeddingCost } from '../pricing';

const DEFAULT_BASE_URL = 'https://api.openai.com';
const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small';

interface OpenAiChatResponse {
  id: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenAiEmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

interface OpenAiErrorResponse {
  error?: {
    message: string;
    type: string;
    code: string;
  };
}

export class OpenAiProvider implements ILlmProvider {
  private readonly logger = new Logger(OpenAiProvider.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly defaultEmbeddingModel: string;

  constructor(config: LlmProviderConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.defaultModel = config.defaultModel ?? DEFAULT_MODEL;
    this.defaultEmbeddingModel =
      config.defaultEmbeddingModel ?? DEFAULT_EMBEDDING_MODEL;
  }

  async complete(options: LlmCompletionOptions): Promise<LlmCompletionResult> {
    const model = options.model ?? this.defaultModel;
    const startTime = Date.now();

    // Build messages array: inject system prompt at the start if provided
    const messages = this.buildMessages(options.messages, options.systemPrompt);

    const body: Record<string, unknown> = {
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
    };

    if (options.jsonMode) {
      body.response_format = { type: 'json_object' };
    }

    try {
      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as OpenAiErrorResponse;
        const errorMessage =
          errorBody.error?.message ?? `OpenAI API error: ${response.status}`;
        this.logger.error(
          `OpenAI completion failed: ${response.status} — ${errorMessage}`,
        );
        throw new HttpException(
          `OpenAI completion failed: ${errorMessage}`,
          this.mapHttpStatus(response.status),
        );
      }

      const data = (await response.json()) as OpenAiChatResponse;
      const latencyMs = Date.now() - startTime;

      const content = data.choices?.[0]?.message?.content ?? '';
      const usage = data.usage ?? {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      };

      const cost = calculateCost(
        model,
        usage.prompt_tokens,
        usage.completion_tokens,
      );

      this.logger.debug(
        `OpenAI completion: model=${model} tokens=${usage.total_tokens} cost=$${cost.toFixed(6)} latency=${latencyMs}ms`,
      );

      return {
        content,
        provider: 'openai',
        model,
        usage: {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
        },
        latencyMs,
        cost,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      const message =
        error instanceof Error ? error.message : 'Unknown OpenAI error';
      this.logger.error(`OpenAI completion error: ${message}`);
      throw new HttpException(
        `OpenAI provider error: ${message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async embed(options: LlmEmbeddingOptions): Promise<LlmEmbeddingResult> {
    const model = options.model ?? this.defaultEmbeddingModel;
    const input = Array.isArray(options.input)
      ? options.input
      : [options.input];

    try {
      const response = await fetch(`${this.baseUrl}/v1/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ model, input }),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as OpenAiErrorResponse;
        const errorMessage =
          errorBody.error?.message ?? `OpenAI API error: ${response.status}`;
        this.logger.error(
          `OpenAI embedding failed: ${response.status} — ${errorMessage}`,
        );
        throw new HttpException(
          `OpenAI embedding failed: ${errorMessage}`,
          this.mapHttpStatus(response.status),
        );
      }

      const data = (await response.json()) as OpenAiEmbeddingResponse;

      const embeddings = data.data
        .sort((a, b) => a.index - b.index)
        .map((d) => d.embedding);

      const totalTokens = data.usage?.total_tokens ?? 0;
      const cost = calculateEmbeddingCost(model, totalTokens);

      this.logger.debug(
        `OpenAI embedding: model=${model} tokens=${totalTokens} cost=$${cost.toFixed(6)}`,
      );

      return {
        embeddings,
        provider: 'openai',
        model,
        usage: { totalTokens },
        cost,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      const message =
        error instanceof Error ? error.message : 'Unknown OpenAI error';
      this.logger.error(`OpenAI embedding error: ${message}`);
      throw new HttpException(
        `OpenAI embedding error: ${message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  private buildMessages(
    messages: LlmMessage[],
    systemPrompt?: string,
  ): Array<{ role: string; content: string }> {
    const result: Array<{ role: string; content: string }> = [];

    if (systemPrompt) {
      result.push({ role: 'system', content: systemPrompt });
    }

    for (const msg of messages) {
      // Skip system messages from the array if we already injected systemPrompt
      if (msg.role === 'system' && systemPrompt) {
        continue;
      }
      result.push({ role: msg.role, content: msg.content });
    }

    return result;
  }

  private mapHttpStatus(status: number): HttpStatus {
    if (status === 401) return HttpStatus.UNAUTHORIZED;
    if (status === 429) return HttpStatus.TOO_MANY_REQUESTS;
    if (status >= 500) return HttpStatus.BAD_GATEWAY;
    return HttpStatus.BAD_REQUEST;
  }
}
