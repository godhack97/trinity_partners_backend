import { Type } from "class-transformer";
import { IsOptional } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { MinRu } from "../decorators/validate";

export class PaginationRequestDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @MinRu(1)
  current_page: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @MinRu(1)
  limit: number = 10;
}
