import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import {
  IsEmailRu,
  MinLengthRu
} from "@decorators/validate";
export class ChangeForgotPasswordDto {
  @ApiProperty()
  @Expose()
  hash: string;

  @ApiProperty()
  @Expose()
  @IsEmailRu()
  email: string;

  @ApiProperty()
  @MinLengthRu(6)
  password: string;

  @ApiProperty()
  @MinLengthRu(6)
  repeat: string;
}
