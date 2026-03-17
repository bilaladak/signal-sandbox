import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { DATABASE_POOL } from '../../database/database.module';

export interface DbSource {
  id: string;
  name: string;
  type: string;
  base_url: string | null;
  reliability_score: number;
  active: boolean;
  created_at: string;
}

export interface CreateSourceData {
  name: string;
  type: string;
  baseUrl?: string;
  active?: boolean;
}

export interface UpdateSourceData {
  name?: string;
  type?: string;
  baseUrl?: string;
  active?: boolean;
}

@Injectable()
export class SourcesRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async findAll(): Promise<DbSource[]> {
    const { rows } = await this.pool.query<DbSource>(
      'SELECT * FROM sources ORDER BY created_at DESC',
    );
    return rows;
  }

  async findById(id: string): Promise<DbSource | null> {
    const { rows } = await this.pool.query<DbSource>(
      'SELECT * FROM sources WHERE id = $1',
      [id],
    );
    return rows[0] || null;
  }

  async create(data: CreateSourceData): Promise<DbSource> {
    const id = uuidv4();
    const { rows } = await this.pool.query<DbSource>(
      `INSERT INTO sources (id, name, type, base_url, active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        id,
        data.name,
        data.type,
        data.baseUrl || null,
        data.active !== undefined ? data.active : true,
      ],
    );
    return rows[0];
  }

  async update(id: string, data: UpdateSourceData): Promise<DbSource | null> {
    const fields: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      params.push(data.name);
    }
    if (data.type !== undefined) {
      fields.push(`type = $${paramIndex++}`);
      params.push(data.type);
    }
    if (data.baseUrl !== undefined) {
      fields.push(`base_url = $${paramIndex++}`);
      params.push(data.baseUrl);
    }
    if (data.active !== undefined) {
      fields.push(`active = $${paramIndex++}`);
      params.push(data.active);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    params.push(id);
    const { rows } = await this.pool.query<DbSource>(
      `UPDATE sources SET ${fields.join(', ')} WHERE id = $${paramIndex}
       RETURNING *`,
      params,
    );
    return rows[0] || null;
  }

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      'DELETE FROM sources WHERE id = $1',
      [id],
    );
    return (rowCount ?? 0) > 0;
  }
}
