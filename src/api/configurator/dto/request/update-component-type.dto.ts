import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateComponentTypeDto {
  @ApiPropertyOptional({ description: "Название типа компонента", maxLength: 36 })
  @IsOptional()
  @IsString()
  @MaxLength(36)
  name?: string;
}