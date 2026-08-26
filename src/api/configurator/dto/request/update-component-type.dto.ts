import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

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
}
