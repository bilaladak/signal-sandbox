import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { DATABASE_POOL } from '../../../database/database.module';

interface GraphUpdateJobData {
  eventId: string;
  orgId: string;
}

interface EventRow {
  id: string;
  title: string;
  category: string;
  severity: string;
  published_at: string;
}

interface LinkedAssetRow {
  asset_id: string;
  symbol: string;
  name: string;
  type: string;
  relevance_score: number;
}

@Processor('graph-update')
export class GraphUpdateProcessor extends WorkerHost {
  private readonly logger = new Logger(GraphUpdateProcessor.name);

  constructor(
    @Inject(DATABASE_POOL) private readonly pool: Pool,
  ) {
    super();
  }

  async process(job: Job<GraphUpdateJobData>): Promise<void> {
    const { eventId, orgId } = job.data;
    this.logger.log(`Updating knowledge graph for event ${eventId}`);

    try {
      // 1. Fetch event from DB
      const eventResult = await this.pool.query<EventRow>(
        `SELECT id, title, category, severity, published_at
         FROM events
         WHERE id = $1`,
        [eventId],
      );

      if (eventResult.rows.length === 0) {
        this.logger.warn(`Event ${eventId} not found, skipping graph update`);
        return;
      }

      const event = eventResult.rows[0];

      // 2. Create a graph_node for this event (upsert by checking existing)
      const eventNodeId = uuidv4();
      const eventNodeResult = await this.pool.query(
        `INSERT INTO graph_nodes (id, org_id, type, label, properties)
         VALUES ($1, $2, 'event', $3, $4)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [
          eventNodeId,
          orgId,
          event.title,
          JSON.stringify({
            category: event.category,
            severity: event.severity,
            event_date: event.published_at,
            event_id: eventId,
          }),
        ],
      );

      // Use the returned id if insert succeeded, otherwise look up existing node
      let finalEventNodeId: string;
      if (eventNodeResult.rows.length > 0) {
        finalEventNodeId = eventNodeResult.rows[0].id;
        this.logger.log(`Created event graph node ${finalEventNodeId}`);
      } else {
        // Node might already exist for this event, find it
        const existingNode = await this.pool.query(
          `SELECT id FROM graph_nodes
           WHERE org_id = $1 AND type = 'event' AND properties->>'event_id' = $2
           LIMIT 1`,
          [orgId, eventId],
        );

        if (existingNode.rows.length > 0) {
          finalEventNodeId = existingNode.rows[0].id;
          this.logger.log(`Using existing event graph node ${finalEventNodeId}`);
        } else {
          // Shouldn't reach here, but handle gracefully
          finalEventNodeId = eventNodeId;
          this.logger.warn(
            `Unexpected state: ON CONFLICT triggered but no existing node found for event ${eventId}`,
          );
        }
      }

      // 3. Fetch linked assets from event_asset_links JOIN assets
      const linkedAssetsResult = await this.pool.query<LinkedAssetRow>(
        `SELECT eal.asset_id, a.symbol, a.name, a.type, eal.relevance_score
         FROM event_asset_links eal
         JOIN assets a ON a.id = eal.asset_id
         WHERE eal.event_id = $1`,
        [eventId],
      );

      const linkedAssets = linkedAssetsResult.rows;
      let nodesCreated = 0;
      let edgesCreated = 0;

      // 4. For each linked asset, upsert graph_node and create graph_edge
      for (const asset of linkedAssets) {
        // UPSERT asset graph_node: match by org_id + type='asset' + label=symbol
        const assetNodeId = uuidv4();
        const assetNodeResult = await this.pool.query(
          `INSERT INTO graph_nodes (id, org_id, type, label, properties)
           VALUES ($1, $2, 'asset', $3, $4)
           ON CONFLICT DO NOTHING
           RETURNING id`,
          [
            assetNodeId,
            orgId,
            asset.symbol,
            JSON.stringify({
              name: asset.name,
              asset_type: asset.type,
              asset_id: asset.asset_id,
            }),
          ],
        );

        let finalAssetNodeId: string;
        if (assetNodeResult.rows.length > 0) {
          finalAssetNodeId = assetNodeResult.rows[0].id;
          nodesCreated++;
        } else {
          // Look up existing asset node
          const existingAssetNode = await this.pool.query(
            `SELECT id FROM graph_nodes
             WHERE org_id = $1 AND type = 'asset' AND properties->>'asset_id' = $2
             LIMIT 1`,
            [orgId, asset.asset_id],
          );

          if (existingAssetNode.rows.length > 0) {
            finalAssetNodeId = existingAssetNode.rows[0].id;
          } else {
            finalAssetNodeId = assetNodeId;
          }
        }

        // Create graph_edge: event -> asset with relation_type 'affects'
        const edgeId = uuidv4();
        await this.pool.query(
          `INSERT INTO graph_edges (id, org_id, source_node_id, target_node_id, relationship, weight)
           VALUES ($1, $2, $3, $4, 'affects', $5)
           ON CONFLICT DO NOTHING`,
          [
            edgeId,
            orgId,
            finalEventNodeId,
            finalAssetNodeId,
            asset.relevance_score,
          ],
        );
        edgesCreated++;
      }

      this.logger.log(
        `Graph updated for event ${eventId}: ${nodesCreated} new asset node(s), ${edgesCreated} edge(s) created/attempted`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update graph for event ${eventId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error; // Re-throw to let BullMQ handle retries
    }
  }
}
