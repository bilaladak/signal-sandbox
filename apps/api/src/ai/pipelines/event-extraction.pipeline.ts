// ── Event Extraction Pipeline ──
// Stage: haiku — high-volume, structured extraction
// Extracts structured event data: headline, summary, affected assets/sectors/regions

import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../../modules/llm/llm.service';
import type {
  EventExtractionInput,
  EventExtractionOutput,
  PipelineContext,
} from './pipeline.types';

const SYSTEM_PROMPT = `You are a financial news analyst specializing in structured data extraction.
Your job is to extract precise, factual information from financial events.
Always respond with valid JSON matching the exact schema provided.
Never add commentary outside the JSON object.
Never speculate beyond what is stated in the source material.`;

function buildUserPrompt(input: EventExtractionInput): string {
  return `Extract structured information from the following financial event:

TITLE: ${input.title}
CATEGORY: ${input.category} | ${input.macroMicro}
${input.summary ? `SUMMARY: ${input.summary}` : ''}
${input.body ? `BODY (first 800 chars): ${input.body.slice(0, 800)}` : ''}

Respond ONLY with a JSON object matching this schema:
{
  "headline": "concise 1-sentence headline (max 120 chars)",
  "summary": "2-3 sentence factual summary of the event",
  "keyEntities": ["list of key organizations, people, or institutions mentioned"],
  "affectedAssets": [
    {
      "ticker": "STOCK_TICKER or CURRENCY_PAIR or COMMODITY (uppercase)",
      "name": "full name of the asset",
      "impactType": one of ["direct","indirect","sector","macro"],
      "impactDirection": one of ["positive","negative","neutral","unknown"],
      "confidence": float 0.0-1.0
    }
  ],
  "affectedSectors": ["list of affected sectors e.g. Technology, Energy, Financials"],
  "affectedRegions": ["list of affected regions/countries e.g. United States, Europe, China"],
  "keyRisks": ["list of key risks or unknowns identified"],
  "reasoning": "one sentence explaining why these assets/sectors were selected",
  "confidence": float 0.0-1.0
}

Rules:
- Only include assets with strong textual evidence (ticker or name explicitly mentioned or clearly implied)
- impactType: direct=company named directly, indirect=supply chain/competitor, sector=whole sector, macro=broad market
- impactDirection: positive=beneficial, negative=adverse, neutral=informational, unknown=unclear
- affectedAssets: max 8 entries, sorted by confidence descending
- affectedSectors: use standard GICS sectors (Technology, Healthcare, Financials, Energy, Industrials, etc.)
- keyRisks: max 5 items, be specific and factual`;
}

@Injectable()
export class EventExtractionPipeline {
  private readonly logger = new Logger(EventExtractionPipeline.name);

  constructor(private readonly llm: LlmService) {}

  async run(
    input: EventExtractionInput,
    ctx: PipelineContext,
  ): Promise<EventExtractionOutput> {
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
      maxTokens: 1024,
    });

    const latency = Date.now() - start;
    this.logger.debug(
      `Event extraction done in ${latency}ms — tokens: ${result.usage.totalTokens} cost: $${result.cost.toFixed(6)}`,
    );

    try {
      const parsed = JSON.parse(result.content) as EventExtractionOutput;
      return parsed;
    } catch {
      this.logger.error(
        `Event extraction JSON parse failed for event "${input.title}": ${result.content.slice(0, 200)}`,
      );
      // Return safe fallback
      return {
        headline: input.title.slice(0, 120),
        summary: input.summary ?? input.title,
        keyEntities: [],
        affectedAssets: [],
        affectedSectors: [],
        affectedRegions: [],
        keyRisks: ['Extraction parse failed — manual review required'],
        reasoning: 'Event extraction parse failed — fallback applied',
        confidence: 0.1,
      };
    }
  }
}
