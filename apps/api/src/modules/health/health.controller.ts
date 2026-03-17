import { Controller, Get, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { Public } from '../../common/decorators/public.decorator';
import { DATABASE_POOL } from '../../database/database.module';

@Controller('health')
export class HealthController {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  @Public()
  @Get()
  async check() {
    const dbCheck = await this.checkDatabase();

    return {
      status: dbCheck ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: dbCheck ? 'up' : 'down',
      },
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch {
      return false;
    }
  }
}
