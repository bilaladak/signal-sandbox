// ── Model Run Repository — Tracks every LLM call in model_runs table ──

import { Injectable, Inject, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { DATABASE_POOL } from '../../database/database.module';

export interface DbModelRun {
  id: string;
  org_id: string;
  pipeline_stage: string;
  model: string;
  prompt_version: string | null;
  input_tokens: number;
  output_tokens: number;
  total_cost: number;
  latency_ms: number;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

export interface RecordModelRunData {
  pipelineStage: string;
  model: string;
  promptVersion?: string;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  latencyMs: number;
  success: boolean;
  errorMessage?: string;
}

export interface UsageStats {
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  byModel: Array<{
    model: string;
    calls: number;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  }>;
}

@Injectable()
export class ModelRunRepository {
  private readonly logger = new Logger(ModelRunRepository.name);

  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async record(orgId: string, data: RecordModelRunData): Promise<DbModelRun> {
    const id = uuidv4();

    try {
      const { rows } = await this.pool.query<DbModelRun>(
        `INSERT INTO model_runs (
          id, org_id, pipeline_stage, model, prompt_version,
          input_tokens, output_tokens, total_cost, latency_ms,
          success, error_message
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          id,
          orgId,
          data.pipelineStage,
          data.model,
          data.promptVersion ?? null,
          data.inputTokens,
          data.outputTokens,
          data.totalCost,
          data.latencyMs,
          data.success,
          data.errorMessage ?? null,
        ],
      );

      return rows[0];
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown DB error';
      this.logger.error(`Failed to record model run: ${message}`);
      throw error;
    }
  }

  async getUsageStats(orgId: string, days = 30): Promise<UsageStats> {
    const statsQuery = await this.pool.query<{
      total_calls: string;
      total_input_tokens: string;
      total_output_tokens: string;
      total_cost: string;
    }>(
      `SELECT
        COUNT(*)::TEXT AS total_calls,
        COALESCE(SUM(input_tokens), 0)::TEXT AS total_input_tokens,
        COALESCE(SUM(output_tokens), 0)::TEXT AS total_output_tokens,
        COALESCE(SUM(total_cost), 0)::TEXT AS total_cost
      FROM model_runs
      WHERE org_id = $1
        AND created_at >= NOW() - INTERVAL '1 day' * $2`,
      [orgId, days],
    );

    const byModelQuery = await this.pool.query<{
      model: string;
      calls: string;
      input_tokens: string;
      output_tokens: string;
      cost: string;
    }>(
      `SELECT
        model,
        COUNT(*)::TEXT AS calls,
        COALESCE(SUM(input_tokens), 0)::TEXT AS input_tokens,
        COALESCE(SUM(output_tokens), 0)::TEXT AS output_tokens,
        COALESCE(SUM(total_cost), 0)::TEXT AS cost
      FROM model_runs
      WHERE org_id = $1
        AND created_at >= NOW() - INTERVAL '1 day' * $2
      GROUP BY model
      ORDER BY cost DESC`,
      [orgId, days],
    );

    const stats = statsQuery.rows[0];

    return {
      totalCalls: parseInt(stats.total_calls, 10),
      totalInputTokens: parseInt(stats.total_input_tokens, 10),
      totalOutputTokens: parseInt(stats.total_output_tokens, 10),
      totalCost: parseFloat(stats.total_cost),
      byModel: byModelQuery.rows.map((row) => ({
        model: row.model,
        calls: parseInt(row.calls, 10),
        inputTokens: parseInt(row.input_tokens, 10),
        outputTokens: parseInt(row.output_tokens, 10),
        cost: parseFloat(row.cost),
      })),
    };
  }

  async getRecentRuns(
    orgId: string,
    limit = 20,
  ): Promise<DbModelRun[]> {
    const { rows } = await this.pool.query<DbModelRun>(
      `SELECT * FROM model_runs
      WHERE org_id = $1
      ORDER BY created_at DESC
      LIMIT $2`,
      [orgId, limit],
    );

    return rows;
  }
}
