import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { GraphService } from './graph.service';
import {
  CreateNodeDto,
  UpdateNodeDto,
  NodeQueryDto,
  CreateEdgeDto,
  EdgeQueryDto,
  SimilarNodesDto,
  PathQueryDto,
  ConnectedQueryDto,
} from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '@signal-sandbox/shared-types';

@Controller('knowledge-graph')
export class GraphController {
  constructor(private readonly graphService: GraphService) {}

  // ── Node Endpoints ──

  @Get('nodes')
  async listNodes(
    @CurrentUser() user: JwtPayload,
    @Query() query: NodeQueryDto,
  ) {
    const { data, total } = await this.graphService.findNodes(user.orgId, query);
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  @Get('nodes/:id')
  async getNode(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.graphService.findNodeById(user.orgId, id);
  }

  @Post('nodes')
  async createNode(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateNodeDto,
  ) {
    return this.graphService.createNode(user.orgId, {
      label: dto.label,
      type: dto.type,
      properties: dto.properties,
    });
  }

  @Patch('nodes/:id')
  async updateNode(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNodeDto,
  ) {
    return this.graphService.updateNode(user.orgId, id, {
      label: dto.label,
      type: dto.type,
      properties: dto.properties,
    });
  }

  @Delete('nodes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteNode(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.graphService.deleteNode(user.orgId, id);
  }

  @Get('nodes/:id/connected')
  async getConnectedNodes(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ConnectedQueryDto,
  ) {
    const depth = query.depth || 1;
    return this.graphService.getNodeGraph(user.orgId, id, depth);
  }

  @Post('nodes/similar')
  @HttpCode(HttpStatus.OK)
  async findSimilarNodes(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SimilarNodesDto,
  ) {
    const limit = dto.limit || 10;
    return this.graphService.searchSimilar(user.orgId, dto.embedding, limit);
  }

  // ── Edge Endpoints ──

  @Get('edges')
  async listEdges(
    @CurrentUser() user: JwtPayload,
    @Query() query: EdgeQueryDto,
  ) {
    const { data, total } = await this.graphService.findEdges(user.orgId, query);
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  @Post('edges')
  async createEdge(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateEdgeDto,
  ) {
    return this.graphService.createEdge(user.orgId, {
      sourceNodeId: dto.sourceNodeId,
      targetNodeId: dto.targetNodeId,
      relationType: dto.relationType,
      weight: dto.weight,
      properties: dto.properties,
    });
  }

  @Delete('edges/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEdge(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.graphService.deleteEdge(user.orgId, id);
  }

  @Get('path')
  async findPath(
    @CurrentUser() user: JwtPayload,
    @Query() query: PathQueryDto,
  ) {
    return this.graphService.findPath(user.orgId, query.source, query.target);
  }
}
