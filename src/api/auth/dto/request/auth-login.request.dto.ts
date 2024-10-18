import { ApiProperty } from '@nestjs/swagger';
import { IsEmailRu, MinLengthRu } from "../../../../decorators/validate";

export class AuthLoginRequestDto {
  @ApiProperty()
  @IsEmailRu()
  email: string;

  @ApiProperty()
  @MinLengthRu(6)
  password: string;
}
