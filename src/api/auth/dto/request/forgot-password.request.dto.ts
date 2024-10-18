import { ApiProperty } from '@nestjs/swagger';
import { IsEmailRu } from "../../../../decorators/validate";

export class ForgotPasswordRequestDto {
  @ApiProperty()
  @IsEmailRu()
  email: string;
}
