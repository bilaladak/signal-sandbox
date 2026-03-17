import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { DATABASE_POOL } from '../../database/database.module';

export interface DbAsset {
  id: string;
  symbol: string;
  name: string;
  type: string;
  sector: string | null;
  country: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateAssetData {
  symbol: string;
  name: string;
  type: string;
}

export interface UpdateAssetData {
  symbol?: string;
  name?: string;
  type?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AssetsRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async findAll(
    query: {
      page?: number;
      limit?: number;
      type?: string;
      search?: string;
    },
  ): Promise<{ data: DbAsset[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (query.type) {
      conditions.push(`type = $${paramIndex++}`);
      params.push(query.type);
    }

    if (query.search) {
      conditions.push(`(symbol ILIKE $${paramIndex} OR name ILIKE $${paramIndex})`);
      params.push(`%${query.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM assets ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(limit, offset);
    const { rows } = await this.pool.query<DbAsset>(
      `SELECT * FROM assets ${whereClause}
       ORDER BY symbol ASC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params,
    );

    return { data: rows, total };
  }

  async findById(id: string): Promise<DbAsset | null> {
    const { rows } = await this.pool.query<DbAsset>(
      'SELECT * FROM assets WHERE id = $1',
      [id],
    );
    return rows[0] || null;
  }

  async findBySymbol(symbol: string): Promise<DbAsset | null> {
    const { rows } = await this.pool.query<DbAsset>(
      'SELECT * FROM assets WHERE symbol = $1',
      [symbol],
    );
    return rows[0] || null;
  }

  async create(data: CreateAssetData): Promise<DbAsset> {
    const id = uuidv4();
    const { rows } = await this.pool.query<DbAsset>(
      `INSERT INTO assets (id, symbol, name, type)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, data.symbol, data.name, data.type],
    );
    return rows[0];
  }

  async update(id: string, data: UpdateAssetData): Promise<DbAsset | null> {
    const fields: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (data.symbol !== undefined) {
      fields.push(`symbol = $${paramIndex++}`);
      params.push(data.symbol);
    }
    if (data.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      params.push(data.name);
    }
    if (data.type !== undefined) {
      fields.push(`type = $${paramIndex++}`);
      params.push(data.type);
    }
    if (data.metadata !== undefined) {
      fields.push(`metadata = $${paramIndex++}`);
      params.push(JSON.stringify(data.metadata));
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    params.push(id);
    const { rows } = await this.pool.query<DbAsset>(
      `UPDATE assets SET ${fields.join(', ')} WHERE id = $${paramIndex}
       RETURNING *`,
      params,
    );
    return rows[0] || null;
  }
}
