import { WithIdDto } from "@app/dto/with-id.dto";
import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";

export class DistributorResponseDto extends WithIdDto {
  @ApiProperty()
  @Expose()
  name: string;
}
