import { ApiPropertyOptional } from "@nestjs/swagger";
import { RoleTypes } from "../../../../types/RoleTypes";
import { IsBoolean, IsOptional } from "class-validator";
import { PaginationRequestDto } from "../../../../dto/pagination.request.dto";

export class UserFilterRequestDto extends PaginationRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  role_name?: RoleTypes;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_activated?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  //@IsEmailRu()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  company_id?: number; //(id компании для фильтрации принадлежности к компании)
}
