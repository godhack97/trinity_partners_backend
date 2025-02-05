import { RoleAdminTypes } from "@api/admin/user/admin/admin-user-admin.service";
import {
  IsEmailRu,
  IsNotEmptyRu,
  MinLengthRu
} from "@decorators/validate";
import { ApiProperty } from "@nestjs/swagger";
import {
  IsEnum,
} from "class-validator";

export class CreateAdminRequestDto {
  @ApiProperty()
  @IsNotEmptyRu()
  @IsEmailRu()
  email: string;

  @ApiProperty()
  @IsNotEmptyRu()
  @MinLengthRu(6)
  password: string;

  @ApiProperty({ enum: RoleAdminTypes})
  @IsNotEmptyRu()
  @IsEnum(RoleAdminTypes)
  role: RoleAdminTypes;
}