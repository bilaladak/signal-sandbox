import { Module, Global, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

export const DATABASE_POOL = 'DATABASE_POOL';

const databasePoolFactory = {
  provide: DATABASE_POOL,
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    const logger = new Logger('DatabasePool');
    const pool = new Pool({
      host: config.get('DATABASE_HOST', 'localhost'),
      port: config.get('DATABASE_PORT', 5432),
      database: config.get('DATABASE_NAME', 'signal_sandbox'),
      user: config.get('DATABASE_USER', 'postgres'),
      password: config.get('DATABASE_PASSWORD', 'postgres'),
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      logger.error('Unexpected error on idle database client', err.stack);
    });

    logger.log('Database pool created');
    return pool;
  },
};

@Global()
@Module({
  providers: [databasePoolFactory],
  exports: [DATABASE_POOL],
})
export class DatabaseModule {}
