import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { WithIdDto } from 'src/dto/with-id.dto';

export class RoleResponseDto extends WithIdDto {
  @ApiProperty()
  @Expose()
  name: string;
}
