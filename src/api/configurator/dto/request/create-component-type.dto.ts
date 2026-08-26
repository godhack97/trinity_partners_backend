import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

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
}
