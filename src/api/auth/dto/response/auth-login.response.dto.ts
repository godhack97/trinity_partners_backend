import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { UserResponseDto } from "src/api/user/dto/response/user.response.dto";
export class AuthLoginResponseDto {
  @ApiProperty()
  @Expose()
  token: string;

  @ApiProperty()
  @Expose()
  @Type(() => UserResponseDto)
  user: UserResponseDto;
}
