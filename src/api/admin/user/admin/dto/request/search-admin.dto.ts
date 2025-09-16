import { SearchRoleAdminTypes } from "@api/admin/user/admin/admin-user-admin.service";
import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsBoolean } from "class-validator";

import { Transform } from "class-transformer";

export class SearchAdminDto {
  @ApiProperty({ enum: SearchRoleAdminTypes })
  @IsEnum(SearchRoleAdminTypes)
  @IsOptional()
  role?: SearchRoleAdminTypes;

  @ApiProperty({
    description:
      "Архивные записи (deleted_at != null): true — только архивные, false или не указано — только активные",
    type: Boolean,
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  archive?: string;
}
