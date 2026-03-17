import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { AssetsRepository, CreateAssetData, UpdateAssetData } from './assets.repository';
import type { PaginatedResponse } from '@signal-sandbox/shared-types';

@Injectable()
export class AssetsService {
  private readonly logger = new Logger(AssetsService.name);

  constructor(private readonly assetsRepo: AssetsRepository) {}

  async findAll(query: {
    page?: number;
    limit?: number;
    type?: string;
    search?: string;
  }): Promise<PaginatedResponse<unknown>> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);

    const { data, total } = await this.assetsRepo.findAll({
      ...query,
      page,
      limit,
    });

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const asset = await this.assetsRepo.findById(id);
    if (!asset) {
      throw new NotFoundException(`Asset with id ${id} not found`);
    }
    return asset;
  }

  async findBySymbol(symbol: string) {
    const asset = await this.assetsRepo.findBySymbol(symbol);
    if (!asset) {
      throw new NotFoundException(`Asset with symbol ${symbol} not found`);
    }
    return asset;
  }

  async create(data: CreateAssetData) {
    const asset = await this.assetsRepo.create(data);
    this.logger.log(`Asset created: ${asset.id} - ${asset.symbol}`);
    return asset;
  }

  async update(id: string, data: UpdateAssetData) {
    const asset = await this.assetsRepo.update(id, data);
    if (!asset) {
      throw new NotFoundException(`Asset with id ${id} not found`);
    }
    this.logger.log(`Asset updated: ${id}`);
    return asset;
  }
}
