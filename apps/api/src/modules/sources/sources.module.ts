import { Module } from '@nestjs/common';
import { SourcesController } from './sources.controller';
import { SourcesService } from './sources.service';
import { SourcesRepository } from './sources.repository';

@Module({
  controllers: [SourcesController],
  providers: [SourcesService, SourcesRepository],
  exports: [SourcesService],
})
export class SourcesModule {}
