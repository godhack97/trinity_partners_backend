import { ApiProperty } from "@nestjs/swagger";
import { MinRu } from "../decorators/validate";

export class PaginationRequestDto {
  @ApiProperty()
  @MinRu(1)
  current_page: number;

  @ApiProperty()
  @MinRu(1)
  limit: number;
}