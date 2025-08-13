import { MinRu } from "@decorators/validate";
import { ApiProperty } from "@nestjs/swagger";
import { IsOptional } from "class-validator";

export class NewsPaginationDto {
  @ApiProperty()
  @MinRu(1)
  @IsOptional()
  page: number;

  @ApiProperty()
  @MinRu(1)
  @IsOptional()
  limit: number;
}
