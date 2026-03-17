import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { SourcesRepository, CreateSourceData, UpdateSourceData } from './sources.repository';

@Injectable()
export class SourcesService {
  private readonly logger = new Logger(SourcesService.name);

  constructor(private readonly sourcesRepo: SourcesRepository) {}

  async findAll() {
    return this.sourcesRepo.findAll();
  }

  async findById(id: string) {
    const source = await this.sourcesRepo.findById(id);
    if (!source) {
      throw new NotFoundException(`Source with id ${id} not found`);
    }
    return source;
  }

  async create(data: CreateSourceData) {
    const source = await this.sourcesRepo.create(data);
    this.logger.log(`Source created: ${source.id} - ${source.name}`);
    return source;
  }

  async update(id: string, data: UpdateSourceData) {
    const source = await this.sourcesRepo.update(id, data);
    if (!source) {
      throw new NotFoundException(`Source with id ${id} not found`);
    }
    this.logger.log(`Source updated: ${id}`);
    return source;
  }

  async delete(id: string) {
    const deleted = await this.sourcesRepo.delete(id);
    if (!deleted) {
      throw new NotFoundException(`Source with id ${id} not found`);
    }
    this.logger.log(`Source deleted: ${id}`);
  }
}
