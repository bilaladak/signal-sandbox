import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { DATABASE_POOL } from '../../database/database.module';

export interface DbWatchlist {
  id: string;
  org_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface DbWatchlistItem {
  id: string;
  watchlist_id: string;
  asset_id: string;
  added_at: string;
}

export interface DbWatchlistWithCount extends DbWatchlist {
  item_count: number;
}

export interface DbWatchlistItemWithAsset extends DbWatchlistItem {
  symbol: string;
  asset_name: string;
  asset_type: string;
}

@Injectable()
export class WatchlistsRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async findAll(orgId: string): Promise<DbWatchlistWithCount[]> {
    const { rows } = await this.pool.query<DbWatchlistWithCount>(
      `SELECT w.*, COALESCE(COUNT(wi.id), 0)::int AS item_count
       FROM watchlists w
       LEFT JOIN watchlist_items wi ON wi.watchlist_id = w.id
       WHERE w.org_id = $1
       GROUP BY w.id
       ORDER BY w.created_at DESC`,
      [orgId],
    );
    return rows;
  }

  async findById(id: string, orgId: string): Promise<DbWatchlistWithCount | null> {
    const { rows } = await this.pool.query<DbWatchlistWithCount>(
      `SELECT w.*, COALESCE(COUNT(wi.id), 0)::int AS item_count
       FROM watchlists w
       LEFT JOIN watchlist_items wi ON wi.watchlist_id = w.id
       WHERE w.id = $1 AND w.org_id = $2
       GROUP BY w.id`,
      [id, orgId],
    );
    return rows[0] || null;
  }

  async create(orgId: string, name: string): Promise<DbWatchlist> {
    const id = uuidv4();
    const { rows } = await this.pool.query<DbWatchlist>(
      `INSERT INTO watchlists (id, org_id, name)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id, orgId, name],
    );
    return rows[0];
  }

  async delete(id: string, orgId: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      'DELETE FROM watchlists WHERE id = $1 AND org_id = $2',
      [id, orgId],
    );
    return (rowCount ?? 0) > 0;
  }

  async addItem(watchlistId: string, assetId: string): Promise<DbWatchlistItem> {
    const id = uuidv4();
    const { rows } = await this.pool.query<DbWatchlistItem>(
      `INSERT INTO watchlist_items (id, watchlist_id, asset_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (watchlist_id, asset_id) DO NOTHING
       RETURNING *`,
      [id, watchlistId, assetId],
    );
    // If ON CONFLICT hit, fetch existing
    if (rows.length === 0) {
      const { rows: existing } = await this.pool.query<DbWatchlistItem>(
        'SELECT * FROM watchlist_items WHERE watchlist_id = $1 AND asset_id = $2',
        [watchlistId, assetId],
      );
      return existing[0];
    }
    return rows[0];
  }

  async removeItem(watchlistId: string, assetId: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      'DELETE FROM watchlist_items WHERE watchlist_id = $1 AND asset_id = $2',
      [watchlistId, assetId],
    );
    return (rowCount ?? 0) > 0;
  }

  async getItems(watchlistId: string): Promise<DbWatchlistItemWithAsset[]> {
    const { rows } = await this.pool.query<DbWatchlistItemWithAsset>(
      `SELECT wi.*, a.symbol, a.name AS asset_name, a.type AS asset_type
       FROM watchlist_items wi
       INNER JOIN assets a ON a.id = wi.asset_id
       WHERE wi.watchlist_id = $1
       ORDER BY wi.added_at DESC`,
      [watchlistId],
    );
    return rows;
  }
}
