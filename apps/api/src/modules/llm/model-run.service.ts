// ── Model Run Service — Wraps repository for LLM call tracking ──

import { Injectable, Logger } from '@nestjs/common';
import {
  ModelRunRepository,
  RecordModelRunData,
  UsageStats,
  DbModelRun,
} from './model-run.repository';

@Injectable()
export class ModelRunService {
  private readonly logger = new Logger(ModelRunService.name);

  constructor(private readonly modelRunRepo: ModelRunRepository) {}

  /**
   * Record a successful LLM completion or embedding call.
   * Non-blocking: errors are logged but do not propagate to the caller.
   */
  async recordSuccess(
    orgId: string,
    data: Omit<RecordModelRunData, 'success' | 'errorMessage'>,
  ): Promise<void> {
    try {
      await this.modelRunRepo.record(orgId, {
        ...data,
        success: true,
      });
      this.logger.debug(
        `Recorded model run: stage=${data.pipelineStage} model=${data.model} cost=$${data.totalCost.toFixed(6)}`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to record model run (non-critical): ${message}`);
    }
  }

  /**
   * Record a failed LLM call.
   * Non-blocking: errors are logged but do not propagate to the caller.
   */
  async recordFailure(
    orgId: string,
    data: Omit<RecordModelRunData, 'success'> & { errorMessage: string },
  ): Promise<void> {
    try {
      await this.modelRunRepo.record(orgId, {
        ...data,
        success: false,
      });
      this.logger.debug(
        `Recorded failed model run: stage=${data.pipelineStage} model=${data.model} error=${data.errorMessage}`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Failed to record model run failure (non-critical): ${message}`,
      );
    }
  }

  async getUsageStats(orgId: string, days?: number): Promise<UsageStats> {
    return this.modelRunRepo.getUsageStats(orgId, days);
  }

  async getRecentRuns(orgId: string, limit?: number): Promise<DbModelRun[]> {
    return this.modelRunRepo.getRecentRuns(orgId, limit);
  }
}
