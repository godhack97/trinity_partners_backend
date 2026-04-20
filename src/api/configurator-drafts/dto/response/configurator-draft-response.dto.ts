import { WithIdDto } from "@app/dto/with-id.dto";
import { ApiProperty } from "@nestjs/swagger";
import { Expose, Transform } from "class-transformer";

export class ConfiguratorDraftResponseDto extends WithIdDto {
  @ApiProperty()
  @Expose()
  creator_id: number;

  @ApiProperty()
  @Expose()
  title: string;

  @ApiProperty()
  @Expose()
  server_id?: string;

  @ApiProperty()
  @Expose()
  serverbox_height_id?: string;

  @ApiProperty()
  @Expose()
  @Transform(({ obj }) => obj['components'])
  components: any;

  @ApiProperty()
  @Expose()
  total_price: number;

  @ApiProperty()
  @Expose()
  description?: string;

  @ApiProperty()
  @Expose()
  created_at: Date;

  @ApiProperty()
  @Expose()
  updated_at: Date;
}
