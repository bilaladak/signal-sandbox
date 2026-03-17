import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { WatchlistsService } from './watchlists.service';
import { CreateWatchlistDto, AddWatchlistItemDto } from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '@signal-sandbox/shared-types';

@Controller('watchlists')
export class WatchlistsController {
  constructor(private readonly watchlistsService: WatchlistsService) {}

  @Get()
  async findAll(@CurrentUser() user: JwtPayload) {
    return this.watchlistsService.findAll(user.orgId);
  }

  @Post()
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateWatchlistDto,
  ) {
    return this.watchlistsService.create(user.orgId, dto.name);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.watchlistsService.delete(id, user.orgId);
  }

  @Get(':id/items')
  async getItems(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.watchlistsService.getItems(id, user.orgId);
  }

  @Post(':id/items')
  async addItem(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddWatchlistItemDto,
  ) {
    return this.watchlistsService.addItem(id, user.orgId, dto.assetId);
  }

  @Delete(':id/items/:assetId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeItem(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('assetId', ParseUUIDPipe) assetId: string,
  ) {
    await this.watchlistsService.removeItem(id, user.orgId, assetId);
  }
}
