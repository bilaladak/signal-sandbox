import { Module } from '@nestjs/common';
import { WatchlistsController } from './watchlists.controller';
import { WatchlistsService } from './watchlists.service';
import { WatchlistsRepository } from './watchlists.repository';

@Module({
  controllers: [WatchlistsController],
  providers: [WatchlistsService, WatchlistsRepository],
  exports: [WatchlistsService],
})
export class WatchlistsModule {}
