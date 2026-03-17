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
import { EventsService } from './events.service';
import { CreateEventDto, UpdateEventDto, LinkAssetDto, EventQueryDto } from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '@signal-sandbox/shared-types';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: EventQueryDto,
  ) {
    return this.eventsService.findAll(query);
  }

  @Get(':id')
  async findById(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.eventsService.findById(id);
  }

  @Post()
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateEventDto,
  ) {
    return this.eventsService.create({
      title: dto.title,
      summary: dto.summary,
      content: dto.content,
      category: dto.category,
      severity: dto.severity,
      sourceId: dto.sourceId,
      eventDate: dto.eventDate,
      rawPayload: dto.rawPayload,
    });
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventsService.update(id, {
      title: dto.title,
      summary: dto.summary,
      content: dto.content,
      category: dto.category,
      severity: dto.severity,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.eventsService.delete(id);
  }

  @Post(':id/link-asset')
  async linkToAsset(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LinkAssetDto,
  ) {
    await this.eventsService.linkToAsset(id, dto.assetId, dto.relevanceScore ?? 1.0);
    return { message: 'Asset linked successfully' };
  }

  @Get(':id/assets')
  async findLinkedAssets(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.eventsService.findLinkedAssets(id);
  }
}
