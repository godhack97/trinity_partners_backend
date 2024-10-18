import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { RoleResponseDto } from 'src/api/role/dto/response/role.response.dto';
import { WithIdDto } from 'src/dto/with-id.dto';

export class UserResponseDto extends WithIdDto {
  @ApiProperty()
  @Expose()
  email: string;

  @ApiProperty()
  @Expose()
  is_activated: boolean;

  @ApiProperty()
  @Expose()
  phone: string;

  @ApiProperty()
  @Expose()
  email_confirmed: boolean;

  @ApiProperty()
  @Expose()
  @Type(() => RoleResponseDto)
  role: RoleResponseDto;
}
