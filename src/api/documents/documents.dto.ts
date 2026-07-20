import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsInt,
  IsArray,
  IsPositive,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

// ─── Groups ───────────────────────────────────────────────────────────────────

export class CreateDocumentGroupDto {
  @ApiProperty({ description: 'Название группы', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Порядок сортировки', required: false, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sort_order?: number;
}

export class UpdateDocumentGroupDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sort_order?: number;
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

export class CreateDocumentTagDto {
  @ApiProperty({ description: 'Название тега', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;
}

export class UpdateDocumentTagDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;
}

// ─── Access Levels ────────────────────────────────────────────────────────────

export class CreateDocumentAccessLevelDto {
  @ApiProperty({ description: 'Название уровня доступа', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Массив ID ролей (пусто = без ограничений)', required: false, type: [Number] })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  role_ids?: number[];
}

export class UpdateDocumentAccessLevelDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiProperty({ required: false, type: [Number] })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  role_ids?: number[];
}

// ─── Documents ────────────────────────────────────────────────────────────────

export class CreateDocumentDto {
  @ApiProperty({ description: 'Название документа', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'ID группы', required: false, nullable: true })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === 'null' ? null : Number(value)))
  @IsInt()
  group_id?: number | null;

  @ApiProperty({ description: 'ID уровня доступа', required: false, nullable: true })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === 'null' ? null : Number(value)))
  @IsInt()
  access_level_id?: number | null;

  @ApiProperty({ description: 'Массив ID тегов', required: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(Number);
    return String(value).split(',').map(Number).filter(Boolean);
  })
  @IsArray()
  @IsInt({ each: true })
  tag_ids?: number[];
}

export class UpdateDocumentDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === 'null' ? null : Number(value)))
  @IsInt()
  group_id?: number | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === 'null' ? null : Number(value)))
  @IsInt()
  access_level_id?: number | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) return undefined;
    if (value === null || value === '' || value === 'null' || value === '[]') {
      return [];
    }
    if (Array.isArray(value)) return value.map(Number);
    return String(value).split(',').map(Number).filter(Boolean);
  })
  @IsArray()
  @IsInt({ each: true })
  tag_ids?: number[];
}

export class FindDocumentsQueryDto {
  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  groupId?: number;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    if (Array.isArray(value)) return value.map(Number);
    return String(value).split(',').map(Number).filter(Boolean);
  })
  tagIds?: number[];

  @ApiPropertyOptional({ type: String, maxLength: 255 })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  accessLevelId?: number;
}
