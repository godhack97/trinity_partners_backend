import { RoleAdminTypes } from "@api/admin/user/admin/admin-user-admin.service";
import { IsNotEmptyRu } from "@decorators/validate";
import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";

export class UpdateAdminRequestDto {
  @ApiProperty({ enum: RoleAdminTypes})
  @IsNotEmptyRu()
  @IsEnum(RoleAdminTypes)
  role: RoleAdminTypes;
}