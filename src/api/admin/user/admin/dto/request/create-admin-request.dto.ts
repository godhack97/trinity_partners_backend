import { RoleTypes } from "@app/types/RoleTypes";
import {
  IsEmailRu,
  IsNotEmptyRu,
  MinLengthRu
} from "@decorators/validate";
import { ApiProperty } from "@nestjs/swagger";
import {
  IsEnum,
} from "class-validator";

enum RoleAdminTypes {
  SuperAdmin = RoleTypes.SuperAdmin,
  ContentManager = RoleTypes.ContentManager
}

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