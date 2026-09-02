import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class UpdateComponentTypeDto {
  @ApiPropertyOptional({ description: "Название типа компонента", maxLength: 36 })
  @IsOptional()
  @IsString()
  @MaxLength(36)
  name?: string;

  @ApiPropertyOptional({
    description: "Поднимать выбранный компонент вверх списка",
  })
  @IsOptional()
  @IsBoolean()
  move_selected_to_top?: boolean;

  @ApiPropertyOptional({
    description: "Количество компонентов, выбираемое при первом добавлении",
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
