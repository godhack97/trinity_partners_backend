import { ApiProperty } from "@nestjs/swagger";
import { MinRu } from "../decorators/validate";
import { Expose, Type } from "class-transformer";
import { RoleResponseDto } from "../api/role/dto/response/role.response.dto";

export class PaginationResponseDto {
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
  data: any[];
}