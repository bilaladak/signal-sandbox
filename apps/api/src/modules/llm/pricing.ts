// ── Model Pricing & Cost Calculation ──

import type { ModelPricing } from './interfaces';

export const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI Chat Models
  'gpt-4o': {
    promptPer1kTokens: 0.0025,
    completionPer1kTokens: 0.01,
    embeddingPer1kTokens: 0,
  },
  'gpt-4o-mini': {
    promptPer1kTokens: 0.00015,
    completionPer1kTokens: 0.0006,
    embeddingPer1kTokens: 0,
  },

  // OpenAI Embedding Models
  'text-embedding-3-small': {
    promptPer1kTokens: 0,
    completionPer1kTokens: 0,
    embeddingPer1kTokens: 0.00002,
  },
  'text-embedding-3-large': {
    promptPer1kTokens: 0,
    completionPer1kTokens: 0,
    embeddingPer1kTokens: 0.00013,
  },

  // Anthropic Chat Models
  'claude-sonnet-4-20250514': {
    promptPer1kTokens: 0.003,
    completionPer1kTokens: 0.015,
    embeddingPer1kTokens: 0,
  },
  'claude-3-haiku-20240307': {
    promptPer1kTokens: 0.00025,
    completionPer1kTokens: 0.00125,
    embeddingPer1kTokens: 0,
  },
};

/**
 * Calculate cost for a chat completion based on model pricing.
 * Returns 0 if the model is not found in the pricing table.
 */
export function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) {
    return 0;
  }

  const promptCost = (promptTokens / 1000) * pricing.promptPer1kTokens;
  const completionCost =
    (completionTokens / 1000) * pricing.completionPer1kTokens;

  return promptCost + completionCost;
}

/**
 * Calculate cost for an embedding call based on model pricing.
 * Returns 0 if the model is not found in the pricing table.
 */
export function calculateEmbeddingCost(
  model: string,
  totalTokens: number,
): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) {
    return 0;
  }

  return (totalTokens / 1000) * pricing.embeddingPer1kTokens;
}
