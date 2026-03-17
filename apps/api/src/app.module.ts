import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { DatabaseModule } from './database/database.module';
import { EventsModule } from './modules/events/events.module';
import { SourcesModule } from './modules/sources/sources.module';
import { AssetsModule } from './modules/assets/assets.module';
import { WatchlistsModule } from './modules/watchlists/watchlists.module';
import { QueueModule } from './modules/queue/queue.module';
import { GraphModule } from './modules/knowledge-graph/graph.module';
import { LlmModule } from './modules/llm/llm.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    AuthModule,
    HealthModule,
    EventsModule,
    SourcesModule,
    AssetsModule,
    WatchlistsModule,
    QueueModule,
    GraphModule,
    LlmModule,
  ],
})
export class AppModule {}
