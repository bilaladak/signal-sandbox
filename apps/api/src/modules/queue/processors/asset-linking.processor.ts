import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { DATABASE_POOL } from '../../../database/database.module';

interface AssetLinkingJobData {
  eventId: string;
  orgId: string;
  text: string;
}

interface AssetRow {
  id: string;
  symbol: string;
  name: string;
}

@Processor('asset-linking')
export class AssetLinkingProcessor extends WorkerHost {
  private readonly logger = new Logger(AssetLinkingProcessor.name);

  constructor(
    @Inject(DATABASE_POOL) private readonly pool: Pool,
  ) {
    super();
  }

  async process(job: Job<AssetLinkingJobData>): Promise<void> {
    const { eventId, orgId, text } = job.data;
    this.logger.log(`Linking assets for event ${eventId}`);

    try {
      // TODO: Replace keyword matching with LLM-based entity recognition

      // 1. Fetch all assets from DB
      const assetsResult = await this.pool.query<AssetRow>(
        `SELECT id, symbol, name FROM assets`,
      );

      const assets = assetsResult.rows;
      if (assets.length === 0) {
        this.logger.log('No assets in database, skipping asset linking');
        return;
      }

      const textLower = text.toLowerCase();
      let linkedCount = 0;

      // 2. Simple keyword matching: check if asset symbol or name appears in event text
      for (const asset of assets) {
        const symbolMatch = textLower.includes(asset.symbol.toLowerCase());
        const nameMatch = textLower.includes(asset.name.toLowerCase());

        if (symbolMatch || nameMatch) {
          // Calculate a simple relevance score:
          // - Both symbol and name match: 0.9
          // - Symbol match only: 0.7
          // - Name match only: 0.5
          let relevanceScore = 0.5;
          if (symbolMatch && nameMatch) {
            relevanceScore = 0.9;
          } else if (symbolMatch) {
            relevanceScore = 0.7;
          }

          // 3. Insert into event_asset_links with ON CONFLICT DO NOTHING
          await this.pool.query(
            `INSERT INTO event_asset_links (id, event_id, asset_id, relevance_score)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (event_id, asset_id) DO NOTHING`,
            [uuidv4(), eventId, asset.id, relevanceScore],
          );

          linkedCount++;
        }
      }

      this.logger.log(
        `Linked ${linkedCount} asset(s) to event ${eventId} out of ${assets.length} total assets`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to link assets for event ${eventId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error; // Re-throw to let BullMQ handle retries
    }
  }
}
