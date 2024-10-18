import { ApiProperty } from '@nestjs/swagger';
import { IsEmailRu, IsNotEmptyRu, MinLengthRu } from "../../../../decorators/validate";

export class RegistrationSuperAdminDto {
  @ApiProperty()
  @IsNotEmptyRu()
  @IsEmailRu()
  email: string;

  @ApiProperty()
  @IsNotEmptyRu()
  @MinLengthRu(6)
  password: string;

  @ApiProperty()
  @IsNotEmptyRu()
  @MinLengthRu(6)
  secret: string;
}
