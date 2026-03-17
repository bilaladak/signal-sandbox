import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { WatchlistsRepository } from './watchlists.repository';

@Injectable()
export class WatchlistsService {
  private readonly logger = new Logger(WatchlistsService.name);

  constructor(private readonly watchlistsRepo: WatchlistsRepository) {}

  async findAll(orgId: string) {
    return this.watchlistsRepo.findAll(orgId);
  }

  async findById(id: string, orgId: string) {
    const watchlist = await this.watchlistsRepo.findById(id, orgId);
    if (!watchlist) {
      throw new NotFoundException(`Watchlist with id ${id} not found`);
    }
    return watchlist;
  }

  async create(orgId: string, name: string) {
    const watchlist = await this.watchlistsRepo.create(orgId, name);
    this.logger.log(`Watchlist created: ${watchlist.id} - ${watchlist.name}`);
    return watchlist;
  }

  async delete(id: string, orgId: string) {
    const deleted = await this.watchlistsRepo.delete(id, orgId);
    if (!deleted) {
      throw new NotFoundException(`Watchlist with id ${id} not found`);
    }
    this.logger.log(`Watchlist deleted: ${id}`);
  }

  async addItem(watchlistId: string, orgId: string, assetId: string) {
    await this.findById(watchlistId, orgId);
    const item = await this.watchlistsRepo.addItem(watchlistId, assetId);
    this.logger.log(`Asset ${assetId} added to watchlist ${watchlistId}`);
    return item;
  }

  async removeItem(watchlistId: string, orgId: string, assetId: string) {
    await this.findById(watchlistId, orgId);
    const removed = await this.watchlistsRepo.removeItem(watchlistId, assetId);
    if (!removed) {
      throw new NotFoundException(
        `Asset ${assetId} not found in watchlist ${watchlistId}`,
      );
    }
    this.logger.log(`Asset ${assetId} removed from watchlist ${watchlistId}`);
  }

  async getItems(watchlistId: string, orgId: string) {
    await this.findById(watchlistId, orgId);
    return this.watchlistsRepo.getItems(watchlistId);
  }
}
