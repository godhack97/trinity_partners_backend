import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDownloadCentrDto {
  @ApiProperty({ description: 'Название файла', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Описание файла', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Теги через запятую', maxLength: 500, required: false })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  tags?: string;
}

export class UpdateDownloadCentrDto {
  @ApiProperty({ description: 'Название файла', maxLength: 255, required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiProperty({ description: 'Описание файла', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Теги через запятую', maxLength: 500, required: false })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  tags?: string;
}