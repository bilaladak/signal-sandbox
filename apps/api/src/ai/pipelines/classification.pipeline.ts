// ── Classification Pipeline ──
// Stage: haiku — high-volume, low-complexity
// Determines event category, macro/micro flag, significance score

import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../../modules/llm/llm.service';
import type {
  ClassificationInput,
  ClassificationOutput,
  PipelineContext,
} from './pipeline.types';

const SYSTEM_PROMPT = `You are a senior financial analyst specializing in event classification.
Your job is to categorize financial news events accurately and concisely.
Always respond with valid JSON matching the exact schema provided.
Never add commentary outside the JSON object.`;

function buildUserPrompt(input: ClassificationInput): string {
  return `Classify the following financial event:

TITLE: ${input.title}
${input.summary ? `SUMMARY: ${input.summary}` : ''}
${input.body ? `BODY (first 500 chars): ${input.body.slice(0, 500)}` : ''}

Respond ONLY with a JSON object matching this schema:
{
  "category": one of ["earnings","macro","geopolitical","corporate","regulatory","market_structure","other"],
  "macroMicro": one of ["macro","micro"],
  "timeSensitivity": one of ["immediate","hours","days","weeks"],
  "significanceScore": integer 1-10 (1=noise, 10=market-moving),
  "reasoning": "one sentence explaining the classification",
  "confidence": float 0.0-1.0
}

Rules:
- macro = affects broad markets, economies, sectors (e.g. rate decisions, GDP, geopolitics)
- micro = affects specific company or small group (e.g. earnings, M&A, product launch)
- earnings: company financial results
- macro: central banks, rates, inflation, GDP, employment
- geopolitical: wars, sanctions, elections, trade policy
- corporate: M&A, leadership, restructuring, scandal
- regulatory: laws, compliance, fines, investigations
- market_structure: IPO, index rebalancing, liquidity events`;
}

@Injectable()
export class ClassificationPipeline {
  private readonly logger = new Logger(ClassificationPipeline.name);

  constructor(private readonly llm: LlmService) {}

  async run(
    input: ClassificationInput,
    ctx: PipelineContext,
  ): Promise<ClassificationOutput> {
    const start = Date.now();

    const result = await this.llm.complete({
      provider: 'anthropic',
      model: 'claude-haiku-4-5-20251001',
      messages: [
        { role: 'user', content: buildUserPrompt(input) },
      ],
      systemPrompt: SYSTEM_PROMPT,
      jsonMode: true,
      temperature: 0.1,
      maxTokens: 512,
    });

    const latency = Date.now() - start;
    this.logger.debug(
      `Classification done in ${latency}ms — tokens: ${result.usage.totalTokens} cost: $${result.cost.toFixed(6)}`,
    );

    try {
      const parsed = JSON.parse(result.content) as ClassificationOutput;
      return parsed;
    } catch {
      this.logger.error(
        `Classification JSON parse failed for event "${input.title}": ${result.content.slice(0, 200)}`,
      );
      // Return safe fallback
      return {
        category: 'other',
        macroMicro: 'micro',
        timeSensitivity: 'days',
        significanceScore: 3,
        reasoning: 'Classification parse failed — fallback applied',
        confidence: 0.1,
      };
    }
  }
}
