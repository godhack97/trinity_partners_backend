import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";

export class PaginationResponseDto<T> {
  @ApiProperty()
  @Expose()
  current_page: number;

  @ApiProperty()
  @Expose()
  limit: number;

  @ApiProperty()
  @Expose()
  total: number;

  @ApiProperty()
  @Expose()
  pages_count: number;

  @ApiProperty()
  @Expose()
  data: T[];
}
