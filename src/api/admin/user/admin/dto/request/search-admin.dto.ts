import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString } from "class-validator";
import { Transform } from "class-transformer";
import { INTERNAL_ADMIN_ROLE_NAMES } from "../../internal-admin-roles";

export class SearchAdminDto {
  @ApiProperty({
    description: "Роль пользователя или 'all' для всех ролей",
    example: "super_admin",
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn([...INTERNAL_ADMIN_ROLE_NAMES, "all"])
  role?: string;

  @ApiProperty({
    description: "Архивные записи (deleted_at != null): true — только архивные, false или не указано — только активные",
    type: Boolean,
    example: false,
    required: false,
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value === "true" || value === true ? "true" : "false")
  archive?: string;
}
