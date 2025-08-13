import { IsDateRu, IsEnumRu } from "@decorators/validate";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { DealStatus } from "@orm/entities";
import { Type } from "class-transformer";
import { IsEnum, IsOptional } from "class-validator";

export class SearchComponentsDto {
  @ApiProperty()
  @IsOptional()
  componentType?: string;
}
