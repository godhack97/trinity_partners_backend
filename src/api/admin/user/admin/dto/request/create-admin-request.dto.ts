import { IsEmailRu, IsNotEmptyRu, MinLengthRu } from "@decorators/validate";
import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

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
  role: string;
}