import {
  IsString,
  IsNotEmpty,
  IsObject,
  IsArray,
  IsOptional,
  IsEnum,
  IsUUID,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ContentTypesDto {
  @IsOptional() @Min(0) @Max(20) POST?: number;
  @IsOptional() @Min(0) @Max(10) REEL?: number;
  @IsOptional() @Min(0) @Max(20) STORY?: number;
  @IsOptional() @Min(0) @Max(10) CAROUSEL?: number;
}

export class CreateContentRequestDto {
  @IsUUID()
  clientId: string;

  @IsString()
  @IsNotEmpty()
  brief: string;

  @ValidateNested()
  @Type(() => ContentTypesDto)
  contentTypes: ContentTypesDto;

  @IsArray()
  @IsOptional()
  @IsEnum(
    ['INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'LINKEDIN', 'X', 'THREADS'],
    { each: true },
  )
  platforms?: string[];

  @IsArray()
  @IsOptional()
  @IsUUID('4', { each: true })
  templateIds?: string[];
}

export class UpdateContentPieceDto {
  @IsOptional() @IsString() caption?: string;
  @IsOptional() @IsArray() hashtags?: string[];
  @IsOptional() @IsString() script?: string;
  @IsOptional() @IsString() hook?: string;
  @IsOptional() @IsString() cta?: string;
}

export class ScheduleContentDto {
  @IsUUID()
  contentPieceId: string;

  @IsString()
  scheduledAt: string; // ISO 8601

  @IsEnum(['INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'LINKEDIN', 'X', 'THREADS'])
  platform: string;

  @IsUUID()
  socialAccountId: string;
}
