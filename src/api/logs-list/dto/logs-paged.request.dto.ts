import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class LogsPagedRequestDto {
  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  skip: number = 0;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  take: number = 20;

  @ApiPropertyOptional({ description: "Точный код действия" })
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  @IsString()
  @MaxLength(100)
  @IsOptional()
  action?: string;

  @ApiPropertyOptional({ description: "Поиск по действию, entity и email" })
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  @IsString()
  @MaxLength(255)
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: ["ASC", "DESC"], default: "DESC" })
  @Transform(({ value }) => typeof value === "string" ? value.toUpperCase() : value)
  @IsIn(["ASC", "DESC"])
  @IsOptional()
  order: "ASC" | "DESC" = "DESC";
}
