import { IsNotEmptyRu } from "@decorators/validate";
import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class UpdateAdminRequestDto {
  @ApiProperty({
    description: "Роль пользователя",
    example: "super_admin"
  })
  @IsNotEmptyRu()
  @IsString()
  role: string;
}