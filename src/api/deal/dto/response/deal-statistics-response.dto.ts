import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";

export class DealStatisticsResponseDto {
  @ApiProperty()
  @Expose()
  allCount: number;

  @ApiProperty()
  @Expose()
  registered: number;

  @ApiProperty()
  @Expose()
  canceled: number;

  @ApiProperty()
  @Expose()
  moderation: number;
}