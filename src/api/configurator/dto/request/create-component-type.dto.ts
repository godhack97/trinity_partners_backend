import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateComponentTypeDto {
  @ApiProperty({ description: "Название типа компонента", maxLength: 36 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(36)
  name: string;

  @ApiPropertyOptional({
    description: "Поднимать выбранный компонент вверх списка",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  move_selected_to_top?: boolean;

  @ApiPropertyOptional({
    description: "Количество компонентов, выбираемое при первом добавлении",
    default: 1,
    minimum: 1,
    maximum: 999,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(999)
  default_selected_quantity?: number;
}
