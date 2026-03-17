// ── Entity Linking Pipeline ──
// Stage: haiku — maps extracted tickers/names to database asset IDs
// Resolves ticker symbols and company names to known assets in the DB

import { Injectable, Logger, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../../database/database.module';
import { LlmService } from '../../modules/llm/llm.service';
import type {
  EntityLinkingInput,
  EntityLinkingOutput,
  LinkedAsset,
  PipelineContext,
} from './pipeline.types';

interface DbAssetRow {
  id: string;
  symbol: string;
  name: string;
}

@Injectable()
export class EntityLinkingPipeline {
  private readonly logger = new Logger(EntityLinkingPipeline.name);

  constructor(
    private readonly llm: LlmService,
    @Inject(DATABASE_POOL) private readonly pool: Pool,
  ) {}

  async run(
    input: EntityLinkingInput,
    ctx: PipelineContext,
  ): Promise<EntityLinkingOutput> {
    if (input.extractedAssets.length === 0) {
      return { linkedAssets: [], unresolved: [] };
    }

    // Step 1: Direct ticker lookup in DB (assets table has no org_id — global)
    const tickers = input.extractedAssets.map((a) => a.ticker.toUpperCase());

    const { rows: dbAssets } = await this.pool.query<DbAssetRow>(
      `SELECT id, symbol, name FROM assets WHERE symbol = ANY($1)`,
      [tickers],
    );

    const dbAssetMap = new Map(
      dbAssets.map((a) => [a.symbol.toUpperCase(), a]),
    );

    const linkedAssets: LinkedAsset[] = [];
    const unresolved: string[] = [];

    for (const extracted of input.extractedAssets) {
      const upperTicker = extracted.ticker.toUpperCase();
      const dbAsset = dbAssetMap.get(upperTicker);

      if (dbAsset) {
        linkedAssets.push({
          assetId: dbAsset.id,
          ticker: dbAsset.symbol,
          impactType: extracted.impactType,
          impactDirection: extracted.impactDirection,
          confidence: extracted.confidence,
        });
      } else {
        unresolved.push(extracted.ticker);
      }
    }

    // Step 2: For unresolved tickers, try fuzzy name match via LLM
    if (unresolved.length > 0) {
      const { rows: candidateAssets } = await this.pool.query<DbAssetRow>(
        `SELECT id, symbol, name FROM assets LIMIT 200`,
      );

      if (candidateAssets.length > 0) {
        const resolved = await this.resolveFuzzy(
          unresolved,
          input.extractedAssets,
          candidateAssets,
        );
        linkedAssets.push(...resolved.linked);

        const fuzzyResolvedSet = new Set(resolved.linked.map((a) => a.ticker));
        const stillUnresolved = unresolved.filter(
          (t) => !fuzzyResolvedSet.has(t),
        );

        this.logger.debug(
          `Entity linking: ${linkedAssets.length} linked, ${stillUnresolved.length} unresolved`,
        );
        return { linkedAssets, unresolved: stillUnresolved };
      }
    }

    this.logger.debug(
      `Entity linking: ${linkedAssets.length} linked, ${unresolved.length} unresolved`,
    );
    return { linkedAssets, unresolved };
  }

  private async resolveFuzzy(
    unresolvedTickers: string[],
    extractedAssets: EntityLinkingInput['extractedAssets'],
    candidates: DbAssetRow[],
  ): Promise<{ linked: LinkedAsset[] }> {
    const candidateList = candidates
      .map((a) => `${a.symbol} — ${a.name}`)
      .join('\n');

    const prompt = `You are matching financial instrument identifiers to a database of known assets.

Unresolved identifiers:
${unresolvedTickers.join(', ')}

Known assets in database (symbol — name):
${candidateList}

For each unresolved identifier, find the best matching known asset if one clearly exists.
Only match if confidence > 0.7. Do not guess.

Respond ONLY with a JSON array:
[
  {
    "input": "original unresolved ticker or name",
    "matchedSymbol": "SYMBOL from the known assets list",
    "confidence": float 0.0-1.0
  }
]

If no confident match exists, omit that identifier from the array.`;

    try {
      const result = await this.llm.complete({
        provider: 'anthropic',
        model: 'claude-haiku-4-5-20251001',
        messages: [{ role: 'user', content: prompt }],
        systemPrompt:
          'You are a financial data resolver. Respond only with valid JSON arrays.',
        jsonMode: true,
        temperature: 0.0,
        maxTokens: 512,
      });

      const matches = JSON.parse(result.content) as Array<{
        input: string;
        matchedSymbol: string;
        confidence: number;
      }>;

      const candidateMap = new Map(
        candidates.map((a) => [a.symbol.toUpperCase(), a]),
      );
      const extractedMap = new Map(
        extractedAssets.map((a) => [a.ticker.toUpperCase(), a]),
      );

      const linked: LinkedAsset[] = [];
      for (const match of matches) {
        if (match.confidence < 0.7) continue;
        const asset = candidateMap.get(match.matchedSymbol.toUpperCase());
        if (!asset) continue;

        const original = extractedMap.get(match.input.toUpperCase());

        linked.push({
          assetId: asset.id,
          ticker: asset.symbol,
          impactType: original?.impactType ?? 'indirect',
          impactDirection: original?.impactDirection ?? 'unknown',
          confidence: match.confidence,
        });
      }

      return { linked };
    } catch (err) {
      this.logger.warn(
        `Fuzzy entity linking failed for [${unresolvedTickers.join(', ')}]: ${String(err)}`,
      );
      return { linked: [] };
    }
  }
}
