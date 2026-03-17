import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AssetsService } from './assets.service';
import { CreateAssetDto, UpdateAssetDto, AssetQueryDto } from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '@signal-sandbox/shared-types';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: AssetQueryDto,
  ) {
    return this.assetsService.findAll(query);
  }

  @Get('symbol/:symbol')
  async findBySymbol(
    @CurrentUser() user: JwtPayload,
    @Param('symbol') symbol: string,
  ) {
    return this.assetsService.findBySymbol(symbol);
  }

  @Get(':id')
  async findById(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.assetsService.findById(id);
  }

  @Post()
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateAssetDto,
  ) {
    return this.assetsService.create({
      symbol: dto.symbol,
      name: dto.name,
      type: dto.type,
    });
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssetDto,
  ) {
    return this.assetsService.update(id, {
      symbol: dto.symbol,
      name: dto.name,
      type: dto.type,
      metadata: dto.metadata,
    });
  }
}
