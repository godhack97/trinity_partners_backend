import { SearchRoleAdminTypes } from "@api/admin/user/admin/admin-user-admin.service";
import { ApiProperty } from "@nestjs/swagger";
import {
  IsEnum,
  IsOptional
} from "class-validator";

export class SearchAdminDto {

  @ApiProperty({ enum: SearchRoleAdminTypes})
  @IsEnum(SearchRoleAdminTypes)
  @IsOptional()
  role: SearchRoleAdminTypes;

}