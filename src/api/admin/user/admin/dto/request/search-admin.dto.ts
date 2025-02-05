import { RoleTypes } from "@app/types/RoleTypes";
import { ApiProperty } from "@nestjs/swagger";
import {
  IsEnum,
  IsOptional
} from "class-validator";

enum RoleAdminTypes {
  SuperAdmin = RoleTypes.SuperAdmin,
  ContentManager = RoleTypes.ContentManager,
  ALL = 'all'
}

export class SearchAdminDto {

  @ApiProperty({ enum: RoleAdminTypes})
  @IsEnum(RoleAdminTypes)
  @IsOptional()
  role: RoleAdminTypes;

}