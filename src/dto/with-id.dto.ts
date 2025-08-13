import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";

export class WithIdDto {
  @ApiProperty()
  @Expose()
  id: number;
}
