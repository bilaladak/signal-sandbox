import { Module } from '@nestjs/common';
import { GraphController } from './graph.controller';
import { GraphService } from './graph.service';
import { GraphRepository } from './graph.repository';

@Module({
  controllers: [GraphController],
  providers: [GraphService, GraphRepository],
  exports: [GraphService],
})
export class GraphModule {}
