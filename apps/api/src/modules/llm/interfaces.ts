// ── LLM Abstraction Layer — Type Definitions ──

export type LlmProvider = 'openai' | 'anthropic';

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmCompletionOptions {
  provider?: LlmProvider;
  model?: string;
  messages: LlmMessage[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  systemPrompt?: string;
}

export interface LlmCompletionResult {
  content: string;
  provider: LlmProvider;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
  cost: number;
}

export interface LlmEmbeddingOptions {
  provider?: LlmProvider;
  model?: string;
  input: string | string[];
}

export interface LlmEmbeddingResult {
  embeddings: number[][];
  provider: LlmProvider;
  model: string;
  usage: {
    totalTokens: number;
  };
  cost: number;
}

export interface LlmProviderConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
  defaultEmbeddingModel?: string;
}

export interface ModelPricing {
  promptPer1kTokens: number;
  completionPer1kTokens: number;
  embeddingPer1kTokens: number;
}

export interface ILlmProvider {
  complete(options: LlmCompletionOptions): Promise<LlmCompletionResult>;
  embed(options: LlmEmbeddingOptions): Promise<LlmEmbeddingResult>;
}
