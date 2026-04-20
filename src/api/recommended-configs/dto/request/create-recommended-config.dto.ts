import { IsNotEmptyRu, IsStringRu } from "@decorators/validate";
import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsBoolean, IsOptional, IsString } from "class-validator";

export class CreateRecommendedConfigDto {
  @ApiProperty({ description: "Категория (slug)", example: "ai-ml" })
  @IsNotEmptyRu()
  @IsStringRu()
  category: string;

  @ApiProperty({ description: "Название категории", example: "AI/ML" })
  @IsNotEmptyRu()
  @IsStringRu()
  category_label: string;

  @ApiProperty({ description: "ID сервера (UUID)", required: false })
  @IsOptional()
  @IsString()
  server_id?: string;

  @ApiProperty({ description: "Название модели сервера", required: false })
  @IsOptional()
  @IsString()
  server_name?: string;

  @ApiProperty({ description: "Описание конфигурации", required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: "Компоненты конфигурации",
    required: false,
    type: "array",
    items: { type: "object" },
  })
  @IsOptional()
  @IsArray()
  components?: { componentId: string; amount: number }[];

  @ApiProperty({ description: "URL изображения", required: false })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({ description: "Активна ли конфигурация", required: false })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
