import { MinRu } from "@decorators/validate";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional } from "class-validator";

export class NewsPaginationDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @MinRu(1)
  @IsOptional()
  page: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @MinRu(1)
  @IsOptional()
  limit: number;
}
