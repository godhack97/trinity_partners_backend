import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { MinLengthRu } from "../../../../decorators/validate";
export class ChangeForgotPasswordDto {
  @ApiProperty()
  @Expose()
  token: string;

  @ApiProperty()
  @MinLengthRu(6)
  password: string;

  @ApiProperty()
  @MinLengthRu(6)
  password2: string;
}
