import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { DATABASE_POOL } from '../../../database/database.module';
import { EntityLinkingPipeline } from '../../../ai/pipelines/entity-linking.pipeline';
import type { PipelineContext } from '../../../ai/pipelines/pipeline.types';

interface AssetLinkingJobData {
  eventId: string;
  orgId: string;
  text: string;
}

@Processor('asset-linking')
export class AssetLinkingProcessor extends WorkerHost {
  private readonly logger = new Logger(AssetLinkingProcessor.name);

  constructor(
    @Inject(DATABASE_POOL) private readonly pool: Pool,
    private readonly entityLinking: EntityLinkingPipeline,
  ) {
    super();
  }

  async process(job: Job<AssetLinkingJobData>): Promise<void> {
    const { eventId, orgId, text } = job.data;
    this.logger.log(`Linking assets for event ${eventId}`);

    const ctx: PipelineContext = {
      orgId,
      traceId: uuidv4(),
      stage: 'asset-linking',
    };

    try {
      // 1. Fetch pipeline extraction metadata from event (tickers extracted by EventProcessor)
      const { rows } = await this.pool.query<{
        metadata: Record<string, unknown>;
      }>(
        `SELECT metadata FROM events WHERE id = $1`,
        [eventId],
      );

      if (rows.length === 0) {
        this.logger.warn(`Event ${eventId} not found, skipping asset linking`);
        return;
      }

      const metadata = rows[0].metadata as {
        extraction?: {
          affectedAssets?: Array<{
            ticker: string;
            impactType: string;
            impactDirection: string;
            confidence: number;
          }>;
        };
      };

      // Build extracted assets list from pipeline metadata, or fall back to text parsing
      const extractedAssets = metadata?.extraction?.affectedAssets ?? [];

      let inputAssets: Array<{
        ticker: string;
        impactType: 'direct' | 'indirect' | 'sector' | 'macro';
        impactDirection: 'positive' | 'negative' | 'neutral' | 'unknown';
        confidence: number;
      }>;

      if (extractedAssets.length > 0) {
        // Use LLM-extracted assets from the earlier classification stage
        inputAssets = extractedAssets.map((a) => ({
          ticker: a.ticker,
          impactType: (a.impactType as 'direct' | 'indirect' | 'sector' | 'macro') ?? 'indirect',
          impactDirection: (a.impactDirection as 'positive' | 'negative' | 'neutral' | 'unknown') ?? 'unknown',
          confidence: a.confidence ?? 0.5,
        }));
      } else {
        // Fallback: extract potential tickers from text (uppercase words 1-5 chars)
        const tickerPattern = /\b[A-Z]{1,5}\b/g;
        const rawMatches = text.match(tickerPattern) ?? [];
        // Filter common English words
        const stopWords = new Set(['THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HER', 'HIM', 'HIS', 'HOW', 'ITS', 'OUR', 'OUT', 'WHO', 'NEW', 'NOW', 'WAY', 'MAY', 'USE', 'USD', 'EUR', 'GDP', 'CEO', 'CFO', 'IPO', 'SEC']);
        const tickers = [...new Set(rawMatches.filter((t) => !stopWords.has(t)))];

        inputAssets = tickers.map((ticker) => ({
          ticker,
          impactType: 'indirect' as const,
          impactDirection: 'unknown' as const,
          confidence: 0.4,
        }));
      }

      if (inputAssets.length === 0) {
        this.logger.log(`No assets to link for event ${eventId}`);
        return;
      }

      // 2. Run entity linking pipeline (DB lookup + fuzzy LLM match)
      const linkingResult = await this.entityLinking.run(
        { extractedAssets: inputAssets },
        ctx,
      );

      if (linkingResult.linkedAssets.length === 0) {
        this.logger.log(
          `No assets resolved for event ${eventId} (unresolved: [${linkingResult.unresolved.join(', ')}])`,
        );
        return;
      }

      // 3. Insert event_asset_links
      let linkedCount = 0;
      for (const linked of linkingResult.linkedAssets) {
        await this.pool.query(
          `INSERT INTO event_asset_links (id, event_id, asset_id, relevance_score, relationship_type)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (event_id, asset_id) DO UPDATE
             SET relevance_score = GREATEST(event_asset_links.relevance_score, EXCLUDED.relevance_score),
                 relationship_type = EXCLUDED.relationship_type`,
          [
            uuidv4(),
            eventId,
            linked.assetId,
            linked.confidence,
            linked.impactType,
          ],
        );
        linkedCount++;
      }

      this.logger.log(
        `Linked ${linkedCount} asset(s) to event ${eventId} via entity linking pipeline (unresolved: ${linkingResult.unresolved.length})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to link assets for event ${eventId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
