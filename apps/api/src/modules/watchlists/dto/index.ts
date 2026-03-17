import { IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateWatchlistDto {
  @IsString()
  @MaxLength(255)
  name!: string;
}

export class AddWatchlistItemDto {
  @IsUUID()
  assetId!: string;
}
