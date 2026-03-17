import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsUUID,
  IsNumber,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum GraphNodeType {
  COMPANY = 'company',
  PERSON = 'person',
  SECTOR = 'sector',
  THEME = 'theme',
  EVENT = 'event',
  ASSET = 'asset',
  REGULATION = 'regulation',
  INDICATOR = 'indicator',
}

export class CreateNodeDto {
  @IsString()
  label!: string;

  @IsEnum(GraphNodeType)
  type!: GraphNodeType;

  @IsOptional()
  @IsObject()
  properties?: Record<string, unknown>;
}

export class UpdateNodeDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsEnum(GraphNodeType)
  type?: GraphNodeType;

  @IsOptional()
  @IsObject()
  properties?: Record<string, unknown>;
}

export class NodeQueryDto {
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
  @IsEnum(GraphNodeType)
  type?: GraphNodeType;

  @IsOptional()
  @IsString()
  search?: string;
}

export class CreateEdgeDto {
  @IsUUID()
  sourceNodeId!: string;

  @IsUUID()
  targetNodeId!: string;

  @IsString()
  relationType!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  weight?: number;

  @IsOptional()
  @IsObject()
  properties?: Record<string, unknown>;
}

export class EdgeQueryDto {
  @IsOptional()
  @IsUUID()
  nodeId?: string;

  @IsOptional()
  @IsString()
  relationType?: string;

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
}

export class SimilarNodesDto {
  @IsArray()
  @IsNumber({}, { each: true })
  embedding!: number[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class PathQueryDto {
  @IsUUID()
  source!: string;

  @IsUUID()
  target!: string;
}

export class ConnectedQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(4)
  depth?: number;
}
