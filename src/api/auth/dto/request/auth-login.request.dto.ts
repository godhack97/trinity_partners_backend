import { ApiProperty } from "@nestjs/swagger";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmailRu, MinLengthRu } from "../../../../decorators/validate";

export class AuthLoginRequestDto {
  @ApiProperty()
  @IsEmailRu()
  email: string;

  @ApiProperty()
  @MinLengthRu(6, {
    message: "Пароль должен быть длиннее или равен $constraint1 символам",
  })
  password: string;

  @ApiPropertyOptional()
  captcha_token?: string;

  @ApiPropertyOptional()
  captcha_answer?: string;
}
