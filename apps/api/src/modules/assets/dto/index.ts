import { IsString, IsOptional, IsEnum, IsNumber, Min, Max, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import type { AssetType } from '@signal-sandbox/shared-types';

const ASSET_TYPES: AssetType[] = [
  'stock',
  'etf',
  'crypto',
  'commodity',
  'forex',
  'index',
  'bond',
];

export class CreateAssetDto {
  @IsString()
  @MaxLength(20)
  symbol!: string;

  @IsString()
  @MaxLength(255)
  name!: string;

  @IsEnum(ASSET_TYPES, { message: `type must be one of: ${ASSET_TYPES.join(', ')}` })
  type!: string;
}

export class UpdateAssetDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  symbol?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsEnum(ASSET_TYPES, { message: `type must be one of: ${ASSET_TYPES.join(', ')}` })
  type?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class AssetQueryDto {
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
  @IsEnum(ASSET_TYPES, { message: `type must be one of: ${ASSET_TYPES.join(', ')}` })
  type?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
