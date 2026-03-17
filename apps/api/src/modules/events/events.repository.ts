import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { DATABASE_POOL } from '../../database/database.module';

export interface DbEvent {
  id: string;
  source_id: string | null;
  title: string;
  summary: string | null;
  raw_content: string | null;
  category: string;
  severity: string;
  source_url: string | null;
  source_name: string | null;
  published_at: string | null;
  embedding: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CreateEventData {
  title: string;
  summary?: string;
  content?: string;
  category: string;
  severity: string;
  sourceId?: string;
  eventDate?: string;
  rawPayload?: Record<string, unknown>;
}

export interface UpdateEventData {
  title?: string;
  summary?: string;
  content?: string;
  category?: string;
  severity?: string;
}

@Injectable()
export class EventsRepository {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async findAll(
    query: {
      page?: number;
      limit?: number;
      category?: string;
      severity?: string;
      search?: string;
    },
  ): Promise<{ data: DbEvent[]; total: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (query.category) {
      conditions.push(`category = $${paramIndex++}`);
      params.push(query.category);
    }

    if (query.severity) {
      conditions.push(`severity = $${paramIndex++}`);
      params.push(query.severity);
    }

    if (query.search) {
      conditions.push(`(title ILIKE $${paramIndex} OR summary ILIKE $${paramIndex})`);
      params.push(`%${query.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM events ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(limit, offset);
    const { rows } = await this.pool.query<DbEvent>(
      `SELECT * FROM events ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params,
    );

    return { data: rows, total };
  }

  async findById(id: string): Promise<DbEvent | null> {
    const { rows } = await this.pool.query<DbEvent>(
      'SELECT * FROM events WHERE id = $1',
      [id],
    );
    return rows[0] || null;
  }

  async create(data: CreateEventData): Promise<DbEvent> {
    const id = uuidv4();
    const { rows } = await this.pool.query<DbEvent>(
      `INSERT INTO events (id, source_id, title, summary, raw_content, category, severity, published_at, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        id,
        data.sourceId || null,
        data.title,
        data.summary || null,
        data.content || null,
        data.category,
        data.severity,
        data.eventDate || null,
        data.rawPayload ? JSON.stringify(data.rawPayload) : '{}',
      ],
    );
    return rows[0];
  }

  async update(id: string, data: UpdateEventData): Promise<DbEvent | null> {
    const fields: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (data.title !== undefined) {
      fields.push(`title = $${paramIndex++}`);
      params.push(data.title);
    }
    if (data.summary !== undefined) {
      fields.push(`summary = $${paramIndex++}`);
      params.push(data.summary);
    }
    if (data.content !== undefined) {
      fields.push(`raw_content = $${paramIndex++}`);
      params.push(data.content);
    }
    if (data.category !== undefined) {
      fields.push(`category = $${paramIndex++}`);
      params.push(data.category);
    }
    if (data.severity !== undefined) {
      fields.push(`severity = $${paramIndex++}`);
      params.push(data.severity);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    params.push(id);
    const { rows } = await this.pool.query<DbEvent>(
      `UPDATE events SET ${fields.join(', ')} WHERE id = $${paramIndex}
       RETURNING *`,
      params,
    );
    return rows[0] || null;
  }

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      'DELETE FROM events WHERE id = $1',
      [id],
    );
    return (rowCount ?? 0) > 0;
  }

  async linkToAsset(
    eventId: string,
    assetId: string,
    relevanceScore: number,
  ): Promise<void> {
    const id = uuidv4();
    await this.pool.query(
      `INSERT INTO event_asset_links (id, event_id, asset_id, relevance_score)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (event_id, asset_id) DO UPDATE SET relevance_score = $4`,
      [id, eventId, assetId, relevanceScore],
    );
  }

  async findLinkedAssets(eventId: string): Promise<unknown[]> {
    const { rows } = await this.pool.query(
      `SELECT a.*, eal.relevance_score
       FROM assets a
       INNER JOIN event_asset_links eal ON eal.asset_id = a.id
       WHERE eal.event_id = $1
       ORDER BY eal.relevance_score DESC`,
      [eventId],
    );
    return rows;
  }

  async findByAsset(assetId: string, limit = 20): Promise<DbEvent[]> {
    const { rows } = await this.pool.query<DbEvent>(
      `SELECT e.*
       FROM events e
       INNER JOIN event_asset_links eal ON eal.event_id = e.id
       WHERE eal.asset_id = $1
       ORDER BY e.created_at DESC
       LIMIT $2`,
      [assetId, limit],
    );
    return rows;
  }
}
