import { IsNotEmptyRu } from "@decorators/validate";
import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsString } from "class-validator";
import { INTERNAL_ADMIN_ROLE_NAMES } from "../../internal-admin-roles";

export class UpdateAdminRequestDto {
  @ApiProperty({
    description: "Роль пользователя",
    example: "super_admin"
  })
  @IsNotEmptyRu()
  @IsString()
  @IsIn([...INTERNAL_ADMIN_ROLE_NAMES])
  role: string;
}
