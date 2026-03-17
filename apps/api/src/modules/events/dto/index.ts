import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsNumber,
  IsDateString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { EventCategory, EventSeverity } from '@signal-sandbox/shared-types';

const EVENT_CATEGORIES: EventCategory[] = [
  'earnings',
  'macro',
  'geopolitical',
  'regulatory',
  'corporate_action',
  'sector_shift',
  'technical',
  'sentiment',
];

const EVENT_SEVERITIES: EventSeverity[] = ['low', 'medium', 'high', 'critical'];

export class CreateEventDto {
  @IsString()
  @MaxLength(500)
  title!: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsEnum(EVENT_CATEGORIES, { message: `category must be one of: ${EVENT_CATEGORIES.join(', ')}` })
  category!: string;

  @IsEnum(EVENT_SEVERITIES, { message: `severity must be one of: ${EVENT_SEVERITIES.join(', ')}` })
  severity!: string;

  @IsOptional()
  @IsUUID()
  sourceId?: string;

  @IsOptional()
  @IsDateString()
  eventDate?: string;

  @IsOptional()
  rawPayload?: Record<string, unknown>;
}

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsEnum(EVENT_CATEGORIES, { message: `category must be one of: ${EVENT_CATEGORIES.join(', ')}` })
  category?: string;

  @IsOptional()
  @IsEnum(EVENT_SEVERITIES, { message: `severity must be one of: ${EVENT_SEVERITIES.join(', ')}` })
  severity?: string;
}

export class LinkAssetDto {
  @IsUUID()
  assetId!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  relevanceScore?: number;
}

export class EventQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsEnum(EVENT_CATEGORIES, { message: `category must be one of: ${EVENT_CATEGORIES.join(', ')}` })
  category?: string;

  @IsOptional()
  @IsEnum(EVENT_SEVERITIES, { message: `severity must be one of: ${EVENT_SEVERITIES.join(', ')}` })
  severity?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
