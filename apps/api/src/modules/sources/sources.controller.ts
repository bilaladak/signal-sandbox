import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { SourcesService } from './sources.service';
import { CreateSourceDto, UpdateSourceDto } from './dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '@signal-sandbox/shared-types';

@Controller('sources')
export class SourcesController {
  constructor(private readonly sourcesService: SourcesService) {}

  @Get()
  async findAll(@CurrentUser() user: JwtPayload) {
    return this.sourcesService.findAll();
  }

  @Get(':id')
  async findById(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sourcesService.findById(id);
  }

  @Post()
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSourceDto,
  ) {
    return this.sourcesService.create({
      name: dto.name,
      type: dto.type,
      baseUrl: dto.baseUrl,
      active: dto.active,
    });
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSourceDto,
  ) {
    return this.sourcesService.update(id, {
      name: dto.name,
      type: dto.type,
      baseUrl: dto.baseUrl,
      active: dto.active,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.sourcesService.delete(id);
  }
}
