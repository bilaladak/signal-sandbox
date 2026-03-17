import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { EventsRepository, CreateEventData, UpdateEventData } from './events.repository';
import type { PaginatedResponse } from '@signal-sandbox/shared-types';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(private readonly eventsRepo: EventsRepository) {}

  async findAll(query: {
    page?: number;
    limit?: number;
    category?: string;
    severity?: string;
    search?: string;
  }): Promise<PaginatedResponse<unknown>> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);

    const { data, total } = await this.eventsRepo.findAll({
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
    const event = await this.eventsRepo.findById(id);
    if (!event) {
      throw new NotFoundException(`Event with id ${id} not found`);
    }
    return event;
  }

  async create(data: CreateEventData) {
    const event = await this.eventsRepo.create(data);
    this.logger.log(`Event created: ${event.id} - ${event.title}`);
    return event;
  }

  async update(id: string, data: UpdateEventData) {
    const event = await this.eventsRepo.update(id, data);
    if (!event) {
      throw new NotFoundException(`Event with id ${id} not found`);
    }
    this.logger.log(`Event updated: ${id}`);
    return event;
  }

  async delete(id: string) {
    const deleted = await this.eventsRepo.delete(id);
    if (!deleted) {
      throw new NotFoundException(`Event with id ${id} not found`);
    }
    this.logger.log(`Event deleted: ${id}`);
  }

  async linkToAsset(eventId: string, assetId: string, relevanceScore = 1.0) {
    await this.findById(eventId);
    await this.eventsRepo.linkToAsset(eventId, assetId, relevanceScore);
    this.logger.log(`Event ${eventId} linked to asset ${assetId}`);
  }

  async findLinkedAssets(eventId: string) {
    await this.findById(eventId);
    return this.eventsRepo.findLinkedAssets(eventId);
  }

  async findByAsset(assetId: string, limit?: number) {
    return this.eventsRepo.findByAsset(assetId, limit);
  }
}
