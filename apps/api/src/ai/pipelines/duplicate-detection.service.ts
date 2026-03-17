// ── Duplicate Detection Service ──
// Uses pgvector cosine similarity to detect near-duplicate events
// Threshold: cosine distance < 0.15 (similarity > 0.85) is considered duplicate

import { Injectable, Logger, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../../database/database.module';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  nearestEventId: string | null;
  similarity: number | null;
}

const DUPLICATE_THRESHOLD = 0.15; // cosine distance — lower is more similar

@Injectable()
export class DuplicateDetectionService {
  private readonly logger = new Logger(DuplicateDetectionService.name);

  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  /**
   * Check if an event with the given embedding is a near-duplicate of an existing event.
   * Uses pgvector's <=> operator (cosine distance).
   * Returns isDuplicate=false if the event has no embedding or no candidates exist.
   */
  async checkDuplicate(
    eventId: string,
    embedding: number[],
  ): Promise<DuplicateCheckResult> {
    if (!embedding || embedding.length === 0) {
      return { isDuplicate: false, nearestEventId: null, similarity: null };
    }

    const embeddingLiteral = `[${embedding.join(',')}]`;

    try {
      // Find the nearest neighbour excluding the event itself
      // <=> is cosine distance in pgvector (0 = identical, 2 = opposite)
      const { rows } = await this.pool.query<{
        id: string;
        distance: string;
      }>(
        `SELECT id, (embedding <=> $1::vector) AS distance
         FROM events
         WHERE id != $2
           AND embedding IS NOT NULL
         ORDER BY embedding <=> $1::vector
         LIMIT 1`,
        [embeddingLiteral, eventId],
      );

      if (rows.length === 0) {
        return { isDuplicate: false, nearestEventId: null, similarity: null };
      }

      const distance = parseFloat(rows[0].distance);
      const similarity = 1 - distance; // convert cosine distance to similarity
      const isDuplicate = distance < DUPLICATE_THRESHOLD;

      this.logger.debug(
        `Duplicate check for ${eventId}: nearest=${rows[0].id}, distance=${distance.toFixed(4)}, isDuplicate=${isDuplicate}`,
      );

      return {
        isDuplicate,
        nearestEventId: rows[0].id,
        similarity,
      };
    } catch (error) {
      // If vector extension unavailable or embedding column not populated, skip silently
      this.logger.warn(
        `Duplicate check failed for ${eventId}: ${(error as Error).message}`,
      );
      return { isDuplicate: false, nearestEventId: null, similarity: null };
    }
  }

  /**
   * Mark an event as a duplicate in its metadata.
   */
  async markAsDuplicate(
    eventId: string,
    nearestEventId: string,
    similarity: number,
  ): Promise<void> {
    await this.pool.query(
      `UPDATE events
       SET metadata = metadata || $2::jsonb
       WHERE id = $1`,
      [
        eventId,
        JSON.stringify({
          duplicate: {
            isDuplicate: true,
            nearestEventId,
            similarity: similarity.toFixed(4),
            detectedAt: new Date().toISOString(),
          },
        }),
      ],
    );
  }
}
