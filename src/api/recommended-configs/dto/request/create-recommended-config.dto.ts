import { IsNotEmptyRu, IsStringRu } from "@decorators/validate";
import { ApiProperty } from "@nestjs/swagger";
import { PartialType } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

export class RecommendedConfigComponentDto {
  @ApiProperty({ format: "uuid" })
  @Expose()
  @IsUUID()
  componentId: string;

  @ApiProperty({ minimum: 1, default: 1 })
  @Expose()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount: number;
}

export class CreateRecommendedConfigDto {
  @ApiProperty({ description: "Категория (slug)", example: "ai-ml" })
  @IsNotEmptyRu()
  @IsStringRu()
  @MaxLength(50)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  category: string;

  @ApiProperty({ description: "Название категории", example: "AI/ML" })
  @IsNotEmptyRu()
  @IsStringRu()
  @MaxLength(100)
  category_label: string;

  @ApiProperty({ description: "ID сервера (UUID)", format: "uuid" })
  @IsUUID()
  server_id: string;

  @ApiProperty({ description: "Название модели сервера", required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  server_name?: string;

  @ApiProperty({ description: "Описание конфигурации", required: false })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({
    description: "Компоненты конфигурации",
    type: [RecommendedConfigComponentDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique((component: RecommendedConfigComponentDto) => component.componentId)
  @ValidateNested({ each: true })
  @Type(() => RecommendedConfigComponentDto)
  components: RecommendedConfigComponentDto[];

  @ApiProperty({ description: "URL изображения", required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  image?: string | null;

  @ApiProperty({ description: "Активна ли конфигурация", required: false })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateRecommendedConfigDto extends PartialType(
  CreateRecommendedConfigDto,
) {}
