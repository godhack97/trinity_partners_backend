import { IsEmailRu, IsNotEmptyRu, MinLengthRu } from "@decorators/validate";
import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsString } from "class-validator";
import { INTERNAL_ADMIN_ROLE_NAMES } from "../../internal-admin-roles";

export class CreateAdminRequestDto {
  @ApiProperty()
  @IsNotEmptyRu()
  @IsEmailRu()
  email: string;

  @ApiProperty()
  @IsNotEmptyRu()
  @MinLengthRu(6)
  password: string;

  @ApiProperty({
    description: "Роль пользователя",
    example: "super_admin"
  })
  @IsNotEmptyRu()
  @IsString()
  @IsIn([...INTERNAL_ADMIN_ROLE_NAMES])
  role: string;
}
