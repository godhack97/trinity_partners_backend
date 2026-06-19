import { WithIdDto } from "@app/dto/with-id.dto";
import { ApiProperty } from "@nestjs/swagger";
import { Expose, Transform } from "class-transformer";

export class ConfiguratorDraftResponseDto extends WithIdDto {
  @ApiProperty()
  @Expose()
  creator_id: number;

  @ApiProperty({ required: false })
  @Expose()
  shared_by_id?: number;

  @ApiProperty({ required: false })
  @Expose()
  @Transform(({ obj }) => {
    const info = obj.shared_by?.user_info;
    const name = [info?.first_name, info?.last_name].filter(Boolean).join(" ");
    return name || obj.shared_by?.email || null;
  })
  shared_by_name?: string;

  @ApiProperty({ required: false })
  @Expose()
  deal_id?: number;

  @ApiProperty()
  @Expose()
  @Transform(({ obj }) => (obj.deal_id ? "deal" : "draft"))
  status: "draft" | "deal";

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
